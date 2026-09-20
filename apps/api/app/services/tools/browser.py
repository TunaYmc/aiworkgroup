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

        thought_emitter = context.get("thought_emitter")
        debug_mode = getattr(settings, "AGENT_DEBUG_MODE", True)
        workspace = context.get("workspace_path")
        max_steps = getattr(settings, "BROWSER_MAX_STEPS", 20)

        # Setup debug directory in workspace (easily browsable on headless servers)
        debug_dir = None
        if workspace and debug_mode:
            debug_dir = os.path.join(workspace, "browser_debug")
            os.makedirs(debug_dir, exist_ok=True)

        try:
            logger.info(f"Browser agent initializing with model {model} (debug={debug_mode}) for task: {task}")
            if thought_emitter:
                await thought_emitter(f"🌐 Tarayıcı başlatılıyor ({model.split('/')[-1]})...")

            # Configure native Browser-Use ChatOpenAI client pointing to OpenRouter
            llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.2,
            )

            # Docker-compatible Chromium profile for headless Ubuntu environments
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

            # Callback executed on every browser navigation / DOM interaction step
            async def on_new_step(browser_state, model_output, step_number):
                url = getattr(browser_state, "url", "")
                next_goal = ""
                actions_str = ""

                if model_output:
                    if hasattr(model_output, "current_state") and model_output.current_state:
                        next_goal = getattr(model_output.current_state, "next_goal", "") or ""
                    if hasattr(model_output, "action") and model_output.action:
                        act_names = []
                        for a in model_output.action:
                            cls_name = getattr(a, "__class__", type(a)).__name__.replace("Action", "")
                            d = a.model_dump(exclude_unset=True) if hasattr(a, "model_dump") else {}
                            detail = d.get("url") or d.get("text") or d.get("pattern") or ""
                            act_names.append(f"{cls_name}('{detail}')" if detail else cls_name)
                        actions_str = ", ".join(act_names)

                if debug_mode:
                    msg_parts = [f"🌐 [Tarayıcı Adım {step_number}/{max_steps}]"]
                    if next_goal:
                        clean_goal = next_goal[:80] + ("..." if len(next_goal) > 80 else "")
                        msg_parts.append(clean_goal)
                    elif actions_str:
                        msg_parts.append(f"İşlem: {actions_str[:80]}")
                    if url and "about:blank" not in url:
                        domain = url.split("//")[-1].split("/")[0]
                        msg_parts.append(f"({domain})")
                    step_msg = " | ".join(msg_parts)
                else:
                    step_msg = f"🌐 Web sayfası taranıyor ve işleniyor (Adım {step_number}/{max_steps})..."

                logger.info(f"[BrowserAgent] {step_msg}")
                if thought_emitter:
                    await thought_emitter(step_msg)

            agent_kwargs = {
                "task": task,
                "llm": llm,
                "browser_profile": browser_profile,
                "use_vision": True,
                "register_new_step_callback": on_new_step,
            }
            if debug_dir:
                agent_kwargs["save_conversation_path"] = debug_dir

            agent = Agent(**agent_kwargs)

            logger.info("Executing browser agent run...")
            result = await agent.run(max_steps=max_steps)
            logger.info("Browser agent completed task successfully.")

            # Extract result cleanly
            if hasattr(result, "final_result") and result.final_result():
                final_output = result.final_result()
            elif hasattr(result, "all_results") and result.all_results():
                final_output = "\n".join(str(r) for r in result.all_results())
            else:
                final_output = str(result)

            # Write run summary to debug folder for headless review
            if debug_dir:
                try:
                    summary_file = os.path.join(debug_dir, "last_execution_report.md")
                    with open(summary_file, "w", encoding="utf-8") as f:
                        f.write(f"# BROWSER AGENT DEBUG REPORT\n\n**Görev:** {task}\n**Model:** {model}\n\n---\n\n## Sonuç:\n{final_output}\n")
                except Exception as save_err:
                    logger.warning(f"Could not save debug report: {save_err}")

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
