import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(String, default="General Assistant") # e.g. Sales, Accounting, HR, Operations, Support
    description = Column(Text, nullable=True)
    system_instructions = Column(Text, nullable=False)
    status = Column(String, default="active") # active, paused, archived
    
    # Model configuration (OpenRouter compatible: primary_model, fallback_models, temp, max_tokens, etc.)
    model_config_data = Column(JSON, default=lambda: {
        "primary_model": "anthropic/claude-3.7-sonnet",
        "fallback_models": ["openai/gpt-4o-mini"],
        "temperature": 0.3,
        "max_tokens": 4096,
        "reasoning": {"enabled": False}
    })

    # Tool permissions: list of allowed/denied tools
    tool_permissions = Column(JSON, default=lambda: {
        "allowed_tools": ["file_search", "file_read", "file_write", "list_files", "python", "web_search", "browser"],
        "denied_tools": ["arbitrary_host_exec"]
    })

    workspace_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    organization = relationship("Organization", back_populates="agents")
    runs = relationship("AgentRun", back_populates="agent", cascade="all, delete-orphan")
    messages = relationship("AgentMessage", back_populates="agent", cascade="all, delete-orphan")
    memories = relationship("AgentMemory", back_populates="agent", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="agent", cascade="all, delete-orphan")
    files = relationship("AgentFile", back_populates="agent")

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String, default="running") # running, completed, failed, cancelled
    model = Column(String, nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    agent = relationship("Agent", back_populates="runs")
    messages = relationship("AgentMessage", back_populates="run", cascade="all, delete-orphan")

class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    run_id = Column(String, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=True, index=True)
    role = Column(String, nullable=False) # system, user, assistant, tool
    content = Column(Text, nullable=False)
    tool_calls = Column(JSON, nullable=True)
    tool_call_id = Column(String, nullable=True)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    agent = relationship("Agent", back_populates="messages")
    run = relationship("AgentRun", back_populates="messages")

class AgentMemory(Base):
    __tablename__ = "agent_memories"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    memory_type = Column(String, default="long_term") # short_term, long_term
    content = Column(Text, nullable=False)
    importance = Column(Integer, default=1) # 1 to 5
    created_at = Column(DateTime(timezone=True), default=utc_now)

    agent = relationship("Agent", back_populates="memories")

class AgentContextSnapshot(Base):
    __tablename__ = "agent_context_snapshots"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    summary = Column(Text, nullable=False)
    snapshot_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class AgentFile(Base):
    __tablename__ = "agent_files"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    storage_key = Column(String, nullable=False, unique=True)
    checksum = Column(String, nullable=True)
    status = Column(String, default="processing") # processing, ready, failed
    created_at = Column(DateTime(timezone=True), default=utc_now)

    organization = relationship("Organization", back_populates="files")
    agent = relationship("Agent", back_populates="files")
