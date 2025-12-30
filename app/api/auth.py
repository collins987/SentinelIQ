from fastapi import APIRouter, HTTPException, Depends, Request, Query
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models import User, AuditLog
from app.core.security import verify_password, create_access_token, hash_password
from app.core.auth_utils import (
    create_and_store_refresh_token,
    validate_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
    check_login_attempts,
    log_login_attempt
)
from app.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest, LogoutRequest
from app.services.email_service import (
    create_verification_token,
    send_verification_email,
    validate_email_token,
    mark_token_used,
    create_password_reset_token,
    send_password_reset_email
)
from app.dependencies import get_current_user
from datetime import datetime
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/verify-email")
def verify_email(user_id: str = Query(...), token: str = Query(...), db: Session = Depends(get_db)):
    """
    Verify user email with token.
    Token is single-use and time-limited (24 hours).
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.email_verified:
        return {"msg": "Email already verified"}
    
    # Validate token
    if not validate_email_token(user_id, token, "verify_email", db):
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Mark token as used
    mark_token_used(user_id, "verify_email", db)
    
    # Mark email as verified
    user.email_verified = True
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user_id,
        action="email_verified",
        target=user_id,
        event_metadata={},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {"msg": "Email verified successfully"}


@router.post("/password/forgot")
def forgot_password(email: str, db: Session = Depends(get_db)):
    """
    Request password reset.
    Sends reset token via email (console in dev).
    """
    user = db.query(User).filter(User.email == email).first()
    
    # Don't reveal if email exists (security best practice)
    if user:
        token = create_password_reset_token(user.id, db)
        send_password_reset_email(user, token)
        
        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=user.id,
            action="password_reset_requested",
            target=user.id,
            event_metadata={},
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
    
    # Always return same response (don't leak if email exists)
    return {"msg": "If email exists, password reset link sent"}


@router.post("/password/reset")
def reset_password(user_id: str = Query(...), token: str = Query(...), new_password: str = Query(...), db: Session = Depends(get_db)):
    """
    Complete password reset with token.
    Revokes all existing sessions (forces re-login on all devices).
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate password reset token
    if not validate_email_token(user_id, token, "password_reset", db):
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Mark token as used
    mark_token_used(user_id, "password_reset", db)
    
    # Update password
    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # SECURITY: Revoke all sessions (forces re-login on all devices)
    revoke_all_user_tokens(user_id, db)
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user_id,
        action="password_reset_completed",
        target=user_id,
        event_metadata={},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {"msg": "Password reset successfully. Please login with new password."}


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Login endpoint with rate limiting and refresh token support.
    Returns access_token and refresh_token.
    """
    ip_address = request.client.host if request.client else None
    
    # Check rate limiting
    if not check_login_attempts(data.email, ip_address, db):
        # Log the failed attempt
        log_login_attempt(data.email, ip_address, False, db)
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please try again later."
        )
    
    # Verify user credentials
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not verify_password(data.password, user.password_hash):
        log_login_attempt(data.email, ip_address, False, db)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")
    
    # MILESTONE 6: Check email verification
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please verify your email first.")
    
    # Log successful login
    log_login_attempt(data.email, ip_address, True, db)
    
    # Create tokens
    access_token = create_access_token({
        "sub": user.id,
        "role": user.role
    })
    
    refresh_token = create_and_store_refresh_token(user.id, db)
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.id,
        action="login",
        target=user.id,
        event_metadata={"ip_address": ip_address},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/token/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.
    
    SECURITY:
    - Validates old refresh token
    - Issues new refresh token (rotation)
    - Old token is revoked (prevents replay attacks)
    - Returns new access_token + new refresh_token
    """
    user_id = validate_refresh_token(data.refresh_token, db)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="User no longer active")
    
    # SECURITY FIX #2: Revoke old token before issuing new one (token rotation)
    revoke_refresh_token(data.refresh_token, db)
    
    # Generate new access token
    access_token = create_access_token({
        "sub": user.id,
        "role": user.role
    })
    
    # Issue new refresh token (prevents old token from being reused)
    new_refresh_token = create_and_store_refresh_token(user.id, db)
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.id,
        action="token_refresh",
        target=user.id,
        event_metadata={},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,  # NEW token, not old one
        "token_type": "bearer"
    }

@router.post("/logout")
def logout(data: LogoutRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Logout endpoint - revokes the provided refresh token.
    """
    success = revoke_refresh_token(data.refresh_token, db)
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_user.id,
        action="logout",
        target=current_user.id,
        event_metadata={},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    if success:
        return {"msg": "Logged out successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid refresh token")

@router.post("/logout-all-devices")
def logout_all_devices(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Force logout from all devices by revoking all refresh tokens.
    """
    revoke_all_user_tokens(current_user.id, db)
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_user.id,
        action="logout_all_devices",
        target=current_user.id,
        event_metadata={},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {"msg": "Logged out from all devices"}

