"""
Admin Governance Module Database Models — SentinelIQ

Models:
- Policy: System governance policies (risk thresholds, auth rules, loan eligibility)
- EnforcementAction: Admin enforcement decisions (lock, restrict, freeze, override)

These tables form the backbone of the fintech governance engine,
enabling policy-driven risk management and auditable enforcement workflows.
"""

from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Boolean, JSON, Index, Integer, Float
)
from sqlalchemy.orm import relationship

from app.models.base import Base, generate_uuid


class Policy(Base):
    """
    System governance policy.

    Policies define configurable thresholds, rules, and weights that
    control automated and manual enforcement across SentinelIQ.

    Categories:
    - risk_thresholds: Score boundaries for medium/high/critical risk levels
    - auth_requirements: MFA enforcement, session TTL, password policy
    - loan_eligibility: Credit score minimums, max loan amounts, DTI limits
    - enforcement_rules: Auto-lock triggers, velocity limits, geo restrictions
    - compliance: Data retention periods, PII handling, audit frequency

    Lifecycle: active → inactive (soft-deactivated, never hard-deleted)
    """
    __tablename__ = "policies"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True)
    category = Column(String, nullable=False, default="general")
    description = Column(Text, nullable=True)
    config = Column(JSON, nullable=False, default=dict)
    version = Column(Integer, default=1)
    active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    updated_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="policies_created")
    updater = relationship("User", foreign_keys=[updated_by])

    __table_args__ = (
        Index("idx_policies_name", "name"),
        Index("idx_policies_category", "category"),
        Index("idx_policies_active", "active"),
    )


class EnforcementAction(Base):
    """
    Admin enforcement action record.

    Captures every enforcement decision made by an admin,
    creating an immutable audit trail for compliance.

    Action types:
    - lock: Account locked (immediate login prevention)
    - unlock: Account unlocked (restored access)
    - restrict: Partial restrictions applied
    - freeze_loan: Loan frozen (no disbursements/payments)
    - unfreeze_loan: Loan unfrozen
    - require_mfa: Force MFA enrollment
    - override_risk: Manual risk score override
    - force_password_reset: Require password change on next login
    - suspend: Account suspended (temporary disabled state)
    - activate: Account re-activated

    All enforcement actions are immutable — they cannot be edited or deleted.
    """
    __tablename__ = "enforcement_actions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    enforced_by = Column(String, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    action_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    target_user = relationship("User", foreign_keys=[user_id], backref="enforcement_actions")
    admin = relationship("User", foreign_keys=[enforced_by])

    __table_args__ = (
        Index("idx_enforcement_user", "user_id"),
        Index("idx_enforcement_action", "action"),
        Index("idx_enforcement_admin", "enforced_by"),
        Index("idx_enforcement_created", "created_at"),
    )
