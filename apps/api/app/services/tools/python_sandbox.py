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

        existing_files = set(os.listdir(workspace)) if os.path.exists(workspace) else set()

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
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=20.0)
                stdout_str = stdout.decode("utf-8", errors="replace")
                stderr_str = stderr.decode("utf-8", errors="replace")

                # Auto-sync any created/modified files to UI Documents and MinIO
                created_files = []
                org_id = context.get("organization_id")
                agent_id = context.get("agent_id")
                current_files = set(os.listdir(workspace))
                new_files = current_files - existing_files

                if org_id and new_files:
                    try:
                        from app.core.database import AsyncSessionLocal
                        from app.models.agent import AgentFile
                        from app.services.storage import storage_service
                        from sqlalchemy import select
                        import hashlib, uuid, mimetypes, io

                        async with AsyncSessionLocal() as db:
                            for f_name in new_files:
                                if f_name.startswith(("_", ".")) or f_name == "_tmp_exec.py":
                                    continue
                                full_f_path = os.path.join(workspace, f_name)
                                if not os.path.isfile(full_f_path):
                                    continue

                                with open(full_f_path, "rb") as f_bin:
                                    file_bytes = f_bin.read()

                                f_size = len(file_bytes)
                                checksum = hashlib.sha256(file_bytes).hexdigest()
                                m_type = mimetypes.guess_type(f_name)[0] or "application/octet-stream"

                                stmt = select(AgentFile).where(
                                    (AgentFile.organization_id == org_id) & (AgentFile.filename == f_name)
                                )
                                res = await db.execute(stmt)
                                existing = res.scalars().first()

                                if not existing:
                                    new_file = AgentFile(
                                        organization_id=org_id,
                                        agent_id=agent_id,
                                        filename=f_name,
                                        mime_type=m_type,
                                        size=f_size,
                                        storage_key=f"gen_{uuid.uuid4()}_{f_name}",
                                        checksum=checksum,
                                        status="ready"
                                    )
                                    db.add(new_file)
                                    await db.commit()
                                    try:
                                        storage_service.upload_file(io.BytesIO(file_bytes), new_file.storage_key, m_type)
                                    except Exception:
                                        pass
                                else:
                                    existing.size = f_size
                                    existing.checksum = checksum
                                    existing.mime_type = m_type
                                    await db.commit()
                                    try:
                                        storage_service.upload_file(io.BytesIO(file_bytes), existing.storage_key, m_type)
                                    except Exception:
                                        pass
                                created_files.append(f_name)
                    except Exception as sync_ex:
                        pass

                return {
                    "exit_code": proc.returncode,
                    "stdout": stdout_str[:10000],
                    "stderr": stderr_str[:10000],
                    "created_files": created_files,
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
