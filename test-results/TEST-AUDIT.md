# Test Audit — MATHPULSE-AI Current Repo State

## Branch
test/realign-current-suite-to-main

## Commit
2276c9cfe38ff90773d2ca63762cfd1e90b1254f

## Test Runners Detected
- Pytest: yes (backend/tests/, hf_space_test/tests/)
- Vitest: yes (vitest.config.ts, src/ tests)
- Jest: yes (functions/ lib tests)
- Playwright: yes (playwright.config.ts, e2e/)
- Other: none

## Current Feature Surface Found

### Backend
- `backend/services/inference_client.py` — Model profiles (dev/budget/prod), runtime overrides, Firestore persistence, Qwen lock, task routing
- `backend/routes/admin_model_routes.py` — GET/POST profile, POST override, DELETE reset admin model config API
- `backend/routes/rag_routes.py` — RAG health endpoint with activeModel visibility
- `backend/main.py` — Main FastAPI app with /api/hf/monitoring endpoint, chat, quiz, analytics, etc.
- `backend/rag/curriculum_rag.py` — RAG retrieval, lesson prompt building, embedding model usage
- `backend/rag/vectorstore_loader.py` — Vector store loader using BAAI/bge-small-en-v1.5
- `backend/startup_validation.py` — Startup validation checks
- `backend/pre_deploy_check.py` — Pre-deployment validation

### Frontend
- `src/components/AdminAIMonitoring.tsx` — AI monitoring dashboard with metric cards, model status, embedding model display
- `src/components/admin/ModelConfigPanel.tsx` — Model config admin panel (profile switching, override display, resolved models)
- `src/services/huggingfaceMonitoringService.ts` — fetchHFMonitoringData, probeModelLatency, health status resolution
- `src/services/apiService.ts` — API fetch helper with /api/hf/monitoring and /api/rag/health routes
- `src/types/hfMonitoring.ts` — HFMonitoringData, HFMonitoringResponse, HFHealthStatus types

### E2E
- `e2e/aiMonitoring.spec.ts` — AI monitoring page E2E (load, layout, data integration, error state, refresh)
- `e2e/model-hotswap.spec.ts` — Model hot-swap E2E (RAG health, admin config, idempotency)

## Existing Test Files

