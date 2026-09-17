from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class TaskCreate(BaseModel):
    title: str
    input_prompt: str
    priority: str = "normal"
    input_data: Optional[Dict[str, Any]] = None

class TaskExecutionResponse(BaseModel):
    id: str
    task_id: str
    step_number: int
    step_type: str
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TaskResponse(BaseModel):
    id: str
    organization_id: str
    agent_id: str
    user_id: Optional[str] = None
    title: str
    status: str
    priority: str
    input_prompt: str
    input_data: Optional[Dict[str, Any]] = None
    output_result: Optional[str] = None
    error_message: Optional[str] = None
    artifacts: List[Any] = []
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TaskDetailResponse(TaskResponse):
    executions: List[TaskExecutionResponse] = []
