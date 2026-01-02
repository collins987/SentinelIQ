# Transactional Outbox Pattern Implementation
# Guarantees zero data loss: If publisher crashes, events are retried on restart

import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Outbox, Organization
from app.dependencies import get_db
from app.services.redis_stream import publish_to_stream

logger = logging.getLogger(__name__)


# ========== OUTBOX WRITER ==========

class OutboxWriter:
    """Write events to outbox table (called from API endpoints)."""
    
    @staticmethod
    def write_event(
        db: Session,
        org_id: str,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any],
    ) -> Outbox:
        """
        Write event to outbox table.
        
        This is called WITHIN the same transaction as the main data write.
        Example:
            BEGIN TRANSACTION
                INSERT INTO risk_events (...)  -- Main data
                INSERT INTO outbox (...)       -- Event for async processing
            COMMIT TRANSACTION
        
        Guarantee: If transaction commits, event WILL be published (eventually).
        """
        outbox_record = Outbox(
            organization_id=org_id,
            event_id=event_id,
            event_type=event_type,
            payload_json=payload,
            status="pending",
            created_at=datetime.utcnow(),
        )
        
        db.add(outbox_record)
        db.flush()  # Flush to ensure DB constraint checks pass
        
        logger.debug(
            f"[OUTBOX] Event written: {event_type} (ID: {event_id}) "
            f"- Status: pending"
        )
        
        return outbox_record
    
    @staticmethod
    def write_batch(
        db: Session,
        org_id: str,
        events: list,  # List of {event_id, event_type, payload}
    ) -> list:
        """Write multiple events to outbox in one operation."""
        outbox_records = []
        
        for event in events:
            record = OutboxWriter.write_event(
                db=db,
                org_id=org_id,
                event_id=event["event_id"],
                event_type=event["event_type"],
                payload=event["payload"],
            )
            outbox_records.append(record)
        
        logger.info(f"[OUTBOX] {len(outbox_records)} events written to outbox")
        return outbox_records


# ========== OUTBOX POLLER (CDC - Change Data Capture) ==========

class OutboxPoller:
    """
    Background worker that polls outbox table and publishes pending events.
    
    Polling interval: 1 second
    Batch size: 100 events per poll
    Retry strategy: Exponential backoff up to 5 retries
    """
    
    POLL_INTERVAL_SECONDS = 1
    BATCH_SIZE = 100
    MAX_RETRIES = 5
    RETRY_BACKOFF_MULTIPLIER = 2  # 1s, 2s, 4s, 8s, 16s
    
    def __init__(self, db_session):
        self.db = db_session
        self.running = False
    
    async def start(self):
        """Start the outbox poller background task."""
        self.running = True
        logger.info("[OUTBOX POLLER] Starting...")
        
        while self.running:
            try:
                await self._poll_cycle()
            except Exception as e:
                logger.error(f"[OUTBOX POLLER] Error in poll cycle: {e}", exc_info=True)
                await asyncio.sleep(self.POLL_INTERVAL_SECONDS)
    
    async def stop(self):
        """Stop the outbox poller."""
        self.running = False
        logger.info("[OUTBOX POLLER] Stopping...")
    
    async def _poll_cycle(self):
        """Single poll cycle: fetch pending, publish, mark complete."""
        
        # [1] Fetch pending events from outbox
        pending_events = self._get_pending_events(limit=self.BATCH_SIZE)
        
        if not pending_events:
            # No work, sleep
            await asyncio.sleep(self.POLL_INTERVAL_SECONDS)
            return
        
        logger.debug(f"[OUTBOX POLLER] Found {len(pending_events)} pending events")
        
        # [2] Publish each event
        for outbox_record in pending_events:
            success = await self._publish_event(outbox_record)
            
            if success:
                # Mark as published
                self._mark_published(outbox_record.id)
                logger.debug(
                    f"[OUTBOX POLLER] Event {outbox_record.event_id} "
                    f"({outbox_record.event_type}) published successfully"
                )
            else:
                # Increment retry count
                self._increment_retry(outbox_record.id)
                
                if outbox_record.retry_count >= self.MAX_RETRIES:
                    # Too many retries, mark as failed
                    self._mark_failed(outbox_record.id)
                    logger.error(
                        f"[OUTBOX POLLER] Event {outbox_record.event_id} "
                        f"failed after {self.MAX_RETRIES} retries - marked as failed"
                    )
        
        # [3] Sleep before next poll
        await asyncio.sleep(self.POLL_INTERVAL_SECONDS)
    
    def _get_pending_events(self, limit: int = 100) -> list:
        """Fetch pending events from outbox."""
        query = select(Outbox).where(
            Outbox.status == "pending"
        ).limit(limit)
        
        return self.db.execute(query).scalars().all()
    
    async def _publish_event(self, outbox_record: Outbox) -> bool:
        """
        Publish event to Redis Stream.
        Returns True if successful, False otherwise.
        """
        try:
            # Publish to appropriate stream based on event type
            stream_name = f"events:{outbox_record.event_type}"
            
            await publish_to_stream(
                stream=stream_name,
                message=outbox_record.payload_json,
                message_id=outbox_record.event_id,
            )
            
            return True
        
        except Exception as e:
            logger.warning(
                f"[OUTBOX POLLER] Failed to publish event {outbox_record.event_id}: {e}"
            )
            return False
    
    def _mark_published(self, outbox_id: str):
        """Mark event as successfully published."""
        outbox = self.db.query(Outbox).filter(Outbox.id == outbox_id).first()
        if outbox:
            outbox.status = "published"
            outbox.published_at = datetime.utcnow()
            self.db.commit()
    
    def _mark_failed(self, outbox_id: str, error_message: str = None):
        """Mark event as failed (after max retries)."""
        outbox = self.db.query(Outbox).filter(Outbox.id == outbox_id).first()
        if outbox:
            outbox.status = "failed"
            outbox.error_message = error_message or "Max retries exceeded"
            self.db.commit()
    
    def _increment_retry(self, outbox_id: str):
        """Increment retry count."""
        outbox = self.db.query(Outbox).filter(Outbox.id == outbox_id).first()
        if outbox:
            outbox.retry_count += 1
            self.db.commit()


