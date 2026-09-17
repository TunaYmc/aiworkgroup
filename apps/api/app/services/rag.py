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
        limit: int = 5,
        min_similarity: float = 0.2
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

        scored_chunks = []
        for chunk in chunks:
            if chunk.embedding is not None:
                sim = cosine_similarity(query_vector, list(chunk.embedding))
            else:
                # Text token overlap fallback if embedding was not set
                query_words = set(query.lower().split())
                chunk_words = set(chunk.content.lower().split())
                overlap = len(query_words.intersection(chunk_words))
                sim = overlap / max(len(query_words), 1)

            if sim >= min_similarity:
                scored_chunks.append({
                    "chunk_id": chunk.id,
                    "content": chunk.content,
                    "similarity": round(sim, 4),
                    "metadata": chunk.metadata_json or {},
                    "filename": (chunk.metadata_json or {}).get("filename", "Belge")
                })

        # Sort by highest similarity first
        scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        return scored_chunks[:limit]

rag_service = RAGService()
