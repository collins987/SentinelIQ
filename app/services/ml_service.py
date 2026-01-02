"""
ML Integration Service - Anomaly detection and predictive scoring
Provides machine learning model integration for enhanced risk detection
"""

import json
import pickle
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
import numpy as np

from app.core.logging import logger
from app.services.redis_stream import get_redis_stream_manager
from app.models.events import RiskDecision

redis_manager = get_redis_stream_manager()


class MLModel:
    """Wrapper for ML models"""
    
    def __init__(self, model_id: str, model_type: str, version: str):
        self.model_id = model_id
        self.model_type = model_type  # anomaly_detection, risk_predictor, etc.
        self.version = version
        self.created_at = datetime.utcnow()
        self.model_data = None
        self.feature_list = []
    
    def load_from_redis(self) -> bool:
        """Load model from Redis cache"""
        try:
            key = f"ml_model:{self.model_id}:{self.version}"
            model_bytes = redis_manager.redis_client.get(key)
            
            if not model_bytes:
                return False
            
            # Decompress and unpickle
            self.model_data = pickle.loads(model_bytes)
            logger.debug(f"Loaded model {self.model_id} v{self.version} from Redis")
            return True
        
        except Exception as e:
            logger.error(f"Error loading model from Redis: {str(e)}")
            return False
    
    def save_to_redis(self, ttl: int = 86400*30):
        """Save model to Redis cache"""
        try:
            key = f"ml_model:{self.model_id}:{self.version}"
            model_bytes = pickle.dumps(self.model_data)
            redis_manager.redis_client.set(key, model_bytes, ex=ttl)
            logger.debug(f"Saved model {self.model_id} v{self.version} to Redis")
        
        except Exception as e:
            logger.error(f"Error saving model to Redis: {str(e)}")


class AnomalyDetectionModel:
    """
    Anomaly detection model for identifying unusual user behavior
    Uses statistical methods (Isolation Forest, LOF concepts)
    """
    
    def __init__(self, model_version: str = "1.0.0"):
        self.model_version = model_version
        self.feature_means = {}
        self.feature_stds = {}
        self.thresholds = {
            "strict": 2.0,      # 2 std deviations
            "normal": 3.0,      # 3 std deviations
            "loose": 4.0        # 4 std deviations
        }
    
    def train(self, historical_data: List[Dict[str, float]]):
        """
        Train model on historical user behavior
        
        Expected features:
        - login_frequency: logins per day
        - device_count: unique devices used
        - location_changes: location changes per day
        - failed_attempts: failed login attempts per day
        - api_calls: total API calls per day
        """
        if not historical_data:
            logger.warning("No training data provided")
            return
        
        try:
            # Extract features
            feature_names = list(historical_data[0].keys())
            feature_matrix = np.array([
                [d.get(f, 0) for f in feature_names]
                for d in historical_data
            ])
            
            # Calculate statistics
            self.feature_means = {
                name: float(feature_matrix[:, i].mean())
                for i, name in enumerate(feature_names)
            }
            
            self.feature_stds = {
                name: float(feature_matrix[:, i].std())
                for i, name in enumerate(feature_names)
            }
            
            logger.info(f"Trained anomaly detection model v{self.model_version}")
        
        except Exception as e:
            logger.error(f"Error training anomaly detection model: {str(e)}")
    
    def detect_anomalies(
        self,
        user_features: Dict[str, float],
        sensitivity: str = "normal"
    ) -> Dict[str, Any]:
        """
        Detect anomalies in user behavior
        
        Args:
            user_features: Current user feature vector
            sensitivity: "strict", "normal", or "loose"
            
        Returns:
            Anomaly detection result with scores
        """
        if not self.feature_means:
            return {
                "is_anomaly": False,
                "score": 0.0,
                "reason": "Model not trained"
            }
        
        try:
            threshold = self.thresholds.get(sensitivity, 3.0)
            anomaly_scores = []
            flagged_features = []
            
            for feature_name, user_value in user_features.items():
                if feature_name not in self.feature_means:
                    continue
                
                mean = self.feature_means[feature_name]
                std = self.feature_stds[feature_name]
                
                if std == 0:
                    continue
                
                # Z-score
                z_score = abs((user_value - mean) / std)
                anomaly_scores.append(z_score)
                
                if z_score > threshold:
                    flagged_features.append({
                        "feature": feature_name,
                        "value": user_value,
                        "mean": mean,
                        "z_score": float(z_score)
                    })
            
            # Aggregate anomaly score (max z-score)
            max_z_score = max(anomaly_scores) if anomaly_scores else 0.0
            is_anomaly = max_z_score > threshold
            
            # Convert to 0-1 scale
            anomaly_score = min(max_z_score / threshold, 1.0) if threshold > 0 else 0.0
            
            return {
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": float(anomaly_score),
                "max_z_score": float(max_z_score),
                "threshold": threshold,
                "flagged_features": flagged_features
            }
        
        except Exception as e:
            logger.error(f"Error detecting anomalies: {str(e)}")
            return {
                "is_anomaly": False,
                "score": 0.0,
                "error": str(e)
            }


