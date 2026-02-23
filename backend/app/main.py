from contextlib import asynccontextmanager
import asyncio
from prometheus_client import Counter, Gauge
from fastapi import FastAPI, Response, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from app.api import auth
from app.routes import users, admin, email_verification, password_reset, analytics, events, dashboard, dashboard_ws
from app.routes.user_api import router as user_api_router
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware, UserTrackingMiddleware
from app.middleware.pii_scrubber import PIIScrubberMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.core.db import init_db, SessionLocal, engine
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, REGISTRY
from fastapi import Depends
from app.dependencies import require_role
from prometheus_fastapi_instrumentator import Instrumentator
from app.models import Base
from app.core.seed import seed_all
from app.core.logging import logger
from app.services.graph_service import router as graph_router
from app.services.message_center import router as message_router
import traceback


# Lifespan context manager for startup/shutdown
from app.services.kafka_service import KafkaTopics, KafkaConsumerService
from app.dependencies import get_current_user
from app.core.logging import logger

# Prometheus metrics for Kafka
kafka_event_counter = Counter(
    'kafka_events_processed_total',
    'Total number of Kafka events processed',
    ['topic', 'role', 'status']
)
kafka_dlq_counter = Counter(
    'kafka_events_dlq_total',
    'Total number of Kafka events sent to DLQ',
    ['topic', 'role']
)
kafka_consumer_lag_gauge = Gauge(
    'kafka_consumer_lag',
    'Kafka consumer lag',
    ['topic', 'group']
)

KAFKA_CONSUMER_TOPICS = [
    KafkaTopics.RAW_EVENTS,
    KafkaTopics.RISK_SCORED,
    KafkaTopics.ALERTS_HIGH,
    KafkaTopics.AUDIT_ARCHIVE,
    KafkaTopics.OUTBOX_EVENTS
]

async def process_kafka_message(message, app):
    """
    Role-aware Kafka event processing with RBAC and DLQ.
    """
    try:
        # Extract event and role (simulate RBAC, real logic should check JWT/claims)
        event = message.value
        topic = message.topic
        # Example: role from event or default
        role = event.get('role', 'user')
        # RBAC enforcement (expand as needed)
        if topic == KafkaTopics.ALERTS_HIGH.value and role != 'admin':
            logger.warning(f"RBAC: Non-admin tried to process admin topic: {event}")
            kafka_event_counter.labels(topic, role, 'forbidden').inc()
            return
        # Business logic per topic/role
        logger.info(f"Processing Kafka event: topic={topic}, role={role}, event_id={event.get('event_id')}", extra={"correlation_id": event.get('event_id'), "role": role, "service": "kafka_consumer"})
        # Simulate processing
        kafka_event_counter.labels(topic, role, 'success').inc()
    except Exception as e:
        logger.error(f"Kafka event processing failed: {e}", extra={"correlation_id": getattr(message.value, 'event_id', None)})
        # Send to DLQ (not implemented, just metric)
        kafka_dlq_counter.labels(message.topic, message.value.get('role', 'user')).inc()
        kafka_event_counter.labels(message.topic, message.value.get('role', 'user'), 'failed').inc()

