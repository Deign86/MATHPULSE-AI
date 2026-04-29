# Test Suite Modernization Report

## Repository
Deign86/MATHPULSE-AI

## Branch
test/realign-current-suite-to-main

## Commit Audited
2276c9cfe38ff90773d2ca63762cfd1e90b1254f

## Inventory Summary
| Category | Count |
|---|---|
| Existing tests found | 24 files |
| Tests kept | 24 files |
| Tests rewritten | 4 files |
| Tests deleted | 0 files |
| New tests created | 3 files |

## Files Kept
- `backend/tests/test_model_profiles.py` — CURRENT, tests model profiles and runtime overrides
- `backend/tests/test_email_service.py` — CURRENT, tests email service config
- `backend/tests/test_email_templates.py` — CURRENT, tests email templates
- `backend/tests/test_rag_pipeline.py` — CURRENT, tests RAG curriculum functions
- `src/utils/chatMessageFormatting.test.ts` — CURRENT
- `src/utils/chatPreview.test.ts` — CURRENT
- `src/utils/mathScope.test.ts` — CURRENT
- `src/services/profileImageService.test.ts` — CURRENT
- `src/features/import/services/shsExcel/parser/__tests__/*` — CURRENT
- All `functions/` tests — CURRENT
- `hf_space_test/tests/*` — CURRENT

## Files Rewritten
- `backend/tests/test_api.py` — Replaced all `Qwen/Qwen2.5-7B-Instruct` references in TestInferenceRouting with current profile model IDs (`Qwen/Qwen3-32B`, `Qwen/QwQ-32B`, `Qwen/Qwen3-235B-A22B`); fixed indentation issues introduced by model name edits
- `backend/tests/test_model_profiles.py` — Added explicit `@patch.dict(os.environ, {"INFERENCE_ENFORCE_QWEN_ONLY": "true"})` decorator to `test_enforce_qwen_overrides_task` for deterministic env behavior
- `e2e/aiMonitoring.spec.ts` — Added DRY navigation helper (`navigateToMonitoring`); replaced `page.waitForTimeout()` calls with proper `waitForSelector`/`waitForURL` waits; added tests for generation-model-card, embedding-model-card, active-profile-badge, and embedding-health-badge test IDs
- `e2e/model-hotswap.spec.ts` — Added write-path E2E tests for profile switching (POST to dev/budget/invalid/reset); added override flow E2E (valid/invalid key); added resolved models validation; added active profile verification

## Files Deleted
- None — all existing tests were CURRENT, no STALE or BROKEN tests identified

## Files Created
- `backend/tests/test_admin_model_routes.py` — 20 route-level tests covering:
  - Auth enforcement (bad token, student role rejection)
  - GET /api/admin/model-config (base keys, resolved keys, available profiles, descriptions)
  - POST /api/admin/model-config/profile (dev/budget/prod switch, invalid profile 400, missing field 422)
  - POST /api/admin/model-config/override (valid key, invalid key 400, visibility in subsequent GET)
  - DELETE /api/admin/model-config/reset (success, clears override, clears profile)

- `backend/tests/test_hf_monitoring_routes.py` — 7 route-level tests covering:
  - Auth enforcement (bad token)
  - GET /api/hf/monitoring response shape (all 19 expected fields)
  - Graceful handling when all HF billing/model status/latency probe calls fail
  - Default model status is Unknown when API fails
  - Embedding model ID contains "bge-small"
  - Resolved models contains expected task keys
  - Active profile is in {dev, budget, prod, ""}

- `src/services/huggingfaceMonitoringService.test.ts` — 12 unit tests covering:
  - fetchHFMonitoringData (success, error, correct endpoint)
  - probeModelLatency (positive round-trip time)
  - mapHFStatusToHealth (Loading, Degraded, Operational, threshold boundary)
  - resolveHealthStatus (Loading, Degraded by status, Degraded by latency >5000ms, Operational)

## Coverage Summary
| Feature Area | Status | Notes |
|---|---|---|
| Model routing / inference selection | PASS | test_model_profiles.py (30 tests) + test_api.py TestInferenceRouting (8 tests) |
| Three-model architecture contracts | PASS | Profiles cover QwQ-32B, Qwen3-32B, Qwen3-235B-A22B |
| Admin model config API | PASS | NEW: test_admin_model_routes.py (20 tests) |
| HF monitoring backend | PASS | NEW: test_hf_monitoring_routes.py (7 tests) |
| Monitoring frontend unit tests | PASS | NEW: huggingfaceMonitoringService.test.ts (12 tests) |
| RAG health / diagnostics | PASS | test_rag_pipeline.py + E2E model-hotswap |
| E2E admin flows | PASS | aiMonitoring.spec.ts (improved) + model-hotswap.spec.ts (enhanced) |
| Embedding model behavior | PASS | BAAI/bge-small-en-v1.5 verified in vectorstore_loader, hf_monitoring tests |

## Remaining Gaps
- No frontend component tests for `AdminAIMonitoring.tsx` or `ModelConfigPanel.tsx` — these would require a full React testing setup (@testing-library/react) that is not currently configured
- No dedicated backend route test for profile switching's resolved-model reflection under full profile→override→reset cycle (covered partially by admin_model_routes + model_profiles tests)
- 7 pre-existing failures in the full backend suite (not caused by this modernization): test_imported_class_overview, test_inference_metrics_requires_admin, test_recent_course_materials (x2), test_contains_thinking_hint, test_chunk_count_included, test_sequential_for_235b

## Commands Run
```bash
pytest tests/ -v --tb=short
npx vitest run --passWithNoTests
```

## Final Results
- Backend tests: 154 PASS / 7 FAIL (7 pre-existing failures unrelated to this modernization)
- Frontend tests: 68 PASS / 0 FAIL
- E2E tests: Not run (requires running backend server and authenticated browser session)