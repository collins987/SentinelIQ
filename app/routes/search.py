"""
Search Routes - Full-text search with filtering and indexing
Endpoints for searching risk events, users, and audit logs
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_role
from app.services.search_service import get_search_service, SearchQuery
from app.core.logging import logger, log_event
from app.models import User
from typing import List, Optional

router = APIRouter(prefix="/search", tags=["search"])
search_service = get_search_service()


@router.get("/events")
def search_events(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Free text search"),
    risk_level: Optional[List[str]] = Query(None, description="Filter by risk levels"),
    action: Optional[List[str]] = Query(None, description="Filter by recommended actions"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    days: int = Query(30, ge=1, le=365, description="Look back N days"),
    page: int = Query(0, ge=0, description="Page number (0-indexed)"),
    limit: int = Query(50, ge=1, le=500, description="Results per page")
):
    """
    Search risk events with multiple filters
    
    Supports:
    - Free text search (user_id, email, event_type, risk_level)
    - Filter by risk level (critical, high, medium, low)
    - Filter by recommended action (block, challenge, allow)
    - Filter by user ID
    - Pagination
    - Time range (days parameter)
    
    Example:
    GET /search/events?q=user123&risk_level=critical&risk_level=high&limit=20&page=0
    """
    try:
        log_event(
            action="events_searched",
            user_id=user.id,
            target="/search/events",
            details={
                "query": q,
                "risk_levels": risk_level,
                "actions": action,
                "user_id": user_id
            }
        )
        
        query = SearchQuery(
            query=q,
            risk_level=risk_level,
            recommended_action=action,
            user_id=user_id,
            days=days,
            limit=limit,
            offset=page * limit
        )
        
        return search_service.search_events(db, query)
    
    except Exception as e:
        logger.error(f"Error searching events: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search events"
        )


@router.get("/events/by-user/{user_id}")
def search_by_user(
    user_id: str,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500)
):
    """
    Quick search for all risk events for a specific user
    """
    try:
        return search_service.search_by_user_email(
            db,
            email=None,  # We'll use user_id param directly
            days=days,
            limit=limit
        )
    
    except Exception as e:
        logger.error(f"Error searching user events: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search user events"
        )


@router.get("/events/by-risk-level/{risk_level}")
def search_by_risk_level(
    risk_level: str,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500)
):
    """
    Search all events at a specific risk level
    
    Risk levels: critical, high, medium, low
    """
    try:
        valid_levels = ["critical", "high", "medium", "low"]
        if risk_level.lower() not in valid_levels:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid risk level. Must be one of: {valid_levels}"
            )
        
        return search_service.search_by_risk_level(
            db,
            risk_levels=[risk_level.upper()],
            days=days,
            limit=limit
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching by risk level: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search by risk level"
        )


@router.get("/events/by-rule/{rule_name}")
def search_by_rule(
    rule_name: str,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500)
):
    """
    Search all events triggered by a specific rule
    
    Useful for understanding rule impact and effectiveness
    """
    try:
        return search_service.search_by_rule(db, rule_name=rule_name, days=days, limit=limit)
    
    except Exception as e:
        logger.error(f"Error searching by rule: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search by rule"
        )


@router.get("/facets")
def get_search_facets(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365)
):
    """
    Get available search facets for UI dropdown population
    
    Returns:
    - risk_levels: Available risk levels and event counts
    - recommended_actions: Available actions and counts
    - top_rules: Most frequently triggered rules
    - top_users: Users with most events
    
    Useful for building search interfaces with suggestions
    """
    try:
        log_event(
            action="search_facets_viewed",
            user_id=user.id,
            target="/search/facets"
        )
        
        return {
            "status": "success",
            "facets": search_service.get_search_facets(db, days=days)
        }
    
    except Exception as e:
        logger.error(f"Error getting search facets: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get search facets"
        )


@router.get("/suggest/users")
def suggest_users(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    q: str = Query(..., min_length=1, max_length=100, description="Partial email to search"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get user email suggestions for autocomplete
    """
    try:
        suggestions = search_service.get_user_suggestions(db, partial_email=q, limit=limit)
        
        return {
            "status": "success",
            "suggestions": suggestions
        }
    
    except Exception as e:
        logger.error(f"Error getting user suggestions: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user suggestions"
        )


@router.get("/suggest/rules")
def suggest_rules(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
    q: str = Query(..., min_length=1, max_length=100, description="Partial rule name"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get rule name suggestions for autocomplete
    """
    try:
        suggestions = search_service.get_rule_suggestions(db, partial_name=q, limit=limit)
        
        return {
            "status": "success",
            "suggestions": suggestions
        }
    
    except Exception as e:
        logger.error(f"Error getting rule suggestions: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get rule suggestions"
        )


@router.post("/index/rebuild")
def rebuild_search_index(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Rebuild the search index from database
    
    Should be called:
    - On service startup
    - After bulk data imports
    - If search results seem stale
    
    Note: This is I/O intensive. Use sparingly in production.
    """
    try:
        log_event(
            action="search_index_rebuild_requested",
            user_id=user.id,
            target="/search/index/rebuild"
        )
        
        result = search_service.rebuild_index(db)
        
        if result["status"] == "success":
            logger.warning(f"Search index rebuilt: {result['events_indexed']} events", extra={
                "user_id": user.id,
                "events_indexed": result["events_indexed"]
            })
        
        return result
    
    except Exception as e:
        logger.error(f"Error rebuilding search index: {str(e)}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rebuild search index"
        )
