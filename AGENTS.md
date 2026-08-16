# MathPulse AI — Agent Instructions

---

## Agent Context

Use built-in `lean-ctx` tools as the default context layer for this repository. Prefer compressed, cached tools over native equivalents:

- `ctx_overview` at task start for a task-aware project map.
- `ctx_read` for file reads; choose `full`, `map`, or `signatures` based on need. Use `diff` after edits when available.
- `ctx_search` or `ctx_grep` for code search; use `ctx_tree` or `ctx_find` for directory discovery.
- `ctx_shell` for commands whose output benefits from compression; use native shell only when required for side effects or unsupported commands.
- `ctx_knowledge` for durable project facts, patterns, and decisions.
- `ctx_session` for cross-session tasks, findings, decisions, and verification.
- Use graph, refactor, impact, route, and shape tools when their specialized analysis applies.
- Use agent coordination tools for delegated work and bounded parallel tasks.

Keep native write/edit/delete tools for file mutations when no lean-ctx replacement is available.

---

## Project Overview

**What:** MathPulse AI — installable, repository-owned Progressive Web App (PWA) for AI-powered mathematics tutoring
**Target Users:** Filipino Senior High School STEM students (Grade 11-12), their teachers, and admins
**Stack:** React 18 + TypeScript + Vite PWA frontend, FastAPI + Python backend, Firebase Hosting/Auth/Cloud Functions (Node 22), Firestore + Realtime Database

## Key Conventions

- Path alias: `@` → `./src`
- Component file naming: PascalCase `.tsx`, hook files: `use*.ts`, service files: `*Service.ts`
- State management: Zustand (stores), TanStack Query (server state), React Context (auth, notifications, chat)
- All API calls go through the typed `src/config/env.ts` and `src/services/apiService.ts` abstraction. Production frontend defaults to same-origin `/api` when proxied; separately deployed FastAPI origin is configured with `VITE_API_URL`.
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

# Deploy frontend PWA
npm run build
npx firebase deploy --only hosting --project mathpulse-ai-2026

# Deploy frontend PWA
npx firebase deploy --only hosting --project mathpulse-ai-2026

# Backend checks/deployment are handled by the selected backend platform.
# GitHub Actions no longer deploys or manages Hugging Face Spaces.
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

## Mandatory Skills — Ponytail + Unlazy

Every coding task in this repository MUST use the following two skills together, in this order:

1. **Ponytail** — read and follow `.agents/skills/ponytail/SKILL.md` before planning or editing.
   Apply Ponytail in `full` mode by default: question whether work is needed, reuse existing
   code, prefer standard-library and native solutions, and make the smallest correct change.
   Keep validation, error handling, security, accessibility, and explicitly requested behavior
   intact. Do not disable Ponytail unless the user explicitly says `stop ponytail` or `normal mode`.

2. **Unlazy** — read and follow `.agents/skills/unlazy/SKILL.md` before starting real work.
   Apply anti-laziness discipline: write acceptance gates to `GATES.md` *before* implementing,
   one checkbox per outcome, with `CHECK:`/`EXPECT:` lines wherever an outcome can be run as a
   command. Done means every gate is checked **with recorded evidence** (run
   `node <skill-dir>/scripts/gate-check.mjs GATES.md`), not a promise of completion. Pick solo
   mode for tasks under ~30 minutes, orchestrated mode (`PLAN.md` + `gates/` per leaf) for builds.
   Re-measure every number in the final report at report time; paste the ledger, N of N checked.

Ponytail governs *what* you build (the simplest correct thing); Unlazy governs *whether it is
actually done* (gates + evidence, no 80% reports). Both apply to every coding task, including
reviewing and refactoring.

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
