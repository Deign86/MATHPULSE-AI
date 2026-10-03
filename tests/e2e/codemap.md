# tests/e2e/

## Responsibility
Agentic browser end-to-end suites driven by the tester-army/e2e runner (v0.16.0): smoke, admin, assessment/IAR, crosscutting notifications/PWA, learning, quiz, regression, student, and teacher flows against local dev servers.

## Design
- Suites are `*.e2e.ts` files grouped by domain (`admin/`, `assessment/`, `crosscutting/`, `learning/`, `regression/`, `student/`, `teacher/`, plus `quiz.e2e.ts` and `smoke.e2e.ts`).
- `e2e.config.ts` (repo root) selects `tests/e2e/**/*.e2e.ts`, uses the web engine, starts Vite on `127.0.0.1:5173` with `VITE_API_URL=http://127.0.0.1:8000`, and drives a `gpt-6-luna` QA agent; app credentials come from `E2E_USER_{STUDENT,TEACHER,ADMIN}_{USERNAME,PASSWORD}` env vars (presence-gated, never committed).
- The backend on `:8000` is a separate prerequisite (uvicorn with `backend/.env`); browser automation is an exclusive resource — exactly one lane holds it at a time.

## Flow
`e2e list` enumerates selection → `e2e run [--max-failures N --workers 1] [files...]` boots the app, signs in with the role credential, drives the flow, and writes `.e2e/report.json` plus per-attempt traces under `.e2e/artifacts/`.

## Integration
Consumed by: manual regression verification (no CI job runs e2e). Depends on: local frontend (`npm run dev` equivalent via the runner), local backend (`backend/.env` secrets), and seed/demo role accounts. Keep suites local-only (`127.0.0.1`); never point the runner at production.
