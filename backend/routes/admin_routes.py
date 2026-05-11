from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
import logging

from rag.firebase_storage_loader import _init_firebase_storage, PDF_METADATA
from scripts.ingest_from_storage import ingest_from_firebase_storage
from services.audit_logger import log_audit_event

logger = logging.getLogger("mathpulse.admin")

router = APIRouter(prefix="/api/admin", tags=["admin"])

def require_admin(request: Request):
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

class ReingestRequest(BaseModel):
    subjectId: Optional[str] = None
    storagePath: Optional[str] = None

@router.post("/upload-pdf")
async def upload_pdf(
    subjectId: str = Form(...),
    subjectName: str = Form(...),
    semester: int = Form(...),
    quarter: int = Form(...),
    file: UploadFile = File(...),
    _admin=Depends(require_admin)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
        
    file_content = await file.read()
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit.")
        
    _, bucket = _init_firebase_storage()
    if not bucket:
        raise HTTPException(status_code=500, detail="Firebase storage is not initialized.")
        
    storage_path = f"curriculum/{subjectId}/{file.filename}"
    
    try:
        blob = bucket.blob(storage_path)
        blob.upload_from_string(file_content, content_type="application/pdf")
    except Exception as e:
        logger.error(f"Failed to upload PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload to Firebase Storage: {e}")
        
    # Update metadata in memory before reingesting
    PDF_METADATA[storage_path] = {
        "subject": subjectName,
        "subjectId": subjectId,
        "type": "uploaded_module",
        "semester": semester,
        "quarter": quarter
    }
    
    # Reingest
    try:
        ingest_from_firebase_storage(force_reindex=True)
    except Exception as e:
        logger.error(f"Failed to trigger reingestion: {e}")
        
    storage_url = f"gs://{bucket.name}/{storage_path}"
    
    # Audit log
    import asyncio
    asyncio.create_task(log_audit_event(
        action="UPLOAD_COURSE_MATERIAL",
        actor_uid=_admin.uid,
        actor_name=_admin.name if hasattr(_admin, "name") else "Unknown",
        actor_email=_admin.email if hasattr(_admin, "email") else "",
        actor_role=_admin.role,
        description=f"Uploaded course material for {subjectName}: {file.filename}",
        target_type="subject",
        target_id=subjectId,
        route="/api/admin/upload-pdf",
        module="admin",
        metadata={"filename": file.filename, "size": len(file_content)}
    ))
    
    return {
        "success": True,
        "chunkCount": 0,
        "subjectId": subjectId,
        "storageUrl": storage_url
    }

@router.post("/reingest-pdf")
async def reingest_pdf(
    req: Optional[ReingestRequest] = None,
    _admin=Depends(require_admin)
):
    try:
        ingest_from_firebase_storage(force_reindex=True)
        import asyncio
        asyncio.create_task(log_audit_event(
            action="REINGEST_RAG_KNOWLEDGE",
            actor_uid=_admin.uid,
            actor_name=_admin.name if hasattr(_admin, "name") else "Unknown",
            actor_email=_admin.email if hasattr(_admin, "email") else "",
            actor_role=_admin.role,
            description="Triggered a full reingestion of the RAG knowledge base",
            route="/api/admin/reingest-pdf",
            module="admin"
        ))
        return {"success": True, "message": "Reingestion triggered successfully."}
    except Exception as e:
        logger.error(f"Failed to reingest: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reingest: {e}")
