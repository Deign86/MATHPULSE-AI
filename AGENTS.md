# MathPulse AI — Agent Instructions

## Memory Bank — Auto Invoke Rules

You have access to the Memory Bank MCP (`agentmemory_*` and `update-memory-bank` tools). You MUST follow these rules on every prompt without exception.
Project root: `C:\Users\Deign\Downloads\MATHPULSE-AI`

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
npm run dev           # Vite dev server (triggers predev → sync:models + check:backend:dev)
npm run build         # Production build to dist/
npm run test          # Vitest (all tests)
npm run lint          # ESLint
npm run typecheck     # TypeScript type checking

# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Functions
cd functions && npm run build && npm test

# Deploy
python scripts/deploy-hf.py   # HuggingFace Spaces deployment
```

## Project Structure

```text
MATHPULSE-AI/
├── src/                       # React frontend
│   ├── components/            # UI components (PascalCase.tsx)
│   ├── contexts/              # React Context providers
│   ├── services/              # API service wrappers
│   ├── stores/                # Zustand stores
│   ├── data/                  # Curriculum data & types
│   ├── features/              # Feature modules
│   ├── utils/                 # Utility functions
│   └── lib/                   # Firebase config, query client
├── backend/                   # FastAPI Python backend
│   ├── main.py                # Entry point
│   ├── routes/                # API route modules
│   ├── config/                # Model config YAML
│   └── datasets/              # Vector store, curriculum PDFs
├── functions/                 # Firebase Cloud Functions (Node 22)
├── scripts/                   # Build/deploy scripts
├── memory-bank/               # AI session memory (see rules above)
└── .env.local                 # Local secrets (gitignored)
```

## Environment Setup

The project requires secrets in two places:

### Local (.env.local)
Copied from `.env.example` — contains Firebase config, DeepSeek API keys, and HF token.

### Local Secrets Directory (.secrets/)
Sensitive credentials stored in `.secrets/` (gitignored). NEVER commit this directory.
- **Firebase Service Account**: `.secrets/firebase-service-account.json`
- Obtain from Firebase Console → Project Settings → Service Accounts → Generate new private key

### HF Space Secrets (deign86/mathpulse-api-v3test)
Required secrets:
`FIREBASE_SERVICE_ACCOUNT_JSON`, `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `INFERENCE_PROVIDER`

---

## Context Engineering — lean-ctx MCP (PREFERRED)

The `lean-ctx` MCP server provides cached, token-efficient file operations. Prefer these over raw CLI tools:

| Prefer | Over | Why |
|--------|------|-----|
| `ctx_read(path, mode)` | `Read` / `cat` | Cached, 10 read modes, re-reads ~13 tokens |
| `ctx_search(pattern, path)` | `Grep` / `rg` | Compact search results |
| `ctx_shell(command)` | `Shell` / `bash` | Pattern compression for git/npm output |
| `ctx_tree(path, depth)` | `ls` / `find` | Compact directory maps |

- Native Edit/StrReplace stay unchanged.
- Use `lean-ctx gain` to track token savings.
- If rules already exist, update them conservatively instead of duplicating content.

---

## Code Intelligence — GitNexus MCP

GitNexus is the active symbol-level knowledge graph MCP for this project.

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
GitNexus re-indexes after code changes:
```bash
npx gitnexus analyze # single repo
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
- Rename with find-and-replace — use `gitnexus_rename` which understands the call graph
- Commit with unexpected affected scopes

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MATHPULSE-AI** (18719 symbols, 29794 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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

## External Documentation — Context7 MCP (MANDATORY)

**ALWAYS use Context7 MCP before working with external libraries, APIs, or frameworks.**

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

---

## Vision Support (Image Analysis)

I have built-in vision capabilities in this session. When users paste images:

1. **I can see images directly** — No MCP or external API needed
2. **Analyze thoroughly** — Extract UI elements, console errors, stack traces, visual bugs
3. **Works across ALL models** — Only works in sessions with vision-capable models

If you're in a text-only model session and pasted images don't work, switch to a vision model or restart in a new session.

---

## Skills Auto-Invoke Rules

When relevant keywords are detected in the user's prompt, automatically load and use the appropriate skill:

### Review Skills
- **security audit, vulnerability, exploit, OWASP, XSS, SQL injection, CSRF, pentest** → load `security-review`
- **review, PR review, code review, critique, audit code** → load `code-review`

### Feature Development
- **build feature, add functionality, implement, new feature, create feature** → load `feature-dev`
- **explore, how does, trace, understand codebase** → load `code-explorer`
- **architecture, blueprint, design system, architecture plan** → load `code-architect`

### UI/Design
- **design, UI, UI design, frontend, website, page, component, interface** → load `frontend-design`

### Authoring
- **MCP server, MCP tool, model context protocol** → load `mcp-builder`
- **create skill, new skill, write skill, SKILL.md** → load `skill-creator`

### Project Rules
- **AGENTS.md, project rules, instructions, improve rules** → load `agents-md-improver`
- **capture, learn, remember, save to project memory** → load `agents-md-revise`

When a skill is auto-loaded, use its full workflow — don't skip steps or summarize prematurely.
