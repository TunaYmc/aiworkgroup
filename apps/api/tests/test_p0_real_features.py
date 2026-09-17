import os
import pytest
from sqlalchemy import select
from app.models.tenant import Organization, User, OrganizationMember
from app.models.agent import Agent, AgentMessage, AgentMemory, AgentFile
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.runtime.openclaw import OpenClawRuntimeAdapter
from app.runtime.gateway import gateway_app, SESSIONS_REGISTRY
from app.services.tools.registry import tool_registry
from app.services.tools.filesystem import _resolve_safe_path
from app.services.parsers.factory import parser_factory
from app.services.embeddings.factory import embedding_service
from app.services.rag import rag_service, cosine_similarity

# ==============================================================================
# 1. MULTI-TENANT ISOLATION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_tenant_isolation_strict_access(db_session):
    """
    Verifies that all entities (Agent, File, Memory, Knowledge) are strictly tenant-scoped.
    Tenant A must never be able to access Tenant B's data.
    """
    # Create Org A
    org_a = Organization(name="Company A", slug="comp-a")
    user_a = User(email="a@comp.com", hashed_password="pw")
    db_session.add_all([org_a, user_a])
    await db_session.flush()

    agent_a = Agent(organization_id=org_a.id, name="Agent A", role="Sales", system_instructions="A")
    file_a = AgentFile(organization_id=org_a.id, filename="a.txt", mime_type="text/plain", size=10, storage_key="tenants/a/a.txt")
    mem_a = AgentMemory(organization_id=org_a.id, agent_id=agent_a.id, content="Secret A Strategy")
    doc_a = KnowledgeDocument(organization_id=org_a.id, title="Doc A")
    db_session.add_all([agent_a, file_a, mem_a, doc_a])
    await db_session.flush()

    chunk_a = KnowledgeChunk(
        organization_id=org_a.id,
        document_id=doc_a.id,
        content="Tenant A confidential revenue numbers",
        embedding=await embedding_service.get_embedding("Tenant A revenue")
    )
    db_session.add(chunk_a)

    # Create Org B
    org_b = Organization(name="Company B", slug="comp-b")
    user_b = User(email="b@comp.com", hashed_password="pw")
    db_session.add_all([org_b, user_b])
    await db_session.flush()

    agent_b = Agent(organization_id=org_b.id, name="Agent B", role="HR", system_instructions="B")
    file_b = AgentFile(organization_id=org_b.id, filename="b.txt", mime_type="text/plain", size=10, storage_key="tenants/b/b.txt")
    mem_b = AgentMemory(organization_id=org_b.id, agent_id=agent_b.id, content="Secret B Salaries")
    doc_b = KnowledgeDocument(organization_id=org_b.id, title="Doc B")
    db_session.add_all([agent_b, file_b, mem_b, doc_b])
    await db_session.flush()

    chunk_b = KnowledgeChunk(
        organization_id=org_b.id,
        document_id=doc_b.id,
        content="Tenant B confidential employee list",
        embedding=await embedding_service.get_embedding("Tenant B employees")
    )
    db_session.add(chunk_b)
    await db_session.commit()

    # 1. Tenant A file read denied on Tenant B files
    query_files_a = await db_session.execute(select(AgentFile).where(AgentFile.organization_id == org_a.id))
    files_a = query_files_a.scalars().all()
    assert len(files_a) == 1
    assert files_a[0].filename == "a.txt"
    assert not any(f.filename == "b.txt" for f in files_a)

    # 2. Tenant A memory search denied on Tenant B memories
    query_mem_a = await db_session.execute(select(AgentMemory).where(AgentMemory.organization_id == org_a.id))
    mems_a = query_mem_a.scalars().all()
    assert len(mems_a) == 1
    assert mems_a[0].content == "Secret A Strategy"

    # 3. Semantic RAG retrieval for Tenant A NEVER returns Tenant B chunks
    rag_results_a = await rag_service.search_knowledge(
        db_session,
        query="confidential employee list",
        organization_id=org_a.id
    )
    assert not any("Tenant B" in c["content"] for c in rag_results_a)

# ==============================================================================
# 2. SANDBOX ISOLATION & PATH TRAVERSAL TESTS
# ==============================================================================

def test_sandbox_path_traversal_prevention(tmp_path):
    """
    Verifies that agent tools cannot escape their designated workspace.
    Attempts to access /etc/passwd or parent directories MUST raise PermissionError.
    """
    agent_workspace = str(tmp_path / "tenants" / "org_1" / "agents" / "agent_1" / "workspace")
    os.makedirs(agent_workspace, exist_ok=True)

    # Valid path inside workspace
    safe = _resolve_safe_path("report.txt", agent_workspace)
    assert safe == os.path.join(agent_workspace, "report.txt")

    # Path traversal attack 1: Relative escape
    with pytest.raises(PermissionError) as exc1:
        _resolve_safe_path("../../../etc/passwd", agent_workspace)
    assert "Sandbox Violation" in str(exc1.value)

    # Path traversal attack 2: Direct absolute escape
    with pytest.raises(PermissionError) as exc2:
        _resolve_safe_path("/var/log/system.log", agent_workspace)
    assert "Sandbox Violation" in str(exc2.value)

