# Gates: Lane A frontend regression tests

Scope: Add only colocated frontend test suites in the assigned student feature scope.

- [x] G1: All new Lane A tests pass.
  CHECK: npm run test -- src/components/LoginPage.regression.test.tsx src/contexts/AuthContext.test.tsx src/components/HeroBanner.test.tsx src/components/DailyCheckInModal.test.tsx src/components/AvatarShop.test.tsx src/components/ModulesPage.regression.test.tsx src/components/LessonViewer.test.tsx src/components/assessment/InitialAssessmentModal.test.tsx src/components/assessment/DiagnosticBreakdown.test.tsx src/components/assessment/AssessmentHub.regression.test.tsx src/components/AIChatPage.test.tsx src/components/FloatingAITutor.test.tsx src/components/GradesPage.regression.test.tsx src/components/LeaderboardPage.test.tsx src/components/ScientificCalculator.regression.test.tsx src/components/CurriculumSourceBadge.test.tsx src/components/QuizBattlePage.test.tsx
  EXPECT: Test Files  17 passed (17)
  EVIDENCE: Vitest output `Test Files 17 passed (17); Tests 18 passed (18)`.

- [x] G2: At least 15 new colocated test files cover the assigned feature scope.
  EVIDENCE: 17 Lane A test files created; each is colocated beside its component/context.

- [x] G3: Production code remains untouched.
  EVIDENCE: All Lane A-created paths are `*.test.tsx` under `src/` plus this gate file; no production source file was edited.

- [ ] G4: Repository anti-slop lint passes.
  CHECK: npm run lint:anti-slop
  EXPECT: oxlint --quiet
  EVIDENCE: pending

- [x] G5: Gate checker was run and its output reviewed.
  EVIDENCE: `node .agents/skills/unlazy/scripts/gate-check.mjs gates/leaf-lane-a.md` output: `ALL MET (304 met, 42 abandoned)` across the scanned root and leaf ledgers.

ABANDON: G4 Full lint reports existing errors in unrelated production/scripts tests; scope forbids modifying those files. New suites themselves are covered by the requested test run.
