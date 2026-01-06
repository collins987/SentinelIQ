"""
GraphQL Schema - Type definitions for GraphQL API
Provides flexible querying of risks, events, users, and analytics data
"""

import strawberry
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

# ===== SCALAR TYPES =====

@strawberry.type
class RiskScore:
    """Risk score and decision details"""
    event_id: str
    user_id: str
    risk_score: float
    risk_level: str  # critical, high, medium, low
    recommended_action: str  # block, challenge, allow
    confidence: float
    triggered_rules: List[str]
    timestamp: datetime


@strawberry.type
class RuleInfo:
    """Rule information"""
    name: str
    type: str
    score: float
    triggered: bool
    confidence: Optional[float] = None


@strawberry.type
class VelocityAlert:
    """Velocity counter violation"""
    user_id: str
    counter_type: str
    current_count: int
    threshold: int
    window_start: datetime


@strawberry.type
class UserProfile:
    """User profile with risk summary"""
    user_id: str
    email: str
    total_events: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    average_risk_score: float
    last_event: Optional[datetime] = None


@strawberry.type
class EventDetail:
    """Detailed event information"""
    event_id: str
    user_id: str
    event_type: str
    risk_score: float
    risk_level: str
    recommended_action: str
    timestamp: datetime
    triggered_rules: List[RuleInfo]
    metadata: Optional[str] = None


@strawberry.type
class Analytics:
    """Analytics metrics and insights"""
    total_events: int
    critical_events: int
    high_events: int
    medium_events: int
    low_events: int
    average_risk_score: float
    block_rate: float
    period_days: int


@strawberry.type
class Cohort:
    """User cohort analysis"""
    cohort_type: str  # low_risk, medium_risk, high_risk, flagged
    user_count: int
    percentage: float
    average_risk_score: Optional[float] = None


@strawberry.type
class RuleStat:
    """Rule performance metrics"""
    name: str
    total_triggers: int
    trigger_rate: float
    precision: float
    recall: float
    f1_score: float


# ===== QUERY ROOT =====

