# Acceptance Gates

## Definitive issue closure audit — 2026-10-07

- [x] Issue #207: assigned quizzes remain accessible and discoverable; stale records cannot hide usable work, while real load failures remain retryable.
  CHECK: npm test -- --run src/services/__tests__/quizService.test.ts src/components/ModulesPage.test.tsx src/components/PracticeCenter.test.tsx --maxWorkers=2
  EXPECT: Focused quiz service and Recommended/deep-link regressions pass, including existing assignment permissions.
  EVIDENCE: Focused quiz/ModulesPage/PracticeCenter run passed 29 tests; corrected ModulesPage snapshot fixture then passed all 11 tests. Backfill offline tests passed 3/3. Live additive repair updated 7 quiz documents; authenticated client reads verified 6 active students could read 9 pending assignments under deployed rules. Remaining stale records reference deleted accounts or quizzes and were not broadened into grants.
- [x] Issue #208: step-scoped practice and assessment require answers and checking before completion; step transitions never reuse another step's questions.
  CHECK: npm test -- --run src/components/ModuleStepGuide.test.tsx src/services/interventionService.test.ts --maxWorkers=2
  EXPECT: Regression tests prove generation/retry, selectable answers, feedback, completion blocking, and safe transitions.
  EVIDENCE: Guide/interventionService passed 15 tests; parent integration passed 11 tests, including free exit, reopen/resume, wrong-answer submission and all-step Finish gating. Two browser tests passed against the real guide component with a deterministic generation boundary, including direct-final navigation.
- [x] Full frontend regression, typecheck, lint, anti-slop, and production build pass.
  EXPECT: Every command exits zero; existing warnings are recorded accurately.
  EVIDENCE: Full frontend run passed 129 files / 581 tests; final fixture correction separately passed 11/11 and typecheck plus scoped ESLint/Oxlint. Full ESLint, anti-slop and production build exited 0. Backend pre-deploy passed and pytest passed 598 tests. Functions build/test passed 72 tests with 7 emulator-only skips; lint had zero errors and two existing axios warnings. Build retained existing chunk-size/import warnings.
- [x] Independent review resolves all material findings and the gate ledger verifies completion.
  EXPECT: Reviewer findings resolved; gate checker reports this section met.
  EVIDENCE: Independent GPT-6 Luna review found no actionable material findings; all four prior findings were resolved (global Finish guard, submitted-count progress, single-step counter, Auth-validated recipient backfill). Gate checker and whitespace check run before commit.
Publication, CI, and issue disposition are tracked separately in `.slim/deepwork/issue-207-208-delivery.md`; they require a published commit and cannot run inside the pre-commit hook.

## Post-fix main regression sweep — 2026-10-07

- [x] Current `main`/working-tree state is captured before regression testing, including all source files under test.
  CHECK: git status --short --branch; git diff --name-only
  EXPECT: The tested source state is explicit and no unrelated generated test artifacts are mistaken for product changes.
  EVIDENCE: Tested `main` at `a705070` with the existing regression-fix working tree; backend pytest-mutated vectorstore files were restored afterward and the temporary emulator config was removed.

- [x] Frontend regression suite and static/build checks pass on the current working tree.
  CHECK: npm test -- --run; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop
  EXPECT: All tests pass with zero type/lint/anti-slop errors.
  EVIDENCE: Full Vitest suite passed 127 files / 551 tests; typecheck, ESLint, anti-slop, and production build with `VITE_API_URL=/api` all exited 0; production host/demo-credential checks passed.

- [x] Backend and Firebase Functions regression suites pass.
  EXPECT: Backend pre-deploy + pytest and Functions lint/build/test exit 0, allowing only documented skips/warnings.
  EVIDENCE: Backend pre-deploy passed and pytest passed 598 tests; Functions lint/build/test passed with 72 pass / 7 emulator-only skips, then the CI-equivalent Firestore+RTDB emulator run passed all 79/79 tests with zero skips/failures.

- [x] Every locally changed product behavior has direct regression coverage, with new tests added for any uncovered confirmed contract.
  EVIDENCE: Focused App, HeroBanner, ModulesPage, ProfileModal, QuizExperience, TeacherCalendarView, and AdminSubjects regression run passed 7 files / 27 tests; no additional uncovered confirmed contract was found in this sweep.

- [ ] User-facing functional coverage is exercised through available E2E/flow tests; any credential- or emulator-dependent gap is stated precisely.
  EVIDENCE: `npx e2e list` succeeded; environment/.env.local credential-name checks returned no configured E2E user credentials.
ABANDON: line40 authenticated E2E cannot run because `npx e2e list` found 15 student/teacher/admin flows but no `E2E_USER_{STUDENT,TEACHER,ADMIN}_{USERNAME,PASSWORD}` credentials are configured in the environment or `.env.local`. The issue audit above separately verified deterministic browser flows and authenticated quiz reads.

- [x] Final diff is clean of generated test artifacts and the gate ledger is complete.
  CHECK: git diff --check; node .agents/skills/unlazy/scripts/gate-check.mjs GATES.md --status
  EXPECT: No whitespace errors; this sweep's gates contain recorded evidence.
  EVIDENCE: Final verification runs are recorded above; generated vectorstore mutations and `.codex-firebase-emulators.json` were removed before final diff review.

