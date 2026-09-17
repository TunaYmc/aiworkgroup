import logging
from typing import List, Optional
import httpx
from app.core.config import settings
from app.services.embeddings.base import BaseEmbeddingService
from app.services.embeddings.deterministic import DeterministicEmbeddingService

logger = logging.getLogger(__name__)

class OpenRouterEmbeddingService(BaseEmbeddingService):
    """
    OpenRouter / OpenAI vector embedding client.
    Model default: openai/text-embedding-3-small (1536 dims).
    """
    dimension: int = 1536

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = "openai/text-embedding-3-small"
        self.fallback = DeterministicEmbeddingService()

    async def get_embedding(self, text: str) -> List[float]:
        results = await self.get_embeddings([text])
        return results[0]

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key or self.api_key == "your_openrouter_api_key_here":
            return await self.fallback.get_embeddings(texts)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.PUBLIC_APP_URL,
            "X-Title": settings.PROJECT_NAME
        }
        payload = {
            "model": self.model,
            "input": texts
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post("https://openrouter.ai/api/v1/embeddings", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return [item["embedding"] for item in data["data"]]
                else:
                    logger.warning(f"OpenRouter embedding error: {res.status_code}. Using deterministic fallback.")
        except Exception as e:
            logger.warning(f"Embedding API connection error: {e}. Using deterministic fallback.")

        return await self.fallback.get_embeddings(texts)