@strawberry.type
class Query:
    """GraphQL query root"""
    
    # ===== RISK & EVENT QUERIES =====
    
    @strawberry.field
    def risk_event(self, event_id: str, info: strawberry.types.Info) -> Optional[EventDetail]:
        """Get details for a specific risk event"""
        db: Session = info.context["db"]
        from app.models.events import RiskDecision, RuleEvaluation
        
        decision = db.query(RiskDecision).filter(RiskDecision.event_id == event_id).first()
        if not decision:
            return None
        
        rules = db.query(RuleEvaluation).filter(
            RuleEvaluation.risk_decision_id == decision.id
        ).all()
        
        return EventDetail(
            event_id=decision.event_id,
            user_id=decision.user_id,
            event_type=decision.event_id.split(":")[0],
            risk_score=float(decision.risk_score),
            risk_level=decision.risk_level,
            recommended_action=decision.recommended_action,
            timestamp=decision.created_at,
            triggered_rules=[
                RuleInfo(
                    name=r.rule_name,
                    type=r.rule_type,
                    score=float(r.score_contribution),
                    triggered=r.triggered
                )
                for r in rules
            ]
        )
    
    @strawberry.field
    def recent_risk_events(
        self,
        limit: int = 50,
        risk_level: Optional[str] = None,
        info: strawberry.types.Info = None
    ) -> List[RiskScore]:
        """Get recent risk events"""
        db: Session = info.context["db"]
        from app.models.events import RiskDecision
        from sqlalchemy import desc
        
        query = db.query(RiskDecision)
        if risk_level:
            query = query.filter(RiskDecision.risk_level == risk_level.upper())
        
        events = query.order_by(desc(RiskDecision.created_at)).limit(limit).all()
        
        return [
            RiskScore(
                event_id=e.event_id,
                user_id=e.user_id,
                risk_score=float(e.risk_score),
                risk_level=e.risk_level,
                recommended_action=e.recommended_action,
                confidence=1.0,
                triggered_rules=e.triggered_rules or [],
                timestamp=e.created_at
            )
            for e in events
        ]
    
    @strawberry.field
    def user_events(
        self,
        user_id: str,
        limit: int = 50,
        days: int = 30,
        info: strawberry.types.Info = None
    ) -> List[EventDetail]:
        """Get all events for a specific user"""
        from datetime import timedelta
        db: Session = info.context["db"]
        from app.models.events import RiskDecision, RuleEvaluation
        from sqlalchemy import desc, and_
        
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        decisions = db.query(RiskDecision).filter(
            and_(
                RiskDecision.user_id == user_id,
                RiskDecision.created_at >= cutoff
            )
        ).order_by(desc(RiskDecision.created_at)).limit(limit).all()
        
        results = []
        for decision in decisions:
            rules = db.query(RuleEvaluation).filter(
                RuleEvaluation.risk_decision_id == decision.id
            ).all()
            
            results.append(EventDetail(
                event_id=decision.event_id,
                user_id=decision.user_id,
                event_type=decision.event_id.split(":")[0],
                risk_score=float(decision.risk_score),
                risk_level=decision.risk_level,
                recommended_action=decision.recommended_action,
                timestamp=decision.created_at,
                triggered_rules=[
                    RuleInfo(
                        name=r.rule_name,
                        type=r.rule_type,
                        score=float(r.score_contribution),
                        triggered=r.triggered
                    )
                    for r in rules
                ]
            ))
        
        return results
    
    # ===== USER QUERIES =====
    
    @strawberry.field
    def user_profile(self, user_id: str, info: strawberry.types.Info) -> Optional[UserProfile]:
        """Get user risk profile"""
        db: Session = info.context["db"]
        from app.models import User
        from app.models.events import RiskDecision
        from datetime import timedelta
        from sqlalchemy import and_, desc
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        cutoff = datetime.utcnow() - timedelta(days=30)
        
        decisions = db.query(RiskDecision).filter(
            and_(
                RiskDecision.user_id == user_id,
                RiskDecision.created_at >= cutoff
            )
        ).all()
        
        risk_levels = {}
        total_score = 0.0
        for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            count = sum(1 for d in decisions if d.risk_level == level)
            risk_levels[level] = count
        
        avg_score = (sum(d.risk_score for d in decisions) / len(decisions)) if decisions else 0.0
        last_event = max((d.created_at for d in decisions), default=None) if decisions else None
        
        return UserProfile(
            user_id=user_id,
            email=user.email,
            total_events=len(decisions),
            critical_count=risk_levels.get("CRITICAL", 0),
            high_count=risk_levels.get("HIGH", 0),
            medium_count=risk_levels.get("MEDIUM", 0),
            low_count=risk_levels.get("LOW", 0),
            average_risk_score=float(avg_score),
            last_event=last_event
        )
    
    @strawberry.field
    def high_risk_users(
        self,
        days: int = 30,
        limit: int = 10,
        info: strawberry.types.Info = None
    ) -> List[UserProfile]:
        """Get users with highest risk scores"""
        db: Session = info.context["db"]
        from app.models import User
        from app.models.events import RiskDecision
        from datetime import timedelta
        from sqlalchemy import and_, func, desc
        
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        high_risk_users = db.query(
            RiskDecision.user_id,
            func.avg(RiskDecision.risk_score).label("avg_score")
        ).filter(
            RiskDecision.created_at >= cutoff
        ).group_by(RiskDecision.user_id).order_by(
            desc(func.avg(RiskDecision.risk_score))
        ).limit(limit).all()
        
        results = []
        for user_id, avg_score in high_risk_users:
            profile = Query.user_profile(self, user_id, info)
            if profile:
                results.append(profile)
        
        return results
    
    # ===== ANALYTICS QUERIES =====
    
    @strawberry.field
    def analytics_summary(
        self,
        days: int = 30,
        info: strawberry.types.Info = None
    ) -> Analytics:
        """Get overall analytics summary"""
        db: Session = info.context["db"]
        from app.models.events import RiskDecision
        from datetime import timedelta
        from sqlalchemy import func
        
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        events = db.query(RiskDecision).filter(
            RiskDecision.created_at >= cutoff
        ).all()
        
        total = len(events)
        critical = sum(1 for e in events if e.risk_level == "CRITICAL")
        high = sum(1 for e in events if e.risk_level == "HIGH")
        medium = sum(1 for e in events if e.risk_level == "MEDIUM")
        low = sum(1 for e in events if e.risk_level == "LOW")
        
        avg_score = (sum(e.risk_score for e in events) / total) if total > 0 else 0.0
        blocks = sum(1 for e in events if e.recommended_action == "block")
        block_rate = (blocks / total * 100) if total > 0 else 0.0
        
        return Analytics(
            total_events=total,
            critical_events=critical,
            high_events=high,
            medium_events=medium,
            low_events=low,
            average_risk_score=float(avg_score),
            block_rate=float(block_rate),
            period_days=days
        )
    
    @strawberry.field
    def user_cohorts(
        self,
        days: int = 30,
        info: strawberry.types.Info = None
    ) -> List[Cohort]:
        """Get user risk cohorts"""
        db: Session = info.context["db"]
        from app.services.advanced_analytics import get_advanced_analytics_service
        
        service = get_advanced_analytics_service()
        cohort_data = service.analyze_user_cohorts(db, days=days)
        
        cohorts = []
        for cohort_type, data in cohort_data["cohorts"].items():
            cohorts.append(Cohort(
                cohort_type=cohort_type,
                user_count=data["count"],
                percentage=float(data["percentage"])
            ))
        
        return cohorts
    
    @strawberry.field
    def rule_performance(
        self,
        days: int = 30,
        info: strawberry.types.Info = None
    ) -> List[RuleStat]:
        """Get performance metrics for all rules"""
        db: Session = info.context["db"]
        from app.services.advanced_analytics import get_advanced_analytics_service
        
        service = get_advanced_analytics_service()
        metrics = service.get_rule_performance_metrics(db, days=days)
        
        rules = []
        for rule_name, stats in metrics["rules"].items():
            rules.append(RuleStat(
                name=rule_name,
                total_triggers=stats["triggered"],
                trigger_rate=float(stats["trigger_rate"]),
                precision=stats["precision"],
                recall=stats["recall"],
                f1_score=stats["f1_score"]
            ))
        
        return sorted(rules, key=lambda x: x.f1_score, reverse=True)


def create_schema() -> strawberry.Schema:
    """Create and return the GraphQL schema"""
    return strawberry.Schema(query=Query)
