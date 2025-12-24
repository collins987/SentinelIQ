from fastapi import FastAPI
from app.api import users, auth
from app.core.db import init_db, SessionLocal, engine
from prometheus_client import make_asgi_app
from app.models import Base
from app.routes import users, admin
from app.core.seed import seed_default_org
import time

app = FastAPI(
    title="SentinelIQ",
    description="Fintech Risk & Security Intelligence Platform"
)
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(auth.router)

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
