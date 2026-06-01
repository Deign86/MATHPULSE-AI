# MathPulse AI — Parity Differences: Web vs Mobile

> **Generated:** 2026-06-01  
> **Source-of-truth branch:** `mobile/waves-0-8-mvp` (commit `3f1ed97`)  
> **Web:** `src/` — React 18 + Vite + Firestore + TanStack Query  
> **Mobile:** `mobile/` — Expo SDK 56 + RN 0.85 + Zustand  
> **Backend:** FastAPI at `https://deign86-mathpulse-api-v3test.hf.space`

---

## CRITICAL (Service subsystem completely non-functional)

### #1 CRITICAL: gamificationService — XP, Leaderboard, Daily Rewards, Achievements (all stubbed)

- **File(s) affected**: `mobile/services/gamificationService.ts` (28 lines, all stubs)
- **Web behavior**: `src/services/gamificationService.ts` (434 lines) provides:
  - `awardXP()` — writes to Firestore `users/{uid}` (increments `currentXP`, `totalXP`, recalculates `level` via exponential scale), logs to `xpActivities/{id}` (lines 22–100)
  - `getLeaderboard()` — queries Firestore `leaderboard` collection, ordered by `totalXP` desc, capped at `limitCount` (lines 106–146)
  - `subscribeToLeaderboard()` — real-time `onSnapshot` listener (lines 147–173)
  - `getUserRank()` — counts users with role=student and higher `totalXP` (lines 176–196)
  - `getXPActivities()` — queries `xpActivities` where `userId == uid`, ordered by timestamp (lines 199–218)
  - `checkAchievements()` — evaluates 40 achievements via `achievementCheckerService`, awards XP, persists to `achievements/{uid}` (lines 221–261)
  - `getUserAchievements()` — reads `achievements/{uid}` (lines 264–277)
  - `purchaseAvatarItem()` — deducts `currentXP`, adds to `ownedAvatarItems`, logs activity (lines 280–328)
- **Mobile behavior**: All methods are console.warn stubs returning safe defaults:
  - `addXP()` → `{ newTotal: 0, leveledUp: false }` (line 11)
  - `getLeaderboard()` → `[]` (line 18)
  - `claimDailyReward()` → `{ reward: null, claimed: false }` (line 27)
- **What needs to change**: Rewrite `mobile/services/gamificationService.ts` to call the same Firestore paths as web (via Firebase JS SDK). Use `firebase/firestore` imports from `mobile/lib/firebase.ts`. Mirror the web's `awardXP`, `getLeaderboard`, `getUserRank`, `getXPActivities`, `checkAchievements`, `getUserAchievements`, `purchaseAvatarItem`. Target the same collections: `users/{uid}`, `xpActivities/`, `leaderboard/`, `achievements/{uid}`.
- **Acceptance criteria**: Calling `addXP('uid', 100, 'lesson_complete', 'Test')` writes to `users/uid.currentXP` and `xpActivities/{id}` in Firestore. Calling `getLeaderboard()` returns real data from the `leaderboard` collection.

---

### #2 CRITICAL: chatService — Sessions lost on app restart (no Firestore persistence)

- **File(s) affected**: `mobile/services/chatService.ts` (108 lines)
- **Web behavior**: `src/services/chatService.ts` (197 lines) persists to Firestore:
  - `createChatSession()` — writes to `chatSessions/{id}` with `serverTimestamp()` (lines 18–45)
  - `getUserChatSessions()` — queries `chatSessions` where `userId == uid` and `isActive == true`, ordered by `updatedAt` desc (lines 48–70)
  - `addMessageToSession()` — writes to `chatMessages/{id}`, links to session (lines 93–140)
  - Sessions survive restarts, page reloads, and multi-device.
- **Mobile behavior**: 
  - `createSession()` (line 8) — returns in-memory object with `id = session-${Date.now()}`, never writes to Firestore
  - `sendMessage()` (line 21) — returns in-memory object with `id = msg-${Date.now()}`, never persists
  - `listSessions()` (line 40) — returns `[]` always
  - `getSessionMessages()` (line 34) — returns `[]` always
  - All session state is in Zustand `useChatStore` — lost on app restart
- **What needs to change**: Rewrite `mobile/services/chatService.ts` to use Firestore (imported from `mobile/lib/firebase.ts`). Mirror web's Firestore operations: write sessions to `chatSessions/{id}`, messages to `chatMessages/{id}`. Implement `createChatSession`, `getUserChatSessions`, `addMessageToSession`. Update `useChatStore` to hydrate from Firestore at mount and persist writes.
- **Acceptance criteria**: Creating a chat session, sending messages, closing the app, reopening — messages are restored from Firestore.

