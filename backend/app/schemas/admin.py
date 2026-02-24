"""
Admin Governance Module Pydantic Schemas — SentinelIQ

Request/response models for admin governance workflows:
- Policy CRUD
- Enforcement actions
- User management (IAM)
- Compliance & audit reporting
- System overview
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


# ═══════════════════════════════════════════════════════════════
# Policy Schemas
# ═══════════════════════════════════════════════════════════════

class PolicyCreate(BaseModel):
    """Create a new governance policy."""
    name: str = Field(..., min_length=2, max_length=200, description="Policy name (unique)")
    category: str = Field(
        default="general",
        pattern="^(risk_thresholds|auth_requirements|loan_eligibility|enforcement_rules|compliance|general)$",
        description="Policy category"
    )
    description: Optional[str] = Field(None, max_length=2000)
    config: Dict[str, Any] = Field(..., description="Policy configuration (JSON)")


class PolicyUpdate(BaseModel):
    """Update an existing policy."""
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    category: Optional[str] = Field(
        None,
        pattern="^(risk_thresholds|auth_requirements|loan_eligibility|enforcement_rules|compliance|general)$"
    )
    description: Optional[str] = Field(None, max_length=2000)
    config: Optional[Dict[str, Any]] = None
    active: Optional[bool] = None


class PolicyOut(BaseModel):
    """Policy response."""
    id: str
    name: str
    category: str
    description: Optional[str] = None
    config: Dict[str, Any]
    version: int
    active: bool
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PolicyListResponse(BaseModel):
    """Paginated policy list."""
    policies: List[PolicyOut]
    total: int
    page: int
    page_size: int


# ═══════════════════════════════════════════════════════════════
# Enforcement Schemas
# ═══════════════════════════════════════════════════════════════

class EnforcementActionCreate(BaseModel):
    """Create an enforcement action."""
    action: str = Field(
        ...,
        pattern="^(lock|unlock|restrict|freeze_loan|unfreeze_loan|require_mfa|override_risk|force_password_reset|suspend|activate)$",
        description="Enforcement action type"
    )
    reason: str = Field(..., min_length=5, max_length=2000, description="Justification for enforcement")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class EnforcementActionOut(BaseModel):
    """Enforcement action response."""
    id: str
    user_id: str
    action: str
    enforced_by: str
    reason: str
    metadata: Dict[str, Any]
    created_at: datetime
    target_user_name: Optional[str] = None
    target_user_email: Optional[str] = None
    admin_name: Optional[str] = None

    class Config:
        from_attributes = True


class EnforcementHistoryResponse(BaseModel):
    """Paginated enforcement history."""
    actions: List[EnforcementActionOut]
    total: int
    page: int
    page_size: int


class RiskOverrideRequest(BaseModel):
    """Request to override a user's risk score."""
    new_risk_score: int = Field(..., ge=0, le=1000, description="New risk score")
    reason: str = Field(..., min_length=5, max_length=2000)


class RecommendationReviewRequest(BaseModel):
    """Approve or reject an analyst recommendation."""
    review_notes: Optional[str] = Field(None, max_length=2000)


# ═══════════════════════════════════════════════════════════════
# IAM Schemas
# ═══════════════════════════════════════════════════════════════

class AdminUserCreate(BaseModel):
    """Admin-initiated user creation."""
    email: str = Field(..., description="User email")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="viewer", pattern="^(admin|analyst|viewer)$")
    org_id: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, description="If omitted, a temporary password is generated")


class AdminUserUpdate(BaseModel):
    """Admin-initiated user update."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = Field(None, pattern="^(admin|analyst|viewer)$")
    org_id: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|suspended|pending)$")
    visibility: Optional[str] = Field(None, pattern="^(public|org|private|global)$")
    trust_level: Optional[str] = Field(None, pattern="^(trusted|under_review|restricted|unknown)$")


class AdminUserOut(BaseModel):
    """Full user representation for admin."""
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    status: str
    visibility: str
    is_active: bool
    email_verified: bool
    mfa_enabled: bool
    risk_score: int
    trust_level: str
    org_id: Optional[str] = None
    is_system_user: bool
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    enforcement_count: int = 0

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    """Paginated user list for admin."""
    users: List[AdminUserOut]
    total: int
    page: int
    page_size: int


# ═══════════════════════════════════════════════════════════════
# Compliance & Reporting Schemas
# ═══════════════════════════════════════════════════════════════

class AuditExportRequest(BaseModel):
    """Request to export audit logs."""
    format: str = Field(default="json", pattern="^(json|csv)$")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    actions: Optional[List[str]] = None


class SystemReportOut(BaseModel):
    """System-wide compliance report."""
    generated_at: datetime
    report_period: Dict[str, str]
    user_summary: Dict[str, Any]
    risk_summary: Dict[str, Any]
    enforcement_summary: Dict[str, Any]
    policy_summary: Dict[str, Any]
    compliance_indicators: Dict[str, Any]


class OrgRiskSummaryOut(BaseModel):
    """Organization-level risk summary."""
    org_id: str
    org_name: str
    total_users: int
    high_risk_users: int
    avg_risk_score: float
    active_investigations: int
    pending_recommendations: int
    recent_enforcement_count: int


class SystemOverviewOut(BaseModel):
    """Admin system overview for dashboard landing."""
    risk_distribution: Dict[str, int]
    active_investigations: int
    pending_recommendations: int
    recent_enforcement_actions: int
    total_users: int
    active_sessions: int
    high_risk_user_count: int
    policy_count: int
    mfa_adoption_percent: float
    suspicious_org_count: int
