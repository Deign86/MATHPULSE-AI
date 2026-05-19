from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
import logging

from rag.firebase_storage_loader import _init_firebase_storage, PDF_METADATA
from scripts.ingest_from_storage import ingest_from_firebase_storage
# Lazy import for audit_logger to prevent ModuleNotFoundError during test collection
_audit_logger = None
def _get_audit_logger():
    global _audit_logger
    if _audit_logger is None:
        try:
            from services.audit_logger import log_audit_event as _fn
            _audit_logger = _fn
        except ImportError:
            _audit_logger = False
    return _audit_logger if _audit_logger is not False else None

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
    asyncio.create_task(_get_audit_logger()(
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
        asyncio.create_task(_get_audit_logger()(
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


class DeleteFileRequest(BaseModel):
    fileId: str
    collection: str  # 'courseMaterials' or 'classRecordImports'


@router.post("/delete-file")
async def delete_uploaded_file(
    req: DeleteFileRequest,
    request: Request,
    _admin=Depends(require_admin),
):
    """Delete an uploaded file and its associated data."""
    import firebase_admin
    from firebase_admin import firestore as fs

    if req.collection not in ("courseMaterials", "classRecordImports"):
        raise HTTPException(status_code=400, detail="Invalid collection")

    try:
        client = fs.client()
        doc_ref = client.collection(req.collection).document(req.fileId)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="File not found")

        doc_data = doc_snap.to_dict() or {}

        # Delete associated normalizedClassRecords for class record imports
        if req.collection == "classRecordImports":
            teacher_id = doc_data.get("teacherId", "")
            class_section_id = doc_data.get("classSectionId", "")
            if teacher_id:
                norm_query = client.collection("normalizedClassRecords").where(
                    "teacherId", "==", teacher_id
                )
                if class_section_id:
                    norm_query = norm_query.where("classSectionId", "==", class_section_id)
                norm_docs = norm_query.stream()
                batch = client.batch()
                count = 0
                for norm_doc in norm_docs:
                    batch.delete(norm_doc.reference)
                    count += 1
                    if count >= 400:
                        batch.commit()
                        batch = client.batch()
                        count = 0
                if count > 0:
                    batch.commit()

        # Delete the main document
        doc_ref.delete()

        # Audit log
        audit_fn = _get_audit_logger()
        if audit_fn:
            try:
                import asyncio
                asyncio.create_task(audit_fn(
                    action="DELETE_UPLOADED_FILE",
                    actor_uid=_admin.uid,
                    actor_name=getattr(_admin, "name", "Unknown"),
                    actor_email=getattr(_admin, "email", ""),
                    actor_role=_admin.role,
                    description=f"Deleted {req.collection}/{req.fileId} ({doc_data.get('fileName', 'unknown')})",
                    route="/api/admin/delete-file",
                    module="admin",
                ))
            except Exception:
                pass

        return {"success": True, "message": "File and associated data deleted."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")



# ─── School-Wide Analytics ─────────────────────────────────────────────────

@router.get("/school-analytics")
def get_school_analytics(request: Request):
    """School-wide WRI aggregation for admin dashboard."""
    require_admin(request)

    try:
        import firebase_admin
        from firebase_admin import firestore as fs
        db = fs.client()
    except Exception:
        raise HTTPException(status_code=503, detail="Firestore unavailable")

    from datetime import datetime, timezone, timedelta
    from collections import defaultdict

    # Read all student_profiles
    profiles = list(db.collection("student_profiles").stream())

    total = len(profiles)
    if total == 0:
        # Fallback: read from managedStudents
        profiles = list(db.collection("managedStudents").stream())
        total = len(profiles)

    wri_dist = {"safe": 0, "watch": 0, "intervene": 0, "critical": 0, "at_risk": 0, "pending_assessment": 0}
    wri_values = []
    grade_wri: dict = defaultdict(list)
    class_wri: dict = defaultdict(list)
    weak_topics_counter: dict = defaultdict(int)
    recent_escalations = []
    pending_count = 0
    now = datetime.now(timezone.utc)

    for doc in profiles:
        data = doc.to_dict()
        status = data.get("risk_status") or data.get("riskStatus") or "pending_assessment"

        # Normalize status
        if status in wri_dist:
            wri_dist[status] += 1
        else:
            wri_dist["pending_assessment"] += 1

        wri = data.get("wri")
        if wri is not None:
            wri_values.append(wri)
            grade = str(data.get("grade_level") or data.get("gradeLevel") or data.get("grade", "?"))
            grade_wri[grade].append(wri)
            class_id = data.get("class_id") or data.get("classroomId") or ""
            if class_id:
                class_wri[class_id].append(wri)

        if status == "pending_assessment" or data.get("diagnosticScore") is None:
            pending_count += 1

        # Weak topics
        weak = data.get("quiz_performance", {}).get("lowest_accuracy_topics") or []
        if not weak:
            weak = [data.get("weakestTopic")] if data.get("weakestTopic") and data.get("weakestTopic") != "N/A" else []
        for t in weak[:2]:
            if t:
                weak_topics_counter[t] += 1

        # Recent escalations (last 24h)
        updated = data.get("wri_updated_at") or data.get("riskUpdatedAt")
        if updated and status in ("critical", "at_risk"):
            try:
                if hasattr(updated, "seconds"):
                    dt = datetime.fromtimestamp(updated.seconds, tz=timezone.utc)
                elif isinstance(updated, str):
                    dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                else:
                    dt = None
                if dt and (now - dt).total_seconds() < 86400:
                    recent_escalations.append({
                        "student_id": doc.id,
                        "student_name": data.get("display_name") or data.get("name", "Unknown"),
                        "risk_status": status,
                        "wri": wri,
                        "teacher_id": data.get("teacher_id") or data.get("teacherId", ""),
                        "escalated_at": dt.isoformat(),
                    })
            except Exception:
                pass

    school_avg = round(sum(wri_values) / len(wri_values), 1) if wri_values else 0.0
    avg_by_grade = {g: round(sum(v) / len(v), 1) for g, v in grade_wri.items() if v}
    classes_ranked = sorted(
        [{"class_id": c, "avg_wri": round(sum(v) / len(v), 1), "student_count": len(v)} for c, v in class_wri.items() if v],
        key=lambda x: x["avg_wri"]
    )
    top_weak = sorted(weak_topics_counter.items(), key=lambda x: -x[1])[:10]

    return {
        "total_students": total,
        "wri_distribution": wri_dist,
        "school_avg_wri": school_avg,
        "avg_wri_by_grade": avg_by_grade,
        "classes_ranked": classes_ranked[:20],
        "top_weak_topics_school": [t for t, _ in top_weak],
        "recent_escalations": recent_escalations[:20],
        "pending_assessment_count": pending_count,
        "generated_at": now.isoformat(),
    }
