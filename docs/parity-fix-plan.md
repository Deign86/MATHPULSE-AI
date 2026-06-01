# MathPulse AI — Parity Fix Execution Plan

> **Generated:** 2026-06-01
> **Input doc:** `docs/parity-differences.md` (373 lines, 27 gaps)
> **Goal:** 100% functional parity between web and mobile
> **Strategy:** Service-first (Wave 1), then screen consumers (Wave 2), then polish (Wave 3), then quality (Wave 4). Each task is atomic, has a tsc + smoke gate, and is assigned a subagent category.

---

## Critical Path

Five foundational service rewrites block everything else. Until they land, all dependent screens keep their `MOCK_*` fallbacks and the app looks broken.

1. **gamificationService** (#1, #3, #4, #5, #6) → unlocks dashboard, progress, rewards, quiz XP, leaderboard, daily rewards, achievements
2. **chatService** (#2) → unlocks chat persistence, tutor memory (#26)
3. **notificationService** (#12) → unlocks notifications screen, push token flow
4. **settingsService** (#13) → unlocks settings persistence, theme
5. **authService.createProfile** (#16) + **profile update whitelist** (#17) → unlocks correct signup & profile edits

**Wave 1 must complete fully before Wave 2 begins.** Screen rewrites in Wave 2 are mechanically simpler once the services return real data.

---

## Wave 1 — Foundation Services (must run in parallel)

| # | Task | Files | Category | Skills | Acceptance |
|---|------|-------|----------|--------|-----------|
| 1.1 | Rewrite `mobile/services/gamificationService.ts` to mirror `src/services/gamificationService.ts` (434 lines) | `mobile/services/gamificationService.ts`, `mobile/types/rewards.ts` | `deep` | `test-driven-development` | `addXP('uid', 50, 'lesson_complete')` writes `users/uid.currentXP`, `users/uid.totalXP`, `xpActivities/{id}`; `getLeaderboard()` returns Firestore rows; `claimDailyReward('uid', 0)` runs `runTransaction` on `users/uid/dailyRewards/uid` |
| 1.2 | Port `src/config/achievements.ts` (560 lines, 40 achievements) + `src/services/achievementCheckerService.ts` to mobile | `mobile/config/achievements.ts` (NEW), `mobile/services/achievementCheckerService.ts` (NEW) | `deep` | `test-driven-development` | Loading `useGamificationStore` after `addXP` triggers `checkAchievements`; `achievements` array populates from `achievements/{uid}` |
| 1.3 | Port `src/services/dailyRewardService.ts` (332 lines) + `src/data/rewardCatalog.ts` to mobile | `mobile/services/dailyRewardService.ts` (NEW), `mobile/data/rewardCatalog.ts` (NEW) | `deep` | `test-driven-development` | 7-day grid renders randomized weekly rewards from Firestore; claim persists; streak shield protects; multiplier activates; PHT timezone (`Asia/Manila`) |
| 1.4 | Rewrite `mobile/services/chatService.ts`: persist sessions + messages to Firestore | `mobile/services/chatService.ts`, `mobile/stores/useChatStore.ts` | `deep` | `test-driven-development` | `createSession()` writes `chatSessions/{id}`; `sendMessage()` writes `chatMessages/{id}` linked to session; `listSessions()` queries `chatSessions where userId == uid AND isActive == true` ordered by `updatedAt desc`; `getSessionMessages()` returns messages; reload app → sessions + messages restored |
| 1.5 | Rewrite `mobile/services/notificationService.ts` + `useNotificationStore` to subscribe to Firestore | `mobile/services/notificationService.ts`, `mobile/stores/useNotificationStore.ts` | `deep` | `test-driven-development` | `subscribeToUserNotifications(uid)` returns unsubscribe fn; `onSnapshot` on `notifications/{userId}/items`; mark-read/mark-all-read/delete all write to Firestore; cross-role types supported |
| 1.6 | Port `src/services/settingsService.ts` (310 lines) to mobile + create `useSettingsStore` | `mobile/services/settingsService.ts` (NEW), `mobile/stores/useSettingsStore.ts` (NEW) | `deep` | `test-driven-development` | `upsertUserSettings(uid, partial)` merges into `users/{uid}/settings/preferences`; `loadUserSettings(uid)` hydrates Zustand on auth; toggles survive app restart; account export; reauth helper |
| 1.7 | Fix `useGamificationStore` level formula + add Firestore-backed actions | `mobile/stores/useGamificationStore.ts` | `quick` | — | `level = computeLevel(totalXP)` using `floor(100 * 1.5^(L-1))` cumulative; `addXP` writes through service; `claimDailyReward` calls service; `refreshLeaderboard` populates from service |
| 1.8 | Add role-specific field defaults to `mobile/services/authService.createProfile` + implement `updateUserProfile` with whitelist | `mobile/services/authService.ts` | `deep` | `security-review` | Student signup writes `level: 1, currentXP: 0, totalXP: 0, hasTakenDiagnostic: false, iarAssessmentState: 'not_started', startingQuarterG11: 'Q1', recommendedPace: 'normal'`. Teacher writes `teacherId, students: []`. Admin writes `adminId`. `updateUserProfile` enforces key whitelist (base + role-specific); validates `avatarLayers` shape; writes `users/{uid}` with merge |
| 1.9 | Create `mobile/services/riskService.ts` port of `src/services/riskService.ts` | `mobile/services/riskService.ts` (NEW) | `quick` | — | `computeWRI(75, 80, 85, { w1: 0.30, w2: 0.40, w3: 0.30 })` returns `{ wri: 80.00, riskStatus: 'watch' }`; `getStudentRiskProfile(uid)` reads from Firestore; `updateStudentRiskProfile(uid, profile)` writes; batch + local-fallback supported |

**Parallelization:** Tasks 1.1–1.9 are all independent (each touches a different service file + a config/types file). Run all 9 in parallel.

**Verification gate after Wave 1:**
- `npx tsc --noEmit` from `mobile/` returns 0 errors
- `useGamificationStore.getState().level` at 250 XP = 3 (not 2)
- `chatService.listSessions()` returns at least the seeded session after creating one
- `notificationService.subscribeToUserNotifications(uid)` returns a function

---

## Wave 2 — Screen Consumers (run in parallel after Wave 1)

| # | Task | Files | Category | Skills | Acceptance |
|---|------|-------|----------|--------|-----------|
| 2.1 | Replace `MOCK_WEEKLY` + `MOCK_LEADERS` in `app/(student)/rewards.tsx` with real service calls | `mobile/app/(student)/rewards.tsx` | `visual-engineering` | `frontend-design` | On mount: `loadDailyRewards()` + `getLeaderboard()`. Claim button calls `claimDailyReward`. Leaderboard subscribes to `subscribeToLeaderboard`. No `MOCK_*` imports remain |
| 2.2 | Add weekly XP chart + streak card to `app/(student)/progress.tsx` | `mobile/app/(student)/progress.tsx` | `visual-engineering` | `frontend-design` | Bar chart for Mon–Sun aggregated from `xpActivities`. Streak card shows `currentStreak` + `longestStreak` from Firestore |
| 2.3 | Connect `app/(student)/dashboard.tsx` to real XP/level/streak/achievements data | `mobile/app/(student)/dashboard.tsx` | `visual-engineering` | `frontend-design` | XP/level from `useGamificationStore`. Achievements grid populated. Streak from Firestore. No MOCK |
| 2.4 | Implement `quizService.getQuizDetails` | `mobile/services/quizService.ts` | `quick` | — | `getQuizDetails('quiz-123')` returns full quiz with questions array; UI in `app/(student)/quiz/[id].tsx` renders question-by-question flow |
| 2.5 | Implement `teacherService.getTeachingTasks` + `app/(teacher)/tasks.tsx` rewrite | `mobile/services/teacherService.ts`, `mobile/app/(teacher)/tasks.tsx` | `deep` | `test-driven-development` | Real Firestore query for tasks assigned to teacher's classes; status filter works; overdue detection real; no MOCK fallback |
| 2.6 | Implement `app/(teacher)/student/[id].tsx` real data | `mobile/app/(teacher)/student/[id].tsx` | `visual-engineering` | `frontend-design` | `useEffect` calls `getStudents()` then fetches `users/{id}` + `studentDataService`; live XP, scores, risk, flagged topics; Carlo Mendoza MOCK removed |
| 2.7 | Rewrite `app/grades.tsx` to use real grade service | `mobile/app/grades.tsx`, `mobile/services/gradesService.ts` (NEW) | `visual-engineering` | `frontend-design` | Per-term grade breakdown from Firestore or `/api/grades/`; school-year selector; GWA computed; hardcoded array removed |
| 2.8 | Rewrite `app/notifications.tsx` to consume Firestore subscription | `mobile/app/notifications.tsx` | `visual-engineering` | `frontend-design` | List subscribes via `subscribeToUserNotifications(uid)`; mark-read calls service; new notifications appear in real-time |
| 2.9 | Rewrite `app/settings.tsx` to use `useSettingsStore` | `mobile/app/settings.tsx` | `visual-engineering` | `frontend-design` | Toggles call `upsertUserSettings`; on mount hydrate from `loadUserSettings(uid)`; changes survive restart; appearance cache prevents flash |
| 2.10 | Wire `app/check-in.tsx` to real backend + XP write | `mobile/app/check-in.tsx`, `mobile/services/checkInService.ts` (NEW) | `quick` | — | Submit writes to `checkIns/{id}`; calls `addXP(10, 'check_in')`; data visible to teacher insights |
| 2.11 | Wire `app/(student)/chat.tsx` to load sessions from Firestore on mount | `mobile/app/(student)/chat.tsx` | `visual-engineering` | `frontend-design` | `useEffect(() => listSessions(), [uid])` populates session list; selecting a session loads its messages; reload preserves state |

**Parallelization:** Tasks 2.1–2.11 are independent. Run all 11 in parallel.

**Verification gate after Wave 2:**
- tsc clean
- Manual smoke: student logs in, sees real XP, can claim daily reward, opens chat (sessions persist after app restart), views progress chart, sees real notifications, changes a setting (persists), submits check-in (+10 XP visible)
- Manual smoke: teacher logs in, sees real students, opens a student detail (real data), views tasks (real), no Carlo Mendoza
- Manual smoke: student views grades (real data, not hardcoded)

---

## Wave 3 — Polish (run in parallel)

| # | Task | Files | Category | Skills | Acceptance |
|---|------|-------|----------|--------|-----------|
| 3.1 | Add `react-native-katex` math rendering to chat + quiz | `mobile/app/(student)/chat.tsx`, `mobile/app/(student)/quiz/[id].tsx`, `mobile/components/MathText.tsx` (NEW) | `visual-engineering` | `frontend-design` | `x^2 + 3x - 4` renders as superscript; LaTeX in messages renders via KaTeX; fallback to plain text on missing dep |
| 3.2 | Create `mobile/components/AppLoadingScreen.tsx` with animated logo | `mobile/components/AppLoadingScreen.tsx` (NEW), `mobile/app/index.tsx` | `visual-engineering` | `frontend-design` | Floating logo animation; fade-in card; Bot icon fallback; `accessibilityRole="status"`, `accessibilityLabel="Loading MathPulse"` |
| 3.3 | Add chat fallback responses + retry on SSE error | `mobile/stores/useChatStore.ts` | `quick` | — | SSE error → friendly message ("Sorry, I had trouble connecting. Try again?") with retry button. No stuck empty bot messages |
| 3.4 | Create `mobile/hooks/useDailyReward.ts` + `useProgress.ts` + `useNotifications.ts` (extract inline logic) | `mobile/hooks/*.ts` (3 NEW) | `quick` | `test-driven-development` | Each hook encapsulates its service calls; screens import from hooks; old inline logic removed |
| 3.5 | Improve `mobile/components/ErrorBoundary.tsx` with "Restart App" + crash reporting | `mobile/components/ErrorBoundary.tsx` | `quick` | — | "Restart App" button calls `Updates.reloadAsync()`; error details view; sendable crash report (Sentry-ready hook, no SDK yet) |

**Parallelization:** All 5 tasks independent. Run in parallel.

---

## Wave 4 — Quality (run in parallel)

| # | Task | Files | Category | Skills | Acceptance |
|---|------|-------|----------|--------|-----------|
| 4.1 | Add Jest + jest-expo + @testing-library/react-native infra + write 5 critical tests | `mobile/package.json`, `mobile/jest.config.js` (NEW), `mobile/__tests__/*.test.ts` (5 NEW) | `deep` | `test-driven-development` | `npm test` runs; covers `gamificationService.addXP`, `computeLevel` formula, `authService.createProfile` role defaults, `chatService.sendMessage`, `riskService.computeWRI` |
| 4.2 | Port `useModuleDifficulty` + `useExtraHints` hooks to mobile | `mobile/hooks/useModuleDifficulty.ts` (NEW), `mobile/hooks/useExtraHints.ts` (NEW) | `deep` | `test-driven-development` | After 3 wrong answers, difficulty drops; after 60s on a question, hint surfaces |
| 4.3 | Port `mobile/services/tutorMemoryService.ts` from `src/services/tutorNudgeService.ts` | `mobile/services/tutorMemoryService.ts` (NEW) | `deep` | `test-driven-development` | Reads/writes `users/{uid}/tutorMemory/{profile,sessions,working}/`; chat uses memory for context-aware follow-ups |

**Parallelization:** All 3 tasks independent. Run in parallel.

---

## Skipped (with justification)

- **#18 TanStack Query** — pattern parity, not functional parity. Mobile works fine with ad-hoc `useEffect`. Defer to V2.
- **#20 ErrorBoundary chunk-reload** — Vite/Webpack specific. Not applicable to RN. Replaced with Restart App button (3.5).
- **#26 Tutor memory** — addressed in 4.3 (split into separate quality task).

---

## Per-Subagent Skill Loading Cheatsheet

| Skill | When to load |
|-------|--------------|
| `test-driven-development` | Any new service/hook/store with testable logic |
| `frontend-design` | Any screen UI work (Wave 2 + Wave 3 UI) |
| `security-review` | `authService` write paths, profile update whitelist |
| `code-reviewer` | After Wave 1 (foundation), after Wave 2 (screens) |
| `context7` | New packages: `react-native-katex`, `jest-expo`, `react-native-reanimated` |
| `systematic-debugging` | If any tsc gate fails or smoke test fails |
| `verification-before-completion` | Every task before claiming done |

---

## Verification Strategy (per task)

1. **Pre-claim checklist:**
   - `npx tsc --noEmit` from `mobile/` returns 0 errors
   - Manual smoke against acceptance criteria
   - No `as any`, no `@ts-ignore`, no empty catch blocks
2. **Wave gate (after each wave):**
   - Full tsc clean
   - Manual smoke checklist per role (student/teacher/admin)
   - `lsp_diagnostics` on changed files
3. **Final review:**
   - `gitnexus_detect_changes` to confirm scope
   - `gitnexus_impact` for HIGH-risk symbols before commit
   - Ultrabrain review pass on Wave 1 + Wave 2 (foundation + screens)

---

## Honest Scope Assessment

- **27 gaps → 28 tasks (9 + 11 + 5 + 3)**
- **Estimated time per task:** 10–25 minutes for a focused subagent
- **Estimated wall-clock with parallelism:** ~2 hours of execution time, but realistically 6–10 hours of orchestration time
- **#1 (gamification) is the longest** — 400+ lines of port. May need 2 subagent passes.
- **#16 (auth role defaults) is the riskiest** — schema security. Mandatory `security-review` skill.
- **Manual QA cannot be done by AI** — the user must test on emulator/device after each wave.

---

## Critical Files Summary

**To read (mobile):**
- `mobile/lib/firebase.ts` (66 lines) — already has all imports
- `mobile/types/models.ts` (932 lines) — type source of truth
- `mobile/stores/useAuthStore.ts` — auth state
- `mobile/stores/useGamificationStore.ts` (53 lines) — to fix

**To read (web, port source):**
- `src/services/gamificationService.ts` (434 lines)
- `src/services/dailyRewardService.ts` (332 lines)
- `src/config/achievements.ts` (560 lines)
- `src/services/achievementCheckerService.ts`
- `src/services/chatService.ts` (197 lines)
- `src/services/notificationService.ts` (397 lines)
- `src/services/settingsService.ts` (310 lines)
- `src/services/riskService.ts` (240 lines)
- `src/data/rewardCatalog.ts`
- `src/services/authService.ts` (createProfile + updateUserProfile sections)
- `src/services/gradesService.ts`
- `src/services/taskService.ts`
- `src/hooks/useModuleDifficulty.ts`
- `src/hooks/useExtraHints.ts`
- `src/services/tutorNudgeService.ts`

**To create (mobile):**
- `mobile/services/notificationService.ts` (rewrite)
- `mobile/services/settingsService.ts` (NEW)
- `mobile/services/dailyRewardService.ts` (NEW)
- `mobile/services/achievementCheckerService.ts` (NEW)
- `mobile/services/riskService.ts` (NEW)
- `mobile/services/checkInService.ts` (NEW)
- `mobile/services/gradesService.ts` (NEW)
- `mobile/services/tutorMemoryService.ts` (NEW)
- `mobile/config/achievements.ts` (NEW)
- `mobile/data/rewardCatalog.ts` (NEW)
- `mobile/stores/useSettingsStore.ts` (NEW)
- `mobile/hooks/useDailyReward.ts` (NEW)
- `mobile/hooks/useProgress.ts` (NEW)
- `mobile/hooks/useNotifications.ts` (NEW)
- `mobile/hooks/useModuleDifficulty.ts` (NEW)
- `mobile/hooks/useExtraHints.ts` (NEW)
- `mobile/components/MathText.tsx` (NEW)
- `mobile/components/AppLoadingScreen.tsx` (NEW)
- `mobile/jest.config.js` (NEW)
- `mobile/__tests__/*.test.ts` (5 NEW)
