from typing import Dict, Any, AsyncGenerator, Optional
from app.runtime.base import AgentRuntime

class MockRuntimeAdapter(AgentRuntime):
    """
    Explicit test-only mock adapter for unit tests without network or filesystem calls.
    """
    async def create_agent(self, agent_id: str, organization_id: str, config: Dict[str, Any]) -> bool:
        return True

    async def execute(self, agent_id: str, task_id: str, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        return {"task_id": task_id, "status": "completed", "output": "mock output", "artifacts": []}

    async def stream(self, agent_id: str, task_id: str, prompt: str, context: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"type": "assistant_text", "content": "mock response"}
        yield {"type": "done", "status": "completed"}

    async def stop(self, agent_id: str, task_id: Optional[str] = None) -> bool:
        return True

    async def get_status(self, agent_id: str) -> Dict[str, Any]:
        return {"agent_id": agent_id, "status": "mock"}

    async def destroy(self, agent_id: str) -> bool:
        return True

    async def health_check(self) -> bool:
        return True
