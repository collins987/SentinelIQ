"""
Debezium/CDC Event Handler Service
Consumes Debezium events (e.g., from Kafka topic 'sentineliq.event_outbox'),
publishes to Kafka/Redis, with RBAC, Prometheus metrics, and audit logging.
"""

import asyncio
import logging
from prometheus_client import Counter
from app.services.kafka_service import KafkaTopics, publish_event
from app.services.redis_stream import get_redis_stream_manager
from app.dependencies import require_role

logger = logging.getLogger("sentineliq.cdc")

# Prometheus metrics
cdc_events_processed = Counter('cdc_events_processed_total', 'Total CDC events processed', ['target', 'status', 'role'])
cdc_errors = Counter('cdc_events_errors_total', 'Total CDC event handler errors', ['action'])

# RBAC enforcement helper

def enforce_cdc_rbac(user_role, allowed_roles, action, user_id=None):
    if user_role not in allowed_roles:
        logger.warning(f"RBAC: {user_role} not allowed to perform {action}", extra={"user_id": user_id, "role": user_role, "action": action})
        raise PermissionError(f"Role {user_role} not allowed for {action}")

async def cdc_event_worker(app=None, user_id=None, role=None):
    """Background CDC event handler: consumes Debezium events and republishes."""
    # Simulate consuming from Kafka topic 'sentineliq.event_outbox'
    from app.services.kafka_service import KafkaConsumerService
    consumer = await KafkaConsumerService.create([KafkaTopics.OUTBOX_EVENTS])
    redis_manager = get_redis_stream_manager()
    try:
        async for message in consumer.consume():
            event = message.value
            try:
                enforce_cdc_rbac(role, ["admin", "analyst"], "cdc_consume", user_id)
                # Publish to Kafka (risk scored topic)
                await publish_event(KafkaTopics.RISK_SCORED, event, key=event.get('user_id'))
                # Publish to Redis stream
                redis_manager.add_event(event, stream=redis_manager.risk_stream)
                logger.info(f"CDC event processed: {event.get('event_id')}", extra={"user_id": user_id, "role": role, "action": "cdc_consume"})
                cdc_events_processed.labels('kafka_redis', 'success', role).inc()
                await consumer.commit(message)
            except Exception as e:
                logger.error(f"CDC event processing failed: {e}", extra={"user_id": user_id, "role": role, "action": "cdc_consume"})
                cdc_events_processed.labels('kafka_redis', 'failed', role).inc()
                cdc_errors.labels(action="cdc_consume").inc()
    finally:
        await consumer.close()

# To start: asyncio.create_task(cdc_event_worker(app, user_id, role))
