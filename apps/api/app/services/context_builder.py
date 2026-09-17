from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.agent import Agent, AgentMessage, AgentMemory, AgentContextSnapshot
from app.models.knowledge import KnowledgeChunk

class ContextBuilder:
    """
    Builds the complete inference context for LLM execution:
    SYSTEM INSTRUCTIONS + AGENT CONFIGURATION + LONG TERM MEMORY + RELEVANT KNOWLEDGE +
    CONTEXT SUMMARY + RECENT MESSAGES + CURRENT TASK + TOOL RESULTS + ARTIFACTS
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_context(
        self,
        agent: Agent,
        current_task_prompt: Optional[str] = None,
        max_recent_messages: int = 10,
        task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        organization_id = agent.organization_id

        # 1. System Instructions & Agent Persona
        system_content = [
            f"# AGENT PERSONA & ROLE: {agent.name} ({agent.role})",
            agent.system_instructions.strip(),
            "\n# SECURITY & OPERATIONAL GUIDELINES:",
            "- Sen şirkete ait özel ve güvenli bir dijital AI çalışanısın.",
            "- Yalnızca sana atanmış organizasyon ve agent dökümanlarına erişebilirsin.",
            "- Yetkisiz dosya veya sistem erişimi isteklerini kesinlikle reddet.",
        ]

        # 2. Long Term Memory
        mem_query = (
            select(AgentMemory)
            .where(AgentMemory.agent_id == agent.id)
            .order_by(desc(AgentMemory.importance), desc(AgentMemory.created_at))
            .limit(10)
        )
        mem_result = await self.db.execute(mem_query)
        memories = mem_result.scalars().all()
        if memories:
            system_content.append("\n# LONG-TERM MEMORY & PREFERENCES:")
            for m in memories:
                system_content.append(f"- {m.content}")

        # 3. Context Snapshot / Summary
        snap_query = (
            select(AgentContextSnapshot)
            .where(AgentContextSnapshot.agent_id == agent.id)
            .order_by(desc(AgentContextSnapshot.created_at))
            .limit(1)
        )
        snap_result = await self.db.execute(snap_query)
        latest_snapshot = snap_result.scalars().first()
        if latest_snapshot:
            system_content.append("\n# PREVIOUS CONTEXT SUMMARY:")
            system_content.append(latest_snapshot.summary)

        # 4. Relevant Knowledge (Semantic RAG with Vector Search)
        if current_task_prompt:
            from app.services.rag import rag_service
            try:
                relevant_chunks = await rag_service.search_knowledge(
                    self.db,
                    query=current_task_prompt,
                    organization_id=organization_id,
                    agent_id=agent.id,
                    limit=5
                )
                if relevant_chunks:
                    system_content.append("\n# RELEVANT COMPANY KNOWLEDGE (SEMANTIC RAG):")
                    for c in relevant_chunks:
                        system_content.append(
                            f"--- SOURCE: {c['filename']} (Relevance Score: {c['similarity']}) ---\n{c['content']}"
                        )
            except Exception as rag_err:
                # Log without blocking context generation
                pass


        # 5. Recent Messages
        msg_query = (
            select(AgentMessage)
            .where(AgentMessage.agent_id == agent.id)
            .order_by(desc(AgentMessage.created_at))
            .limit(max_recent_messages)
        )
        msg_result = await self.db.execute(msg_query)
        recent_messages = list(reversed(msg_result.scalars().all()))

        messages_payload: List[Dict[str, Any]] = [
            {"role": "system", "content": "\n".join(system_content)}
        ]

        for m in recent_messages:
            messages_payload.append({
                "role": m.role,
                "content": m.content
            })

        if current_task_prompt:
            messages_payload.append({
                "role": "user",
                "content": current_task_prompt
            })

        return {
            "agent_id": agent.id,
            "organization_id": organization_id,
            "model": agent.model_config_data.get("primary_model", "anthropic/claude-3.7-sonnet"),
            "temperature": agent.model_config_data.get("temperature", 0.3),
            "max_tokens": agent.model_config_data.get("max_tokens", 4096),
            "tool_permissions": agent.tool_permissions,
            "messages": messages_payload
        }