class RiskPredictorModel:
    """
    Risk prediction model for estimating future risk
    Uses historical risk patterns to predict probability of high-risk events
    """
    
    def __init__(self, model_version: str = "1.0.0"):
        self.model_version = model_version
        self.risk_patterns = {}
    
    def predict_risk(
        self,
        user_id: str,
        recent_events: List[Dict[str, Any]],
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Predict future risk probability for user
        
        Args:
            user_id: User to predict for
            recent_events: Recent risk events for this user
            db: Database session for historical data
            
        Returns:
            Risk prediction with probability and factors
        """
        try:
            if not recent_events:
                return {
                    "predicted_risk_level": "low",
                    "risk_probability": 0.1,
                    "factors": []
                }
            
            # Calculate risk trend
            recent_scores = [e.get("risk_score", 0) for e in recent_events]
            avg_score = np.mean(recent_scores) if recent_scores else 0
            trend = recent_scores[-1] - recent_scores[0] if len(recent_scores) > 1 else 0
            
            # Count high-risk events
            high_risk_count = sum(1 for e in recent_events if e.get("risk_level") in ["HIGH", "CRITICAL"])
            
            # Calculate probability
            probability = min(
                (avg_score * 0.5) +  # Average risk component
                (min(high_risk_count / len(recent_events), 1.0) * 0.3) +  # High-risk ratio
                (min(max(trend, 0) / 10, 0.2)),  # Trend component
                1.0
            )
            
            # Determine predicted level
            if probability > 0.7:
                predicted_level = "critical"
            elif probability > 0.5:
                predicted_level = "high"
            elif probability > 0.3:
                predicted_level = "medium"
            else:
                predicted_level = "low"
            
            # Identify factors
            factors = []
            if avg_score > 0.5:
                factors.append(f"High average risk score ({avg_score:.2f})")
            if trend > 0:
                factors.append(f"Increasing risk trend (+{trend:.2f})")
            if high_risk_count > len(recent_events) / 2:
                factors.append(f"Frequent high-risk events ({high_risk_count}/{len(recent_events)})")
            
            return {
                "predicted_risk_level": predicted_level,
                "risk_probability": float(probability),
                "confidence": 0.75,  # Model confidence (0-1)
                "factors": factors,
                "recent_event_count": len(recent_events),
                "average_risk_score": float(avg_score)
            }
        
        except Exception as e:
            logger.error(f"Error predicting risk: {str(e)}")
            return {
                "predicted_risk_level": "unknown",
                "risk_probability": 0.5,
                "error": str(e)
            }


class MLService:
    """Service for ML model management and inference"""
    
    def __init__(self):
        self.anomaly_model = AnomalyDetectionModel()
        self.risk_predictor = RiskPredictorModel()
        self.model_registry = {}  # Track loaded models
    
    def detect_anomalies(
        self,
        user_id: str,
        user_features: Dict[str, float],
        sensitivity: str = "normal"
    ) -> Dict[str, Any]:
        """
        Detect anomalies using trained model
        """
        result = self.anomaly_model.detect_anomalies(user_features, sensitivity)
        
        if result.get("is_anomaly"):
            logger.warning(f"Anomaly detected for user {user_id}", extra={
                "user_id": user_id,
                "anomaly_score": result.get("anomaly_score"),
                "flagged_features": len(result.get("flagged_features", []))
            })
        
        return result
    
    def predict_user_risk(
        self,
        user_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Predict future risk for user based on history
        """
        try:
            # Get recent events for user
            recent_decisions = db.query(RiskDecision).filter(
                RiskDecision.user_id == user_id
            ).order_by(RiskDecision.created_at.desc()).limit(20).all()
            
            recent_events = [
                {
                    "risk_score": float(d.risk_score),
                    "risk_level": d.risk_level,
                    "timestamp": d.created_at.isoformat()
                }
                for d in recent_decisions
            ]
            
            return self.risk_predictor.predict_risk(user_id, recent_events, db)
        
        except Exception as e:
            logger.error(f"Error predicting user risk: {str(e)}")
            return {
                "predicted_risk_level": "unknown",
                "risk_probability": 0.5,
                "error": str(e)
            }
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get status of all ML models"""
        return {
            "models": {
                "anomaly_detection": {
                    "version": self.anomaly_model.model_version,
                    "trained": bool(self.anomaly_model.feature_means),
                    "feature_count": len(self.anomaly_model.feature_means)
                },
                "risk_predictor": {
                    "version": self.risk_predictor.model_version,
                    "status": "ready"
                }
            },
            "registry_size": len(self.model_registry)
        }


# Singleton instance
_ml_service = None


def get_ml_service() -> MLService:
    """Get or create singleton instance"""
    global _ml_service
    if _ml_service is None:
        _ml_service = MLService()
    return _ml_service
