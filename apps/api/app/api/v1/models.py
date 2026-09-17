from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_organization
from app.models.tenant import Organization
from app.models.agent import Agent
from app.schemas.model import ModelCatalogItem, ModelConfigUpdate
from app.services.openrouter import OpenRouterService

router = APIRouter(prefix="/models", tags=["Models"])

@router.get("/catalog", response_model=List[ModelCatalogItem])
async def get_model_catalog():
    return OpenRouterService.get_catalog()

@router.patch("/agent/{agent_id}", response_model=dict)
async def update_agent_model_config(
    agent_id: str,
    config_in: ModelConfigUpdate,
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

    agent.model_config_data = {
        "primary_model": config_in.primary_model,
        "fallback_models": config_in.fallback_models,
        "temperature": config_in.temperature,
        "max_tokens": config_in.max_tokens,
        "reasoning": config_in.reasoning or {"enabled": False}
    }
    await db.commit()
    return {"message": "Model yapılandırması güncellendi", "model_config": agent.model_config_data}
