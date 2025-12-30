from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.api import auth
from app.routes import users, admin, email_verification, password_reset, analytics
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware, UserTrackingMiddleware
from app.core.db import init_db, SessionLocal, engine
from prometheus_client import make_asgi_app
from app.models import Base
from app.core.seed import seed_default_org
from app.core.logging import logger
import time

app = FastAPI(
    title="SentinelIQ",
    description="Fintech Risk & Security Intelligence Platform"
)

# MILESTONE 8: Logging and request tracking middleware
app.add_middleware(UserTrackingMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Security middleware (OWASP hardening)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "api.sentineliq.com"]
)

# Routes
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(email_verification.router)  # MILESTONE 6: Step 3
app.include_router(password_reset.router)  # MILESTONE 6: Step 4
app.include_router(analytics.router)  # MILESTONE 8: Analytics & monitoring
init_db()

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

# Prometheus metrics - must be mounted before routes
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
