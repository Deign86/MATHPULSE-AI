# MathPulse AI — E2E Report (Chrome DevTools MCP + Jev, 2026-09-19)

Driver pivot: `jev-ultrafast` (browser-harness daemon) nuked — daemon IPC timed out
repeatedly on Windows/Chrome 153 (`Emulation.setDeviceMetricsOverride`,
`Page.captureScreenshot` 5s IPC timeouts; `DevToolsActivePort not found` on
default profile). Replaced with Chrome DevTools MCP (this session's browser) +
TypeSafe Jev `systemOne` judgments as pass/fail reviewers. Keys: TYPESAFE from
machine env, text-model unused in this workflow.

Infra: frontend `http://127.0.0.1:5173` (own cmd window), backend `:7860` (own cmd
window, `ready`, firebase true). Fix applied mid-run: `VITE_API_URL` emptied to
same-origin (was direct `:7860` → CORS preflight failures on all API calls).

## Results (all PASS, Jev battery 11/11 @ 0.98–0.99, jev-1.13.0)

| # | Suite | Evidence |
|---|-------|----------|
| S-smoke | Student dashboard (Loraine, Lv3) greeting/Continue/modules/nav | `artifacts/e2e/smoke/home.png`, `state.json` (supports 0.82, noul 0.93) |
| S-modules | RAG lesson NOTEBOOK (reasoner, 76%, SHS_GM_Q1_LE1.md p59, 7 sections, videos) | `artifacts/e2e/modules/lesson.png` (noul 0.94, conf 1.0) |
| S-chat | New chat → quadratic sent (Enter) → streamed x=2/x=3 KaTeX + follow-up | `artifacts/e2e/chat/reply.png` (supports 0.99) |
| S-battle | VS Bot Medium 5 rounds → VICTORY 2–1, +91 XP | `artifacts/e2e/battle/victory.png` |
| S-leader | Board renders, XP 335→426 live after victory | snapshot |
| S-grades | Avg/diagnostic 40%/AI advice/subjects/quizzes | text extract |
| S-avatar | Studio, XP-gated gear, equipped set | text extract |
| S-settings | Learner pass, profile, sections | text extract |
| S-calc | Alt+K, 2+2×2=6 | evaluate transcript |
| S-notif | Bell → 11 unread, history, mark-read/delete | snapshot |
| S-teacher | Dashboard (12/74%/3 at-risk), Quiz wizard Setup→Topics, Data Import | text extracts |
| S-admin | Overview (22/3/3/281 XP/3 risk), RAG Mgr 3054 chunks, AI Mon $18.33/6900 req | text extracts |
| S-roles | Anon: rag/health 200, quiz/topics 200, curriculum 401, admin/model 401, chat 401; admin@/battle stays admin | curl log |
| S-practice | AI 5-Q quiz → 4/5 +60 XP 80% | `artifacts/e2e/practice/complete.png` |
| S-pwa | manifest/sw/pwa-config/firebase-config 200; SW unregistered in dev (by design) | curl log |

## Findings (non-obvious)

- `VITE_API_URL=http://127.0.0.1:7860` breaks ALL API calls (backend CORS has no
  5173 origin); same-origin proxy is the working local path. Consider adding
  `http://127.0.0.1:5173` to backend CORS_ORIGINS or documenting proxy-only dev.
- Chat Send button ignores MCP clicks (React handler); JS-dispatched Enter works.
- `/assessment` deep-link = "Content Coming Soon" placeholder; IAR entry is the
  first-login modal + dashboard "Assessment Complete" banner (user pre-assessed).
- Quiz START labels are StaticText (card click opens); battle/practice answers are
  real buttons and click fine.
- Calculator ignores Escape and its Close button was non-interactive; navigating
  away unmounts it.
- Backend died once mid-run (no listener, no python); relaunched (a second
  uvicorn from the still-running T2 agent may also exist — check `:7860` owner).
- React console warnings only (validateDOMNesting button-in-button, forwardRef in
  AIChatPage input) — no API errors after CORS fix.

## Not executed (explicit gaps)

- Authenticated cross-role 401/403 matrix (needs Firebase ID tokens per role).
- Full teacher Quiz Maker generation submit + Data Import file upload submit.
- IAR first-login modal (account pre-assessed) and PWA offline install flow.

Jev cost ledger: smoke 593+61, modules 588+61, chat 591+61, battery 1321+202
≈ 2.6k input / 385 output tokens, model jev-1.13.0 throughout.
