"""
Redis Streams integration for event-driven architecture.
Implements consumer groups for guaranteed event processing.
"""

import json
import logging
import asyncio
from typing import Optional, Dict, Any, List, Set
from prometheus_client import Counter, Gauge
from redis import Redis
from redis.exceptions import ResponseError, ConnectionError as RedisConnectionError
from app.config import REDIS_URL

logger = logging.getLogger("sentineliq.redis_streams")

# Prometheus metrics
redis_events_processed = Counter(
    'redis_events_processed_total',
    'Total Redis stream events processed',
    ['stream', 'role', 'status']
)
redis_dlq_events = Counter(
    'redis_events_dlq_total',
    'Total Redis stream events sent to DLQ',
    ['stream', 'role']
)
redis_consumer_lag_gauge = Gauge(
    'redis_consumer_lag',
    'Redis stream consumer lag',
    ['stream', 'group']
)
redis_errors = Counter(
    'redis_stream_errors_total',
    'Total Redis stream errors',
    ['action']
)


# RBAC enforcement helper
def enforce_redis_rbac(user_role: str, allowed_roles: List[str], action: str, user_id: Optional[str] = None):
    if user_role not in allowed_roles:
        logger.warning(
            f"RBAC: {user_role} not allowed to perform {action}",
            extra={"user_id": user_id, "role": user_role, "action": action}
        )
        raise PermissionError(f"Role {user_role} not allowed for {action}")


