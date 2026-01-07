# app/routes/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.dependencies import get_current_user, get_db
from app.schemas.user import UserCreate, UserOut
from app.models import User, AuditLog
from app.core.security import hash_password
from app.services.token_service import generate_email_token
from app.services.email_service import send_email
from app.services.template_service import render_template
from app.config import FRONTEND_BASE_URL

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
    
    # MILESTONE 6: Send verification email with token
    verification_token = generate_email_token(
        user_id=db_user.id,
        purpose="email_verification",
        db=db
    )
    
    # Render and send verification email
    verification_url = f"{FRONTEND_BASE_URL}/verify-email?token={verification_token}"
    html = render_template(
        "email_verification.html",
        {
            "first_name": db_user.first_name,
            "verification_url": verification_url,
        }
    )
    send_email(
        to=db_user.email,
        subject="Verify your SentinelIQ account",
        html_content=html
    )
    
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
    """Get the current authenticated user."""
    return current_user


@router.get("/", response_model=dict)
def list_users(
    limit: int = 50,
    offset: int = 0,
    status: str = None,
    search: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all users with pagination.
    Only accessible to authenticated users.
    """
    from app.dependencies import require_role
    
    # Only admins can list all users
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(User)
    
    # Apply filters
    if status:
        if status == "active":
            query = query.filter(User.is_active == True)
        elif status == "inactive":
            query = query.filter(User.is_active == False)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_pattern)) |
            (User.first_name.ilike(search_pattern)) |
            (User.last_name.ilike(search_pattern))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "role": u.role,
                "is_active": u.is_active,
                "email_verified": getattr(u, 'email_verified', True),
                "last_login": getattr(u, 'last_login', None),
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "updated_at": u.updated_at.isoformat() if u.updated_at else None,
            }
            for u in users
        ],
        "total": total,
        "page": (offset // limit) + 1 if limit > 0 else 1,
        "page_size": limit,
    }


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    first_name: str = None,
    last_name: str = None,
    role: str = None,
    is_active: bool = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a user. Only admins can update other users."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only admin can update others
    if str(current_user.id) != str(user_id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if role is not None and current_user.role == "admin":
        user.role = role
    if is_active is not None and current_user.role == "admin":
        user.is_active = is_active
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a user. Admin only."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    return {"msg": "User deleted"}
