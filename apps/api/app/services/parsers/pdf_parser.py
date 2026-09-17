import io
import pypdf
from typing import Dict, Any, List
from app.services.parsers.base import BaseDocumentParser

class PDFParser(BaseDocumentParser):
    def parse(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        sections = []
        full_text_parts = []

        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                sections.append({
                    "page": page_num,
                    "content": text.strip()
                })
                full_text_parts.append(f"--- Sayfa {page_num} ---\n{text.strip()}")

        return {
            "full_text": "\n\n".join(full_text_parts),
            "sections": sections,
            "metadata": {"total_pages": len(reader.pages), "format": "pdf"}
        }
