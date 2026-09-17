from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_organization
from app.models.tenant import Organization
from app.models.audit import AuditLog
from app.schemas.usage import AuditLogResponse

router = APIRouter(prefix="/logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(AuditLog)
        .where(AuditLog.organization_id == current_org.id)
        .order_by(desc(AuditLog.timestamp))
        .limit(100)
    )
    result = await db.execute(query)
    return result.scalars().all()
