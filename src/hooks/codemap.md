# src/hooks/

## Responsibility
Reusable React lifecycle and feature-state adapters for screens and components.

## Design
Hooks are focused by domain: `useAuth` is in contexts, while examples here include `useCurriculum`/`useStaticCurriculum`, `useStudentRisk`, `useDailyReward`, `useLessonContent`, `useOnlineStatus`, `usePwaInstall`, and `usePushNotifications`.

## Flow
Components call hooks; hooks subscribe to browser events or compose focused services and, where applicable, TanStack Query/cached state. They return view-ready state and actions rather than owning shared global state.

## Integration
Hooks commonly call `services/*Service.ts`, use curriculum from `data/` and shared types, or read Context providers. Network requests remain centralized through `config/env.ts` and `services/apiService.ts`.

## Student tour lifecycle

- `useOnboardingTour.ts` (role-scoped: `student` / `teacher` / `admin`) schedules first-use launch only when the caller reports a safe dashboard. It defers other dialogs, supports explicit Settings replay, scopes dismissal to account/browser/version, and uses session memory when localStorage is unavailable. It does not write IAR or backend state.