- [x] The exact three most recent merged PRs on `main`, their merge order, changed files, and overlapping files are verified against GitHub and refreshed git refs.
  CHECK: git fetch origin --prune; git log origin/main --first-parent --oneline -12
  EXPECT: The top three PR merge commits are identified and match the investigation scope.
  EVIDENCE: `git fetch origin --prune` + first-parent log confirmed #204 (`a705070`), #206 (`bbfcd3a`), then #197 (`b8e1988`); changed-file counts are 7, 4, and 39 respectively.

- [x] Every file changed by PRs #204, #206, and #197 is covered by merge-surface review, with shared files traced through the final `main` behavior.
  EVIDENCE: Reviewed the three merge diffs and final `main`; `src/App.tsx` is shared by all three, and `src/components/assessment/AssessmentResultsModal.tsx` is shared by #197/#204. #206 profile-save behavior remains present after #204.

- [x] Every regression fixed in this task has a reproduced failing check or concrete broken-contract proof before the implementation change, plus regression coverage afterward.
  EVIDENCE: Red/green coverage exists for assessment CTA routing, HeroBanner dismissal persistence, quiz persistence ownership, ProfileModal failed-save editing, TeacherCalendar save state, Admin Subjects locked totals, and Admin Subjects realtime reconciliation.

- [x] Targeted tests for all touched/fixed behavior pass after the fixes.
  EVIDENCE: Combined regression files passed earlier (21/21), TeacherCalendar passed 4/4, and final focused `AdminSubjects.test.tsx` + `App.test.tsx` run passed 4/4.

- [x] Frontend CI-equivalent checks pass.
  CHECK: npm test -- --run; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0 with zero test failures and zero lint/typecheck/anti-slop errors.
  EVIDENCE: Final suite 127 files / 551 tests passed; `npm run typecheck`, ESLint with zero warnings, anti-slop, and production build with `VITE_API_URL=/api` exited 0. Build host/demo-credential checks passed.

- [x] Backend CI-equivalent checks pass.
  CHECK: python backend/pre_deploy_check.py; Push-Location backend; $env:PYTHONPATH=(Get-Location).Path; python -X utf8 -m pytest tests/ -q --tb=short; Pop-Location
  EXPECT: Pre-deploy check and backend test suite exit 0 with zero failures.
  EVIDENCE: `python -X utf8 backend/pre_deploy_check.py` passed; backend pytest passed 598 tests with 2 dependency warnings. Four test-mutated tracked vectorstore files were restored afterward.

- [x] Firebase Functions checks pass.
  CHECK: Push-Location functions; npm run lint; npm run build; npm test; Pop-Location
  EXPECT: Lint/build/tests exit 0; only documented pre-existing warnings are acceptable.
  EVIDENCE: Functions lint exited 0 with the 2 documented axios warnings, build exited 0, and tests reported 72 passed / 7 emulator-dependent skipped / 0 failed.

- [x] Final diff review shows only evidence-backed fixes/tests plus task ledger updates, and the Unlazy gate checker reports a complete ledger.
  CHECK: node .agents/skills/unlazy/scripts/gate-check.mjs GATES.md --status
  EXPECT: All gates are checked and no EVIDENCE line remains pending.
  EVIDENCE: `git diff --check` exited 0; temporary build helper was removed; Unlazy status reports `ALL MET (40 met, 2 abandoned)` across the root and existing lane ledgers.

## Main regression verification — 2026-10-07 follow-up

- [x] Confirm the tested checkout is current `main` and record pre-existing working-tree changes.
  CHECK: git status --short --branch
  EXPECT: Branch is `main`; any pre-existing changes are identified before verification.
  EVIDENCE: `HEAD` and `origin/main` both resolve to `78c388bd4fd9125c818793e5e44af54d0941203c`; the only pre-existing untracked item is `.slim/`. `GATES.md` is modified only for this verification ledger.

- [x] Run the complete frontend verification set prescribed by `TESTING.md` and repo instructions.
  CHECK: npm test -- --run; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0 with zero test failures and zero type/lint/anti-slop errors.
  EVIDENCE: Vitest passed 127 files / 551 tests; typecheck passed; ESLint passed with zero warnings; anti-slop exited 0 with 434 warnings / 0 errors; production build passed with `VITE_API_URL=/api`; `npm run check:models` and `npm run validate:pwa` also passed.

- [x] Run the complete backend regression verification prescribed by `TESTING.md`.
  EXPECT: Backend pre-deploy check and pytest suite exit 0 with zero failures, allowing documented warnings only.
  EVIDENCE: `python -X utf8 backend/pre_deploy_check.py` passed; backend pytest completed 598/598 tests with 2 dependency warnings and zero failures.

- [x] Run Firebase Functions lint, build, and regression tests, including emulator-backed tests when locally supported.
  EXPECT: Functions checks exit 0; emulator-only skips are either exercised successfully or stated precisely.
  EVIDENCE: Functions lint passed with the 2 documented axios warnings; build passed; normal test run passed 72 with 7 emulator-only skips. A local Firestore+RTDB emulator run then passed all 79/79 tests with zero skips/failures using temporary alternate Firestore port 8088 because Steam occupied 8080; temporary emulator config/processes were removed afterward.

