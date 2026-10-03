# Gates: F4 Admin-Domain E2E Tests

- [x] F4-1: Admin console test signs in once and opens User Management and Class Management with visible data/status.
  CHECK: `npx e2e list --reporter json`
  EXPECT: `/admin-console\.e2e\.ts/`
  EVIDENCE: `npx e2e list --reporter json` lists `tests/e2e/admin/admin-console.e2e.ts`.
- [x] F4-2: Admin systems test signs in once and opens RAG Manager and AI Monitoring with visible status.
  CHECK: `npx e2e list --reporter json`
  EXPECT: `/admin-systems\.e2e\.ts/`
  EVIDENCE: `npx e2e list --reporter json` lists `tests/e2e/admin/admin-systems.e2e.ts`.
- [x] F4-3: Tests remain read-only and every `agent.act` has a confirming `expect` pin.
  EVIDENCE: Both admin test files contain sign-in and view-navigation goals, immediate expect pins after each goal, and no mutating actions.
