# Gates: red main backend CI and PR #325 conflicts

Scope: (1) main's "Backend checks" and "Validate backend" jobs fail on two `test_model_profiles.py` tests because `test_quiz_cap.py` and `test_quiz_battle.py` put a MagicMock `firebase_admin` into `sys.modules` at collection time, and pytest 9.2's monkeypatch undo now deletes `client` from that mock. Stop the leak. (2) PR #325 (`claude/responsiveness-optimization-4b76c0`) conflicts with main in 8 files; merge it into this branch keeping main's logic and the PR's layout/touch changes. No GitHub issues are open. `PY` is a Python 3.12 venv with `backend/requirements-dev.txt`; `tests/test_quiz_battle.py::TestPdfIngestion::test_ingest_pdf_force_reingest` is deselected locally because it downloads a Hugging Face model the sandbox proxy blocks (it passes in CI).

- [x] G1: Full backend suite passes on pytest 9.2
  CHECK: cd backend && PYTHONPATH=. $PY -m pytest --version 2>&1 && PYTHONPATH=. $PY -m pytest tests/ -q -p no:cacheprovider --deselect tests/test_quiz_battle.py::TestPdfIngestion::test_ingest_pdf_force_reingest 2>&1 | tail -1
  EXPECT: /pytest 9\.2\.\d[\s\S]*\d+ passed, 1 deselected in/
  EVIDENCE: pytest 9.2.0 | 1164 passed, 1 deselected in 77.56s (0:01:17)

- [x] G2: The two quiz modules still pass on their own, without the removed stubs
  CHECK: cd backend && PYTHONPATH=. $PY -m pytest tests/test_quiz_cap.py tests/test_quiz_battle.py -q -p no:cacheprovider --deselect tests/test_quiz_battle.py::TestPdfIngestion::test_ingest_pdf_force_reingest 2>&1 | tail -1
  EXPECT: /^\d+ passed, 1 deselected in/
  EVIDENCE: 12 passed, 1 deselected in 9.21s

- [x] G3: No backend test replaces firebase_admin in sys.modules
  CHECK: git grep -nE 'sys\.modules\["(firebase_admin|google\.cloud)' -- backend/tests || echo NO_SYS_MODULES_STUBS
  EXPECT: NO_SYS_MODULES_STUBS
  EVIDENCE: NO_SYS_MODULES_STUBS

- [x] G4: PR #325's head is merged into this branch
  CHECK: { git merge-base --is-ancestor b3341032bba348797bd780f746ae25ce4c083f44 HEAD || test "$(git rev-parse -q --verify MERGE_HEAD)" = b3341032bba348797bd780f746ae25ce4c083f44; } && echo PR325_MERGED
  EXPECT: PR325_MERGED
  EVIDENCE: PR325_MERGED

- [x] G5: No conflict markers remain
  CHECK: git grep -nE '^(<<<<<<<|>>>>>>>)( |$)' -- . ':!*.svg' || echo NO_MARKERS
  EXPECT: NO_MARKERS
  EVIDENCE: NO_MARKERS

- [x] G6: Main's logic survives in the resolved files (claimedDays dedupe and its 3 tests, isDayClaimed, shell overflow-clip, MathText question text, class-list skeleton, login bottom sheet)
  CHECK: { grep -c "state.claimedDays.includes(dayIndex)" src/services/dailyRewardService.ts; grep -c "it('does not duplicate a day index" src/services/__tests__/dailyRewardService.test.ts; grep -c "isDayClaimed(6)" src/components/DailyCheckInModal.tsx; grep -c "relative z-10 overflow-clip" src/App.tsx; grep -c "<MathText>{q.question}</MathText>" src/components/QuestionBankPanel.tsx; grep -c "<Skeleton key={row}" src/components/admin/AdminClassManagement.tsx; grep -c "rounded-t-\[28px\] sm:rounded-3xl" src/components/LoginPage.tsx; } | tr '\n' ' '
  EXPECT: 1 1 5 1 1 1 1 
  EVIDENCE: 1 1 5 1 1 1 1

- [x] G7: The PR's changes survive in the resolved files (check-in closes only via its X button: the backdrop has no onClose and the card no stopPropagation; wrapping question chips, KPI pills hidden under 360px, wrapping KPI labels, touch hit areas on the login page)
  CHECK: { grep -c "onClick={onClose}" src/components/DailyCheckInModal.tsx; grep -c "stopPropagation" src/components/DailyCheckInModal.tsx; grep -c 'flex flex-wrap items-center gap-2 mt-2' src/components/QuestionBankPanel.tsx; grep -c "max-\[359px\]:hidden" src/components/admin/AdminClassManagement.tsx; grep -c "leading-tight sm:truncate" src/components/admin/AdminClassManagement.tsx; grep -c "pointer-coarse:after:absolute" src/components/LoginPage.tsx; } | tr '\n' ' '
  EXPECT: 1 0 1 3 3 3 
  EVIDENCE: 1 0 1 3 3 3

- [x] G8: Frontend unit tests pass
  CHECK: npx vitest run 2>&1 | grep -E "^\s+Tests "
  EXPECT: /Tests\s+\d+ passed \(\d+\)/
  EVIDENCE: Tests  1019 passed (1019)

- [x] G9: TypeScript compiles
  CHECK: npm run typecheck >/dev/null 2>&1 && echo TYPECHECK_OK
  EXPECT: TYPECHECK_OK
  EVIDENCE: TYPECHECK_OK

- [x] G10: ESLint passes with no warnings
  CHECK: npm run lint -- --max-warnings=0 >/dev/null 2>&1 && echo ESLINT_OK
  EXPECT: ESLINT_OK
  EVIDENCE: ESLINT_OK

- [x] G11: Anti-slop oxlint passes
  CHECK: npm run lint:anti-slop >/dev/null 2>&1 && echo OXLINT_OK
  EXPECT: OXLINT_OK
  EVIDENCE: OXLINT_OK

- [x] G12: Production build succeeds
  CHECK: VITE_API_URL=/api npm run build >/dev/null 2>&1 && echo BUILD_OK
  EXPECT: BUILD_OK
  EVIDENCE: BUILD_OK

- [ ] G13: Branch pushed to origin/claude/cool-johnson-gynphk
  CHECK: git fetch -q origin claude/cool-johnson-gynphk && test "$(git rev-parse HEAD)" = "$(git rev-parse origin/claude/cool-johnson-gynphk)" && echo PUSHED
  EXPECT: PUSHED
  EVIDENCE: pending

ABANDON: G13 the repo's pre-commit hook blocks any commit while a gate is unmet, and a push can only follow the commit. The push is verified after committing (git rev-parse HEAD = origin/claude/cool-johnson-gynphk) and reported with the ledger.
