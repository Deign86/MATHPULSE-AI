# E2E Skill (reconstructed)

> Provenance: the previous version of this file was never in version control and is
> unrecoverable. This file was reconstructed from verified runs against
> tester-army/e2e v0.16.0 with the repo's `e2e.config.ts`. It documents only
> confirmed behavior — extend it only with newly verified facts.

## Runner

- Package `e2e` (tester-army/e2e) + `@e2e-dev/web`; binary at `node_modules/.bin/e2e`.
- `e2e list` — print the tests a run would select, without running them. Always run first.
- `e2e run [--max-failures N --workers 1] [files...]` — run suites (verified flags).
- `e2e guide [topic]` — print the runner's own agent skill (replaces this file as authority on CLI usage).
- `e2e models openai` — check the stored subscription login serves the agent model (provider choices: `openai`, `github-copilot`, `spacexai`).
- `e2e login [provider]` — sign in for agent steps (ChatGPT, GitHub Copilot, or SuperGrok subscription).

## Repo wiring (`e2e.config.ts`)

- Suites: `tests/e2e/**/*.e2e.ts`, web engine. Runner starts Vite on `127.0.0.1:5173` with `VITE_API_URL=http://127.0.0.1:8000`.
- QA agent model: `chatgpt('gpt-6-luna')` — requires the stored login above.
- App credentials (names only — values are never committed, logged, or echoed):
  `E2E_USER_{STUDENT,TEACHER,ADMIN}_{USERNAME,PASSWORD}`. Set as process-local
  env vars for the run, verify presence only, unset afterwards.

## Lane rules (mandatory)

- Browser automation is an exclusive resource: exactly one lane holds it at a time; no parallel browser tooling beyond the runner itself.
- Prerequisites before `e2e run`: ports 5173/8000 free; backend serving `:8000` (start from `backend/` with `backend/.env`, stop it after); credentials present; agent login valid. If any prerequisite is missing, STOP and report exactly what is missing.
- Local targets only (`127.0.0.1`) — never point the runner at production.
- Evidence: `.e2e/report.json` + per-attempt traces under `.e2e/artifacts/`. Timebox runs; on systemic failure (boot/auth failure everywhere) stop and report rather than grinding.
