import io
import logging
import pypdf
from typing import Dict, Any
from app.services.parsers.base import BaseDocumentParser
from app.services.parsers.vision_extractor import extract_content_with_vision

logger = logging.getLogger(__name__)

class PDFParser(BaseDocumentParser):
    def parse(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        sections = []
        full_text_parts = []
        
        extracted_pages = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            extracted_pages.append((page_num, text))

        total_text_len = sum(len(t) for _, t in extracted_pages)
        # If total text across all pages is under 100 characters, it is a visual scan / image PDF
        is_visual_scan = total_text_len < 100

        if is_visual_scan:
            try:
                from pdf2image import convert_from_bytes
                images = convert_from_bytes(file_bytes, dpi=180)
                for page_num, image in enumerate(images, start=1):
                    img_byte_arr = io.BytesIO()
                    image.save(img_byte_arr, format="JPEG", quality=85)
                    vision_text = extract_content_with_vision(img_byte_arr.getvalue(), "image/jpeg")

                    if vision_text:
                        sections.append({"page": page_num, "content": vision_text})
                        full_text_parts.append(f"--- Sayfa {page_num} ---\n{vision_text}")
                    else:
                        # Fallback to Tesseract OCR if vision unavailable
                        import pytesseract
                        ocr_text = pytesseract.image_to_string(image, lang="tur+eng").strip()
                        if ocr_text:
                            sections.append({"page": page_num, "content": ocr_text})
                            full_text_parts.append(f"--- Sayfa {page_num} (OCR) ---\n{ocr_text}")
            except Exception as e:
                logger.warning(f"Error extracting visual PDF with vision: {e}")

        # If digital text exists or vision did not populate full_text_parts
        if not full_text_parts:
            for page_num, text in extracted_pages:
                if text:
                    sections.append({"page": page_num, "content": text})
                    full_text_parts.append(f"--- Sayfa {page_num} ---\n{text}")

        return {
            "full_text": "\n\n".join(full_text_parts),
            "sections": sections,
            "metadata": {
                "total_pages": len(reader.pages),
                "format": "pdf",
                "multimodal_vision_used": is_visual_scan
            }
        }
