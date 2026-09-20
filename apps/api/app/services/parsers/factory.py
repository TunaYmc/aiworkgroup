from typing import Optional
from app.services.parsers.base import BaseDocumentParser
from app.services.parsers.pdf_parser import PDFParser
from app.services.parsers.docx_parser import DocxParser
from app.services.parsers.xlsx_parser import XlsxParser
from app.services.parsers.pptx_parser import PptxParser
from app.services.parsers.text_parser import TextParser
from app.services.parsers.image_parser import ImageParser

class DocumentParserFactory:
    @staticmethod
    def get_parser(filename: str, mime_type: Optional[str] = None) -> BaseDocumentParser:
        lower_name = filename.lower()
        mime = (mime_type or "").lower()

        if lower_name.endswith(".pdf") or "pdf" in mime:
            return PDFParser()
        elif lower_name.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")) or "image" in mime:
            return ImageParser()
        elif lower_name.endswith(".docx") or "wordprocessingml" in mime:
            return DocxParser()
        elif lower_name.endswith((".xlsx", ".xls")) or "spreadsheet" in mime:
            return XlsxParser()
        elif lower_name.endswith((".pptx", ".ppt")) or "presentation" in mime:
            return PptxParser()
        else:
            return TextParser()

parser_factory = DocumentParserFactory()
