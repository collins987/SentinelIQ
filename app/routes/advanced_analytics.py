"""
Advanced Analytics Routes - Time-series, drill-down, cohorts, trending
Extended analytics endpoints for detailed risk analysis and insights
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_role
from app.services.advanced_analytics import get_advanced_analytics_service
from app.core.logging import logger, log_event
from app.models import User
from typing import List, Optional

router = APIRouter(prefix="/analytics/advanced", tags=["advanced-analytics"])
analytics = get_advanced_analytics_service()


@router.get("/risk-timeline")
def get_risk_timeline(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
    granularity: str = Query("daily", regex="^(hourly|daily|weekly)$")
):
    """
    Get risk events over time with granular bucketing
    
    Granularities:
    - hourly: Risk events per hour
    - daily: Risk events per day
    - weekly: Risk events per week
    """
    try:
        log_event(
            action="risk_timeline_viewed",
            user_id=user.id,
            target="/analytics/advanced/risk-timeline",
            details={"days": days, "granularity": granularity}
        )
        
        return analytics.get_risk_timeline(db, days=days, granularity=granularity)
    
    except Exception as e:
        logger.error(f"Error getting risk timeline: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate risk timeline"
        )


@router.get("/velocity-trends")
def get_velocity_trends(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    hours: int = Query(72, ge=1, le=720),
    step_minutes: int = Query(30, ge=5, le=120)
):
    """
    Get velocity counter trends with spike detection
    Identifies unusual activity bursts in real-time
    """
    try:
        log_event(
            action="velocity_trends_viewed",
            user_id=user.id,
            target="/analytics/advanced/velocity-trends"
        )
        
        return analytics.get_velocity_trends(db, hours=hours, step_minutes=step_minutes)
    
    except Exception as e:
        logger.error(f"Error getting velocity trends: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get velocity trends"
        )


@router.get("/drill-down/events")
def drill_down_events(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    risk_level: Optional[str] = None,
    user_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Drill down into specific risk events with full details
    Includes triggered rules and recommendations
    """
    try:
        return analytics.drill_down_risk_events(
            db,
            risk_level=risk_level,
            user_id=user_id,
            days=days,
            limit=limit
        )
    
    except Exception as e:
        logger.error(f"Error drilling down events: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to drill down events"
        )


@router.get("/drill-down/rule/{rule_name}")
def drill_down_rule(
    rule_name: str,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500)
):
    """
    Analyze all events triggered by a specific rule
    Shows rule effectiveness and false positive rates
    """
    try:
        return analytics.drill_down_by_rule(db, rule_name=rule_name, days=days, limit=limit)
    
    except Exception as e:
        logger.error(f"Error drilling down rule: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze rule"
        )


@router.get("/cohorts/analysis")
def analyze_cohorts(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365)
):
    """
    Analyze user cohorts based on risk profiles
    
    Cohorts:
    - low_risk: No violations in period
    - medium_risk: 1-3 violations
    - high_risk: 4+ violations
    - flagged: Under review or blocked
    """
    try:
        log_event(
            action="cohort_analysis_viewed",
            user_id=user.id,
            target="/analytics/advanced/cohorts/analysis"
        )
        
        return analytics.analyze_user_cohorts(db, days=days)
    
    except Exception as e:
        logger.error(f"Error analyzing cohorts: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze cohorts"
        )


@router.get("/cohorts/{cohort}/behavior")
def analyze_cohort_behavior(
    cohort: str,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365)
):
    """
    Compare behavior patterns within a cohort
    Identifies common triggers and patterns by cohort
    """
    try:
        if cohort not in ["low_risk", "medium_risk", "high_risk", "flagged"]:
            raise HTTPException(status_code=400, detail="Invalid cohort")
        
        return analytics.analyze_cohort_behavior(db, cohort=cohort, days=days)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing cohort behavior: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze cohort behavior"
        )


@router.get("/compare/users")
def compare_users(
    user_id_a: str = Query(...),
    user_id_b: str = Query(...),
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365)
):
    """
    Compare risk profiles between two users
    Helpful for identifying similar patterns or anomalies
    """
    try:
        return analytics.compare_risk_levels(db, user_id_a, user_id_b, days=days)
    
    except Exception as e:
        logger.error(f"Error comparing users: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compare users"
        )


@router.get("/trends")
def get_trends(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(60, ge=7, le=365)
):
    """
    Get risk trends with growth/decline rates
    Compares first and second half of period
    """
    try:
        log_event(
            action="trends_viewed",
            user_id=user.id,
            target="/analytics/advanced/trends"
        )
        
        return analytics.get_risk_trends(db, days=days)
    
    except Exception as e:
        logger.error(f"Error getting trends: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get trends"
        )


@router.get("/rule-performance")
def get_rule_performance(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365)
):
    """
    Evaluate rule effectiveness across all rules
    
    Metrics:
    - precision: True positives / (True positives + False positives)
    - recall: True positives / (True positives + False negatives)
    - f1_score: Harmonic mean of precision and recall
    - trigger_rate: % of evaluations that triggered
    """
    try:
        log_event(
            action="rule_performance_viewed",
            user_id=user.id,
            target="/analytics/advanced/rule-performance"
        )
        
        return analytics.get_rule_performance_metrics(db, days=days)
    
    except Exception as e:
        logger.error(f"Error getting rule performance: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get rule performance metrics"
        )