---

### #3 CRITICAL: XP calculation rules mismatch — Linear vs Exponential level formula

- **File(s) affected**: `mobile/stores/useGamificationStore.ts` line 39
- **Web behavior**: `src/services/gamificationService.ts` lines 49–65 use exponential cumulative scale:
  ```
  sumRequired = sum over i=1..level of floor(100 * 1.5^(i-1))
  Level 2: 100 Total XP, Level 3: 250, Level 4: 475, Level 5: 812, ...
  ```
  Level is determined by **lifetime `totalXP`**, not `currentXP`. Also documented in `current_xp_system.md` lines 133–141.
- **Mobile behavior**: `mobile/stores/useGamificationStore.ts` line 39:
  ```ts
  level: Math.floor((state.xp + amount) / 100) + 1,
  ```
  Linear formula. Every 100 XP = +1 level. Ignores totalXP vs currentXP distinction.
- **What needs to change**: Remove linear formula from `useGamificationStore`. Implement the exponential cumulative formula from web in `gamificationService.ts` (mirror lines 49–65 from web). Level should be based on **lifetime `totalXP`** from Firestore `users/{uid}.totalXP`, not `currentXP`.
- **Acceptance criteria**: At 250 total XP, level = 3. At 475 total XP, level = 4. At 812 total XP, level = 5. Spending `currentXP` on avatar items does not change level.

---

### #4 CRITICAL: Leaderboard — MOCK only (no Firestore)

- **File(s) affected**: `mobile/services/gamificationService.ts` line 14–18, `mobile/app/(student)/rewards.tsx` lines 37–48
- **Web behavior**: Real-time Firestore. `src/services/gamificationService.ts` `subscribeToLeaderboard()` (lines 147–173) uses `onSnapshot` on `leaderboard` collection ordered by `totalXP` desc.
- **Mobile behavior**: 
  - `getLeaderboard()` in `mobile/services/gamificationService.ts` returns `[]` (line 18)
  - `mobile/app/(student)/rewards.tsx` line 75 initializes leaders to `MOCK_LEADERS` (10 hardcoded entries, lines 37–48)
  - `useGamificationStore.refreshLeaderboard()` (line 48–49 in store) just sets `isLoading: true` — does nothing
- **What needs to change**: Implement real `getLeaderboard()` in `mobile/services/gamificationService.ts` that queries Firestore `leaderboard` collection. Update `rewards.tsx` to fetch from the service instead of using MOCK_LEADERS. Add `subscribeToLeaderboard` for real-time updates.
- **Acceptance criteria**: Leaderboard tab shows real user data from `leaderboard` collection, updates in real-time via onSnapshot.

---

### #5 CRITICAL: Daily rewards — MOCK only (no backend)

- **File(s) affected**: `mobile/services/gamificationService.ts` line 21–27, `mobile/app/(student)/rewards.tsx` lines 27–35
- **Web behavior**: `src/services/dailyRewardService.ts` (332 lines) uses Firestore `users/{uid}/dailyRewards/{uid}` subcollection. Features:
  - 7-day reward grid with randomized weekly rewards from `rewardCatalog`
  - Streak system with streak shields (one free skip)
  - PHT timezone (`Asia/Manila`)
  - Transaction-safe claims via `runTransaction`
  - Active multipliers (1.5x/2x XP for N minutes)
  - Milestone streaks (7/14/30/60/100 days)
  - Coin/hint tokens tracking
- **Mobile behavior**: 
  - `claimDailyReward()` returns `{ reward: null, claimed: false }` (line 27)
  - Rewards screen uses `MOCK_WEEKLY` (lines 27–35): 7 hardcoded static rewards
  - Daily claim uses optimistic local state only (rewards.tsx lines 93–118): tries API, falls back to local
  - `useGamificationStore.claimDailyReward` just increments `dailyStreak` by 1 local-only
- **What needs to change**: Implement full daily reward service on mobile. Port `src/services/dailyRewardService.ts`, `src/data/rewardCatalog.ts`, and `src/types/rewards.ts` to mobile. Use the same Firestore subcollection path. Support streak shields, multipliers, PHT timezone, transactions.
- **Acceptance criteria**: Daily reward grid shows randomized weekly rewards from Firestore. Claiming persists to Firestore. Streak shield protects from streak break. Multiplier activates correctly.

---

### #6 CRITICAL: Achievements — Empty array (web has 40)

