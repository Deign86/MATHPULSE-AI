# Acceptance Gates

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
ABANDON: line22 authenticated E2E cannot run because `npx e2e list` found 15 student/teacher/admin flows but no `E2E_USER_{STUDENT,TEACHER,ADMIN}_{USERNAME,PASSWORD}` credentials are configured in the environment or `.env.local`.

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
