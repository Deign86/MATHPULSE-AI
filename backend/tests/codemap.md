# backend/tests/

## Responsibility
Python regression and contract tests for backend routes, services, RAG retrieval/ingestion, and startup behavior.

## Design
- Pytest test modules use focused test functions/classes and `unittest.mock` fixtures to isolate external boundaries.
- `conftest.py` provides Firebase auth/Firebase Admin test doubles so tests do not require production credentials.
- Route tests use FastAPI `TestClient` and `main.app`; unit tests import service/RAG symbols directly.
- Representative coverage: `test_rag_pipeline.py`, `test_160_rag_lesson_retrieval.py`, `test_video_routes.py`, `test_admin_model_routes.py`, `test_wri_service.py`, and `test_memory_health.py`.

## Flow
- Test setup → `conftest.py` patches Firebase boundaries → imports route/service modules or constructs `TestClient(app)`.
- Requests exercise route → handler → mocked or real-in-process service contracts; assertions cover status, response shape, authorization, and persistence behavior.
- RAG tests call retrieval/parsing helpers directly and validate filters, exact-file behavior, lesson context, and ingestion transformations.
- Service tests validate deterministic logic such as WRI, email configuration, model profiles, caching, and memory health.

## Integration
- Tests mirror `/api/...` route → handler → service → Firestore/DeepSeek/RAG Chroma boundaries while mocking external dependencies as appropriate.
- Test modules are consumers of `backend/main.py`, `backend/routes/`, `backend/services/`, and `backend/rag/`; they do not define production APIs.