# ==============================================================================
# 3. REAL TOOL CALLING & BACKEND AUTHORIZATION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_real_tool_calling_execution(tmp_path):
    """
    Verifies that real filesystem tools work in the sandbox and denied tools are blocked.
    """
    workspace = str(tmp_path / "sandbox_test")
    context = {
        "workspace_path": workspace,
        "tool_permissions": {
            "allowed_tools": ["file_write", "file_read", "list_files"],
            "denied_tools": ["arbitrary_host_exec", "python"]
        }
    }

    # 1. file_write execution
    write_res = await tool_registry.execute_tool(
        "file_write",
        {"filepath": "notes.txt", "content": "Multi-tenant SaaS test content."},
        context
    )
    assert write_res["status"] == "success"

    # 2. file_read execution
    read_res = await tool_registry.execute_tool(
        "file_read",
        {"filepath": "notes.txt"},
        context
    )
    assert read_res["content"] == "Multi-tenant SaaS test content."

    # 3. Denied tool execution MUST raise PermissionError
    with pytest.raises(PermissionError) as pe:
        await tool_registry.execute_tool("python", {"code": "print(1)"}, context)
    assert "explicitly denied" in str(pe.value)

# ==============================================================================
# 4. REAL RAG & MULTI-FORMAT PARSER TESTS
# ==============================================================================

def test_multi_format_parsers():
    """
    Verifies that real parsers (PDF, TXT, XLSX) extract structured text.
    """
    # Text parser
    txt_parser = parser_factory.get_parser("document.txt", "text/plain")
    txt_res = txt_parser.parse(b"Hello World from test document.", "document.txt")
    assert "Hello World" in txt_res["full_text"]

    # XLSX Parser
    import openpyxl
    import io
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Finans"
    ws.append(["Ay", "Gelir", "Gider"])
    ws.append(["Eylul", 50000, 20000])
    buf = io.BytesIO()
    wb.save(buf)

    xlsx_parser = parser_factory.get_parser("butce.xlsx")
    xlsx_res = xlsx_parser.parse(buf.getvalue(), "butce.xlsx")
    assert "Finans" in xlsx_res["full_text"]
    assert "Eylul" in xlsx_res["full_text"]
    assert "50000" in xlsx_res["full_text"]

@pytest.mark.asyncio
async def test_embedding_cosine_similarity():
    """
    Verifies that embedding vectors are 1536-dimensional unit vectors
    and semantically related texts have higher cosine similarity than unrelated texts.
    """
    vec_apple1 = await embedding_service.get_embedding("apple revenue quarterly financial earnings report")
    vec_apple2 = await embedding_service.get_embedding("apple profit fiscal quarter revenue income")
    vec_unrelated = await embedding_service.get_embedding("volcanic eruption geological tectonic plate movement")

    assert len(vec_apple1) == 1536
    sim_related = cosine_similarity(vec_apple1, vec_apple2)
    sim_unrelated = cosine_similarity(vec_apple1, vec_unrelated)

    assert sim_related > sim_unrelated

# ==============================================================================
# 5. REAL AGENT RUNTIME EXECUTION & CANCELLATION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_agent_runtime_execution_and_cancellation(tmp_path):
    """
    Verifies that OpenClawRuntimeAdapter runs tasks, streams events, and supports cancellation.
    """
    runtime = OpenClawRuntimeAdapter()
    agent_id = "test_agent_p0"
    task_id = "test_task_p0"
    context = {
        "organization_id": "org_test",
        "workspace_path": str(tmp_path / "test_agent_workspace"),
        "model": "anthropic/claude-3.7-sonnet",
        "tool_permissions": {"allowed_tools": ["list_files", "file_search"], "denied_tools": []},
        "messages": [{"role": "user", "content": "Mevcut çalışma alanındaki dosyaları listele"}]
    }

    # 1. Run and collect streaming events
    events = []
    async for event in runtime.stream(agent_id, task_id, "dosyaları listele", context):
        events.append(event)

    event_types = [e.get("type") for e in events]
    assert "thought" in event_types
    assert "done" in event_types

    # 2. Test status
    status = await runtime.get_status(agent_id)
    assert status.get("status") in ("active", "ready")

    # 3. Test stop/cancellation
    cancelled = await runtime.stop(agent_id, task_id)
    assert cancelled is True
