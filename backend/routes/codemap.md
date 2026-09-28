# backend/routes/

## Responsibility
FastAPI route modules expose tutoring, curriculum, assessment, teacher, admin, and operational HTTP APIs.

## Design
- Modules define `APIRouter` instances, Pydantic request/response models, endpoint handlers, and local request/auth validation.
- `main.py` imports and mounts the routers; `ROLE_POLICIES` there (around line 404) controls path/role authorization.
- Handlers use domain services for reusable work, while some routes retain endpoint-specific orchestration and Firestore access.
- Representative routers: `rag_routes`, `deepseek_rag_routes`, `practice`, `curriculum_routes`, `class_records_router`, `admin_routes`.

## Flow
- `POST /api/rag/lesson` → `rag_routes` lesson handler → `rag.curriculum_rag` retrieval + inference client → Chroma curriculum collection / DeepSeek.
- `POST /api/jev/verify` → `jev_routes.verify_jev` → `services.jev_client.verify_lesson_factuality` → configured JEV inference.
- `GET /api/curriculum/subjects` and `/subjects/{id}/topics` → `curriculum_routes` handlers → `services.curriculum_service` → Firestore.
- `POST /api/class-records/upload` and `/api/class-records/{uploadId}/ai-report` → `class_records_router` handlers → CSV/XLSX parsing, WRI and inference services → Firestore.
- `POST /api/admin/model-config/profile` → `admin_model_routes.switch_profile` → `services.inference_client` runtime profile update; admin handlers are role-guarded.

## Integration
- `main.app.include_router(...)` mounts these route modules and applies shared auth, Firebase startup, and role policy behavior.
- `services.*` owns reusable Firestore, DeepSeek/inference, WRI, analytics, email, and quiz operations; `rag.*` owns retrieval and ingestion.
- RAG-facing endpoints connect route validation/orchestration to Chroma retrieval and DeepSeek generation; admin ingestion endpoints coordinate curriculum source files and ingestion.
