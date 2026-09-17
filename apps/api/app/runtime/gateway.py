import asyncio
import json
import logging
import uuid
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from app.services.openrouter import OpenRouterService

logger = logging.getLogger("openclaw-gateway")

gateway_app = FastAPI(
    title="OpenClaw Agent Runtime Gateway",
    description="Official OpenClaw External Application Gateway for Sandboxed Agent Orchestration",
    version="1.0.0"
)

# In-memory session and agent registry for runtime harness
AGENTS_REGISTRY: Dict[str, Dict[str, Any]] = {}
SESSIONS_REGISTRY: Dict[str, Dict[str, Any]] = {}
ACTIVE_TASKS: Dict[str, asyncio.Task] = {}

class AgentRegisterPayload(BaseModel):
    agent_id: str
    organization_id: str
    workspace: str
    system_prompt: str
    model: str
    tool_permissions: Optional[Dict[str, Any]] = None
    resource_limits: Optional[Dict[str, Any]] = None

class CreateSessionPayload(BaseModel):
    agent_id: str
    task_id: str
    prompt: str
    context: Dict[str, Any]

@gateway_app.get("/health")
async def health():
    return {"status": "healthy", "service": "openclaw-gateway", "active_sessions": len(ACTIVE_TASKS)}

@gateway_app.post("/v1/agents")
async def register_agent(payload: AgentRegisterPayload):
    AGENTS_REGISTRY[payload.agent_id] = payload.model_dump()
    return {"status": "registered", "agent_id": payload.agent_id}

@gateway_app.get("/v1/agents/{agent_id}/status")
async def get_agent_status(agent_id: str):
    if agent_id not in AGENTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Agent not registered in OpenClaw gateway")
    return {
        "agent_id": agent_id,
        "status": "active",
        "harness": "openclaw-v1",
        "sandboxed": True,
        "active_tasks": [s_id for s_id, s in SESSIONS_REGISTRY.items() if s.get("agent_id") == agent_id and s.get("status") == "running"]
    }

@gateway_app.delete("/v1/agents/{agent_id}")
async def unregister_agent(agent_id: str):
    AGENTS_REGISTRY.pop(agent_id, None)
    return {"status": "unregistered", "agent_id": agent_id}

@gateway_app.post("/v1/sessions")
async def create_session(payload: CreateSessionPayload):
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    SESSIONS_REGISTRY[session_id] = {
        "session_id": session_id,
        "agent_id": payload.agent_id,
        "task_id": payload.task_id,
        "prompt": payload.prompt,
        "context": payload.context,
        "status": "queued",
        "events_queue": asyncio.Queue()
    }
    return {"session_id": session_id, "status": "queued"}

async def _run_agent_session_loop(session_id: str):
    session = SESSIONS_REGISTRY.get(session_id)
    if not session:
        return
    queue: asyncio.Queue = session["events_queue"]
    session["status"] = "running"

    openrouter = OpenRouterService()
    context = session["context"]
    messages = context.get("messages", [])
    model = context.get("model", "anthropic/claude-3.7-sonnet")

    try:
        async for event in openrouter.run_tool_execution_loop(messages, model, context):
            await queue.put(event)
            if event.get("type") == "done":
                session["status"] = event.get("status", "completed")
                break
    except asyncio.CancelledError:
        session["status"] = "cancelled"
        await queue.put({"type": "done", "status": "cancelled"})
        raise
    except Exception as ex:
        session["status"] = "failed"
        logger.exception(f"Session {session_id} failed: {ex}")
        await queue.put({"type": "error", "message": str(ex)})
        await queue.put({"type": "done", "status": "failed"})
    finally:
        ACTIVE_TASKS.pop(session_id, None)

@gateway_app.get("/v1/sessions/{session_id}/stream")
async def stream_session(session_id: str):
    session = SESSIONS_REGISTRY.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Start background execution if not started
    if session_id not in ACTIVE_TASKS and session["status"] == "queued":
        task = asyncio.create_task(_run_agent_session_loop(session_id))
        ACTIVE_TASKS[session_id] = task

    queue: asyncio.Queue = session["events_queue"]

    async def event_generator():
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=60.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") == "done":
                    break
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'ping'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@gateway_app.post("/v1/sessions/{session_id}/cancel")
async def cancel_session(session_id: str):
    session = SESSIONS_REGISTRY.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    task = ACTIVE_TASKS.get(session_id)
    if task and not task.done():
        task.cancel()
        session["status"] = "cancelled"
        return {"status": "cancelling", "session_id": session_id}
    return {"status": session.get("status", "completed"), "session_id": session_id}
