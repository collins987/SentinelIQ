"""Milestone 8: Analytics and monitoring routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.services.analytics import AnalyticsService
from app.services.alerts import AlertService
from app.core.logging import logger, log_event
from app.core.metrics import MetricsTracker
from app.models import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/risk-review")
def risk_review(
    user: User = Depends(require_role(["analyst"])),
    db: Session = Depends(get_db),
    hours: int = Query(24, ge=1, description="Hours back to retrieve risk data"),
    limit: int = Query(10, ge=1, description="Maximum number of items to return"),
):
    """Endpoint for analysts to review risk-related events and analytics."""
    try:
        data = AnalyticsService.get_risk_review_data(db, hours=hours, limit=limit)
        log_event(
            action="risk_review_accessed",
            user_id=user.id,
            target="/analytics/risk-review",
            details={"role": user.role, "period_hours": hours, "limit": limit},
        )
        MetricsTracker.track_rbac_check(allowed=True, role=user.role)
        return data
    except Exception as e:
        log_event(
            action="risk_review_error",
            user_id=user.id,
            target="/analytics/risk-review",
            details={"role": user.role, "error": str(e)},
            level="ERROR",
        )
        MetricsTracker.track_rbac_check(allowed=False, role=user.role)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve risk review data",
        )


@router.get("/dashboard")
def get_analytics_dashboard(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Get comprehensive security analytics dashboard (admin only)."""
    try:
        dashboard_data = AnalyticsService.get_security_dashboard(db)
        log_event(
            action="dashboard_accessed",
            user_id=user.id,
            target="/analytics/dashboard",
            details={"role": user.role},
        )
        return dashboard_data
    except Exception as e:
        logger.error(
            f"Error generating analytics dashboard: {str(e)}",
            extra={"user_id": user.id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate dashboard",
        )


@router.get("/alerts")
def get_alerts(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Get all active alerts and anomalies (admin only)."""
    try:
        alerts = AlertService.get_all_alerts(db)
        log_event(
            action="alerts_viewed",
            user_id=user.id,
            target="/analytics/alerts",
            details={"alert_count": len(alerts)},
        )
        return {
            "alerts": alerts,
            "total_count": len(alerts),
            "critical_count": sum(1 for a in alerts if a.get("severity") == "high"),
        }
    except Exception as e:
        logger.error(
            f"Error retrieving alerts: {str(e)}",
            extra={"user_id": user.id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alerts",
        )


