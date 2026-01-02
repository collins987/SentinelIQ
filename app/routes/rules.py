"""
Rules Management Routes - Runtime rule reloading and versioning
Endpoints for managing fraud detection rules with hot-reload capability
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_role
from app.services.rule_manager import get_rule_manager
from app.core.logging import logger, log_event
from app.models import User
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/rules", tags=["rules"])
rule_manager = get_rule_manager()


class ReloadRulesRequest(BaseModel):
    """Request to reload rules"""
    force: bool = False


@router.post("/reload")
def reload_rules(
    req: ReloadRulesRequest,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Reload fraud detection rules from YAML file
    
    Validates rules before applying, tracks versions, supports rollback
    
    Query Parameters:
    - force: Force reload even if file hasn't changed (default: false)
    """
    try:
        log_event(
            action="rules_reload_requested",
            user_id=user.id,
            target="/rules/reload",
            details={"force": req.force}
        )
        
        result = rule_manager.reload_rules(force=req.force)
        
        if result["status"] == "success":
            logger.warning(f"Rules reloaded successfully: version {result['version']}", extra={
                "user_id": user.id,
                "version": result["version"],
                "changes": result["changes"]
            })
        else:
            logger.error(f"Rules reload failed: {result}", extra={"user_id": user.id})
        
        return result
    
    except Exception as e:
        logger.error(f"Error reloading rules: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reload rules"
        )


@router.get("/current")
def get_current_rules(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Get currently active rules and version information
    """
    try:
        rules = rule_manager.get_rules()
        version = rule_manager.get_rule_version()
        
        return {
            "status": "success",
            "version": version,
            "rules": rules
        }
    
    except Exception as e:
        logger.error(f"Error getting current rules: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get current rules"
        )


@router.get("/stats")
def get_rule_stats(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Get statistics about current rules
    
    Returns:
    - version: Current rule version
    - total_rules: Number of rules loaded
    - rules_by_type: Count of rules by type (hard, velocity, behavioral, etc.)
    - hard_gates: Number of hard rule gates
    - scoring_config: Scoring configuration
    - last_updated: Timestamp of last update
    """
    try:
        stats = rule_manager.get_rule_stats()
        
        log_event(
            action="rule_stats_viewed",
            user_id=user.id,
            target="/rules/stats"
        )
        
        return {
            "status": "success",
            "stats": stats
        }
    
    except Exception as e:
        logger.error(f"Error getting rule stats: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get rule statistics"
        )


@router.get("/history")
def get_rule_history(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Get rule version history with timestamps
    
    Enables tracking of all rule changes and versions
    """
    try:
        history = rule_manager.get_rule_history()
        
        log_event(
            action="rule_history_viewed",
            user_id=user.id,
            target="/rules/history"
        )
        
        return {
            "status": "success",
            "history": history
        }
    
    except Exception as e:
        logger.error(f"Error getting rule history: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get rule history"
        )


@router.post("/rollback/{version}")
def rollback_to_version(
    version: str,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Rollback to a previous rule version
    
    Path Parameters:
    - version: Version string (e.g., "1.0.5")
    
    Useful for quickly reverting rule changes if they cause issues
    """
    try:
        log_event(
            action="rules_rollback_requested",
            user_id=user.id,
            target=f"/rules/rollback/{version}",
            details={"target_version": version}
        )
        
        result = rule_manager.rollback_rules(version)
        
        if result["status"] == "success":
            logger.warning(f"Rules rolled back to version {version}", extra={
                "user_id": user.id,
                "version": version,
                "from_version": result.get("from_version")
            })
        else:
            logger.error(f"Rollback failed: {result}", extra={"user_id": user.id})
        
        return result
    
    except Exception as e:
        logger.error(f"Error rolling back rules: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rollback rules"
        )


@router.get("/validate")
def validate_rules(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Validate currently loaded rules
    
    Performs all validation checks without reloading
    Useful for pre-deployment validation
    """
    try:
        rules = rule_manager.get_rules()
        validation = rule_manager._validate_rules(rules)
        
        log_event(
            action="rules_validated",
            user_id=user.id,
            target="/rules/validate",
            details={"valid": validation["valid"]}
        )
        
        return {
            "status": "success",
            "valid": validation["valid"],
            "errors": validation["errors"],
            "current_version": rule_manager.get_rule_version()
        }
    
    except Exception as e:
        logger.error(f"Error validating rules: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate rules"
        )
