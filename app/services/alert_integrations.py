"""
Alert Integrations - Slack, PagerDuty, and other notification channels.
"""

import logging
import json
from typing import Optional, Dict, Any
from enum import Enum

import requests

from app.schemas.event import RiskScore

logger = logging.getLogger("sentineliq.alert_integrations")


class AlertChannel(str, Enum):
    """Supported alert channels."""
    EMAIL = "email"
    SLACK = "slack"
    PAGERDUTY = "pagerduty"
    WEBHOOK = "webhook"


class SlackAlertService:
    """Send risk alerts to Slack."""
    
    def __init__(self, webhook_url: str):
        """
        Initialize Slack alert service.
        
        Args:
            webhook_url: Slack incoming webhook URL
        """
        self.webhook_url = webhook_url
    
    def send_alert(self, risk_score: RiskScore, organization_name: str = "SentinelIQ") -> bool:
        """
        Send risk alert to Slack.
        
        Args:
            risk_score: Risk assessment to alert on
            organization_name: Organization name for context
        
        Returns:
            True if successfully sent
        """
        try:
            # Color based on risk level
            color_map = {
                "low": "#36a64f",      # Green
                "medium": "#ff9900",   # Orange
                "high": "#ff6666",     # Red
                "critical": "#cc0000"  # Dark red
            }
            
            color = color_map.get(risk_score.risk_level, "#cccccc")
            
            # Build message
            payload = {
                "attachments": [
                    {
                        "fallback": f"Risk Alert: {risk_score.risk_level.upper()} risk detected",
                        "color": color,
                        "title": f"🚨 {risk_score.risk_level.upper()} RISK ALERT",
                        "title_link": f"https://sentineliq.example.com/events/{risk_score.event_id}",
                        "fields": [
                            {
                                "title": "Organization",
                                "value": organization_name,
                                "short": True
                            },
                            {
                                "title": "Risk Score",
                                "value": f"{risk_score.risk_score:.2f}/1.0",
                                "short": True
                            },
                            {
                                "title": "Risk Level",
                                "value": risk_score.risk_level.upper(),
                                "short": True
                            },
                            {
                                "title": "Confidence",
                                "value": f"{risk_score.confidence*100:.1f}%",
                                "short": True
                            },
                            {
                                "title": "Affected User",
                                "value": risk_score.user_id,
                                "short": True
                            },
                            {
                                "title": "Recommended Action",
                                "value": risk_score.recommended_action.upper(),
                                "short": True
                            },
                            {
                                "title": "Triggered Rules",
                                "value": ", ".join(risk_score.triggered_rules) or "None",
                                "short": False
                            }
                        ],
                        "footer": "SentinelIQ Risk Engine",
                        "ts": int(__import__('time').time())
                    }
                ]
            }
            
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(
                    f"Slack alert sent successfully",
                    extra={
                        "event_id": risk_score.event_id,
                        "risk_level": risk_score.risk_level,
                        "user_id": risk_score.user_id
                    }
                )
                return True
            else:
                logger.error(
                    f"Slack alert failed with status {response.status_code}",
                    extra={
                        "event_id": risk_score.event_id,
                        "status": response.status_code,
                        "response": response.text[:200]
                    }
                )
                return False
                
        except Exception as e:
            logger.error(f"Error sending Slack alert: {str(e)}")
            return False


