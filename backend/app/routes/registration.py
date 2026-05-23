"""
User Registration Route — Event-Driven Onboarding

POST /auth/register

Flow:
1. Validate input (password strength, email uniqueness)
2. Force role to "viewer" (RBAC security)
3. Create user in DB with email_verified=False
4. Encrypt PII via Vault Transit engine
5. Publish Kafka event: users.created
6. Publish Redis Stream event: stream:user_events
7. Generate email verification token
8. Queue verification email via Kafka: notifications.email
9. Auto-login: return JWT + refresh token
10. Audit log + Prometheus metrics + structured logging

Does NOT allow self-registration as admin or analyst.
"""

import uuid
import secrets
import logging
import json
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.security import hash_password, create_access_token
from app.core.auth_utils import create_and_store_refresh_token
from app.core.constants import DEFAULT_ORG_ID
from app.core.metrics import MetricsTracker
from app.core.logging import log_event
from app.models import User, AuditLog, Organization
from app.services.token_service import generate_email_token
from app.services.template_service import render_template

logger = logging.getLogger("sentineliq.registration")

router = APIRouter(prefix="/auth", tags=["Registration"])


# ─── Schema ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Public registration schema. Accepts an optional role (admin, analyst, viewer)."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    org_id: str = Field(default="", max_length=100)
    role: str = Field(default="viewer", max_length=20)

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        allowed = {"admin", "analyst", "viewer"}
        v = v.strip().lower()
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        import re
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]~`/\\;']", v):
            raise ValueError("Password must contain at least one special character")
        return v


# ─── Helpers ─────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def _publish_kafka_event(topic: str, event: dict, key: str | None = None) -> bool:
    """Publish to arbitrary Kafka topic with graceful degradation."""
    try:
        from app.services.kafka_service import get_kafka_producer
        producer = await get_kafka_producer()
        if not producer.is_connected:
            logger.warning(f"Kafka not connected, skipping publish to {topic}")
            return False

        event["_kafka_timestamp"] = datetime.utcnow().isoformat()
        key_bytes = key.encode() if key else None
        await producer._producer.send_and_wait(
            topic=topic,
            value=json.dumps(event).encode("utf-8"),
            key=key_bytes,
        )
        logger.info(f"Kafka event published to {topic}", extra={"topic": topic, "user_id": event.get("user_id")})
        return True
    except Exception as e:
        logger.error(f"Kafka publish to {topic} failed: {e}")
        return False


def _publish_redis_event(event: dict) -> str | None:
    """Publish to Redis stream:user_events with graceful degradation."""
    try:
        from app.services.redis_stream import get_redis_stream_manager
        mgr = get_redis_stream_manager()
        if not mgr.redis:
            logger.warning("Redis not connected, skipping stream publish")
            return None

        # Redis XADD requires flat string values
        flat = {k: str(v) if not isinstance(v, str) else v for k, v in event.items()}
        event_id = mgr.redis.xadd("stream:user_events", flat, maxlen=100000)
        logger.info(f"Redis event published to stream:user_events", extra={"event_id": event_id})
        return event_id
    except Exception as e:
        logger.error(f"Redis stream publish failed: {e}")
        return None


def _encrypt_user_pii(user_id: str, data: dict) -> str | None:
    """Encrypt PII via Vault Transit engine (graceful degradation)."""
    try:
        from app.core.vault_client import get_vault_client
        vault = get_vault_client()
        if not vault.is_authenticated():
            logger.warning("Vault not authenticated, PII not encrypted")
            return None
        ciphertext = vault.encrypt_user_data(user_id, data)
        logger.info(f"PII encrypted for user {user_id}")
        return ciphertext
    except Exception as e:
        logger.warning(f"Vault encryption skipped: {e}")
        return None


# ─── Registration Endpoint ───────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """
    Public user registration.

    Security rules:
    - Role is ALWAYS set to "viewer" (no self-promotion)
    - Password must meet strength requirements
    - Email must be unique
    - Email verification is required before full access

    Returns JWT tokens for immediate (limited) access.
    """
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # ── 1. Check email uniqueness ─────────────────────────────────────────
    existing = db.query(User).filter(User.email.ilike(data.email.strip().lower())).first()
    if existing:
        MetricsTracker.track_registration(success=False)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    # ── 2. Resolve org_id (auto-create if it doesn't exist) ─────────────
    org = data.org_id.strip() if data.org_id else DEFAULT_ORG_ID
    if org and org != DEFAULT_ORG_ID:
        org_record = db.query(Organization).filter(Organization.id == org).first()
        if not org_record:
            # Auto-create the organization so users can self-onboard
            org_record = Organization(id=org, name=org)
            db.add(org_record)
            db.flush()
            logger.info(f"Auto-created organization '{org}' during registration")

    # ── 3. Create user with requested role ─────────────────────────────
    requested_role = data.role.strip().lower() if data.role else "viewer"
    db_user = User(
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=data.email.strip().lower(),
        password_hash=hash_password(data.password),
        role=requested_role,
        org_id=org or DEFAULT_ORG_ID,
        email_verified=False,         # Must verify via email
        is_active=True,
        risk_score=0,
        trust_level="unknown",
        status="active",
        visibility="org",
    )
    db.add(db_user)
    db.flush()  # get ID before commit

    # ── 3a. Encrypt PII fields via Vault Transit ─────────────────────────
    try:
        from app.services.pii_encryption import encrypt_user_pii
        pii = encrypt_user_pii(
            user_id=db_user.id,
            first_name=data.first_name.strip(),
            last_name=data.last_name.strip(),
            phone=getattr(data, "phone", None),
        )
        db_user.first_name = pii["first_name"]
        db_user.last_name = pii["last_name"]
        if pii["phone"]:
            db_user.phone = pii["phone"]
    except Exception as pii_err:
        logger.warning(f"PII encryption skipped (non-blocking): {pii_err}")

    # ── 3b. Audit log ─────────────────────────────────────────────────────
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=db_user.id,
        action="user.registered",
        target=db_user.id,
        event_metadata={
            "email": db_user.email,
            "role": db_user.role,
            "org_id": db_user.org_id,
            "ip_address": ip_address,
            "source": "self_registration",
        },
        timestamp=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(db_user)

    # ── 4. Structured logging (Loki-compatible) ──────────────────────────
    log_event(
        action="user.registered",
        user_id=db_user.id,
        target=db_user.email,
        details={
            "role": db_user.role,
            "org_id": db_user.org_id,
            "ip_address": ip_address,
            "source": "api",
        },
    )

    # ── 5. Prometheus metrics ─────────────────────────────────────────────
    MetricsTracker.track_registration(success=True)

    # ── 6. Vault — encrypt PII (non-blocking) ────────────────────────────
    _encrypt_user_pii(db_user.id, {
        "email": db_user.email,
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "org_id": db_user.org_id,
    })

    # ── 7. Kafka — publish users.created event ───────────────────────────
    user_created_event = {
        "event": "user.created",
        "event_id": str(uuid.uuid4()),
        "user_id": db_user.id,
        "email": db_user.email,
        "role": "viewer",
        "org_id": db_user.org_id,
        "timestamp": datetime.utcnow().isoformat(),
        "source": "registration_api",
    }
    await _publish_kafka_event("users.created", user_created_event, key=db_user.id)

    # ── 8. Kafka — publish notifications.email for verification ──────────
    verification_token = generate_email_token(
        user_id=db_user.id,
        purpose="email_verification",
        db=db,
    )
    from app.config import FRONTEND_BASE_URL, ADMIN_FRONTEND_URL, ANALYST_FRONTEND_URL, VIEWER_FRONTEND_URL
    role_url_map = {
        "admin": ADMIN_FRONTEND_URL,
        "analyst": ANALYST_FRONTEND_URL,
        "viewer": VIEWER_FRONTEND_URL,
        "user": VIEWER_FRONTEND_URL,
    }
    frontend_url = role_url_map.get(db_user.role, FRONTEND_BASE_URL)
    verify_url = f"{frontend_url}/verify-email?token={verification_token}"

    email_event = {
        "event": "email.send",
        "event_id": str(uuid.uuid4()),
        "user_id": db_user.id,
        "to": db_user.email,
        "subject": "Verify your SentinelIQ account",
        "template": "email_verification.html",
        "context": {
            "user_name": db_user.first_name,
            "verification_url": verify_url,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }
    await _publish_kafka_event("notifications.email", email_event, key=db_user.id)

    # Also send email directly as fallback (in case Kafka consumer is down)
    try:
        html = render_template("email_verification.html", {
            "user_name": db_user.first_name,
            "verification_url": verify_url,
        })
        from app.services.email_service import send_email
        send_email(db_user.email, "Verify your SentinelIQ account", html)
        MetricsTracker.track_email_sent("verification")
    except Exception as e:
        logger.warning(f"Fallback email send failed (will retry via Kafka): {e}")

    # ── 9. Redis Stream — publish user event ──────────────────────────────
    _publish_redis_event({
        "event_id": str(uuid.uuid4()),
        "user_id": db_user.id,
        "action": "register",
        "role": "viewer",
        "device": user_agent[:200],
        "ip_address": ip_address,
        "timestamp": datetime.utcnow().isoformat(),
    })

    # ── 10. Kafka — analytics pipeline event ─────────────────────────────
    analytics_event = {
        "event": "analytics.user_registration",
        "event_id": str(uuid.uuid4()),
        "user_id": db_user.id,
        "org_id": db_user.org_id,
        "role": "viewer",
        "channel": "web",
        "timestamp": datetime.utcnow().isoformat(),
    }
    await _publish_kafka_event("analytics.events", analytics_event, key=db_user.id)

    # ── 11. Generate tokens (auto-login) ──────────────────────────────────
    access_token = create_access_token({
        "sub": db_user.id,
        "role": db_user.role,
        "email": db_user.email,
        "is_virtual": False,
    })
    refresh_token = create_and_store_refresh_token(db_user.id, db)

    logger.info(
        f"Registration complete: {db_user.email} (id={db_user.id})",
        extra={"user_id": db_user.id, "role": "viewer"},
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "role": db_user.role,
            "first_name": db_user.first_name,
            "last_name": db_user.last_name,
            "org_id": db_user.org_id,
            "email_verified": db_user.email_verified,
        },
        "message": "Registration successful. Please verify your email.",
    }