async def kafka_consumer_worker(app):
    """Background Kafka consumer with retry and DLQ."""
    consumer = await KafkaConsumerService.create(KAFKA_CONSUMER_TOPICS)
    try:
        async for message in consumer.consume():
            for _ in range(3):
                try:
                    await process_kafka_message(message, app)
                    await consumer.commit(message)
                    break
                except Exception as e:
                    logger.error(f"Kafka event retry failed: {e}")
            else:
                # After retries, increment DLQ metric
                kafka_dlq_counter.labels(message.topic, message.value.get('role', 'user')).inc()
    finally:
        await consumer.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    
    Handles startup and shutdown of:
    - Database initialization
    - Kafka connections (optional)
    - Vault client (optional)
    """
    # Startup - Database (required)
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            # Seed all required data (org, system user, admin)
            seed_result = seed_all(db)
            logger.info(
                f"Application startup - database initialized, "
                f"system user: {seed_result['system_user'].id}"
            )
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise RuntimeError(f"Cannot start without database: {e}")
    

    # Initialize Kafka producer and start background consumer
    try:
        from app.services.kafka_service import get_kafka_producer
        await get_kafka_producer()
        logger.info("Kafka producer initialized")
        # Start background consumer
        app.state.kafka_consumer_task = asyncio.create_task(kafka_consumer_worker(app))
        logger.info("Kafka background consumer started")
    except Exception as e:
        logger.warning(f"Kafka initialization skipped: {e}")
    
    # Initialize Vault (optional - graceful degradation)
    try:
        from app.core.vault_client import get_vault_client
        vault = get_vault_client()
        if vault.is_authenticated():
            logger.info("Vault client authenticated")
    except Exception as e:
        logger.warning(f"Vault initialization skipped: {e}")
    
    # Initialize Redis Stream Manager (optional - graceful degradation)
    try:
        from app.services.redis_stream import get_redis_stream_manager
        redis_manager = get_redis_stream_manager()
        if redis_manager.health_check():
            logger.info("Redis stream manager initialized")
    except Exception as e:
        logger.warning(f"Redis initialization skipped: {e}")
    
    yield
    

    # Shutdown
    try:
        from app.services.kafka_service import shutdown_kafka
        await shutdown_kafka()
        logger.info("Kafka connections closed")
        # Cancel background consumer
        if hasattr(app.state, 'kafka_consumer_task'):
            app.state.kafka_consumer_task.cancel()
            try:
                await app.state.kafka_consumer_task
            except Exception:
                pass
    except Exception:
        pass
    
    logger.info("Application shutdown")



app = FastAPI(
    title="SentinelIQ",
    description="Fintech Risk & Security Intelligence Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS for userdashboard frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:4000",
        "http://127.0.0.1:4000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Enforce HTTPBearer as the ONLY security scheme in OpenAPI (Swagger)
from fastapi.openapi.utils import get_openapi
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "HTTPBearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    openapi_schema["security"] = [{"HTTPBearer": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema
app.openapi = custom_openapi

# Print all registered routes on startup
@app.on_event("startup")
async def log_registered_routes():
    from starlette.routing import WebSocketRoute
    route_list = []
    for route in app.routes:
        if hasattr(route, 'path'):
            route_type = type(route).__name__
            route_list.append(f"{route_type}: {getattr(route, 'path', '')}")
    for route in app.router.routes:
        if hasattr(route, 'path'):
            route_type = type(route).__name__
            route_list.append(f"{route_type}: {getattr(route, 'path', '')}")
    logger.info("Registered routes (including WebSockets):\n" + "\n".join(route_list))

# Initialize Prometheus instrumentator BEFORE middleware setup
Instrumentator().instrument(app).expose(app)

# ============================================================================
# Middleware Stack (order matters - last added = first executed)
# ============================================================================

# 5. User tracking (innermost - runs last on request, first on response)
app.add_middleware(UserTrackingMiddleware)

# 4. Request logging
app.add_middleware(RequestLoggingMiddleware)

# 3. PII Scrubbing (ensures no sensitive data in logs)
app.add_middleware(PIIScrubberMiddleware)

# 2. Rate limiting
app.add_middleware(RateLimitMiddleware)

# 1. Security headers (outermost - runs first on request, last on response)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "api.sentineliq.com", "sentineliq_api", "api"]
)

# ============================================================================
# Core Routes
# ============================================================================
app.include_router(users.router)
app.include_router(users.user_router)  # Restore /user/dashboard and /user/profile endpoints
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(email_verification.router)  # MILESTONE 6: Step 3
app.include_router(password_reset.router)  # MILESTONE 6: Step 4
app.include_router(analytics.router)  # MILESTONE 8: Analytics & monitoring
app.include_router(events.router)  # Event processing routes
app.include_router(dashboard.router)  # Admin Dashboard API
app.include_router(
    dashboard_ws.router,
    prefix="/api/admin/dashboard"
)

# ============================================================================
# New Feature Routes
# ============================================================================
app.include_router(graph_router)  # Graph visualization API
app.include_router(message_router)  # Secure message center
app.include_router(user_api_router)  # User fintech API (loans, sessions, MFA, risk, alerts)

init_db()


# ============================================================================
# Global Exception Handlers
# ============================================================================

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with structured response."""
    logger.warning(
        f"HTTP {exc.status_code}: {exc.detail}",
        extra={"path": request.url.path, "method": request.method}
    )
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "detail": exc.detail,
            "status_code": exc.status_code,
            "request_id": request_id
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed response."""
    logger.warning(
        f"Validation error on {request.url.path}",
        extra={"errors": exc.errors()}
    )
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "detail": "Validation error",
            "errors": exc.errors(),
            "request_id": request_id
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler.
    Prevents crashes from unhandled exceptions.
    """
    error_id = f"ERR-{id(exc)}"
    request_id = getattr(request.state, "request_id", None)
    logger.error(
        f"Unhandled exception [{error_id}]: {type(exc).__name__}: {exc}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_id": error_id,
            "request_id": request_id,
            "traceback": traceback.format_exc()
        }
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "detail": "Internal server error",
            "error_id": error_id,
            "request_id": request_id
        }
    )


