from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class OrganizationCreate(BaseModel):
    name: str

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    monthly_token_limit: Optional[Dict[str, Any]] = None
    monthly_budget_usd: Optional[Dict[str, Any]] = None

class MemberResponse(BaseModel):
    id: str
    user_id: str
    organization_id: str
    role: str
    created_at: datetime
    email: Optional[str] = None
    full_name: Optional[str] = None

    class Config:
        from_attributes = True

class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    monthly_token_limit: Dict[str, Any]
    monthly_budget_usd: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
