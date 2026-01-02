"""
Backward compatibility shim for app.models

This file exists for backward compatibility only.
All ORM models have been moved to the app.models package (__init__.py).

New code should import directly from app.models:
    from app.models import User, Organization, Base, etc.
"""

# Re-export all models from the app.models package
from app.models import (
    Base,
    generate_uuid,
    Organization,
    User,
    AuditLog,
    RefreshToken,
    LoginAttempt,
    EmailToken,
    Webhook,
    WebhookDelivery,
    Outbox,
    ShadowModeResult,
    CryptoChainedAuditLog,
    UserConnection,
    RiskProfile,
)

__all__ = [
    "Base",
    "generate_uuid",
    "Organization",
    "User",
    "AuditLog",
    "RefreshToken",
    "LoginAttempt",
    "EmailToken",
    "Webhook",
    "WebhookDelivery",
    "Outbox",
    "ShadowModeResult",
    "CryptoChainedAuditLog",
    "UserConnection",
    "RiskProfile",
]

