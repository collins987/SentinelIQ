"""
User-facing API routes (v1) for SentinelIQ fintech features.

Endpoints:
  - /api/v1/users/me/risk          — Risk score + breakdown + explanation
  - /api/v1/users/me/sessions      — List & revoke sessions
  - /api/v1/users/me/loans         — List loans
  - /api/v1/users/me/loans/{id}    — Loan detail
  - /api/v1/users/me/loans/apply   — Apply for loan
  - /api/v1/users/me/loans/{id}/repay — Make repayment
  - /api/v1/users/me/mfa/*         — MFA enable/verify/disable/status
  - /api/v1/users/me/alerts        — Security alerts
  - /api/v1/users/me/report-incident — Report security incident
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from decimal import Decimal
import pyotp
import logging

from app.dependencies import get_db, get_current_user
from app.models import (
    User, Loan, LoanRepayment, UserSession, SecurityAlert,
    AuditLog, generate_uuid
)
from app.schemas.fintech import (
    RiskBreakdownResponse, RiskSignal,
    SessionOut, SessionListResponse,
    LoanOut, LoanListResponse, RepaymentOut, RepaymentRequest, RepaymentResponse,
    LoanApplicationRequest, LoanApplicationResponse,
    MFAEnableResponse, MFAVerifyRequest, MFAVerifyResponse,
    MFADisableRequest, MFAStatusResponse,
    AlertOut, AlertListResponse,
    IncidentReportRequest, IncidentReportResponse,
    PhoneUpdateRequest, PhoneStatusResponse, PhoneVerifyRequest, PhoneVerifyResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users/me", tags=["User API v1"])


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _serialize_datetime(dt) -> str | None:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    if isinstance(dt, date):
        return dt.isoformat()
    return str(dt)


def _serialize_decimal(d) -> float:
    if d is None:
        return 0.0
    return float(d)


def _loan_to_dict(loan: Loan) -> dict:
    return {
        "id": loan.id,
        "status": loan.status,
        "principal": _serialize_decimal(loan.principal),
        "outstanding": _serialize_decimal(loan.outstanding),
        "interest_rate": _serialize_decimal(loan.interest_rate),
        "term_months": loan.term_months,
        "purpose": loan.purpose,
        "next_due_date": _serialize_datetime(loan.next_due_date),
        "repayment_schedule": loan.repayment_schedule or [],
        "last_repayment_at": _serialize_datetime(loan.last_repayment_at),
        "approved_at": _serialize_datetime(loan.approved_at),
        "created_at": _serialize_datetime(loan.created_at),
    }


def _repayment_to_dict(rep: LoanRepayment) -> dict:
    return {
        "id": rep.id,
        "loan_id": rep.loan_id,
        "amount": _serialize_decimal(rep.amount),
        "status": rep.status,
        "due_date": _serialize_datetime(rep.due_date),
        "paid_at": _serialize_datetime(rep.paid_at),
        "is_late": rep.is_late,
        "created_at": _serialize_datetime(rep.created_at),
    }


def _audit_log(db: Session, user_id: str, action: str, target: str = None, metadata: dict = None):
    """Write an audit log entry."""
    log = AuditLog(
        id=generate_uuid(),
        actor_id=user_id,
        action=action,
        target=target,
        event_metadata=metadata or {},
        timestamp=datetime.utcnow()
    )
    db.add(log)


def _compute_trust_level(risk_score: int) -> str:
    """Derive trust level from risk score."""
    if risk_score <= 300:
        return "trusted"
    elif risk_score <= 600:
        return "under_review"
    else:
        return "restricted"


def _compute_risk_level(risk_score: int) -> str:
    """Derive risk level label."""
    if risk_score <= 300:
        return "low"
    elif risk_score <= 600:
        return "medium"
    elif risk_score <= 800:
        return "high"
    else:
        return "critical"


# ─────────────────────────────────────────────────────────────
# RISK ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/risk", response_model=RiskBreakdownResponse)
async def get_my_risk(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the current user's risk score with full breakdown and explanation.
    Returns composite score (0-1000), domain breakdown, trust level, and recent signals.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    breakdown = user.risk_breakdown or {"identity": 0, "behavior": 0, "financial": 0, "compliance": 0}
    risk_score = user.risk_score or 0

    # Gather recent signals from audit logs
    recent_audits = (
        db.query(AuditLog)
        .filter(AuditLog.actor_id == user.id)
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
        .all()
    )

    signals = []
    for audit in recent_audits:
        meta = audit.event_metadata or {}
        if "risk_impact" in meta:
            signals.append(RiskSignal(
                signal=audit.action,
                impact=meta.get("risk_impact", 0),
                detail=meta.get("detail", audit.action),
                timestamp=_serialize_datetime(audit.timestamp),
            ))

    # Add contextual signals based on user state
    if user.mfa_enabled:
        signals.append(RiskSignal(signal="mfa_enabled", impact=-30, detail="MFA is enabled on your account"))
    if not user.email_verified:
        signals.append(RiskSignal(signal="email_unverified", impact=50, detail="Email is not verified"))

    # Check loan-related signals
    active_loans = db.query(Loan).filter(Loan.user_id == user.id, Loan.status == "active").all()
    for loan in active_loans:
        late_payments = db.query(LoanRepayment).filter(
            LoanRepayment.loan_id == loan.id,
            LoanRepayment.is_late == True
        ).count()
        if late_payments > 0:
            signals.append(RiskSignal(
                signal="late_payments",
                impact=60 * late_payments,
                detail=f"{late_payments} late payment(s) on loan #{loan.id[:8]}"
            ))

    return RiskBreakdownResponse(
        risk_score=risk_score,
        risk_level=_compute_risk_level(risk_score),
        breakdown=breakdown,
        trust_level=user.trust_level or _compute_trust_level(risk_score),
        last_updated=_serialize_datetime(user.updated_at),
        explanation=signals[:10],
    )


# ─────────────────────────────────────────────────────────────
# SESSION ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all active sessions for the current user."""
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == current_user.id, UserSession.revoked == False)
        .order_by(UserSession.last_seen_at.desc())
        .all()
    )

    return SessionListResponse(
        sessions=[
            SessionOut(
                id=s.id,
                device_info=s.device_info or {},
                ip_address=s.ip_address,
                location=s.location or {},
                user_agent=s.user_agent,
                is_current=s.is_current,
                created_at=_serialize_datetime(s.created_at),
                last_seen_at=_serialize_datetime(s.last_seen_at),
            )
            for s in sessions
        ],
        total=len(sessions),
    )


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a specific session (user can only revoke their own)."""
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.revoked = True
    _audit_log(db, current_user.id, "session_revoked", target=session_id)
    db.commit()

    return {"message": "Session revoked successfully"}


# ─────────────────────────────────────────────────────────────
# LOAN ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/loans", response_model=LoanListResponse)
async def list_loans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all loans for the current user."""
    loans = (
        db.query(Loan)
        .filter(Loan.user_id == current_user.id)
        .order_by(Loan.created_at.desc())
        .all()
    )

    total_outstanding = sum(_serialize_decimal(l.outstanding) for l in loans if l.status in ("active", "pending"))
    total_principal = sum(_serialize_decimal(l.principal) for l in loans)

    return LoanListResponse(
        loans=[_loan_to_dict(l) for l in loans],
        total=len(loans),
        total_outstanding=total_outstanding,
        total_principal=total_principal,
    )


