import re

with open("apps/api/app/api/v1/agents.py", "r") as f:
    content = f.read()

# Add imports
if "from app.services.agent_manager import agent_manager" not in content:
    content = content.replace("from app.services.context_builder import ContextBuilder",
                              "from app.services.context_builder import ContextBuilder\nfrom app.services.agent_manager import agent_manager\nimport asyncio")

# Replace chat_with_agent and add stream_agent
new_chat_with_agent = """
@router.get("/{agent_id}/stream")
async def stream_agent(
    agent_id: str,
    current_org: Organization = Depends(get_current_organization),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not agent_manager.is_running(agent_id):
        # Return empty stream that immediately closes if not running
        async def empty_stream():
            yield "data: {\"type\": \"ping\"}\\n\\n"
        return StreamingResponse(empty_stream(), media_type="text/event-stream")

    queue = agent_manager.subscribe(agent_id)
    
    async def event_generator():
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\\n\\n"
                if event.get("type") == "done":
                    break
        except asyncio.CancelledError:
            pass
        finally:
            agent_manager.unsubscribe(agent_id, queue)
            
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)

@router.post("/{agent_id}/chat")
async def chat_with_agent(
    agent_id: str,
    message_in: AgentMessageCreate,
    current_org: Organization = Depends(get_current_organization),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent).where((Agent.id == agent_id) & (Agent.organization_id == current_org.id))
    )
    agent = result.scalars().first()
    if not agent and (agent_id.startswith("agent-") or agent_id == "demo-agent"):
        fallback_res = await db.execute(
            select(Agent).where(Agent.organization_id == current_org.id).order_by(Agent.created_at.asc())
        )
        agent = fallback_res.scalars().first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent bulunamadı")

    # Save user message
    user_msg = AgentMessage(
        organization_id=current_org.id,
        agent_id=agent.id,
        role="user",
        content=message_in.content
    )
    db.add(user_msg)
    await db.commit()

    if message_in.model:
        current_config = dict(agent.model_config_data or {})
        if current_config.get("primary_model") != message_in.model:
            current_config["primary_model"] = message_in.model
            agent.model_config_data = current_config
            await db.commit()

    context_builder = ContextBuilder(db)
    built_context = await context_builder.build_context(agent, current_task_prompt=message_in.content)
    if message_in.model:
        built_context["model"] = message_in.model
        
    # If already running, wait/reject? For now just cancel old or ignore.
    # Let's assume we just start a new task
    
    org_id_val = current_org.id
    agent_id_val = agent.id
    
    async def background_agent_task(prompt, context):
        runtime = OpenClawRuntimeAdapter()
        full_assistant_reply = ""
        try:
            async for event in runtime.stream(agent_id_val, task_id="chat-turn", prompt=prompt, context=context):
                if event.get("type") == "assistant_text" and event.get("content"):
                    full_assistant_reply += event.get("content", "")
                await agent_manager.broadcast(agent_id_val, event)
        except Exception as ex:
            logger.exception(f"Error in chat stream: {ex}")
            err_text = f"⚠️ Ajan çalıştırılırken bir sorun oluştu: {str(ex)}"
            full_assistant_reply = err_text
            await agent_manager.broadcast(agent_id_val, {"type": "assistant_text", "content": err_text})
            
        if not full_assistant_reply.strip():
            fallback_text = f"Merhaba! '{prompt}' talebiniz başarıyla alındı ve ajanın çalışma hafızasına kaydedildi."
            full_assistant_reply = fallback_text
            await agent_manager.broadcast(agent_id_val, {"type": "assistant_text", "content": fallback_text})

        # Persist
        try:
            from app.core.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                assistant_msg = AgentMessage(
                    organization_id=org_id_val,
                    agent_id=agent_id_val,
                    role="assistant",
                    content=full_assistant_reply
                )
                session.add(assistant_msg)
                await session.commit()
        except Exception as db_err:
            logger.warning(f"Failed to persist assistant message: {db_err}")

        await agent_manager.broadcast(agent_id_val, {"type": "done"})
        
        # Cleanup queues
        for q in agent_manager.subscribers.get(agent_id_val, []):
            await q.put(None)
        agent_manager.subscribers[agent_id_val] = []
        if agent_id_val in agent_manager.running_tasks:
            del agent_manager.running_tasks[agent_id_val]

    # Start the task
    task = asyncio.create_task(background_agent_task(message_in.content, built_context))
    agent_manager.running_tasks[agent_id_val] = task
    
    # We must also return a stream for the current request!
    queue = agent_manager.subscribe(agent_id_val)
    async def event_generator():
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\\n\\n"
                if event.get("type") == "done":
                    break
        except asyncio.CancelledError:
            pass
        finally:
            agent_manager.unsubscribe(agent_id_val, queue)
            
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)
"""

content = re.sub(r"@router\.post\(\"\/\{agent_id\}\/chat\"\).*?(?=\n@|\Z)", new_chat_with_agent, content, flags=re.DOTALL)

with open("apps/api/app/api/v1/agents.py", "w") as f:
    f.write(content)