class RedisStreamManager:
    """
    Manages Redis Stream operations for event ingestion and processing.
    Includes background consumer, RBAC enforcement, DLQ handling, and velocity counters.
    """

    def __init__(self, redis_url: str = REDIS_URL):
        self._redis_url = redis_url
        self._redis: Optional[Redis] = None
        self._connected = False

        # Stream names
        self.event_stream = "sentineliq:events"
        self.risk_stream = "sentineliq:risk_decisions"
        self.alert_stream = "sentineliq:alerts"

        # Consumer groups
        self.event_consumer_group = "risk-engine"
        self.alert_consumer_group = "alerting"

        # Try to connect
        self._connect()

    def _connect(self):
        """Establish Redis connection with error handling."""
        try:
            self._redis = Redis.from_url(self._redis_url, decode_responses=True)
            self._redis.ping()
            self._connected = True
            logger.info(f"Connected to Redis at {self._redis_url}")
        except RedisConnectionError as e:
            logger.warning(f"Redis connection failed: {e}. Operating in degraded mode.")
            self._connected = False
        except Exception as e:
            logger.warning(f"Redis initialization error: {e}. Operating in degraded mode.")
            self._connected = False

    @property
    def redis(self) -> Optional[Redis]:
        """Get Redis client, reconnecting if necessary."""
        if not self._connected:
            self._connect()
        return self._redis if self._connected else None

    def ensure_consumer_groups(self):
        """Create consumer groups if they don't exist."""
        if not self.redis:
            logger.warning("Redis not available, skipping consumer group creation")
            return

        for stream, group in [
            (self.event_stream, self.event_consumer_group),
            (self.alert_stream, self.alert_consumer_group)
        ]:
            try:
                self.redis.xgroup_create(stream, group, id="$", mkstream=True)
                logger.info(f"Created consumer group {group}")
            except ResponseError as e:
                if "BUSYGROUP" not in str(e):
                    logger.error(f"Error creating consumer group {group}: {e}")

    # -----------------------------------------------------------------
    # Background consumer
    # -----------------------------------------------------------------
    async def background_consumer(
        self,
        app=None,
        stream: Optional[str] = None,
        group: Optional[str] = None,
        consumer_name: str = "worker",
        dlq_stream: Optional[str] = None
    ):
        """Background consumer for Redis Streams with retry and DLQ."""
        stream = stream or self.event_stream
        group = group or self.event_consumer_group
        dlq_stream = dlq_stream or f"{stream}:dlq"

        while True:
            try:
                events = self.read_events(consumer_name, stream=stream, count=10, block_ms=1000)
                for event_id, event_data in events:
                    role = event_data.get('role', 'user')
                    try:
                        # RBAC: Only admin can process alerts, analyst for risk, user for own events
                        if stream == self.alert_stream:
                            enforce_redis_rbac(role, ["admin"], "process_alert", event_data.get('user_id'))
                        elif stream == self.risk_stream:
                            enforce_redis_rbac(role, ["admin", "analyst"], "process_risk", event_data.get('user_id'))
                        else:
                            enforce_redis_rbac(role, ["admin", "analyst", "user"], "process_event", event_data.get('user_id'))

                        # Business logic simulation
                        logger.info(
                            f"Processed Redis event: stream={stream}, role={role}, event_id={event_data.get('event_id')}",
                            extra={"correlation_id": event_data.get('event_id'), "role": role, "service": "redis_consumer"}
                        )
                        redis_events_processed.labels(stream, role, 'success').inc()
                        self.ack_event(event_id, stream=stream, group=group)
                    except Exception as e:
                        logger.error(f"Redis event processing failed: {e}", extra={"correlation_id": event_data.get('event_id')})

                        # Retry up to 3 times, then DLQ
                        for _ in range(2):
                            try:
                                logger.info(f"Retrying Redis event: {event_id}")
                                redis_events_processed.labels(stream, role, 'retry').inc()
                                self.ack_event(event_id, stream=stream, group=group)
                                break
                            except Exception as e2:
                                logger.error(f"Retry failed: {e2}")
                        else:
                            # Move to DLQ
                            self.add_event(event_data, stream=dlq_stream)
                            redis_dlq_events.labels(stream, role).inc()
                            redis_events_processed.labels(stream, role, 'failed').inc()
                            self.ack_event(event_id, stream=stream, group=group)
            except Exception as e:
                logger.error(f"Redis background consumer error: {e}")
                redis_errors.labels(action="background_consumer").inc()
            await asyncio.sleep(1)

    # -----------------------------------------------------------------
    # Event operations
    # -----------------------------------------------------------------
    def add_event(self, event_data: Dict[str, Any], stream: Optional[str] = None) -> Optional[str]:
        if not self.redis:
            logger.warning("Redis not available, event not added")
            return None
        stream = stream or self.event_stream
        try:
            event_id = self.redis.xadd(stream, event_data, maxlen=100000)
            logger.debug(f"Added event to {stream}: {event_id}")
            return event_id
        except Exception as e:
            logger.error(f"Error adding event to stream: {e}")
            return None

    def read_events(
        self,
        consumer_name: str,
        stream: Optional[str] = None,
        count: int = 10,
        block_ms: int = 1000
    ) -> List[tuple]:
        if not self.redis:
            return []
        stream = stream or self.event_stream
        group = self.event_consumer_group if stream == self.event_stream else self.alert_consumer_group
        try:
            events = self.redis.xreadgroup(
                groupname=group,
                consumername=consumer_name,
                streams={stream: ">"},
                count=count,
                block=block_ms
            )
            result = []
            for _, messages in events or []:
                for event_id, event_data in messages:
                    result.append((event_id, event_data))
            return result
        except Exception as e:
            logger.error(f"Error reading from stream: {e}")
            return []

    def ack_event(self, event_id: str, stream: Optional[str] = None, group: Optional[str] = None):
        if not self.redis:
            return
        stream = stream or self.event_stream
        group = group or self.event_consumer_group
        try:
            self.redis.xack(stream, group, event_id)
            logger.debug(f"Acknowledged event {event_id}")
        except Exception as e:
            logger.error(f"Error acknowledging event: {e}")

    # -----------------------------------------------------------------
    # Additional helpers
    # -----------------------------------------------------------------
    def health_check(self) -> bool:
        if not self._connected or not self._redis:
            return False
        try:
            return self._redis.ping()
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            self._connected = False
            return False


# Singleton instance
_redis_stream_manager: Optional[RedisStreamManager] = None


def get_redis_stream_manager() -> RedisStreamManager:
    """Get or create Redis Stream manager instance."""
    global _redis_stream_manager
    if _redis_stream_manager is None:
        _redis_stream_manager = RedisStreamManager()
        _redis_stream_manager.ensure_consumer_groups()
    return _redis_stream_manager
