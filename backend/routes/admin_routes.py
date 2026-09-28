import os
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel

from rag.firebase_storage_loader import _init_firebase_storage, PDF_METADATA
from scripts.ingest_from_storage import ingest_from_firebase_storage
from services.wri_service import ESCALATION_RISK_STATUSES, empty_risk_distribution
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

REINGESTION_STATUS: Dict[str, Any] = {
    "status": "idle",
    "last_run": None,
    "message": None,
    "mode": None
}

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

def trigger_github_curriculum_workflow(token: str, ref: str = "main", force: bool = True) -> bool:
    """Uses standard library urllib.request to POST to GitHub Actions workflow dispatch endpoint."""
    url = "https://api.github.com/repos/Deign86/MATHPULSE-AI/actions/workflows/ingest-curriculum.yml/dispatches"
    payload = {
        "ref": ref,
        "inputs": {
            "force_reindex": force,
            "upload_to_firebase": True,
        }
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MathPulseAI-Admin",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 204:
                logger.info("Successfully triggered GitHub Actions curriculum ingestion workflow.")
                return True
            logger.warning(f"Unexpected status from GitHub Actions dispatch: {response.status}")
            return False
    except urllib.error.HTTPError as exc:
        logger.error(f"GitHub Actions dispatch HTTP error {exc.code}: {exc.reason} - {exc.read().decode('utf-8', errors='ignore')}")
        return False
    except Exception as exc:
        logger.error(f"Failed to trigger GitHub Actions workflow: {exc}")
        return False

def run_cloud_ingestion_and_upload():
    """
    Runs ingest_from_firebase_storage(force_reindex=True),
    uploads vectorstore files to Firebase Storage via upload_directory and upload_vectorstore,
    and updates REINGESTION_STATUS.
    """
    global REINGESTION_STATUS
    REINGESTION_STATUS["status"] = "running"
    REINGESTION_STATUS["last_run"] = datetime.now(timezone.utc).isoformat()
    REINGESTION_STATUS["mode"] = "background_tasks"
    REINGESTION_STATUS["message"] = "Remote re-ingestion from Firebase Storage in progress..."
    logger.info("Starting background cloud curriculum reingestion and upload...")

    try:
        # Step 1: Run ingestion
        ingest_from_firebase_storage(force_reindex=True)
        logger.info("Curriculum ingestion from Firebase Storage completed successfully.")

        upload_errors = []

        # Step 2: Upload vectorstore directory via scripts.upload_vectorstore_to_firebase.upload_directory
        try:
            upload_dir_fn = None
            init_storage_fn = None
            vec_source_dir = None
            remote_pfx = "vectorstore/"

            try:
                from scripts.upload_vectorstore_to_firebase import (
                    upload_directory as _upload_dir,
                    _init_firebase_storage as _init_storage,
                    VECTORSTORE_SOURCE_DIR as _source_dir,
                    REMOTE_PREFIX as _pfx,
                )
                upload_dir_fn = _upload_dir
                init_storage_fn = _init_storage
                vec_source_dir = _source_dir
                remote_pfx = _pfx
            except ImportError:
                try:
                    from backend.scripts.upload_vectorstore_to_firebase import (
                        upload_directory as _upload_dir,
                        _init_firebase_storage as _init_storage,
                        VECTORSTORE_SOURCE_DIR as _source_dir,
                        REMOTE_PREFIX as _pfx,
                    )
                    upload_dir_fn = _upload_dir
                    init_storage_fn = _init_storage
                    vec_source_dir = _source_dir
                    remote_pfx = _pfx
                except ImportError as imp_err:
                    logger.warning(f"Could not import upload_vectorstore_to_firebase: {imp_err}")

            if upload_dir_fn and init_storage_fn:
                _, bucket = init_storage_fn()
                if bucket is not None:
                    if vec_source_dir is None:
                        from pathlib import Path
                        vec_source_dir = Path("datasets/vectorstore")
                    uploaded, skipped = upload_dir_fn(vec_source_dir, bucket, remote_pfx)
                    logger.info(f"Vectorstore directory uploaded: {uploaded} files uploaded, {skipped} skipped.")
                else:
                    logger.warning("Firebase Storage bucket not initialized; skipping upload_directory.")
        except Exception as e:
            logger.error(f"Error during vectorstore directory upload: {e}")
            upload_errors.append(f"directory_upload: {e}")

        # Step 3: Upload vectorstore archive via scripts.upload_vectorstore.upload_vectorstore
        try:
            upload_vec_fn = None
            try:
                from scripts.upload_vectorstore import upload_vectorstore as _upload_vec
                upload_vec_fn = _upload_vec
            except ImportError:
                try:
                    from backend.scripts.upload_vectorstore import upload_vectorstore as _upload_vec
                    upload_vec_fn = _upload_vec
                except ImportError:
                    import sys
                    from pathlib import Path
                    repo_root = str(Path(__file__).resolve().parents[2])
                    if repo_root not in sys.path:
                        sys.path.insert(0, repo_root)
                    try:
                        from scripts.upload_vectorstore import upload_vectorstore as _upload_vec
                        upload_vec_fn = _upload_vec
                    except ImportError as imp_err:
                        logger.warning(f"Could not import upload_vectorstore: {imp_err}")

            if upload_vec_fn:
                success = upload_vec_fn()
                if success:
                    logger.info("Vectorstore archive upload completed successfully.")
                else:
                    logger.warning("Vectorstore archive upload returned False.")
                    upload_errors.append("zip_upload_failed")
        except Exception as e:
            logger.error(f"Error during vectorstore archive upload: {e}")
            upload_errors.append(f"zip_upload: {e}")

        if upload_errors:
            REINGESTION_STATUS["status"] = "completed_with_warnings"
            REINGESTION_STATUS["message"] = f"Ingestion finished, but upload had warnings: {'; '.join(upload_errors)}"
        else:
            REINGESTION_STATUS["status"] = "completed"
            REINGESTION_STATUS["message"] = "Remote re-ingestion and vectorstore upload completed successfully."
        logger.info("Cloud curriculum reingestion process finished.")

    except Exception as exc:
        logger.error(f"Background cloud reingestion failed: {exc}", exc_info=True)
        REINGESTION_STATUS["status"] = "failed"
        REINGESTION_STATUS["message"] = f"Re-ingestion failed: {str(exc)}"

_run_reingestion_task = run_cloud_ingestion_and_upload

@router.get("/reingest-status")
async def get_reingest_status(_admin=Depends(require_admin)):
    return REINGESTION_STATUS

@router.post("/upload-pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    subjectId: str = Form(...),
    subjectName: str = Form(...),
    semester: Optional[int] = Form(None),
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
    
    # Reingest in background
    try:
        background_tasks.add_task(run_cloud_ingestion_and_upload)
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
    background_tasks: BackgroundTasks,
    req: Optional[ReingestRequest] = None,
    _admin=Depends(require_admin)
):
    try:
        github_token = os.getenv("GITHUB_PAT") or os.getenv("GITHUB_TOKEN")
        dispatched_gh = False
        if github_token:
            dispatched_gh = trigger_github_curriculum_workflow(token=github_token)

        audit_fn = _get_audit_logger()

        if dispatched_gh:
            REINGESTION_STATUS["status"] = "running"
            REINGESTION_STATUS["mode"] = "github_actions"
            REINGESTION_STATUS["last_run"] = datetime.now(timezone.utc).isoformat()
            REINGESTION_STATUS["message"] = "Remote re-ingestion dispatched to GitHub Actions runner."

            if audit_fn:
                import asyncio
                asyncio.create_task(audit_fn(
                    action="REINGEST_RAG_KNOWLEDGE",
                    actor_uid=_admin.uid,
                    actor_name=_admin.name if hasattr(_admin, "name") else "Unknown",
                    actor_email=_admin.email if hasattr(_admin, "email") else "",
                    actor_role=_admin.role,
                    description="Triggered remote cloud reingestion of the RAG knowledge base via GitHub Actions",
                    route="/api/admin/reingest-pdf",
                    module="admin"
                ))

            return {
                "success": True,
                "message": "Remote re-ingestion dispatched to GitHub Actions runner.",
                "execution_mode": "github_actions"
            }

        REINGESTION_STATUS["status"] = "running"
        REINGESTION_STATUS["mode"] = "background_tasks"
        REINGESTION_STATUS["last_run"] = datetime.now(timezone.utc).isoformat()
        REINGESTION_STATUS["message"] = "Remote re-ingestion started in the cloud."
        background_tasks.add_task(run_cloud_ingestion_and_upload)

        if audit_fn:
            import asyncio
            asyncio.create_task(audit_fn(
                action="REINGEST_RAG_KNOWLEDGE",
                actor_uid=_admin.uid,
                actor_name=_admin.name if hasattr(_admin, "name") else "Unknown",
                actor_email=_admin.email if hasattr(_admin, "email") else "",
                actor_role=_admin.role,
                description="Triggered remote cloud reingestion of the RAG knowledge base in background",
                route="/api/admin/reingest-pdf",
                module="admin"
            ))

        return {
            "success": True,
            "message": "Remote re-ingestion started in the cloud.",
            "execution_mode": "background_tasks"
        }
    except Exception as e:
        logger.error(f"Failed to trigger reingestion: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger reingestion: {e}")


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

@router.get("/dashboard-analytics")
def get_dashboard_analytics(request: Request):
    """Aggregate dashboard metrics from current Firestore records."""
    require_admin(request)

    try:
        import firebase_admin
        from firebase_admin import firestore as fs
        db = fs.client()
        users = list(db.collection("users").stream())
        classrooms = list(db.collection("classrooms").stream())
        audit_logs = list(db.collection("auditLogs").stream())
        managed_students = list(db.collection("managedStudents").stream())
        curriculum_modules = list(db.collection("curriculumModules").stream())
    except Exception:
        logger.exception("Unable to read dashboard analytics from Firestore")
        raise HTTPException(status_code=503, detail="Firestore unavailable")

    from collections import Counter
    from datetime import timedelta

    def score_from(record):
        for key in ("averageScore", "average_score", "diagnosticScore", "masteryScore", "mastery_score"):
            value = record.get(key)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                return max(0, min(100, float(value)))
        return None

    students = {}
    for snapshot in users:
        record = snapshot.to_dict() or {}
        if str(record.get("role", "")).lower() == "student":
            students[snapshot.id] = record
    for snapshot in managed_students:
        students.setdefault(snapshot.id, snapshot.to_dict() or {})

    scores = [score for record in students.values() if (score := score_from(record)) is not None]
    passed = sum(score >= 60 for score in scores)
    total_students = len(students)
    risk_subjects = Counter()
    at_risk_ids = set()
    for snapshot in managed_students:
        record = snapshot.to_dict() or {}
        status = str(record.get("riskStatus") or record.get("risk_status") or "").lower()
        user = students.get(snapshot.id, {})
        overall_risk = str(user.get("overallRisk") or user.get("riskLevel") or "").lower()
        if status in {"intervene", "critical", "at_risk", "high"} or overall_risk == "high":
            at_risk_ids.add(snapshot.id)
            subject = record.get("weakestSubject") or record.get("weakest_subject") or record.get("subject")
            if subject:
                risk_subjects[str(subject)] += 1
    for uid, record in students.items():
        if str(record.get("overallRisk") or record.get("riskLevel") or "").lower() == "high":
            at_risk_ids.add(uid)

    now = datetime.now(timezone.utc)
    day_names = ["M", "T", "W", "T", "F", "S", "S"]
    weekly = []
    today = now.date()
    for days_ago in range(6, -1, -1):
        date = today - timedelta(days=days_ago)
        weekly.append({"name": day_names[date.weekday()], "ai": 0, "man": 0})
    for snapshot in audit_logs:
        record = snapshot.to_dict() or {}
        timestamp = record.get("timestamp") or record.get("timestampRaw") or record.get("createdAt")
        if hasattr(timestamp, "to_datetime"):
            timestamp = timestamp.to_datetime()
        elif hasattr(timestamp, "seconds"):
            timestamp = datetime.fromtimestamp(timestamp.seconds, tz=timezone.utc)
        elif isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError:
                continue
        if not isinstance(timestamp, datetime):
            continue
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        days_ago = (today - timestamp.astimezone(timezone.utc).date()).days
        if not 0 <= days_ago <= 6:
            continue
        action = str(record.get("action") or record.get("eventType") or record.get("type") or "").lower()
        weekly[6 - days_ago]["ai" if any(word in action for word in ("ai", "lesson", "quiz", "tutor")) else "man"] += 1

    module_subjects = {}
    for snapshot in curriculum_modules:
        record = snapshot.to_dict() or {}
        subject = record.get("subjectName") or record.get("subject") or record.get("subject_name")
        if subject:
            module_subjects[str(record.get("subjectId") or record.get("subject_id") or subject)] = str(subject)
    enrollments = Counter()
    progress_totals = Counter()
    progress_counts = Counter()
    for snapshot in classrooms:
        record = snapshot.to_dict() or {}
        subject_id = str(record.get("subjectId") or record.get("subject_id") or record.get("subject") or "")
        subject_name = module_subjects.get(subject_id, str(record.get("subjectName") or record.get("subject") or subject_id))
        roster = record.get("students") or record.get("studentIds") or []
        enrolled = len(roster) if isinstance(roster, (list, dict)) else 0
        if subject_name:
            enrollments[subject_name] += enrolled
            progress = record.get("averageProgress") or record.get("average_progress") or record.get("progress")
            if isinstance(progress, (int, float)) and not isinstance(progress, bool):
                progress_totals[subject_name] += max(0, min(100, progress))
                progress_counts[subject_name] += 1
    subject_breakdown = [
        {
            "name": name,
            "type": "STEM" if "stem" in name.lower() else "Core",
            "count": count,
            "progress": round(progress_totals[name] / progress_counts[name]) if progress_counts[name] else 0,
        }
        for name, count in enrollments.most_common()
    ]

    score_count = len(scores)
    foundational = sum(score < 50 for score in scores)
    intermediate = sum(50 <= score < 80 for score in scores)
    advanced = sum(score >= 80 for score in scores)
    distribution_total = score_count or 1
    return {
        "weeklyActivity": weekly,
        "subjectBreakdown": subject_breakdown,
        "priorityAttention": {
            "subjectName": risk_subjects.most_common(1)[0][0] if risk_subjects else "General Mathematics",
            "atRiskCount": len(at_risk_ids),
        },
        "globalMastery": {
            "avgMastery": round(sum(scores) / score_count) if score_count else 0,
            "passed": passed,
            "pending": max(0, total_students - passed),
        },
        "difficultyDistribution": {
            "foundational": round(foundational / distribution_total * 100),
            "intermediate": round(intermediate / distribution_total * 100),
            "advanced": round(advanced / distribution_total * 100),
        },
    }

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

    wri_dist = empty_risk_distribution()
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
        if updated and status in ESCALATION_RISK_STATUSES:
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
