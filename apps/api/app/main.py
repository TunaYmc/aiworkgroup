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

    # Ensure visual/scanned documents are properly ingested with multimodal vision
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
        from app.models.agent import AgentFile
        from app.services.ingestion import ingestion_service
        from app.services.storage import storage_service
        from sqlalchemy import select
        import os

        async with AsyncSessionLocal() as session:
            files_res = await session.execute(select(AgentFile))
            all_files = files_res.scalars().all()
            for af in all_files:
                doc_res = await session.execute(
                    select(KnowledgeDocument).where(KnowledgeDocument.file_id == af.id)
                )
                doc = doc_res.scalars().first()
                needs_reingest = False
                if not doc or (doc.total_chunks or 0) == 0:
                    needs_reingest = True
                else:
                    c_res = await session.execute(
                        select(KnowledgeChunk).where(KnowledgeChunk.document_id == doc.id)
                    )
                    chunks = c_res.scalars().all()
                    total_len = sum(len(c.content) for c in chunks)
                    # If total text is short or was parsed by weak OCR, re-parse with multimodal vision
                    if total_len < 800:
                        needs_reingest = True

                if needs_reingest:
                    file_bytes = None
                    try:
                        file_bytes = storage_service.download_file(af.storage_key)
                    except Exception:
                        pass
                    if not file_bytes:
                        fpath = os.path.join(settings.DEFAULT_WORKSPACE_ROOT, af.organization_id, "documents", af.filename)
                        if os.path.exists(fpath):
                            with open(fpath, "rb") as f_in:
                                file_bytes = f_in.read()

                    if file_bytes:
                        logger.info(f"Re-ingesting visual/scanned document with multimodal vision: {af.filename}")
                        await ingestion_service.ingest_file(session, af, file_bytes)

        logger.info("Knowledge documents verified and synced with multimodal vision.")
    except Exception as sync_err:
        logger.warning(f"Document multimodal vision sync deferred: {sync_err}")

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
