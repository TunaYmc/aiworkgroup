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
    description = "List all files and directories in the agent workspace or specified subdirectory (including uploaded company documents)."
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

        entries = []
        if os.path.exists(target_dir):
            for item in os.listdir(target_dir):
                item_path = os.path.join(target_dir, item)
                entries.append({
                    "name": item,
                    "is_dir": os.path.isdir(item_path),
                    "size_bytes": os.path.getsize(item_path) if os.path.isfile(item_path) else 0
                })

        # If listing root, also surface files in documents/ folder
        docs_dir = os.path.join(workspace, "documents")
        if subpath in (".", "") and os.path.exists(docs_dir):
            for item in os.listdir(docs_dir):
                item_path = os.path.join(docs_dir, item)
                if os.path.isfile(item_path):
                    entries.append({
                        "name": f"documents/{item}",
                        "is_dir": False,
                        "size_bytes": os.path.getsize(item_path)
                    })

        return {"directory": subpath, "entries": entries, "count": len(entries)}

class FileReadTool(BaseTool):
    name = "file_read"
    description = "Read the text contents of a file inside the agent workspace or company documents (supports PDF, DOCX, XLSX, TXT)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "filepath": {"type": "string", "description": "Path or name of the file to read"}
        },
        "required": ["filepath"]
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        workspace = context.get("workspace_path", "/tmp/sandbox")
        filepath = params.get("filepath", "").strip()
        if not filepath:
            return {"error": "filepath parameter is required"}

        # Candidate paths to locate file
        base_name = os.path.basename(filepath)
        clean_stem = os.path.splitext(base_name)[0]
        candidates = [
            _resolve_safe_path(filepath, workspace),
            os.path.join(workspace, "documents", filepath),
            os.path.join(workspace, "documents", base_name),
            os.path.join(workspace, "documents", f"{clean_stem}.txt"),
            os.path.join(workspace, f"{clean_stem}.txt"),
        ]

        found_path = None
        for cand in candidates:
            if os.path.isfile(cand):
                found_path = cand
                break

        if not found_path:
            # Check tenant documents directory
            org_id = context.get("organization_id")
            if org_id:
                from app.core.config import settings
                tenant_cand = os.path.join(settings.DEFAULT_WORKSPACE_ROOT, org_id, "documents", base_name)
                tenant_txt = os.path.join(settings.DEFAULT_WORKSPACE_ROOT, org_id, "documents", f"{clean_stem}.txt")
                if os.path.isfile(tenant_cand):
                    found_path = tenant_cand
                elif os.path.isfile(tenant_txt):
                    found_path = tenant_txt

        if not found_path:
            return {"error": f"File '{filepath}' not found in workspace or company documents."}

        try:
            lower_name = found_path.lower()
            if lower_name.endswith((".pdf", ".docx", ".xlsx", ".pptx")):
                from app.services.parsers.factory import parser_factory
                with open(found_path, "rb") as f_bin:
                    parse_res = parser_factory.get_parser(found_path).parse(f_bin.read(), os.path.basename(found_path))
                return {
                    "filepath": filepath,
                    "content": parse_res.get("full_text", "")[:100000],
                    "metadata": parse_res.get("metadata", {})
                }
            else:
                with open(found_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read(100000)
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