- **File(s) affected**: `mobile/stores/useGamificationStore.ts` line 30
- **Web behavior**: `src/config/achievements.ts` (560 lines) defines **40 achievements** across 5 categories (10 Learning, 10 Battle, 8 Mastery, 7 Exploration, 5 Social). `src/services/gamificationService.ts` `checkAchievements()` evaluates them via `achievementCheckerService.ts` and awards XP on unlock. Persisted to `achievements/{uid}`.
- **Mobile behavior**: `mobile/stores/useGamificationStore.ts` line 30: `achievements: []`. No achievement config, no checker service, no unlock logic. The achievements array is never populated.
- **What needs to change**: Port `src/config/achievements.ts` to mobile. Port `src/services/achievementCheckerService.ts`. Wire achievement checking into the gamification store's `addXP` action. Implement `checkAchievements()` that reads from `achievements/{uid}` and evaluates progress against config.
- **Acceptance criteria**: After completing 1 lesson, the "First Steps" achievement (50 XP) unlocks. The achievements array is populated from Firestore on load.

---

## HIGH (Screen broken or always MOCK)

### #7 HIGH: getQuizDetails — returns null (quiz detail screen broken)

- **File(s) affected**: `mobile/services/quizService.ts` lines 51–54
- **Web behavior**: Quiz detail is fetched from the actual quiz data. Web has full quiz experience with question rendering, submission, scoring.
- **Mobile behavior**: `getQuizDetails()` always returns null with a console.warn (line 52). The quiz detail screen cannot display any quiz content.
- **What needs to change**: Implement `getQuizDetails()` with a real backend endpoint or Firestore query. Verify the backend has a `/api/quiz/{quizId}` endpoint. If not, implement client-side rendering from the quiz data already loaded via `getAvailableQuizzes`/`listQuizzes`.
- **Acceptance criteria**: Tapping a quiz from the list navigates to a detail screen that shows all quiz questions and options.

---

### #8 HIGH: getTeachingTasks — always empty (tasks screen shows MOCK only)

- **File(s) affected**: `mobile/services/teacherService.ts` lines 120–126
- **Web behavior**: Teacher tasks are populated from Firestore (via `taskService.ts`). Tasks have real assignments, submissions, due dates.
- **Mobile behavior**: `getTeachingTasks()` always returns `[]` with console.warn (line 124). `mobile/app/(teacher)/tasks.tsx` line 38 initializes tasks to `MOCK` (lines 10–16, 5 hardcoded entries). On refresh, tries the service but `catch(() => null)` falls through to keeping MOCK data (lines 42–53).
- **What needs to change**: Implement `getTeachingTasks()` with a Firestore query for teacher tasks. If no backend endpoint exists, query Firestore directly for tasks assigned to the teacher's classes. Remove MOCK fallback from screen (or gate behind dev-only flag).
- **Acceptance criteria**: Teacher tasks screen shows real assignments from Firestore, with live submission counts.

---

### #9 HIGH: progressService.getWeeklyXP + getStreakInfo — stubbed (progress screen missing charts)

- **File(s) affected**: `mobile/services/progressService.ts` lines 55–68
- **Web behavior**: Weekly XP data is aggregated from `xpActivities` collection (or via backend `/api/analytics/`). Streak info tracked in Firestore user profile. Progress screen shows XP chart and streak history.
- **Mobile behavior**: 
  - `getWeeklyXP()` returns `[]` with console.warn (line 59)
  - `getStreakInfo()` returns `null` with console.warn (line 67)
  - Progress screen (`mobile/app/(student)/progress.tsx`) shows only overall mastery and subject breakdown (from `getStudentProgress`), but no weekly XP chart or streak details
- **What needs to change**: Implement `getWeeklyXP()` to aggregate XP from `xpActivities` collection for current week (PHT), grouped by day. Implement `getStreakInfo()` to read from `users/{uid}.currentStreak` / `longestStreak` (or from `dailyRewards` subcollection). Update progress screen to render XP chart and streak card.
- **Acceptance criteria**: Progress screen shows a weekly XP bar/se chart with data points for each day. Streak card shows current streak and best streak.

---

### #10 HIGH: (teacher)/student/[id].tsx — always MOCK (no API call)

