"""
Analyst Module Pydantic Schemas — SentinelIQ

Request/response models for the analyst investigation workflow:
- Investigation CRUD
- Analyst notes
- Recommendations
- Alert feed
- User inspection (risk + timeline)
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


# ═══════════════════════════════════════════════════════════════
# Investigation Schemas
# ═══════════════════════════════════════════════════════════════

class InvestigationCreate(BaseModel):
    """Create a new investigation case."""
    user_id: str = Field(..., description="Subject user under investigation")
    severity: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    reason: str = Field(..., min_length=10, max_length=2000, description="Reason for opening investigation")


class InvestigationUpdate(BaseModel):
    """Update investigation status/severity."""
    status: Optional[str] = Field(None, pattern="^(open|monitoring|escalated|closed)$")
    severity: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    summary: Optional[str] = Field(None, max_length=5000, description="Closing summary (required when closing)")


class InvestigationOut(BaseModel):
    """Investigation response."""
    id: str
    user_id: str
    opened_by: str
    status: str
    severity: str
    reason: str
    summary: Optional[str] = None
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    escalated_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    notes_count: int = 0
    recommendations_count: int = 0

    class Config:
        from_attributes = True


class InvestigationDetail(BaseModel):
    """Full investigation detail with related data."""
    investigation: InvestigationOut
    subject: Dict[str, Any]
    analyst: Dict[str, Any]
    notes: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    risk_context: Dict[str, Any]


class InvestigationListResponse(BaseModel):
    """Paginated investigations list."""
    investigations: List[InvestigationOut]
    total: int
    page: int
    page_size: int


# ═══════════════════════════════════════════════════════════════
# Investigation Notes
# ═══════════════════════════════════════════════════════════════

class NoteCreate(BaseModel):
    """Create an investigation note."""
    note: str = Field(..., min_length=5, max_length=5000)
    note_type: str = Field(default="observation", pattern="^(observation|evidence|conclusion|escalation)$")


class NoteOut(BaseModel):
    """Note response."""
    id: str
    investigation_id: str
    analyst_id: str
    analyst_name: Optional[str] = None
    note: str
    note_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
# Recommendations
# ═══════════════════════════════════════════════════════════════

class RecommendationCreate(BaseModel):
    """Create a recommendation."""
    action: str = Field(..., pattern="^(monitor|restrict|lock|step_up_auth|freeze_loan|escalate)$")
    justification: str = Field(..., min_length=10, max_length=2000)


class RecommendationOut(BaseModel):
    """Recommendation response."""
    id: str
    investigation_id: str
    recommended_by: str
    analyst_name: Optional[str] = None
    action: str
    justification: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
# Alert Feed
# ═══════════════════════════════════════════════════════════════

class AnalystAlert(BaseModel):
    """Analyst alert feed item."""
    id: str
    alert_type: str
    severity: str
    title: str
    message: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    risk_score: Optional[int] = None
    metadata: Dict[str, Any] = {}
    timestamp: str


class AlertFeedResponse(BaseModel):
    """Alert feed response."""
    alerts: List[AnalystAlert]
    total: int
    categories: Dict[str, int]


# ═══════════════════════════════════════════════════════════════
# User Inspection
# ═══════════════════════════════════════════════════════════════

class UserInspection(BaseModel):
    """Detailed user inspection for analyst review."""
    user: Dict[str, Any]
    risk: Dict[str, Any]
    activity_timeline: List[Dict[str, Any]]
    login_history: List[Dict[str, Any]]
    devices: List[Dict[str, Any]]
    loans: List[Dict[str, Any]]
    sessions: List[Dict[str, Any]]
    investigations: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]


class TimelineEvent(BaseModel):
    """Single timeline event."""
    id: str
    event_type: str
    action: str
    detail: Optional[str] = None
    severity: str = "info"
    metadata: Dict[str, Any] = {}
    timestamp: datetime


class UserTimelineResponse(BaseModel):
    """User activity timeline."""
    user_id: str
    events: List[TimelineEvent]
    total: int


# ═══════════════════════════════════════════════════════════════
# Risk Insights (Dashboard)
# ═══════════════════════════════════════════════════════════════

class RiskInsights(BaseModel):
    """Risk distribution and insights for analyst dashboard."""
    risk_distribution: Dict[str, int]
    severity_breakdown: Dict[str, int]
    top_risk_orgs: List[Dict[str, Any]]
    recent_patterns: List[Dict[str, Any]]
    open_investigations: int
    pending_recommendations: int
    avg_risk_score: float
    high_risk_users_count: int


# ═══════════════════════════════════════════════════════════════
# Search
# ═══════════════════════════════════════════════════════════════

class AnalystSearchResult(BaseModel):
    """Search result item."""
    result_type: str  # user, investigation, organization
    id: str
    title: str
    subtitle: Optional[str] = None
    risk_score: Optional[int] = None
    status: Optional[str] = None
    metadata: Dict[str, Any] = {}
