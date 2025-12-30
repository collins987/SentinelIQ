from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.api import auth
from app.routes import users, admin, email_verification, password_reset
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.core.db import init_db, SessionLocal, engine
from prometheus_client import make_asgi_app
from app.models import Base
from app.core.seed import seed_default_org
import time

app = FastAPI(
    title="SentinelIQ",
    description="Fintech Risk & Security Intelligence Platform"
)

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
init_db()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_org(db)
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