@router.get("/loans/{loan_id}")
async def get_loan(
    loan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get details of a specific loan including repayment history."""
    loan = db.query(Loan).filter(
        Loan.id == loan_id,
        Loan.user_id == current_user.id,
    ).first()

    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    repayments = (
        db.query(LoanRepayment)
        .filter(LoanRepayment.loan_id == loan.id)
        .order_by(LoanRepayment.created_at.desc())
        .all()
    )

    total_paid = sum(_serialize_decimal(r.amount) for r in repayments if r.status == "completed")

    return {
        "loan": _loan_to_dict(loan),
        "repayments": [_repayment_to_dict(r) for r in repayments],
        "total_paid": total_paid,
        "total_late_payments": sum(1 for r in repayments if r.is_late),
    }


@router.post("/loans/apply", response_model=LoanApplicationResponse)
async def apply_for_loan(
    body: LoanApplicationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Apply for a new loan. Eligibility is checked based on trust level and risk score.
    Requirements: trust_level != 'restricted', risk_score < 800
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Eligibility checks
    trust_level = user.trust_level or _compute_trust_level(user.risk_score or 0)
    risk_score = user.risk_score or 0

    if trust_level == "restricted":
        _audit_log(db, user.id, "loan_application_denied", metadata={
            "reason": "restricted_trust_level", "amount": body.amount
        })
        db.commit()
        raise HTTPException(status_code=403, detail="Loan application denied: account is restricted due to high risk")

    if risk_score >= 800:
        _audit_log(db, user.id, "loan_application_denied", metadata={
            "reason": "critical_risk_score", "risk_score": risk_score, "amount": body.amount
        })
        db.commit()
        raise HTTPException(status_code=403, detail="Loan application denied: risk score too high")

    # Check active loan count
    active_loans = db.query(Loan).filter(
        Loan.user_id == user.id,
        Loan.status.in_(["active", "pending"])
    ).count()

    if active_loans >= 3:
        raise HTTPException(status_code=400, detail="Maximum active loan limit reached (3)")

    # Create loan (auto-approved for trusted, pending review for under_review)
    auto_approve = trust_level == "trusted" and risk_score < 300 and body.amount <= 50000

    # Generate repayment schedule
    monthly_payment = round(body.amount / body.term_months, 2)
    schedule = []
    for i in range(body.term_months):
        due = datetime.utcnow() + timedelta(days=30 * (i + 1))
        schedule.append({
            "installment": i + 1,
            "amount": monthly_payment,
            "due_date": due.strftime("%Y-%m-%d"),
            "status": "pending",
        })

    loan = Loan(
        id=generate_uuid(),
        user_id=user.id,
        org_id=user.org_id,
        status="active" if auto_approve else "pending",
        principal=Decimal(str(body.amount)),
        outstanding=Decimal(str(body.amount)),
        interest_rate=Decimal("5.50") if trust_level == "trusted" else Decimal("12.00"),
        term_months=body.term_months,
        purpose=body.purpose,
        next_due_date=(datetime.utcnow() + timedelta(days=30)).date() if auto_approve else None,
        repayment_schedule=schedule,
        approved_at=datetime.utcnow() if auto_approve else None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(loan)

    _audit_log(db, user.id, "loan_application", metadata={
        "loan_id": loan.id,
        "amount": body.amount,
        "status": loan.status,
        "auto_approved": auto_approve,
        "risk_impact": 20,
        "detail": f"Loan application for Ksh.{body.amount}",
    })

    db.commit()
    db.refresh(loan)

    return LoanApplicationResponse(
        loan=LoanOut(**_loan_to_dict(loan)),
        message="Loan approved and active" if auto_approve else "Loan application submitted for review",
        eligible=True,
    )


@router.post("/loans/{loan_id}/repay", response_model=RepaymentResponse)
async def repay_loan(
    loan_id: str,
    body: RepaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Make a repayment on an active loan.
    Emits risk signals: on-time = -50, late = +60.
    """
    loan = db.query(Loan).filter(
        Loan.id == loan_id,
        Loan.user_id == current_user.id,
    ).first()

    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if loan.status not in ("active",):
        raise HTTPException(status_code=400, detail=f"Cannot repay loan with status: {loan.status}")

    if body.amount > float(loan.outstanding):
        raise HTTPException(status_code=400, detail="Repayment amount exceeds outstanding balance")

    # Check if payment is late
    is_late = False
    if loan.next_due_date and datetime.utcnow().date() > loan.next_due_date:
        is_late = True

    # Create repayment record
    repayment = LoanRepayment(
        id=generate_uuid(),
        loan_id=loan.id,
        user_id=current_user.id,
        amount=Decimal(str(body.amount)),
        status="completed",
        due_date=loan.next_due_date,
        paid_at=datetime.utcnow(),
        is_late=is_late,
        created_at=datetime.utcnow(),
    )
    db.add(repayment)

    # Update loan
    loan.outstanding = Decimal(str(float(loan.outstanding) - body.amount))
    loan.last_repayment_at = datetime.utcnow()
    loan.updated_at = datetime.utcnow()

    # Advance next due date
    if loan.next_due_date:
        loan.next_due_date = (datetime.combine(loan.next_due_date, datetime.min.time()) + timedelta(days=30)).date()

    # Close loan if fully paid
    if float(loan.outstanding) <= 0:
        loan.status = "closed"
        loan.outstanding = Decimal("0.00")
        loan.closed_at = datetime.utcnow()

    # Risk signal for repayment
    risk_impact = 60 if is_late else -50
    _audit_log(db, current_user.id, "loan_repayment", target=loan.id, metadata={
        "amount": body.amount,
        "is_late": is_late,
        "remaining": float(loan.outstanding),
        "risk_impact": risk_impact,
        "detail": f"{'Late' if is_late else 'On-time'} repayment of Ksh.{body.amount} on loan #{loan.id[:8]}",
    })

    # Update user financial risk
    user = db.query(User).filter(User.id == current_user.id).first()
    if user:
        breakdown = user.risk_breakdown or {"identity": 0, "behavior": 0, "financial": 0, "compliance": 0}
        breakdown["financial"] = max(0, breakdown.get("financial", 0) + risk_impact)
        user.risk_breakdown = breakdown
        user.risk_score = sum(breakdown.values())
        user.trust_level = _compute_trust_level(user.risk_score)
        user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(loan)

    return RepaymentResponse(
        repayment=RepaymentOut(**_repayment_to_dict(repayment)),
        loan=LoanOut(**_loan_to_dict(loan)),
        message="Late repayment recorded" if is_late else "Repayment recorded successfully",
    )


# ─────────────────────────────────────────────────────────────
# MFA ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/mfa/status", response_model=MFAStatusResponse)
async def mfa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check MFA status for the current user."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return MFAStatusResponse(
        mfa_enabled=user.mfa_enabled or False,
        message="MFA is enabled" if user.mfa_enabled else "MFA is not enabled",
    )


