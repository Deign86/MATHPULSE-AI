# MathPulse AI Caching Guide

This document describes the additive caching layer implemented across frontend, backend, and Firebase Functions.

## Principles

- Additive and non-breaking: no endpoint contracts or callable signatures were removed.
- Fail-open by default: cache errors do not block normal request handling.
- Scope-aware keys: user and request scope are included where needed to prevent cross-user leakage.
- TTL-first invalidation: short, explicit TTLs are used for dynamic AI and analytics responses.

## Frontend Caching

### React Query Foundation

- Provider: Query client is mounted in `src/main.tsx`.
- Client config: `src/lib/queryClient.ts`.
- Defaults:
  - staleTime: 5 minutes
  - gcTime: 30 minutes
  - retry: 1
  - refetchOnWindowFocus: false

### Firestore Offline Cache

- File: `src/lib/firebase.ts`
- IndexedDB persistence is enabled with graceful fallback for:
  - multi-tab lock conflicts
  - unsupported browsers

### Frontend Data Caches

- Chat hint cache: `src/utils/hintCache.ts`
  - Scope: per-user + normalized prompt + recent history signature
  - Medium: in-memory + sessionStorage
  - TTL: 20 minutes
  - Integrated in: `src/contexts/ChatContext.tsx`
- Modules view query cache: `src/components/ModulesPage.tsx`
- Topic mastery query cache: `src/components/TopicMasteryView.tsx`
- Mastery heatmap query cache: `src/components/MasteryHeatmap.tsx`
- Avatar inventory metadata cache: `src/components/AvatarShop.tsx`
  - Medium: sessionStorage
  - TTL: 10 minutes

### Client Cache Reset

- File: `src/services/settingsService.ts`
- `clearClientCache()` now clears:
  - React Query cache
  - chat hint cache
  - localStorage and sessionStorage
  - Cache Storage entries

## Backend Caching (FastAPI)

### Utility

- File: `backend/services/deterministic_cache.py`
- Features:
  - local TTL + LRU cache
  - optional Redis backing (fail-open)
  - deterministic cache keys via canonical JSON hashing

### Integrated Endpoints

- `POST /api/verify-solution`
- `POST /api/predict-risk`
- `POST /api/learning-path`
- `POST /api/analytics/daily-insight`

Each endpoint now:

- checks cache before model execution
- returns `X-Cache: HIT|MISS`
- stores successful responses with endpoint-specific TTLs

### Backend TTL Defaults

- verify solution: 900s
- predict risk: 600s
- learning path: 300s
- daily insight: 180s

### Public Static Header Policy

- `GET /api/quiz/topics` now returns:
  - `Cache-Control: public, max-age=300, stale-while-revalidate=900`

## Firebase Functions Caching

### Utility

- File: `functions/src/services/runtimeCache.ts`
- Features:
  - in-memory TTL cache
  - LRU-style pruning by last access
  - generic key builder (`createRuntimeCacheKey`)

### Integrated Hotspots

- `functions/src/triggers/quizBattleApi.ts`
  - question bank pool reads (non-transaction path)
  - user battle profile reads (non-transaction path)
- `functions/src/triggers/onContentUpdated.ts`
  - teacher list query used for broadcast notifications

### Callable Header Policy

Functions remain callable-based (`onCall`) and do not expose HTTP cache headers for client caches. Shared-read optimization is applied internally via runtime cache.

## Environment Variables

### Backend

- `DETERMINISTIC_CACHE_ENABLED` (default: true)
- `DETERMINISTIC_CACHE_MAX_ENTRIES` (default: 1200)
- `DETERMINISTIC_CACHE_REDIS_URL` (optional)
- `VERIFY_SOLUTION_CACHE_TTL_SECONDS` (default: 900)
- `PREDICT_RISK_CACHE_TTL_SECONDS` (default: 600)
- `LEARNING_PATH_CACHE_TTL_SECONDS` (default: 300)
- `DAILY_INSIGHT_CACHE_TTL_SECONDS` (default: 180)

### Functions

- `QUIZ_BATTLE_QUESTION_BANK_CACHE_TTL_MS` (default: 45000)
- `QUIZ_BATTLE_PROFILE_CACHE_TTL_MS` (default: 30000)

## Validation Checklist

- Frontend typecheck/build
- Backend API tests for deterministic cache hit behavior
- Functions TypeScript build
- Smoke test key endpoints and callable flows
