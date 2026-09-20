import io
from typing import Dict, Any
from app.services.parsers.base import BaseDocumentParser
from app.services.parsers.vision_extractor import extract_content_with_vision

class ImageParser(BaseDocumentParser):
    """
    Parses images (PNG, JPG, JPEG, WEBP) natively using multimodal vision foundation models.
    """
    def parse(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        lower = filename.lower()
        mime = "image/png" if lower.endswith(".png") else "image/jpeg"
        text = extract_content_with_vision(file_bytes, mime)
        if not text:
            try:
                from PIL import Image
                import pytesseract
                img = Image.open(io.BytesIO(file_bytes))
                text = pytesseract.image_to_string(img, lang="tur+eng").strip()
            except Exception:
                text = ""

        return {
            "full_text": text,
            "sections": [{"page": 1, "content": text}] if text else [],
            "metadata": {"format": "image", "multimodal_vision_used": True}
        }