- **File(s) affected**: `mobile/app/(teacher)/student/[id].tsx` lines 31–52
- **Web behavior**: Student detail page fetches real student data from Firestore via `studentDataService.ts` / `studentService.ts`. Shows live assessment results, progress data, risk scores.
- **Mobile behavior**: `useState<StudentDetail>(MOCK)` (line 62). The MOCK object (lines 31–52) is hardcoded for "Carlo Mendoza". Refresh only does `setTimeout(resolve, 500)` with a comment "Real API call wires up when backend ready" (lines 66–68).
- **What needs to change**: Replace `useState(MOCK)` with a data-fetching hook that calls `getStudents()` from `teacherService` (already partially implemented for fetching student list) and fetches individual student detail from Firestore `users/{id}`. Use the `id` route parameter. Remove MOCK object.
- **Acceptance criteria**: Navigating to `/teacher/student/{actualUid}` shows that student's real profile data, scores, and risk information.

---

### #11 HIGH: grades.tsx — fully hardcoded

- **File(s) affected**: `mobile/app/grades.tsx` lines 16–20
- **Web behavior**: Grades page (`src/pages/Grades.tsx` equivalent or grade view) fetches real grades from Firestore via `gradesService.ts`. Shows per-student grades, GPA, term breakdown.
- **Mobile behavior**: `GRADES` array (lines 16–20) is hardcoded with 3 entries (Pre-Calculus, Business Math, Logic & Critical Thinking). No API call, no student-specific data, no term selection.
- **What needs to change**: Create mobile `gradesService.ts` that mirrors `src/services/gradesService.ts`. Fetch grades from Firestore or backend `/api/grades/` endpoint. Pass user identity from auth store. Add term/school year selector.
- **Acceptance criteria**: Grades screen shows the current user's actual grade data, fetched from Firestore, not hardcoded values.

---

### #12 HIGH: notifications.tsx — local state only (no Firestore subscription)

- **File(s) affected**: `mobile/app/notifications.tsx` lines 1–118
- **Web behavior**: `src/services/notificationService.ts` (397 lines) subscribes to Firestore `notifications/{userId}/items` via `onSnapshot`. Real-time updates. Supports mark-read, mark-all-read, delete, cross-role messaging (teacher → student, admin broadcast). Two collection paths: legacy `notifications/` and subcollection `notifications/{userId}/items/`.
- **Mobile behavior**: Uses `useNotificationStore` (local Zustand) only. No Firestore subscription. `onRefresh` (line 37–39) does `setTimeout(600)` — no data fetch. No cross-role notification support. The `notificationService.ts` only has `registerPushToken` (no fetch/list methods).
- **What needs to change**: Implement `subscribeToUserNotifications()` in `mobile/services/notificationService.ts` using `onSnapshot` on `notifications/{userId}/items`. Update `useNotificationStore` to sync from Firestore subscription. Implement mark-read, mark-all-read, delete. Port cross-role notification types.
- **Acceptance criteria**: Notifications appear in real-time when a notification is written to Firestore by the backend or another user.

---

### #13 HIGH: settings.tsx — useState only (lost on app restart)

- **File(s) affected**: `mobile/app/settings.tsx` lines 1–131
- **Web behavior**: `src/services/settingsService.ts` (310 lines) persists user settings to Firestore `users/{uid}/settings/preferences`. Reads on load, writes on change. Supports `mergeSettings` deep-merge, `resetUserSettingsToDefaults`, runtime CSS var application, localStorage appearance cache for flash-free loads, account export, reauthentication, email/password change.
- **Mobile behavior**: All settings use `useState()` (lines 7–16): `pushEnabled`, `achievementNotifs`, `quizNotifs`, `dailyRewardNotifs`, `assignmentNotifs`, `streakAlerts`, `emailNotifs`, `soundEnabled`, `darkMode`, `hapticsEnabled`. No Firestore persistence. All state lost on app restart.
- **What needs to change**: Port `src/services/settingsService.ts` to mobile. Use `mobile/lib/firebase.ts` for Firestore access. Wire settings load into `useAuthStore` or create a `useSettingsStore`. Map settings toggles to Firestore writes via `upsertUserSettings`.
- **Acceptance criteria**: Changing a setting persists to Firestore and survives app restart.

---

### #14 HIGH: check-in.tsx — local +10 XP only (no backend submission)

- **File(s) affected**: `mobile/app/check-in.tsx` lines 30–41
- **Web behavior**: Check-in submits mood + study duration + notes to backend/Firestore. XP is awarded server-authoritatively via `gamificationService.awardXP()`. Data is tracked for teacher insights.
- **Mobile behavior**: `handleSubmit()` (lines 30–41) just calls `addXP(10)` on the local Zustand store (no Firestore). Uses `setTimeout(600)` to simulate submission. No data persisted anywhere. No teacher analytics.
- **What needs to change**: Implement `checkInService.ts` on mobile that writes to Firestore (e.g., `checkIns/{id}` subcollection). Call `awardXP` after submission. Update the screen to use real service calls.
- **Acceptance criteria**: Submitting a check-in writes mood, duration, notes to Firestore and awards XP server-side.

