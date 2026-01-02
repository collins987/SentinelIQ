"""
GraphQL API Route - GraphQL endpoint for flexible querying
Provides flexible, client-controlled queries for risks, events, users, and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_role
from app.models import User
from app.core.logging import logger, log_event
import strawberry
from strawberry.fastapi import GraphQLRouter
from app.graphql_schema import create_schema
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Create schema
schema = create_schema()

# Custom context function to inject db and user
def get_context(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin"]))
):
    return {
        "db": db,
        "user": user
    }

# Create GraphQL router
graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context
)

router = APIRouter(tags=["graphql"])

# Register the GraphQL app
router.include_router(graphql_app, prefix="/graphql")


# ===== ADDITIONAL ENDPOINTS =====

class GraphQLQuery(BaseModel):
    """GraphQL query request body"""
    query: str
    variables: Optional[Dict[str, Any]] = None


@router.get("/graphql/schema")
def get_schema_docs(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Get GraphQL schema documentation
    
    Useful for understanding available types and queries
    """
    try:
        log_event(
            action="graphql_schema_viewed",
            user_id=user.id,
            target="/graphql/schema"
        )
        
        # Return schema in JSON format (simplified)
        return {
            "endpoint": "/graphql",
            "method": "POST",
            "description": "GraphQL API for flexible querying of risk events, users, and analytics",
            "example_queries": {
                "recent_events": """
                    query {
                        recentRiskEvents(limit: 10) {
                            eventId
                            userId
                            riskScore
                            riskLevel
                            timestamp
                        }
                    }
                """,
                "user_profile": """
                    query {
                        userProfile(userId: "user123") {
                            userId
                            email
                            totalEvents
                            averageRiskScore
                            lastEvent
                        }
                    }
                """,
                "analytics": """
                    query {
                        analyticsSummary(days: 30) {
                            totalEvents
                            criticalEvents
                            highEvents
                            averageRiskScore
                            blockRate
                        }
                    }
                """,
                "user_events": """
                    query {
                        userEvents(userId: "user123", limit: 20, days: 30) {
                            eventId
                            riskLevel
                            recommendedAction
                            timestamp
                            triggeredRules {
                                name
                                triggered
                            }
                        }
                    }
                """,
                "high_risk_users": """
                    query {
                        highRiskUsers(limit: 10, days: 30) {
                            userId
                            email
                            totalEvents
                            averageRiskScore
                        }
                    }
                """,
                "rule_performance": """
                    query {
                        rulePerformance(days: 30) {
                            name
                            totalTriggers
                            triggerRate
                            precision
                            recall
                            f1Score
                        }
                    }
                """,
                "cohorts": """
                    query {
                        userCohorts(days: 30) {
                            cohortType
                            userCount
                            percentage
                        }
                    }
                """
            },
            "features": [
                "Query recent risk events with flexible filtering",
                "Get detailed user risk profiles",
                "Access analytics and metrics",
                "Analyze rule performance",
                "Compare user cohorts",
                "Drill down into events and rules",
                "All queries require admin role"
            ]
        }
    
    except Exception as e:
        logger.error(f"Error getting schema docs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get schema documentation"
        )


@router.post("/graphql/introspection")
def get_introspection(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Get GraphQL introspection data
    
    Contains complete schema information for clients to use
    """
    try:
        from strawberry.utils.printing import print_schema
        
        log_event(
            action="graphql_introspection_requested",
            user_id=user.id,
            target="/graphql/introspection"
        )
        
        schema_str = print_schema(schema)
        
        return {
            "status": "success",
            "schema": schema_str
        }
    
    except Exception as e:
        logger.error(f"Error getting introspection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get introspection data"
        )
