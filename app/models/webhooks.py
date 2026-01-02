from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, JSON, Float
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class Webhook(Base):
    """
    Webhook configuration for external integrations.
    Stores webhook URLs, secrets, and event filtering rules.
    """
    __tablename__ = "webhooks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    url = Column(String, nullable=False)  # HTTPS endpoint
    secret_key = Column(String, nullable=False)  # For HMAC-SHA256 signing
    event_types = Column(JSON, default=[])  # ["risk.high", "risk.critical"] or empty for all
    min_risk_level = Column(String, default="low")  # Minimum risk level to trigger
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Statistics
    total_deliveries = Column(Integer, default=0)
    successful_deliveries = Column(Integer, default=0)
    last_delivered_at = Column(DateTime, nullable=True)
    last_error = Column(String, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    deliveries = relationship("WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan")
    
    def success_rate(self):
        """Calculate success rate percentage."""
        if self.total_deliveries == 0:
            return 100.0
        return (self.successful_deliveries / self.total_deliveries) * 100


class WebhookDelivery(Base):
    """
    Audit trail for webhook deliveries.
    Records each delivery attempt with status, response, and retry information.
    """
    __tablename__ = "webhook_deliveries"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    webhook_id = Column(String, ForeignKey("webhooks.id"), nullable=False)
    event_id = Column(String, nullable=False)  # Reference to risk event
    
    # Delivery attempt tracking
    attempt_number = Column(Integer, default=1)
    max_attempts = Column(Integer, default=4)
    
    # Delivery outcome
    status_code = Column(Integer, nullable=True)  # HTTP status code
    is_successful = Column(Boolean, default=False)
    response_body = Column(String, nullable=True)  # Truncated response
    response_time_ms = Column(Integer, nullable=True)  # Latency
    
    # Retry scheduling
    next_retry_at = Column(DateTime, nullable=True)  # When to retry next
    last_error_message = Column(String, nullable=True)
    
    # Timestamps
    sent_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    webhook = relationship("Webhook", back_populates="deliveries")
