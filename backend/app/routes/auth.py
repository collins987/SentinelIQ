def login(..., db: Session = Depends(get_db)):

from app.services.auth_audit import log_auth_attempt
from app.services.redis_stream import get_redis_stream_manager
from app.services.risk_engine import RiskEngine
from app.services.message_center import MessageService
from app.core.metrics import MetricsTracker
from app.core.logging import log_event
from app.schemas.event import SentinelEvent, ActorContext, GeoContext, AuthenticationPayload
from sqlalchemy.orm import Session
from fastapi import Depends, Request
import asyncio

def login(request: Request, db: Session = Depends(get_db)):
    # ...existing code for extracting user, password, etc.
    user = ...  # get user from db
    password_is_valid = ...  # validate password
    device_fingerprint = request.headers.get("X-Device-Fingerprint")
    user_agent = request.headers.get("user-agent", "")
    ip_address = request.client.host if request.client else ""
    session_id = request.headers.get("X-Session-Id")
    org_id = getattr(user, "org_id", None)

    # Check if device is new
    redis_manager = get_redis_stream_manager()
    is_new_device = False
    if device_fingerprint and user.id:
        is_new_device = not redis_manager.is_known_device(user.id, device_fingerprint)
        if not is_new_device:
            # Update device expiry
            redis_manager.cache_device_fingerprint(user.id, device_fingerprint)

    # Log auth attempt
    log_auth_attempt(user_id=user.id, action="login_attempt", db=db, success=password_is_valid, metadata={
        "device_fingerprint": device_fingerprint,
        "user_agent": user_agent,
        "ip_address": ip_address,
        "is_new_device": is_new_device
    })

    # If login is successful, check for new device and trigger risk/alert
    if password_is_valid:
        if is_new_device:
            # Risk event for new device
            event = SentinelEvent(
                event_type="authentication.login",
                actor=ActorContext(
                    user_id=user.id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_fingerprint=device_fingerprint,
                    session_id=session_id
                ),
                context=GeoContext(
                    geo_lat=0.0,  # Optionally extract from request or user profile
                    geo_lon=0.0
                ),
                payload=AuthenticationPayload(
                    success=True,
                    method="password",
                    mfa_used=False
                ).dict()
            )
            risk_engine = RiskEngine()
            # Evaluate risk (async if possible)
            try:
                risk_score = asyncio.run(risk_engine.evaluate_event(event))
            except Exception:
                risk_score = None
            # Audit log
            log_event(
                action="login_new_device",
                user_id=user.id,
                target=f"device:{device_fingerprint}",
                details={"ip": ip_address, "user_agent": user_agent, "risk_score": getattr(risk_score, 'risk_score', None)}
            )
            # Send alert
            try:
                asyncio.run(MessageService().send_security_alert(
                    user_id=user.id,
                    org_id=org_id,
                    alert_type="new_device",
                    details={
                        "ip": ip_address,
                        "user_agent": user_agent,
                        "device_fingerprint": device_fingerprint
                    }
                ))
            except Exception:
                pass
            # Metrics
            MetricsTracker.track_api_request(method="POST", endpoint="/auth/login", status_code=200, duration=0)
            MetricsTracker.track_rbac_check(allowed=True, role=user.role)
    # ...existing response logic
