# MathPulse AI — Technical Context

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
VITE_HF_MODEL_ID=Qwen/QwQ-32B
VITE_HF_USERNAME=Deign86
```

### Backend (HuggingFace Spaces Secrets)
```
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_REASONER_MODEL=deepseek-reasoner
HF_TOKEN (HuggingFace token)

INFERENCE_CHAT_MODEL_ID (default: Qwen/Qwen3-32B)
INFERENCE_MODEL_ID
INFERENCE_LOCK_MODEL_ID
INFERENCE_ENFORCE_LOCK_MODEL (default: true)
INFERENCE_LOCAL_SPACE_URL
INFERENCE_LOCAL_SPACE_GENERATE_PATH
MODEL_PROFILE (dev | prod | budget)

FIREBASE_AUTH_PROJECT_ID (default: mathpulse-ai-2026)
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_SERVICE_ACCOUNT_FILE
FIREBASE_AUTH_PROJECT_ALLOWLIST

ENABLE_DEV_ENDPOINTS (default: false)
UPLOAD_MAX_BYTES (default: 5242880 = 5MB)
UPLOAD_MAX_ROWS (default: 2000)
UPLOAD_MAX_COLS (default: 60)
UPLOAD_MAX_PDF_PAGES (default: 20)

EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
CURRICULUM_VECTORSTORE_DIR=datasets/vectorstore
```

### Firebase Functions (functions/.env.local)
```
HF_TOKEN (for Quiz Battle AI generation)
QUIZ_BATTLE_AI_MODEL=Qwen/QwQ-32B
QUIZ_BATTLE_AI_USE_BACKEND_FALLBACK=false
BACKEND_URL=https://deign86-mathpulse-api-v3test.hf.space
GOOGLE_CLOUD_PROJECT=mathpulse-ai-2026
GCLOUD_PROJECT=mathpulse-ai-2026
REASSESSMENT_INACTIVITY_DAYS=30
REASSESSMENT_SCAN_BATCH_LIMIT=300
```

## Production URLs

| Service | URL |
|---------|-----|
| **Backend API** | https://deign86-mathpulse-api-v3test.hf.space |
| **Frontend (HF Spaces)** | https://huggingface.co/spaces/Deign86/mathpulse-ai |
| **Frontend (Vercel)** | https://mathpulse-ai.vercel.app |
| **Firebase Console** | https://console.firebase.google.com/project/mathpulse-ai-2026 |
| **Swagger Docs** | https://deign86-mathpulse-api-v3test.hf.space/docs |

## CI/CD Pipelines

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **ci.yml** | PR to main/develop, push to non-main | Tests: vitest, pytest, functions build |
| **deploy-hf.yml** | Push to main | Auto-deploys backend (Docker) + frontend (static) to HF Spaces |
| **ai-change-audit.yml** | PR opened/reopened/sync, manual dispatch | Analyzes changes, adds labels, requests reviewers |
| **agent-dispatch.yml** | Repository dispatch, manual | Routes agent tasks to appropriate CI targets |
| **branch-name-governor.yml** | PR sync, push (non-main), manual | Normalizes branch names, validates conventions |

### deploy-hf.yml Details
```
Backend (Docker):
  - Space: Deign86/mathpulse-api-v3test
  - Pre-deploy validation: pytest + mypy
  - Enforces HF Space model env vars after deploy

Frontend (Static):
  - Space: Deign86/mathpulse-ai
  - Builds with Vite
  - Syncs dist/ to HF Space
  - Uses LFS for media files (.mp4, .webm, .mov)
```

### CI Pipeline (ci.yml)
```
Frontend (Node 22):
  - npm ci --legacy-peer-deps
  - vitest run --passWithNoTests

Backend (Python 3.12):
  - pytest with exclusions for known flaky tests
  - Location: backend/requirements-dev.txt

Functions (Node 22):
  - npm ci in functions/ directory
  - npm run build
  - npm test
