# src/hooks/

## Responsibility
Reusable React lifecycle and feature-state adapters for screens and components.

## Design
Hooks are focused by domain: `useAuth` is in contexts, while examples here include `useCurriculum`/`useStaticCurriculum`, `useStudentRisk`, `useDailyReward`, `useLessonContent`, `useOnlineStatus`, `usePwaInstall`, and `usePushNotifications`.

## Flow
Components call hooks; hooks subscribe to browser events or compose focused services and, where applicable, TanStack Query/cached state. They return view-ready state and actions rather than owning shared global state.

## Integration
Hooks commonly call `services/*Service.ts`, use curriculum from `data/` and shared types, or read Context providers. Network requests remain centralized through `config/env.ts` and `services/apiService.ts`.

## Onboarding tour lifecycle

- `useOnboardingTour(uid, ready, blocked, offerPending)` is not role-scoped: the student `App`, `TeacherDashboard` and `AdminDashboard` each call it. It returns `{ isOpen, page, start, dismiss, offerOpen, acceptOffer, declineOffer }`. It reads and writes no browser storage, so finishing or skipping a guide persists nothing.
- `offerPending` is `userProfile.guideOfferPending === true` while the role's home page is showing (student Dashboard, teacher dashboard view, admin Overview). Accounts without the flag are never offered the guide automatically. The flag is set when an account is created (`authService.createUserProfile`, backend `user_provisioning_service.create_user`, the student bulk import for new documents, and the teacher create-student-account endpoint); `scripts/backfill-guide-offer.ts` also sets it on older accounts that have never signed in.
- When the flag is set and the screen is safe (`ready`, not `blocked`, no other dialog open; 1.5 s delay, then a 500 ms poll while a dialog is open), `offerOpen` becomes true and `onboarding/FirstUseGuidePrompt` asks "Play the tutorial now?". `acceptOffer` and `declineOffer` clear the flag with `updateDoc(users/{uid}, { guideOfferPending: false })`; `acceptOffer` also plays the full guide. The answer is kept in memory for the session. If the write fails it is logged, the offer is not repeated this session, and it may return at the next login.
- `start(pageTab?)` plays one page's guide, or the full guide, for any account (header **?** button, Settings replay). It does not touch the flag or IAR state.
