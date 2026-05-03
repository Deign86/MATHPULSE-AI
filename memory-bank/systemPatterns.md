# MathPulse AI — System Patterns

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase `.tsx` | `QuizMaker.tsx`, `DiagnosticAssessmentModal.tsx` |
| Hooks | camelCase `use*.ts` | `useAuth.ts`, `useChatSession.ts` |
| Services | camelCase `*Service.ts` | `apiService.ts`, `quizBattleService.ts` |
| Stores | camelCase `*Store.ts` | `useAuthStore.ts`, `useUIStore.ts` |
| Types/Interfaces | PascalCase | `User`, `StudentProfile`, `AIQuizQuestion` |
| API routes | kebab-case | `/api/chat/stream`, `/api/predict-risk/batch` |
| Firebase collections | snake_case | `user_progress`, `quiz_results`, `chat_sessions` |

## Component Patterns

### Lazy-loaded pages
All page components are lazy-loaded in App.tsx:
```typescript
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AIChatPage = lazy(() => import('@/pages/AIChatPage'));
```

### Context providers wrap App
```typescript
<AuthProvider>
  <NotificationProvider>
    <QueryClientProvider>
      <App />
    </QueryClientProvider>
  </NotificationProvider>
</AuthProvider>
```

### Service layer abstraction
All API calls go through `apiService.ts`. Never call `fetch` directly in components.

## State Management Patterns

### Zustand for global UI state
```typescript
const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

### TanStack Query for server state
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['students', classId],
  queryFn: () => studentService.getManagedStudents(classId),
});
```

### React Context for auth/chat/notifications
```typescript
const { user, signInWithEmail } = useAuth();
const { sessions, createSession } = useChat();
```

## IAR Workflow Pattern

### State transitions
```
not_started
  → in_progress (student starts diagnostic)
    → completed (all questions answered)
      → placed (learning path assigned)
    → skipped_unassessed (teacher skipped)
    → deep_diagnostic_required (at-risk topics found)
      → deep_diagnostic_in_progress
        → placed
```

### Trigger chain
1. Student completes diagnostic
2. `onDiagnosticComplete` Firestore trigger fires
3. Calls `/api/predict-risk` for risk classification
4. Based on risk level, either `placed` directly or `deep_diagnostic_required`
5. Learning path generated via `/api/learning-path`

## Quiz Battle Pattern

### Matchmaking flow
1. `quizBattleJoinQueue` writes to Realtime Database
2. Background sweep function matches players by tier
3. Match document created, players notified
4. Gameplay: submit answers, heartbeat every 30s
5. Match timeout after 5 minutes of inactivity

### Answer verification
Server-side validation — client cannot submit directly.

## RAG Pattern

### Vector store setup
```python
# Load curriculum documents → chunk → embed → store in ChromaDB
```

### Retrieval + Generation
1. Retrieve relevant curriculum context (similarity search)
2. Build prompt with context + student profile
3. Call deepseek-reasoner (prod profile) or deepseek-chat (dev/budget)
4. Return grounded lesson/problem

## Error Handling Patterns

### API errors
```typescript
try {
  await apiService.chat(message);
} catch (error) {
  toast.error(error.message);
}
```

### Stream errors
Watchdog timers (idle: 90s, total: 900s) auto-terminate stuck streams.

## Firebase Security Rules

- Users can only read/write their own data
- Teachers can read/write their students' data
- Admins have elevated permissions checked via custom claims

## CI/CD Pattern

### Feature branch → PR → Code Review → Merge → Auto-Deploy
1. Developer creates branch from `main`
2. Push triggers `ci.yml` (tests)
3. PR triggers `ai-change-audit.yml` (review routing)
4. Merge to `main` triggers `deploy-hf.yml`
5. Backend Docker rebuilt, frontend static rebuilt, both pushed to HF Spaces

## Testing Patterns

| Layer | Tool | Location |
|-------|------|----------|
| Frontend unit | Vitest | `src/**/*.test.ts(x)` |
| Backend unit | pytest | `backend/tests/` |
| E2E | Playwright | `e2e/*.spec.ts` |
| Functions | npm test | `functions/` |

## Type Patterns

### API response types
```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

### Firestore document types
```typescript
interface StudentProgress {
  odID: string;
  userI: string;
  xp: number;
  level: number;
  streak: number;
}
```

## Feature Flag Pattern

Environment variables with `VITE_` prefix for frontend, `ENABLE_*` for backend.

## Git Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| feature | `feat/short-description` | `feat/add-quiz-battle-rematch` |
| fix | `fix/short-description` | `fix/chat-stream-timeout` |
| ui | `ui/short-description` | `ui/dashboard-card-redesign` |
| docs | `docs/short-description` | `docs/update-api-endpoints` |
| chore | `chore/short-description` | `chore/upgrade-react-19` |
| bug | `bug/short-description` | `bug/iar-workflow-stuck` |