@router.post("/mfa/enable", response_model=MFAEnableResponse)
async def enable_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a TOTP secret and QR URI for MFA setup.
    User must verify with a code before MFA is fully activated.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled")

    # Generate TOTP secret
    secret = pyotp.random_base32()
    user.totp_secret = secret  # In production: encrypt with KMS
    user.updated_at = datetime.utcnow()
    db.commit()

    # Generate provisioning URI for QR code
    totp = pyotp.TOTP(secret)
    qr_uri = totp.provisioning_uri(name=user.email, issuer_name="SentinelIQ")

    _audit_log(db, user.id, "mfa_setup_initiated", metadata={
        "detail": "MFA setup initiated, awaiting verification"
    })
    db.commit()

    return MFAEnableResponse(
        secret=secret,
        qr_uri=qr_uri,
        message="Scan the QR code with your authenticator app, then verify with a code",
    )


@router.post("/mfa/verify", response_model=MFAVerifyResponse)
async def verify_mfa(
    body: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify a TOTP code to complete MFA enablement.
    This activates MFA on the account and reduces identity risk.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="MFA setup not initiated. Call /mfa/enable first.")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    user.mfa_enabled = True
    user.updated_at = datetime.utcnow()

    # Update risk: MFA reduces identity risk by 30
    breakdown = user.risk_breakdown or {"identity": 0, "behavior": 0, "financial": 0, "compliance": 0}
    breakdown["identity"] = max(0, breakdown.get("identity", 0) - 30)
    user.risk_breakdown = breakdown
    user.risk_score = sum(breakdown.values())
    user.trust_level = _compute_trust_level(user.risk_score)

    _audit_log(db, user.id, "mfa_enabled", metadata={
        "risk_impact": -30,
        "detail": "MFA successfully enabled",
    })

    db.commit()

    return MFAVerifyResponse(verified=True, message="MFA enabled successfully. Your identity risk has decreased.")


