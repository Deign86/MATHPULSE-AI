# Repository Atlas: MATHPULSE-AI

## Project Responsibility
MathPulse AI — installable, repo-owned PWA for AI-powered mathematics tutoring (Filipino SHS STEM Grade 11-12, teachers, admins). React 18 + TypeScript + Vite frontend, FastAPI Python backend, Firebase Hosting/Auth/Cloud Functions (Node 22), Firestore + Realtime Database. AI routing: deepseek-reasoner for RAG lessons, deepseek-chat otherwise; RAG over DepEd SSHS modules (Chroma + BAAI/bge-small-en-v1.5).

## System Entry Points
- `src/main.tsx` → `src/App.tsx`: frontend bootstrap (ErrorBoundary > BrowserRouter > QueryClientProvider > AuthProvider), role-aware lazy navigation.
- `src/config/env.ts` + `src/services/apiService.ts`: typed API abstraction; all frontend calls go through here (`VITE_API_URL` or same-origin `/api`).
- `backend/main.py`: FastAPI entry (`ROLE_POLICIES` authorization matrix — referenced by symbol, never by line number); Firebase/Firestore init, auth middleware, domain routers.
- `functions/src/index.ts`: Cloud Functions export surface (Node 22, project `mathpulse-ai-2026`).
- `firebase.json`, `firestore.rules`, `config/models.yaml`: hosting, security, model routing.
- `TESTING.md`: per-layer verification commands, worktree setup, CI triage, gate-check notes.

## Flow
1. Student/teacher/admin signs in (Firebase Auth) → `AuthContext` + role policies gate routes.
2. Pages call domain services → `apiService.ts` → FastAPI routers → services/rag → Firestore/Chroma/DeepSeek.
3. Functions react to Firestore events/schedules (diagnostics, quiz scoring, notifications/FCM, Quiz Battle RTDB queue).
4. IAR states drive assessment flow: `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`.

