import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_organization
from app.models.tenant import User, Organization
from app.models.agent import Agent, AgentMessage, AgentRun
from app.schemas.agent import (
    AgentCreate, AgentUpdate, AgentResponse, AgentDetailResponse,
    AgentMessageCreate, AgentMessageResponse
)
from app.services.context_builder import ContextBuilder
from app.runtime.openclaw import OpenClawRuntimeAdapter
from app.services.openrouter import OpenRouterService
from app.services.audit import AuditService

router = APIRouter(prefix="/agents", tags=["Agents"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[AgentResponse])
async def list_agents(
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Agent)
        .where(Agent.organization_id == current_org.id)
        .order_by(desc(Agent.created_at))
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=AgentResponse)
async def create_agent(
    agent_in: AgentCreate,
    current_org: Organization = Depends(get_current_organization),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    agent = Agent(
        organization_id=current_org.id,
        name=agent_in.name,
        role=agent_in.role,
        description=agent_in.description,
        system_instructions=agent_in.system_instructions,
        model_config_data=agent_in.model_config_data or {
            "primary_model": "anthropic/claude-3.7-sonnet",
            "fallback_models": ["openai/gpt-4o-mini"],
            "temperature": 0.3,
            "max_tokens": 4096
        },
        tool_permissions=agent_in.tool_permissions or {
            "allowed_tools": ["file_search", "file_read", "file_write", "list_files", "python", "web_search"],
            "denied_tools": ["arbitrary_host_exec"]
        }
    )
    db.add(agent)
    await db.flush()

    # Initialize agent in runtime adapter
    runtime = OpenClawRuntimeAdapter()
    await runtime.create_agent(
        agent_id=agent.id,
        organization_id=current_org.id,
        config={
            "system_instructions": agent.system_instructions,
            "model_config": agent.model_config_data,
            "tool_permissions": agent.tool_permissions
        }
    )

    await AuditService.log_action(
        db,
        organization_id=current_org.id,
        user_id=current_user.id,
        agent_id=agent.id,
        action="agent_created",
        details={"name": agent.name, "role": agent.role}
    )

    await db.commit()
    await db.refresh(agent)
    return agent

@router.get("/{agent_id}", response_model=AgentDetailResponse)
async def get_agent(
    agent_id: str,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent).where((Agent.id == agent_id) & (Agent.organization_id == current_org.id))
    )
    agent = result.scalars().first()
    if not agent and (agent_id.startswith("agent-") or agent_id == "demo-agent"):
        fallback_res = await db.execute(
            select(Agent).where(Agent.organization_id == current_org.id).order_by(Agent.created_at.asc())
        )
        agent = fallback_res.scalars().first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent bulunamadı")
    return agent

@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    agent_in: AgentUpdate,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent).where((Agent.id == agent_id) & (Agent.organization_id == current_org.id))
    )
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent bulunamadı")

    if agent_in.name is not None:
        agent.name = agent_in.name
    if agent_in.role is not None:
        agent.role = agent_in.role
    if agent_in.description is not None:
        agent.description = agent_in.description
    if agent_in.system_instructions is not None:
        agent.system_instructions = agent_in.system_instructions
    if agent_in.status is not None:
        agent.status = agent_in.status
    if agent_in.model_config_data is not None:
        agent.model_config_data = agent_in.model_config_data
    if agent_in.tool_permissions is not None:
        agent.tool_permissions = agent_in.tool_permissions

    await db.commit()
    await db.refresh(agent)
    return agent

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent).where((Agent.id == agent_id) & (Agent.organization_id == current_org.id))
    )
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent bulunamadı")

    await db.delete(agent)
    await db.commit()
    return {"message": "Agent başarıyla silindi"}

@router.get("/{agent_id}/messages", response_model=List[AgentMessageResponse])
async def get_agent_messages(
    agent_id: str,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(AgentMessage)
        .where((AgentMessage.agent_id == agent_id) & (AgentMessage.organization_id == current_org.id))
        .order_by(AgentMessage.created_at)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{agent_id}/chat")
async def chat_with_agent(
    agent_id: str,
    message_in: AgentMessageCreate,
    current_org: Organization = Depends(get_current_organization),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent).where((Agent.id == agent_id) & (Agent.organization_id == current_org.id))
    )
    agent = result.scalars().first()
    if not agent and (agent_id.startswith("agent-") or agent_id == "demo-agent"):
        fallback_res = await db.execute(
            select(Agent).where(Agent.organization_id == current_org.id).order_by(Agent.created_at.asc())
        )
        agent = fallback_res.scalars().first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent bulunamadı")

    # 1. Save user message to database
    user_msg = AgentMessage(
        organization_id=current_org.id,
        agent_id=agent.id,
        role="user",
        content=message_in.content
    )
    db.add(user_msg)
    await db.commit()

    # 2. Build context
    context_builder = ContextBuilder(db)
    built_context = await context_builder.build_context(agent, current_task_prompt=message_in.content)

    async def event_generator():
        runtime = OpenClawRuntimeAdapter()
        full_assistant_reply = ""
        
        async for event in runtime.stream(agent.id, task_id="chat-turn", prompt=message_in.content, context=built_context):
            if event.get("type") == "assistant_text":
                full_assistant_reply += event.get("content", "")
            yield f"data: {json.dumps(event)}\n\n"

        # Save assistant message to database asynchronously
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            assistant_msg = AgentMessage(
                organization_id=current_org.id,
                agent_id=agent.id,
                role="assistant",
                content=full_assistant_reply or "İşlem tamamlandı."
            )
            session.add(assistant_msg)
            await session.commit()

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)
