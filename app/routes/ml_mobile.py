"""
ML & Mobile SDK Routes
ML model inference endpoints and mobile SDK registration/management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_role
from app.services.ml_service import get_ml_service
from app.core.logging import logger, log_event
from app.models import User
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uuid

router = APIRouter(tags=["ml", "mobile"])
ml_service = get_ml_service()


# ===== ML ROUTES =====

class UserFeaturesRequest(BaseModel):
    """User behavioral features for anomaly detection"""
    login_frequency: float
    device_count: int
    location_changes: float
    failed_attempts: float
    api_calls: float


@router.post("/ml/anomalies/detect")
def detect_user_anomalies(
    user_id: str = Query(...),
    features: UserFeaturesRequest = None,
    sensitivity: str = Query("normal", regex="^(strict|normal|loose)$"),
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Detect behavioral anomalies using ML model
    
    Sensitivities:
    - strict: 2 std deviations (catches more anomalies, more false positives)
    - normal: 3 std deviations (balanced)
    - loose: 4 std deviations (only extreme anomalies)
    """
    try:
        log_event(
            action="anomaly_detection_requested",
            user_id=user.id,
            target=f"/ml/anomalies/detect",
            details={"target_user": user_id, "sensitivity": sensitivity}
        )
        
        if not features:
            return {"error": "Missing features"}
        
        result = ml_service.detect_anomalies(
            user_id,
            {
                "login_frequency": features.login_frequency,
                "device_count": features.device_count,
                "location_changes": features.location_changes,
                "failed_attempts": features.failed_attempts,
                "api_calls": features.api_calls
            },
            sensitivity=sensitivity
        )
        
        return {
            "status": "success",
            "user_id": user_id,
            "anomaly_detection": result
        }
    
    except Exception as e:
        logger.error(f"Error detecting anomalies: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect anomalies"
        )


@router.get("/ml/risk/predict/{user_id}")
def predict_user_risk(
    user_id: str,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Predict future risk probability for a user
    
    Uses historical risk patterns and recent events
    to estimate likelihood of high-risk activity
    """
    try:
        log_event(
            action="risk_prediction_requested",
            user_id=user.id,
            target=f"/ml/risk/predict/{user_id}"
        )
        
        prediction = ml_service.predict_user_risk(user_id, db)
        
        return {
            "status": "success",
            "user_id": user_id,
            "prediction": prediction
        }
    
    except Exception as e:
        logger.error(f"Error predicting risk: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to predict risk"
        )


@router.get("/ml/models/status")
def get_ml_models_status(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Get status of all deployed ML models
    
    Includes:
    - Model versions
    - Training status
    - Performance metrics
    """
    try:
        log_event(
            action="ml_status_viewed",
            user_id=user.id,
            target="/ml/models/status"
        )
        
        status_data = ml_service.get_model_status()
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "models": status_data
        }
    
    except Exception as e:
        logger.error(f"Error getting ML models status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get models status"
        )


# ===== MOBILE SDK ROUTES =====

class MobileSDKConfig(BaseModel):
    """Mobile SDK configuration"""
    api_key: Optional[str] = None
    enabled: bool = True
    timeout_ms: int = 30000


class MobileAppRegistration(BaseModel):
    """Mobile app registration"""
    app_name: str
    platform: str  # ios, android, web
    version: str
    bundle_id: str
    contact_email: str


_sdk_registry = {}  # In-memory registry (would be in DB for production)


@router.post("/mobile/sdk/register")
def register_mobile_app(
    req: MobileAppRegistration,
    user: User = Depends(require_role(["admin"]))
):
    """
    Register a mobile application for SDK usage
    
    Returns SDK credentials and configuration
    """
    try:
        # Generate unique SDK key
        sdk_key = f"sdk_{uuid.uuid4().hex[:16]}"
        sdk_secret = f"secret_{uuid.uuid4().hex[:32]}"
        
        registration = {
            "sdk_key": sdk_key,
            "sdk_secret": sdk_secret,
            "app_name": req.app_name,
            "platform": req.platform,
            "version": req.version,
            "bundle_id": req.bundle_id,
            "registered_at": datetime.utcnow().isoformat(),
            "status": "active"
        }
        
        _sdk_registry[sdk_key] = registration
        
        log_event(
            action="mobile_app_registered",
            user_id=user.id,
            target="/mobile/sdk/register",
            details={"app_name": req.app_name, "platform": req.platform}
        )
        
        return {
            "status": "success",
            "sdk_key": sdk_key,
            "sdk_secret": sdk_secret,
            "registration": registration
        }
    
    except Exception as e:
        logger.error(f"Error registering mobile app: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register mobile app"
        )


