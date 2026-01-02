# This file is deprecated. All models have been moved to __init__.py
# Keeping this file for backwards compatibility during migration.
# Please import Webhook and WebhookDelivery from app.models instead.

from app.models import Webhook, WebhookDelivery

__all__ = ["Webhook", "WebhookDelivery"]