class PagerDutyAlertService:
    """Send risk alerts to PagerDuty as incidents."""
    
    def __init__(self, api_key: str, service_id: str):
        """
        Initialize PagerDuty alert service.
        
        Args:
            api_key: PagerDuty API key
            service_id: PagerDuty service ID
        """
        self.api_key = api_key
        self.service_id = service_id
        self.base_url = "https://api.pagerduty.com"
    
    def _get_severity(self, risk_level: str) -> str:
        """Map SentinelIQ risk levels to PagerDuty severity."""
        severity_map = {
            "low": "info",
            "medium": "warning",
            "high": "error",
            "critical": "critical"
        }
        return severity_map.get(risk_level, "warning")
    
    def send_alert(self, risk_score: RiskScore, from_email: str) -> bool:
        """
        Create PagerDuty incident for critical/high risk.
        
        Only creates incidents for high/critical risks to avoid noise.
        
        Args:
            risk_score: Risk assessment
            from_email: Email of user triggering the alert
        
        Returns:
            True if incident created
        """
        # Only create incidents for high/critical
        if risk_score.risk_level not in ["high", "critical"]:
            return False
        
        try:
            payload = {
                "incident": {
                    "type": "incident",
                    "title": f"[{risk_score.risk_level.upper()}] Risk Alert for user {risk_score.user_id}",
                    "service": {
                        "id": self.service_id,
                        "type": "service_reference"
                    },
                    "urgency": "high" if risk_score.risk_level == "critical" else "low",
                    "body": {
                        "type": "incident_body",
                        "details": json.dumps({
                            "event_id": risk_score.event_id,
                            "user_id": risk_score.user_id,
                            "risk_score": risk_score.risk_score,
                            "risk_level": risk_score.risk_level,
                            "confidence": risk_score.confidence,
                            "recommended_action": risk_score.recommended_action,
                            "triggered_rules": risk_score.triggered_rules
                        }, indent=2)
                    }
                }
            }
            
            headers = {
                "Authorization": f"Token token={self.api_key}",
                "Accept": "application/vnd.pagerduty+json;version=2",
                "Content-Type": "application/json",
                "From": from_email
            }
            
            response = requests.post(
                f"{self.base_url}/incidents",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                incident_data = response.json().get("incident", {})
                logger.info(
                    f"PagerDuty incident created successfully",
                    extra={
                        "event_id": risk_score.event_id,
                        "incident_id": incident_data.get("id"),
                        "risk_level": risk_score.risk_level
                    }
                )
                return True
            else:
                logger.error(
                    f"PagerDuty incident creation failed with status {response.status_code}",
                    extra={
                        "event_id": risk_score.event_id,
                        "status": response.status_code,
                        "response": response.text[:200]
                    }
                )
                return False
                
        except Exception as e:
            logger.error(f"Error creating PagerDuty incident: {str(e)}")
            return False


class AlertIntegrationManager:
    """Manager for all alert integrations."""
    
    def __init__(self):
        self.slack_service: Optional[SlackAlertService] = None
        self.pagerduty_service: Optional[PagerDutyAlertService] = None
    
    def configure_slack(self, webhook_url: str):
        """Configure Slack integration."""
        self.slack_service = SlackAlertService(webhook_url)
        logger.info("Slack integration configured")
    
    def configure_pagerduty(self, api_key: str, service_id: str):
        """Configure PagerDuty integration."""
        self.pagerduty_service = PagerDutyAlertService(api_key, service_id)
        logger.info("PagerDuty integration configured")
    
    async def send_alerts(
        self,
        risk_score: RiskScore,
        channels: list = None,
        organization_name: str = "SentinelIQ",
        from_email: str = "alerts@sentineliq.com"
    ) -> Dict[str, bool]:
        """
        Send alerts to configured channels.
        
        Args:
            risk_score: Risk assessment
            channels: List of channels to alert (default: all configured)
            organization_name: Organization name for context
            from_email: Email for PagerDuty API
        
        Returns:
            Dict of channel -> success status
        """
        results = {}
        
        if channels is None:
            # Alert to all configured channels
            channels = []
            if self.slack_service:
                channels.append(AlertChannel.SLACK)
            if self.pagerduty_service:
                channels.append(AlertChannel.PAGERDUTY)
        
        for channel in channels:
            if channel == AlertChannel.SLACK and self.slack_service:
                results[AlertChannel.SLACK] = self.slack_service.send_alert(
                    risk_score,
                    organization_name
                )
            elif channel == AlertChannel.PAGERDUTY and self.pagerduty_service:
                results[AlertChannel.PAGERDUTY] = self.pagerduty_service.send_alert(
                    risk_score,
                    from_email
                )
        
        return results


# Global alert manager instance
_alert_manager = None


def get_alert_manager() -> AlertIntegrationManager:
    """Get or create global alert manager instance."""
    global _alert_manager
    if _alert_manager is None:
        _alert_manager = AlertIntegrationManager()
    return _alert_manager
