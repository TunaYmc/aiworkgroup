import os
import glob
from typing import Dict, Any
from app.services.tools.base import BaseTool

def _resolve_safe_path(requested_path: str, workspace_path: str) -> str:
    """
    Guarantees that the requested path strictly resides within the agent's sandboxed workspace.
    Prevents path traversal attacks (e.g. '../../etc/passwd').
    """
    os.makedirs(workspace_path, exist_ok=True)
    abs_workspace = os.path.abspath(workspace_path)
    # If path is relative, join with workspace
    if not os.path.isabs(requested_path):
        target = os.path.abspath(os.path.join(abs_workspace, requested_path))
    else:
        target = os.path.abspath(requested_path)

    # Verify containment
    if not (target == abs_workspace or target.startswith(abs_workspace + os.sep)):
        raise PermissionError(
            f"Sandbox Violation: Path '{requested_path}' escapes the agent workspace directory '{workspace_path}'."
        )
    return target

class ListFilesTool(BaseTool):
    name = "list_files"
    description = "List all files and directories in the agent workspace or specified subdirectory."
    parameters_schema = {
        "type": "object",
        "properties": {
            "subpath": {"type": "string", "description": "Optional subdirectory path relative to workspace root", "default": "."}
        }
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        workspace = context.get("workspace_path", "/tmp/sandbox")
        subpath = params.get("subpath", ".")
        target_dir = _resolve_safe_path(subpath, workspace)

        if not os.path.exists(target_dir):
            return {"error": f"Directory '{subpath}' does not exist."}

        entries = []
        for item in os.listdir(target_dir):
            item_path = os.path.join(target_dir, item)
            entries.append({
                "name": item,
                "is_dir": os.path.isdir(item_path),
                "size_bytes": os.path.getsize(item_path) if os.path.isfile(item_path) else 0
            })
        return {"directory": subpath, "entries": entries, "count": len(entries)}

class FileReadTool(BaseTool):
    name = "file_read"
    description = "Read the text contents of a file inside the agent workspace."
    parameters_schema = {
        "type": "object",
        "properties": {
            "filepath": {"type": "string", "description": "Path to the file relative to workspace root"}
        },
        "required": ["filepath"]
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        workspace = context.get("workspace_path", "/tmp/sandbox")
        filepath = params.get("filepath", "")
        if not filepath:
            return {"error": "filepath parameter is required"}

        safe_path = _resolve_safe_path(filepath, workspace)
        if not os.path.isfile(safe_path):
            return {"error": f"File '{filepath}' not found."}

        try:
            with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read(100000) # 100KB limit
            return {"filepath": filepath, "content": content}
        except Exception as e:
            return {"error": f"Failed to read file: {str(e)}"}

class FileWriteTool(BaseTool):
    name = "file_write"
    description = "Write or overwrite text content to a file inside the agent workspace."
    parameters_schema = {
        "type": "object",
        "properties": {
            "filepath": {"type": "string", "description": "Path to the file relative to workspace root"},
            "content": {"type": "string", "description": "Text content to write"}
        },
        "required": ["filepath", "content"]
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        workspace = context.get("workspace_path", "/tmp/sandbox")
        filepath = params.get("filepath", "")
        content = params.get("content", "")

        safe_path = _resolve_safe_path(filepath, workspace)
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)

        try:
            with open(safe_path, "w", encoding="utf-8") as f:
                f.write(content)
            return {
                "filepath": filepath,
                "bytes_written": len(content.encode("utf-8")),
                "status": "success"
            }
        except Exception as e:
            return {"error": f"Failed to write file: {str(e)}"}

class FileSearchTool(BaseTool):
    name = "file_search"
    description = "Search for files matching a pattern or containing query text in the workspace."
    parameters_schema = {
        "type": "object",
        "properties": {
            "pattern": {"type": "string", "description": "Glob pattern (e.g. *.txt, **/*.py)", "default": "*"},
            "query": {"type": "string", "description": "Optional text query to search inside files", "default": ""}
        }
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        workspace = context.get("workspace_path", "/tmp/sandbox")
        pattern = params.get("pattern", "*")
        query = params.get("query", "").lower()

        os.makedirs(workspace, exist_ok=True)
        results = []

        for root, _, files in os.walk(workspace):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, workspace)
                
                if query:
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                            text = f.read()
                            if query in text.lower():
                                results.append({"file": rel_path, "matched": True})
                    except Exception:
                        continue
                else:
                    results.append({"file": rel_path})

        return {"results": results[:50], "total_matches": len(results)}
