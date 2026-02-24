"""
Core SQLAlchemy models for SentinelIQ.
This module exports all database models for the application.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, JSON, Text, Numeric, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

# Import Base from dedicated module to ensure single instance across all models
from app.models.base import Base, generate_uuid


class UserStatus(str, Enum):
    """User account status enum."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    SYSTEM = "system"  # System/service accounts


class UserVisibility(str, Enum):
    """User profile visibility level."""
    PUBLIC = "public"       # Visible to all authenticated users
    ORGANIZATION = "org"    # Visible only within same organization
    PRIVATE = "private"     # Visible only to self and admins
    GLOBAL = "global"       # System user visible to all based on permissions


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="organization")


class User(Base):
    """
    User model with enhanced fields for system-wide visibility.
    
    Supports:
    - Standard users (viewer, analyst, admin)
    - System users (visible globally based on permissions)
    - Multi-tenant organization scoping
    - Comprehensive audit metadata
    """
    __tablename__ = "users"
    
    # Core identity
    id = Column(String, primary_key=True, default=generate_uuid)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    
    # Role and permissions
    role = Column(String, default="viewer")  # admin, analyst, viewer
    
    # Status and visibility (NEW)
    status = Column(String, default=UserStatus.ACTIVE.value)  # active, suspended, pending, system
    visibility = Column(String, default=UserVisibility.PRIVATE.value)  # public, org, private, global
    
    # Risk and security
    risk_score = Column(Integer, default=0)
    risk_breakdown = Column(JSON, default=lambda: {"identity": 0, "behavior": 0, "financial": 0, "compliance": 0})
    trust_level = Column(String, default="unknown")  # trusted, under_review, restricted, unknown
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    
    # MFA
    mfa_enabled = Column(Boolean, default=False)
    totp_secret = Column(String, nullable=True)  # encrypted TOTP secret
    
    # Contact
    phone = Column(String, nullable=True)
    phone_verified = Column(Boolean, default=False)
    
    # System user flag (NEW)
    is_system_user = Column(Boolean, default=False)
    
    # Metadata (NEW) - stores device info, last login details, etc.
    # Named 'user_metadata' to avoid conflict with SQLAlchemy reserved 'metadata'
    user_metadata = Column(JSON, default=dict)
    
    # Device and session tracking (NEW)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String, nullable=True)
    last_device_info = Column(JSON, default=dict)
    
    # Audit trail (NEW)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    
    @property
    def full_name(self) -> str:
        """Return user's full name."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_globally_visible(self) -> bool:
        """Check if user is visible system-wide."""
        return self.is_system_user and self.visibility == UserVisibility.GLOBAL.value
    
    def to_public_dict(self) -> dict:
        """Return public-safe user data (no PII or sensitive fields)."""
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role,
            "status": self.status,
            "is_system_user": self.is_system_user,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def to_full_dict(self) -> dict:
        """Return full user data (admin access only)."""
        return {
            "id": self.id,
            "org_id": self.org_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "role": self.role,
            "status": self.status,
            "visibility": self.visibility,
            "is_system_user": self.is_system_user,
            "risk_score": self.risk_score,
            "risk_breakdown": self.risk_breakdown,
            "trust_level": self.trust_level,
            "mfa_enabled": self.mfa_enabled,
            "phone": self.phone,
            "phone_verified": self.phone_verified,
            "is_active": self.is_active,
            "email_verified": self.email_verified,
            "user_metadata": self.user_metadata,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "last_login_ip": self.last_login_ip,
            "last_device_info": self.last_device_info,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    actor_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    target = Column(String, nullable=True)
    event_metadata = Column(JSON, default={})
    timestamp = Column(DateTime, default=datetime.utcnow)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_revoked = Column(Boolean, default=False)


class LoginAttempt(Base):
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


# Re-export for convenience
__all__ = [
    "Base",
    "generate_uuid",
    "UserStatus",
    "UserVisibility",
    "Organization",
    "User",
    "AuditLog",
    "RefreshToken",
    "LoginAttempt",
    "EmailToken",
    "UserAccessLog",
    "Loan",
    "LoanRepayment",
    "UserSession",
    "SecurityAlert",
    "Investigation",
    "InvestigationNote",
    "Recommendation",
    "Policy",
    "EnforcementAction",
]

# Import analyst models so they are registered
from app.models.analyst import Investigation, InvestigationNote, Recommendation

# Import admin governance models so they are registered
from app.models.admin import Policy, EnforcementAction


class UserAccessLog(Base):
    """
    Tracks access to user profiles for audit and compliance.
    """
    __tablename__ = "user_access_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    accessor_id = Column(String, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    fields_accessed = Column(JSON, default=list)
    access_level = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    request_path = Column(String, nullable=True)
    success = Column(Boolean, default=True)
    failure_reason = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────────────────────
# Fintech Models: Loans, Repayments, Sessions, Alerts
# ─────────────────────────────────────────────────────────────

class Loan(Base):
    """
    Loan model for fintech credit risk tracking.
    Status lifecycle: pending → approved/rejected → active → closed/defaulted
    """
    __tablename__ = "loans"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected, active, closed, defaulted
    principal = Column(Numeric(12, 2), nullable=False)
    outstanding = Column(Numeric(12, 2), nullable=False)
    interest_rate = Column(Numeric(5, 2), default=0)
    term_months = Column(Integer, default=12)
    purpose = Column(String, nullable=True)
    next_due_date = Column(Date, nullable=True)
    repayment_schedule = Column(JSON, default=list)  # list of installments
    last_repayment_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="loans")
    repayments = relationship("LoanRepayment", back_populates="loan", order_by="LoanRepayment.created_at.desc()")


class LoanRepayment(Base):
    """
    Individual loan repayment record.
    Status: pending, completed, failed, late
    """
    __tablename__ = "loan_repayments"

    id = Column(String, primary_key=True, default=generate_uuid)
    loan_id = Column(String, ForeignKey("loans.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String, default="completed")  # pending, completed, failed, late
    due_date = Column(Date, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    is_late = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    loan = relationship("Loan", back_populates="repayments")


class UserSession(Base):
    """
    Tracks user sessions for device/location management.
    Users can view and revoke their sessions.
    """
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_info = Column(JSON, default=dict)  # user agent, device id, fingerprint
    ip_address = Column(String, nullable=True)
    location = Column(JSON, default=dict)  # country, city, coords
    user_agent = Column(String, nullable=True)
    is_current = Column(Boolean, default=False)
    revoked = Column(Boolean, default=False)
    refresh_jti = Column(String, nullable=True)  # jti of refresh token
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="sessions")


class SecurityAlert(Base):
    """
    Security alerts sent to users (suspicious login, risk changes, etc.)
    """
    __tablename__ = "security_alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String, nullable=False)  # suspicious_login, risk_change, mfa_disabled, loan_overdue, etc.
    severity = Column(String, default="info")  # info, warning, critical
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    alert_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="security_alerts")
