"""
Email Verification Route (MILESTONE 6 - STEP 3)

Endpoint: POST /auth/verify-email?token=...

Verifies user email with single-use token.
Marks user as email_verified=True.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import User, AuditLog
from app.services.token_service import verify_email_token, generate_email_token
from app.services.email_service import send_email
from app.services.template_service import render_template
from app.config import FRONTEND_BASE_URL, ADMIN_FRONTEND_URL, ANALYST_FRONTEND_URL, VIEWER_FRONTEND_URL
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ResendVerificationRequest(BaseModel):
    email: EmailStr


@router.post("/verify-email")
def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verify user email with token.
    
    Query Parameters:
        token: Verification token (from email)
    
    Returns:
        Success: {"msg": "Email verified successfully"}
        Error: 400 if token invalid/expired
    """
    # Verify token (single-use, expiration, hash match)
    email_token = verify_email_token(
        raw_token=token,
        purpose="email_verification",
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
    
    # Already verified?
    if user.email_verified:
        return {"msg": "Email already verified"}
    
    # Mark as verified
    user.email_verified = True
    user.email_verified_at = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # Audit log
    audit_log = AuditLog(
        actor_id=user.id,
        action="email_verified",
        target=user.email,
        event_metadata={"email": user.email}
    )
    db.add(audit_log)
    db.commit()
    
    return {"msg": "Email verified successfully"}


@router.post("/verify-email/resend")
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    """
    Resend email verification link.
    Always returns success to prevent email enumeration.
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if user and not user.email_verified:
        role_url_map = {
            "admin": ADMIN_FRONTEND_URL,
            "analyst": ANALYST_FRONTEND_URL,
            "viewer": VIEWER_FRONTEND_URL,
            "user": VIEWER_FRONTEND_URL,
        }
        frontend_url = role_url_map.get(user.role, FRONTEND_BASE_URL)

        verification_token = generate_email_token(
            user_id=user.id,
            purpose="email_verification",
            db=db,
        )
        verify_url = f"{frontend_url}/verify-email?token={verification_token}"

        html = render_template(
            "email_verification.html",
            {
                "user_name": user.first_name,
                "verification_url": verify_url,
            },
        )

        send_email(
            to=user.email,
            subject="Verify your SentinelIQ account",
            html_content=html,
        )

        audit_log = AuditLog(
            actor_id=user.id,
            action="email_verification_resent",
            target=user.email,
            event_metadata={"email": user.email},
        )
        db.add(audit_log)
        db.commit()

    return {"msg": "If the email exists, a verification link has been sent"}
