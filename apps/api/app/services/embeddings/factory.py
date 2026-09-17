from app.services.embeddings.base import BaseEmbeddingService
from app.services.embeddings.openrouter import OpenRouterEmbeddingService
from app.core.config import settings

def get_embedding_service() -> BaseEmbeddingService:
    return OpenRouterEmbeddingService(api_key=settings.OPENROUTER_API_KEY)

embedding_service = get_embedding_service()
