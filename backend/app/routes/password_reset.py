"""
Password Management Routes (MILESTONE 6 - STEP 4)

Endpoints:
  POST /auth/password-reset/request?email=...
  POST /auth/password-reset/confirm
  POST /auth/change-password  (authenticated)

Handles secure password reset with single-use tokens.
Revokes all sessions on successful reset.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session
from datetime import datetime
import re

from app.dependencies import get_db, get_current_user
from app.models import User, AuditLog, RefreshToken
from app.services.token_service import generate_email_token, verify_email_token
from app.services.email_service import send_email
from app.services.template_service import render_template
from app.core.security import hash_password, verify_password
from app.core.auth_utils import revoke_all_user_tokens
from app.config import FRONTEND_BASE_URL, ADMIN_FRONTEND_URL, ANALYST_FRONTEND_URL, VIEWER_FRONTEND_URL

router = APIRouter(prefix="/auth", tags=["Authentication"])


class PasswordResetRequest(BaseModel):
    """Request password reset by email."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token."""
    token: str
    new_password: str


@router.post("/password-reset/request")
def request_password_reset(
    payload: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset token via email.
    
    Query Parameters:
        email: User email address
    
    Security:
        - Does NOT leak whether email exists
        - Returns same response regardless
        - Token sent via email only
    
    Returns:
        Always: {"msg": "If email exists, a reset link has been sent"}
    """
    user = db.query(User).filter(User.email == payload.email).first()
    
    # Anti-enumeration: Don't reveal if email exists
    if user:
        # Generate single-use token
        token = generate_email_token(
            user_id=user.id,
            purpose="password_reset",
            db=db
        )
        
        # Determine role-specific frontend URL
        role_url_map = {
            "admin": ADMIN_FRONTEND_URL,
            "analyst": ANALYST_FRONTEND_URL,
            "viewer": VIEWER_FRONTEND_URL,
        }
        frontend_url = role_url_map.get(user.role, FRONTEND_BASE_URL)

        # Render email template
        reset_url = f"{frontend_url}/reset-password?token={token}"
        html = render_template(
            "password_reset.html",
            {
                "first_name": user.first_name,
                "reset_url": reset_url,
            }
        )
        
        # Send email
        send_email(
            to=user.email,
            subject="Reset your SentinelIQ password",
            html_content=html
        )
        
        # Audit log
        audit_log = AuditLog(
            actor_id=user.id,
            action="password_reset_requested",
            target=user.email,
            event_metadata={"email": user.email}
        )
        db.add(audit_log)
        db.commit()
    
    # Always return same response (prevent enumeration)
    return {"msg": "If the email exists, a reset link has been sent"}


@router.post("/password-reset/confirm")
def confirm_password_reset(
    payload: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Complete password reset with token and new password.
    
    Request Body:
        token: Reset token (from email)
        new_password: New password
    
    Security:
        - Token must be valid and unused
        - Token expires after 30 minutes
        - Password is bcrypt hashed
        - ALL sessions revoked (user must re-login everywhere)
    
    Returns:
        Success: {"msg": "Password reset successful"}
        Error: 400 if token invalid/expired
    """
    # Verify token
    email_token = verify_email_token(
        raw_token=payload.token,
        purpose="password_reset",
        db=db
    )
    
    if not email_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
    
    # Get user
    user = db.query(User).filter(User.id == email_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password (bcrypt hashed)
    user.password_hash = hash_password(payload.new_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # SECURITY: Revoke ALL refresh tokens (all devices must re-login)
    tokens_to_revoke = db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.is_revoked == False
    ).all()
    
    for token in tokens_to_revoke:
        token.is_revoked = True
    
    db.commit()
    
    # Audit log
    audit_log = AuditLog(
        actor_id=user.id,
        action="password_reset_completed",
        target=user.email,
        event_metadata={"email": user.email}
    )
    db.add(audit_log)
    db.commit()
    
    return {"msg": "Password reset successful. Please login with your new password."}


# ============================================================================
# Change Password (Authenticated) — Universal for all roles
# ============================================================================

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


class ChangePasswordRequest(BaseModel):
    """Change password while authenticated."""
    current_password: str = Field(..., description="User's current password")
    new_password: str = Field(
        ...,
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
        description="New password (min 8 chars, must include upper, lower, digit, special)"
    )

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Enforce password strength requirements."""
        errors = []
        if len(v) < PASSWORD_MIN_LENGTH:
            errors.append(f"at least {PASSWORD_MIN_LENGTH} characters")
        if not re.search(r"[A-Z]", v):
            errors.append("one uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("one lowercase letter")
        if not re.search(r"\d", v):
            errors.append("one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]~`/\\;']", v):
            errors.append("one special character")
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        return v


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for the currently authenticated user.
    
    Works for ALL roles (admin, analyst, viewer).
    
    Request Body:
        current_password: Current password for verification
        new_password: New password (min 8 chars, strength requirements)
    
    Security:
        - Requires valid JWT authentication
        - Verifies current password before allowing change
        - New password is bcrypt hashed
        - ALL refresh tokens revoked (user must re-login on all devices)
        - Rate limiting enforced by middleware
    
    Returns:
        Success: {"msg": "Password changed successfully"}
        Error: 400 if current password wrong or new password invalid
    """
    # Virtual users (env-based admin/test) cannot change passwords
    if getattr(current_user, "is_virtual", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change password for virtual/system accounts"
        )

    # Verify current password
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Prevent reuse of same password
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Update password (bcrypt hashed)
    current_user.password_hash = hash_password(payload.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()

    # SECURITY: Revoke ALL refresh tokens (force re-login on all devices)
    revoke_all_user_tokens(current_user.id, db)

    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="password_changed",
        target=current_user.email,
        event_metadata={"email": current_user.email, "method": "self_service"}
    )
    db.add(audit_log)
    db.commit()

    return {"msg": "Password changed successfully. Please login again on all devices."}