## Directory Map (Aggregated)
| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `backend/` | FastAPI entry: Firebase/Firestore init, auth + role policies, core AI/import/analytics/admin endpoints in `main.py`. | [View Map](backend/codemap.md) |
| `backend/config/` | Model routing (`models.yaml`) + DeepSeek pricing helpers. | [View Map](backend/config/codemap.md) |
| `backend/middleware/` | Role-adjusted SlowAPI rate limiting, auth/request middleware. | [View Map](backend/middleware/codemap.md) |
| `backend/utils/` | Shared helpers (e.g. SHA-256 file hashing). | [View Map](backend/utils/codemap.md) |
| `backend/scripts/` | Standalone curriculum/profile/migration/Storage jobs. | [View Map](backend/scripts/codemap.md) |
| `backend/routes/` | Domain API routers (incl. RAG routes) → services/Firestore/DeepSeek. | [View Map](backend/routes/codemap.md) |
| `backend/services/` | Shared domain services consumed by routers. | [View Map](backend/services/codemap.md) |
| `backend/rag/` | Doc parsing, ingestion, Chroma retrieval. | [View Map](backend/rag/codemap.md) |
| `backend/tests/` | Pytest coverage, fixtures, backend boundaries. | [View Map](backend/tests/codemap.md) |
| `functions/` | Node 22 Functions package + deployable handler exports. | [View Map](functions/codemap.md) |
| `functions/src/` | Functions composition root (`index.ts`, Admin init once). | [View Map](functions/src/codemap.md) |
| `functions/src/automations/` | Diagnostic, quiz, risk, reassessment, curriculum workflows. | [View Map](functions/src/automations/codemap.md) |
| `functions/src/config/` | Shared settings + diagnostic policy definitions. | [View Map](functions/src/config/codemap.md) |
| `functions/src/notifications/` | Firestore/scheduled/callable FCM handlers. | [View Map](functions/src/notifications/codemap.md) |
| `functions/src/scoring/` | Quiz Battle round scoring + match XP. | [View Map](functions/src/scoring/codemap.md) |
| `functions/src/services/` | FastAPI integration + runtime cache. | [View Map](functions/src/services/codemap.md) |
| `functions/src/triggers/` | Firestore/scheduled/callable/Quiz Battle handlers. | [View Map](functions/src/triggers/codemap.md) |
| `functions/src/utils/` | Push delivery, profile sanitization, rate limiting, numeric helpers. | [View Map](functions/src/utils/codemap.md) |
| `src/` | React 18 + TS + Vite bootstrap and app composition. | [View Map](src/codemap.md) |
| `src/config/` | Runtime config + display metadata (`env.ts`). | [View Map](src/config/codemap.md) |
| `src/contexts/` | Auth + tutoring chat state providers. | [View Map](src/contexts/codemap.md) |
| `src/lib/` | Firebase clients + TanStack Query client. | [View Map](src/lib/codemap.md) |
| `src/hooks/` | Reusable lifecycle + feature-state adapters. | [View Map](src/hooks/codemap.md) |
| `src/services/` | Domain operations + Firebase/backend transport. | [View Map](src/services/codemap.md) |
| `src/types/` | Shared TypeScript domain + API contracts. | [View Map](src/types/codemap.md) |
| `src/utils/` | Pure helpers + browser utilities. | [View Map](src/utils/codemap.md) |
| `src/data/` | Static learning/assessment/reward/curriculum data. | [View Map](src/data/codemap.md) |
| `src/data/curriculum/` | Curriculum lesson records + lookup adapters. | [View Map](src/data/curriculum/codemap.md) |
| `src/bones/` | Generated `.bone` module registry. | [View Map](src/bones/codemap.md) |
| `config/` | Repo-level model defaults + routing metadata. | [View Map](config/codemap.md) |
| `src/components/` | Page-level, learning, dashboard, shared feature components. | [View Map](src/components/codemap.md) |
| `src/components/admin/` | Admin panels, profile/settings, subject/class management. | [View Map](src/components/admin/codemap.md) |
| `src/components/admin/ai-monitoring/` | AI monitoring cards, rankings, pricing, system details. | [View Map](src/components/admin/ai-monitoring/codemap.md) |
| `src/components/assessment/` | Assessment, question, progress, feedback, diagnostic components. | [View Map](src/components/assessment/codemap.md) |
| `src/components/battle/` | Quiz Battle display (page-owned RTDB state). | [View Map](src/components/battle/codemap.md) |
| `src/components/intervention/` | Intervention video lesson step. | [View Map](src/components/intervention/codemap.md) |
| `src/components/login/` | Decorative login background (parent-owned auth flow). | [View Map](src/components/login/codemap.md) |
| `src/components/notebook/` | Supplemental video + micro-lesson components. | [View Map](src/components/notebook/codemap.md) |
| `src/components/risk/` | Risk indicators, detail panels, intervention checklist. | [View Map](src/components/risk/codemap.md) |
| `src/components/teacher/` | Teacher profile, settings, ID-card components. | [View Map](src/components/teacher/codemap.md) |
| `src/components/ui/` | Shared UI primitives. | [View Map](src/components/ui/codemap.md) |
| `src/pages/` | Page-level experiences; diagnostic assessment flow. | [View Map](src/pages/codemap.md) |
| `src/pages/admin/` | Admin operations incl. AI monitoring. | [View Map](src/pages/admin/codemap.md) |
| `src/pages/teacher/` | Teacher dashboards; live at-risk monitoring. | [View Map](src/pages/teacher/codemap.md) |
| `src/features/` | Feature modules (imports, notifications). | [View Map](src/features/codemap.md) |
| `src/features/DataImport/` | Teacher class-record + course-material upload workflow. | [View Map](src/features/DataImport/codemap.md) |
| `src/features/notifications/` | In-app notifications, Firestore sync, check-in reminders. | [View Map](src/features/notifications/codemap.md) |
| `src/features/import/` | SHS workbook import UI, hook, parser overview. | [View Map](src/features/import/codemap.md) |
| `src/features/import/components/` | Excel selection, parse feedback, result handoff. | [View Map](src/features/import/components/codemap.md) |
| `src/features/import/hooks/` | Workbook parse lifecycle + confirmation eligibility. | [View Map](src/features/import/hooks/codemap.md) |
| `src/features/import/services/` | SHS workbook transformation service. | [View Map](src/features/import/services/codemap.md) |
| `src/features/import/services/shsExcel/` | DepEd SHS workbook interpretation pipeline. | [View Map](src/features/import/services/shsExcel/codemap.md) |
| `src/features/import/services/shsExcel/parser/` | Parser stages: extraction, normalization, validation. | [View Map](src/features/import/services/shsExcel/parser/codemap.md) |
| `src/features/import/services/shsExcel/parser/utils/` | Workbook matrix/cell/range/anchor/text/row helpers. | [View Map](src/features/import/services/shsExcel/parser/utils/codemap.md) |
| `scripts/` | Maintenance/sync/backfill utilities (hooks, model sync, assignment backfill). | [View Map](scripts/codemap.md) |
| `tests/e2e/` | Agentic browser E2E suites via tester-army/e2e (local dev servers only). | [View Map](tests/e2e/codemap.md) |
| `tests/browser/` | Real-browser checks: guided-tour smoke test, layout audits of the signed-in app and the sign-in page. | [View Map](tests/browser/codemap.md) |
