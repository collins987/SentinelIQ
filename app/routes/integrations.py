"""
Integration Management Routes - Configure webhooks, Slack, PagerDuty, and rate limits.

Endpoints:
- POST /integrations/webhooks - Register webhook
- GET /integrations/webhooks - List webhooks
- PUT /integrations/webhooks/{webhook_id} - Update webhook
- DELETE /integrations/webhooks/{webhook_id} - Delete webhook
- POST /integrations/webhooks/{webhook_id}/test - Test webhook
- POST /integrations/slack/configure - Configure Slack
- POST /integrations/pagerduty/configure - Configure PagerDuty
- GET /integrations/status - Get integration status
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl, EmailStr
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid

from app.dependencies import require_role, get_db
from app.models import User
from app.models.webhooks import Webhook, WebhookDelivery
from app.services.webhook_service import get_webhook_service
from app.services.alert_integrations import get_alert_manager
from app.core.logging import logger, log_event

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# Pydantic models
class WebhookCreate(BaseModel):
    """Create webhook request."""
    url: HttpUrl
    description: Optional[str] = None
    event_types: List[str] = []  # e.g., ["risk.high", "risk.critical"]
    min_risk_level: Optional[str] = None  # "low", "medium", "high", "critical"
    max_retries: int = 3
    timeout_seconds: int = 30


class WebhookUpdate(BaseModel):
    """Update webhook request."""
    url: Optional[HttpUrl] = None
    description: Optional[str] = None
    event_types: Optional[List[str]] = None
    min_risk_level: Optional[str] = None
    max_retries: Optional[int] = None
    timeout_seconds: Optional[int] = None
    is_active: Optional[bool] = None


class WebhookResponse(BaseModel):
    """Webhook response."""
    id: str
    url: str
    description: Optional[str]
    is_active: bool
    event_types: List[str]
    min_risk_level: Optional[str]
    success_rate: float
    total_deliveries: int
    last_triggered_at: Optional[str]


class SlackConfigRequest(BaseModel):
    """Configure Slack integration."""
    webhook_url: HttpUrl
    channel: Optional[str] = None


class PagerDutyConfigRequest(BaseModel):
    """Configure PagerDuty integration."""
    api_key: str
    service_id: str


@router.post("/webhooks", response_model=WebhookResponse)
def create_webhook(
    webhook_data: WebhookCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Register a new webhook endpoint.
    
    Webhooks will receive POST requests with risk event data.
    All requests are signed with HMAC-SHA256 for verification.
    
    Admin only.
    """
    try:
        webhook = Webhook(
            id=str(uuid.uuid4()),
            organization_id=current_user.organization_id,
            url=str(webhook_data.url),
            description=webhook_data.description,
            secret_key=str(uuid.uuid4()),  # Generated secret
            event_types=webhook_data.event_types,
            min_risk_level=webhook_data.min_risk_level,
            max_retries=webhook_data.max_retries,
            timeout_seconds=webhook_data.timeout_seconds
        )
        
        db.add(webhook)
        db.commit()
        db.refresh(webhook)
        
        log_event(
            action="webhook_registered",
            user_id=current_user.id,
            target=webhook.id,
            details={"url": str(webhook_data.url)}
        )
        
        logger.info(
            f"Webhook registered",
            extra={"webhook_id": webhook.id, "user_id": current_user.id}
        )
        
        return WebhookResponse(
            id=webhook.id,
            url=webhook.url,
            description=webhook.description,
            is_active=webhook.is_active,
            event_types=webhook.event_types,
            min_risk_level=webhook.min_risk_level,
            success_rate=webhook.success_rate(),
            total_deliveries=webhook.total_deliveries,
            last_triggered_at=webhook.last_triggered_at.isoformat() if webhook.last_triggered_at else None
        )
        
    except Exception as e:
        logger.error(f"Error creating webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create webhook"
        )


