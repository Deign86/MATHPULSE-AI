# Gates: Open issues #211–#306 (root / integration)

Scope: all 11 lane branches merged into `fix/open-issues-211-306`, repo-level checks green, PR opened closing every issue.

- [x] G1: All 11 lane branches merged into the integration branch
  CHECK: git log --oneline main..HEAD --merges | wc -l
  EXPECT: /^\s*11\s*$/
  EVIDENCE: 11

- [x] G2: Every issue 211–306 is referenced by a `Fixes #n` line or an ABANDON line in a lane gates file
  CHECK: node scripts/check-issue-coverage.mjs
  EXPECT: covered 96/96
  EVIDENCE: covered 96/96 (fixed 96, abandoned 0)

- [x] G3: Typecheck passes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: TSC_OK

- [x] G4: ESLint passes with zero warnings
  CHECK: npx eslint src --ext .ts,.tsx --max-warnings=0 && echo ESLINT_OK
  EXPECT: ESLINT_OK
  EVIDENCE: ESLINT_OK (exit 0, --max-warnings=0; only a Node DEP0060 deprecation notice on stderr)

- [x] G5: Anti-slop oxlint passes
  CHECK: npx oxlint --quiet && echo OX_OK
  EXPECT: OX_OK
  EVIDENCE: OX_OK (exit 0; only a Node MODULE_TYPELESS_PACKAGE_JSON notice on stderr)

- [x] G6: Frontend unit tests pass
  CHECK: npx vitest run
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Test Files 134 passed (134) | Tests 605 passed (605)

- [x] G7: Backend tests pass
  CHECK: python -m pytest backend/tests -q --tb=short
  EXPECT: /passed/
  EVIDENCE: 601 passed, 2 warnings (vectorstore files mutated by the run were restored with git checkout)

- [x] G8: Production build succeeds
  CHECK: set "VITE_API_URL=/api" && npm run build && echo BUILD_OK
  EXPECT: BUILD_OK
  EVIDENCE: BUILD_OK with VITE_API_URL=/api (vite build + prod-host + demo-creds checks passed; only the existing chunk-size warning)

- [x] G9: No e2e test for a fixed issue still carries the known-bug tag (manual: cross-check lane reports)
  EVIDENCE: `grep -rn known-bug tests/e2e` -> only student/leaderboard.e2e.ts:154 (skipped 'failed leaderboard load' test; not one of #211-#306) plus two doc lines in tests/e2e/codemap.md. main had 65 tagged sites.

Publication (push + PR closing every issue) needs a commit to exist, so it cannot run inside the pre-commit hook; it is tracked in the `PLAN.md` status log.

---

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
ABANDON: line91 authenticated E2E cannot run because `npx e2e list` found 15 student/teacher/admin flows but no `E2E_USER_{STUDENT,TEACHER,ADMIN}_{USERNAME,PASSWORD}` credentials are configured in the environment or `.env.local`. The issue audit above separately verified deterministic browser flows and authenticated quiz reads.

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
