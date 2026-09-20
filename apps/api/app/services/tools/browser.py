import os
import asyncio
import logging
from typing import Dict, Any

from app.core.config import settings
from app.services.tools.base import BaseTool
from browser_use import Agent
from browser_use.llm.openai.chat import ChatOpenAI
from browser_use.browser.profile import BrowserProfile

logger = logging.getLogger(__name__)

class BrowserAgentTool(BaseTool):
    name = "browser"
    description = (
        "ÖNEMLİ: Gerçek bir web tarayıcısına tam erişimin var. Bu aracı kullanarak hesap açma, "
        "form doldurma, ürün fiyatı alma, araştırma yapma ve sayfa gezintisi dahil tüm tarayıcı "
        "işlemlerini yapabilirsin. Kullanıcıya 'yapamam' veya 'tarayıcım yok' DEME. "
        "Doğrudan bu aracı kullanarak kullanıcı ne istiyorsa (örn. 'Amazon\\'dan laptop fiyatlarını al', "
        "'Bir siteye üye ol') 'task' parametresine yaz ve çalıştır."
    )
    parameters_schema = {
        "type": "object",
        "properties": {
            "task": {
                "type": "string",
                "description": "Tarayıcı ajanının yerine getirmesi gereken görev veya hedef. Mümkün olduğunca detaylı olmalıdır."
            }
        },
        "required": ["task"]
    }

    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        task = params.get("task")
        if not task:
            return {"error": "Görev ('task') parametresi eksik."}

        api_key = settings.OPENROUTER_API_KEY or os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            return {"error": "OPENROUTER_API_KEY sistemde yapılandırılmamış."}

        # Select model for browser use
        model = context.get("model", "anthropic/claude-3.5-sonnet")
        if any(weak in model.lower() for weak in ["llama", "mistral", "deepseek-r1"]):
            model = "anthropic/claude-3.5-sonnet"

        try:
            logger.info(f"Browser agent initializing with model {model} for task: {task}")
            
            # Configure native Browser-Use ChatOpenAI client pointing to OpenRouter
            llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.2,
            )

            # Docker-compatible Chromium profile
            browser_profile = BrowserProfile(
                headless=True,
                chromium_sandbox=False,
                disable_security=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-setuid-sandbox",
                ]
            )

            agent = Agent(
                task=task,
                llm=llm,
                browser_profile=browser_profile,
                use_vision=True,
            )

            logger.info("Executing browser agent run...")
            result = await agent.run(max_steps=25)
            logger.info("Browser agent completed task successfully.")

            # Extract result cleanly
            if hasattr(result, "final_result") and result.final_result():
                final_output = result.final_result()
            elif hasattr(result, "all_results") and result.all_results():
                final_output = "\n".join(str(r) for r in result.all_results())
            else:
                final_output = str(result)

            return {
                "status": "success",
                "result": final_output
            }
        except Exception as e:
            logger.exception("Browser agent execution failed")
            return {
                "status": "error",
                "error": f"Tarayıcı işlemi sırasında hata oluştu: {str(e)}"
            }
