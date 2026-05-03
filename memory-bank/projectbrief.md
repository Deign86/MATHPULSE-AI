# MathPulse AI — Project Brief

## What Is This Project?

**MathPulse AI** is an AI-powered mathematics tutoring platform designed specifically for **Filipino Senior High School STEM students (Grade 11-12)**. It provides personalized learning paths, AI-generated quizzes, real-time at-risk student detection, and gamified engagement.

## Who Is It For?

| Role | Description |
|------|-------------|
| **Students** | Grade 11-12 STEM students learning General Mathematics, Business Math, Statistics & Probability |
| **Teachers** | Math instructors managing classes, monitoring student performance, generating curriculum content |
| **Admins** | Platform administrators managing users, AI model monitoring, and system settings |

## Core Value Proposition

Personalized math education powered by AI, featuring:
- **IAR Workflow** (Initial Assessment & Review) — diagnostic assessment that determines learning paths
- **RAG-powered lessons** — curriculum-grounded lesson generation using retrieval-augmented generation
- **Quiz Battle** — real-time multiplayer math quizzes with XP rewards
- **Risk Classification** — zero-shot ML classification to identify at-risk students (BART-large-mnli)
- **Gamification** — XP, streaks, achievements, leaderboards, avatar customization

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3.1 + TypeScript + Vite 6.4.2 + Tailwind CSS 4 |
| Backend | FastAPI (Python) on HuggingFace Spaces |
| AI Providers | DeepSeek (deepseek-chat, deepseek-reasoner) + HuggingFace Inference API |
| Database | Firebase Firestore + Realtime Database |
| Auth | Firebase Auth (email/password + Google) |
| Functions | Firebase Cloud Functions (Node.js 22 runtime) |
| Deployment | HuggingFace Spaces (backend + static frontend) |

## Key Files

- `src/App.tsx` — Main app with lazy-loaded routing
- `hf_space_test/main.py` — FastAPI backend entry point
- `functions/src/index.ts` — Firebase Cloud Functions exports
- `backend/routes/rag_routes.py` — RAG lesson/problem generation
- `src/services/apiService.ts` — Frontend API client (all backend calls go here)
- `config/models.yaml` — AI model routing configuration

## Production URLs

| Service | URL |
|---------|-----|
| **Backend API** | https://deign86-mathpulse-api-v3test.hf.space |
| **Frontend (HF Spaces)** | https://huggingface.co/spaces/Deign86/mathpulse-ai |
| **Firebase Console** | https://console.firebase.google.com/project/mathpulse-ai-2026 |
| **Swagger Docs** | https://deign86-mathpulse-api-v3test.hf.space/docs |

## AI Model Routing

| Profile | RAG Lessons | Chat | Quiz Gen | Solution Verify |
|---------|-------------|------|----------|-----------------|
| `dev` | deepseek-chat | deepseek-chat | deepseek-chat | deepseek-chat |
| `budget` | deepseek-chat | deepseek-chat | deepseek-chat | deepseek-chat |
| `prod` | **deepseek-reasoner** | deepseek-chat | deepseek-chat | deepseek-reasoner |

## IAR Workflow States

`not_started` → `in_progress` → `completed` → `placed`
                                ↘ `skipped_unassessed`
                                ↘ `deep_diagnostic_required` → `deep_diagnostic_in_progress` → `placed`

## Quiz Battle Architecture

- **Public matchmaking**: Firebase Realtime Database queue
- **Private rooms**: Room codes for invitation-only matches
- **Bot matches**: Practice against AI-powered bot
- **18+ Firebase Functions** handle match lifecycle, answer submission, heartbeat, rematch

## Curriculum

- **DepEd-aligned** Grade 11-12 mathematics curriculum
- **3 versions**: `legacy_k12`, `strengthened_shs_pilot_2025`, `strengthened_shs_full_2026`
- **RAG vector store**: `datasets/vectorstore/` with `BAAI/bge-small-en-v1.5` embeddings
- **Topic groups**: competencies, prerequisites, diagnostic policies per topic

## CI/CD

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR/push | vitest, pytest, functions build |
| `deploy-hf.yml` | Push to main | Auto-deploy backend (Docker) + frontend (static) to HF Spaces |
| `ai-change-audit.yml` | PR opened/sync | AI change tracking and review routing |
| `branch-name-governor.yml` | PR/push | Branch naming conventions validation |
| `agent-dispatch.yml` | Repository dispatch | Agent task routing to CI targets |