from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    full_name: Optional[str] = None
    organization_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, description="User email address")
    password: str = Field(..., min_length=1, description="User password")

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    current_organization_id: Optional[str] = None

class TokenPayload(BaseModel):
    sub: str
    org_id: Optional[str] = None
    exp: Optional[int] = None