| File | Layer | Status | Reason |
|---|---|---|---|
| backend/tests/test_model_profiles.py | backend | CURRENT | Accurately tests current _MODEL_PROFILES, runtime overrides, get_model_for_task |
| backend/tests/test_api.py | backend | CURRENT | Tests current routes. Has latent Qwen2.5-7B references (lines 555-727) |
| backend/tests/test_rag_pipeline.py | backend | CURRENT | Tests current rag/curriculum_rag.py functions |
| backend/tests/test_email_service.py | backend | CURRENT | Tests current email service config resolution |
| backend/tests/test_email_templates.py | backend | CURRENT | Tests current welcome email template |
| e2e/aiMonitoring.spec.ts | e2e | CURRENT | Tests current /api/hf/monitoring and AdminAIMonitoring page |
| e2e/model-hotswap.spec.ts | e2e | CURRENT | Tests current /api/rag/health and /api/admin/model-config. Weak: no profile-switch write test |
| src/services/profileImageService.test.ts | frontend | CURRENT | Tests current profile image validation |
| src/utils/chatMessageFormatting.test.ts | frontend | CURRENT | Tests current chat formatting including Qwen think-block handling |
| src/utils/chatPreview.test.ts | frontend | CURRENT | Tests current chat preview truncation |
| src/utils/mathScope.test.ts | frontend | CURRENT | Tests current math scope classifier |
| functions/lib/automations/iarAssessmentScoring.test.js | functions | CURRENT | Jest-compiled Firebase functions test |
| functions/lib/automations/reassessment.integration.test.js | functions | CURRENT | Jest-compiled Firebase functions test |
| functions/lib/automations/reassessmentEngine.test.js | functions | CURRENT | Jest-compiled Firebase functions test |
| functions/lib/triggers/manualTriggers.test.js | functions | CURRENT | Jest-compiled Firebase functions test |
| functions/lib/triggers/onDiagnosticComplete.test.js | functions | CURRENT | Jest-compiled Firebase functions test |
| functions/lib/triggers/onStudentProfileUpdated.test.js | functions | CURRENT | Jest-compiled Firebase functions test |
| functions/lib/triggers/quizBattleApi.test.js | functions | CURRENT | Jest-compiled Firebase functions test |
| functions/src/scoring/scoringEngine.test.ts | functions | CURRENT | Functions scoring engine test |
| functions/src/triggers/quizBattleApi.test.ts | functions | CURRENT | Functions quiz battle API test |
| hf_space_test/tests/test_api.py | backend | CURRENT | Duplicate test suite; mirrors backend/tests/ |
| hf_space_test/tests/test_email_service.py | backend | CURRENT | Duplicate; mirrors backend/tests/ |
| hf_space_test/tests/test_email_templates.py | backend | CURRENT | Duplicate; mirrors backend/tests/ |
| src/features/import/services/shsExcel/parser/__tests__/*.test.ts | frontend | CURRENT | Excel import parser tests |

## Gaps Found
- **No frontend unit tests for `huggingfaceMonitoringService.ts`** — Only E2E tests exist; no unit tests for data fetching, health resolution, or latency probing
- **No frontend unit tests for `AdminAIMonitoring.tsx`** — Component rendering, metric cards, health badges, error/loading states untested in unit test form
- **No frontend unit tests for `ModelConfigPanel.tsx`** — Profile switching UI, resolved model display, reset behavior untested in unit test form
- **No backend test for `/api/hf/monitoring` route handler** — The monitoring endpoint has no dedicated pytest; tested only via E2E
- **No backend test for `/api/admin/model-config` routes** — Profile switch, override, reset endpoints have no dedicated route-level pytest (profile switching tested at service layer in test_model_profiles.py but not at HTTP route level)
- **E2E model-hotswap does not test write operations** — No test for POST /profile or DELETE /reset
- **No frontend test for `ModelConfigPanel` service interaction** — No mock test of the apiFetch calls made by the config panel

## High-Risk Stale Assumptions Found
- **`Qwen/Qwen2.5-7B-Instruct` in test_api.py `TestInferenceRouting`** (lines 555-727): Used as test parameter for routing logic. Not present in any current profile (dev/budget/prod). While tests validate routing mechanism (not profiles), this model ID is a latent maintenance concern.
- **`INFERENCE_ENFORCE_QWEN_ONLY` not set in `test_enforce_qwen_overrides_task`** (test_api.py lines 138-141): Test does not explicitly set env var, making it environment-dependent.
- **`e2e/model-hotswap.spec.ts` idempotency test race condition**: If Firestore sync changes profile between GET calls, test fails.
- **`e2e/aiMonitoring.spec.ts` uses `page.waitForTimeout()` extensively**: Fragile in CI; no guarantee page is ready.

## Rewrite Plan

### Keep
- `backend/tests/test_model_profiles.py` — CURRENT, well-structured
- `backend/tests/test_email_service.py` — CURRENT, no issues
- `backend/tests/test_email_templates.py` — CURRENT, minor only
- `backend/tests/test_rag_pipeline.py` — CURRENT
- `src/utils/chatMessageFormatting.test.ts` — CURRENT
- `src/utils/chatPreview.test.ts` — CURRENT
- `src/utils/mathScope.test.ts` — CURRENT
- `src/services/profileImageService.test.ts` — CURRENT
- `src/features/import/services/shsExcel/parser/__tests__/*` — CURRENT
- All `functions/` tests — CURRENT

### Rewrite
- `backend/tests/test_api.py` — Update Qwen2.5-7B references in TestInferenceRouting to use current profile models; fix env patching in test_enforce_qwen_overrides_task
- `e2e/aiMonitoring.spec.ts` — Add explicit route verification, reduce fragile timeouts, add DRY navigation helper
- `e2e/model-hotswap.spec.ts` — Add profile-switch write-path E2E test; fix weak smoke tests; add proper navigation to model config page

### Delete
- None — no tests are STALE or BROKEN

### Create
- `backend/tests/test_admin_model_routes.py` — Route-level tests for GET/POST profile, POST override, DELETE reset endpoints including auth enforcement
- `backend/tests/test_hf_monitoring_routes.py` — Route-level tests for /api/hf/monitoring endpoint with mocked HF calls
- `src/services/huggingfaceMonitoringService.test.ts` — Unit tests for fetchHFMonitoringData, probeModelLatency, mapHFStatusToHealth, resolveHealthStatus
- `src/components/AdminAIMonitoring.test.tsx` — Component tests for render success, metric cards, health badges, error/loading/refresh states
- `src/components/admin/ModelConfigPanel.test.tsx` — Component tests for render, profile switching, reset, resolved models display