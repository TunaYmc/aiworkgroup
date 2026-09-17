from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_organization
from app.models.tenant import Organization
from app.models.audit import UsageRecord
from app.schemas.usage import UsageSummaryResponse

router = APIRouter(prefix="/usage", tags=["Usage"])

@router.get("/summary", response_model=UsageSummaryResponse)
async def get_usage_summary(
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    # Total tokens and cost
    totals = await db.execute(
        select(
            func.coalesce(func.sum(UsageRecord.total_tokens), 0),
            func.coalesce(func.sum(UsageRecord.input_tokens), 0),
            func.coalesce(func.sum(UsageRecord.output_tokens), 0),
            func.coalesce(func.sum(UsageRecord.estimated_cost_usd), 0.0)
        ).where(UsageRecord.organization_id == current_org.id)
    )
    total_tokens, input_tokens, output_tokens, total_cost = totals.first()

    # By model
    model_breakdown = await db.execute(
        select(
            UsageRecord.model,
            func.sum(UsageRecord.total_tokens)
        ).where(UsageRecord.organization_id == current_org.id)
        .group_by(UsageRecord.model)
    )
    by_model = {row[0]: int(row[1]) for row in model_breakdown.all()}

    # By agent
    agent_breakdown = await db.execute(
        select(
            func.coalesce(UsageRecord.agent_id, "System"),
            func.sum(UsageRecord.total_tokens)
        ).where(UsageRecord.organization_id == current_org.id)
        .group_by(UsageRecord.agent_id)
    )
    by_agent = {row[0]: int(row[1]) for row in agent_breakdown.all()}

    return UsageSummaryResponse(
        total_tokens=int(total_tokens),
        input_tokens=int(input_tokens),
        output_tokens=int(output_tokens),
        estimated_cost_usd=float(total_cost),
        period="Bu Ay",
        by_model=by_model,
        by_agent=by_agent
    )
