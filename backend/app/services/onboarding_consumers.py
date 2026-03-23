"""
Kafka Consumer Workers — Event-Driven Onboarding Pipeline

Consumers:
1. Email Worker        — notifications.email → SMTP (MailHog)
2. Risk Engine Init    — users.created → initialize risk score
3. Analytics Pipeline  — analytics.events → forward analytics
4. Audit Logger        — users.created → immutable audit log

DLQ:
- Failed events after 3 retries → <topic>.dlq

All consumers run as background asyncio tasks started from main.py lifespan.
"""

import json
import uuid
import logging
import asyncio
from datetime import datetime
from typing import Optional

from app.core.logging import log_event
from app.services.template_service import render_template

logger = logging.getLogger("sentineliq.onboarding_consumers")

# ─── Topic names ─────────────────────────────────────────────────────────────

TOPIC_USERS_CREATED = "users.created"
TOPIC_NOTIFICATIONS_EMAIL = "notifications.email"
TOPIC_ANALYTICS_EVENTS = "analytics.events"
TOPIC_SECURITY_ALERT = "security.alert"

DLQ_SUFFIX = ".dlq"

# Prometheus metrics
try:
    from prometheus_client import Counter
    onboarding_events_processed = Counter(
        "sentineliq_onboarding_events_processed_total",
        "Total onboarding pipeline events processed",
        ["consumer", "status"],
    )
    onboarding_dlq_total = Counter(
        "sentineliq_onboarding_dlq_total",
        "Total onboarding events sent to DLQ",
        ["consumer", "topic"],
    )
except Exception:
    onboarding_events_processed = None
    onboarding_dlq_total = None


def _inc(counter, **labels):
    if counter:
        try:
            counter.labels(**labels).inc()
        except Exception:
            pass


# ─── Email Worker Consumer ───────────────────────────────────────────────────

async def email_worker_consumer():
    """
    Consume from notifications.email topic.
    Renders templates and sends via SMTP (MailHog in dev).

    Event payload:
    {
        "to": "user@example.com",
        "subject": "...",
        "template": "email_verification.html",
        "context": { "user_name": "...", "verification_url": "..." },
        ...
    }
    """
    from app.services.kafka_service import KafkaConsumerService, KafkaConfig
    from app.services.email_service import send_email
    from app.core.metrics import MetricsTracker

    config = KafkaConfig()
    config.group_id = "onboarding-email-worker"

    try:
        from aiokafka import AIOKafkaConsumer as _AC
        consumer = _AC(
            TOPIC_NOTIFICATIONS_EMAIL,
            bootstrap_servers=config.bootstrap_servers,
            group_id=config.group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        )
        await consumer.start()
        logger.info("Email worker consumer started")
    except Exception as e:
        logger.warning(f"Email worker consumer failed to start: {e}")
        return

    try:
        async for message in consumer:
            event = message.value
            retries = 0
            success = False

            while retries < 3 and not success:
                try:
                    to = event.get("to")
                    subject = event.get("subject", "SentinelIQ Notification")
                    template = event.get("template", "")
                    context = event.get("context", {})

                    if template and template.endswith(".html"):
                        html = render_template(template, context)
                    else:
                        html = context.get("html_content", "<p>Notification from SentinelIQ</p>")

                    send_email(to, subject, html)
                    MetricsTracker.track_email_sent(template.replace(".html", ""))
                    _inc(onboarding_events_processed, consumer="email_worker", status="success")
                    log_event(
                        action="email.sent",
                        user_id=event.get("user_id", "system"),
                        target=to,
                        details={"template": template, "subject": subject},
                    )
                    success = True
                    await consumer.commit()
                except Exception as e:
                    retries += 1
                    logger.error(f"Email worker retry {retries}/3: {e}")
                    await asyncio.sleep(1)

            if not success:
                # DLQ
                _inc(onboarding_dlq_total, consumer="email_worker", topic=TOPIC_NOTIFICATIONS_EMAIL)
                _inc(onboarding_events_processed, consumer="email_worker", status="dlq")
                await _send_to_dlq(TOPIC_NOTIFICATIONS_EMAIL, event)
                await consumer.commit()
    finally:
        await consumer.stop()


# ─── Risk Engine Init Consumer ───────────────────────────────────────────────

