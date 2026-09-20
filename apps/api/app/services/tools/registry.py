from typing import Dict, Any, List, Optional
from app.services.tools.base import BaseTool
from app.services.tools.filesystem import ListFilesTool, FileReadTool, FileWriteTool, FileSearchTool
from app.services.tools.python_sandbox import PythonSandboxTool
from app.services.tools.web_search import WebSearchTool
from app.services.tools.knowledge import SearchKnowledgeTool, ReadDocumentTool
from app.services.tools.browser import BrowserAgentTool

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        # Register standard tools
        for tool in [
            ListFilesTool(),
            FileReadTool(),
            FileWriteTool(),
            FileSearchTool(),
            SearchKnowledgeTool(),
            ReadDocumentTool(),
            PythonSandboxTool(),
            WebSearchTool(),
            BrowserAgentTool(),
        ]:
            self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def list_tools(self) -> List[BaseTool]:
        return list(self._tools.values())

    def get_openai_tools_schema(self, allowed_tools: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Converts tool definitions into OpenAI / OpenRouter function calling schema.
        """
        effective_allowed = None
        if allowed_tools is not None:
            effective_allowed = list(allowed_tools)
            if "file_read" in allowed_tools or "file_search" in allowed_tools:
                if "search_knowledge" not in effective_allowed:
                    effective_allowed.append("search_knowledge")
                if "read_document" not in effective_allowed:
                    effective_allowed.append("read_document")

        schemas = []
        for name, tool in self._tools.items():
            if effective_allowed is not None and name not in effective_allowed:
                continue
            schemas.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters_schema
                }
            })
        return schemas

    async def execute_tool(
        self,
        tool_name: str,
        params: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes a tool after strictly enforcing authorization.
        """
        tool_perms = context.get("tool_permissions", {})
        allowed = tool_perms.get("allowed_tools")
        denied = tool_perms.get("denied_tools", [])

        # Strict Backend Authorization: LLM cannot bypass this
        if tool_name in denied:
            raise PermissionError(f"Tool '{tool_name}' is explicitly denied for this agent.")

        if allowed is not None:
            effective_allowed = list(allowed)
            if "file_read" in allowed or "file_search" in allowed:
                effective_allowed.extend(["search_knowledge", "read_document"])
            if tool_name not in effective_allowed:
                raise PermissionError(f"Tool '{tool_name}' is not in the allowed tools list for this agent.")

        tool = self.get_tool(tool_name)
        if not tool:
            raise ValueError(f"Tool '{tool_name}' is not registered.")

        return await tool.execute(params, context)

tool_registry = ToolRegistry()