- [x] Investigate test coverage gaps against high-risk and recently changed production surfaces without adding speculative tests.
  EVIDENCE: Current `HEAD` changed production files all have paired regression tests. Broader gaps remain: `src/contexts/ChatContext.tsx` is 1329 lines and its two consumer tests do not directly exercise `sendMessage`, session create/delete, or retry behavior; `src/services/progressService.ts` is 720 lines while its direct unit test covers only `calculateLatestAttemptAverage` (2 tests), leaving Firestore-writing progress methods covered mostly indirectly. The repo has 15 E2E specs, but `TESTING.md` marks E2E manual-only with no CI job, and no required E2E role credentials were configured locally. No coverage-threshold tooling was found in package/backend CI configuration.

- [x] Recheck the working tree after tests and restore only test-generated mutations, preserving pre-existing user files.
  CHECK: git status --short --branch
  EXPECT: No new unexplained product changes or generated test artifacts remain.
  EVIDENCE: Four backend vectorstore files mutated by pytest were restored to `HEAD`; temporary Firebase emulator files/processes were removed. Final expected state is `GATES.md` modified for this ledger plus pre-existing untracked `.slim/` only.

- [x] Complete the Unlazy ledger with fresh evidence from this verification run.
  CHECK: node .agents/skills/unlazy/scripts/gate-check.mjs GATES.md --status
  EXPECT: This follow-up section has no unchecked gate or pending evidence.
  EVIDENCE: `git diff --check` exited 0; final status shows only `GATES.md` plus pre-existing `.slim/`; gate checker reports `ALL MET (52 met, 3 abandoned)` across the root and existing lane ledgers.

## GitHub Actions parallel-step optimization — 2026-10-07

- [x] Use GitHub Actions native `parallel` only for workflow steps that are independent and share no required intermediate outputs.
  EVIDENCE: `.github/workflows/ci.yml` now groups independent frontend model/type/lint/anti-slop checks, frontend test/build work, post-build PWA validators, and Functions lint/build/tool setup. `deploy-frontend.yml` parallelizes only the two read-only build validators; `deploy-functions.yml` overlaps lint with `npm test`, whose script already performs the required TypeScript build.

- [x] Preserve dependency ordering for build artifacts, emulator tests, deployments, and backend checks with shared mutable state.
  EVIDENCE: Install steps remain barriers before parallel work; PWA validators and uploads remain after the build barrier; Functions emulator tests remain after build/Java/Firebase CLI setup; deploy jobs still require validation. Backend validation/tests and Android debug/release builds were intentionally left sequential because they can touch shared mutable state/output directories.

- [x] Validate all changed workflow YAML and inspect the final diff for accidental behavior changes.
  CHECK: git diff --check
  EXPECT: No whitespace errors; changed workflow files remain valid YAML and preserve required dependency order.
  EVIDENCE: Prettier parsed all three changed workflow YAML files successfully; `git diff --check` exited 0. Functions lint passed with 0 errors / 2 existing warnings, TypeScript build passed, normal tests passed 72 with 7 emulator-only skips, and the exact no-rebuild emulator test command passed 79/79 using temporary Firestore port 8088 because local port 8080 is occupied. The temporary emulator config was removed. Root `npm run lint:anti-slop` also exited 0.

- [x] Complete the Unlazy ledger with recorded evidence for this optimization.
  CHECK: node .agents/skills/unlazy/scripts/gate-check.mjs GATES.md --status
  EXPECT: This optimization section has no unchecked gate or pending evidence.
  EVIDENCE: Final gate checker exited 0 and reported `ALL MET (56 met, 3 abandoned)` across the root and existing lane ledgers.

## GitHub open-issue fixes — 2026-10-07

- [x] Confirm the repository's live open-issue set before implementation and again before completion.
  EXPECT: Every currently open GitHub issue in `Deign86/MATHPULSE-AI` is identified; any discrepancy with the requested count is recorded with fresh API evidence.
  EVIDENCE: GitHub search returned exactly issues #207 and #208 as open on 2026-10-07 before implementation; final live recheck is recorded below before push.

- [x] Reproduce or prove the root cause of each open issue from the current `main` code before changing behavior.
  EXPECT: The failing contract is demonstrated by a focused failing test or concrete code/rules evidence, and the fix targets the shared root cause.
  EVIDENCE: #207 was covered by focused pending-assignment and Recommended-view regressions; #208 was confirmed in `assignLearningPathAsModule` (`practice: []`) plus `ModuleStepGuide` rendering practice only when questions already existed.

- [x] Fix assigned-quiz loading so one stale/unreadable assignment cannot fail the whole list and valid assigned students can read their quiz reliably.
  EXPECT: Assignment writes and Firestore read rules agree on canonical student UID; pending-quiz loading tolerates stale/missing quiz records without masking valid assignments.
  EVIDENCE: `assignQuizToStudent` writes the student's Auth UID to both `quizAssignments.lrn` and `generatedQuizzes.recipientUids`; `fetchPendingQuizzesForStudent` settles quiz reads independently and keeps readable assignments when another read fails. Focused service regressions cover both contracts.

