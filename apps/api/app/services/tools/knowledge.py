import logging
from typing import Dict, Any
from app.services.tools.base import BaseTool
from app.core.database import AsyncSessionLocal
from app.services.rag import rag_service
from sqlalchemy import select, desc
from app.models.agent import AgentFile
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk

logger = logging.getLogger(__name__)

class SearchKnowledgeTool(BaseTool):
    name = "search_knowledge"
    description = "Search the company knowledge base and uploaded documents for specific information, guidelines, pricing, or procedures."
    parameters_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query or keywords to look up in company documents"
            }
        },
        "required": ["query"]
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        query = params.get("query", "").strip()
        if not query:
            return {"error": "query parameter is required"}

        org_id = context.get("organization_id", "default_org")
        agent_id = context.get("agent_id")

        try:
            async with AsyncSessionLocal() as session:
                chunks = await rag_service.search_knowledge(
                    session,
                    query=query,
                    organization_id=org_id,
                    agent_id=agent_id,
                    limit=5,
                    min_similarity=0.05
                )

                if not chunks:
                    # List available files so the agent knows what exists
                    f_res = await session.execute(
                        select(AgentFile).where(AgentFile.organization_id == org_id).limit(10)
                    )
                    files = [f.filename for f in f_res.scalars().all()]
                    return {
                        "results": [],
                        "message": f"'{query}' araması için doğrudan eşleşen döküman parçası bulunamadı.",
                        "available_documents": files
                    }

                formatted = []
                for c in chunks:
                    formatted.append({
                        "document": c.get("filename"),
                        "relevance": c.get("similarity"),
                        "snippet": c.get("content")
                    })

                return {"results": formatted, "count": len(formatted)}
        except Exception as ex:
            logger.exception(f"Error in search_knowledge tool: {ex}")
            return {"error": f"Bilgi tabanı araması sırasında hata: {str(ex)}"}

class ReadDocumentTool(BaseTool):
    name = "read_document"
    description = "Read the complete parsed content or all sections of an uploaded company document by filename or document title."
    parameters_schema = {
        "type": "object",
        "properties": {
            "filename": {
                "type": "string",
                "description": "Name of the file to read (e.g. '2026_Fiyat_Listesi.pdf' or 'sozlesme.docx')"
            }
        },
        "required": ["filename"]
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        filename = params.get("filename", "").strip()
        if not filename:
            return {"error": "filename parameter is required"}

        org_id = context.get("organization_id", "default_org")

        try:
            async with AsyncSessionLocal() as session:
                # Find document in knowledge documents
                stmt = (
                    select(KnowledgeChunk)
                    .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
                    .where(
                        (KnowledgeDocument.organization_id == org_id) &
                        (KnowledgeDocument.title.ilike(f"%{filename}%"))
                    )
                    .order_by(KnowledgeChunk.chunk_index.asc())
                )
                res = await session.execute(stmt)
                chunks = res.scalars().all()

                if not chunks:
                    # Check files table
                    f_stmt = select(AgentFile).where(
                        (AgentFile.organization_id == org_id) &
                        (AgentFile.filename.ilike(f"%{filename}%"))
                    )
                    f_res = await session.execute(f_stmt)
                    f_obj = f_res.scalars().first()
                    if f_obj:
                        return {
                            "filename": f_obj.filename,
                            "status": f_obj.status,
                            "content": f"Dosya sistemde mevcut ({f_obj.filename}), ancak içeriği henüz metin olarak ayrıştırılmamış."
                        }
                    return {"error": f"'{filename}' adında bir şirket dökümanı bulunamadı."}

                full_text = "\n\n".join(c.content for c in chunks)
                return {
                    "filename": filename,
                    "total_chunks": len(chunks),
                    "content": full_text[:120000] # 120KB limit
                }
        except Exception as ex:
            logger.exception(f"Error in read_document tool: {ex}")
            return {"error": f"Döküman okuma hatası: {str(ex)}"}
