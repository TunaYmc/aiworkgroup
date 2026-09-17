from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseTool(ABC):
    """Abstract base class for all platform tools."""
    name: str
    description: str
    parameters_schema: Dict[str, Any]

    @abstractmethod
    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the tool with given parameters and tenant execution context.
        Context contains: organization_id, agent_id, workspace_path, tool_permissions.
        """
        pass