- [x] Make teacher-assigned quizzes discoverable from the student's Recommended/practice experience with an accurate empty state.
  EXPECT: Pending teacher assignments are surfaced from the Recommended path, and the empty state explains assessment-based recommendations when no diagnostic recommendations exist.
  EVIDENCE: `ModulesPage` and `PracticeCenter` regressions passed for assigned-section routing, Recommended teacher assignments, and the diagnostic-based empty state.

- [x] Add focused regression coverage for the confirmed failures and run it green after the fix.
  EXPECT: New/updated tests fail on the pre-fix contract and pass on the final implementation.
  EVIDENCE: Focused suite passed: `quizService.test.ts`, `ModulesPage.test.tsx`, `PracticeCenter.test.tsx`, and `ModuleStepGuide.test.tsx`; explicit coverage now includes assignment ownership/recipient writes, stale unreadable assignments, Recommended discovery, practice generation, assessment mastery generation, and retry recovery. Full Vitest passed 128 files / 558 tests.
- [x] Fix intervention module practice and assessment steps so students can launch real questions instead of seeing blank whitespace.
  EXPECT: Practice and assessment steps with no stored questions expose an on-demand generator, render valid returned questions in the existing step guide, and provide retry feedback on generation failure.
  EVIDENCE: `ModuleStepGuide` now generates step-scoped Practice/Mastery questions through the existing practice service, renders them in the current practice UI, and exposes retry feedback; separate practice, mastery-assessment, and retry regressions passed.

- [x] Run the required frontend static and regression checks for the touched surface.
  CHECK: npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop
  EXPECT: All commands exit 0 with zero type/lint/anti-slop errors.
  EVIDENCE: Typecheck and ESLint with zero warnings exited 0 after the final test additions; anti-slop exited 0 with 434 existing warnings / 0 errors; focused regressions passed; full Vitest passed 128 files / 558 tests; production build with `VITE_API_URL=/api` passed all release checks.

- [x] Review the final diff and complete the Unlazy ledger with fresh evidence.
  CHECK: git diff --check; node .agents/skills/unlazy/scripts/gate-check.mjs GATES.md --status
  EXPECT: No whitespace errors; this section has no pending evidence or unmet gate.
  EVIDENCE: `git diff --check` exited 0; the final gate checker reported `ALL MET (64 met, 3 abandoned)` across the root and existing lane ledgers.

## Student guided onboarding tour — 2026-10-07

- [x] TOUR1: First-use launch waits for assessment/dialog safety; dismissal is scoped to the student; replay remains available.
  CHECK: npm test -- src/hooks/useStudentTour.test.tsx
  EXPECT: passed
  EVIDENCE: 2026-10-08 `useStudentTour.test.tsx` passed 7/7 (safe-screen wait, per-student dismissal, Settings replay, identity guard, blocker close, external-dialog wait, blocked-storage session fallback, browser-history dismissal).

- [x] TOUR2: Spotlight navigation, Back/Continue/Skip/Finish, keyboard dismissal and missing-target recovery work.
  CHECK: npm test -- src/components/onboarding/GuidedTour.test.tsx
  EXPECT: passed
  EVIDENCE: 2026-10-08 focused run of GuidedTour, MobileBottomNav, QuizBattlePage and hook tour tests passed; full suite includes them (132 files / 566 tests).

- [x] TOUR3: Real browser walkthrough stays usable on phone, tablet, desktop and short landscape screens.
  CHECK: node tests/browser/student-tour-smoke.mjs
  EXPECT: PASS: student tour browser checks
  EVIDENCE: 2026-10-08 Edge run passed all 8 viewports (320x568, 390x844, 768x1024, 1440x900, 1920x1080, 844x390 landscape, dark/reduced-motion 375x667, large-text 320x568): 26 steps each, dialog in viewport, controls >=44px, one non-overlapping spotlight per step, focus trapped, replay + dismissal persistence, zero page errors. Visually inspected `small-phone-step-10.png`.

- [x] TOUR4: Frontend tests, typecheck, lint, anti-slop and production build pass.
  CHECK: npm test -- --run --maxWorkers=2; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0.
  EVIDENCE: 2026-10-08 Vitest 132 files / 566 tests passed; typecheck, ESLint (zero warnings), anti-slop and `VITE_API_URL=/api` build all exited 0; build host and demo-credential checks passed.

- [x] TOUR5: Reusable engine, student coverage, persistence and teacher/admin adoption are documented with verification evidence.
  EVIDENCE: `docs/student-onboarding-guide.md` covers engine contract, 26-step coverage, persistence/versioning, browser-history and password-edit protection, verification commands and the teacher/admin checklist; its dangling `student-onboarding-verification.md` reference now points to this ledger.

- [x] TOUR6: Quiz Battle previews cannot resume/start an existing session; ordinary battle use still resumes normally.
  CHECK: npm test -- src/components/QuizBattlePage.tour.test.tsx --maxWorkers=1
  EXPECT: passed
  EVIDENCE: 2026-10-08 `QuizBattlePage.tour.test.tsx` passed in the focused tour run and the full suite.

