import os
import uuid
import hashlib
import mimetypes
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_organization
from app.models.tenant import Organization
from app.models.agent import AgentFile
from app.schemas.file import FileResponse, FileUploadResponse, FolderCreateRequest
from app.services.storage import storage_service
from app.services.ingestion import ingestion_service
from app.core.config import settings

router = APIRouter(prefix="/files", tags=["Files"])

def get_tenant_docs_dir(org_id: str) -> str:
    path = os.path.join(settings.DEFAULT_WORKSPACE_ROOT, org_id, "documents")
    os.makedirs(path, exist_ok=True)
    return path

def sanitize_path(base_dir: str, requested_path: str) -> str:
    clean_path = requested_path.strip("/")
    if ".." in clean_path:
        raise HTTPException(status_code=400, detail="Invalid path")
    full_path = os.path.abspath(os.path.join(base_dir, clean_path))
    if not full_path.startswith(os.path.abspath(base_dir)):
        raise HTTPException(status_code=400, detail="Access denied")
    return full_path

@router.get("", response_model=List[FileResponse])
async def list_files(
    path: str = "",
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    base_dir = get_tenant_docs_dir(current_org.id)
    target_dir = sanitize_path(base_dir, path)
    
    if not os.path.exists(target_dir):
        return []

    # Fetch all DB records to map IDs if available
    db_files = await db.execute(select(AgentFile).where(AgentFile.organization_id == current_org.id))
    db_file_map = {f.filename: f for f in db_files.scalars().all()}

    results = []
    try:
        entries = os.listdir(target_dir)
    except Exception:
        return []

    for entry in entries:
        full_entry_path = os.path.join(target_dir, entry)
        rel_path = os.path.relpath(full_entry_path, base_dir).replace("\\", "/")
        is_dir = os.path.isdir(full_entry_path)
        
        stat = os.stat(full_entry_path)
        created_at = datetime.fromtimestamp(stat.st_mtime)
        
        if is_dir:
            results.append(FileResponse(
                id=f"folder_{hashlib.md5(rel_path.encode()).hexdigest()[:12]}",
                organization_id=current_org.id,
                filename=entry,
                mime_type="folder",
                size=0,
                storage_key="",
                status="ready",
                created_at=created_at,
                path=rel_path,
                type="folder"
            ))
        else:
            db_record = db_file_map.get(rel_path) or db_file_map.get(entry)
            file_id = db_record.id if db_record else f"file_{hashlib.md5(rel_path.encode()).hexdigest()[:12]}"
            mime = mimetypes.guess_type(entry)[0] or "application/octet-stream"
            results.append(FileResponse(
                id=file_id,
                organization_id=current_org.id,
                filename=entry,
                mime_type=mime,
                size=stat.st_size,
                storage_key=db_record.storage_key if db_record else "",
                status="ready",
                created_at=db_record.created_at if db_record else created_at,
                path=rel_path,
                type="file"
            ))

    # Sort folders first, then files
    results.sort(key=lambda x: (0 if x.type == 'folder' else 1, x.filename.lower()))
    return results

@router.post("/folder")
async def create_folder(
    req: FolderCreateRequest,
    current_org: Organization = Depends(get_current_organization)
):
    base_dir = get_tenant_docs_dir(current_org.id)
    target_dir = sanitize_path(base_dir, req.path)
    new_folder_path = sanitize_path(target_dir, req.folder_name)
    
    os.makedirs(new_folder_path, exist_ok=True)
    return {"status": "success", "path": os.path.relpath(new_folder_path, base_dir).replace("\\", "/")}

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(""),
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    file_size = len(content)
    checksum = hashlib.sha256(content).hexdigest()

    base_dir = get_tenant_docs_dir(current_org.id)
    target_dir = sanitize_path(base_dir, path)
    os.makedirs(target_dir, exist_ok=True)
    
    clean_filename = file.filename or "unnamed_file"
    dest_path = os.path.join(target_dir, clean_filename)
    rel_path = os.path.relpath(dest_path, base_dir).replace("\\", "/")

    # Create DB record to keep RAG logic happy
    agent_file = AgentFile(
        organization_id=current_org.id,
        filename=rel_path,  # store relative path in DB
        mime_type=file.content_type or "application/octet-stream",
        size=file_size,
        storage_key="local",
        checksum=checksum,
        status="processing"
    )
    db.add(agent_file)
    await db.flush()
    await db.commit()

    with open(dest_path, "wb") as f_out:
        f_out.write(content)

    # Ingest document text for RAG
    try:
        await ingestion_service.ingest_file(db, agent_file, content)
    except Exception:
        pass

    resp = FileResponse.model_validate(agent_file)
    resp.path = rel_path
    resp.type = "file"
    
    return FileUploadResponse(
        file=resp,
        message="Dosya başarıyla yüklendi."
    )

@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    path: str = "",
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    # Support downloading by path directly if id starts with 'file_'
    base_dir = get_tenant_docs_dir(current_org.id)
    
    if path:
        target_path = sanitize_path(base_dir, path)
    else:
        # Fallback to DB lookup
        result = await db.execute(
            select(AgentFile).where((AgentFile.id == file_id) & (AgentFile.organization_id == current_org.id))
        )
        agent_file = result.scalars().first()
        if not agent_file:
            raise HTTPException(status_code=404, detail="Dosya bulunamadı")
        target_path = sanitize_path(base_dir, agent_file.filename)

    if not os.path.exists(target_path) or os.path.isdir(target_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    with open(target_path, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(target_path)
    guessed_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    return Response(
        content=file_bytes,
        media_type=guessed_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    path: str = "",
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    base_dir = get_tenant_docs_dir(current_org.id)
    
    if path:
        target_path = sanitize_path(base_dir, path)
    else:
        result = await db.execute(select(AgentFile).where((AgentFile.id == file_id) & (AgentFile.organization_id == current_org.id)))
        agent_file = result.scalars().first()
        if agent_file:
            target_path = sanitize_path(base_dir, agent_file.filename)
            await db.delete(agent_file)
            await db.commit()
        else:
            raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    if os.path.exists(target_path):
        if os.path.isdir(target_path):
            import shutil
            shutil.rmtree(target_path)
        else:
            os.remove(target_path)
            
    return {"message": "Başarıyla silindi"}
