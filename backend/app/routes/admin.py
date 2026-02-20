from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.dependencies import require_admin, get_db
import logging
logger = logging.getLogger("sentineliq")
from app.models import User, AuditLog
from app.core.auth_utils import revoke_all_user_tokens

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
def admin_dashboard(current_user = Depends(require_admin)):
    """Admin dashboard - admin only."""
    return {
        "msg": f"Welcome to the Admin Dashboard, {current_user.first_name}!",
        "user_role": current_user.role,
        "email": current_user.email
    }


@router.get("/audit-logs")
def view_audit_logs(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """View audit logs - admin only."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset).all()
    return {
        "count": len(logs),
        "logs": [
            {
                "id": log.id,
                "actor_id": log.actor_id,
                "action": log.action,
                "target": log.target,
                "timestamp": log.timestamp,
                "metadata": log.event_metadata
            }
            for log in logs
        ]
    }


@router.post("/users/{user_id}/disable")
def disable_user(user_id: str, current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    logger.info(f"DISABLE: Looking for user_id={user_id}")
    logger.info(f"DISABLE: DB URL: {db.bind.url if hasattr(db, 'bind') else 'unknown'}")
    user = db.query(User).filter(User.id == user_id).first()
    logger.info(f"DISABLE: Query result: {user}")
    """
    Disable user account (security incident, violation, etc).
    Immediately revokes all tokens and prevents login.
    Admin only.
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

    # Vault: Crypto-shred user keys (GDPR)
    try:
        from app.core.vault_client import get_vault_client
        vault = get_vault_client()
        vault.crypto_shred_user(user_id)
        logger.info(f"Crypto-shredded keys for user {user_id}")
    except Exception as e:
        logger.error(f"Vault crypto-shred failed for user {user_id}: {e}")

    # Kafka: Publish user disabled event
    try:
        from app.services.kafka_service import publish_event, KafkaTopics
        import asyncio
        asyncio.create_task(publish_event(KafkaTopics.ALERTS_HIGH, {
            "event_id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": "user_disabled",
            "admin_id": current_admin.id,
            "timestamp": datetime.utcnow().isoformat(),
            "role": "admin"
        }, key=user_id))
    except Exception as e:
        logger.error(f"Kafka publish failed for user_disabled: {e}")

    # Redis: Publish to alert stream
    try:
        from app.services.redis_stream import get_redis_stream_manager
        redis_manager = get_redis_stream_manager()
        redis_manager.add_event({
            "event_id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": "user_disabled",
            "admin_id": current_admin.id,
            "timestamp": datetime.utcnow().isoformat(),
            "role": "admin"
        }, stream=redis_manager.alert_stream)
    except Exception as e:
        logger.error(f"Redis publish failed for user_disabled: {e}")

    # Email: Send notification to user
    try:
        from app.services.email_service import queue_email, start_email_worker
        import asyncio
        start_email_worker()
        asyncio.create_task(queue_email(
            to=user.email,
            subject="Your account has been disabled",
            html_content=f"<p>Dear {user.first_name},<br>Your account has been disabled by an administrator for security reasons. If you believe this is a mistake, please contact support.</p>",
            template="account_disabled.html",
            user_id=user_id,
            role="user",
            action="account_disabled"
        ))
    except Exception as e:
        logger.error(f"Email notification failed for user_disabled: {e}")

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
def enable_user(user_id: str, current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    logger.info(f"ENABLE: Looking for user_id={user_id}")
    logger.info(f"ENABLE: DB URL: {db.bind.url if hasattr(db, 'bind') else 'unknown'}")
    user = db.query(User).filter(User.id == user_id).first()
    logger.info(f"ENABLE: Query result: {user}")
    """
    Re-enable user account (after investigation/incident resolved).
    Admin only.
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


@router.post("/users/{user_id}/change-role")
def change_user_role(
    user_id: str,
    new_role: str,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    logger.info(f"CHANGE_ROLE: Looking for user_id={user_id}")
    logger.info(f"CHANGE_ROLE: DB URL: {db.bind.url if hasattr(db, 'bind') else 'unknown'}")
    user = db.query(User).filter(User.id == user_id).first()
    logger.info(f"CHANGE_ROLE: Query result: {user}")
    """
    Change user role (admin, analyst, viewer).
    Admin only. Audit logged.
    """
    from app.config import ROLES
    
    if new_role not in ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(ROLES.keys())}"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = user.role
    user.role = new_role
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_admin.id,
        action="role_changed",
        target=user_id,
        event_metadata={
            "old_role": old_role,
            "new_role": new_role,
            "changed_by": current_admin.email
        },
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {
        "msg": f"User {user.email} role changed from {old_role} to {new_role}",
        "user_id": user_id,
        "new_role": new_role
    }