- [x] TOUR7: Browser Back/Forward ends the guide without rewriting the destination, and Settings replay cannot discard unsubmitted password text.
  CHECK: npm test -- src/hooks/useStudentTour.test.tsx src/components/SettingsPage.tour.test.tsx
  EXPECT: passed
  EVIDENCE: Both tests failed before the fix (tour stayed open after popstate; replay ignored password fields). After `useStudentTour` popstate dismissal, App tour-state reset on close, and `hasUnsavedEdits` in SettingsPage, hook 7/7 and Settings 3/3 passed.

- [ ] TOUR8: Signed-in walkthrough on a real student account (checklist in `docs/student-onboarding-guide.md`).
  EVIDENCE: pending
ABANDON: TOUR8 no `E2E_USER_STUDENT_*` credentials are configured locally; the browser fixture covers geometry/navigation but not account-specific content. Needs a manual run by the user.

## Student tour v2: feature spotlights, page guides, scroll control — 2026-10-08

- [x] TOUR9: Auto-opening page modals (Daily Check-In on Modules) never cover an active tour; they open after the tour closes, and the tour layers above every app overlay.
  CHECK: npm test -- src/components/ModulesPage.tour.test.tsx
  EXPECT: passed
  EVIDENCE: 2026-10-08 `ModulesPage.tour.test.tsx` 2/2: check-in absent while `tourActive`, opens after it ends; the test fails with the fix removed. Tour overlay/card raised to z-[100000]/[100001], above the highest app layer (z-[99999]).

- [x] TOUR10: Every page step spotlights the feature region it explains (no step targets a bare page heading), and every step selector exists as an anchor in production source.
  CHECK: npm test -- src/components/onboarding/studentTourSteps.test.ts
  EXPECT: passed
  EVIDENCE: 2026-10-08 `studentTourSteps.test.ts` 92/92: every selector maps to a production anchor, no step targets h1-h6, every page guide stays on its tab, first/last full-guide steps are non-optional. 52 new anchors added across 17 components.

- [x] TOUR11: Every major student-usable feature on each page has an explaining step; coverage table in `docs/student-onboarding-guide.md` matches the step config.
  EVIDENCE: Feature inventory of all 10 student pages (4 parallel code scans) mapped to 84 steps; coverage table in `docs/student-onboarding-guide.md` lists each anchor; 84 total / 8 optional / 76 for a new student matches the browser run.

- [x] TOUR12: A student can play a single page's guide from a header help button (current page) and from Settings (any page); it stays on that page and Finish/Skip return to it.
  CHECK: npm test -- src/hooks/useStudentTour.test.tsx src/components/SettingsPage.tour.test.tsx
  EXPECT: passed
  EVIDENCE: 2026-10-08 hook 8/8 (page start, full start) and Settings 4/4 (page-guide list calls onReplayTour(tab), full replay calls it with no tab, disabled with unsaved edits). Browser: all 10 page guides from Settings plus the header button on phone and desktop, each returning to Settings.

- [x] TOUR13: The tour scrolls each target into view, re-scrolls when a target drifts off-screen (including scroll that happened before launch), and the page cannot be scrolled or clicked by the student while the tour is open.
  CHECK: npm test -- src/components/onboarding/GuidedTour.test.tsx
  EXPECT: passed
  EVIDENCE: 2026-10-08 `GuidedTour.test.tsx` 6/6 incl. drift re-scroll (fails with scroll-once logic), priority fallbacks, optional skip both directions. Browser: page scrolled to the bottom before launch, spotlight present on every step; wheel over the page under the guide leaves scrollTop unchanged; every new target is aligned to the top (phone screenshots reviewed).

- [x] TOUR14: Browser smoke passes on all 8 viewports for the full guide and every page guide; screenshots reviewed.
  CHECK: node tests/browser/student-tour-smoke.mjs
  EXPECT: PASS: student tour browser checks
  EVIDENCE: 2026-10-08 Edge run passed all 8 viewports: 76 rendered steps each (8 optional skipped), dialog in viewport, controls >=44px, one spotlight per step, no avoidable overlap, focus trapped, replay + dismissal persistence, zero page errors; page guides on phone/desktop (Dashboard 11, Modules 12, Grades 6, AI Chat 3, Quiz Battle 12, Leaderboard 4, Avatar 5, Rewards 4, Profile 5, Settings 5). Reviewed phone/desktop/small-phone screenshots.

- [x] TOUR15: Frontend tests, typecheck, ESLint, anti-slop and production build pass.
  CHECK: npm test -- --run --maxWorkers=2; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0.
  EVIDENCE: 2026-10-08 Vitest 134 files / 665 tests passed; typecheck, ESLint (0 warnings), anti-slop and `VITE_API_URL=/api` build exited 0; build host and demo-credential checks passed.

- [x] TOUR16: Signed-in walkthrough of the full guide and every page guide in the real app with a student account.
  EVIDENCE: 2026-10-08 real app (dev server, Drew Hernandez student account signed in by the user in the browser pane), measured per step with a DOM harness (spotlight present, card/spotlight overlap, element under the spotlight, pinned-bar cover, header shift, cut-off text, 44px buttons). Final detailed passes: desktop 1440x900, tablet 768x1024 and phone 390x844 all clean (every highlight on its own feature, header never shifted, guide ends on the starting page). General 12-step guide clean on desktop/tablet/phone. Bugs found and fixed in this round: Daily Check-In timing, card jumping while pages load, oversized regions covered by the card, sticky Modules/Rewards bars and the floating Quiz Battle header covering features, phone Leaderboard pinned strip appearing after scroll, AI Chat list/conversation hidden on phones, early page-guide clicks ignored, scrollIntoView shifting the app shell (header pushed off screen), Rewards bar wrongly trimming the header highlight, hero speech bubble covering Continue Learning on phones, keyboard focus lost while a page loads or when chaining guides.

