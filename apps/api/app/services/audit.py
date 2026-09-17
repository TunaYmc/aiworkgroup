from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog, UsageRecord

class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        organization_id: str,
        action: str,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            agent_id=agent_id,
            action=action,
            details=details or {},
            ip_address=ip_address
        )
        db.add(log_entry)
        await db.commit()
        return log_entry

    @staticmethod
    async def track_usage(
        db: AsyncSession,
        organization_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        agent_id: Optional[str] = None,
        task_id: Optional[str] = None,
        latency_ms: float = 0.0,
        estimated_cost_usd: float = 0.0
    ) -> UsageRecord:
        record = UsageRecord(
            organization_id=organization_id,
            agent_id=agent_id,
            task_id=task_id,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            latency_ms=latency_ms,
            estimated_cost_usd=estimated_cost_usd
        )
        db.add(record)
        await db.commit()
        return record
