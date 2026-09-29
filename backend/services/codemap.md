# backend/services/

## Responsibility
Reusable backend domain and infrastructure services for Firestore persistence, model inference, analytics, risk, memory, and communications.

## Design
- Service modules expose focused functions/classes rather than HTTP routers; route modules call them for domain work.
- `inference_client` and `ai_client` centralize model configuration and DeepSeek access; `wri_service` and `intervention_engine` own risk/intervention logic.
- Firestore-backed modules obtain clients at the service boundary; examples include `curriculum_service`, `memory_service`, and `class_analytics_engine`.
- Other key symbols include `ClassAnalyticsEngine`, `DeterministicResponseCache`, `EmailService`, `QuestionBankService` functions, and `UserProvisioningService`.

## Flow
- `/api/curriculum/...` → `curriculum_routes` → `curriculum_service.get_subjects/get_topics` → Firestore.
- `/api/analytics/class/{class_id}` → `class_analytics_routes` → `get_class_analytics_engine()` / `ClassAnalyticsEngine` → Firestore and WRI classifications.
- `/api/risk/compute` → `risk_router.compute_risk_endpoint` → WRI service → risk response; batch route delegates per-student calculation.
- Chat and generation routes → `inference_client` / `ai_client.get_deepseek_client` → DeepSeek; `memory_service` persists chat turns and summaries in Firestore.
- Quiz Battle routes → `question_bank_service.get_questions_for_battle/cache_session_questions` → Firestore question bank and session cache.
- Class-record upload/report routes → `wri_service` and inference client → Firestore records and computed insights.

## Integration
- Called primarily by `backend/routes/`; selected services are also used by `backend/main.py` and RAG ingestion.
- Firebase Admin/Google Firestore are the persistence boundary; model calls pass through the shared inference/AI clients.
- RAG retrieval/chunk storage lives in `backend/rag/`; services consume RAG results where needed rather than owning Chroma indexing.
