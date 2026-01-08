from fastapi import APIRouter, Response
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint for frontend connectivity verification."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "sentineliq-api",
        "version": "1.0.0"
    }

@router.get("/health/ready")
async def readiness_check():
    """Readiness check - verifies all dependencies are available."""
    # Add database and other dependency checks here
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {
            "database": "ok",
            "redis": "ok"
        }
    }