@router.get("/webhooks", response_model=List[WebhookResponse])
def list_webhooks(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """List all webhooks for organization. Admin only."""
    try:
        webhooks = db.query(Webhook).filter(
            Webhook.organization_id == current_user.organization_id
        ).all()
        
        return [
            WebhookResponse(
                id=w.id,
                url=w.url,
                description=w.description,
                is_active=w.is_active,
                event_types=w.event_types,
                min_risk_level=w.min_risk_level,
                success_rate=w.success_rate(),
                total_deliveries=w.total_deliveries,
                last_triggered_at=w.last_triggered_at.isoformat() if w.last_triggered_at else None
            )
            for w in webhooks
        ]
        
    except Exception as e:
        logger.error(f"Error listing webhooks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list webhooks"
        )


@router.put("/webhooks/{webhook_id}", response_model=WebhookResponse)
def update_webhook(
    webhook_id: str,
    webhook_data: WebhookUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Update webhook configuration. Admin only."""
    try:
        webhook = db.query(Webhook).filter(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id
        ).first()
        
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        if webhook_data.url:
            webhook.url = str(webhook_data.url)
        if webhook_data.description is not None:
            webhook.description = webhook_data.description
        if webhook_data.event_types is not None:
            webhook.event_types = webhook_data.event_types
        if webhook_data.min_risk_level is not None:
            webhook.min_risk_level = webhook_data.min_risk_level
        if webhook_data.max_retries is not None:
            webhook.max_retries = webhook_data.max_retries
        if webhook_data.timeout_seconds is not None:
            webhook.timeout_seconds = webhook_data.timeout_seconds
        if webhook_data.is_active is not None:
            webhook.is_active = webhook_data.is_active
        
        db.commit()
        db.refresh(webhook)
        
        log_event(
            action="webhook_updated",
            user_id=current_user.id,
            target=webhook.id
        )
        
        return WebhookResponse(
            id=webhook.id,
            url=webhook.url,
            description=webhook.description,
            is_active=webhook.is_active,
            event_types=webhook.event_types,
            min_risk_level=webhook.min_risk_level,
            success_rate=webhook.success_rate(),
            total_deliveries=webhook.total_deliveries,
            last_triggered_at=webhook.last_triggered_at.isoformat() if webhook.last_triggered_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update webhook"
        )


@router.delete("/webhooks/{webhook_id}")
def delete_webhook(
    webhook_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Delete webhook. Admin only."""
    try:
        webhook = db.query(Webhook).filter(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id
        ).first()
        
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        db.delete(webhook)
        db.commit()
        
        log_event(
            action="webhook_deleted",
            user_id=current_user.id,
            target=webhook_id
        )
        
        return {"message": "Webhook deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete webhook"
        )


@router.post("/slack/configure")
def configure_slack(
    config: SlackConfigRequest,
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Configure Slack integration.
    
    Provide a Slack incoming webhook URL to receive risk alerts.
    Admin only.
    """
    try:
        alert_manager = get_alert_manager()
        alert_manager.configure_slack(str(config.webhook_url))
        
        log_event(
            action="slack_configured",
            user_id=current_user.id,
            target="slack_integration"
        )
        
        logger.info(f"Slack integration configured by {current_user.email}")
        
        return {
            "status": "configured",
            "message": "Slack integration is now active"
        }
        
    except Exception as e:
        logger.error(f"Error configuring Slack: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to configure Slack"
        )


@router.post("/pagerduty/configure")
def configure_pagerduty(
    config: PagerDutyConfigRequest,
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Configure PagerDuty integration.
    
    Provide API key and service ID to create incidents for critical/high risks.
    Admin only.
    """
    try:
        alert_manager = get_alert_manager()
        alert_manager.configure_pagerduty(config.api_key, config.service_id)
        
        log_event(
            action="pagerduty_configured",
            user_id=current_user.id,
            target="pagerduty_integration"
        )
        
        logger.info(f"PagerDuty integration configured by {current_user.email}")
        
        return {
            "status": "configured",
            "message": "PagerDuty integration is now active"
        }
        
    except Exception as e:
        logger.error(f"Error configuring PagerDuty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to configure PagerDuty"
        )


@router.get("/status")
def get_integration_status(
    current_user: User = Depends(require_role(["admin"]))
):
    """Get status of all configured integrations. Admin only."""
    alert_manager = get_alert_manager()
    
    return {
        "slack": {
            "configured": alert_manager.slack_service is not None,
            "status": "active" if alert_manager.slack_service else "not_configured"
        },
        "pagerduty": {
            "configured": alert_manager.pagerduty_service is not None,
            "status": "active" if alert_manager.pagerduty_service else "not_configured"
        }
    }