---

## MEDIUM (Schema / Type / Pattern mismatches)

### #15 MEDIUM: StudentProfile field completeness

- **File(s) affected**: `mobile/types/models.ts` lines 39–135
- **Web behavior**: Web `src/types/models.ts` defines StudentProfile with ~50 fields including IAR assessment state (`iarAssessmentState`, `iarQuestionSetVersion`, `iarTopicClassifications`, `topicScores`), learning path (`learningPathState`, `recommendedPace`, `lastAssessmentType`, `initialAssessmentCompletedAt`, `remediationState`, `remediationStatusCounts`, `currentCurriculumVersionSetId`, `grade12TransitionGate`, `unlockCriteriaVersion`, `recommendedNextTopicGroupId`, `recommendationRationale`, `recommendationReasonCode`), risk fields (`riskFlags`, `riskClassifications`, `overallRisk`, `subjectBadges`), and G12 readiness (`g12ReadinessIndicators`).
- **Mobile behavior**: Mobile `types/models.ts` (932 lines) actually **has all those fields**. Both `iarAssessmentState` (lines 65–72), `iarTopicClassifications` (lines 74–77), `topicScores` (line 78), `g12ReadinessIndicators` (lines 83–89), `riskClassifications` (lines 92–97), `learningPathState` (line 100), `remediationState` (line 103), `remediationStatusCounts` (lines 104–111), `currentCurriculumVersionSetId` (line 112), `grade12TransitionGate` (lines 113–120) are all present. **This is a non-discrepancy** — mobile already has all 50+ fields.
- **What needs to change**: No change needed. The types are already in parity. Focus on populating these fields from Firestore at runtime (currently most screens show MOCK data).
- **Acceptance criteria**: Not applicable — types are already correct.

---

### #16 MEDIUM: Auth signup payload — role-specific fields

- **File(s) affected**: `mobile/services/authService.ts` lines 42–55, `src/services/authService.ts` lines 120–165
- **Web behavior**: `src/services/authService.ts` `createUserProfile()` (lines 120–165) writes role-specific fields on `users/{uid}`: student gets `lrn`, `grade`, `section`, `classSectionId`, `adviserTeacherId`, `adviserTeacherName`, `schoolYear`, `school`, `enrollmentDate`, `major`, `gpa`, `level: 1`, `currentXP: 0`, `totalXP: 0`, `atRiskSubjects: []`, `hasTakenDiagnostic: false`, `iarAssessmentState: 'not_started'`, `startingQuarterG11: 'Q1'`, `recommendedPace: 'normal'`. Teacher gets `teacherId`, `department`, `subject`, `yearsOfExperience`, `qualification`, `students: []`. Admin gets `adminId`, `position`, `department`.
- **Mobile behavior**: Mobile `createProfile()` (lines 42–55) writes `...base, role, ...extraFields` and merges into `users/{uid}`. However, the `signUp()` caller (line 57–68) passes `extraFields: Record<string, unknown> = {}` — it's entirely up to the caller what fields get written. The `extraFields` parameter is opaque; there's no enforced role-specific field set.
- **What needs to change**: Add role-specific field generation in `createProfile()` matching the web pattern. When role is `student`, default `level: 1, currentXP: 0, totalXP: 0, hasTakenDiagnostic: false, iarAssessmentState: 'not_started'`, etc. When teacher, add `teacherId`, `students: []`. When admin, add `adminId`.
- **Acceptance criteria**: New student signup creates a Firestore document with all expected fields: `currentXP: 0`, `totalXP: 0`, `level: 1`, `hasTakenDiagnostic: false`, `iarAssessmentState: 'not_started'`.

---

### #17 MEDIUM: Profile update whitelist — mobile accepts any partial

- **File(s) affected**: `mobile/stores/useAuthStore.ts` lines 77–91, `src/services/authService.ts` lines 212–248
- **Web behavior**: `src/services/authService.ts` `updateUserProfile()` (lines 212–248) enforces a strict key whitelist: `baseAllowed = ['name', 'email', 'phone', 'photo', 'avatarLayers', 'gender']` plus role-specific `roleAllowedMap[role]`. Any key not in the allowed set is silently dropped. Also validates `avatarLayers` shape (must have `top`, `bottom`, `shoes`, `accessory`). Writes to Firestore via `setDoc(docRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true })`.
- **Mobile behavior**: `useAuthStore.updateProfile()` (lines 77–91) is a pure client-side Zustand setter: `{ ...state.studentProfile, ...profile }`. Accepts ANY partial profile keys, no validation, no whitelist, no Firestore write. Only updates the local Zustand store — never persists.
- **What needs to change**: Implement mobile `updateUserProfile()` in `authService.ts` (or a new `profileService.ts`) that:
  1. Enforces the same key whitelist as web
  2. Validates `avatarLayers` shape
  3. Writes to Firestore `users/{uid}` with `{ merge: true, updatedAt: serverTimestamp() }`
  4. Updates the Zustand store after Firestore commit
