# backend/

## Responsibility
FastAPI backend entry point: initializes Firebase/Firestore, authentication, middleware, model clients, and API routes; implements core AI, import, analytics, admin, and automation endpoints in `main.py`.

## Design
- `main.py` combines application bootstrap and legacy/core endpoints; domain routers are included as separate `routes.*` modules.
- `app_lifespan` manages startup/shutdown; Firebase Admin initialization is lazy and supports service-account JSON/file and application-default credentials.
- `AuthenticatedUser`, `get_current_user`, `resolve_required_roles`, and role policies centralize bearer-token verification and authorization; environment variables tune model, upload, cache, and async-task behavior.
- Firestore is accessed through `get_firestore_client`; the schema is code-defined through collection/document paths rather than a standalone schema module.

## Flow
1. Import creates FastAPI `app`; startup validates config and initializes runtime clients.
2. `AuthMiddleware` and `RequestMiddleware` process requests; optional SlowAPI setup installs rate-limit handling.
3. `include_router` mounts domain routers; core routes authenticate/authorize, invoke inference/RAG/analytics helpers, then return typed responses or stream results.
4. Data paths read/write Firestore and model/RAG providers; async generation stores task state for `/api/tasks/{task_id}` polling.

## Integration
- Router modules: `rag`, `admin_model`, `admin`, `curriculum`, `diagnostic`, `video`, `quiz_battle`, `teacher_materials`, `class_records`, `risk`, `tutor_checkin`, `practice`, `try_it_yourself`, `class_analytics`, `intervention`, `pipeline`, `deepseek_rag`, `at_risk_resolution`, `fun_modules`, `jev`.
- Core routes include `/api/chat`, `/api/chat/stream`, `/api/verify-solution`, `/api/predict-risk`, `/api/learning-path`, `/api/lesson/generate`, `/api/quiz/generate`, account import, class-record upload, admin users, analytics, and `/api/automation/*`.
- Firebase Auth token claims/Firestore `users` provide identity and role data. Other directly used collections include `diagnosticResults`, `classRecordImports`, `normalizedClassRecords`, `classrooms`, `managedStudents`, `riskRefreshEvents`, `riskRefreshJobs`, `riskRefreshStats`, and `classSectionOwnership`.
- Uses `middleware.rate_limiter`, `config.models.yaml`/`config.ai_pricing.py`, `services.*`, `rag.*`, and top-level `analytics.py`/`automation_engine.py`.
