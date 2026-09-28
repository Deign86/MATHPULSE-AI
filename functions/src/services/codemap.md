# functions/src/services/

## Responsibility
Provides FastAPI HTTP integration and an in-process TTL cache shared by warm function instances.

## Design
`backendApi.ts` exposes typed endpoint wrappers with timeout, bounded retries, exponential delay, and no retry on 4xx. `runtimeCache.ts` normalizes keys, expires entries, and prunes least-recently-used entries above its bound.

## Flow
Automation → `predictRisk`/`generateLearningPath` → HTTP POST to backend → typed response or error. Quiz Battle/content handlers → `runtimeCache` lookup → Firestore read on miss → cache result.

## Integration
Consumed by `automations/diagnosticProcessor` (`/api/predict-risk`, `/api/learning-path`), `triggers/quizBattleApi` (profile/question-bank caching), and `triggers/onContentUpdated` (teacher-list cache). Settings come from `config/constants`; no Firestore collections are written by this folder.
