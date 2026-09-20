import asyncio
from typing import Dict, Any, List
import json
import logging

logger = logging.getLogger(__name__)

class AgentTaskManager:
    def __init__(self):
        self.subscribers: Dict[str, List[asyncio.Queue]] = {}
        self.running_tasks: Dict[str, asyncio.Task] = {}
        
    def subscribe(self, agent_id: str) -> asyncio.Queue:
        if agent_id not in self.subscribers:
            self.subscribers[agent_id] = []
        queue = asyncio.Queue()
        self.subscribers[agent_id].append(queue)
        return queue
        
    def unsubscribe(self, agent_id: str, queue: asyncio.Queue):
        if agent_id in self.subscribers:
            try:
                self.subscribers[agent_id].remove(queue)
            except ValueError:
                pass
                
    async def broadcast(self, agent_id: str, event: Any):
        if agent_id in self.subscribers:
            for queue in self.subscribers[agent_id]:
                try:
                    await queue.put(event)
                except Exception as e:
                    logger.error(f"Error broadcasting to queue for agent {agent_id}: {e}")

    def is_running(self, agent_id: str) -> bool:
        task = self.running_tasks.get(agent_id)
        return task is not None and not task.done()

agent_manager = AgentTaskManager()