- **Acceptance criteria**: Calling `updateProfile({ role: 'student', madeUpField: 'hack', grade: '12' })` only writes `grade` to Firestore and drops `madeUpField`.

---

### #18 MEDIUM: TanStack Query pattern — web vs mobile data fetching

- **File(s) affected**: `mobile/app/(student)/progress.tsx` lines 37–50, web uses `@tanstack/react-query`
- **Web behavior**: Web codebase uses TanStack Query (`@tanstack/react-query`) for server state management. Queries are configured with `staleTime`, `gcTime`, `refetchOnWindowFocus`, `retry`. Deduplication, caching, background refetching all automatic.
- **Mobile behavior**: Mobile screens use ad-hoc `useEffect` + `useCallback` patterns (e.g., `progress.tsx` lines 52–54). No caching or deduplication. Each navigation re-fetches from scratch.
- **What needs to change**: Low priority. This is a pattern difference, not a bug. Both approaches produce the same end result. If mobile gets larger and more complex, consider adding `@tanstack/react-query` for consistency. For now, document the difference but don't block on it.
- **Acceptance criteria**: Not applicable — pattern parity is not required for MVP.

---

## LOW (Minor polish / missing utilities)

### #19 LOW: Hooks/utils dirs missing on mobile — logic inline in screens

