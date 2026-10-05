# ADM-081 telemetry gates

- [x] Backend contract returns real daily attempt counts in Asia/Manila day buckets; latency averages completed generations only; success percentage divides successful attempts by all attempts.
  CHECK: `pytest -q backend/tests/test_ai_monitoring_contract.py`
  EXPECT: Exit code 0; test evidence records empty and mixed-status daily aggregates, Manila midnight boundary, latency denominator, and attempt denominator.
  EVIDENCE: `pytest -q tests/test_ai_monitoring_contract.py` from `backend/` → 3 passed; `pytest -q -k "monitor or admin"` → 73 passed, 516 deselected.
- [ ] The monitoring page consumes typed telemetry from the service and does not substitute hardcoded telemetry values.
  CHECK: `npm run test -- --run src/pages/admin/AIMonitoringPage.regression.test.tsx`
  EXPECT: Exit code 0; page renders values from the monitoring response.
  BLOCKED: Worktree Vitest cannot resolve `/@fs/C:/Users/APG/Downloads/MATHPULSE-AI/node_modules/@testing-library/jest-dom/dist/vitest.mjs`; suite ran 0 tests.
- [ ] Assigned backend/admin, monitoring Vitest, and TypeScript validations pass.
  CHECK: `pytest -q -k "monitor or admin"`
  EXPECT: Exit code 0.
  CHECK: `npm run test -- --run src/pages/admin/AIMonitoringPage.regression.test.tsx`
  EXPECT: Exit code 0.
  CHECK: `npm run typecheck`
  EXPECT: Exit code 0.
  EVIDENCE: `npm run typecheck` → TypeScript completed with exit code 0.
  BLOCKED: The combined gate remains unchecked because the assigned Vitest suite is blocked by its unresolved root node_modules import.
  BLOCKED: `node .agents/skills/unlazy/scripts/gate-check.mjs gates/group-telemetry.md` consumed repository-root `GATES.md` (334 gates), reported unrelated gates, and exceeded its 120-second timeout instead of checking this file.