- [x] TOUR17: The first-use guide is general (one overview per page, 12 steps) and tells students that step-by-step help lives in each page guide; page guides keep the detailed steps.
  CHECK: npm test -- src/components/onboarding/studentTourSteps.test.ts
  EXPECT: passed
  EVIDENCE: 2026-10-08 `studentTourSteps.test.ts` 93/93 incl. general-guide shape test; real app general guide clean at 1440/768/390; browser smoke 12 steps at all 8 viewports.

- [x] TOUR18: Final student-side verification after the real-app fixes.
  CHECK: npm test -- --run --maxWorkers=2; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build; node tests/browser/student-tour-smoke.mjs
  EXPECT: All commands exit 0.
  EVIDENCE: 2026-10-08 Vitest 134 files / 671 tests; typecheck, ESLint (0 warnings), anti-slop, build all exit 0; browser smoke PASS on 8 viewports (general guide 12 steps; page guides Dashboard 11, Modules 12, Grades 6, AI Chat 3, Quiz Battle 12, Leaderboard 4, Avatar 5, Rewards 4, Profile 5, Settings 5 on phone and desktop; optional features omitted in fixture). New smoke assertion: no pinned bar covers a highlight.# Acceptance Gates

## Teacher onboarding — 2026-10-08

- [x] TEACH1: Teacher guide shares the engine and a role-scoped hook (separate first-use key per role); the student key is unchanged.
  CHECK: npm test -- src/hooks/useOnboardingTour.test.tsx
  EXPECT: passed
  EVIDENCE: 2026-10-08 `useOnboardingTour('student' | 'teacher' | 'admin', ...)`, key `mathpulse:<role>-tour:v1:<uid>`; hook tests 9/9 under the new name.

- [x] TEACH2: Teacher first-use guide is general (welcome + one overview per teacher page + page-guide pointer); detailed page guides cover every teacher view; every selector is anchored in production source; the Intervention Center is never opened by the guide.
  CHECK: npm test -- src/components/onboarding/teacherTourSteps.test.ts
  EXPECT: passed
  EVIDENCE: 2026-10-08 teacher config tests passed (all selectors anchored, no headings, pages stay on their view, no 'intervention' tab, 12-step general guide). 11 teacher pages, anchors added across TeacherDashboard, calendar, quiz maker, question bank, data import, notifications, competency, topic mastery, profile, ID card and settings.

- [x] TEACH3: Teacher can replay the full guide or any page guide from Teacher Settings (disabled with unsaved edits) and play the current page's guide from the header ? button.
  CHECK: npm test -- src/components/teacher/TeacherSettingsPage.tour.test.tsx
  EXPECT: passed
  EVIDENCE: 2026-10-08 TeacherSettingsPage tour tests 3/3; header page-guide button and settings props wired in TeacherDashboard.

- [x] TEACH4: Signed-in teacher walkthrough in the real app (desktop, tablet, phone): every highlight on its own feature, no overlap or covering bars, phone menus open for nav steps, guide ends on the starting view, and nothing is saved, sent, generated or assigned.
  EVIDENCE: 2026-10-08 real app, seeded teacher account signed in by the user: general guide (12 steps) and all 11 page guides measured per step on desktop 1440x900, tablet 768x1024 and phone 390x844; every highlight on its own feature, phone Teaching/Insights/AI Tools menus opened for nav steps, Skip/Finish returned to the starting page, only Continue/Finish/Skip were pressed. Fixed during the run: Profile/Settings overview targets (no header on those views), Competency ~10 s load (card waits up to 12 s with a "Loading this page..." indicator), Teacher Settings shrinking below its content (`shrink-0`) which hid the Save bar behind the tablet/phone bottom nav. Full suite re-run afterwards: 136 files / 738 tests, typecheck, ESLint, anti-slop, build, student smoke on 8 viewports all pass.

- [x] TEACH5: Full frontend checks pass after the teacher work.
  CHECK: npm test -- --run --maxWorkers=2; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0.
  EVIDENCE: 2026-10-08 Vitest 136 files / 738 tests; typecheck, ESLint (0 warnings), anti-slop, build exit 0; student browser smoke still PASS on all 8 viewports.

## Admin onboarding — 2026-10-08

- [x] ADMIN1: Admin general guide (welcome + one overview per admin page + page-guide pointer) and detailed page guides for all 11 admin tabs; every selector anchored in production source; every page guide on a real ADMIN_TABS id.
  CHECK: npm test -- src/components/onboarding/adminTourSteps.test.ts
  EXPECT: passed
  EVIDENCE: 2026-10-08 admin config tests passed; anchors added across AdminDashboard (Overview, header), Sidebar (data-tour-nav for all roles), AdminMobileBottomNav, User/Class Management, Curriculum Control, Content, RAG Manager, Analytics, AI Monitoring, Audit Log, Profile, Settings.

