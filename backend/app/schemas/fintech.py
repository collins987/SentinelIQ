"""
Schemas for fintech features: loans, sessions, risk breakdown, MFA, alerts.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
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
    verification_status: Optional[str] = "verified"
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    payer_user_id: Optional[str] = None
    payer_name: Optional[str] = None
    payer_org_id: Optional[str] = None
    due_date: Optional[str] = None
    paid_at: Optional[str] = None
    is_late: bool = False
    created_at: Optional[str] = None


class PaymentMethod(str, Enum):
    mpesa = "mpesa"
    cash = "cash"
    bank_transfer = "bank_transfer"
    card = "card"
    wallet = "wallet"


class RepaymentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to repay")
    payment_method: PaymentMethod = Field(..., description="Payment method")
    payment_reference: Optional[str] = Field(None, max_length=120)


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
# Phone Verification
# ─────────────────────────────────────────────────────────────

class PhoneUpdateRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20, description="Phone number (e.g. +254712345678)")


class PhoneStatusResponse(BaseModel):
    phone: Optional[str] = None
    phone_verified: bool = False
    message: str


class PhoneVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class PhoneVerifyResponse(BaseModel):
    verified: bool
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


# ─────────────────────────────────────────────────────────────
# Repayment schedule & verification
# ─────────────────────────────────────────────────────────────

class ScheduleItemOut(BaseModel):
    id: str
    installment_number: int
    due_date: Optional[str] = None
    expected_amount: float
    status: str
    penalty_applied: float = 0


class RepaymentScheduleResponse(BaseModel):
    loan_id: str
    schedule: List[ScheduleItemOut]


class RepaymentListResponse(BaseModel):
    repayments: List[RepaymentOut]
    total: int


class RepaymentVerifyRequest(BaseModel):
    approve: bool = True


# ─────────────────────────────────────────────────────────────
# Transactions & spending alerts
# ─────────────────────────────────────────────────────────────

class TransactionOut(BaseModel):
    id: str
    type: str
    amount: float
    status: str
    risk_score: float = 0
    loan_id: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: Optional[str] = None


class TransactionListResponse(BaseModel):
    transactions: List[TransactionOut]
    total: int


class SpendingAlertUpdate(BaseModel):
    daily_limit: Optional[float] = None
    weekly_limit: Optional[float] = None
    monthly_limit: Optional[float] = None
    notify: Optional[bool] = None


class SpendingAlertResponse(BaseModel):
    daily_limit: Optional[float] = None
    weekly_limit: Optional[float] = None
    monthly_limit: Optional[float] = None
    notify: bool = True


class GlobalThresholdUpdate(BaseModel):
    daily_velocity_limit: Optional[float] = None
    weekly_velocity_limit: Optional[float] = None
    anomaly_score_threshold: Optional[float] = None


class InterestPolicyCreate(BaseModel):
    name: str
    risk_tier: str
    base_rate: float
    penalty_rate: float
    grace_period_days: int = 0
    active: bool = True


class InterestPolicyOut(BaseModel):
    id: str
    name: str
    risk_tier: str
    base_rate: float
    penalty_rate: float
    grace_period_days: int
    active: bool


class InterestSimulationResponse(BaseModel):
    loan_id: str
    risk_tier: str
    base_rate: float
    penalty_rate: float
    outstanding: float
    projected_monthly_interest: float
    projected_penalty_if_overdue: float
    policy_id: Optional[str] = None
    policy_name: Optional[str] = None


class RepaymentFreezeRequest(BaseModel):
    loan_id: str
    freeze: bool = True
    reason: Optional[str] = None
