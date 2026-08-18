# GATES.md — MathPulse AI Audit Findings Remediation Ledger

## Gates

- [x] GATE-01: Dynamic role policies matching in `backend/main.py`
  - CHECK: Python check verifying parameterized paths match their required roles in `resolve_required_roles`
  - EXPECT: True for `/api/analytics/class/sec1`, `/api/intervention/stu1`, etc.
  - EVIDENCE: `test_audit_remediation.py::TestRolePolicyMatching` passed (3 tests). `resolve_required_roles('/api/analytics/class/sec-123')` returns `{'admin', 'teacher'}`.

- [x] GATE-02: Pipeline profile ownership check in `backend/routes/pipeline_routes.py`
  - CHECK: Static check or unit test asserting student role check `student_id != user.uid` returns 403
  - EXPECT: Profile access for students restricted to self
  - EVIDENCE: `test_audit_remediation.py::TestPipelineProfileOwnership` passed (3 tests: cross-student 403, own student 200, teacher 200).

- [x] GATE-03: Firestore rule deduplication for `/modules/{moduleId}` in `firestore.rules`
  - CHECK: Verify only one `match /modules/{moduleId}` exists and ownership is enforced on update/delete
  - EXPECT: Single scoped match block in `firestore.rules`
  - EVIDENCE: Deduplicated to single match at line 633 with `isAdmin() || (isTeacherOrAdmin() && (ownerInExisting('uploadedBy') || ownerInExisting('teacherId')))`. Duplicate match at line 752 removed.

- [x] GATE-04: Ambiguous diagnostic route deduplication in `backend/main.py`
  - CHECK: Verify inline duplicate diagnostic endpoints and dead helpers are removed from `backend/main.py`
  - EXPECT: Canonical router `backend/routes/diagnostic.py` owns `/api/diagnostic/*`
  - EVIDENCE: Removed duplicate routes (`/api/diagnostic/generate`, `/api/diagnostic/submit`, `/api/diagnostic/results/{user_id}`), dead helpers (`_generate_diagnostic_questions`, `_analyze_diagnostic_risk`, `_save_diagnostic_to_firestore`), and duplicate Pydantic models from `backend/main.py`.

- [x] GATE-05: Diagnostic results route added to `backend/routes/diagnostic.py`
  - CHECK: Route `@router.get("/results/{user_id}")` with student ownership validation is defined in `diagnostic.py`
  - EXPECT: Handled with proper role check
  - EVIDENCE: `test_audit_remediation.py::TestDiagnosticResultsEndpoint` passed (2 tests: cross-student 403, own student 200).

- [x] GATE-06: RAG curriculum context signature and call alignment in `backend/rag/curriculum_rag.py` & `backend/routes/teacher_materials.py`
  - CHECK: `retrieve_curriculum_context` accepts `grade_level` without raising TypeError, and teacher materials formats context properly
  - EXPECT: Successful execution of `_retrieve_rag_context`
  - EVIDENCE: `backend/tests/test_teacher_materials.py` passed (13 tests) and `test_audit_remediation.py::TestCurriculumRAGSignature` passed (1 test).

- [x] GATE-07: Notification schema synchronization in `src/services/notificationService.ts` & `src/features/notifications/notificationFirestoreService.ts`
  - CHECK: Canonical `isRead` with `read` fallback handled across all notification operations
  - EXPECT: Synchronized read/isRead handling
  - EVIDENCE: `npx vitest run src/features/notifications/` passed (37 tests across 6 files).

- [x] GATE-08: Cross-runtime WRI parity across TS (`riskEngine.ts`), Python (`wri_service.py`), and Functions (`riskTriggers.ts`)
  - CHECK: Rounding to 2 decimal places in `riskTriggers.ts`, and fixture tests passing in TS and Python
  - EXPECT: Identical WRI value and status for test fixtures
  - EVIDENCE: `src/utils/riskEngine.test.ts` passed (15 tests), `backend/tests/test_wri_service.py` passed (19 tests), and `riskTriggers.ts` updated to `Math.round(wri * 100) / 100`.

- [x] GATE-09: Automated test suite and TypeScript validation passing
  - CHECK: `npm run typecheck`, `npx vitest run`, `npm test --prefix functions`, `npm run build`
  - EXPECT: All suites pass with 0 errors
  - EVIDENCE: `typecheck` (0 errors), Vitest (178 passed across 27 files), Functions (46 passed), Python pytest (41 passed across 3 test files), Build (successful production build in 11.12s).
