import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx
from app.core.config import settings
from app.services.tools.registry import tool_registry

logger = logging.getLogger(__name__)

MODEL_CATALOG = [
    # ---------------- GOOGLE (GEMINI) ----------------
    {
        "id": "google/gemini-3.1-pro",
        "name": "Gemini 3.1 Pro (Yüksek / High Tier)",
        "provider": "Google",
        "context_length": 1000000,
        "prompt_price_per_1m": 1.25,
        "completion_price_per_1m": 5.0,
        "description": "Google'ın en gelişmiş derin akıl yürütme, problem çözme ve büyük veri analiz modeli (1M Context).",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },
    {
        "id": "google/gemini-3.8-flash",
        "name": "Gemini 3.8 Flash (Orta / Mid Tier)",
        "provider": "Google",
        "context_length": 1000000,
        "prompt_price_per_1m": 0.35,
        "completion_price_per_1m": 1.05,
        "description": "Yüksek hızlı, çok modlu ve dengeli yeni nesil kurumsal yapay zeka personeli (1M Context).",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },
    {
        "id": "google/gemini-2.0-flash-001",
        "name": "Gemini 2.0 Flash (Düşük / Hızlı Tier)",
        "provider": "Google",
        "context_length": 1000000,
        "prompt_price_per_1m": 0.10,
        "completion_price_per_1m": 0.40,
        "description": "1 Milyon token bağlam penceresi, ultra düşük gecikme ve yüksek ekonomik verim.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },

    # ---------------- ANTHROPIC (CLAUDE) ----------------
    {
        "id": "anthropic/claude-3.7-sonnet",
        "name": "Claude 3.7 Sonnet (Yüksek / High Tier)",
        "provider": "Anthropic",
        "context_length": 200000,
        "prompt_price_per_1m": 3.0,
        "completion_price_per_1m": 15.0,
        "description": "En üst düzey hibrit mantık yürütme, kod yazma ve derin problem çözme modeli.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": True
    },
    {
        "id": "anthropic/claude-3.5-sonnet",
        "name": "Claude 3.5 Sonnet (Orta / Mid Tier)",
        "provider": "Anthropic",
        "context_length": 200000,
        "prompt_price_per_1m": 3.0,
        "completion_price_per_1m": 15.0,
        "description": "Gelişmiş kurumsal görev yürütme, döküman sentezi ve mükemmel Türkçe kabiliyeti.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },
    {
        "id": "anthropic/claude-3.5-haiku",
        "name": "Claude 3.5 Haiku (Düşük / Hızlı Tier)",
        "provider": "Anthropic",
        "context_length": 200000,
        "prompt_price_per_1m": 0.80,
        "completion_price_per_1m": 4.0,
        "description": "Yüksek hızlı özetleme, hızlı veri sınıflandırma ve hafif asistan operasyonları.",
        "supports_tools": True,
        "supports_vision": False,
        "is_default": False
    },

    # ---------------- OPENAI ----------------
    {
        "id": "openai/o3-mini",
        "name": "OpenAI o3-mini (Yüksek / Reasoning Tier)",
        "provider": "OpenAI",
        "context_length": 200000,
        "prompt_price_per_1m": 1.10,
        "completion_price_per_1m": 4.40,
        "description": "Karmaşık mantık, matematik, kodlama ve adım adım analitik düşünme modeli.",
        "supports_tools": True,
        "supports_vision": False,
        "is_default": False
    },
    {
        "id": "openai/gpt-4o",
        "name": "GPT-4o Omnimodel (Orta / Mid Tier)",
        "provider": "OpenAI",
        "context_length": 128000,
        "prompt_price_per_1m": 2.5,
        "completion_price_per_1m": 10.0,
        "description": "Çok modlu ve genel amaçlı hızlı kurumsal yapay zeka personeli.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },
    {
        "id": "openai/gpt-4o-mini",
        "name": "GPT-4o Mini (Düşük / Hızlı Tier)",
        "provider": "OpenAI",
        "context_length": 128000,
        "prompt_price_per_1m": 0.15,
        "completion_price_per_1m": 0.60,
        "description": "Rutin görevler, özetleme ve yüksek hızlı operasyonlar için ideal.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },

    # ---------------- DEEPSEEK ----------------
    {
        "id": "deepseek/deepseek-r1",
        "name": "DeepSeek R1 (Yüksek / High Reasoning)",
        "provider": "DeepSeek",
        "context_length": 64000,
        "prompt_price_per_1m": 0.55,
        "completion_price_per_1m": 2.19,
        "description": "Açık mantık ağı; matematik, algoritma ve karmaşık muhasebe denetimi için optimize akıl yürütme.",
        "supports_tools": True,
        "supports_vision": False,
        "is_default": False
    },
    {
        "id": "deepseek/deepseek-chat",
        "name": "DeepSeek V3 (Orta / Mid Tier)",
        "provider": "DeepSeek",
        "context_length": 64000,
        "prompt_price_per_1m": 0.14,
        "completion_price_per_1m": 0.28,
        "description": "Son derece hızlı ve güçlü genel amaçlı çok dilli dil modeli.",
        "supports_tools": True,
        "supports_vision": False,
        "is_default": False
    },
    {
        "id": "deepseek/deepseek-r1-distill-llama-70b",
        "name": "DeepSeek R1 Distill 70B (Düşük / Hızlı Tier)",
        "provider": "DeepSeek",
        "context_length": 64000,
        "prompt_price_per_1m": 0.23,
        "completion_price_per_1m": 0.69,
        "description": "Llama mimarisi üzerine damıtılmış ekonomik ve hızlı akıl yürütme modeli.",
        "supports_tools": True,
        "supports_vision": False,
        "is_default": False
    },

    # ---------------- FREE TIER / ÜCRETSİZ MODELLER ----------------
    {
        "id": "openrouter/free",
        "name": "OpenRouter Free Router (Otomatik Ücretsiz Model)",
        "provider": "OpenRouter",
        "context_length": 128000,
        "prompt_price_per_1m": 0.0,
        "completion_price_per_1m": 0.0,
        "description": "Herhangi bir bakiye gerektirmeyen, OpenRouter üzerindeki en uygun ücretsiz modeli otomatik yönlendirir.",
        "supports_tools": True,
        "supports_vision": False,
        "is_default": False
    },
    {
        "id": "meta-llama/llama-3.3-70b-instruct:free",
        "name": "Llama 3.3 70B Instruct (Ücretsiz / Free)",
        "provider": "Meta",
        "context_length": 128000,
        "prompt_price_per_1m": 0.0,
        "completion_price_per_1m": 0.0,
        "description": "Gelişmiş açık kaynaklı büyük dil modeli (OpenRouter ücretsiz kotası).",
        "supports_tools": True,
        "supports_vision": False,
        "is_default": False
    }
]

class OpenRouterService:
    """
    OpenRouter LLM gateway integration.
    Supports model switching, streaming, tool calling loop, and token usage calculation.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENROUTER_BASE_URL

    @staticmethod
    def get_catalog() -> List[Dict[str, Any]]:
        return MODEL_CATALOG

    async def call_completion(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Non-streaming call to OpenRouter with optional tool schemas.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": settings.PUBLIC_APP_URL,
            "X-Title": settings.PROJECT_NAME,
            "Content-Type": "application/json"
        }

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            
            # If 400 or 404 with tools, retry without tools (some providers or free models reject tools)
            if resp.status_code in (400, 404) and tools:
                logger.warning(f"OpenRouter {resp.status_code} for model '{model}' with tools. Retrying without tools...")
                payload_no_tools = {k: v for k, v in payload.items() if k not in ("tools", "tool_choice")}
                resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload_no_tools)

            if resp.status_code >= 400:
                error_detail = ""
                try:
                    err_json = resp.json()
                    error_detail = err_json.get("error", {}).get("message") or json.dumps(err_json)
                except Exception:
                    error_detail = resp.text
                logger.error(f"OpenRouter API error ({resp.status_code}) for '{model}': {error_detail}")
                raise Exception(f"OpenRouter {resp.status_code}: {error_detail}")

            return resp.json()

    async def run_tool_execution_loop(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        context: Dict[str, Any],
        max_turns: int = 5
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Complete Real Tool Calling Loop:
        LLM Request -> tool_call -> backend auth -> tool execution -> tool_result -> LLM -> answer.
        """
        allowed_tools = context.get("tool_permissions", {}).get("allowed_tools")
        tool_schemas = tool_registry.get_openai_tools_schema(allowed_tools)

        current_messages = list(messages)

        # Check if API key is active
        has_real_key = bool(self.api_key and self.api_key != "your_openrouter_api_key_here")

        if not has_real_key:
            # Deterministic, real execution for local test & standalone environments:
            last_user_msg = next((m["content"] for m in reversed(current_messages) if m.get("role") == "user"), "")
            yield {"type": "thought", "step": 1, "content": f"Kullanıcı mesajı analiz ediliyor: '{last_user_msg[:60]}...'"}
            await asyncio.sleep(0.15)

            tool_outputs = []
            lower_prompt = last_user_msg.lower()
            if "dosya" in lower_prompt or "listele" in lower_prompt or "file" in lower_prompt or "ls" in lower_prompt:
                yield {"type": "tool_call", "step": 2, "tool": "list_files", "input": {"subpath": "."}}
                try:
                    res = await tool_registry.execute_tool("list_files", {"subpath": "."}, context)
                    yield {"type": "tool_result", "step": 3, "tool": "list_files", "status": "success", "result": res}
                    tool_outputs.append(f"📁 Çalışma Alanı Dosyaları: {json.dumps(res, ensure_ascii=False)}")
                except Exception as ex:
                    yield {"type": "tool_result", "step": 3, "tool": "list_files", "status": "error", "result": str(ex)}

            elif "ara" in lower_prompt or "search" in lower_prompt or "bul" in lower_prompt:
                yield {"type": "tool_call", "step": 2, "tool": "file_search", "input": {"pattern": "*"}}
                try:
                    res = await tool_registry.execute_tool("file_search", {"pattern": "*"}, context)
                    yield {"type": "tool_result", "step": 3, "tool": "file_search", "status": "success", "result": res}
                    tool_outputs.append(f"🔍 Arama Sonuçları: {json.dumps(res, ensure_ascii=False)}")
                except Exception as ex:
                    yield {"type": "tool_result", "step": 3, "tool": "file_search", "status": "error", "result": str(ex)}

            reply_parts = [
                f"Merhaba! Talebinizi başarıyla aldım:\n> *\"{last_user_msg}\"*\n",
                "Şu anda yerel test/demo modunda yanıt veriyorum. Çok kiracılı çalışma alanı ve araç denetim sistemi başarıyla devrede.",
            ]
            if tool_outputs:
                reply_parts.append("\n" + "\n".join(tool_outputs))
            reply_parts.append("\n💡 *Not: Gerçek zamanlı Claude 3.7 / GPT-4o yapay zeka çıkarımı için `.env` dosyanıza kendi `OPENROUTER_API_KEY` değerinizi ekleyebilirsiniz.*")

            yield {"type": "assistant_text", "content": "\n".join(reply_parts)}
            yield {"type": "done", "status": "completed"}
            return

        # REAL OpenRouter Loop with credentials and automatic model fallback
        candidate_models = [model] if model else []
        for fb in context.get("fallback_models", []):
            if fb and fb not in candidate_models:
                candidate_models.append(fb)
        for fb in ["openrouter/free", "meta-llama/llama-3.3-70b-instruct:free", "google/gemini-2.0-flash-001"]:
            if fb not in candidate_models:
                candidate_models.append(fb)

        success = False
        last_error_detail = ""

        for candidate_idx, candidate_model in enumerate(candidate_models):
            turns = 0
            candidate_messages = list(current_messages)
            try:
                while turns < max_turns:
                    turns += 1
                    data = await self.call_completion(candidate_messages, model=candidate_model, tools=tool_schemas)
                    choice = data["choices"][0]
                    msg = choice["message"]
                    content = msg.get("content")
                    tool_calls = msg.get("tool_calls")

                    if content:
                        yield {"type": "assistant_text", "content": content}

                    if not tool_calls:
                        success = True
                        break

                    candidate_messages.append(msg)

                    for tc in tool_calls:
                        tool_name = tc["function"]["name"]
                        try:
                            tool_args = json.loads(tc["function"].get("arguments", "{}"))
                        except Exception:
                            tool_args = {}

                        yield {
                            "type": "tool_call",
                            "tool": tool_name,
                            "tool_call_id": tc.get("id"),
                            "input": tool_args
                        }

                        # Execute with strict authorization
                        try:
                            result = await tool_registry.execute_tool(tool_name, tool_args, context)
                            yield {
                                "type": "tool_result",
                                "tool": tool_name,
                                "tool_call_id": tc.get("id"),
                                "status": "success",
                                "result": result
                            }
                            tool_output_str = json.dumps(result, ensure_ascii=False)
                        except PermissionError as pe:
                            yield {
                                "type": "permission_denied",
                                "tool": tool_name,
                                "message": str(pe)
                            }
                            tool_output_str = json.dumps({"error": str(pe)})
                        except Exception as e:
                            yield {
                                "type": "tool_result",
                                "tool": tool_name,
                                "status": "error",
                                "result": str(e)
                            }
                            tool_output_str = json.dumps({"error": str(e)})

                        candidate_messages.append({
                            "role": "tool",
                            "tool_call_id": tc.get("id"),
                            "content": tool_output_str
                        })

                if success:
                    break

            except Exception as ex:
                last_error_detail = str(ex)
                logger.warning(f"Candidate model '{candidate_model}' failed: {ex}")
                # If there are next candidates, notify user via thought and proceed to next candidate
                if candidate_idx < len(candidate_models) - 1:
                    next_model = candidate_models[candidate_idx + 1]
                    yield {
                        "type": "thought",
                        "step": 1,
                        "content": f"'{candidate_model}' modeli yanıt vermedi ({str(ex)[:90]}). Otomatik olarak alternatif modele ('{next_model}') geçiliyor..."
                    }
                    continue
                else:
                    break

        if not success:
            last_user_msg = next((m["content"] for m in reversed(current_messages) if m.get("role") == "user"), "")
            logger.error(f"All candidate models failed. Last error: {last_error_detail}")

            offline_tool_outputs = []
            lower_prompt = last_user_msg.lower()
            if "dosya" in lower_prompt or "listele" in lower_prompt or "file" in lower_prompt or "ls" in lower_prompt:
                try:
                    res = await tool_registry.execute_tool("list_files", {"subpath": "."}, context)
                    offline_tool_outputs.append(f"📁 Çalışma Alanı Dosyaları: {json.dumps(res, ensure_ascii=False)}")
                except Exception:
                    pass
            elif "ara" in lower_prompt or "search" in lower_prompt or "bul" in lower_prompt:
                try:
                    res = await tool_registry.execute_tool("file_search", {"pattern": "*"}, context)
                    offline_tool_outputs.append(f"🔍 Arama Sonuçları: {json.dumps(res, ensure_ascii=False)}")
                except Exception:
                    pass

            reply_parts = [
                f"Merhaba! Mesajınız başarıyla alındı: *\"{last_user_msg}\"*",
                "",
                "⚠️ **OpenRouter LLM Servis Bilgilendirmesi:**",
                f"> `{last_error_detail}`",
                "",
                "**Neden Oluştu?**",
                "- OpenRouter hesabınızda bakiye (kredi) bulunmuyor olabilir ($0.00). Ücretli modeller için bakiye gereklidir.",
                "- Ya da `.env` dosyanızdaki `OPENROUTER_API_KEY` anahtarının kotası aşılmış veya anahtar geçersiz olabilir.",
                "",
                "**Nasıl Çözülür?**",
                "1. Sol paneldeki **Aktif Çıkarım Modeli (LLM)** açılır menüsünden **'OpenRouter Free Router (Otomatik Ücretsiz)'** veya **'Llama 3.3 70B (Ücretsiz)'** seçerek tamamen ücretsiz devam edebilirsiniz.",
                "2. Veya [openrouter.ai/settings/credits](https://openrouter.ai/settings/credits) adresinden hesabınıza bakiye yükleyerek Claude 3.7 / GPT-4o kullanabilirsiniz.",
            ]
            if offline_tool_outputs:
                reply_parts.append("\n" + "\n".join(offline_tool_outputs))

            yield {"type": "assistant_text", "content": "\n".join(reply_parts)}

        yield {"type": "done", "status": "completed"}
