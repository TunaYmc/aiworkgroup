from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncGenerator, Optional, List

class AgentRuntime(ABC):
    """
    Abstract Agent Runtime interface allowing complete decoupling from underlying harness (OpenClaw, Hermes, Native).
    """

    @abstractmethod
    async def create_agent(self, agent_id: str, organization_id: str, config: Dict[str, Any]) -> bool:
        """Create or configure an isolated agent environment in the runtime harness."""
        pass

    @abstractmethod
    async def execute(self, agent_id: str, task_id: str, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a task synchronously/blocking in the harness."""
        pass

    @abstractmethod
    async def stream(self, agent_id: str, task_id: str, prompt: str, context: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream thoughts, tool calls, tool results, and responses from the harness."""
        pass

    @abstractmethod
    async def stop(self, agent_id: str, task_id: Optional[str] = None) -> bool:
        """Stop/cancel a running agent execution."""
        pass

    @abstractmethod
    async def get_status(self, agent_id: str) -> Dict[str, Any]:
        """Get the current execution status and resource metrics of the agent."""
        pass

    @abstractmethod
    async def destroy(self, agent_id: str) -> bool:
        """Tear down and clean up agent workspace and runtime instance."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if runtime daemon/harness is healthy."""
        pass
