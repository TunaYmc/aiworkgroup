import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_organization
from app.models.tenant import Organization, User
from app.models.agent import AgentFile
from app.schemas.file import FileResponse, FileUploadResponse
from app.services.storage import storage_service
from app.services.ingestion import ingestion_service

router = APIRouter(prefix="/files", tags=["Files"])

@router.get("", response_model=List[FileResponse])
async def list_files(
    agent_id: Optional[str] = None,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    query = select(AgentFile).where(AgentFile.organization_id == current_org.id)
    if agent_id:
        query = query.where(AgentFile.agent_id == agent_id)
    query = query.order_by(desc(AgentFile.created_at))
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    agent_id: Optional[str] = Form(None),
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    file_size = len(content)
    checksum = hashlib.sha256(content).hexdigest()

    # Create DB record
    agent_file = AgentFile(
        organization_id=current_org.id,
        agent_id=agent_id,
        filename=file.filename or "unnamed_file",
        mime_type=file.content_type or "application/octet-stream",
        size=file_size,
        storage_key="pending",
        checksum=checksum,
        status="processing"
    )
    db.add(agent_file)
    await db.flush()

    # Generate key and upload to MinIO/S3
    storage_key = storage_service.generate_storage_key(
        organization_id=current_org.id,
        agent_id=agent_id,
        file_id=agent_file.id,
        filename=agent_file.filename
    )
    agent_file.storage_key = storage_key
    await db.commit()

    import io
    import os
    from app.core.config import settings

    # 1. Upload to S3/MinIO
    try:
        storage_service.upload_file(io.BytesIO(content), storage_key, agent_file.mime_type)
    except Exception as s3_err:
        pass

    # 2. Save file to tenant documents directory for filesystem tool access
    clean_filename = os.path.basename(agent_file.filename)
    tenant_docs_dir = os.path.join(settings.DEFAULT_WORKSPACE_ROOT, current_org.id, "documents")
    os.makedirs(tenant_docs_dir, exist_ok=True)
    dest_path = os.path.join(tenant_docs_dir, clean_filename)
    try:
        with open(dest_path, "wb") as f_out:
            f_out.write(content)
    except Exception:
        pass

    # 3. Mirror file into agent workspaces
    agents_dir = os.path.join(settings.DEFAULT_WORKSPACE_ROOT, current_org.id, "agents")
    if os.path.exists(agents_dir):
        for ag_dir in os.listdir(agents_dir):
            ag_ws_docs = os.path.join(agents_dir, ag_dir, "workspace", "documents")
            os.makedirs(ag_ws_docs, exist_ok=True)
            try:
                with open(os.path.join(ag_ws_docs, clean_filename), "wb") as f_ag:
                    f_ag.write(content)
            except Exception:
                pass

    # Ingest document text for RAG
    await ingestion_service.ingest_file(db, agent_file, content)

    return FileUploadResponse(
        file=FileResponse.model_validate(agent_file),
        message="Dosya başarıyla yüklendi ve işleme alındı."
    )

@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AgentFile).where((AgentFile.id == file_id) & (AgentFile.organization_id == current_org.id))
    )
    agent_file = result.scalars().first()
    if not agent_file:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    file_bytes = storage_service.download_file(agent_file.storage_key)
    if not file_bytes:
        # Fallback for dev if storage not populated
        file_bytes = b"File content placeholder in development mode"

    return Response(
        content=file_bytes,
        media_type=agent_file.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{agent_file.filename}"'}
    )

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AgentFile).where((AgentFile.id == file_id) & (AgentFile.organization_id == current_org.id))
    )
    agent_file = result.scalars().first()
    if not agent_file:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    storage_service.delete_file(agent_file.storage_key)
    await db.delete(agent_file)
    await db.commit()
    return {"message": "Dosya başarıyla silindi"}
