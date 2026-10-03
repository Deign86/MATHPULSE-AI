# Gates: Lane E e2e harness

Scope: Add the e2e runner config and five browser smoke/regression suites without modifying application or backend source.

- [x] G1: The e2e harness dependencies and config resolve the requested Vite app target and test glob.
  CHECK: npx e2e list --reporter json
  EXPECT: "tests/e2e/smoke.e2e.ts"
  EVIDENCE: `npx e2e list --reporter json` returned five selected pairs, including `tests/e2e/smoke.e2e.ts`.

- [x] G2: Five requested e2e test files exist and use bounded agent goals with an outcome check after each goal.
  EVIDENCE: `tests/e2e/{smoke,quiz}.e2e.ts` and `tests/e2e/regression/{iar-placement,rag-lesson,quiz-battle}.e2e.ts` created; each `agent.act` call is followed by an `expect` outcome check.

- [x] G3: The requested smoke test run completes, or its environmental blocker is recorded accurately.
  EVIDENCE: `npx e2e run tests/e2e/smoke.e2e.ts --no-cache` started Vite successfully, then failed on `MODEL_PROVIDER_FAILED: Unauthenticated request to AI Gateway`; the run instructions require `AI_GATEWAY_API_KEY` or an authenticated Vercel OIDC session.

- [x] G4: `.e2e/` outputs are ignored by git.
  CHECK: git check-ignore .e2e/report.json
  EXPECT: .e2e/report.json
  EVIDENCE: .e2e/report.json
