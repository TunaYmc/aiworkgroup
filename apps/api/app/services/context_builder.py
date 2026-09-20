from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.agent import Agent, AgentMessage, AgentMemory, AgentContextSnapshot, AgentFile
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
        active_model = agent.model_config_data.get("primary_model", "anthropic/claude-3.7-sonnet")
        system_content = [
            f"# AGENT PERSONA & ROLE: {agent.name} ({agent.role})",
            agent.system_instructions.strip(),
            f"\n# CURRENT RUNTIME INFERENCE MODEL:\n- Aktif çalışan yapay zeka modelin: '{active_model}'. Kullanıcı sana hangi modeli kullandığını sorduğunda bu modeli belirt.",
            "\n# SECURITY & OPERATIONAL GUIDELINES:",
            "- Sen şirkete ait özel ve güvenli bir dijital AI çalışanısın.",
            "- Yalnızca sana atanmış organizasyon ve agent dökümanlarına erişebilirsin.",
            "- Yetkisiz dosya veya sistem erişimi isteklerini kesinlikle reddet.",
            "\n# DOSYA ÜRETİMİ VE TÜRKÇE PDF (REPORTLAB) KURALLARI:",
            "- Kullanıcı senden bir rapor, tablo veya dosya üretip kaydetmeni istediğinde:",
            "  * Eğer PDF formatında bir rapor isteniyorsa: 'python' aracını kullanarak 'reportlab' ile gerçek bir .pdf dosyası oluştur.",
            "  * KRİTİK: ReportLab'in varsayılan 'Helvetica' fontu Türkçe karakterleri ('ı, İ, ğ, Ğ, ş, Ş') desteklemez ve bozuk basar. Bu yüzden HER ZAMAN sistemde yüklü olan DejaVu fontunu kaydet ve stillerde kullan:",
            "    ```python",
            "    from reportlab.pdfbase import pdfmetrics",
            "    from reportlab.pdfbase.ttfonts import TTFont",
            "    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))",
            "    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))",
            "    ```",
            "    Ve ParagraphStyle / TableStyle içinde `fontName='DejaVuSans'` ve `fontName='DejaVuSans-Bold'` belirt.",
            "  * Eğer Excel veya CSV isteniyorsa: 'python' aracıyla (pandas/openpyxl) veya 'file_write' ile oluştur.",
            "  * Eğer Markdown veya Text isteniyorsa: 'file_write' aracıyla .md veya .txt olarak kaydet.",
            "- Ürettiğin tüm dosyalar otomatik olarak sistemin 'Dokümanlar' sayfasına senkronize edilir ve kullanıcı tarafından önizlenebilir/indirilebilir.",
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

        # Browser Capability Override
        if "browser" in agent.tool_permissions.get("allowed_tools", []):
            system_content.append("\n# OTONOM TARAYICI (BROWSER) YETENEĞİ:")
            system_content.append("- Gerçek ve otonom bir web tarayıcısı aracına ('browser') sahipsin.")
            system_content.append("- Kullanıcı bir web sitesinden ürün fiyatı almanı, bir hesaba giriş yapmanı, form doldurmanı veya internette gezinmeni istediğinde KESİNLİKLE 'bunu yapamam' veya 'böyle bir yeteneğim yok' DEME.")
            system_content.append("- Doğrudan 'browser' aracını çağır ve işlemi eksiksiz şekilde otonom tarayıcıya devret.")

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

        # 4. Company Documents Library & Semantic RAG
        try:
            files_query = (
                select(AgentFile)
                .where(AgentFile.organization_id == organization_id)
                .order_by(desc(AgentFile.created_at))
                .limit(20)
            )
            files_result = await self.db.execute(files_query)
            company_files = files_result.scalars().all()

            if company_files:
                system_content.append("\n# ŞİRKET DÖKÜMANLARI VE BİLGİ TABANI (KNOWLEDGE BASE):")
                system_content.append("Şirket sisteminde yüklü olan ve tam erişim yetkine sahip olduğun kurumsal belgeler:")
                for f in company_files:
                    size_kb = round(f.size / 1024, 1) if f.size else 0
                    system_content.append(f"- 📄 {f.filename} ({size_kb} KB)")
                system_content.append("Kullanıcı şirket dosyaları, fiyatlar, sözleşmeler veya prosedürler hakkında sorduğunda bu kaynaklardan yararlan.")
        except Exception as file_err:
            company_files = []

        # 5. Relevant Knowledge (Semantic RAG with Hybrid Search)
        relevant_chunks = []
        if current_task_prompt:
            from app.services.rag import rag_service
            try:
                relevant_chunks = await rag_service.search_knowledge(
                    self.db,
                    query=current_task_prompt,
                    organization_id=organization_id,
                    agent_id=agent.id,
                    limit=6
                )
                if relevant_chunks:
                    system_content.append("\n# RELEVANT COMPANY KNOWLEDGE (SEMANTIC RAG):")
                    for c in relevant_chunks:
                        system_content.append(
                            f"--- SOURCE: {c['filename']} (Relevance Score: {c['similarity']}) ---\n{c['content']}"
                        )
            except Exception as rag_err:
                pass

        # If no specific search chunks matched but company documents exist, provide overview chunks
        if not relevant_chunks and company_files:
            try:
                overview_stmt = (
                    select(KnowledgeChunk)
                    .where(KnowledgeChunk.organization_id == organization_id)
                    .order_by(desc(KnowledgeChunk.created_at))
                    .limit(4)
                )
                ov_res = await self.db.execute(overview_stmt)
                ov_chunks = ov_res.scalars().all()
                if ov_chunks:
                    system_content.append("\n# GENEL KURUMSAL BELGE İÇERİKLERİ:")
                    for c in ov_chunks:
                        fn = (c.metadata_json or {}).get("filename", "Belge")
                        system_content.append(f"--- SOURCE: {fn} ---\n{c.content[:1500]}")
            except Exception:
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
