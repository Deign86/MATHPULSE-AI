# src/types/

## Responsibility
Shared TypeScript contracts for users, learning, assessments, rewards, settings, and AI/backend payloads.

## Design
`models.ts` defines `User`, role profiles, `UserSettings`, `UserProgress`, quiz/chat/notification records, and assessment/risk contracts. Other modules include `assessment.ts`, `curriculum.ts`, `competency.ts`, `rewards.ts`, `settings.ts`, `models.ts`, and `hfMonitoring.ts`.

## Flow
Types are imported at compile time by contexts, hooks, data, services, and components; they describe the boundary between UI state, persisted Firebase documents, and API payloads.

## Integration
`services/apiService.ts` supplies typed backend contracts and domain services use shared models. Keep data shaping at service/API boundaries; this folder has no runtime state or transport logic.
