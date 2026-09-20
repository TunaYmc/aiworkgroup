from typing import Dict, Any
from app.services.tools.base import BaseTool
from browser_use import Agent
from langchain_openai import ChatOpenAI
import os
import asyncio
import logging

logger = logging.getLogger(__name__)

class BrowserAgentTool(BaseTool):
    name = "browser"
    description = "Web tarayıcısı kullanarak karmaşık web işlemlerini (arama yapma, tıklama, okuma, form doldurma) otonom olarak gerçekleştirir. Ne yapmak istediğinizi açık bir doğal dille (örn. 'Google'a gir ve en son yapay zeka haberlerini bul') belirtin."
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

        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            return {"error": "OPENROUTER_API_KEY bulunamadı."}

        # Use an advanced model for browser tasks, fallback to context model if needed
        model = context.get("model", "anthropic/claude-3.5-sonnet")
        if "llama" in model.lower() or "mistral" in model.lower():
            # Force a strong model for browser-use as it requires good reasoning
            model = "anthropic/claude-3.5-sonnet"

        llm = ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            model=model,
        )
        
        try:
            logger.info(f"Browser agent starting task: {task}")
            # Initialize agent
            agent = Agent(task=task, llm=llm)
            # Run agent asynchronously
            result = await agent.run()
            logger.info("Browser agent completed task successfully.")
            return {"status": "success", "result": str(result)}
        except Exception as e:
            logger.exception("Browser agent failed")
            return {"status": "error", "error": str(e)}