async def risk_engine_init_consumer():
    """
    Consume from users.created topic.
    Initializes user risk score to 0 and creates baseline risk breakdown.
    """
    from app.services.kafka_service import KafkaConfig

    config = KafkaConfig()
    config.group_id = "onboarding-risk-engine"

    try:
        from aiokafka import AIOKafkaConsumer as _AC
        consumer = _AC(
            TOPIC_USERS_CREATED,
            bootstrap_servers=config.bootstrap_servers,
            group_id=config.group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        )
        await consumer.start()
        logger.info("Risk engine init consumer started")
    except Exception as e:
        logger.warning(f"Risk engine init consumer failed to start: {e}")
        return

    try:
        async for message in consumer:
            event = message.value
            retries = 0
            success = False

            while retries < 3 and not success:
                try:
                    user_id = event.get("user_id")
                    if not user_id:
                        logger.warning("Risk init: missing user_id, skipping")
                        success = True
                        break

                    # Initialize risk score in DB
                    from app.core.db import SessionLocal
                    db = SessionLocal()
                    try:
                        from app.models import User
                        user = db.query(User).filter(User.id == user_id).first()
                        if user:
                            user.risk_score = 0
                            user.risk_breakdown = {
                                "identity": 0,
                                "behavior": 0,
                                "financial": 0,
                                "compliance": 0,
                            }
                            user.trust_level = "unknown"
                            db.commit()
                            logger.info(f"Risk initialized for user {user_id}")
                    finally:
                        db.close()

                    # Publish risk decision to Redis stream
                    try:
                        from app.services.redis_stream import get_redis_stream_manager
                        mgr = get_redis_stream_manager()
                        if mgr.redis:
                            mgr.add_event({
                                "event_id": str(uuid.uuid4()),
                                "user_id": user_id,
                                "risk_score": "0",
                                "decision": "initialized",
                                "timestamp": datetime.utcnow().isoformat(),
                            }, stream="sentineliq:risk_decisions")
                    except Exception as re:
                        logger.warning(f"Redis risk publish skipped: {re}")

                    _inc(onboarding_events_processed, consumer="risk_engine", status="success")
                    log_event(
                        action="risk.initialized",
                        user_id=user_id,
                        target=user_id,
                        details={"risk_score": 0, "trust_level": "unknown"},
                    )
                    success = True
                    await consumer.commit()
                except Exception as e:
                    retries += 1
                    logger.error(f"Risk engine retry {retries}/3: {e}")
                    await asyncio.sleep(1)

            if not success:
                _inc(onboarding_dlq_total, consumer="risk_engine", topic=TOPIC_USERS_CREATED)
                _inc(onboarding_events_processed, consumer="risk_engine", status="dlq")
                await _send_to_dlq(TOPIC_USERS_CREATED, event)
                await consumer.commit()
    finally:
        await consumer.stop()


# ─── Analytics Pipeline Consumer ─────────────────────────────────────────────

async def analytics_pipeline_consumer():
    """
    Consume from analytics.events topic.
    Forwards registration analytics for dashboards.
    """
    from app.services.kafka_service import KafkaConfig

    config = KafkaConfig()
    config.group_id = "onboarding-analytics"

    try:
        from aiokafka import AIOKafkaConsumer as _AC
        consumer = _AC(
            TOPIC_ANALYTICS_EVENTS,
            bootstrap_servers=config.bootstrap_servers,
            group_id=config.group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        )
        await consumer.start()
        logger.info("Analytics pipeline consumer started")
    except Exception as e:
        logger.warning(f"Analytics pipeline consumer failed to start: {e}")
        return

    try:
        async for message in consumer:
            event = message.value
            try:
                log_event(
                    action="analytics.user_registration",
                    user_id=event.get("user_id", "unknown"),
                    target="analytics_pipeline",
                    details={
                        "org_id": event.get("org_id"),
                        "role": event.get("role"),
                        "channel": event.get("channel"),
                        "event": event.get("event"),
                    },
                )
                _inc(onboarding_events_processed, consumer="analytics", status="success")
                await consumer.commit()
            except Exception as e:
                logger.error(f"Analytics pipeline error: {e}")
                _inc(onboarding_events_processed, consumer="analytics", status="failed")
                await consumer.commit()
    finally:
        await consumer.stop()


# ─── Audit Logger Consumer ───────────────────────────────────────────────────

