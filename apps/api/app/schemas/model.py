from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ModelCatalogItem(BaseModel):
    id: str
    name: str
    provider: str
    context_length: int
    prompt_price_per_1m: float
    completion_price_per_1m: float
    description: str
    supports_tools: bool = True
    supports_vision: bool = False
    is_default: bool = False

class ModelConfigUpdate(BaseModel):
    primary_model: str
    fallback_models: List[str] = []
    temperature: float = 0.3
    max_tokens: int = 4096
    reasoning: Optional[Dict[str, Any]] = None
