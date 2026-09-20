import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.agent import AgentFile
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.services.parsers.factory import parser_factory
from app.services.embeddings.factory import embedding_service

logger = logging.getLogger(__name__)

class DocumentIngestionService:
    """
    Production-grade Document Ingestion & RAG Pipeline:
    UPLOAD -> PARSE (PDF/DOCX/XLSX/PPTX/TXT) -> CHUNK -> EMBEDDING -> PGVECTOR
    """

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> List[str]:
        if not text:
            return []
        chunks = []
        start = 0
        text_len = len(text)
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunks.append(text[start:end])
            if end == text_len:
                break
            start += (chunk_size - overlap)
        return chunks

    async def ingest_file(
        self,
        db: AsyncSession,
        agent_file: AgentFile,
        file_bytes: bytes
    ) -> bool:
        try:
            # 1. Parse document with format-specific strategy
            parser = parser_factory.get_parser(agent_file.filename, agent_file.mime_type)
            parse_result = parser.parse(file_bytes, agent_file.filename)
            raw_text = parse_result.get("full_text", "")

            if not raw_text.strip():
                agent_file.status = "ready"
                await db.commit()
                return True

            # Save parsed plain text to disk for direct filesystem access
            # (REMOVED: User requested not to automatically convert to .txt)
            import os
            from app.core.config import settings

            # 2. Chunk text
            chunks = self.chunk_text(raw_text)
            if not chunks:
                agent_file.status = "ready"
                await db.commit()
                return True

            # 3. Generate Vector Embeddings (1536-dim)
            embeddings = await embedding_service.get_embeddings(chunks)

            # 4. Remove existing KnowledgeDocument/Chunks if re-ingesting
            from sqlalchemy import delete, select
            old_docs_res = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.file_id == agent_file.id))
            for od in old_docs_res.scalars().all():
                await db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == od.id))
                await db.delete(od)
            await db.flush()

            # Create KnowledgeDocument
            doc = KnowledgeDocument(
                organization_id=agent_file.organization_id,
                agent_id=agent_file.agent_id,
                title=agent_file.filename,
                source_type="file",
                file_id=agent_file.id,
                total_chunks=len(chunks)
            )
            db.add(doc)
            await db.flush()

            # 5. Create KnowledgeChunks with vector embeddings
            for idx, (chunk_content, emb_vector) in enumerate(zip(chunks, embeddings)):
                kc = KnowledgeChunk(
                    organization_id=agent_file.organization_id,
                    document_id=doc.id,
                    agent_id=agent_file.agent_id,
                    chunk_index=idx,
                    content=chunk_content,
                    embedding=emb_vector,
                    metadata_json={
                        "filename": agent_file.filename,
                        "file_id": agent_file.id,
                        "chunk_index": idx,
                        "format": parse_result.get("metadata", {}).get("format", "unknown")
                    }
                )
                db.add(kc)

            agent_file.status = "ready"
            await db.commit()
            return True

        except Exception as ex:
            logger.exception(f"Error during document ingestion for {agent_file.filename}: {ex}")
            agent_file.status = "failed"
            await db.commit()
            return False

ingestion_service = DocumentIngestionService()
