from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.dependencies import require_role, get_db
from app.models import User, AuditLog
from app.core.auth_utils import revoke_all_user_tokens

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
def admin_dashboard(current_user = Depends(require_role("admin"))):
    return {"msg": f"Welcome to the Admin Dashboard, {current_user.first_name}!"}


@router.post("/users/{user_id}/disable")
def disable_user(user_id: str, current_admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """
    Disable user account (security incident, violation, etc).
    Immediately revokes all tokens and prevents login.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself")
    
    if not user.is_active:
        return {"msg": "User already disabled"}
    
    # Disable account
    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # SECURITY: Revoke all tokens (immediate enforcement)
    revoke_all_user_tokens(user_id, db)
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_admin.id,
        action="user_disabled",
        target=user_id,
        event_metadata={"disabled_by": current_admin.email},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {"msg": f"User {user.email} has been disabled"}


@router.post("/users/{user_id}/enable")
def enable_user(user_id: str, current_admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """
    Re-enable user account (after investigation/incident resolved).
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_active:
        return {"msg": "User already active"}
    
    # Re-enable account
    user.is_active = True
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_admin.id,
        action="user_enabled",
        target=user_id,
        event_metadata={"enabled_by": current_admin.email},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {"msg": f"User {user.email} has been re-enabled"}
