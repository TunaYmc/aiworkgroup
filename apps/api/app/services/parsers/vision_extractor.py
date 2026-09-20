import base64
import logging
import io
from typing import Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

def extract_content_with_vision(image_bytes: bytes, mime_type: str = "image/jpeg", custom_prompt: Optional[str] = None) -> str:
    """
    Uses OpenClaw's multimodal foundation models (Gemini 3.8 Flash / GPT-4o-mini)
    to perform state-of-the-art visual transcription of documents, scans, charts, and tables.
    """
    key = settings.OPENROUTER_API_KEY
    if not key:
        logger.warning("OPENROUTER_API_KEY is not set, skipping vision extraction.")
        return ""

    b64_img = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:{mime_type};base64,{b64_img}"

    prompt = custom_prompt or (
        "Bu belgedeki tüm metinleri, başlıkları, tabloları, dersleri, notları, isimleri, "
        "sayıları, imzaları, mühürleri ve tüm detayları hiçbir ayrıntıyı atlamadan eksiksiz "
        "ve birebir doğrulukla Markdown formatında çıkar. Tablo yapılarını düzenli Markdown tabloları olarak yaz."
    )

    models_to_try = [
        "google/gemini-3.8-flash",
        "google/gemini-3.7-flash",
        "openai/gpt-4o-mini"
    ]

    for model in models_to_try:
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_uri}}
                    ]
                }
            ],
            "temperature": 0.1,
            "max_tokens": 4096
        }

        try:
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": settings.PUBLIC_APP_URL,
                        "X-Title": settings.PROJECT_NAME
                    },
                    json=payload
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and content.strip():
                        return content.strip()
                else:
                    logger.warning(f"Vision model {model} returned {resp.status_code}: {resp.text[:120]}")
        except Exception as ex:
            logger.warning(f"Vision extraction failed with {model}: {ex}")

    return ""
