import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String, nullable=False)
    status = Column(String, default="queued", index=True) # queued, running, waiting, completed, failed, cancelled
    priority = Column(String, default="normal") # low, normal, high, urgent
    input_prompt = Column(Text, nullable=False)
    input_data = Column(JSON, nullable=True)
    output_result = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    artifacts = Column(JSON, default=list) # generated files list
    created_at = Column(DateTime(timezone=True), default=utc_now)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="tasks")
    agent = relationship("Agent", back_populates="tasks")
    executions = relationship("TaskExecution", back_populates="task", cascade="all, delete-orphan")

class TaskExecution(Base):
    __tablename__ = "task_executions"

    id = Column(String, primary_key=True, default=generate_uuid)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, default=1)
    step_type = Column(String, nullable=False) # thought, tool_call, tool_result, llm_inference, artifact
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    status = Column(String, default="running") # running, success, failed
    created_at = Column(DateTime(timezone=True), default=utc_now)

    task = relationship("Task", back_populates="executions")
