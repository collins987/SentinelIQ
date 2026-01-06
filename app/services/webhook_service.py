"""
Webhook Delivery Service - Handles webhook event delivery with retry logic and signature verification.
"""

import logging
import json
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor

import requests
from sqlalchemy.orm import Session

from app.models.webhooks import Webhook, WebhookDelivery
from app.schemas.event import RiskScore
from app.core.db import SessionLocal

logger = logging.getLogger("sentineliq.webhook_service")


class WebhookService:
    """Service for managing webhook deliveries."""
    
    def __init__(self, max_workers: int = 5):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.max_retries = 3
        self.retry_delays = [60, 300, 900]  # 1 min, 5 min, 15 min
    
    def generate_signature(self, payload: str, secret: str) -> str:
        """Generate HMAC-SHA256 signature for webhook payload."""
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def should_deliver(self, webhook: Webhook, risk_score: RiskScore) -> bool:
        """
        Determine if webhook should be triggered based on filters.
        
        Args:
            webhook: Webhook configuration
            risk_score: Risk assessment result
        
        Returns:
            True if webhook should be delivered
        """
        # Check if webhook is active
        if not webhook.is_active:
            return False
        
        # Check event type filter
        if webhook.event_types and risk_score.risk_level not in webhook.event_types:
            return False
        
        # Check minimum risk level
        if webhook.min_risk_level:
            risk_levels = {"low": 1, "medium": 2, "high": 3, "critical": 4}
            webhook_min = risk_levels.get(webhook.min_risk_level, 1)
            event_level = risk_levels.get(risk_score.risk_level, 1)
            
            if event_level < webhook_min:
                return False
        
        return True
    
    async def deliver(
        self,
        webhook: Webhook,
        risk_score: RiskScore,
        db: Session,
        attempt: int = 1
    ) -> bool:
        """
        Deliver webhook payload to endpoint.
        
        Args:
            webhook: Webhook configuration
            risk_score: Risk event to deliver
            db: Database session
            attempt: Current attempt number
        
        Returns:
            True if delivery successful
        """
        try:
            # Prepare payload
            payload = {
                "event_id": risk_score.event_id,
                "user_id": risk_score.user_id,
                "risk_score": risk_score.risk_score,
                "risk_level": risk_score.risk_level,
                "triggered_rules": risk_score.triggered_rules,
                "recommended_action": risk_score.recommended_action,
                "timestamp": datetime.utcnow().isoformat(),
                "webhook_attempt": attempt
            }
            
            payload_json = json.dumps(payload)
            signature = self.generate_signature(payload_json, webhook.secret_key)
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-Sentinel-Signature": signature,
                "X-Sentinel-Delivery-ID": f"{webhook.id}:{risk_score.event_id}:{attempt}",
                "X-Sentinel-Timestamp": datetime.utcnow().isoformat()
            }
            
            # Send request
            start_time = time.time()
            response = requests.post(
                webhook.url,
                data=payload_json,
                headers=headers,
                timeout=webhook.timeout_seconds
            )
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Log delivery
            is_successful = response.status_code < 300  # 2xx success
            
            delivery_record = WebhookDelivery(
                webhook_id=webhook.id,
                event_id=risk_score.event_id,
                event_type=risk_score.risk_level,
                attempt_number=attempt,
                status_code=response.status_code,
                request_body=payload,
                response_body=response.text[:1000] if response.text else None,
                response_time_ms=response_time_ms,
                is_successful=is_successful,
                is_final_attempt=(attempt >= webhook.max_retries)
            )
            
            db.add(delivery_record)
            
            # Update webhook stats
            webhook.total_deliveries += 1
            if is_successful:
                webhook.successful_deliveries += 1
                webhook.last_triggered_at = datetime.utcnow()
            else:
                webhook.failed_deliveries += 1
                
                # Schedule retry if not final attempt
                if attempt < webhook.max_retries:
                    retry_delay = self.retry_delays[attempt - 1]
                    delivery_record.next_retry_at = datetime.utcnow() + timedelta(seconds=retry_delay)
            
            db.commit()
            
            if is_successful:
                logger.info(
                    f"Webhook delivered successfully",
                    extra={
                        "webhook_id": webhook.id,
                        "event_id": risk_score.event_id,
                        "attempt": attempt,
                        "status": response.status_code,
                        "time_ms": response_time_ms
                    }
                )
            else:
                logger.warning(
                    f"Webhook delivery failed with status {response.status_code}",
                    extra={
                        "webhook_id": webhook.id,
                        "event_id": risk_score.event_id,
                        "attempt": attempt,
                        "status": response.status_code,
                        "response": response.text[:200]
                    }
                )
            
            return is_successful
            
        except requests.Timeout:
            logger.error(
                f"Webhook delivery timeout",
                extra={
                    "webhook_id": webhook.id,
                    "event_id": risk_score.event_id,
                    "attempt": attempt,
                    "timeout": webhook.timeout_seconds
                }
            )
            self._record_failed_delivery(webhook, risk_score, db, attempt, "Timeout")
            return False
            
        except Exception as e:
            logger.error(
                f"Webhook delivery error: {str(e)}",
                extra={
                    "webhook_id": webhook.id,
                    "event_id": risk_score.event_id,
                    "attempt": attempt,
                    "error": str(e)
                }
            )
            self._record_failed_delivery(webhook, risk_score, db, attempt, str(e))
            return False
    
    def _record_failed_delivery(
        self,
        webhook: Webhook,
        risk_score: RiskScore,
        db: Session,
        attempt: int,
        error: str
    ):
        """Record a failed delivery attempt."""
        delivery_record = WebhookDelivery(
            webhook_id=webhook.id,
            event_id=risk_score.event_id,
            event_type=risk_score.risk_level,
            attempt_number=attempt,
            error_message=error,
            is_successful=False,
            is_final_attempt=(attempt >= webhook.max_retries)
        )
        
        webhook.total_deliveries += 1
        webhook.failed_deliveries += 1
        
        # Schedule retry
        if attempt < webhook.max_retries:
            retry_delay = self.retry_delays[attempt - 1]
            delivery_record.next_retry_at = datetime.utcnow() + timedelta(seconds=retry_delay)
        
        db.add(delivery_record)
        db.commit()
    
    async def process_pending_retries(self, db: Session):
        """Process webhooks pending retry."""
        try:
            pending = db.query(WebhookDelivery).filter(
                WebhookDelivery.next_retry_at <= datetime.utcnow(),
                WebhookDelivery.is_final_attempt == False
            ).all()
            
            for delivery in pending:
                webhook = delivery.webhook
                logger.info(
                    f"Retrying webhook delivery",
                    extra={
                        "webhook_id": webhook.id,
                        "delivery_id": delivery.id,
                        "attempt": delivery.attempt_number + 1
                    }
                )
                # Retry logic would go here
                
        except Exception as e:
            logger.error(f"Error processing webhook retries: {str(e)}")


# Global webhook service instance
_webhook_service = None


def get_webhook_service() -> WebhookService:
    """Get or create global webhook service instance."""
    global _webhook_service
    if _webhook_service is None:
        _webhook_service = WebhookService()
    return _webhook_service
