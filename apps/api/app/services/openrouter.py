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
    {
        "id": "anthropic/claude-3.7-sonnet",
        "name": "Claude 3.7 Sonnet (Hybrid Reasoning)",
        "provider": "Anthropic",
        "context_length": 200000,
        "prompt_price_per_1m": 3.0,
        "completion_price_per_1m": 15.0,
        "description": "En üst düzey mantık yürütme, kod yazma ve derin problem çözme modeli.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": True
    },
    {
        "id": "openai/gpt-4o",
        "name": "GPT-4o Omnimodel",
        "provider": "OpenAI",
        "context_length": 128000,
        "prompt_price_per_1m": 2.5,
        "completion_price_per_1m": 10.0,
        "description": "Çok modlu ve genel amaçlı hızlı kurumsal yapay zeka.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },
    {
        "id": "openai/gpt-4o-mini",
        "name": "GPT-4o Mini (Hızlı & Ekonomik)",
        "provider": "OpenAI",
        "context_length": 128000,
        "prompt_price_per_1m": 0.15,
        "completion_price_per_1m": 0.60,
        "description": "Rutin görevler, özetleme ve yüksek hızlı operasyonlar için ideal.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },
    {
        "id": "google/gemini-2.0-flash-001",
        "name": "Gemini 2.0 Flash",
        "provider": "Google",
        "context_length": 1000000,
        "prompt_price_per_1m": 0.10,
        "completion_price_per_1m": 0.40,
        "description": "1 Milyon token bağlam penceresi ve ultra düşük gecikme süresi.",
        "supports_tools": True,
        "supports_vision": True,
        "is_default": False
    },
    {
        "id": "deepseek/deepseek-r1",
        "name": "DeepSeek R1 (Açık Mantık Ağı)",
        "provider": "DeepSeek",
        "context_length": 64000,
        "prompt_price_per_1m": 0.55,
        "completion_price_per_1m": 2.19,
        "description": "Matematik, algoritma ve karmaşık muhasebe denetimi için optimize edilmiş akıl yürütme.",
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
            resp.raise_for_status()
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
        turns = 0

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

        # REAL OpenRouter Loop with credentials
        while turns < max_turns:
            turns += 1
            try:
                data = await self.call_completion(current_messages, model=model, tools=tool_schemas)
                choice = data["choices"][0]
                msg = choice["message"]
                content = msg.get("content")
                tool_calls = msg.get("tool_calls")

                if content:
                    yield {"type": "assistant_text", "content": content}

                if not tool_calls:
                    # No more tools requested, finished!
                    break

                current_messages.append(msg)

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

                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id"),
                        "content": tool_output_str
                    })

            except Exception as ex:
                logger.exception(f"OpenRouter invocation error: {ex}")
                yield {"type": "error", "message": f"LLM Gateway Error: {str(ex)}"}
                yield {"type": "assistant_text", "content": f"⚠️ LLM Servisi ile iletişim kurulurken bir sorun oluştu:\n`{str(ex)}`\n\nLütfen `.env` dosyanızdaki `OPENROUTER_API_KEY` anahtarınızı ve bakiye durumunuzu kontrol edin."}
                break

        yield {"type": "done", "status": "completed"}
