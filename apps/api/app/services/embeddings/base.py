from abc import ABC, abstractmethod
from typing import List

class BaseEmbeddingService(ABC):
    """Abstract interface for generating vector embeddings."""
    dimension: int = 1536

    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        """Generates embedding for a single text chunk."""
        pass

    @abstractmethod
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding generation."""
        pass