@router.post("/mfa/disable", response_model=MFAStatusResponse)
async def disable_mfa(
    body: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Disable MFA after verifying with a current TOTP code.
    This increases identity risk.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.mfa_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="MFA is not enabled")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    user.mfa_enabled = False
    user.totp_secret = None
    user.updated_at = datetime.utcnow()

    # Update risk: disabling MFA increases identity risk
    breakdown = user.risk_breakdown or {"identity": 0, "behavior": 0, "financial": 0, "compliance": 0}
    breakdown["identity"] = breakdown.get("identity", 0) + 30
    user.risk_breakdown = breakdown
    user.risk_score = sum(breakdown.values())
    user.trust_level = _compute_trust_level(user.risk_score)

    _audit_log(db, user.id, "mfa_disabled", metadata={
        "risk_impact": 30,
        "detail": "MFA disabled — identity risk increased",
    })

    # Create security alert
    alert = SecurityAlert(
        id=generate_uuid(),
        user_id=user.id,
        alert_type="mfa_disabled",
        severity="warning",
        title="MFA Disabled",
        message="Multi-factor authentication has been disabled on your account. Your identity risk has increased.",
        created_at=datetime.utcnow(),
    )
    db.add(alert)

    db.commit()

    return MFAStatusResponse(mfa_enabled=False, message="MFA disabled. Your identity risk has increased.")


