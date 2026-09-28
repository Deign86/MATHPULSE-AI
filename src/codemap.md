# src/

## Responsibility
Frontend bootstrap and top-level app composition for the React 18 + TypeScript + Vite client.

## Design
`App.tsx` owns authenticated role-aware navigation and lazy-loads screens; `main.tsx` sets up global providers and runtime behavior. Vite declarations live in `vite-env.d.ts`; `@` aliases `./src`.

## Flow
`main.tsx` applies cached settings, registers the app-shell service worker when enabled, then renders `ErrorBoundary > BrowserRouter > QueryClientProvider > AuthProvider > App`. `App` composes `ChatProvider` and feature notifications where needed.

## Integration
App behavior uses `contexts/AuthContext`, domain modules in `services/`, shared `types/`, Firebase via `lib/firebase`, and React Query via `lib/queryClient`. API requests use `config/env.ts` with the `services/apiService.ts` transport.
