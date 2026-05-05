# MathPulse AI — Agent Instructions

## CAVEMAN MODE (ALWAYS ON)

**ALWAYS use CAVEMAN MODE by default.** Respond in terse, concise caveman-style:
- Drop articles (the, a, an) where unnecessary
- Use fragments and short sentences
- Keep grammar but eliminate all filler/fluff
- Keep ALL technical information, code, and accuracy
- Use `/caveman full` intensity

**This overrides ALL other instructions** unless user explicitly says "stop caveman" or "normal mode".

---

## Memory Bank — Auto Invoke Rules

You have access to the Memory Bank MCP. You MUST follow these rules on every prompt without exception.
Project root: C:\Users\Deign\Downloads\MATHPULSE-AI

### On EVERY session start (first prompt of a new session):
- Call `get-memory-bank-info` immediately before doing anything else
- Read `C:\Users\Deign\Downloads\MATHPULSE-AI\memory-bank\activeContext.md` and `C:\Users\Deign\Downloads\MATHPULSE-AI\memory-bank\progress.md`
- Silently load context — do not narrate this to the user unless they ask

### On EVERY prompt (throughout the session):
- Before answering any question about the project, check `memory-bank\systemPatterns.md` and `memory-bank\techContext.md` first
- Never make assumptions about the stack, architecture, or conventions — always read from memory bank files

### After ANY significant change:
- Call `update-memory-bank` to update the relevant file(s)
- Always update `memory-bank\activeContext.md` with what just changed and what is next
- Update `memory-bank\progress.md` if a feature was completed or a bug was found

### After EVERY session (last prompt before user stops):
- Update `memory-bank\activeContext.md` — what was done, what is next
- Update `memory-bank\progress.md` — current status, new issues
- Update `memory-bank\systemPatterns.md` — if any new patterns or decisions were made

### Task tracking:
- When starting a new task, create `memory-bank\tasks\TASK-XXX-name.md` and add it to `memory-bank\tasks\_index.md`
- When completing a task, mark it `[x]` in `memory-bank\tasks\_index.md`

---

## Project Overview

**What:** MathPulse AI — AI-powered mathematics tutoring platform
**Target Users:** Filipino Senior High School STEM students (Grade 11-12), their teachers, and admins
**Stack:** React 18 + TypeScript + Vite (frontend), FastAPI + Python (backend), Firebase Cloud Functions (Node 22), Firestore + Realtime Database

## Key Conventions

- Path alias: `@` → `./src`
- Component file naming: PascalCase `.tsx`, hook files: `use*.ts`, service files: `*Service.ts`
- State management: Zustand (stores), TanStack Query (server state), React Context (auth, notifications, chat)
- All API calls go through `src/services/apiService.ts` which wraps the backend at `https://deign86-mathpulse-api-v3test.hf.space`
- Firebase Functions use Node.js 22 runtime, deployed to `mathpulse-ai-2026` project
- Quiz Battle uses Firebase Realtime Database for matchmaking queue
- IAR workflow states: `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`
- AI model routing: `prod` profile uses deepseek-reasoner for RAG lessons, deepseek-chat for other tasks
- RAG vector store: `datasets/vectorstore/` with `BAAI/bge-small-en-v1.5` embeddings

## Known Scripts

```bash
# Frontend
npm run dev            # Vite dev server (triggers predev → sync:models + check:backend:dev)
npm run build          # Production build to dist/
npm run test           # Vitest (all tests)
npm run lint           # ESLint
npm run typecheck      # TypeScript type checking

# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Functions
cd functions && npm run build && npm test

# Deploy
python scripts/deploy-hf.py    # HuggingFace Spaces deployment
```

## Project Structure