async def audit_logger_consumer():
    """
    Consume from users.created topic (separate consumer group).
    Writes immutable audit log entries to DB and archives to MinIO WORM storage.
    """
    from app.services.kafka_service import KafkaConfig

    config = KafkaConfig()
    config.group_id = "onboarding-audit-logger"

    # Initialize MinIO WORM storage client (graceful degradation)
    worm_client = None
    try:
        from app.services.worm_storage import WORMStorageClient, BucketType
        worm_client = WORMStorageClient()
        if worm_client.client:
            worm_client.setup_worm_bucket(BucketType.AUDIT_LOGS)
            logger.info("MinIO WORM storage connected for audit archival")
        else:
            worm_client = None
            logger.warning("MinIO WORM client not available, audit archival to object storage disabled")
    except Exception as e:
        logger.warning(f"MinIO WORM initialization skipped: {e}")
        worm_client = None

    try:
        from aiokafka import AIOKafkaConsumer as _AC
        consumer = _AC(
            TOPIC_USERS_CREATED,
            bootstrap_servers=config.bootstrap_servers,
            group_id=config.group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        )
        await consumer.start()
        logger.info("Audit logger consumer started")
    except Exception as e:
        logger.warning(f"Audit logger consumer failed to start: {e}")
        return

    try:
        async for message in consumer:
            event = message.value
            try:
                user_id = event.get("user_id", "unknown")
                audit_id = str(uuid.uuid4())
                audit_timestamp = datetime.utcnow()

                # Write audit log to DB
                from app.core.db import SessionLocal
                from app.models import AuditLog
                db = SessionLocal()
                try:
                    audit = AuditLog(
                        id=audit_id,
                        actor_id=user_id if user_id != "unknown" else None,
                        action="user.created.audit",
                        target=user_id,
                        event_metadata={
                            "event": event.get("event"),
                            "role": event.get("role"),
                            "org_id": event.get("org_id"),
                            "source": event.get("source", "kafka_consumer"),
                            "original_event_id": event.get("event_id"),
                        },
                        timestamp=audit_timestamp,
                    )
                    db.add(audit)
                    db.commit()
                finally:
                    db.close()

                # Archive to MinIO WORM storage (immutable compliance copy)
                if worm_client:
                    try:
                        audit_record = json.dumps({
                            "audit_id": audit_id,
                            "actor_id": user_id,
                            "action": "user.created.audit",
                            "target": user_id,
                            "event_metadata": {
                                "event": event.get("event"),
                                "role": event.get("role"),
                                "org_id": event.get("org_id"),
                                "source": event.get("source", "kafka_consumer"),
                                "original_event_id": event.get("event_id"),
                            },
                            "timestamp": audit_timestamp.isoformat(),
                            "archived_at": datetime.utcnow().isoformat(),
                        }, indent=2)

                        # Store as date-partitioned object for efficient retrieval
                        date_prefix = audit_timestamp.strftime("%Y/%m/%d")
                        object_name = f"{date_prefix}/{audit_id}.json"

                        version_id = worm_client.store_immutable_object(
                            bucket_type=BucketType.AUDIT_LOGS,
                            object_name=object_name,
                            data=audit_record.encode("utf-8"),
                            content_type="application/json",
                            metadata={
                                "x-amz-meta-actor-id": user_id,
                                "x-amz-meta-action": "user.created.audit",
                                "x-amz-meta-audit-id": audit_id,
                            },
                        )
                        if version_id:
                            logger.info(f"Audit archived to WORM: {object_name} (v{version_id})")
                        else:
                            logger.warning(f"Audit WORM archival returned no version_id: {object_name}")
                    except Exception as worm_err:
                        # WORM failure must NOT block audit pipeline
                        logger.error(f"WORM archival failed (non-blocking): {worm_err}")

                # Structured log (Loki-compatible)
                log_event(
                    action="audit.user_created",
                    user_id=user_id,
                    target=user_id,
                    details={
                        "role": event.get("role"),
                        "timestamp": event.get("timestamp"),
                        "source": "kafka_audit_consumer",
                        "worm_archived": worm_client is not None,
                    },
                )
                _inc(onboarding_events_processed, consumer="audit_logger", status="success")
                await consumer.commit()
            except Exception as e:
                logger.error(f"Audit logger error: {e}")
                _inc(onboarding_events_processed, consumer="audit_logger", status="failed")
                await consumer.commit()
    finally:
        await consumer.stop()


# ─── DLQ Helper ──────────────────────────────────────────────────────────────

async def _send_to_dlq(original_topic: str, event: dict):
    """Send a failed event to its Dead Letter Queue topic."""
    dlq_topic = f"{original_topic}{DLQ_SUFFIX}"
    dlq_event = {
        **event,
        "_dlq_timestamp": datetime.utcnow().isoformat(),
        "_dlq_original_topic": original_topic,
        "_dlq_reason": "max_retries_exceeded",
    }
    try:
        from app.services.kafka_service import get_kafka_producer
        import json as _json
        producer = await get_kafka_producer()
        if producer.is_connected:
            await producer._producer.send_and_wait(
                topic=dlq_topic,
                value=_json.dumps(dlq_event).encode("utf-8"),
                key=event.get("user_id", "").encode() if event.get("user_id") else None,
            )
            logger.warning(f"Event sent to DLQ: {dlq_topic}", extra={"event_id": event.get("event_id")})
        else:
            logger.error(f"Cannot send to DLQ — Kafka not connected")
    except Exception as e:
        logger.error(f"DLQ publish failed for {dlq_topic}: {e}")


# ─── Start All Consumers ─────────────────────────────────────────────────────

async def start_onboarding_consumers():
    """
    Start all onboarding pipeline consumers as background tasks.
    Call this from app lifespan (main.py).
    """
    tasks = []
    consumers = [
        ("email_worker", email_worker_consumer),
        ("risk_engine", risk_engine_init_consumer),
        ("analytics", analytics_pipeline_consumer),
        ("audit_logger", audit_logger_consumer),
    ]
    for name, coro in consumers:
        try:
            task = asyncio.create_task(coro())
            tasks.append(task)
            logger.info(f"Onboarding consumer started: {name}")
        except Exception as e:
            logger.warning(f"Consumer {name} failed to start: {e}")
    return tasks
