import math
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models.knowledge import KnowledgeChunk
from app.services.embeddings.factory import embedding_service

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)

class RAGService:
    """
    Semantic retrieval engine using pgvector embeddings and tenant isolation.
    """

    @staticmethod
    async def search_knowledge(
        db: AsyncSession,
        query: str,
        organization_id: str,
        agent_id: Optional[str] = None,
        limit: int = 6,
        min_similarity: float = 0.05
    ) -> List[Dict[str, Any]]:
        if not query.strip():
            return []

        # 1. Compute query vector
        query_vector = await embedding_service.get_embedding(query)

        # 2. Query tenant chunks with strict multi-tenant isolation
        conds = [KnowledgeChunk.organization_id == organization_id]
        if agent_id:
            conds.append(or_(KnowledgeChunk.agent_id == agent_id, KnowledgeChunk.agent_id.is_(None)))

        stmt = select(KnowledgeChunk).where(and_(*conds))
        result = await db.execute(stmt)
        chunks = result.scalars().all()

        if not chunks:
            return []

        query_clean = query.lower()
        query_words = [w.strip(".,?!:;\"'()") for w in query_clean.split() if len(w.strip(".,?!:;\"'()")) >= 2]
        is_document_intent = any(kw in query_clean for kw in ["dosya", "doküman", "dokuman", "belge", "bilgi", "fiyat", "liste", "rapor", "prosedür", "özet", "pdf", "docx", "oku", "neler var", "yükle"])

        scored_chunks = []
        for chunk in chunks:
            chunk_content_lower = chunk.content.lower()
            filename = (chunk.metadata_json or {}).get("filename", "Belge")
            filename_lower = filename.lower()

            # Vector similarity
            sim = 0.0
            if chunk.embedding is not None:
                sim = max(0.0, cosine_similarity(query_vector, list(chunk.embedding)))

            # Keyword overlap
            kw_matches = sum(1 for w in query_words if w in chunk_content_lower)
            kw_score = (kw_matches / max(len(query_words), 1)) if query_words else 0.0

            # Filename relevance boost
            filename_boost = 0.3 if any(w in filename_lower for w in query_words) else 0.0

            # Hybrid score
            combined_score = (0.4 * sim) + (0.4 * kw_score) + filename_boost

            # Keep chunk if it passes threshold or if there's clear document intent and it's an initial chunk
            if combined_score >= min_similarity or kw_matches > 0 or (is_document_intent and chunk.chunk_index == 0):
                scored_chunks.append({
                    "chunk_id": chunk.id,
                    "content": chunk.content,
                    "similarity": round(max(combined_score, sim), 4),
                    "metadata": chunk.metadata_json or {},
                    "filename": filename
                })

        # Sort by highest score first
        scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)

        # If document intent was requested but no chunk passed, fall back to top initial chunks
        if not scored_chunks and chunks and is_document_intent:
            initial_chunks = [c for c in chunks if c.chunk_index == 0][:limit]
            for c in initial_chunks:
                scored_chunks.append({
                    "chunk_id": c.id,
                    "content": c.content,
                    "similarity": 0.1,
                    "metadata": c.metadata_json or {},
                    "filename": (c.metadata_json or {}).get("filename", "Belge")
                })

        return scored_chunks[:limit]

rag_service = RAGService()
