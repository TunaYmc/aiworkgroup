from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseDocumentParser(ABC):
    """Abstract strategy for parsing various file formats into clean text with metadata."""
    
    @abstractmethod
    def parse(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Returns:
            {
                "full_text": str,
                "sections": List[Dict[str, Any]], # e.g. pages or sheets or slides
                "metadata": Dict[str, Any]
            }
        """
        pass
