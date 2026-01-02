"""
Advanced Analytics Service - Time-series, drill-down, cohort analysis, ML-ready
Provides multi-dimensional analytics for risk events, user behavior, and trends
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, between, case
from collections import defaultdict

from app.models import User, AuditLog
from app.models.events import RiskDecision, RuleEvaluation, VelocityCounter
from app.core.logging import logger
from app.core.db import SessionLocal


class AdvancedAnalyticsService:
    """Advanced analytics with time-series, drill-down, cohorts, and trending"""
    
    # ===== TIME-SERIES ANALYSIS =====
    
    @staticmethod
    def get_risk_timeline(
        db: Session,
        days: int = 30,
        granularity: str = "hourly"  # hourly, daily, weekly
    ) -> Dict[str, Any]:
        """
        Get risk events over time with granular bucketing
        
        Args:
            db: Database session
            days: Number of days to analyze
            granularity: "hourly", "daily", or "weekly"
            
        Returns:
            Timeline of risk events with counts by level
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        # Query all risk decisions in window
        decisions = db.query(RiskDecision).filter(
            RiskDecision.created_at >= cutoff
        ).all()
        
        # Bucket by granularity
        timeline = defaultdict(lambda: {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "total": 0
        })
        
        for decision in decisions:
            if granularity == "hourly":
                bucket = decision.created_at.strftime("%Y-%m-%d %H:00")
            elif granularity == "daily":
                bucket = decision.created_at.strftime("%Y-%m-%d")
            else:  # weekly
                bucket = decision.created_at.strftime("%Y-W%V")
            
            risk_level = decision.risk_level.lower()
            timeline[bucket][risk_level] += 1
            timeline[bucket]["total"] += 1
        
        return {
            "granularity": granularity,
            "days": days,
            "timeline": dict(sorted(timeline.items()))
        }
    
    @staticmethod
    def get_velocity_trends(
        db: Session,
        hours: int = 72,
        step_minutes: int = 30
    ) -> Dict[str, Any]:
        """
        Get velocity counter trends over time
        Shows spike detection points
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        counters = db.query(VelocityCounter).filter(
            VelocityCounter.window_start >= cutoff
        ).order_by(VelocityCounter.window_start).all()
        
        trends = defaultdict(list)
        for counter in counters:
            key = f"{counter.user_id}:{counter.counter_type}"
            trends[key].append({
                "timestamp": counter.window_start.isoformat(),
                "count": counter.count,
                "threshold": counter.threshold
            })
        
        # Calculate spike points (count > threshold)
        spikes = {}
        for key, data in trends.items():
            spike_points = [d for d in data if d["count"] > d["threshold"]]
            if spike_points:
                spikes[key] = spike_points
        
        return {
            "hours": hours,
            "step_minutes": step_minutes,
            "trends": dict(trends),
            "spike_points": spikes,
            "total_users_with_spikes": len(set(k.split(":")[0] for k in spikes.keys()))
        }
    
    # ===== DRILL-DOWN ANALYTICS =====
    
    @staticmethod
    def drill_down_risk_events(
        db: Session,
        risk_level: Optional[str] = None,
        user_id: Optional[str] = None,
        days: int = 30,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Drill down into specific risk events with full details
        
        Args:
            db: Database session
            risk_level: Filter by "critical", "high", "medium", "low"
            user_id: Filter by specific user
            days: Look back N days
            limit: Max results
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        query = db.query(RiskDecision).filter(
            RiskDecision.created_at >= cutoff
        )
        
        if risk_level:
            query = query.filter(RiskDecision.risk_level == risk_level.upper())
        
        if user_id:
            query = query.filter(RiskDecision.user_id == user_id)
        
        decisions = query.order_by(desc(RiskDecision.created_at)).limit(limit).all()
        
        # Enrich with rule evaluations
        events = []
        for decision in decisions:
            rule_evals = db.query(RuleEvaluation).filter(
                RuleEvaluation.risk_decision_id == decision.id
            ).all()
            
            events.append({
                "event_id": decision.event_id,
                "user_id": decision.user_id,
                "risk_score": float(decision.risk_score),
                "risk_level": decision.risk_level,
                "recommended_action": decision.recommended_action,
                "timestamp": decision.created_at.isoformat(),
                "triggered_rules": [
                    {
                        "rule_name": re.rule_name,
                        "rule_type": re.rule_type,
                        "score_contribution": float(re.score_contribution),
                        "triggered": re.triggered
                    }
                    for re in rule_evals
                ]
            })
        
        return {
            "filter": {
                "risk_level": risk_level,
                "user_id": user_id,
                "days": days
            },
            "count": len(events),
            "events": events
        }
    
    @staticmethod
    def drill_down_by_rule(
        db: Session,
        rule_name: str,
        days: int = 30,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Analyze all events triggered by a specific rule
        Helps identify rule effectiveness and false positives
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        rule_evals = db.query(RuleEvaluation).filter(
            and_(
                RuleEvaluation.rule_name == rule_name,
                RuleEvaluation.created_at >= cutoff
            )
        ).order_by(desc(RuleEvaluation.created_at)).all()
        
        triggered_count = sum(1 for re in rule_evals if re.triggered)
        
        # Get decision outcomes for triggered events
        outcomes = defaultdict(int)
        for re in rule_evals:
            if re.triggered:
                decision = db.query(RiskDecision).filter(
                    RiskDecision.id == re.risk_decision_id
                ).first()
                if decision:
                    outcomes[decision.recommended_action] += 1
        
        return {
            "rule_name": rule_name,
            "evaluations": len(rule_evals),
            "triggered": triggered_count,
            "trigger_rate": (triggered_count / len(rule_evals) * 100) if rule_evals else 0,
            "effectiveness": {
                "outcomes": dict(outcomes),
                "block_rate": (outcomes["block"] / triggered_count * 100) if triggered_count > 0 else 0
            },
            "days": days
        }
    
    # ===== COHORT ANALYSIS =====
    
    @staticmethod
    def analyze_user_cohorts(
        db: Session,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Segment users into cohorts based on risk profile
        
        Returns:
        - Low risk users: No violations
        - Medium risk users: 1-3 violations
        - High risk users: 4+ violations or recent blocks
        - Flagged users: Under review
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        # Get all users with their violation counts
        users = db.query(User).filter(User.is_active == True).all()
        
        cohorts = {
            "low_risk": [],
            "medium_risk": [],
            "high_risk": [],
            "flagged": []
        }
        
        for user in users:
            violations = db.query(func.count(RiskDecision.id)).filter(
                and_(
                    RiskDecision.user_id == user.id,
                    RiskDecision.created_at >= cutoff
                )
            ).scalar() or 0
            
            blocks = db.query(func.count(RiskDecision.id)).filter(
                and_(
                    RiskDecision.user_id == user.id,
                    RiskDecision.recommended_action == "block",
                    RiskDecision.created_at >= cutoff
                )
            ).scalar() or 0
            
            user_info = {
                "user_id": user.id,
                "email": user.email,
                "violations": violations,
                "blocks": blocks
            }
            
            if blocks > 0:
                cohorts["flagged"].append(user_info)
            elif violations >= 4:
                cohorts["high_risk"].append(user_info)
            elif violations >= 1:
                cohorts["medium_risk"].append(user_info)
            else:
                cohorts["low_risk"].append(user_info)
        
        return {
            "days": days,
            "cohorts": {
                "low_risk": {
                    "count": len(cohorts["low_risk"]),
                    "percentage": (len(cohorts["low_risk"]) / len(users) * 100) if users else 0,
                    "users": cohorts["low_risk"][:10]  # Sample
                },
                "medium_risk": {
                    "count": len(cohorts["medium_risk"]),
                    "percentage": (len(cohorts["medium_risk"]) / len(users) * 100) if users else 0,
                    "users": cohorts["medium_risk"][:10]
                },
                "high_risk": {
                    "count": len(cohorts["high_risk"]),
                    "percentage": (len(cohorts["high_risk"]) / len(users) * 100) if users else 0,
                    "users": cohorts["high_risk"][:10]
                },
                "flagged": {
                    "count": len(cohorts["flagged"]),
                    "percentage": (len(cohorts["flagged"]) / len(users) * 100) if users else 0,
                    "users": cohorts["flagged"][:10]
                }
            }
        }
    
    @staticmethod
    def analyze_cohort_behavior(
        db: Session,
        cohort: str,  # "low_risk", "medium_risk", "high_risk", "flagged"
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Compare behavior patterns within a cohort
        Identifies common triggers and patterns
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        # Get cohort members
        cohort_data = AdvancedAnalyticsService.analyze_user_cohorts(db, days)
        cohort_users = [u["user_id"] for u in cohort_data["cohorts"][cohort]["users"]]
        
        if not cohort_users:
            return {"cohort": cohort, "members": 0, "patterns": []}
        
        # Analyze rule triggers within cohort
        rule_triggers = db.query(
            RuleEvaluation.rule_name,
            func.count(RuleEvaluation.id).label("count")
        ).filter(
            and_(
                RuleEvaluation.triggered == True,
                RuleEvaluation.created_at >= cutoff,
                RiskDecision.user_id.in_(cohort_users)
            )
        ).group_by(RuleEvaluation.rule_name).order_by(
            desc(func.count(RuleEvaluation.id))
        ).all()
        
        # Analyze recommended actions
        actions = db.query(
            RiskDecision.recommended_action,
            func.count(RiskDecision.id).label("count")
        ).filter(
            and_(
                RiskDecision.user_id.in_(cohort_users),
                RiskDecision.created_at >= cutoff
            )
        ).group_by(RiskDecision.recommended_action).all()
        
        return {
            "cohort": cohort,
            "members": len(cohort_users),
            "analysis_period_days": days,
            "top_triggered_rules": [
                {"rule": rule, "count": count}
                for rule, count in rule_triggers[:5]
            ],
            "recommended_actions": [
                {"action": action, "count": count}
                for action, count in actions
            ]
        }
    
    # ===== COMPARATIVE ANALYTICS =====
    
    @staticmethod
    def compare_risk_levels(
        db: Session,
        user_id_a: str,
        user_id_b: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Compare risk profiles between two users
        Useful for identifying similar patterns or anomalies
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        def get_user_profile(user_id):
            decisions = db.query(RiskDecision).filter(
                and_(
                    RiskDecision.user_id == user_id,
                    RiskDecision.created_at >= cutoff
                )
            ).all()
            
            if not decisions:
                return None
            
            risk_levels = {}
            for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                count = sum(1 for d in decisions if d.risk_level == level)
                risk_levels[level] = count
            
            avg_score = sum(d.risk_score for d in decisions) / len(decisions)
            
            return {
                "total_events": len(decisions),
                "risk_levels": risk_levels,
                "average_score": float(avg_score),
                "block_rate": (sum(1 for d in decisions if d.recommended_action == "block") / len(decisions) * 100)
            }
        
        profile_a = get_user_profile(user_id_a)
        profile_b = get_user_profile(user_id_b)
        
        return {
            "user_a": user_id_a,
            "user_b": user_id_b,
            "days": days,
            "user_a_profile": profile_a,
            "user_b_profile": profile_b,
            "similarity_score": AdvancedAnalyticsService._calculate_profile_similarity(profile_a, profile_b) if profile_a and profile_b else None
        }
    
    @staticmethod
    def _calculate_profile_similarity(profile_a: Dict, profile_b: Dict) -> float:
        """
        Calculate similarity between two user risk profiles (0-1 scale)
        Based on risk level distribution and average scores
        """
        if not profile_a or not profile_b:
            return 0.0
        
        # Compare risk level distributions
        total_a = profile_a["total_events"]
        total_b = profile_b["total_events"]
        
        if total_a == 0 or total_b == 0:
            return 0.0
        
        # Calculate distribution similarity (using cosine similarity concept)
        similarity = 0
        for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            rate_a = profile_a["risk_levels"][level] / total_a
            rate_b = profile_b["risk_levels"][level] / total_b
            similarity += (1 - abs(rate_a - rate_b))
        
        # Weight by score proximity
        score_diff = abs(profile_a["average_score"] - profile_b["average_score"])
        score_similarity = 1 - min(score_diff, 1.0)
        
        return (similarity / 4 * 0.7) + (score_similarity * 0.3)
    
    # ===== TRENDING & FORECASTING =====
    
    @staticmethod
    def get_risk_trends(
        db: Session,
        days: int = 60
    ) -> Dict[str, Any]:
        """
        Analyze risk trends and calculate growth/decline rates
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        # Split into two periods
        mid_date = datetime.utcnow() - timedelta(days=days//2)
        
        first_period = db.query(RiskDecision).filter(
            and_(
                RiskDecision.created_at >= cutoff,
                RiskDecision.created_at < mid_date
            )
        ).all()
        
        second_period = db.query(RiskDecision).filter(
            and_(
                RiskDecision.created_at >= mid_date,
                RiskDecision.created_at < datetime.utcnow()
            )
        ).all()
        
        first_count = len(first_period)
        second_count = len(second_period)
        
        trend_direction = "increasing" if second_count > first_count else "decreasing"
        change_percent = ((second_count - first_count) / first_count * 100) if first_count > 0 else 0
        
        # Analyze risk level shifts
        first_critical = sum(1 for d in first_period if d.risk_level == "CRITICAL")
        second_critical = sum(1 for d in second_period if d.risk_level == "CRITICAL")
        
        return {
            "analysis_period_days": days,
            "first_period": {
                "events": first_count,
                "critical": first_critical
            },
            "second_period": {
                "events": second_count,
                "critical": second_critical
            },
            "trend": {
                "direction": trend_direction,
                "change_percent": round(change_percent, 2),
                "critical_shift": second_critical - first_critical
            }
        }
    
    # ===== PERFORMANCE METRICS =====
    
    @staticmethod
    def get_rule_performance_metrics(
        db: Session,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Evaluate rule effectiveness across all rules
        Shows precision, recall, and impact metrics
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        rule_metrics = {}
        
        # Get all unique rules
        rules = db.query(RuleEvaluation.rule_name).distinct().filter(
            RuleEvaluation.created_at >= cutoff
        ).all()
        
        for (rule_name,) in rules:
            evals = db.query(RuleEvaluation).filter(
                and_(
                    RuleEvaluation.rule_name == rule_name,
                    RuleEvaluation.created_at >= cutoff
                )
            ).all()
            
            triggered = sum(1 for e in evals if e.triggered)
            total = len(evals)
            
            # Get outcomes for triggered events
            true_positives = sum(1 for e in evals 
                                if e.triggered and e.is_true_positive)
            false_positives = triggered - true_positives
            
            precision = (true_positives / triggered) if triggered > 0 else 0
            recall = (true_positives / total) if total > 0 else 0
            f1_score = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0
            
            rule_metrics[rule_name] = {
                "total_evaluations": total,
                "triggered": triggered,
                "trigger_rate": (triggered / total * 100) if total > 0 else 0,
                "true_positives": true_positives,
                "false_positives": false_positives,
                "precision": round(precision, 3),
                "recall": round(recall, 3),
                "f1_score": round(f1_score, 3)
            }
        
        return {
            "period_days": days,
            "rules": rule_metrics,
            "best_rule": max(rule_metrics.items(), key=lambda x: x[1]["f1_score"])[0] if rule_metrics else None
        }


# Singleton instance
_advanced_analytics_service = None


def get_advanced_analytics_service() -> AdvancedAnalyticsService:
    """Get or create singleton instance"""
    global _advanced_analytics_service
    if _advanced_analytics_service is None:
        _advanced_analytics_service = AdvancedAnalyticsService()
    return _advanced_analytics_service
