from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class UsageSummaryResponse(BaseModel):
    total_tokens: int
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    period: str
    by_model: Dict[str, int]
    by_agent: Dict[str, int]

class AuditLogResponse(BaseModel):
    id: str
    organization_id: str
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    action: str
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
