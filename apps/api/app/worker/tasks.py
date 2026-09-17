import asyncio
import logging
from app.worker.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.task import Task, TaskExecution
from app.models.agent import Agent
from app.runtime.openclaw import OpenClawRuntimeAdapter
from app.services.context_builder import ContextBuilder

logger = logging.getLogger(__name__)

async def _execute_task_async(task_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Task).where(Task.id == task_id))
        task = result.scalars().first()
        if not task:
            logger.error(f"Task {task_id} not found")
            return

        task.status = "running"
        await session.commit()

        agent_res = await session.execute(select(Agent).where(Agent.id == task.agent_id))
        agent = agent_res.scalars().first()
        if not agent:
            task.status = "failed"
            task.error_message = "Agent not found"
            await session.commit()
            return

        builder = ContextBuilder(session)
        context = await builder.build_context(agent, current_task_prompt=task.input_prompt, task_id=task.id)

        runtime = OpenClawRuntimeAdapter()
        try:
            exec_result = await runtime.execute(
                agent_id=agent.id,
                task_id=task.id,
                prompt=task.input_prompt,
                context=context
            )
            task.status = "completed"
            task.output_result = exec_result.get("output", "İşlem başarıyla tamamlandı.")
            task.artifacts = exec_result.get("artifacts", [])
        except Exception as e:
            logger.exception(f"Error running task {task.id}: {e}")
            task.status = "failed"
            task.error_message = str(e)

        await session.commit()

@celery_app.task(name="app.worker.tasks.run_agent_task")
def run_agent_task(task_id: str):
    """
    Celery background worker task entrypoint.
    """
    asyncio.run(_execute_task_async(task_id))