- **File(s) affected**: `mobile/hooks/` (empty), `mobile/utils/` (empty)
- **Web behavior**: `src/hooks/` has 16 files: `useUserSettings`, `useSubjectAvailability`, `useStudentRisk`, `usePushNotifications`, `useModuleProgress`, `useModuleDifficulty`, `useLessonContent`, `useInterventionVideos`, `useFeatureAccess`, `useExtraHints`, `useDailyReward`, `useCurriculum`, `useCompetencyMatrix`, `useAIMonitoring`, `useShsExcelImport`. `src/utils/` has utilities for risk engine, math scope, chat formatting, hint cache, and more.
- **Mobile behavior**: Both `mobile/hooks/` and `mobile/utils/` are empty directories (0 files). Business logic is inlined directly into screen components. No code reuse between screens.
- **What needs to change**: As services are ported (see items #1–#14), extract reusable logic into hooks. Start with `useDailyReward`, `useProgress`, `useNotifications`. Create utility functions for math rendering, hint tokens, PHT timezone helpers.
- **Acceptance criteria**: At least 3 hooks exist in `mobile/hooks/` and at least 3 utility files in `mobile/utils/`. Screens import from hooks instead of inlining logic.

---

### #20 LOW: ErrorBoundary — mobile lacks chunk-reload logic

- **File(s) affected**: `mobile/components/ErrorBoundary.tsx` (51 lines), `src/components/ErrorBoundary.tsx` (135 lines)
- **Web behavior**: Web ErrorBoundary (lines 13–21, 48–65) detects Vite/webpack chunk-load failures via regex patterns (`/Failed to fetch dynamically imported module/i`, `/Loading chunk \d+ failed/i`). On detection, auto-reloads the page once (gated by `sessionStorage` flag `mathpulse_chunk_reload_attempted`). Renders null briefly during reload.
- **Mobile behavior**: Mobile ErrorBoundary (51 lines) catches render errors and shows a simple "Something went wrong" fallback with a "Try Again" button that resets state (lines 31–33). No chunk-reload logic (not applicable to React Native). No sessionStorage flag.
- **What needs to change**: Chunk-reload logic is web-specific (Vite/Webpack) and does not apply to React Native. However, the mobile ErrorBoundary could be improved with:
  - Crash reporting (e.g., Sentry/Expo crash reporting)
  - A "Restart App" button (calls `Updates.reloadAsync()` for Expo)
  - Error details view for debugging
- **Acceptance criteria**: Error screen includes a "Restart App" button. Error details are displayed for debugging.

---

### #21 LOW: MathText/KaTeX — no math rendering in mobile chat

- **File(s) affected**: `mobile/app/(student)/chat.tsx` lines 91–138 (message rendering)
- **Web behavior**: `src/components/MathText.tsx` (99 lines) uses `react-markdown` + `remark-math` + `rehype-katex` to render inline math. Converts plain-text math notation (`x^2`, `(0.8)^h`, `a/b`) to LaTeX, then renders via KaTeX. Also `src/components/ChatMarkdown.tsx` for formatted chat messages with math.
- **Mobile behavior**: Chat messages render as plain `Text` components (lines 128–136). No math notation parsing, no KaTeX rendering. Math expressions like `x^2 + 3x - 4` display as raw text.
- **What needs to change**: Add math rendering to mobile chat. Options:
  - Use `react-native-math-view` or `react-native-katex` for inline math
  - Port `MathText.tsx` text-to-LaTeX conversion logic
  - Apply to both chat messages and quiz question display
- **Acceptance criteria**: In chat, `Solve for x in x^2 + 3x - 4 = 0` renders with properly formatted superscripts and mathematical notation.

---

### #22 LOW: No tests on mobile — web has Vitest suite

- **File(s) affected**: `mobile/` entire project (glob returned 0 test files)
- **Web behavior**: `src/` has 16+ test files using Vitest + React Testing Library. Includes tests for services (`dailyRewardService.test.ts`, `lessonQuizService.test.ts`, `huggingfaceMonitoringService.test.ts`, `profileImageService.test.ts`), hooks (`useDailyReward.test.ts`), utilities (`riskEngine.test.ts`, `mathScope.test.ts`, `chatPreview.test.ts`, `chatMessageFormatting.test.ts`), features (`notificationService.test.ts`, `notificationFirestoreService.test.ts`, import parser tests).
- **Mobile behavior**: Zero test files. No Jest/Vitest config for native testing. No React Native Testing Library setup.
- **What needs to change**: Add testing infrastructure:
  - Install `jest`, `@testing-library/react-native`, `jest-expo`
  - Configure in `package.json` or `jest.config.js`
  - Write tests for `gamificationService`, `authService`, `chatService`, `useAuthStore`, `useChatStore` as they are ported
- **Acceptance criteria**: At least 5 test files exist in mobile. Running `npm test` executes them. Critical service functions (XP calculation, level formula, auth signup) are covered.

---

### #23 LOW: AppLoadingScreen — mobile uses plain ActivityIndicator

- **File(s) affected**: `mobile/app/index.tsx` lines 28–32, `src/components/AppLoadingScreen.tsx`
- **Web behavior**: `src/components/AppLoadingScreen.tsx` (58 lines) uses `motion/react` (Framer Motion) for animated loading. Features: floating logo animation (`y: [0, -10, 0]`), fade-in card with `opacity: 0 → 1` and `scale: 0.9 → 1`, fallback to `Bot` icon if logo fails to load. ARIA attributes (`role="status"`, `aria-live="polite"`, `aria-busy="true"`).
- **Mobile behavior**: `mobile/app/index.tsx` renders a plain `<ActivityIndicator>` with indigo color (line 30). No logo, no animation, no branding.
- **What needs to change**: Create `mobile/components/AppLoadingScreen.tsx` with:
  - MathPulse logo (import from `mobile/assets/`)
  - Animated floating effect (React Native `Animated` API or `react-native-reanimated`)
  - Fallback to Bot icon if logo fails
  - Accessibility labels
- **Acceptance criteria**: App loading screen shows MathPulse logo with animation. Falls back gracefully if logo asset is missing.

---

### #24 LOW: Chat fallback responses / continuation repair

- **File(s) affected**: `mobile/stores/useChatStore.ts` lines 66–81, web chat context
- **Web behavior**: Web chat has fallback responses for common errors (empty response, network timeout). Continuation repair flow handles interrupted streams. Tutor nudge service (`src/services/tutorNudgeService.ts`) provides context-aware follow-ups.
- **Mobile behavior**: Chat store's `sendMessage()` (lines 39–82) handles errors by setting `error: err.message` and `isStreaming: false`. No fallback responses. No continuation repair. If SSE stream errors, the partial `placeholder` message stays in the chat with empty content.
- **What needs to change**: Add fallback responses in `sendMessage()` error handler: if stream fails, replace the placeholder with a friendly error message ("Sorry, I had trouble connecting. Please try again."). Add "Retry" button on failed messages. Add connection status indicator.
- **Acceptance criteria**: When SSE stream fails, user sees a friendly error message with a retry option, not a stuck loading state or empty bot message.

---

### #25 LOW: Module difficulty / extra hints hooks — no mobile equivalents

- **File(s) affected**: `mobile/hooks/` (empty), `src/hooks/useModuleDifficulty.ts`, `src/hooks/useExtraHints.ts`
- **Web behavior**: `src/hooks/useModuleDifficulty.ts` provides progressive difficulty adjustment based on student performance. `src/hooks/useExtraHints.ts` provides contextual hints when students are stuck on a problem for too long.
- **Mobile behavior**: No equivalent hooks exist. Mobile quiz/lesson screens show static content without adaptive difficulty or contextual hints.
- **What needs to change**: Port `useModuleDifficulty` and `useExtraHints` to mobile. These depend on student performance data in Firestore, so they need the gamification/progress services implemented first (items #1–#9).
- **Acceptance criteria**: Students receive easier questions after 3 consecutive wrong answers. Extra hints appear after 60 seconds on a question.

---

### #26 LOW: Tutor memory — no mobile equivalent

- **File(s) affected**: `mobile/services/` (no tutor memory), `src/services/tutorNudgeService.ts`
- **Web behavior**: Web stores tutor memory in Firestore subcollections at `users/{uid}/tutorMemory/{profile,sessions,working}/`. Tracks what topics the student has covered, struggling areas, and learning pace. Tutor nudge service provides proactive suggestions.
- **Mobile behavior**: No tutor memory service exists in `mobile/services/`. Chat state is ephemeral (see #2).
- **What needs to change**: After fixing chat persistence (#2), implement `mobile/services/tutorMemoryService.ts` that reads/writes to `users/{uid}/tutorMemory/` subcollections. Use this in chat to provide context-aware tutoring.
- **Acceptance criteria**: Returning to chat after a lesson, the tutor remembers the topic and asks a follow-up question.

---

### #27 LOW: WRI (Weighted Risk Index) — types exist but no computation

- **File(s) affected**: `mobile/types/models.ts` lines 898–931 (WRI types), `src/services/riskService.ts` (240 lines)
- **Web behavior**: `src/services/riskService.ts` implements full WRI computation:
  - Backend API at `/api/risk/compute` with 30s timeout (lines 117–142)
  - Local fallback with formula `WRI = floor((w1*D + w2*G + w3*P) * 100) / 100` (lines 153–175)
  - Default weights: w1=0.30 (diagnostic), w2=0.40 (external grades), w3=0.30 (system performance)
  - Risk status thresholds: ≥88 safe, ≥80 watch, ≥75 intervene, ≥68 critical, <68 at_risk
  - Batch computation (`computeWRIBatch`, lines 188–213)
  - `recalculateStudentWRI()` orchestrates fetch → compute → update
  - Writes to `managedStudents/{studentId}` with `riskHistory` array
- **Mobile behavior**: `mobile/types/models.ts` has comprehensive WRI type definitions:
  - `RiskHistoryEntry` (lines 900–905)
  - `WRIWeights` (lines 908–912)
  - `WRIBreakdown` (lines 915–919)
  - `StudentRiskProfile` (lines 922–931) with `wri`, `riskStatus`, `weights`, `diagnosticScore`, `externalGradesAvg`, `systemPerformanceAvg`, `riskHistory`, `riskRecalcNeeded`
  - But no risk computation service exists in mobile. No `riskService.ts` file.
- **What needs to change**: Port `src/services/riskService.ts` to `mobile/services/riskService.ts`. Implement `computeWRI()`, `getStudentRiskProfile()`, `updateStudentRiskProfile()`. The local computation fallback is pure math (no external deps) and should work identically on mobile.
- **Acceptance criteria**: Calling `computeWRI(75, 80, 85, { w1: 0.30, w2: 0.40, w3: 0.30 })` returns `wri ≈ 80.00` and `risk_status: 'watch'`. Result matches the web's local fallback output.

---

## Summary

| Severity | Count | Topics |
|----------|-------|--------|
| CRITICAL | 6 | gamificationService, chatService, XP formula, leaderboard, daily rewards, achievements |
| HIGH | 8 | quiz details, teaching tasks, weekly XP/streak, student detail, grades, notifications, settings, check-in |
| MEDIUM | 4 | StudentProfile types, auth signup, profile update whitelist, TanStack Query |
| LOW | 9 | hooks/utils, ErrorBoundary, math rendering, tests, loading screen, chat fallback, module difficulty, tutor memory, WRI |

**Total: 27 gaps documented.** The highest-impact items are #1 (gamificationService), #2 (chatService persistence), and #3 (XP formula), as these affect core user-facing features across all student screens.
