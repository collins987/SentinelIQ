"""
Admin Governance API Routes — SentinelIQ

Production-grade endpoints for the admin governance module providing:
- Policy management (CRUD with versioning)
- Enforcement workflows (lock, freeze, override, MFA)
- IAM operations (user CRUD, role management, suspensions)
- Compliance reporting (system reports, org risk, audit export)
- Recommendation review (approve/reject analyst recommendations)

All endpoints require admin role and are fully audit-logged.
Routed under /api/v1/admin/*
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.dependencies import require_role, get_db
from app.services.admin_governance import AdminGovernanceService
from app.schemas.admin import (
    PolicyCreate, PolicyUpdate,
    EnforcementActionCreate, RiskOverrideRequest, RecommendationReviewRequest,
    AdminUserCreate, AdminUserUpdate,
)

import logging
logger = logging.getLogger("sentineliq.admin_governance")

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin Governance"],
    dependencies=[Depends(require_role(["admin"]))],
)


# =============================================================================
# System Overview
# =============================================================================

@router.get("/overview")
async def get_system_overview(
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive system overview for admin dashboard.
    Returns risk distribution, pending actions, key metrics.
    """
    return AdminGovernanceService.get_system_overview(db)


# =============================================================================
# Governance / Policy Endpoints
# =============================================================================

