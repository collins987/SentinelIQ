# app/routes/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.dependencies import get_current_user, get_db
from app.schemas.user import UserCreate, UserOut
from app.models import User, AuditLog
from app.core.security import hash_password
from app.services.email_service import create_verification_token, send_verification_email

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register new user.
    Email verification required before API access.
    """
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    db_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role if hasattr(user, "role") else "viewer",
        email_verified=False  # MILESTONE 6: New users start unverified
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # MILESTONE 6: Send verification email
    verification_token = create_verification_token(db_user.id, db)
    send_verification_email(db_user, verification_token)
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=db_user.id,
        action="user_registered",
        target=db_user.id,
        event_metadata={"email": db_user.email},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return db_user


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