- [x] ADMIN2: Admin can play the current page's guide from the header ? button and replay the full guide or any page guide from Admin Settings (disabled with unsaved edits, password text, saving or maintenance saving); phone submenus open for nav steps; Overview rows and Content tabs are revealed read-only while explained.
  CHECK: npm test -- src/components/admin/AdminSettingsPage.tour.test.tsx
  EXPECT: passed
  EVIDENCE: 2026-10-08 AdminSettingsPage tour tests passed; total guide-related suite 249/249; typecheck, ESLint, anti-slop clean.

- [x] ADMIN3: Signed-in admin walkthrough in the real app (desktop, tablet, phone): every highlight on its own feature, no overlap or covering bars, guides return to the starting page, and nothing is created, edited, deleted, assigned, uploaded, rebuilt, toggled or exported.
  EVIDENCE: 2026-10-08 real app, seeded admin account signed in by the user: first-use launch verified (admin "seen" flag cleared, guide opened ~3 s after load); general guide (13 steps) and all 11 page guides measured per step on desktop 1440x900, tablet 768x1024 and phone 390x844. Every highlight landed on its own feature; Manage/AI/Curriculum/Insights phone menus opened for nav steps; Overview rows and Content Upload/Inventory were revealed while explained; every guide returned to Admin Settings; only Continue/Finish/Skip were pressed. Admin pages reordered to follow the sidebar groups. Note: below lg the RAG subject picker sits inside the details column, so the "Subject details" highlight includes it (page layout, not a guide defect).

- [x] ADMIN4: Full frontend checks pass after the admin work.
  CHECK: npm test -- --run --maxWorkers=2; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0.
  EVIDENCE: 2026-10-08 Vitest 138 files / 802 tests; typecheck, ESLint (0 warnings), anti-slop, build (host + demo-credential checks) exit 0; student browser smoke PASS on all 8 viewports.

## Main integration (origin/main a1e5e7d + onboarding e5263a1) — 2026-10-08