# ─────────────────────────────────────────────────────────────
# PHONE VERIFICATION ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/phone/status", response_model=PhoneStatusResponse)
async def phone_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check phone status for the current user."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return PhoneStatusResponse(
        phone=user.phone,
        phone_verified=user.phone_verified or False,
        message="Phone is verified" if user.phone_verified else (
            "Phone number set but not verified" if user.phone else "No phone number on file"
        ),
    )


@router.post("/phone/update", response_model=PhoneStatusResponse)
async def update_phone(
    body: PhoneUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set or update the user's phone number.
    A 6-digit verification code is generated and stored for later verification.
    In production, this code would be sent via SMS.
    """
    import re
    import random

    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Basic phone number validation (digits, optional + prefix, 7-15 digits)
    cleaned = re.sub(r'[\s\-\(\)]', '', body.phone)
    if not re.match(r'^\+?\d{7,15}$', cleaned):
        raise HTTPException(status_code=400, detail="Invalid phone number format. Use international format e.g. +254712345678")

    # Generate a 6-digit verification code
    verification_code = f"{random.randint(100000, 999999)}"

    user.phone = cleaned
    user.phone_verified = False
    # Store the verification code in user_metadata (in production: send via SMS)
    metadata = user.user_metadata or {}
    metadata["phone_verification_code"] = verification_code
    metadata["phone_verification_expires"] = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    user.user_metadata = metadata
    user.updated_at = datetime.utcnow()

    _audit_log(db, user.id, "phone_updated", metadata={
        "detail": "Phone number updated, verification pending",
    })

    db.commit()

    logger.info(f"Phone verification code for user {user.id}: {verification_code}")

    return PhoneStatusResponse(
        phone=user.phone,
        phone_verified=False,
        message=f"Phone number updated. Verification code: {verification_code} (valid for 10 minutes)",
    )


@router.post("/phone/verify", response_model=PhoneVerifyResponse)
async def verify_phone(
    body: PhoneVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify the phone number using the 6-digit code.
    Reduces identity risk by 15 points upon successful verification.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.phone:
        raise HTTPException(status_code=400, detail="No phone number to verify. Set a phone number first.")

    if user.phone_verified:
        return PhoneVerifyResponse(verified=True, message="Phone is already verified")

    metadata = user.user_metadata or {}
    stored_code = metadata.get("phone_verification_code")
    expires_str = metadata.get("phone_verification_expires")

    if not stored_code or not expires_str:
        raise HTTPException(status_code=400, detail="No verification code found. Request a new one by updating your phone number.")

    # Check expiration
    try:
        expires_at = datetime.fromisoformat(expires_str)
        if datetime.utcnow() > expires_at:
            raise HTTPException(status_code=400, detail="Verification code expired. Request a new one by updating your phone number.")
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid verification state. Request a new code.")

    if body.code != stored_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Mark phone as verified
    user.phone_verified = True
    user.updated_at = datetime.utcnow()

    # Clean up verification metadata
    metadata.pop("phone_verification_code", None)
    metadata.pop("phone_verification_expires", None)
    user.user_metadata = metadata

    # Update risk: phone verification reduces identity risk by 15
    breakdown = user.risk_breakdown or {"identity": 0, "behavior": 0, "financial": 0, "compliance": 0}
    breakdown["identity"] = max(0, breakdown.get("identity", 0) - 15)
    user.risk_breakdown = breakdown
    user.risk_score = sum(breakdown.values())
    user.trust_level = _compute_trust_level(user.risk_score)

    _audit_log(db, user.id, "phone_verified", metadata={
        "risk_impact": -15,
        "detail": "Phone number verified successfully",
    })

    db.commit()

    return PhoneVerifyResponse(verified=True, message="Phone verified successfully. Your identity risk has decreased.")


@router.post("/phone/resend-code", response_model=PhoneStatusResponse)
async def resend_phone_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resend a new verification code for the current phone number."""
    import random

    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.phone:
        raise HTTPException(status_code=400, detail="No phone number on file. Set a phone number first.")

    if user.phone_verified:
        return PhoneStatusResponse(
            phone=user.phone,
            phone_verified=True,
            message="Phone is already verified",
        )

    verification_code = f"{random.randint(100000, 999999)}"

    metadata = user.user_metadata or {}
    metadata["phone_verification_code"] = verification_code
    metadata["phone_verification_expires"] = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    user.user_metadata = metadata
    user.updated_at = datetime.utcnow()

    db.commit()

    logger.info(f"Phone verification code resent for user {user.id}: {verification_code}")

    return PhoneStatusResponse(
        phone=user.phone,
        phone_verified=False,
        message=f"New verification code: {verification_code} (valid for 10 minutes)",
    )


# ─────────────────────────────────────────────────────────────
# SECURITY ALERTS
# ─────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=AlertListResponse)
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List security alerts for the current user."""
    alerts = (
        db.query(SecurityAlert)
        .filter(SecurityAlert.user_id == current_user.id, SecurityAlert.is_dismissed == False)
        .order_by(SecurityAlert.created_at.desc())
        .limit(50)
        .all()
    )

    unread_count = sum(1 for a in alerts if not a.is_read)

    return AlertListResponse(
        alerts=[
            AlertOut(
                id=a.id,
                alert_type=a.alert_type,
                severity=a.severity,
                title=a.title,
                message=a.message,
                is_read=a.is_read,
                is_dismissed=a.is_dismissed,
                alert_metadata=a.alert_metadata or {},
                created_at=_serialize_datetime(a.created_at),
            )
            for a in alerts
        ],
        total=len(alerts),
        unread=unread_count,
    )


@router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a security alert as read."""
    alert = db.query(SecurityAlert).filter(
        SecurityAlert.id == alert_id,
        SecurityAlert.user_id == current_user.id,
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()

    return {"message": "Alert marked as read"}


@router.delete("/alerts/{alert_id}")
async def dismiss_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dismiss a security alert."""
    alert = db.query(SecurityAlert).filter(
        SecurityAlert.id == alert_id,
        SecurityAlert.user_id == current_user.id,
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_dismissed = True
    db.commit()

    return {"message": "Alert dismissed"}


# ─────────────────────────────────────────────────────────────
# INCIDENT REPORTING
# ─────────────────────────────────────────────────────────────

@router.post("/report-incident", response_model=IncidentReportResponse)
async def report_incident(
    body: IncidentReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Report a security incident (suspicious login, fraud, etc.).
    Creates an audit trail and security alert for admin review.
    """
    incident_id = generate_uuid()

    _audit_log(db, current_user.id, "incident_reported", target=incident_id, metadata={
        "incident_type": body.incident_type,
        "description": body.description,
        "related_transaction_id": body.related_transaction_id,
        "detail": f"Security incident reported: {body.incident_type}",
    })

    # Create alert for the user confirming the report
    alert = SecurityAlert(
        id=generate_uuid(),
        user_id=current_user.id,
        alert_type="incident_reported",
        severity="info",
        title="Incident Report Submitted",
        message=f"Your {body.incident_type} incident report has been submitted and is under review.",
        metadata={"incident_id": incident_id},
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()

    return IncidentReportResponse(
        incident_id=incident_id,
        status="submitted",
        message="Incident report submitted successfully. Our team will review it within 24 hours.",
    )