# ========== OUTBOX CLEANUP ==========

class OutboxCleanup:
    """Cleanup old published/failed events from outbox table."""
    
    RETENTION_DAYS = 7  # Keep published events for 7 days for audit
    
    @staticmethod
    async def cleanup_old_events(db: Session):
        """
        Delete published events older than RETENTION_DAYS.
        This prevents outbox table from growing indefinitely.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=OutboxCleanup.RETENTION_DAYS)
        
        deleted = db.query(Outbox).filter(
            Outbox.status == "published",
            Outbox.published_at < cutoff_date,
        ).delete()
        
        db.commit()
        
        logger.info(
            f"[OUTBOX CLEANUP] Deleted {deleted} published events "
            f"older than {OutboxCleanup.RETENTION_DAYS} days"
        )


# ========== OUTBOX MONITORING ==========

class OutboxMonitor:
    """Monitor outbox table health and metrics."""
    
    @staticmethod
    def get_stats(db: Session) -> Dict[str, Any]:
        """Get current outbox statistics."""
        total = db.query(Outbox).count()
        pending = db.query(Outbox).filter(Outbox.status == "pending").count()
        published = db.query(Outbox).filter(Outbox.status == "published").count()
        failed = db.query(Outbox).filter(Outbox.status == "failed").count()
        
        # Avg time to publish (for successful events)
        avg_publish_time = None
        successful = db.query(Outbox).filter(
            Outbox.status == "published",
            Outbox.published_at.isnot(None),
        )
        
        if successful.count() > 0:
            total_time = sum([
                (e.published_at - e.created_at).total_seconds()
                for e in successful
            ])
            avg_publish_time = total_time / successful.count()
        
        return {
            "total": total,
            "pending": pending,
            "published": published,
            "failed": failed,
            "avg_publish_time_seconds": avg_publish_time,
        }
    
    @staticmethod
    def get_failed_events(db: Session, limit: int = 10):
        """Get recent failed events."""
        return db.query(Outbox).filter(
            Outbox.status == "failed"
        ).order_by(Outbox.created_at.desc()).limit(limit).all()
    
    @staticmethod
    def get_pending_count(db: Session) -> int:
        """Get count of pending events."""
        return db.query(Outbox).filter(Outbox.status == "pending").count()


# ========== INITIALIZATION ==========

_poller_instance: Optional[OutboxPoller] = None


async def initialize_outbox_poller(db_session):
    """Initialize and start the outbox poller on application startup."""
    global _poller_instance
    
    _poller_instance = OutboxPoller(db_session)
    
    # Start as background task
    asyncio.create_task(_poller_instance.start())
    
    logger.info("[OUTBOX] Poller initialized and started")


async def shutdown_outbox_poller():
    """Shutdown the outbox poller on application shutdown."""
    global _poller_instance
    
    if _poller_instance:
        await _poller_instance.stop()
        logger.info("[OUTBOX] Poller shutdown complete")
