# MathPulse AI — System Patterns

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase `.tsx` | `QuizMaker.tsx`, `DiagnosticAssessmentModal.tsx` |
| Pages | PascalCase `*Page.tsx` in `components/` | `AIChatPage.tsx`, `GradesPage.tsx` |
| Hooks | camelCase `use*.ts` | `useAuth.ts`, `useDailyCheckInReminder.ts` |
| Services | camelCase `*Service.ts` | `apiService.ts`, `quizBattleService.ts` |
| Types/Interfaces | PascalCase | `User`, `StudentProfile`, `QuizQuestionGenerated` |
| API routes | kebab-case | `/api/chat/stream`, `/api/predict-risk/batch` |
| Firebase collections | camelCase | `diagnosticResults`, `quizResults`, `studentProgress` |
| Backend Python files | snake_case | `curriculum_rag.py`, `vectorstore_loader.py` |

## Folder Structure

```
MATHPULSE-AI/
├── src/
│   ├── components/          # All components, pages, UI primitives
│   │   ├── ui/              # 50 shadcn/ui components
│   │   ├── battle/          # 4 quiz battle components
│   │   ├── assessment/      # NEW: diagnostic assessment components
│   │   └── admin/           # 1 admin component
│   ├── contexts/            # 2 contexts (AuthContext, ChatContext)
│   ├── services/            # 24 service files
│   ├── lib/                 # 3 core lib files (firebase, queryClient, diagnosticTopics)
│   ├── types/               # 3 type files (models.ts = 708 lines, main)
│   ├── utils/               # 9 utility files
│   ├── data/                # 7 data files (curriculum, subjects, IAR blueprint)
│   └── features/            # 2 feature modules (notifications, import)
├── backend/
│   ├── main.py              # Monolithic FastAPI app (11,466 lines)
│   ├── analytics.py         # ML-powered analytics (1,777 lines)
│   ├── automation_engine.py # Event-driven automation (573 lines)
│   ├── routes/              # 2 route modules (rag, admin_model)
│   ├── rag/                 # 2 RAG module files
│   ├── services/            # 8 service files
│   └── scripts/             # 2 curriculum ingestion scripts
├── functions/
│   └── src/
│       ├── index.ts         # 29 Cloud Function exports
│       ├── triggers/        # 7 Firestore trigger handlers
│       ├── automations/     # 8 automation modules
│       ├── scoring/         # Scoring engine + tests
│       └── services/        # Backend API + cache services
├── datasets/
│   ├── curriculum/          # PDF source files
│   ├── vectorstore/         # ChromaDB persistent DB (533 chunks)
│   └── eval/                # Model evaluation problem banks
├── config/                  # Runtime config (models.yaml, change-scope-map.json)
├── docs/                    # 10 handoff/spec/audit documents
└── .github/workflows/       # 5 CI/CD workflows
```

## Component Patterns

### Page-as-Component Pattern
Pages live as PascalCase files in `src/components/` (no `pages/` directory):
```
components/LoginPage.tsx
components/AIChatPage.tsx
components/GradesPage.tsx
components/LeaderboardPage.tsx
components/QuizBattlePage.tsx
components/QuizMaker.tsx          # Teacher quiz creation wizard
components/TeacherDashboard.tsx    # Teacher workspace (3,443 lines)
components/AdminDashboard.tsx      # Admin control panel
```

### Lazy Loading
All page components are lazy-loaded in `App.tsx`:
```typescript
const LoginPage = lazy(() => import('./components/LoginPage.tsx'));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard.tsx'));
```

### Service Layer Abstraction
All API calls go through `apiService.ts`. Never call `fetch` directly in components. Firebase calls go through domain service files.

## State Management Patterns

| Type | Library | Usage |
|------|---------|-------|
| Global UI | React Context | AuthContext, ChatContext, NotificationContext |
| Server state | TanStack Query | API data caching via `queryClient.ts` |
| Form state | React Hook Form + Zod | QuizMaker, Settings, Profile forms |
| Real-time | Firestore onSnapshot | Quiz Battle, notifications |
| Cache | LRU + Redis (optional) | Deterministic response cache in backend |

## API Communication Patterns

### Frontend → Backend
```
components → apiService.ts → apiFetch<T>() → FastAPI backend
                                  ↓
                          Firebase ID token
                          (Bearer header)
                                  ↓
                          authService.ts
                          (token acquisition)
```

### API Fetch Wrapper (`apiService.ts`)
```typescript
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
  retryOpts: RetryFetchOptions = DEFAULT_RETRY_OPTS,
): Promise<T>
```
Features: auto token injection, 401 retry with refresh, exponential backoff, timeout handling

### Backend Auth Middleware
```
Request → AuthMiddleware → verify Firebase ID token → resolve role from Firestore
       → RequestMiddleware → request ID, logging, 120s timeout
       → Route handler
```

## IAR Workflow Pattern

### State Machine
```
not_started → in_progress → completed → placed
           ↘ skipped_unassessed
           ↘ deep_diagnostic_required → deep_diagnostic_in_progress → placed
```

### Trigger Chain
1. Student completes diagnostic → frontend writes to Firestore
2. `onDiagnosticComplete` Cloud Function fires
3. Risk classification, badge updates, learning path generation
4. Optional: deep diagnostic assignment for at-risk topics

## Quiz Battle Pattern

### Match Lifecycle
```
joinQueue → matched → ready → in_progress → completed/cancelled
```
Server-authoritative match state via `quizBattleResolvePublicMatchmakingSweep`.

Events: `round_started`, `answer_locked`, `round_result`, `match_completed`

## RAG Pattern

### Retrieval Flow
```
query → SentenceTransformer embed → ChromaDB cosine search → top_k chunks → build prompt → DeepSeek generate
```

### Vector Store Specs
- **DB:** ChromaDB PersistentClient
- **Collection:** `curriculum_chunks` (cosine distance)
- **Embedding:** `BAAI/bge-base-en-v1.5` (backend), `BAAI/bge-small-en-v1.5` (frontend ref)
- **Chunks:** 533 total (General Math 124, Business Math 128, Org Management 151, Stats 130)

## Firestore Schema Patterns

| Collection | Document Pattern | Access |
|------------|-----------------|--------|
| `users/{uid}` | User profiles with role, grade, gamification | Auth + own docs |
| `diagnosticResults/{uid}` | Diagnostic results + risk profiles | Read own, write functions |
| `diagnosticResults/{uid}/attempts/{diagId}` | Individual attempt data | Write functions |
| `studentProgress/{uid}/stats/main` | Learning path, XP, streaks | Read own, write functions |
| `progress/{uid}` | Lesson/quiz completion tracking | Read/write own |
| `quizResults` | Quiz submissions | Write frontend, read functions |

## Testing Patterns

| Layer | Tool | Location |
|-------|------|----------|
| Frontend unit | Vitest | `src/**/*.test.ts(x)` |
| Backend unit | pytest | `backend/tests/` |
| E2E | Playwright | `e2e/*.spec.ts` |
| Functions | node --test | `functions/src/**/*.test.ts` |

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| feature | `feat/short-description` | `feat/rag-pipeline-and-modules` |
| fix | `fix/short-description` | `fix/chat-stream-timeout` |
| chore | `chore/short-description` | `chore/repo-standardization` |
| feature (alt) | `feature/short-description` | `feature/comprehensive-diagnostic-rag-system` |
