from fastapi import APIRouter, status, Depends
from fastapi.responses import JSONResponse
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    checks = {}
    is_ready = True

    # 1. Real PostgreSQL ping
    try:
        await db.execute(text("SELECT 1"))
        checks["postgres"] = "connected"
    except Exception as e:
        checks["postgres"] = f"error: {str(e)}"
        is_ready = False

    # 2. Real Redis ping
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL, socket_timeout=1.5)
        await r.ping()
        await r.aclose()
        checks["redis"] = "connected"
    except Exception as e:
        checks["redis"] = f"unavailable: {str(e)}"
        # In dev mode, redis being down doesn't crash sync endpoints
        checks["redis_status"] = "standby"

    # 3. Real OpenClaw Gateway ping
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.get(f"{settings.OPENCLAW_GATEWAY_URL}/health")
            if resp.status_code == 200:
                checks["openclaw_gateway"] = "connected"
            else:
                checks["openclaw_gateway"] = f"status_{resp.status_code}"
    except Exception:
        checks["openclaw_gateway"] = "embedded_mode_active"

    checks["openrouter"] = "configured" if settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY != "your_openrouter_api_key_here" else "standby"

    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content={"status": "ready" if is_ready else "degraded", "checks": checks})
