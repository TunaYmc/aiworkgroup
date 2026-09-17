from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FileResponse(BaseModel):
    id: str
    organization_id: str
    agent_id: Optional[str] = None
    filename: str
    mime_type: str
    size: int
    storage_key: str
    checksum: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    file: FileResponse
    message: str
