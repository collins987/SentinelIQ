"""
Search Service - Full-text search with filtering and indexing
Enables searching risk events, users, and audit logs with Redis-backed indexing
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from dataclasses import dataclass

from app.models import User, AuditLog
from app.models.events import RiskDecision, RuleEvaluation
from app.services.redis_stream import get_redis_stream_manager
from app.core.logging import logger

redis_manager = get_redis_stream_manager()


@dataclass
class SearchQuery:
    """Structured search query"""
    query: Optional[str] = None  # Free text search
    risk_level: Optional[List[str]] = None  # ["critical", "high"]
    user_id: Optional[str] = None
    email: Optional[str] = None
    recommended_action: Optional[List[str]] = None  # ["block", "challenge"]
    rule_name: Optional[str] = None
    days: int = 30
    limit: int = 50
    offset: int = 0


class SearchService:
    """Full-text search and filtering for events"""
    
    # ===== INDEXING =====
    
    @staticmethod
    def index_event(event_id: str, event_data: Dict[str, Any]):
        """
        Index a risk event for search
        
        Args:
            event_id: Unique event ID
            event_data: Event data to index (user_id, email, risk_level, etc.)
        """
        try:
            # Create searchable fields
            search_text = f"""
                {event_data.get('user_id', '')}
                {event_data.get('email', '')}
                {event_data.get('event_type', '')}
                {event_data.get('risk_level', '')}
                {event_data.get('recommended_action', '')}
            """.lower()
            
            # Index in Redis sorted set (by timestamp for temporal search)
            timestamp = int(datetime.utcnow().timestamp())
            
            redis_manager.redis_client.zadd(
                "events:index",
                {event_id: timestamp}
            )
            
            # Store searchable text
            redis_manager.redis_client.set(
                f"event:text:{event_id}",
                search_text,
                ex=86400*30  # 30 days
            )
            
            # Index by user for fast user-specific searches
            user_id = event_data.get('user_id')
            if user_id:
                redis_manager.redis_client.sadd(
                    f"user:events:{user_id}",
                    event_id
                )
            
            # Index by risk level for filtering
            risk_level = event_data.get('risk_level', 'unknown')
            redis_manager.redis_client.sadd(
                f"events:by_level:{risk_level}",
                event_id
            )
            
            # Index by recommended action
            action = event_data.get('recommended_action', 'unknown')
            redis_manager.redis_client.sadd(
                f"events:by_action:{action}",
                event_id
            )
            
            logger.debug(f"Indexed event: {event_id}")
        
        except Exception as e:
            logger.error(f"Error indexing event {event_id}: {str(e)}")
    
    @staticmethod
    def rebuild_index(db: Session):
        """
        Rebuild search index from database
        Should be called on service startup or after data changes
        """
        try:
            logger.info("Rebuilding search index...")
            
            # Clear old index
            redis_manager.redis_client.delete("events:index")
            redis_manager.redis_client.delete("events:by_level:*")
            redis_manager.redis_client.delete("events:by_action:*")
            redis_manager.redis_client.delete("user:events:*")
            
            # Get all events
            decisions = db.query(RiskDecision).all()
            
            for decision in decisions:
                event_data = {
                    "user_id": decision.user_id,
                    "event_id": decision.event_id,
                    "risk_level": decision.risk_level,
                    "recommended_action": decision.recommended_action,
                    "event_type": "risk_decision"
                }
                SearchService.index_event(decision.id, event_data)
            
            logger.info(f"Search index rebuilt: {len(decisions)} events indexed")
            
            return {
                "status": "success",
                "events_indexed": len(decisions)
            }
        
        except Exception as e:
            logger.error(f"Error rebuilding search index: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    # ===== SEARCH QUERIES =====
    
    @staticmethod
    def search_events(
        db: Session,
        query: SearchQuery
    ) -> Dict[str, Any]:
        """
        Search risk events with multiple filters
        
        Args:
            db: Database session
            query: SearchQuery with filters
            
        Returns:
            Paginated search results with metadata
        """
        cutoff = datetime.utcnow() - timedelta(days=query.days)
        
        # Build base query
        base_query = db.query(RiskDecision).filter(
            RiskDecision.created_at >= cutoff
        )
        
        # Apply filters
        if query.user_id:
            base_query = base_query.filter(RiskDecision.user_id == query.user_id)
        
        if query.email:
            # Join with User table to search by email
            base_query = base_query.join(User).filter(User.email == query.email)
        
        if query.risk_level:
            base_query = base_query.filter(
                RiskDecision.risk_level.in_([l.upper() for l in query.risk_level])
            )
        
        if query.recommended_action:
            base_query = base_query.filter(
                RiskDecision.recommended_action.in_(query.recommended_action)
            )
        
        if query.rule_name:
            # Find decisions with this rule triggered
            decision_ids = db.query(RuleEvaluation.risk_decision_id).filter(
                and_(
                    RuleEvaluation.rule_name == query.rule_name,
                    RuleEvaluation.triggered == True
                )
            ).all()
            
            decision_ids = [d[0] for d in decision_ids]
            if decision_ids:
                base_query = base_query.filter(RiskDecision.id.in_(decision_ids))
            else:
                return {
                    "status": "success",
                    "total": 0,
                    "results": [],
                    "filters_applied": query.__dict__
                }
        
        # Free text search (in memory for now, but could use PostgreSQL full-text search)
        if query.query:
            query_lower = query.query.lower()
            all_results = base_query.all()
            
            # Filter by text match
            filtered_results = []
            for decision in all_results:
                searchable_text = f"""
                    {decision.user_id}
                    {decision.event_id}
                    {decision.risk_level}
                    {decision.recommended_action}
                """.lower()
                
                if query_lower in searchable_text:
                    filtered_results.append(decision)
            
            base_query = filtered_results
        else:
            base_query = base_query.all()
        
        # Get total count
        total = len(base_query) if isinstance(base_query, list) else base_query.count()
        
        # Apply pagination
        if isinstance(base_query, list):
            results = base_query[query.offset:query.offset + query.limit]
        else:
            results = base_query.offset(query.offset).limit(query.limit).all()
        
        # Format results
        formatted_results = []
        for decision in results:
            # Get triggered rules
            rules = db.query(RuleEvaluation).filter(
                and_(
                    RuleEvaluation.risk_decision_id == decision.id,
                    RuleEvaluation.triggered == True
                )
            ).all()
            
            formatted_results.append({
                "event_id": decision.event_id,
                "user_id": decision.user_id,
                "risk_score": float(decision.risk_score),
                "risk_level": decision.risk_level,
                "recommended_action": decision.recommended_action,
                "timestamp": decision.created_at.isoformat(),
                "triggered_rules": [r.rule_name for r in rules]
            })
        
        return {
            "status": "success",
            "total": total,
            "page": query.offset // query.limit,
            "limit": query.limit,
            "results": formatted_results,
            "filters_applied": {
                "user_id": query.user_id,
                "email": query.email,
                "risk_level": query.risk_level,
                "recommended_action": query.recommended_action,
                "rule_name": query.rule_name,
                "days": query.days
            }
        }
    
    # ===== FACETED SEARCH =====
    
    @staticmethod
    def get_search_facets(
        db: Session,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get available search facets (for UI dropdown population)
        
        Returns:
            Lists of available risk levels, actions, rules, users
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        # Get unique risk levels
        risk_levels = db.query(
            RiskDecision.risk_level,
            func.count(RiskDecision.id).label("count")
        ).filter(
            RiskDecision.created_at >= cutoff
        ).group_by(RiskDecision.risk_level).order_by(
            desc(func.count(RiskDecision.id))
        ).all()
        
        # Get unique actions
        actions = db.query(
            RiskDecision.recommended_action,
            func.count(RiskDecision.id).label("count")
        ).filter(
            RiskDecision.created_at >= cutoff
        ).group_by(RiskDecision.recommended_action).order_by(
            desc(func.count(RiskDecision.id))
        ).all()
        
        # Get frequently triggered rules
        rules = db.query(
            RuleEvaluation.rule_name,
            func.count(RuleEvaluation.id).label("count")
        ).filter(
            and_(
                RuleEvaluation.triggered == True,
                RuleEvaluation.created_at >= cutoff
            )
        ).group_by(RuleEvaluation.rule_name).order_by(
            desc(func.count(RuleEvaluation.id))
        ).limit(20).all()
        
        # Get frequently searched users
        users = db.query(
            RiskDecision.user_id,
            func.count(RiskDecision.id).label("count")
        ).filter(
            RiskDecision.created_at >= cutoff
        ).group_by(RiskDecision.user_id).order_by(
            desc(func.count(RiskDecision.id))
        ).limit(10).all()
        
        return {
            "risk_levels": [
                {"value": level, "count": count}
                for level, count in risk_levels
            ],
            "recommended_actions": [
                {"value": action, "count": count}
                for action, count in actions
            ],
            "top_rules": [
                {"name": rule, "count": count}
                for rule, count in rules
            ],
            "top_users": [
                {"user_id": user_id, "count": count}
                for user_id, count in users
            ]
        }
    
    # ===== ADVANCED FILTERS =====
    
    @staticmethod
    def search_by_user_email(
        db: Session,
        email: str,
        days: int = 30,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Quick search by user email"""
        query = SearchQuery(email=email, days=days, limit=limit)
        return SearchService.search_events(db, query)
    
    @staticmethod
    def search_by_risk_level(
        db: Session,
        risk_levels: List[str],
        days: int = 30,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Search by one or more risk levels"""
        query = SearchQuery(risk_level=risk_levels, days=days, limit=limit)
        return SearchService.search_events(db, query)
    
    @staticmethod
    def search_by_rule(
        db: Session,
        rule_name: str,
        days: int = 30,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Search all events triggered by a specific rule"""
        query = SearchQuery(rule_name=rule_name, days=days, limit=limit)
        return SearchService.search_events(db, query)
    
    @staticmethod
    def advanced_search(
        db: Session,
        text: Optional[str] = None,
        risk_levels: Optional[List[str]] = None,
        actions: Optional[List[str]] = None,
        user_id: Optional[str] = None,
        days: int = 30,
        page: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Advanced search with all available filters
        """
        query = SearchQuery(
            query=text,
            risk_level=risk_levels,
            recommended_action=actions,
            user_id=user_id,
            days=days,
            limit=limit,
            offset=page * limit
        )
        return SearchService.search_events(db, query)
    
    # ===== SUGGESTIONS & AUTOCOMPLETE =====
    
    @staticmethod
    def get_user_suggestions(
        db: Session,
        partial_email: str,
        limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Get user email suggestions for autocomplete
        """
        users = db.query(User).filter(
            User.email.ilike(f"{partial_email}%")
        ).limit(limit).all()
        
        return [
            {"user_id": user.id, "email": user.email}
            for user in users
        ]
    
    @staticmethod
    def get_rule_suggestions(
        db: Session,
        partial_name: str,
        limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Get rule name suggestions
        """
        rules = db.query(
            RuleEvaluation.rule_name
        ).filter(
            RuleEvaluation.rule_name.ilike(f"{partial_name}%")
        ).distinct().limit(limit).all()
        
        return [
            {"rule_name": rule[0]}
            for rule in rules
        ]


# Singleton instance
_search_service = None


def get_search_service() -> SearchService:
    """Get or create singleton instance"""
    global _search_service
    if _search_service is None:
        _search_service = SearchService()
    return _search_service
