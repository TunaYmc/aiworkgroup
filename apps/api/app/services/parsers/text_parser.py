from typing import Dict, Any
from app.services.parsers.base import BaseDocumentParser

class TextParser(BaseDocumentParser):
    def parse(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        # Try UTF-8 first, then Latin-1
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1", errors="replace")

        return {
            "full_text": text,
            "sections": [{"content": text}],
            "metadata": {"format": "text", "size_chars": len(text)}
        }
