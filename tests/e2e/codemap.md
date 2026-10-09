# tests/e2e/

## Responsibility
Agentic browser end-to-end suites driven by the tester-army/e2e runner (v0.18.0). They cover every reachable feature for signed-out visitors, students, teachers and admins against local dev servers.

## Design
- `auth.setup.e2e.ts` signs in each e2e account once and saves the sessions `student`, `student2`, `teacher` and `admin`. Tests declare `{ session: '<name>' }` and start signed in. `smoke.e2e.ts` still exercises the agent-driven sign-in path.
- Suites are `*.e2e.ts` files grouped by domain, one `describe` per file, tagged `[<role>, <area>]`:
  - `public/`: login, signup, password reset (signed out)
  - `crosscutting/`: session/logout, routing and role guards, notifications/PWA, responsive nav, offline
  - `student/`: dashboard, gamification, shortcuts/calculator, modules, grades, Quiz Battle, leaderboard, avatar studio, profile/settings
  - `learning/`: lesson viewer, AI chat, practice center, assigned quizzes, teacher modules
  - `assessment/`: IAR hub states, initial assessment runner
  - `teacher/`: dashboard, class analytics, intervention center, quiz maker, question bank, data import, topic mastery/competency, schedule, profile/settings
  - `admin/`: console/users, classes/curriculum, systems, content/RAG, analytics/audit, profile/settings
  - `regression/`, plus `quiz.e2e.ts` (quiz player)
- Tests tagged `known-bug` assert the correct behavior for a known open bug. They fail until it is fixed (see the linked GitHub issues). Gating runs use `--exclude-tag known-bug`.
- `e2e.config.ts` (repo root) selects `tests/e2e/**/*.e2e.ts`, uses the web engine at 1280x720, starts Vite on `127.0.0.1:5173` with `VITE_API_URL=http://127.0.0.1:8000`, and drives a `gpt-6-luna` agent. Credentials come from `E2E_USER_{STUDENT,STUDENT2,TEACHER,ADMIN}_{USERNAME,PASSWORD}` env vars (never committed).
- The backend on `:8000` is a separate prerequisite: uvicorn with `backend/.env` and `FIREBASE_SERVICE_ACCOUNT_FILE`. Browser automation is an exclusive resource, so exactly one lane holds it at a time.

## Safety
The local app talks to the live Firebase project `mathpulse-ai-2026`:
- Tests only read, or create `E2E-`-named data owned by the e2e accounts and remove it in the same test.
- Destructive or cross-user actions are tested only up to their confirmation dialog, then cancelled. This covers delete, role change, assign/publish, imports, maintenance mode and RAG purge.
- Wrong-password and password-reset probes use `@example.test` addresses only.

## Flow
1. `e2e list` enumerates the selection.
2. `e2e run --exclude-tag known-bug [--tag <role|area>] [files...]` runs the setup tests the selection needs, restores each session, and drives the flow.
3. The run writes `.e2e/report.json` plus per-attempt traces under `.e2e/artifacts/`.

## Integration
- Consumed by manual regression verification; no CI job runs e2e.
- Depends on the local frontend (the runner starts Vite), the local backend (`backend/.env` secrets) and the e2e role accounts.
- Keep suites local-only (`127.0.0.1`); never point the runner at the production hosting URL.