@app.get("/health")
def health_check():
    """Health check endpoint for load balancers."""
    return {"status": "ok", "version": "2.0.0"}


@app.get("/health/detailed")
async def detailed_health_check():
    """
    Detailed health check with component status.
    
    Checks database, Redis, Kafka, and Vault connectivity.
    """
    health_status = {
        "status": "ok",
        "version": "2.0.0",
        "components": {}
    }
    
    # Database check
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health_status["components"]["database"] = "healthy"
    except Exception as e:
        health_status["components"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Redis check
    try:
        from app.services.redis_stream import get_redis_stream_manager
        redis_manager = get_redis_stream_manager()
        if redis_manager.health_check():
            health_status["components"]["redis"] = "healthy"
        else:
            health_status["components"]["redis"] = "unhealthy: ping failed"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["components"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Kafka check (optional)
    try:
        from app.services.kafka_service import _producer
        if _producer and _producer._started:
            health_status["components"]["kafka"] = "healthy"
        else:
            health_status["components"]["kafka"] = "not_configured"
    except Exception:
        health_status["components"]["kafka"] = "not_configured"
    
    # Vault check (optional)
    try:
        from app.core.vault_client import get_vault_client
        vault = get_vault_client()
        if vault.is_authenticated():
            health_status["components"]["vault"] = "healthy"
        else:
            health_status["components"]["vault"] = "not_authenticated"
    except Exception:
        health_status["components"]["vault"] = "not_configured"
    
    return health_status



# RBAC: Only admin and analyst can access metrics
@app.get("/metrics", include_in_schema=False, dependencies=[Depends(require_role(["admin", "analyst"]))])
def get_metrics():
    """Prometheus metrics endpoint - returns metrics in text/plain format"""
    try:
        metrics_output = generate_latest(REGISTRY)
        if isinstance(metrics_output, bytes):
            metrics_output = metrics_output.decode('utf-8')
        return Response(
            content=metrics_output,
            media_type="text/plain; version=0.0.4; charset=utf-8"
        )
    except Exception as e:
        # Always return a valid Response, even on error
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(f"Error generating metrics: {str(e)}", status_code=500)

# Loki-compatible logs endpoint (admin/analyst only)
import glob
import os
@app.get("/logs", dependencies=[Depends(require_role(["admin", "analyst"]))])
def get_logs():
    """Return recent structured logs (Loki compatible, for admin/analyst only)"""
    log_files = glob.glob(os.path.join(os.getcwd(), "*.log"))
    logs = []
    for log_file in log_files:
        with open(log_file, "r") as f:
            logs.extend(f.readlines()[-200:])  # Last 200 lines per file
    return Response(
        content="".join(logs),
        media_type="text/plain; charset=utf-8"
    )


@app.websocket("/api/admin/dashboard/ws/events")
async def admin_dashboard_events_ws(websocket: WebSocket):
    """
    WebSocket endpoint for admin dashboard events.
    Expects JWT token as query param (?token=...).
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        # Use the new verify_jwt_token function from auth
        user = auth.verify_jwt_token(token)
    except Exception:
        await websocket.close(code=4403)
        return

    await websocket.accept()
    try:
        while True:
            # Keep connection alive, echo/ping for now
            data = await websocket.receive_text()
            await websocket.send_text(f"pong: {data}")
    except WebSocketDisconnect:
        pass

