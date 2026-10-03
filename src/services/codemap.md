# src/services/

## Responsibility
Domain operations and transport adapters connecting React features to Firebase and backend APIs.

## Design
`apiService.ts` exports `apiService`, `apiFetch`, `warmupBackend`, and named operations such as `generateRagLesson`, `getCurriculumSubjects`, and `getCurriculumTopics`; it centralizes typed fetch, retries, errors, and endpoint contracts. Domain modules include `authService.ts`, `assessmentService.ts`, `progressService.ts`, `chatService.ts`, and `gamificationService.ts`.
`quizService.ts` persists submissions transactionally (`saveQuizResults` writes only `quizSubmissions`; completed assignments emit no duplicate submission and assignment/generated-quiz writes are never required client-side). `lessonService.ts` fetches RAG lessons (`fetchRagLesson` → `POST /api/rag/lesson`); `automationService.ts` fires quiz-submitted automation; `gradesService.ts` persists assessment results for GradesPage visibility.

## Flow
Hooks/components call domain functions; services read/write Firebase through `lib/firebase.ts` or call backend via `apiService.ts`. API transport resolves its origin through `config/env.ts` and returns typed data to callers/query caches. Quiz completion fans out to automation, result persistence, assessment records, and parent XP callbacks — all suppressed in preview/local-retake mode.

## Integration
TanStack Query is the server-state layer, with contexts reserved for auth/chat/notifications. Services share contracts from `types/`; Firebase operations use initialized clients in `lib/`.
