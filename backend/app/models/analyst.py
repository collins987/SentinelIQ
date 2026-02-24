"""
Analyst Module Database Models — SentinelIQ Investigation Layer

Models:
- Investigation: Risk investigation cases opened by analysts
- InvestigationNote: Analyst notes attached to investigations (immutable after closure)
- Recommendation: Recommended enforcement actions (pending → approved/rejected)

Indexes optimized for analyst workflows: user lookup, status filtering, timeline queries.
"""

from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Index, Boolean
)
from sqlalchemy.orm import relationship

from app.models.base import Base, generate_uuid


class Investigation(Base):
    """
    Risk investigation case opened by an analyst.

    Lifecycle: open → monitoring → escalated → closed
    Severity: low | medium | high | critical
    """
    __tablename__ = "investigations"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    opened_by = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="open")  # open, monitoring, escalated, closed
    severity = Column(String, default="medium")  # low, medium, high, critical
    reason = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)  # Closing summary
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(String, ForeignKey("users.id"), nullable=True)
    escalated_to = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subject = relationship("User", foreign_keys=[user_id], backref="investigations_as_subject")
    analyst = relationship("User", foreign_keys=[opened_by], backref="investigations_opened")
    notes = relationship("InvestigationNote", back_populates="investigation", order_by="InvestigationNote.created_at.desc()")
    recommendations = relationship("Recommendation", back_populates="investigation", order_by="Recommendation.created_at.desc()")

    __table_args__ = (
        Index("idx_investigations_user", "user_id"),
        Index("idx_investigations_status", "status"),
        Index("idx_investigations_opened_by", "opened_by"),
        Index("idx_investigations_severity", "severity"),
        Index("idx_investigations_created", "created_at"),
    )


class InvestigationNote(Base):
    """
    Analyst note attached to an investigation.
    Notes are immutable after the investigation is closed.
    """
    __tablename__ = "investigation_notes"

    id = Column(String, primary_key=True, default=generate_uuid)
    investigation_id = Column(String, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    analyst_id = Column(String, ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=False)
    note_type = Column(String, default="observation")  # observation, evidence, conclusion, escalation
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    investigation = relationship("Investigation", back_populates="notes")
    author = relationship("User", foreign_keys=[analyst_id])

    __table_args__ = (
        Index("idx_notes_investigation", "investigation_id"),
        Index("idx_notes_analyst", "analyst_id"),
    )


class Recommendation(Base):
    """
    Analyst recommendation for enforcement action.
    Analysts recommend; Admins approve/reject.

    Actions: monitor, restrict, lock, step_up_auth, freeze_loan, escalate
    Status: pending → approved | rejected
    """
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=generate_uuid)
    investigation_id = Column(String, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    recommended_by = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # monitor, restrict, lock, step_up_auth, freeze_loan, escalate
    justification = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected
    reviewed_by = Column(String, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    investigation = relationship("Investigation", back_populates="recommendations")
    analyst = relationship("User", foreign_keys=[recommended_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        Index("idx_recommendations_investigation", "investigation_id"),
        Index("idx_recommendations_status", "status"),
        Index("idx_recommendations_action", "action"),
    )
