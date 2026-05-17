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

### AgentMemory MCP — Auto-Invoke (MANDATORY)

**When ANY of these triggers occur, call `agentmemory_memory_recall` or `agentmemory_memory_smart_search` FIRST before proceeding:**

| Trigger | Action |
|---------|--------|
| "what did we do", "previous session", "last time" | `agentmemory_memory_recall` with relevant query |
| "find past", "remember", "was there a", "had we" | `agentmemory_memory_recall` with relevant query |
| "context summary", "session summary", "handoff" | `agentmemory_memory_sessions` + `session_read` |
| Any open question about what was decided/built/done | `agentmemory_memory_recall` first |

**RULE: Never answer "what did we do in a previous session" or similar without checking agentmemory first.** The memory bank is the authoritative source of record.

### On EVERY session start (first prompt of a new session):
- Call `get-memory-bank-info` immediately before doing anything else
- Read `C:\Users\Deign\Downloads\MATHPULSE-AI\memory-bank\activeContext.md` and `C:\Users\Deign\Downloads\MATHPULSE-AI\memory-bank\progress.md`
- Silently load context — do not narrate this to the user unless they ask

### On EVERY prompt (throughout the session):
- Before answering any question about the project, check `memory-bank\systemPatterns.md` and `memory-bank\techContext.md` first
- Never make assumptions about the stack, architecture, or conventions — always read from memory bank files

### After ANY significant change:
- **⚠️ MANDATORY: After ANY change, IMMEDIATELY call `update-memory-bank` to persist the change**
- Call `update-memory-bank` to update the relevant file(s)
- Always update `memory-bank\activeContext.md` with what just changed and what is next
- Update `memory-bank\progress.md` if a feature was completed or a bug was found

> **⚠️ AUTO-INVOKE RULE: After EVERY edit, config change, tool creation, or any modification — call `update-memory-bank` IMMEDIATELY. Do NOT wait. Do NOT ask. Just invoke it.**

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

## Layer 2: Code Intelligence MCPs

Two knowledge graph engines are active as local MCP servers in OpenCode:

- **Graphify** — codebase-level clustering, GRAPH_REPORT.md, doc/image coverage
- **GitNexus** — symbol-level precision: blast radius, call chains, refactor safety

### Graphify MCP Tools

| Tool | Use for |
|---|---|
| `graphify_query_graph` | Natural-language query → relevant nodes/edges |
| `graphify_get_node` | Single node details by label/ID |
| `graphify_get_neighbors` | Direct neighbors of a node |
| `graphify_get_community` | All members of a community |
| `graphify_god_nodes` | Most-connected nodes (core abstractions) |
| `graphify_graph_stats` | Graph summary stats |
| `graphify_shortest_path` | Shortest path between two concepts |

### GitNexus MCP Tools

| Tool | Use for |
|---|---|
| `gitnexus_query` | Find execution flows by concept (ranked by relevance) |
| `gitnexus_context` | Full symbol info: callers, callees, processes |
| `gitnexus_impact` | Blast radius analysis before editing |
| `gitnexus_rename` | Safe multi-file rename via call graph |
| `gitnexus_detect_changes` | Map git diff → affected execution flows |
| `gitnexus_cypher` | Raw Cypher query for complex graph traversal |
| `gitnexus_api_impact` | API route impact analysis |
| `gitnexus_route_map` | API route → handler → consumer mapping |
| `gitnexus_shape_check` | API response shape vs consumer usage |
| `gitnexus_list_repos` | List indexed repositories |
| `gitnexus_group_list` / `gitnexus_group_sync` | Multi-repo group operations |

### Index Freshness

**GitNexus:** No auto-update. Re-index after code changes:
```bash
npx gitnexus analyze        # single repo
```

**Graphify:** Auto-indexes on file edits locally. Full rebuild:
```bash
npx graphify analyze
```

Run re-index before important tasks if significant changes since last session.

### GitNexus Rules (MCP Tools)

**MUST do before editing any symbol:**
1. `gitnexus_impact({ target: "symbolName", direction: "upstream" })` → report blast radius + risk
2. If risk = HIGH or CRITICAL, warn user before proceeding

**MUST do before committing:**
- `gitnexus_detect_changes()` → verify only expected symbols affected

**NEVER:**
- Edit without running `gitnexus_impact` first
- Rename with find-and-replace — use `gitnexus_rename`
- Commit with unexpected affected scopes

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MATHPULSE-AI** (15991 symbols, 29062 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/MATHPULSE-AI/context` | Codebase overview, check index freshness |
| `gitnexus://repo/MATHPULSE-AI/clusters` | All functional areas |
| `gitnexus://repo/MATHPULSE-AI/processes` | All execution flows |
| `gitnexus://repo/MATHPULSE-AI/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

---

## External Documentation — Mandatory Context7 Usage

**ALWAYS use Context7 API when working with external libraries, APIs, or frameworks.**

When implementing features that use:
- New npm packages or Python libraries
- Framework APIs (React, FastAPI, Firebase, etc.)
- Third-party services or SDKs
- Any external dependency not covered in this AGENTS.md

You MUST:
1. Use `context7_resolve-library-id` to find the library
2. Use `context7_query-docs` to get current documentation and code examples
3. Never assume API behavior — always verify with Context7

**Why:** Prevents hallucinations about library APIs, ensures correct usage patterns, and provides production-ready code examples.

**Triggers (auto-invoke):**
- "How do I use [library]?"
- "What's the best practice for [framework feature]?"
- Implementing unfamiliar npm/pip packages
- Any question about external library behavior
