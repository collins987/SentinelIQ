"""
Schemas for fintech features: loans, sessions, risk breakdown, MFA, alerts.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date


# ─────────────────────────────────────────────────────────────
# Risk Breakdown & Trust
# ─────────────────────────────────────────────────────────────

class RiskSignal(BaseModel):
    signal: str
    impact: float
    detail: str
    timestamp: Optional[str] = None


class RiskBreakdownResponse(BaseModel):
    risk_score: float
    risk_level: str  # low, medium, high, critical
    breakdown: Dict[str, float]  # {identity, behavior, financial, compliance}
    trust_level: str  # trusted, under_review, restricted, unknown
    last_updated: Optional[str] = None
    explanation: List[RiskSignal] = []


# ─────────────────────────────────────────────────────────────
# Sessions
# ─────────────────────────────────────────────────────────────

class SessionOut(BaseModel):
    id: str
    device_info: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    location: Dict[str, Any] = {}
    user_agent: Optional[str] = None
    is_current: bool = False
    created_at: Optional[str] = None
    last_seen_at: Optional[str] = None


class SessionListResponse(BaseModel):
    sessions: List[SessionOut]
    total: int


# ─────────────────────────────────────────────────────────────
# Loans
# ─────────────────────────────────────────────────────────────

class LoanOut(BaseModel):
    id: str
    status: str
    principal: float
    outstanding: float
    interest_rate: float
    term_months: int
    purpose: Optional[str] = None
    next_due_date: Optional[str] = None
    repayment_schedule: List[Dict[str, Any]] = []
    last_repayment_at: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: Optional[str] = None


class LoanListResponse(BaseModel):
    loans: List[LoanOut]
    total: int
    total_outstanding: float
    total_principal: float


class RepaymentOut(BaseModel):
    id: str
    loan_id: str
    amount: float
    status: str
    due_date: Optional[str] = None
    paid_at: Optional[str] = None
    is_late: bool = False
    created_at: Optional[str] = None


class RepaymentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to repay")


class RepaymentResponse(BaseModel):
    repayment: RepaymentOut
    loan: LoanOut
    message: str


class LoanApplicationRequest(BaseModel):
    amount: float = Field(..., gt=0, le=1000000)
    term_months: int = Field(default=12, ge=1, le=360)
    purpose: Optional[str] = None


class LoanApplicationResponse(BaseModel):
    loan: LoanOut
    message: str
    eligible: bool


# ─────────────────────────────────────────────────────────────
# MFA
# ─────────────────────────────────────────────────────────────

class MFAEnableResponse(BaseModel):
    secret: str
    qr_uri: str
    message: str


class MFAVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class MFAVerifyResponse(BaseModel):
    verified: bool
    message: str


class MFADisableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class MFAStatusResponse(BaseModel):
    mfa_enabled: bool
    message: str


# ─────────────────────────────────────────────────────────────
# Security Alerts
# ─────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    message: str
    is_read: bool = False
    is_dismissed: bool = False
    alert_metadata: Dict[str, Any] = {}
    created_at: Optional[str] = None


class AlertListResponse(BaseModel):
    alerts: List[AlertOut]
    total: int
    unread: int


# ─────────────────────────────────────────────────────────────
# Incident Reporting
# ─────────────────────────────────────────────────────────────

class IncidentReportRequest(BaseModel):
    incident_type: str = Field(..., description="Type: suspicious_login, unauthorized_access, fraud, other")
    description: str = Field(..., min_length=10, max_length=2000)
    related_transaction_id: Optional[str] = None


class IncidentReportResponse(BaseModel):
    incident_id: str
    status: str
    message: str


# ─────────────────────────────────────────────────────────────
# User Dashboard (enhanced)
# ─────────────────────────────────────────────────────────────

class UserDashboardResponse(BaseModel):
    profile: Dict[str, Any]
    risk_scores: List[Dict[str, Any]]
    risk_breakdown: Dict[str, float]
    trust_level: str
    activity: Dict[str, Any]
    session: Dict[str, Any]
    loans_summary: Dict[str, Any]
    alerts_summary: Dict[str, Any]