- [x] INT1: Onboarding commit applied on top of `origin/main` `a1e5e7d` (PR #209); the two expected conflicts are resolved by keeping main's behaviour: the "Assigned by your teacher" section stays where main moved it (above the tab content for Practice and Recommended) and carries `data-tour="assigned-quizzes"`; GATES.md keeps both sides.
  CHECK: git grep -c "data-tour" -- src/components/ModulesPage.tsx
  EXPECT: ModulesPage.tsx:8
  EVIDENCE: `git cherry-pick --no-commit e5263a1` conflicted only in `src/components/ModulesPage.tsx` and `GATES.md`; `PracticeCenter.tsx` auto-merged with its `practice-*` anchors intact. ModulesPage keeps all 8 anchor lines (same count as the branch: module-search, module-tab-*, module-focus, assigned-quizzes, teacher-modules, module-grid, recommended-modules, data-tour-sticky) plus `tourActive`/`tourView`, `MODULES_TABS`, `tabBeforeTour` and `isOpen={showDailyCheckIn && !tourActive}`.

- [x] INT2: The student Modules guide describes main's layout: assigned quizzes appear at the top of both Practice and Recommended.
  CHECK: npm test -- --run src/components/onboarding/studentTourSteps.test.ts src/components/ModulesPage.tour.test.tsx --maxWorkers=2
  EXPECT: passed
  EVIDENCE: `studentTourSteps.ts` "Assigned by your teacher" now reads "Quizzes your teacher assigned appear at the top of Practice and Recommended…"; the step keeps `view: 'practice'`, where the section renders. Covered by the full run below (studentTourSteps + ModulesPage tour/regression/unit tests all pass).

- [x] INT3: Full frontend checks pass on the integrated tree.
  CHECK: npm test -- --run --maxWorkers=2; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0.
  EVIDENCE: 2026-10-08 Vitest 140 files / 832 tests passed (354 s); typecheck, ESLint `--max-warnings=0` and anti-slop exit 0; `VITE_API_URL=/api npm run build` exit 0 with check-api-url, check-prod-host and check-no-demo-creds PASS; `node tests/browser/student-tour-smoke.mjs` PASS on all 8 viewports. Worktree installed with `npm ci --legacy-peer-deps` (same as CI; plain `npm ci` fails on the @capacitor-firebase/firebase peer range). The real-app Modules guide re-run is tracked in the responsiveness section (needs a student sign-in).

## Page guide confirmation — 2026-10-08

Scope (user request): the header **?** button ("Guide for this page") asks before it plays a guide: "Play the <page> guide?" with **Play guide** and **Skip**. Student, teacher and admin headers share one component. The Settings guide list still starts guides directly, because a named guide is already chosen there.

- [x] PGC1: Clicking the header ? button opens a confirmation titled "Play the <page> guide?" ("Play the full <role> guide?" on a page without its own guide) with Play guide and Skip. Play guide starts that guide; Skip and Escape close the dialog without starting it.
  CHECK: npm test -- --run src/components/onboarding/PageGuideConfirm.test.tsx --maxWorkers=2
  EXPECT: passed
  EVIDENCE: CHECK passed: 1 file, 4 tests (`PageGuideConfirm.test.tsx`): nothing shows until ? is pressed; the dialog names the page guide and plays only from Play guide; Skip and Escape close it without playing and return focus to the ? button; pages without their own guide get the full-guide wording.

- [x] PGC2: Real app (student, teacher, admin): the confirmation names the current page's guide; Play guide starts it with focus inside the guide card; Skip leaves the page as it was; the dialog fits 320x568 and 844x390, and its buttons are at least 44px on touch.
  EVIDENCE: Real app on the onboarding-only build (dev server 5174). Student Modules at 320x568 with touch: the dialog (288x258) fits, Skip and Play guide are 44px tall, Skip returns focus to ?, and Play guide starts the 13-step Modules guide with focus in its card. At 844x390 the dialog (384x178) fits. Teacher Dashboard ("Play the Dashboard guide?", 9-step guide) and admin Overview ("Play the Overview guide?", 13 steps) pass at pane size. The same component also passed on the responsiveness tree at 390x844, 320x568, 844x390 and 1440x900 for all three roles.

- [x] PGC3: The browser fixture's header button uses the same confirmation, and the smoke test covers Play guide and Skip.
  CHECK: node tests/browser/student-tour-smoke.mjs
  EXPECT: PASS: student tour browser checks
  EVIDENCE: `node tests/browser/student-tour-smoke.mjs` PASS on all 8 viewports. The header-button check now asserts the "Play the Settings guide?" question, that Skip starts nothing, and that Play guide starts the Settings guide with focus inside it.

- [x] PGC4: Full frontend checks pass after the change.
  CHECK: npm test -- --run --maxWorkers=2; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0.
  EVIDENCE: Onboarding branch: Vitest 141 files / 836 tests passed; typecheck, `npm run lint -- --max-warnings=0` and anti-slop exit 0; `$env:VITE_API_URL='/api'; npm run build` exit 0 (check-api-url, check-prod-host and check-no-demo-creds PASS).

- [x] PGC5: The student, teacher and admin onboarding guides and the onboarding codemap describe the confirmation.
  EVIDENCE: `docs/student-onboarding-guide.md` (page guides and the file table), `docs/teacher-onboarding-guide.md`, `docs/admin-onboarding-guide.md` and `src/components/onboarding/codemap.md` describe the question, its two buttons and the focus handling.

## Topic Mastery guide view — 2026-10-08

Found in the teacher layout check: when Topic Mastery was left on its Module Availability tab (also where Data Import's Go to Modules lands), the Topic Mastery guide's filter, totals and topic steps had nothing to highlight, because those parts render only on the Mastery Matrix tab.

- [x] TMV1: Every Topic Mastery guide step asks for the Mastery Matrix view (`view: 'mastery'`); the teacher dashboard switches Topic Mastery to that tab while such a step is open and restores the teacher's tab when the guide ends (same pattern as the student Modules guide).
  CHECK: npm test -- --run src/components/onboarding/teacherTourSteps.test.ts --maxWorkers=2
  EXPECT: passed
  EVIDENCE: The new test failed first (`expected [ undefined, … ] to deeply equal [ 'mastery', … ]`), then passed after the change: 1 file, 65 tests. `TeacherDashboard` remembers the tab in a ref while `view: 'mastery'` steps are open and restores it when the guide closes, like `ModulesPage`'s `tabBeforeTour`. Typecheck, ESLint and oxlint exit 0.

- [x] TMV2: Real app: with Module Availability left open, the Topic Mastery guide highlights the tabs, filters, totals and topics (4 of 4 steps spotlighted) at 390x844 with touch and at 1440x900, and Module Availability is open again after the guide.
  EVIDENCE: Onboarding-only build (dev server 5174), seeded teacher account. Module Availability opened first (filters, totals and topics not rendered), then ? → "Play the Topic Mastery guide?" → Play guide. 390x844 with touch: steps 1–4 highlighted mastery-tabs, the class-section filter, mastery-kpis and mastery-topics with the Mastery Matrix tab active; after Finish the page was still Topic Mastery with Module Availability active. 1440x900: the same four highlights, none covered by the card, and Module Availability restored after Finish and after Skip at step 2. Before the fix the same 390x844 run showed steps 2–4 with no highlight.

- [x] TMV3: Full frontend checks pass after the change.
  CHECK: npm test -- --run --maxWorkers=2; npm run typecheck; npm run lint -- --max-warnings=0; npm run lint:anti-slop; npm run build
  EXPECT: All commands exit 0.
  EVIDENCE: Onboarding branch: Vitest 141 files / 837 tests passed (316 s); typecheck, `npm run lint -- --max-warnings=0` and anti-slop exit 0; `$env:VITE_API_URL='/api'; npm run build` exit 0 (check-api-url, check-prod-host and check-no-demo-creds PASS).

- [x] TMV4: `docs/teacher-onboarding-guide.md` says the Topic Mastery guide opens the Mastery Matrix tab.
  CHECK: git grep -c "Mastery Matrix tab" -- docs/teacher-onboarding-guide.md
  EXPECT: docs/teacher-onboarding-guide.md:1
  EVIDENCE: CHECK printed `docs/teacher-onboarding-guide.md:1`. The coverage row explains the `view: 'mastery'` steps and the switch back; the Files row lists the Topic Mastery tab handling in `TeacherDashboard.tsx`.
