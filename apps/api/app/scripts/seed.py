import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.tenant import User, Organization, OrganizationMember
from app.models.agent import Agent, AgentMemory
from app.models.task import Task
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.services.embeddings.factory import embedding_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

async def seed_data():
    logger.info("Starting seed process...")
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(User).where(User.email == "admin@platform.com"))
        if res.scalars().first():
            logger.info("Database already seeded. Skipping.")
            return

        # 1. Superuser
        admin_user = User(
            email="admin@platform.com",
            hashed_password=get_password_hash("Admin12345!"),
            full_name="Platform Admin",
            is_active=True,
            is_superuser=True
        )
        db.add(admin_user)

        # 2. Demo User & Org
        demo_user = User(
            email="demo@acme.com",
            hashed_password=get_password_hash("Demo12345!"),
            full_name="Tuna Demir",
            is_active=True,
            is_superuser=False
        )
        db.add(demo_user)
        await db.flush()

        org = Organization(
            name="Tuna Dijital A.Ş.",
            slug="tuna-dijital-as",
            monthly_token_limit={"max_tokens": 10000000, "current_used": 150000},
            monthly_budget_usd={"max_usd": 100.0, "current_usd": 4.50}
        )
        db.add(org)
        await db.flush()

        member = OrganizationMember(
            organization_id=org.id,
            user_id=demo_user.id,
            role="owner"
        )
        db.add(member)

        # 3. Demo AI Employees
        agent_sales = Agent(
            organization_id=org.id,
            name="Selin - Satış & Teklif Uzmanı",
            role="Sales Employee",
            description="Müşteri teklifleri oluşturur, CRM fırsatlarını değerlendirir ve e-posta taslakları hazırlar.",
            system_instructions="Sen Tuna Dijital A.Ş. satış ekibinin kıdemli AI çalışanısın. Kurumsal müşterilere profesyonel, net ve ikna edici teklifler hazırla.",
            status="active",
            model_config_data={
                "primary_model": "anthropic/claude-3.7-sonnet",
                "fallback_models": ["openai/gpt-4o-mini"],
                "temperature": 0.3,
                "max_tokens": 4096
            },
            tool_permissions={
                "allowed_tools": ["file_search", "file_read", "file_write", "list_files", "web_search"],
                "denied_tools": ["arbitrary_host_exec"]
            }
        )

        agent_finance = Agent(
            organization_id=org.id,
            name="Kemal - Muhasebe & Denetim",
            role="Accounting Employee",
            description="Gider faturalarını kontrol eder, KDV ve vergi hesaplamalarını yapar ve finansal raporlar sunar.",
            system_instructions="Sen Tuna Dijital A.Ş. muhasebe ve denetim sorumlususun. Fatura tutarlarını, KDV matrahlarını ve giderleri kurallara uygun kontrol et.",
            status="active",
            model_config_data={
                "primary_model": "deepseek/deepseek-r1",
                "fallback_models": ["openai/gpt-4o-mini"],
                "temperature": 0.1,
                "max_tokens": 4096
            },
            tool_permissions={
                "allowed_tools": ["file_search", "file_read", "file_write", "python", "list_files"],
                "denied_tools": ["arbitrary_host_exec"]
            }
        )
        db.add_all([agent_sales, agent_finance])
        await db.flush()

        # 4. Seed Knowledge & Embeddings
        doc = KnowledgeDocument(
            organization_id=org.id,
            agent_id=agent_sales.id,
            title="2026_Kurumsal_Fiyatlandirma_Rehberi.txt",
            source_type="file",
            total_chunks=2
        )
        db.add(doc)
        await db.flush()

        chunk1_text = "Tuna Dijital Kurumsal SaaS Lisans Ücretleri: Başlangıç Paketi $49/ay (3 Agent), Büyüme Paketi $149/ay (10 Agent), Kurumsal Paket $499/ay (Sınırsız Agent)."
        chunk2_text = "Kurumsal müşterilere yıllık peşin ödemelerde %20 iskonto uygulanır. KDV oranı %20 olarak faturalandırılır."

        vec1 = await embedding_service.get_embedding(chunk1_text)
        vec2 = await embedding_service.get_embedding(chunk2_text)

        kc1 = KnowledgeChunk(
            organization_id=org.id,
            document_id=doc.id,
            agent_id=agent_sales.id,
            chunk_index=0,
            content=chunk1_text,
            embedding=vec1,
            metadata_json={"filename": doc.title, "section": "Fiyatlar"}
        )
        kc2 = KnowledgeChunk(
            organization_id=org.id,
            document_id=doc.id,
            agent_id=agent_sales.id,
            chunk_index=1,
            content=chunk2_text,
            embedding=vec2,
            metadata_json={"filename": doc.title, "section": "İskontolar"}
        )
        db.add_all([kc1, kc2])

        # 5. Demo Task
        task = Task(
            organization_id=org.id,
            agent_id=agent_sales.id,
            user_id=demo_user.id,
            title="Q3 Yeni Kurumsal Müşteri Fiyat Teklifi",
            status="completed",
            priority="high",
            input_prompt="2026 Fiyatlandırma rehberine göre yıllık Büyüme Paketi teklifini iskonto dahil hazırla.",
            output_result="Yıllık Büyüme Paketi teklif dökümanı hazırlandı. 12 aylık liste fiyatı $1,788 üzerinden %20 iskonto ile toplam $1,430.40 + KDV olarak hesaplandı.",
            artifacts=["Teklif_Buyume_Paketi_2026.pdf"]
        )
        db.add(task)

        await db.commit()
        logger.info("✅ Database seeded successfully with demo users, organizations, agents, and vector embeddings!")

if __name__ == "__main__":
    asyncio.run(seed_data())
