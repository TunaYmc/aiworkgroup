from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_organization
from app.models.tenant import User, Organization
from app.models.agent import Agent
from app.models.task import Task, TaskExecution
from app.schemas.task import TaskCreate, TaskResponse, TaskDetailResponse
from app.services.audit import AuditService

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    agent_id: Optional[str] = None,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    query = select(Task).where(Task.organization_id == current_org.id)
    if agent_id:
        query = query.where(Task.agent_id == agent_id)
    query = query.order_by(desc(Task.created_at))
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/agent/{agent_id}", response_model=TaskResponse)
async def create_agent_task(
    agent_id: str,
    task_in: TaskCreate,
    current_org: Organization = Depends(get_current_organization),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify agent belongs to organization
    res = await db.execute(
        select(Agent).where((Agent.id == agent_id) & (Agent.organization_id == current_org.id))
    )
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent bulunamadı")

    task = Task(
        organization_id=current_org.id,
        agent_id=agent.id,
        user_id=current_user.id,
        title=task_in.title,
        priority=task_in.priority,
        input_prompt=task_in.input_prompt,
        input_data=task_in.input_data,
        status="queued"
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Trigger async task queue or worker
    try:
        from app.worker.tasks import run_agent_task
        run_agent_task.delay(task.id)
    except Exception:
        # Fallback in local development without active celery worker
        pass

    return task

@router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task(
    task_id: str,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    query = select(Task).where((Task.id == task_id) & (Task.organization_id == current_org.id))
    result = await db.execute(query)
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")

    # Load executions
    exec_res = await db.execute(
        select(TaskExecution).where(TaskExecution.task_id == task.id).order_by(TaskExecution.step_number)
    )
    task.executions = exec_res.scalars().all()
    return task

@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Task).where((Task.id == task_id) & (Task.organization_id == current_org.id))
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")

    task.status = "cancelled"
    await db.commit()
    return {"message": "Görev iptal edildi", "status": "cancelled"}
