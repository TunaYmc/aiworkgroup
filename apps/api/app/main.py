import time
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_v1_router
import app.models

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("platform")

# Prometheus Metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP Requests",
    ["method", "endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP Request Latency in Seconds",
    ["method", "endpoint"]
)
AGENT_TASKS_TOTAL = Counter(
    "agent_tasks_total",
    "Total AI Employee tasks initiated",
    ["organization_id", "status"]
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Database initialization deferred: {e}")
    yield
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multi-Tenant AI Employee SaaS Platform API with decoupled OpenClaw runtime, OpenRouter gateway, and RAG.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Request tracking and Prometheus metrics middleware (safely isolated from request failure)
@app.middleware("http")
async def request_tracking_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start_time = time.time()
    endpoint = request.url.path

    try:
        response = await call_next(request)
    except Exception as ex:
        logger.exception(f"Unhandled exception processing {request.method} {endpoint}: {ex}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(ex)}
        )

    duration = time.time() - start_time
    duration_ms = round(duration * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(duration_ms)

    # Safely update Prometheus metrics without blocking or resetting connections
    try:
        status_str = str(response.status_code)
        REQUEST_COUNT.labels(method=request.method, endpoint=endpoint, status=status_str).inc()
        REQUEST_LATENCY.labels(method=request.method, endpoint=endpoint).observe(duration)
    except Exception as metric_err:
        logger.debug(f"Metrics collection skipped: {metric_err}")

    return response

# Prometheus /metrics endpoint
@app.get("/metrics", tags=["Observability"])
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Root-level convenience health endpoints
@app.get("/health", tags=["Health"])
async def root_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/ready", tags=["Health"])
async def root_ready():
    from app.api.v1.health import readiness_check
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        return await readiness_check(db=session)

# Include API v1 Router
app.include_router(api_v1_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "api_v1": "/api/v1",
        "metrics": "/metrics"
    }
