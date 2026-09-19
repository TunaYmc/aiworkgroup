import io
import pypdf
from typing import Dict, Any
from app.services.parsers.base import BaseDocumentParser

class PDFParser(BaseDocumentParser):
    def parse(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        sections = []
        full_text_parts = []
        has_text = False

        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                has_text = True
                sections.append({
                    "page": page_num,
                    "content": text.strip()
                })
                full_text_parts.append(f"--- Sayfa {page_num} ---\n{text.strip()}")

        if not has_text:
            try:
                import pytesseract
                from pdf2image import convert_from_bytes
                
                # Convert PDF bytes to images
                images = convert_from_bytes(file_bytes)
                for page_num, image in enumerate(images, start=1):
                    # OCR in Turkish and English
                    text = pytesseract.image_to_string(image, lang="tur+eng")
                    if text.strip():
                        sections.append({
                            "page": page_num,
                            "content": text.strip()
                        })
                        full_text_parts.append(f"--- Sayfa {page_num} (OCR) ---\n{text.strip()}")
            except Exception as e:
                full_text_parts.append(f"[Sistem Notu: Bu bir taranmış görsel PDF dosyasıdır ve metin içeremiyor. OCR işlemi başarısız oldu: {str(e)}]")
                
        return {
            "full_text": "\n\n".join(full_text_parts),
            "sections": sections,
            "metadata": {"total_pages": len(reader.pages), "format": "pdf", "ocr_used": not has_text}
        }
