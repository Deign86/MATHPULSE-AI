# MathPulse AI — Technical Context

## Codebase Statistics (May 3, 2026)

| Layer | Files | Lines | Key Files |
|-------|-------|-------|-----------|
| Frontend (`src/`) | ~209 | ~56,300 | App.tsx (1,328), QuizBattlePage.tsx (3,285), TeacherDashboard.tsx (3,443) |
| Backend (`backend/`) | 28 | ~19,200 | main.py (11,466), analytics.py (1,777), inference_client.py (907) |
| Functions (`functions/`) | ~22 | — | index.ts (29 exports), 15 quiz battle + 7 triggers + 8 automations |
| E2E Tests (`e2e/`) | 2 | ~326 | model-hotswap.spec.ts, aiMonitoring.spec.ts |
| Backend Tests | 7 | ~2,373 | test_api.py (1,726), test_rag_pipeline.py, test_model_profiles.py |
| GitHub Workflows | 5 | ~1,136 | ci.yml, deploy-hf.yml, branch-name-governor.yml, ai-change-audit.yml, agent-dispatch.yml |
| UI Components | 50 | ~4,800 | shadcn/ui primitives in `src/components/ui/` |

## Environment Variables

### Frontend (.env.local / Vite)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=mathpulse-ai-2026
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_DATABASE_URL
VITE_FUNCTIONS_EMULATOR_HOST (default: 127.0.0.1)
VITE_FUNCTIONS_EMULATOR_PORT (default: 5001)
VITE_USE_FUNCTIONS_EMULATOR (default: false)
VITE_IAR_WORKFLOW_MODE (iar_only | iar_plus_diagnostic)
VITE_API_URL=https://deign86-mathpulse-api-v3test.hf.space
VITE_BACKEND_URL (RAG API base)
VITE_ENABLE_IMPORT_GROUNDED_QUIZ (default: true)
VITE_ENABLE_IMPORT_GROUNDED_LESSON (default: true)
VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS (default: true)
VITE_ENABLE_ASYNC_GENERATION (default: true)
VITE_CHAT_STREAM_IDLE_TIMEOUT_MS (default: 90000)
VITE_CHAT_STREAM_TOTAL_TIMEOUT_MS (default: 900000)
```

### Backend (HF Spaces Secrets)
```
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_REASONER_MODEL=deepseek-reasoner
HF_TOKEN

INFERENCE_CHAT_MODEL_ID (default: Qwen/Qwen3-32B)
MODEL_PROFILE (dev | prod | budget)

FIREBASE_AUTH_PROJECT_ID (default: mathpulse-ai-2026)
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_SERVICE_ACCOUNT_FILE

EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
CURRICULUM_VECTORSTORE_DIR=datasets/vectorstore
```

### Firebase Functions (functions/.env.local)
```
HF_TOKEN
QUIZ_BATTLE_AI_MODEL=Qwen/QwQ-32B
BACKEND_URL=https://deign86-mathpulse-api-v3test.hf.space
GOOGLE_CLOUD_PROJECT=mathpulse-ai-2026
REASSESSMENT_INACTIVITY_DAYS=30
REASSESSMENT_SCAN_BATCH_LIMIT=300
```

## Production URLs

| Service | URL |
|---------|-----|
| Backend API | https://deign86-mathpulse-api-v3test.hf.space |
| Frontend (HF Spaces) | https://huggingface.co/spaces/Deign86/mathpulse-ai |
| Frontend (Vercel) | https://mathpulse-ai.vercel.app |
| Firebase Console | https://console.firebase.google.com/project/mathpulse-ai-2026 |
| Swagger Docs | https://deign86-mathpulse-api-v3test.hf.space/docs |

## Frontend Architecture

### Path Alias
`@` → `./src`

### Routing
Tab-based navigation in `App.tsx` (no React Router for student view):
- `Dashboard`, `Modules`, `AI Chat`, `Grades`, `Leaderboard`, `Quiz Battle`, `Avatar Studio`

Teacher and admin roles render their dashboards directly.

### Key Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.9.x | Type safety |
| Vite | 6.4.2 | Build tool |
| Tailwind CSS | 4.1.18 | Styling (via @tailwindcss/vite plugin) |
| Firebase | 12.12.1 | Backend-as-a-service |
| TanStack Query | 5.100.6 | Server state |
| Radix UI | ~20 packages | Headless components |
| Motion (Framer) | 12.38.0 | Animations |
| Recharts | 2.15.4 | Charts |
| Lucide React | latest | Icons |
| Sonner | 2.0.7 | Toast notifications |
| React Hook Form | 7.74.0 | Form handling |
| Zod | 4.3.6 | Validation |

## Backend Architecture

### Framework
FastAPI (Python) — monolithic 11,466-line `main.py` on HuggingFace Spaces

### AI Integration
- **OpenAI SDK** → DeepSeek API (`deepseek-chat`, `deepseek-reasoner`)
- **SentenceTransformers** → `BAAI/bge-base-en-v1.5` embeddings
- **ChromaDB** → Persistent vector store (533 chunks, cosine distance)
- **LangChain** → Text splitters for document chunking

### Model Routing (config/models.yaml)
| Task | Model | Tokens | Temp |
|------|-------|--------|------|
| Chat | deepseek-chat | 800 | 0.7 |
| Verify Solution | deepseek-reasoner | — | — |
| Quiz Generation | deepseek-chat | 800 | 0.7 |
| RAG Lessons | deepseek-reasoner | 1800 | 0.2 |
| Learning Path | deepseek-chat | — | — |
| Risk Narrative | deepseek-reasoner | — | — |

### Key Endpoints (55+ total)
| Endpoint | Role | Purpose |
|----------|------|---------|
| `/api/chat` | All | AI math tutor |
| `/api/chat/stream` | All | SSE streaming chat |
| `/api/verify-solution` | All | Multi-method verification |
| `/api/predict-risk` | Teacher/Admin | Risk classification |
| `/api/learning-path` | All | Personalized learning path |
| `/api/quiz/generate` | Teacher/Admin | AI quiz generation |
| `/api/lesson/generate` | Teacher/Admin | AI lesson generation |
| `/api/rag/lesson` | Teacher/Admin | RAG-grounded lesson |
| `/api/rag/health` | All | Vector store health |
| `/api/admin/users` | Admin | User management |
| `/api/diagnostic/generate` | Student | Diagnostic question generation |
| `/api/diagnostic/submit` | Student | Submit + score diagnostic |

### Routes Module
| Route File | Endpoints |
|------------|-----------|
| `routes/rag_routes.py` | `/api/rag/health`, `/api/rag/lesson`, `/api/rag/generate-problem`, `/api/rag/analysis-context` |
| `routes/admin_model_routes.py` | `/api/admin/model-config` CRUD |
| `routes/diagnostic.py` | **NEW** `/api/diagnostic/generate`, `/api/diagnostic/submit` |

## Firebase Functions

### Runtime: Node.js 22
### 29 Exported Functions

**Firestore Triggers:**
- `onStudentCreated`, `onDiagnosticComplete`, `onQuizSubmitted`, `onAttendanceUpdate`, `onContentUpdated`, `onStudentProfileUpdated`

**HTTP Callables:**
- `manualProcessStudent`, `manualProcessQuiz`, `manualBackfillCurriculumVersion`, `manualRequestReassessment`

**Quiz Battle (15 callables):**
- Matchmaking: `quizBattleJoinQueue`, `quizBattleLeaveQueue`, `quizBattleResolvePublicMatchmakingSweep`
- Rooms: `quizBattleCreatePrivateRoom`, `quizBattleJoinPrivateRoom`, `quizBattleLeavePrivateRoom`, `quizBattleGetPrivateRoomState`
- Gameplay: `quizBattleStartMatch`, `quizBattleGetMatchState`, `quizBattleSubmitAnswer`, `quizBattleRequestRematch`
- Bot: `quizBattleCreateBotMatch`
- Session: `quizBattleHeartbeat`, `quizBattleResumeSession`, `quizBattleGetGenerationAudit`

## ChromaDB Vector Store

| Property | Value |
|----------|-------|
| Collection | `curriculum_chunks` |
| Distance | Cosine |
| Total Chunks | 533 |
| Subjects | General Math (124), Business Math (128), Org Management (151), Stats (130) |
| Embedding Model | BAAI/bge-base-en-v1.5 |
| Last Ingested | 2026-04-24 15:01:13 UTC |

## CI/CD

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR/push | vitest, pytest, functions build |
| `deploy-hf.yml` | Push to main | Auto-deploy backend + frontend to HF Spaces |
| `ai-change-audit.yml` | PR | AI change tracking, label application |
| `branch-name-governor.yml` | PR/push | Branch naming normalization |
| `agent-dispatch.yml` | Repository dispatch | Agent task routing |
