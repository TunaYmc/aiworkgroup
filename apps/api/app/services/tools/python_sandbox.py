import asyncio
import os
import sys
from typing import Dict, Any
from app.services.tools.base import BaseTool

class PythonSandboxTool(BaseTool):
    name = "python"
    description = "Execute Python code in an isolated subprocess inside the agent workspace."
    parameters_schema = {
        "type": "object",
        "properties": {
            "code": {"type": "string", "description": "Python source code to execute"}
        },
        "required": ["code"]
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        workspace = context.get("workspace_path", "/tmp/sandbox")
        code = params.get("code", "")
        if not code.strip():
            return {"error": "code parameter cannot be empty"}

        os.makedirs(workspace, exist_ok=True)
        script_path = os.path.join(workspace, "_tmp_exec.py")

        try:
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)

            # Run in isolated subprocess with workspace as cwd and 15s timeout
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                script_path,
                cwd=workspace,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={"PYTHONPATH": workspace, "PATH": os.environ.get("PATH", "")}
            )

            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15.0)
                stdout_str = stdout.decode("utf-8", errors="replace")
                stderr_str = stderr.decode("utf-8", errors="replace")
                return {
                    "exit_code": proc.returncode,
                    "stdout": stdout_str[:10000],
                    "stderr": stderr_str[:10000],
                    "success": proc.returncode == 0
                }
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                return {"error": "Execution timed out (limit: 15s)", "success": False}
        except Exception as e:
            return {"error": f"Failed to run code: {str(e)}", "success": False}
        finally:
            if os.path.exists(script_path):
                try:
                    os.remove(script_path)
                except Exception:
                    pass