```

### Secrets Required (GitHub Settings → Secrets)
```
HF_TOKEN (HuggingFace write token)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_FIREBASE_DATABASE_URL
```

## Frontend Architecture

### Path Alias
`@` → `./src`

### Routing
React Router DOM 7 (lazy-loaded components):
- `/dashboard` — Dashboard page
- `/modules` — Modules page
- `/chat` — AI Chat page (L.O.L.I.)
- `/grades` — Grades page
- `/leaderboard` — Leaderboard page
- `/quiz-battle` — Quiz Battle page
- `/avatar-studio` — Avatar Shop

### State Management
| Type | Library | Usage |
|------|---------|-------|
| Global state | Zustand | User preferences, UI state |
| Server state | TanStack Query | API data caching |
| Auth state | React Context | AuthContext |
| Chat state | React Context | ChatContext |
| Notifications | React Context | NotificationProvider |

### Key Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.4.2 | Build tool |
| Tailwind CSS | 4.1.18 | Styling |
| React Router | 7.14.2 | Routing |
| TanStack Query | 5.100.6 | Server state |
| Firebase | 12.12.1 | Backend-as-a-service |
| Radix UI | (various) | Headless components |
| Framer Motion | 12.38.0 | Animations |
| Recharts | 2.15.4 | Charts |
| Lucide React | (latest) | Icons |
| Sonner | 2.0.7 | Toast notifications |
| React Hook Form | 7.74.0 | Form handling |
| Zod | 4.3.6 | Validation |

### Service Files (src/services/)
| Service | Key Methods |
|---------|------------|
| `apiService.ts` | `chat()`, `chatSafe()`, `predictRisk()`, `learningPath()`, `uploadClassRecords()`, `generateQuiz()`, `generateLesson()`, RAG methods |
| `authService.ts` | `signUpWithEmail()`, `signInWithEmail()`, `signInWithGoogle()`, `signOutUser()`, `getUserProfile()`, `updateUserProfile()`, `deleteCurrentUserAccount()` |
| `chatService.ts` | `createChatSession()`, `getUserChatSessions()`, `addMessageToSession()`, `getSessionMessages()`, `deleteSession()` |
| `gamificationService.ts` | `updateStreak()`, `awardXP()`, `getLeaderboard()`, `subscribeToLeaderboard()`, `getUserRank()`, `checkAchievements()`, `purchaseAvatarItem()` |
| `quizService.ts` | `saveGeneratedQuiz()`, `updateQuizStatus()`, `publishQuiz()`, `assignQuizToStudent()`, `getStudentQuizzes()`, `saveQuizAnswer()` |
| `quizBattleService.ts` | `joinQueue()`, `leaveQueue()`, `createPrivateRoom()`, `joinPrivateRoom()`, `startMatch()`, `submitAnswer()`, `getMatchState()`, `getLeaderboard()` |
| `progressService.ts` | `initializeUserProgress()`, `getUserProgress()`, `subscribeToUserProgress()`, `updateLessonProgress()`, `recordQuizAttempt()` |
| `notificationService.ts` | `createNotification()`, `getUserNotifications()`, `markAsRead()`, `subscribeToNotifications()` |
| `automationService.ts` | `getPendingDeepDiagnosticCount()`, `triggerDiagnosticCompleted()`, `triggerQuizSubmitted()`, `triggerStudentEnrolled()`, `triggerDataImported()` |
| `settingsService.ts` | `getUserSettings()`, `upsertUserSettings()`, `applyRuntimeSettings()`, `clearClientCache()`, `exportUserDataSnapshot()` |
| `adminService.ts` | `getUsersPage()`, `createUser()`, `updateUser()`, `deleteUser()`, `bulkAction()` |
| `studentService.ts` | `getManagedStudents()`, `getClassrooms()`, `createClassroom()`, `updateStudent()`, `getStudentProgress()` |
| `lessonPlanService.ts` | `saveGeneratedLessonPlan()`, `publishLessonPlan()`, `getLessonPlans()` |

## Backend Architecture

### Framework
FastAPI (Python) deployed on HuggingFace Spaces

### AI Integration
- **OpenAI SDK** (>=1.0.0) — DeepSeek API (OpenAI-compatible)
- **HuggingFace Hub** (>=0.31.0) — Inference API for hosted models
- **Sentence Transformers** (>=3.0.0) — Embeddings for RAG
- **LangChain** — Text splitters for document chunking
- **ChromaDB** (>=0.5.0) — Vector store

### Routes (backend/routes/)
| Route File | Purpose |
|------------|---------|
| `rag_routes.py` | RAG lesson/problem generation, vector store health |
| `admin_model_routes.py` | Runtime model config (profile switching, overrides) |

### Main Endpoints (hf_space_test/main.py)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | AI math tutor (blocking) |
| `/api/chat/stream` | POST | SSE streaming chat |
| `/api/verify-solution` | POST | Multi-method solution verification |
| `/api/predict-risk` | POST | Student risk classification |
| `/api/predict-risk/batch` | POST | Batch risk prediction |
| `/api/learning-path` | POST | Personalized learning path generation |
| `/api/analytics/daily-insight` | POST | AI-generated classroom insights |
| `/api/upload/class-records` | POST | CSV/Excel upload with AI column mapping |
| `/api/upload/course-materials` | POST | PDF/DOCX upload |
| `/api/quiz/generate` | POST | AI quiz generation (Bloom's Taxonomy) |
| `/api/lesson/generate` | POST | Curriculum-grounded lesson generation |
| `/api/rag/lesson` | POST | RAG-powered lesson generation |
| `/api/rag/generate-problem` | POST | RAG problem generation |
| `/api/rag/analysis-context` | POST | Curriculum context for weak topics |
| `/api/rag/health` | GET | Vector store health check |
| `/api/admin/users` | GET | Paginated user list |
| `/api/admin/users/bulk-action` | POST | Bulk user operations |
| `/api/admin/model-config` | GET/POST | Runtime AI model config |

### Model Configuration (config/models.yaml)
```yaml
models:
  primary: deepseek-chat (max_tokens: 800, temp: 0.7)
  rag_primary: deepseek-reasoner (max_tokens: 1800, temp: 0.2, thinking enabled)
  embedding: BAAI/bge-small-en-v1.5

