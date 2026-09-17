from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.tenant import User, Organization
from app.models.agent import Agent
from app.models.task import Task
from app.models.audit import AuditLog, UsageRecord
from app.services.audit import AuditService

router = APIRouter(prefix="/admin", tags=["Admin Platform Management"])

def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem yalnızca platform sistem yöneticileri (Superuser) tarafından yapılabilir."
        )
    return current_user

@router.get("/overview")
async def get_admin_overview(
    admin_user: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db)
):
    # Counts
    total_orgs = (await db.execute(select(func.count(Organization.id)))).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_agents = (await db.execute(select(func.count(Agent.id)))).scalar() or 0
    total_tasks = (await db.execute(select(func.count(Task.id)))).scalar() or 0
    running_tasks = (await db.execute(select(func.count(Task.id)).where(Task.status == "running"))).scalar() or 0
    total_tokens = (await db.execute(select(func.coalesce(func.sum(UsageRecord.total_tokens), 0)))).scalar() or 0
    total_cost = (await db.execute(select(func.coalesce(func.sum(UsageRecord.estimated_cost_usd), 0.0)))).scalar() or 0.0

    # Audit log entry for admin access
    await AuditService.log_action(
        db,
        organization_id="system_platform",
        user_id=admin_user.id,
        action="admin_overview_viewed",
        details={"admin_email": admin_user.email}
    )

    return {
        "total_organizations": total_orgs,
        "total_users": total_users,
        "total_agents": total_agents,
        "total_tasks": total_tasks,
        "active_running_tasks": running_tasks,
        "total_tokens_consumed": int(total_tokens),
        "total_platform_cost_usd": float(total_cost),
        "system_health": {
            "api": "healthy",
            "worker_queue": "operational",
            "runtime_harness": "openclaw-gateway-ready"
        }
    }

@router.get("/organizations")
async def get_admin_organizations(
    admin_user: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Organization).order_by(desc(Organization.created_at)).limit(100))
    orgs = result.scalars().all()
    return orgs

@router.get("/tasks")
async def get_admin_tasks(
    admin_user: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).order_by(desc(Task.created_at)).limit(50))
    tasks = result.scalars().all()
    return tasks
