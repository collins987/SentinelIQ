"""
Event Ingestion Gateway - FastAPI router for ingesting events into SentinelIQ.
Implements the transactional outbox pattern for guaranteed event delivery.
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.schemas.event import SentinelEvent
from app.dependencies import get_db
from app.models.events import EventOutbox
from app.services.redis_stream import get_redis_stream_manager
import json

logger = logging.getLogger("sentineliq.gateway")

router = APIRouter(prefix="/api/v1/events", tags=["events"])


