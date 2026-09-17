from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.organizations import router as org_router
from app.api.v1.agents import router as agent_router
from app.api.v1.tasks import router as task_router
from app.api.v1.files import router as file_router
from app.api.v1.models import router as model_router
from app.api.v1.usage import router as usage_router
from app.api.v1.logs import router as log_router
from app.api.v1.health import router as health_router
from app.api.v1.admin import router as admin_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(org_router)
api_v1_router.include_router(agent_router)
api_v1_router.include_router(task_router)
api_v1_router.include_router(file_router)
api_v1_router.include_router(model_router)
api_v1_router.include_router(usage_router)
api_v1_router.include_router(log_router)
api_v1_router.include_router(admin_router)
