from fastapi import FastAPI, Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.api import auth
from app.routes import (
    users, admin, email_verification, password_reset, 
    analytics, integrations, advanced_analytics, rules, search, graphql_api, ml_mobile, milestone_1_2
)
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware, UserTrackingMiddleware
from app.core.pii_scrubber import PIIScrubbingMiddleware
from app.core.db import init_db, SessionLocal, engine
from app.services.outbox import initialize_outbox_poller, shutdown_outbox_poller
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, REGISTRY
from prometheus_fastapi_instrumentator import Instrumentator
from app.models import Base
from app.core.seed import seed_default_org
from app.core.logging import logger
import time

app = FastAPI(
    title="SentinelIQ",
    description="Fintech Risk & Security Intelligence Platform"
)

# Initialize Prometheus instrumentator BEFORE middleware setup
Instrumentator().instrument(app).expose(app)

# MILESTONE 1 & 2: PII Scrubbing Middleware
app.add_middleware(PIIScrubbingMiddleware)

# MILESTONE 8: Logging and request tracking middleware
app.add_middleware(UserTrackingMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Security middleware (OWASP hardening)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "api.sentineliq.com", "sentineliq_api", "api"]
)

# Routes
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(email_verification.router)  # MILESTONE 6: Step 3
app.include_router(password_reset.router)  # MILESTONE 6: Step 4
app.include_router(analytics.router)  # MILESTONE 8: Analytics & monitoring
app.include_router(advanced_analytics.router)  # Advanced analytics (time-series, cohorts, trends)
app.include_router(rules.router)  # Runtime rule reloading
app.include_router(search.router)  # Full-text search
app.include_router(integrations.router)  # Rate limiting, webhooks, Slack, PagerDuty
app.include_router(graphql_api.router)  # GraphQL API
app.include_router(ml_mobile.router)  # ML models and Mobile SDK
app.include_router(milestone_1_2.router)  # MILESTONE 1 & 2: Shadow Mode, Link Analysis, Audit

init_db()


# ========== STARTUP & SHUTDOWN HOOKS ==========

@app.on_event("startup")
async def startup_event():
    """Initialize background workers and services."""
    logger.info("[STARTUP] Initializing SentinelIQ services...")
    
    # MILESTONE 1 & 2: Start outbox poller
    db = SessionLocal()
    try:
        await initialize_outbox_poller(db)
        logger.info("[STARTUP] ✅ Outbox poller initialized")
    except Exception as e:
        logger.error(f"[STARTUP] ❌ Failed to initialize outbox poller: {e}")
    finally:
        db.close()
    
    logger.info("[STARTUP] ✅ All services started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("[SHUTDOWN] Shutting down SentinelIQ services...")
    
    # MILESTONE 1 & 2: Stop outbox poller
    await shutdown_outbox_poller()
    logger.info("[SHUTDOWN] ✅ All services stopped")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_org(db)
        logger.info("Application startup - database initialized")
    finally:
        db.close()

@app.on_event("shutdown")
def shutdown():
    logger.info("Application shutdown")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/metrics", include_in_schema=False)
def get_metrics():
    """Prometheus metrics endpoint - returns metrics in text/plain format"""
    metrics_output = generate_latest(REGISTRY)
    # Ensure proper encoding if bytes are returned
    if isinstance(metrics_output, bytes):
        metrics_output = metrics_output.decode('utf-8')
    return Response(
        content=metrics_output,
        media_type="text/plain; version=0.0.4; charset=utf-8"
    )