@router.get("/policies")
async def list_policies(
    category: Optional[str] = Query(None),
    active_only: bool = Query(True),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """List all governance policies with optional filtering."""
    return AdminGovernanceService.list_policies(db, category, active_only, page, page_size)


@router.get("/policies/{policy_id}")
async def get_policy(
    policy_id: str,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Get a single policy by ID."""
    result = AdminGovernanceService.get_policy(db, policy_id)
    if not result:
        raise HTTPException(status_code=404, detail="Policy not found")
    return result


@router.post("/policies")
async def create_policy(
    payload: PolicyCreate,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Create a new governance policy."""
    result = AdminGovernanceService.create_policy(
        db, payload.model_dump(), current_user.id
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.patch("/policies/{policy_id}")
async def update_policy(
    policy_id: str,
    payload: PolicyUpdate,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Update an existing policy. Increments version."""
    result = AdminGovernanceService.update_policy(
        db, policy_id, payload.model_dump(exclude_none=True), current_user.id
    )
    if not result:
        raise HTTPException(status_code=404, detail="Policy not found")
    return result


@router.delete("/policies/{policy_id}")
async def delete_policy(
    policy_id: str,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Soft-delete (deactivate) a policy. Policies are never hard-deleted."""
    result = AdminGovernanceService.delete_policy(db, policy_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Policy not found")
    return result


# =============================================================================
# User & Access Management (IAM)
# =============================================================================

@router.get("/users")
async def list_users(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """List all users with filtering for IAM management."""
    return AdminGovernanceService.list_users(db, role, status, search, page, page_size)


@router.post("/users")
async def create_user(
    payload: AdminUserCreate,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Create a new user (admin-initiated)."""
    result = AdminGovernanceService.create_user(
        db, payload.model_dump(), current_user.id
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Update user details (admin-initiated)."""
    result = AdminGovernanceService.update_user(
        db, user_id, payload.model_dump(exclude_none=True), current_user.id
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    reason: str = Query(..., min_length=5),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Suspend a user account."""
    result = AdminGovernanceService.suspend_user(db, user_id, current_user.id, reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    reason: str = Query(default="Admin activated"),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Re-activate a suspended user account."""
    result = AdminGovernanceService.activate_user(db, user_id, current_user.id, reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/users/{user_id}/force-mfa")
async def force_mfa(
    user_id: str,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Force MFA enrollment for a user."""
    result = AdminGovernanceService.force_mfa(db, user_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/users/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Force password reset for a user. Revokes all sessions."""
    result = AdminGovernanceService.force_password_reset(db, user_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# =============================================================================
# Enforcement Decisions
# =============================================================================

@router.get("/enforcement")
async def get_enforcement_history(
    user_id: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Get enforcement action history."""
    return AdminGovernanceService.get_enforcement_history(db, user_id, action_type, page, page_size)


@router.post("/users/{user_id}/lock")
async def lock_user(
    user_id: str,
    reason: str = Query(..., min_length=5),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Lock a user account immediately. Revokes all sessions."""
    result = AdminGovernanceService.lock_user(db, user_id, current_user.id, reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/users/{user_id}/unlock")
async def unlock_user(
    user_id: str,
    reason: str = Query(default="Admin unlocked"),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Unlock a previously locked user account."""
    result = AdminGovernanceService.unlock_user(db, user_id, current_user.id, reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/users/{user_id}/freeze-loan")
async def freeze_loan(
    user_id: str,
    reason: str = Query(..., min_length=5),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Freeze all active loans for a user."""
    result = AdminGovernanceService.freeze_loan(db, user_id, current_user.id, reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/users/{user_id}/override-risk")
async def override_risk(
    user_id: str,
    payload: RiskOverrideRequest,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Override a user's risk score manually."""
    result = AdminGovernanceService.override_risk_score(
        db, user_id, current_user.id, payload.new_risk_score, payload.reason
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# =============================================================================
# Recommendation Review
# =============================================================================

@router.get("/recommendations")
async def list_recommendations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """List pending analyst recommendations for admin review."""
    return AdminGovernanceService.list_pending_recommendations(db, page, page_size)


@router.post("/recommendations/{rec_id}/approve")
async def approve_recommendation(
    rec_id: str,
    payload: Optional[RecommendationReviewRequest] = None,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Approve and execute an analyst recommendation."""
    notes = payload.review_notes if payload else None
    result = AdminGovernanceService.approve_recommendation(db, rec_id, current_user.id, notes)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/recommendations/{rec_id}/reject")
async def reject_recommendation(
    rec_id: str,
    payload: Optional[RecommendationReviewRequest] = None,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Reject an analyst recommendation."""
    notes = payload.review_notes if payload else None
    result = AdminGovernanceService.reject_recommendation(db, rec_id, current_user.id, notes)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# =============================================================================
# Compliance & Audit
# =============================================================================

@router.get("/audits")
async def get_audit_logs(
    actor_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Get full audit trail with filtering."""
    sd = datetime.fromisoformat(start_date) if start_date else None
    ed = datetime.fromisoformat(end_date) if end_date else None
    return AdminGovernanceService.get_audit_logs(db, actor_id, action, sd, ed, page, page_size)


@router.get("/audits/export")
async def export_audit_logs(
    format: str = Query("json", regex="^(json|csv)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Export audit logs for regulatory compliance."""
    sd = datetime.fromisoformat(start_date) if start_date else None
    ed = datetime.fromisoformat(end_date) if end_date else None
    return AdminGovernanceService.export_audit_logs(db, format, sd, ed)


@router.get("/system-report")
async def get_system_report(
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Generate comprehensive system compliance report."""
    return AdminGovernanceService.get_system_report(db)


@router.get("/org-risk-summary")
async def get_org_risk_summary(
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Get risk summary per organization."""
    return AdminGovernanceService.get_org_risk_summary(db)


# =============================================================================
# Fintech: Interest policies, repayments, transactions
# =============================================================================

from app.services.interest_engine import InterestEngine
from app.services.repayment_service import RepaymentService
from app.services.transaction_monitor import TransactionMonitor
from app.schemas.fintech import (
    InterestPolicyCreate,
    InterestPolicyOut,
    RepaymentVerifyRequest,
    RepaymentFreezeRequest,
    GlobalThresholdUpdate,
)


@router.get("/interest/policies")
async def list_interest_policies(
    active_only: bool = Query(True),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """List interest/penalty policy catalog."""
    policies = InterestEngine.list_policies(db, active_only=active_only)
    return {
        "policies": [
            InterestPolicyOut(
                id=p.id,
                name=p.name,
                risk_tier=p.risk_tier,
                base_rate=float(p.base_rate),
                penalty_rate=float(p.penalty_rate),
                grace_period_days=p.grace_period_days,
                active=p.active,
            )
            for p in policies
        ],
        "total": len(policies),
    }


@router.post("/interest/policies", response_model=InterestPolicyOut)
async def create_interest_policy(
    body: InterestPolicyCreate,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    policy = InterestEngine.create_policy(db, body.model_dump())
    db.commit()
    return InterestPolicyOut(
        id=policy.id,
        name=policy.name,
        risk_tier=policy.risk_tier,
        base_rate=float(policy.base_rate),
        penalty_rate=float(policy.penalty_rate),
        grace_period_days=policy.grace_period_days,
        active=policy.active,
    )


@router.post("/repayments/freeze")
async def freeze_loan_repayments(
    body: RepaymentFreezeRequest,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    from app.models import Loan

    loan = db.query(Loan).filter(Loan.id == body.loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    loan.repayments_frozen = body.freeze
    db.commit()
    return {"loan_id": loan.id, "repayments_frozen": loan.repayments_frozen, "reason": body.reason}


@router.post("/repayments/{repayment_id}/verify")
async def verify_repayment(
    repayment_id: str,
    body: RepaymentVerifyRequest,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    try:
        rep = RepaymentService.verify_repayment(db, repayment_id, current_user.id, body.approve)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    db.commit()
    return {"repayment_id": rep.id, "verification_status": rep.verification_status, "status": rep.status}


@router.get("/repayments/pending")
async def admin_pending_repayments(
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    items = RepaymentService.list_pending_verification(db, limit=limit)
    return {"items": items, "total": len(items)}


@router.get("/repayments/overdue")
async def admin_overdue_repayments(
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    items = RepaymentService.list_overdue_queue(db, limit=limit)
    db.commit()
    return {"items": items, "total": len(items)}


@router.patch("/transactions/thresholds")
async def update_global_transaction_thresholds(
    body: GlobalThresholdUpdate,
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    row = TransactionMonitor.update_global_thresholds(db, body.model_dump(exclude_unset=True))
    db.commit()
    return {
        "daily_velocity_limit": float(row.daily_velocity_limit),
        "weekly_velocity_limit": float(row.weekly_velocity_limit),
        "anomaly_score_threshold": float(row.anomaly_score_threshold),
    }


@router.get("/transactions/thresholds")
async def get_global_transaction_thresholds(
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    row = TransactionMonitor._get_global_thresholds(db)
    return {
        "daily_velocity_limit": float(row.daily_velocity_limit),
        "weekly_velocity_limit": float(row.weekly_velocity_limit),
        "anomaly_score_threshold": float(row.anomaly_score_threshold),
    }


@router.get("/transactions/alerts")
async def get_transaction_alerts(
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    alerts = TransactionMonitor.admin_transaction_alerts(db, severity=severity, limit=limit)
    return {"alerts": alerts, "total": len(alerts)}
