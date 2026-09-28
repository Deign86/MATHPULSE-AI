# src/config/

## Responsibility
Central frontend runtime configuration and stable display metadata.

## Design
`env.ts` exports `API_BASE_URL`, `APP_VERSION`, `IS_NATIVE_PLATFORM`, `IS_PRODUCTION`, and `apiUrl(path)`; it normalizes `VITE_API_URL` and otherwise uses same-origin `/api`. `subjects.ts` defines `SUBJECT_DISPLAY`, `getSubjectDisplayName`, `getSubjectShortLabel`, and `normalizeTopicDisplay`; `achievements.ts` holds `ACHIEVEMENTS` and `ACHIEVEMENT_MAP`.

## Flow
Environment values enter through Vite `import.meta.env`, are normalized once in `env.ts`, then consumed by API transport and runtime callers. Static subject/achievement metadata is imported directly by features.

## Integration
All HTTP calls flow through `services/apiService.ts`, which uses `apiUrl` from `env.ts`; Firebase settings are separately read by `lib/firebase.ts`.
