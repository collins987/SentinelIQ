"""
SQLAlchemy ORM models for SentinelIQ.
Organized as a package to properly separate concerns while maintaining a single Base declarative.
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    """Generate a UUID string for primary keys."""
    return str(uuid.uuid4())


# ========== CORE MODELS ==========

class Organization(Base):
    """Organization entity."""
    __tablename__ = "organizations"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="organization")


class User(Base):
    """User entity with role-based access control."""
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="analyst")  # admin, risk_analyst, compliance_officer, soc_responder, data_scientist, backend_engineer
    risk_score = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="users")


class AuditLog(Base):
    """Audit trail for user actions."""
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    actor_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    target = Column(String, nullable=True)
    event_metadata = Column(JSON, default={})
    timestamp = Column(DateTime, default=datetime.utcnow)


class RefreshToken(Base):
    """JWT refresh token management."""
    __tablename__ = "refresh_tokens"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_revoked = Column(Boolean, default=False)


class LoginAttempt(Base):
    """Track login attempts for security."""
    __tablename__ = "login_attempts"
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    success = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


class EmailToken(Base):
    """
    Secure email tokens for email verification and password reset.
    Tokens are hashed before storage (never stored in plaintext).
    Single-use, time-limited, purpose-locked.
    """
    __tablename__ = "email_tokens"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, nullable=False, unique=True)  # SHA256 hash of token
    purpose = Column(String, nullable=False)  # "email_verification" | "password_reset"
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)  # Enforce single-use
    created_at = Column(DateTime, default=datetime.utcnow)


# ========== WEBHOOK MODELS ==========

class Webhook(Base):
    """
    Webhook configuration for external integrations.
    Stores webhook URLs, secrets, and event filtering rules.
    """
    __tablename__ = "webhooks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    url = Column(String, nullable=False)  # HTTPS endpoint
    secret_key = Column(String, nullable=False)  # For HMAC-SHA256 signing
    event_types = Column(JSON, default=[])  # ["risk.high", "risk.critical"] or empty for all
    min_risk_level = Column(String, default="low")  # Minimum risk level to trigger
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Statistics
    total_deliveries = Column(Integer, default=0)
    successful_deliveries = Column(Integer, default=0)
    last_delivered_at = Column(DateTime, nullable=True)
    last_error = Column(String, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    deliveries = relationship("WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan")
    
    def success_rate(self):
        """Calculate success rate percentage."""
        if self.total_deliveries == 0:
            return 100.0
        return (self.successful_deliveries / self.total_deliveries) * 100


class WebhookDelivery(Base):
    """
    Audit trail for webhook deliveries.
    Records each delivery attempt with status, response, and retry information.
    """
    __tablename__ = "webhook_deliveries"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    webhook_id = Column(String, ForeignKey("webhooks.id"), nullable=False)
    event_id = Column(String, nullable=False)  # Reference to risk event
    
    # Delivery attempt tracking
    attempt_number = Column(Integer, default=1)
    max_attempts = Column(Integer, default=4)
    
    # Delivery outcome
    status_code = Column(Integer, nullable=True)  # HTTP status code
    is_successful = Column(Boolean, default=False)
    response_body = Column(String, nullable=True)  # Truncated response
    response_time_ms = Column(Integer, nullable=True)  # Latency
    
    # Retry scheduling
    next_retry_at = Column(DateTime, nullable=True)  # When to retry next
    last_error_message = Column(String, nullable=True)
    
    # Timestamps
    sent_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    webhook = relationship("Webhook", back_populates="deliveries")


# ========== MILESTONE 1 & 2: TRANSACTIONAL OUTBOX PATTERN ==========

class Outbox(Base):
    """
    Transactional Outbox Pattern for guaranteed event delivery.
    Ensures no data loss: if publisher crashes, events are retried on restart.
    """
    __tablename__ = "outbox"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    event_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)  # login_attempt, risk_scored, etc.
    payload_json = Column(JSON, nullable=False)
    status = Column(String, default="pending")  # pending, published, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)


# ========== MILESTONE 1 & 2: SHADOW MODE ==========

class ShadowModeResult(Base):
    """
    Track hypothetical rule evaluations without impacting production.
    Allows Data Scientists to measure rule accuracy before deployment.
    """
    __tablename__ = "shadow_mode_results"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    rule_id = Column(String, nullable=False)
    event_id = Column(String, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Hypothetical evaluation
    would_have_blocked = Column(Boolean, nullable=False)
    confidence_score = Column(Integer, nullable=False)  # 0-100
    
    # Ground truth (labeled by analyst after incident review)
    actual_fraud = Column(Boolean, nullable=True)  # NULL until analyst labels
    labeled_at = Column(DateTime, nullable=True)
    labeled_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


# ========== MILESTONE 1 & 2: AUDIT LOGS WITH CRYPTO CHAINING ==========

class CryptoChainedAuditLog(Base):
    """
    Immutable audit logs with SHA-256 chaining for compliance.
    Each entry links to the previous via cryptographic hash.
    Tampering breaks the chain, detected on verification.
    """
    __tablename__ = "crypto_chained_audit_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    
    # Cryptographic chaining
    previous_hash = Column(String, nullable=True)  # Links to previous entry
    current_hash = Column(String, nullable=False)  # SHA-256 of this entry
    
    # Audit data
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String, nullable=True)  # Context: what role made the change
    event_type = Column(String, nullable=False)  # created, updated, deleted, accessed
    resource_type = Column(String, nullable=False)  # user, rule, event, integration
    resource_id = Column(String, nullable=False)
    
    payload_json = Column(JSON, nullable=False)  # Scrubbed of PII
    is_shadow_mode = Column(Boolean, default=False)
    
    # Metadata
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)


# ========== MILESTONE 1 & 2: GRAPH LINK ANALYSIS ==========

class UserConnection(Base):
    """
    Graph-based user relationships for fraud ring detection.
    Tracks how users are connected (shared IP, device, email domain, etc).
    """
    __tablename__ = "user_connections"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    
    user_a_id = Column(String, ForeignKey("users.id"), nullable=False)
    user_b_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Connection metadata
    connection_type = Column(String, nullable=False)  # ip_address, device, email_domain, phone
    connection_value = Column(String, nullable=False)  # The actual IP, device ID, etc.
    connection_strength = Column(Integer, default=50)  # 0-100, 100=definitive
    
    # Timeline
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    event_count = Column(Integer, default=1)
    
    # Risk assessment
    risk_score_user_a = Column(Integer, nullable=True)
    risk_score_user_b = Column(Integer, nullable=True)
    is_flagged_ring = Column(Boolean, default=False)


# ========== MILESTONE 1 & 2: RISK PROFILES (REDIS BACKED) ==========
# Note: Risk profiles are cached in Redis (TTL 24h) but we track metadata in Postgres

class RiskProfile(Base):
    """
    Metadata for user risk profiles (actual data cached in Redis).
    Tracks when profiles were last computed for auditing.
    """
    __tablename__ = "risk_profiles"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Risk metrics snapshot (for auditing; real-time data in Redis)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String, default="low")  # low, medium, high, critical
    
    # Velocity signals
    failed_attempts_1h = Column(Integer, default=0)
    distinct_ips_24h = Column(Integer, default=1)
    distinct_devices_24h = Column(Integer, default=1)
    location_variance_score = Column(Integer, default=0)  # 0-100
    
    # Timestamps
    last_computed_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


# ========== EXPORT PUBLIC API ==========

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