@router.get("/mobile/sdk/documentation")
def get_sdk_documentation(user: User = Depends(require_role(["admin"]))):
    """
    Get mobile SDK documentation and code examples
    
    Returns:
    - iOS (Swift) examples
    - Android (Kotlin) examples
    - Integration guide
    - Best practices
    """
    return {
        "status": "success",
        "sdks": {
            "ios": {
                "language": "Swift",
                "min_version": "12.0",
                "package_manager": "CocoaPods/SPM",
                "installation": "pod 'SentinelIQ'",
                "quick_start": """
                    import SentinelIQ
                    
                    let sdk = SentinelIQSDK(apiKey: "your_api_key")
                    sdk.initialize()
                    sdk.logEvent(type: "login", metadata: [:])
                """,
                "events": ["login", "logout", "payment", "profile_update", "failed_auth"],
                "features": [
                    "Automatic device fingerprinting",
                    "Offline event queue",
                    "End-to-end encryption",
                    "Battery-optimized",
                    "Privacy-focused"
                ]
            },
            "android": {
                "language": "Kotlin",
                "min_version": "7.0 (API 24)",
                "package_manager": "Gradle",
                "installation": "implementation 'com.sentineliq:sdk:1.0.0'",
                "quick_start": """
                    import com.sentineliq.SentinelIQSDK
                    
                    val sdk = SentinelIQSDK.getInstance(context)
                    sdk.initialize(apiKey = "your_api_key")
                    sdk.logEvent(type = "login", metadata = emptyMap())
                """,
                "events": ["login", "logout", "payment", "profile_update", "failed_auth"],
                "features": [
                    "Automatic device fingerprinting",
                    "Offline event queue",
                    "End-to-end encryption",
                    "Battery-optimized",
                    "Privacy-focused"
                ]
            },
            "web": {
                "language": "TypeScript/JavaScript",
                "frameworks": ["React", "Vue", "Angular", "Vanilla JS"],
                "installation": "npm install @sentineliq/sdk",
                "quick_start": """
                    import { SentinelIQ } from '@sentineliq/sdk';
                    
                    const sdk = new SentinelIQ({
                        apiKey: 'your_api_key'
                    });
                    sdk.initialize();
                    sdk.logEvent('login', {});
                """,
                "events": ["login", "logout", "payment", "profile_update", "failed_auth"],
                "features": [
                    "Zero-overhead fingerprinting",
                    "Offline support",
                    "XSS protection",
                    "Lightweight bundle",
                    "Privacy-first"
                ]
            }
        },
        "common_events": {
            "login": {"description": "User login attempt", "required": ["user_id", "timestamp"]},
            "logout": {"description": "User logout", "required": ["user_id"]},
            "payment": {"description": "Payment transaction", "required": ["amount", "currency"]},
            "profile_update": {"description": "Profile modification", "required": ["fields_changed"]},
            "failed_auth": {"description": "Failed authentication", "required": ["reason"]}
        },
        "integration_guide": {
            "step1": "Register your app using POST /mobile/sdk/register",
            "step2": "Obtain SDK credentials (api_key, api_secret)",
            "step3": "Initialize SDK in your app",
            "step4": "Log events as users interact with your app",
            "step5": "Monitor risk events in SentinelIQ dashboard",
            "step6": "Implement recommended actions (block, challenge, etc)"
        },
        "best_practices": [
            "Initialize SDK early in app lifecycle",
            "Log events synchronously (SDK handles queuing)",
            "Never log sensitive data (passwords, credit cards)",
            "Use offline mode for reliability",
            "Monitor battery impact in background",
            "Validate all user inputs before logging"
        ]
    }


@router.get("/mobile/sdk/validate/{sdk_key}")
def validate_sdk_key(
    sdk_key: str,
    user: User = Depends(require_role(["admin"]))
):
    """
    Validate an SDK key (for app initialization)
    """
    try:
        if sdk_key not in _sdk_registry:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid SDK key"
            )
        
        reg = _sdk_registry[sdk_key]
        
        return {
            "status": "success",
            "valid": True,
            "app_name": reg["app_name"],
            "platform": reg["platform"],
            "configuration": {
                "api_endpoint": "https://api.sentineliq.com",
                "batch_size": 10,
                "batch_interval_ms": 5000,
                "offline_enabled": True
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating SDK key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate SDK key"
        )


@router.post("/mobile/events/batch")
def submit_event_batch(
    events: List[Dict[str, Any]] = None,
    sdk_key: str = Query(...),
    user: User = Depends(require_role(["admin"]))
):
    """
    Submit batch of events from mobile SDK
    
    This is the endpoint called by mobile clients to submit events
    """
    try:
        if sdk_key not in _sdk_registry:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid SDK key"
            )
        
        if not events:
            return {"status": "success", "ingested": 0}
        
        logger.info(f"Ingested {len(events)} mobile events via SDK {sdk_key}")
        
        # Events would be processed and stored
        # For now, just acknowledge receipt
        
        return {
            "status": "success",
            "ingested": len(events),
            "batch_id": str(uuid.uuid4())
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit events"
        )


from datetime import datetime
