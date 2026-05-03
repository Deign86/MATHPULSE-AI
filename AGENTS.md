# MathPulse AI — Agent Instructions

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
npm run dev          # Vite dev server
npm run build        # Production build to dist/
npm run test         # Vitest (all tests)
npm run lint         # ESLint

# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Functions
cd functions && npm run build && npm test

# Deploy
python scripts/deploy-hf.py    # HuggingFace Spaces deployment
```