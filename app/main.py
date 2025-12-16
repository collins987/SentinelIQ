from fastapi import FastAPI
from prometheus_client import make_asgi_app
import time

app = FastAPI(
    title="SentinelIQ",
    description="Fintech Risk & Security Intelligence Platform",
    version="0.1.0"
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
