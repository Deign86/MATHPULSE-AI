# src/lib/

## Responsibility
Shared initialized platform clients and app-wide query configuration.

## Design
`firebase.ts` initializes Firebase and exports `app`, `auth`, `db`, `cloudFunctions`, `realtimeDb`, `isRealtimeDbEnabled`, `storage`, and optional `analytics`, with persistence/config fallbacks. `queryClient.ts` exports the singleton `queryClient` and `clearQueryClientCache`; defaults are five-minute stale time, thirty-minute GC, one retry, and no focus refetch.

## Flow
Firebase configuration is read from Vite env vars, then services import initialized clients. `main.tsx` supplies `queryClient` through `QueryClientProvider`; cache clearing cancels current queries before clearing.

## Integration
Firebase-backed domain operations live in `services/*Service.ts`. TanStack Query owns server-state caching; React Context owns auth/chat and notifications. `diagnosticTopics.ts` and `topicTaxonomy.ts` provide shared domain mappings.
