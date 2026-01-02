# Shadow Mode Rule Engine
# Evaluate new rules without blocking transactions, measure accuracy

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from app.models import ShadowModeResult, User
from enum import Enum

logger = logging.getLogger(__name__)


# ========== SHADOW MODE STATUS ==========

class RuleStatus(str, Enum):
    """Rule deployment status."""
    SHADOW = "shadow"        # Testing, no blocking
    PRODUCTION = "production"  # Active, blocking enabled
    ARCHIVED = "archived"    # Retired


# ========== SHADOW MODE SERVICE ==========

class ShadowModeService:
    """
    Service for evaluating rules in shadow mode without impacting production.
    
    Workflow:
    1. Data Scientist creates rule with status=shadow
    2. Risk Engine evaluates rule but does NOT block
    3. Results logged to shadow_mode_results table
    4. After 24-48 hours, analyze accuracy
    5. If accuracy >= 92%, promote to production
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========== LOGGING RESULTS ==========
    
    def log_shadow_evaluation(
        self,
        org_id: str,
        rule_id: str,
        event_id: str,
        user_id: str,
        would_have_blocked: bool,
        confidence_score: int,  # 0-100
    ) -> ShadowModeResult:
        """
        Log a shadow mode rule evaluation.
        Called by risk engine AFTER evaluating a shadow rule.
        """
        result = ShadowModeResult(
            organization_id=org_id,
            rule_id=rule_id,
            event_id=event_id,
            user_id=user_id,
            would_have_blocked=would_have_blocked,
            confidence_score=confidence_score,
            timestamp=datetime.utcnow(),
        )
        
        self.db.add(result)
        self.db.commit()
        
        logger.debug(
            f"[SHADOW MODE] Logged: rule={rule_id}, "
            f"would_block={would_have_blocked}, "
            f"confidence={confidence_score}%"
        )
        
        return result
    
    # ========== LABELING (Analyst marks ground truth) ==========
    
    def label_result(
        self,
        result_id: str,
        actual_fraud: bool,
        analyst_id: str,
    ):
        """
        Analyst labels a shadow result with ground truth.
        Example: Analyst reviews a transaction and confirms it WAS fraud,
        so they label actual_fraud=True.
        """
        result = self.db.query(ShadowModeResult).filter(
            ShadowModeResult.id == result_id
        ).first()
        
        if not result:
            logger.warning(f"[SHADOW MODE] Result {result_id} not found")
            return None
        
        result.actual_fraud = actual_fraud
        result.labeled_at = datetime.utcnow()
        result.labeled_by_user_id = analyst_id
        
        self.db.commit()
        
        logger.info(
            f"[SHADOW MODE] Result {result_id} labeled: "
            f"actual_fraud={actual_fraud} by {analyst_id}"
        )
        
        return result
    
    # ========== ACCURACY METRICS ==========
    
    def calculate_rule_accuracy(
        self,
        rule_id: str,
        org_id: str,
        time_window_hours: int = 48,
    ) -> Dict[str, Any]:
        """
        Calculate accuracy metrics for a shadow rule.
        
        Metrics:
        - Precision: TP / (TP + FP) - Of flagged events, how many were actually fraud?
        - Recall: TP / (TP + FN) - Of actual fraud, how many did we catch?
        - F1-Score: 2 * (P * R) / (P + R) - Harmonic mean of precision and recall
        """
        
        # [1] Get results within time window
        cutoff_time = datetime.utcnow() - timedelta(hours=time_window_hours)
        
        results = self.db.query(ShadowModeResult).filter(
            and_(
                ShadowModeResult.rule_id == rule_id,
                ShadowModeResult.organization_id == org_id,
                ShadowModeResult.timestamp >= cutoff_time,
                ShadowModeResult.actual_fraud.isnot(None),  # Only labeled results
            )
        ).all()
        
        if not results:
            logger.warning(f"[SHADOW MODE] No labeled results for {rule_id}")
            return {
                "rule_id": rule_id,
                "sample_size": 0,
                "precision": None,
                "recall": None,
                "f1_score": None,
                "recommendation": "Insufficient labeled data",
            }
        
        # [2] Calculate confusion matrix
        true_positives = sum(
            1 for r in results
            if r.would_have_blocked and r.actual_fraud
        )
        false_positives = sum(
            1 for r in results
            if r.would_have_blocked and not r.actual_fraud
        )
        false_negatives = sum(
            1 for r in results
            if not r.would_have_blocked and r.actual_fraud
        )
        true_negatives = sum(
            1 for r in results
            if not r.would_have_blocked and not r.actual_fraud
        )
        
        # [3] Calculate metrics
        precision = (
            true_positives / (true_positives + false_positives)
            if (true_positives + false_positives) > 0
            else 0
        )
        
        recall = (
            true_positives / (true_positives + false_negatives)
            if (true_positives + false_negatives) > 0
            else 0
        )
        
        f1_score = (
            2 * (precision * recall) / (precision + recall)
            if (precision + recall) > 0
            else 0
        )
        
        # [4] Recommendation
        if f1_score >= 0.92:
            recommendation = "✅ PROMOTE TO PRODUCTION (F1 >= 0.92)"
        elif f1_score >= 0.80:
            recommendation = "⚠️ REVIEW THRESHOLDS (F1 >= 0.80 but < 0.92)"
        else:
            recommendation = "❌ KEEP IN SHADOW MODE (F1 < 0.80)"
        
        return {
            "rule_id": rule_id,
            "sample_size": len(results),
            "time_window_hours": time_window_hours,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1_score, 4),
            "confusion_matrix": {
                "true_positives": true_positives,
                "false_positives": false_positives,
                "false_negatives": false_negatives,
                "true_negatives": true_negatives,
            },
            "recommendation": recommendation,
        }
    
    def get_accuracy_trends(
        self,
        rule_id: str,
        org_id: str,
        days: int = 7,
    ) -> List[Dict[str, Any]]:
        """
        Get daily accuracy trends for a shadow rule.
        Useful for seeing if accuracy improves over time.
        """
        trends = []
        
        for day_offset in range(days):
            day_start = datetime.utcnow() - timedelta(days=day_offset+1)
            day_end = datetime.utcnow() - timedelta(days=day_offset)
            
            results = self.db.query(ShadowModeResult).filter(
                and_(
                    ShadowModeResult.rule_id == rule_id,
                    ShadowModeResult.organization_id == org_id,
                    ShadowModeResult.timestamp >= day_start,
                    ShadowModeResult.timestamp < day_end,
                    ShadowModeResult.actual_fraud.isnot(None),
                )
            ).all()
            
            if results:
                accuracy = self.calculate_rule_accuracy(
                    rule_id=rule_id,
                    org_id=org_id,
                    time_window_hours=24,
                )
                
                accuracy["date"] = day_start.date()
                accuracy["sample_size"] = len(results)
                trends.append(accuracy)
        
        return trends
    
    # ========== COMPARISON & PROMOTION ==========
    
    def compare_rules(
        self,
        rule_id_1: str,
        rule_id_2: str,
        org_id: str,
        time_window_hours: int = 48,
    ) -> Dict[str, Any]:
        """
        Compare accuracy of two rules (e.g., current vs. new).
        Useful for A/B testing rule changes.
        """
        acc1 = self.calculate_rule_accuracy(
            rule_id=rule_id_1,
            org_id=org_id,
            time_window_hours=time_window_hours,
        )
        
        acc2 = self.calculate_rule_accuracy(
            rule_id=rule_id_2,
            org_id=org_id,
            time_window_hours=time_window_hours,
        )
        
        f1_diff = (acc2.get("f1_score") or 0) - (acc1.get("f1_score") or 0)
        
        return {
            "rule_1": acc1,
            "rule_2": acc2,
            "f1_difference": round(f1_diff, 4),
            "winner": (
                rule_id_2 if f1_diff > 0.05 else
                rule_id_1 if f1_diff < -0.05 else
                "TIE"
            ),
        }
    
    # ========== STATISTICS ==========
    
    def get_pending_labels(
        self,
        org_id: str,
        limit: int = 10,
    ) -> List[ShadowModeResult]:
        """
        Get unlabeled shadow results that need analyst review.
        """
        return self.db.query(ShadowModeResult).filter(
            and_(
                ShadowModeResult.organization_id == org_id,
                ShadowModeResult.actual_fraud.is_(None),  # Not yet labeled
            )
        ).order_by(
            ShadowModeResult.timestamp.desc()
        ).limit(limit).all()
    
    def get_rule_stats(
        self,
        rule_id: str,
        org_id: str,
    ) -> Dict[str, Any]:
        """
        Get statistics for a shadow rule.
        """
        results = self.db.query(ShadowModeResult).filter(
            and_(
                ShadowModeResult.rule_id == rule_id,
                ShadowModeResult.organization_id == org_id,
            )
        ).all()
        
        labeled = [r for r in results if r.actual_fraud is not None]
        unlabeled = [r for r in results if r.actual_fraud is None]
        would_block = [r for r in labeled if r.would_have_blocked]
        avg_confidence = (
            sum([r.confidence_score for r in results]) / len(results)
            if results else 0
        )
        
        return {
            "rule_id": rule_id,
            "total_evaluations": len(results),
            "labeled": len(labeled),
            "unlabeled": len(unlabeled),
            "would_have_blocked_count": len(would_block),
            "avg_confidence": round(avg_confidence, 2),
            "labeling_progress": round(
                (len(labeled) / len(results) * 100) if results else 0,
                2
            ),
        }


# ========== HELPER FUNCTION ==========

def get_shadow_mode_service(db: Session) -> ShadowModeService:
    """Dependency: Get shadow mode service."""
    return ShadowModeService(db)
