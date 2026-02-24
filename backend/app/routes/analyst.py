"""
Analyst API Routes — SentinelIQ

REST endpoints under /api/v1/analyst/* for the analyst investigation module.

RBAC: Requires analyst or admin role.
All actions are audit-logged.

Endpoint Groups:
  - Dashboard / Monitoring: alerts, high-risk users, risk insights
  - User Inspection: full user profile, timeline, devices, loans
  - Investigation Workflow: create, list, get, update cases
  - Notes & Recommendations: add notes, submit recommendations
  - Search: cross-entity search
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import logging

from app.dependencies import get_db, get_current_user, require_role
from app.models import User, AuditLog
from app.services.analyst_service import AnalystService
from app.schemas.analyst import (
    InvestigationCreate,
    InvestigationUpdate,
    NoteCreate,
    RecommendationCreate,
)
from datetime import datetime

logger = logging.getLogger("sentineliq.analyst")

router = APIRouter(
    prefix="/api/v1/analyst",
    tags=["Analyst"],
    dependencies=[Depends(require_role(["analyst", "admin"]))],
)


# ═══════════════════════════════════════════════════════════════
# Dashboard / Monitoring
# ═══════════════════════════════════════════════════════════════

@router.get("/alerts")
def get_alerts(
    severity: Optional[str] = Query(None, pattern="^(critical|high|medium|low|info)$"),
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyst alert feed.
    Aggregates high-risk users, suspicious login patterns,
    loan anomalies, security alerts, and forbidden access attempts.
    """
    return AnalystService.get_alert_feed(
        db, severity=severity, category=category, limit=limit, offset=offset
    )


@router.get("/users")
def get_high_risk_users(
    risk: int = Query(50, ge=0, le=100, description="Minimum risk score threshold"),
    org_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List users with elevated risk scores.
    Filter by risk threshold, organization.
    """
    return AnalystService.get_high_risk_users(
        db, threshold=risk, org_id=org_id, limit=limit, offset=offset
    )


@router.get("/users/{user_id}")
def inspect_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full user inspection: risk breakdown, activity timeline,
    login history, device history, loans, sessions, prior investigations.
    """
    result = AnalystService.inspect_user(db, user_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # Audit the inspection
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_user.id,
        action="analyst_user_inspection",
        target=user_id,
        event_metadata={"inspector_role": current_user.role},
        timestamp=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()

    return result


@router.get("/users/{user_id}/timeline")
def get_user_timeline(
    user_id: str,
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User activity timeline (audit log events)."""
    result = AnalystService.get_user_timeline(db, user_id, days=days, limit=limit)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/users/{user_id}/devices")
def get_user_devices(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User device fingerprint history."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"devices": AnalystService.get_user_devices(db, user_id), "user_id": user_id}


@router.get("/users/{user_id}/loans")
def get_user_loans(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User loan and repayment data."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return AnalystService.get_user_loans(db, user_id)


# ═══════════════════════════════════════════════════════════════
# Risk Insights
# ═══════════════════════════════════════════════════════════════

@router.get("/insights")
def get_risk_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Risk distribution, severity breakdown, top-risk organizations,
    recent fraud patterns, open investigation count.
    """
    return AnalystService.get_risk_insights(db)


# ═══════════════════════════════════════════════════════════════
# Investigation Workflow
# ═══════════════════════════════════════════════════════════════

@router.post("/investigations")
def create_investigation(
    body: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Open a new investigation case."""
    try:
        inv = AnalystService.create_investigation(
            db,
            analyst_id=current_user.id,
            user_id=body.user_id,
            severity=body.severity,
            reason=body.reason,
        )
        return {
            "investigation_id": inv.id,
            "status": inv.status,
            "severity": inv.severity,
            "message": "Investigation opened successfully",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/investigations")
def list_investigations(
    status: Optional[str] = Query(None, pattern="^(open|monitoring|escalated|closed)$"),
    severity: Optional[str] = Query(None, pattern="^(low|medium|high|critical)$"),
    analyst_id: Optional[str] = None,
    user_id: Optional[str] = None,
    mine: bool = Query(False, description="Only show investigations opened by me"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List investigations with filters."""
    if mine:
        analyst_id = current_user.id
    return AnalystService.list_investigations(
        db,
        status=status,
        severity=severity,
        analyst_id=analyst_id,
        user_id=user_id,
        page=page,
        page_size=page_size,
    )


@router.get("/investigations/{investigation_id}")
def get_investigation(
    investigation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full investigation detail with notes and recommendations."""
    result = AnalystService.get_investigation(db, investigation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return result


@router.patch("/investigations/{investigation_id}")
def update_investigation(
    investigation_id: str,
    body: InvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update investigation status or severity."""
    # Require summary when closing
    if body.status == "closed" and not body.summary:
        raise HTTPException(
            status_code=400,
            detail="Summary is required when closing an investigation",
        )

    inv = AnalystService.update_investigation(
        db,
        investigation_id=investigation_id,
        analyst_id=current_user.id,
        status=body.status,
        severity=body.severity,
        summary=body.summary,
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    return {
        "investigation_id": inv.id,
        "status": inv.status,
        "severity": inv.severity,
        "message": "Investigation updated",
    }


# ═══════════════════════════════════════════════════════════════
# Notes
# ═══════════════════════════════════════════════════════════════

@router.post("/investigations/{investigation_id}/notes")
def add_note(
    investigation_id: str,
    body: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add an analyst note to an investigation."""
    try:
        note = AnalystService.add_note(
            db,
            investigation_id=investigation_id,
            analyst_id=current_user.id,
            note=body.note,
            note_type=body.note_type,
        )
        if not note:
            raise HTTPException(status_code=404, detail="Investigation not found")
        return {
            "note_id": note.id,
            "investigation_id": investigation_id,
            "note_type": note.note_type,
            "message": "Note added",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# Recommendations
# ═══════════════════════════════════════════════════════════════

@router.post("/investigations/{investigation_id}/recommend")
def add_recommendation(
    investigation_id: str,
    body: RecommendationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit an enforcement recommendation for an investigation."""
    try:
        rec = AnalystService.add_recommendation(
            db,
            investigation_id=investigation_id,
            analyst_id=current_user.id,
            action=body.action,
            justification=body.justification,
        )
        if not rec:
            raise HTTPException(status_code=404, detail="Investigation not found")
        return {
            "recommendation_id": rec.id,
            "investigation_id": investigation_id,
            "action": rec.action,
            "status": rec.status,
            "message": "Recommendation submitted",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# Organization Detail
# ═══════════════════════════════════════════════════════════════

@router.get("/organizations/{org_id}")
def get_organization_detail(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed information about an organization including its users."""
    result = AnalystService.get_organization_detail(db, org_id)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result


# ═══════════════════════════════════════════════════════════════
# Search
# ═══════════════════════════════════════════════════════════════

@router.get("/search")
def search(
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search across users, investigations, and organizations."""
    results = AnalystService.search(db, query=q, limit=limit)
    return {"results": results, "total": len(results), "query": q}
