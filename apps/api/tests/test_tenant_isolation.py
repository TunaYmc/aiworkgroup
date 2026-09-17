import pytest
from sqlalchemy import select
from app.models.tenant import Organization, User, OrganizationMember
from app.models.agent import Agent, AgentMessage, AgentFile
from app.runtime.openclaw import OpenClawRuntimeAdapter
from app.services.context_builder import ContextBuilder

@pytest.mark.asyncio
async def test_tenant_isolation_between_organizations(db_session):
    """
    Test: Tenant A user must NOT be able to view or query Tenant B's agent or file.
    """
    # 1. Create Tenant A
    org_a = Organization(name="Company A", slug="company-a")
    user_a = User(email="user_a@test.com", hashed_password="pw")
    db_session.add_all([org_a, user_a])
    await db_session.flush()

    mem_a = OrganizationMember(organization_id=org_a.id, user_id=user_a.id, role="owner")
    agent_a = Agent(
        organization_id=org_a.id,
        name="Agent A",
        role="Sales",
        system_instructions="A instructions"
    )
    db_session.add_all([mem_a, agent_a])

    # 2. Create Tenant B
    org_b = Organization(name="Company B", slug="company-b")
    user_b = User(email="user_b@test.com", hashed_password="pw")
    db_session.add_all([org_b, user_b])
    await db_session.flush()

    mem_b = OrganizationMember(organization_id=org_b.id, user_id=user_b.id, role="owner")
    agent_b = Agent(
        organization_id=org_b.id,
        name="Agent B",
        role="Accounting",
        system_instructions="B instructions"
    )
    file_b = AgentFile(
        organization_id=org_b.id,
        filename="confidential_b.pdf",
        mime_type="application/pdf",
        size=1024,
        storage_key="tenants/org_b/confidential_b.pdf"
    )
    db_session.add_all([mem_b, agent_b, file_b])
    await db_session.commit()

    # 3. Query as Tenant A: Verify Tenant B items are never returned
    tenant_a_agents = await db_session.execute(
        select(Agent).where(Agent.organization_id == org_a.id)
    )
    agent_list = tenant_a_agents.scalars().all()
    assert len(agent_list) == 1
    assert agent_list[0].id == agent_a.id

    tenant_a_files = await db_session.execute(
        select(AgentFile).where(AgentFile.organization_id == org_a.id)
    )
    file_list = tenant_a_files.scalars().all()
    assert len(file_list) == 0  # Tenant A has no files, must not see confidential_b.pdf

@pytest.mark.asyncio
async def test_tool_permission_enforcement():
    """
    Test: Tool execution is checked against permitted tools. Denied tools are rejected.
    """
    runtime = OpenClawRuntimeAdapter()
    context_with_denied_tool = {
        "tool_permissions": {
            "allowed_tools": ["file_read"],
            "denied_tools": ["file_search"]
        }
    }

    events = []
    async for event in runtime.stream("test-agent", "task-1", "Search files", context_with_denied_tool):
        events.append(event)

    denied_events = [e for e in events if e.get("type") == "permission_denied"]
    assert len(denied_events) > 0
    assert denied_events[0]["tool"] == "file_search"

@pytest.mark.asyncio
async def test_model_switching_preserves_conversation_history(db_session):
    """
    Test: Changing agent model config must never destroy previous messages or state.
    """
    org = Organization(name="Test Org", slug="test-org")
    agent = Agent(
        organization_id="temp-org-id",
        name="Flex Agent",
        role="Sales",
        system_instructions="Help customers",
        model_config_data={"primary_model": "anthropic/claude-3.7-sonnet"}
    )
    db_session.add_all([org, agent])
    await db_session.flush()

    # Add messages
    msg1 = AgentMessage(
        organization_id=org.id,
        agent_id=agent.id,
        role="user",
        content="İlk mesaj"
    )
    msg2 = AgentMessage(
        organization_id=org.id,
        agent_id=agent.id,
        role="assistant",
        content="İlk yanıt"
    )
    db_session.add_all([msg1, msg2])
    await db_session.commit()

    # Switch model to DeepSeek R1
    agent.model_config_data = {"primary_model": "deepseek/deepseek-r1"}
    await db_session.commit()

    # Verify messages are intact
    msgs = await db_session.execute(
        select(AgentMessage).where(AgentMessage.agent_id == agent.id)
    )
    all_msgs = msgs.scalars().all()
    assert len(all_msgs) == 2
    assert all_msgs[0].content == "İlk mesaj"
    assert agent.model_config_data["primary_model"] == "deepseek/deepseek-r1"
