# Gates: e2e 0.19 upgrade, visual regression suite, full-suite bug sweep

Scope: bump `e2e`/`@e2e-dev/web` to the latest tester-army releases, add `toHaveScreenshot` visual tests, run the full e2e suite, fix the bugs and regressions it finds. No test deletes an existing account.

- [x] G1: e2e runner is 0.19.0
  CHECK: npx e2e --version
  EXPECT: 0.19.0
  EVIDENCE: 0.19.0 (@e2e-dev/web 0.14.0)

- [x] G2: Visual suite is collected
  CHECK: npx e2e list --tag visual
  EXPECT: Reset password form (phone)
  EVIDENCE: 6 visual tests (sign in, Create Account, Reset password × desktop/phone)

- [x] G3: Visual suite passes against committed baselines (no --update-snapshots)
  EVIDENCE: 2026-10-10 rerun (.e2e/rerun3.log): tests/e2e/visual/visual.e2e.ts 6 passed, compared against visual.e2e.ts-snapshots/*-web-win32.png. Signed-in screens excluded: runner withholds pixels from password-fill sessions (POLICY_DENIED).

- [x] G4: Full e2e suite run completed and every failure triaged
  EVIDENCE: full run 1: 221 passed / 128 failed; full run 2: 310 passed / 33 failed / 58 skipped (401). Every failing file re-run after fixes: rerun3 133 passed / 3 failed; rerun4 rag-lesson 5/5; rerun5 quiz 5 passed / 1 skipped. Causes: onboarding-guide modal in saved sessions, recreated e2e accounts (student diagnostic re-taken through the product), login copy, GuideReplayCard duplicate button names, Quiz Bank delete confirm, PIXEL_TAINTED vision assert, stale /api/rag/lesson mock, Vite reloads on non-frontend edits, plus app bugs fixed (PDF fallback Go back covered by sidebar, quiz results modal clipping, analysis-context 403 for students, audit logger returned None, diagnostic analysis truncated at 1500 tokens, reasoner lesson overflowing 8192 tokens, retired DeepSeek model ids).

- [x] G5: Typecheck passes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: TSC_OK

- [x] G6: Anti-slop oxlint passes
  CHECK: npx oxlint --quiet && echo OX_OK
  EXPECT: OX_OK
  EVIDENCE: OX_OK

- [x] G7: Frontend unit tests pass
  EVIDENCE: npm test -- --run: 852/855 with 3 timeouts while the e2e suite loaded the machine; all 3 files re-run alone pass (AssessmentResultsModal, MicroLessonDeck, quizService 12/12). LessonViewer 15/15 and QuizExperience 10/10 after the last edits.

- [x] G8: Backend tests pass
  EVIDENCE: python -m pytest tests (backend/, after all edits): 713 passed, 0 failed.
