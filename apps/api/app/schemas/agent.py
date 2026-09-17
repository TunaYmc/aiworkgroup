from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AgentCreate(BaseModel):
    name: str
    role: str = "General Assistant"
    description: Optional[str] = None
    system_instructions: str
    model_config_data: Optional[Dict[str, Any]] = None
    tool_permissions: Optional[Dict[str, Any]] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    system_instructions: Optional[str] = None
    status: Optional[str] = None
    model_config_data: Optional[Dict[str, Any]] = None
    tool_permissions: Optional[Dict[str, Any]] = None

class AgentMessageCreate(BaseModel):
    content: str
    role: str = "user"

class AgentMessageResponse(BaseModel):
    id: str
    agent_id: str
    role: str
    content: str
    tool_calls: Optional[Any] = None
    tool_call_id: Optional[str] = None
    token_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class AgentResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    role: str
    description: Optional[str] = None
    system_instructions: str
    status: str
    model_config_data: Dict[str, Any]
    tool_permissions: Dict[str, Any]
    workspace_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AgentDetailResponse(AgentResponse):
    active_tasks_count: int = 0
    total_files_count: int = 0