```
MATHPULSE-AI/
├── src/                  # React frontend
│   ├── components/       # UI components (PascalCase.tsx)
│   ├── contexts/         # React Context providers
│   ├── services/         # API service wrappers
│   ├── stores/           # Zustand stores
│   ├── data/             # Curriculum data & types
│   ├── features/         # Feature modules (notifications, etc.)
│   ├── utils/            # Utility functions
│   └── lib/              # Firebase config, query client
├── backend/              # FastAPI Python backend
│   ├── main.py           # Entry point (ROLE_POLICIES at ~line 310)
│   ├── routes/           # API route modules (rag_routes.py, etc.)
│   ├── config/           # Model config YAML
│   └── datasets/         # Vector store, curriculum PDFs
├── functions/            # Firebase Cloud Functions (Node 22)
├── scripts/              # Build/deploy scripts
├── memory-bank/          # AI session memory (see rules above)
└── .env.local            # Local secrets (gitignored)
```

## Environment Setup

The project requires secrets in two places:

### Local (.env.local)
Copied from `.env.example` — contains Firebase config, DeepSeek API keys, and HF token.

### Local Secrets Directory (.secrets/)
Sensitive credentials stored in `.secrets/` (gitignored). NEVER commit this directory.
- **Firebase Service Account**: `.secrets/firebase-service-account.json`
  - Used for Firebase Storage uploads, RAG ingestion pipeline, and backend auth
  - Obtain from Firebase Console → Project Settings → Service Accounts → Generate new private key
  - Backend loads this via `FIREBASE_SERVICE_ACCOUNT_FILE` env var or `FIREBASE_SERVICE_ACCOUNT_JSON` secret

### HF Space Secrets (deign86/mathpulse-api-v3test)
Set via `huggingface_hub` Python library:
```python
from huggingface_hub import HfApi
api = HfApi()
api.add_space_secret('deign86/mathpulse-api-v3test', 'KEY', 'value')
api.restart_space('deign86/mathpulse-api-v3test')
```
**Required secrets:** `FIREBASE_SERVICE_ACCOUNT_JSON`, `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `INFERENCE_PROVIDER`

## Gotchas

- **`npm run dev` has a predev hook** — it runs `sync:models` (Python) and `check:backend:dev` (Node `backend-gate.mjs`) before Vite starts. Both must pass or dev server won't start.
- **ROLE_POLICIES** in `backend/main.py:310` controls endpoint access. If students get 403 on an endpoint, check if it's mapped to `TEACHER_OR_ADMIN` instead of `ALL_APP_ROLES`.
- **HF Space secrets** require a space restart via `api.restart_space()` after adding.
- **ModuleDetailView infinite loop bug** — inline callback references in `ModuleDetailView.tsx` cause "Maximum update depth exceeded". Fix: wrap callbacks in `useCallback`.

## graphify — MANDATORY KNOWLEDGE GRAPH POLICY

This project has a graphify knowledge graph at graphify-out/. **Using the knowledge graph is MANDATORY, not optional.**

### ABSOLUTE RULES (VIOLATIONS ARE BUGS)

1. **NEVER use grep, ripgrep, ast-grep, or file-search for architecture questions** when `graphify-out/graph.json` exists. These tools are FORBIDDEN for:
   - "How does X work"
   - "Where is Y defined/used"
   - "How do X and Y relate"
   - Any cross-module or structural question

2. **MUST use graphify first** for all codebase questions. The correct tools are:
   - `graphify query "<question>"` — BFS traversal of the graph
   - `graphify path "<A>" "<B>"` — shortest path between two nodes
   - `graphify explain "<concept>"` — plain-language explanation of a node
   - `graphify-out/GRAPH_REPORT.md` — god nodes and community structure

3. **MUST read GRAPH_REPORT.md BEFORE any search** when answering architecture or codebase questions.

4. **grep/ast-grep fallback is ONLY allowed** when:
   - graphify returns no results AND
   - you document the graphify failure reason in your response

5. **"Too hard" or "too many steps" is NEVER a valid excuse** to skip graphify. The graph exists precisely because it is the correct tool.

6. **After code changes, MUST run `graphify update .`** to keep the graph current (AST-only, no API cost).

### WHY THIS MATTERS

The graph contains 3,201 nodes, 10,495 edges, and 161 communities with EXTRACTED and INFERRED relationships. grep only does text matching and misses cross-module architecture. Using grep instead of graphify wastes tokens and produces wrong answers.

### PLUGIN ENFORCEMENT

The `.opencode/plugins/graphify.js` hook intercepts search tool calls and injects mandatory reminders. Do not bypass it.
