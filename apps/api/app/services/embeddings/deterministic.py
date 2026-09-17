import math
import hashlib
from typing import List
from app.services.embeddings.base import BaseEmbeddingService

class DeterministicEmbeddingService(BaseEmbeddingService):
    """
    Offline deterministic embedding generator producing 1536-dimensional unit vectors.
    Uses n-gram hashing and term frequency to yield mathematically valid cosine similarities
    for testing and standalone development without external API keys.
    """
    dimension: int = 1536

    async def get_embedding(self, text: str) -> List[float]:
        vec = [0.0] * self.dimension
        clean_text = text.lower().strip()
        words = clean_text.split()

        # Word tokens
        for word in words:
            # Hash to index
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if (h >> 16) % 2 == 0 else -1.0
            vec[idx] += 1.0 * sign

        # Character trigrams for morphological similarity
        for i in range(len(clean_text) - 2):
            tri = clean_text[i:i+3]
            h = int(hashlib.sha256(tri.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if (h >> 24) % 2 == 0 else -1.0
            vec[idx] += 0.3 * sign

        # Normalize to unit vector (L2 norm = 1.0)
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        else:
            vec[0] = 1.0

        return vec

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        return [await self.get_embedding(t) for t in texts]
