# Group C acceptance gates — tutor contract and chat rate limit

- [x] TC-STU-016: LOLI guides students with questions/hints instead of completing calculations directly.
  CHECK: `cd backend && pytest -q -k jev`
  EXPECT: Tests pass and pin the tutor's Socratic-first contract.
  EVIDENCE: `pytest -q -k 'jev or chat'` — 64 passed; includes the JEV direct-answer short-circuit and regular chat contract checks.
- [x] TC-STU-033: A new chat response addresses only the asked question and guides through a visible first step rather than inventing a different equation or giving a final-only answer.
  CHECK: `cd backend && pytest -q -k chat`
  EXPECT: Tests pass with the no-unsolicited-problem and show-work prompt constraints.
  EVIDENCE: `pytest -q -k 'jev or chat'` — 64 passed, exercising chat and streaming endpoints with server limiter applied.
- [x] TC-STU-019: Rapid chat requests are server-throttled and the client shows rate-limit feedback/cooldown while preventing additional submissions.
  CHECK: `cd backend && pytest -q -k 'jev or chat' && cd .. && npm run typecheck`
  EXPECT: Validation exits 0; server chat endpoints are rate-limited and client submissions disable during the visible cooldown.
  EVIDENCE: Backend gate command — 64 passed; `npm run typecheck` — `tsc --noEmit` exited 0. Vitest was attempted separately and is blocked by missing `@testing-library/jest-dom/dist/vitest.mjs` resolution from the parent workspace node_modules.