routing:
  task_model_map:
    chat: deepseek-chat
    verify_solution: deepseek-reasoner
    quiz_generation: deepseek-chat
    learning_path: deepseek-chat
    rag_lesson: deepseek-reasoner
    rag_problem: deepseek-chat
```

## Firebase Functions (Node.js 22)

### Firestore Triggers
- `onStudentCreated` — Initialize progress & notifications
- `onStudentProfileUpdated` — Profile updates, reassessment sweeps
- `onDiagnosticComplete` — Process diagnostic results, trigger risk
- `onQuizSubmitted` — Recalculate risk on quiz completion
- `onAttendanceUpdate` — Attendance pattern tracking
- `onContentUpdated` — Teacher notifications for curriculum changes

### HTTP Callable Functions
- `manualProcessStudent` — Reprocess diagnostic
- `manualProcessQuiz` — Reprocess quiz result
- `manualRequestReassessment` — Force reassessment eligibility
- `manualBackfillCurriculumVersion` — Bulk curriculum version updates

### Quiz Battle Functions (18+)
- `quizBattleJoinQueue` / `quizBattleLeaveQueue` — Public matchmaking
- `quizBattleCreatePrivateRoom` / `quizBattleJoinPrivateRoom` / `quizBattleLeavePrivateRoom` — Private rooms
- `quizBattleCreateBotMatch` — Bot practice matches
- `quizBattleStartMatch` / `quizBattleGetMatchState` — Match lifecycle
- `quizBattleSubmitAnswer` / `quizBattleRequestRematch` — Gameplay
- `quizBattleHeartbeat` — Connection keep-alive
- `quizBattleResolvePublicMatchmakingSweep` — Background matchmaking resolution

## Firebase Project

- **Project ID**: mathpulse-ai-2026
- **Region**: us-east1
- **Firestore**: User profiles, progress, quiz results, chat sessions, notifications
- **Realtime Database**: Quiz battle matchmaking queue
- **Storage**: Avatar images, course materials
- **Functions**: nodejs22 runtime