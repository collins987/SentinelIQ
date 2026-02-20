"""
Milestone 8: Analytics & Monitoring Routes
Endpoints for dashboard, user activity, risk review, and alerts
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.dependencies import get_db, require_role
from app.services.analytics import AnalyticsService
from app.services.alerts import AlertService
from app.core.logging import logger, log_event
from app.core.metrics import MetricsTracker
from app.models import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ---------------------------------------------------------------------
# Risk Review (Analyst Only)
# ---------------------------------------------------------------------
@router.get("/risk-review")
def risk_review(
    user: User = Depends(require_role(["analyst"])),
    db: Session = Depends(get_db),
    hours: int = Query(24, ge=1, description="Hours back to retrieve risk data"),
    limit: int = Query(10, ge=1, description="Maximum number of items to return"),
):
    """Endpoint for analysts to review risk-related events and analytics"""
    try:
        data = AnalyticsService.get_risk_review_data(db, hours=hours, limit=limit)
        
        # Audit log
        log_event(
            action="risk_review_accessed",
            user_id=user.id,
            target="/analytics/risk-review",
            details={"role": user.role, "period_hours": hours, "limit": limit}
        )
        # Metrics
        MetricsTracker.track_rbac_check(allowed=True, role=user.role)
        return data

    except Exception as e:
        log_event(
            action="risk_review_error",
            user_id=user.id,
            target="/analytics/risk-review",
            details={"role": user.role, "error": str(e)},
            level="ERROR"
        )
        MetricsTracker.track_rbac_check(allowed=False, role=user.role)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve risk review data"
        )


# ---------------------------------------------------------------------
# Admin-Only Analytics
# ---------------------------------------------------------------------
@router.get("/dashboard")
def get_analytics_dashboard(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Get comprehensive security analytics dashboard (admin only)"""
    try:
        dashboard_data = AnalyticsService.get_security_dashboard(db)
        log_event(
            action="dashboard_accessed",
            user_id=user.id,
            target="/analytics/dashboard",
            details={"role": user.role}
        )
        return dashboard_data

    except Exception as e:
        logger.error(f"Error generating analytics dashboard: {str(e)}", extra={
            "user_id": user.id,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate dashboard"
        )


@router.get("/users")
def get_users_analytics(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Get user analytics (admin only)"""
    try:
        return {
            "users_by_role": AnalyticsService.get_users_by_role(db),
            "email_verification": AnalyticsService.get_email_verification_stats(db),
            "active_users": AnalyticsService.get_active_users_count(db)
        }
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user analytics"
        )


@router.get("/login")
def get_login_analytics(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    hours: int = Query(24, ge=1, description="Hours back to analyze login events"),
):
    """Get login analytics (admin only)"""
    try:
        return {
            "login_stats": AnalyticsService.get_login_stats(db, hours=hours),
            "failed_attempts": AnalyticsService.get_failed_login_attempts_by_user(db, hours=hours)
        }
    except Exception as e:
        logger.error(f"Error getting login analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get login analytics"
        )


@router.get("/sessions")
def get_session_analytics(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Get session analytics (admin only)"""
    try:
        return AnalyticsService.get_session_stats(db)
    except Exception as e:
        logger.error(f"Error getting session analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session analytics"
        )


@router.get("/audit")
def get_audit_analytics(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    hours: int = Query(24, ge=1, description="Hours back to summarize audit logs"),
):
    """Get audit log analytics (admin only)"""
    try:
        return AnalyticsService.get_audit_log_summary(db, hours=hours)
    except Exception as e:
        logger.error(f"Error getting audit analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get audit analytics"
        )


@router.get("/user/{user_id}")
def get_user_activity(
    user_id: str,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Get activity for a specific user (admin only)"""
    try:
        log_event(
            action="user_activity_viewed",
            user_id=user.id,
            target=f"user:{user_id}",
            details={"role": user.role}
        )
        return AnalyticsService.get_user_activity(db, user_id)
    except Exception as e:
        logger.error(f"Error getting user activity: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user activity"
        )


@router.get("/alerts")
def get_alerts(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Get all active alerts and anomalies (admin only)"""
    try:
        alerts = AlertService.get_all_alerts(db)
        log_event(
            action="alerts_viewed",
            user_id=user.id,
            target="/analytics/alerts",
            details={"alert_count": len(alerts)}
        )
        return {
            "alerts": alerts,
            "total_count": len(alerts),
            "critical_count": sum(1 for a in alerts if a.get("severity") == "high")
        }
    except Exception as e:
        logger.error(f"Error retrieving alerts: {str(e)}", extra={
            "user_id": user.id,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alerts"
        )


@router.get("/forbidden-access")
def get_forbidden_access(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Get forbidden access attempts (admin only)"""
    try:
        return {
            "forbidden_attempts": AnalyticsService.get_forbidden_access_attempts(db)
        }
    except Exception as e:
        logger.error(f"Error getting forbidden access data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get forbidden access data"
        )
