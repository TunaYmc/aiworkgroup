from pydantic import BaseModel
from typing import Optional, List
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
    path: Optional[str] = None
    type: str = "file" # "file" or "folder"

    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    file: FileResponse
    message: str

class FolderCreateRequest(BaseModel):
    path: str
    folder_name: str
