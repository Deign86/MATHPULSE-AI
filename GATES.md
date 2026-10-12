# Gates: admin analytics counts only current students

Scope: `getAnalyticsSummary` built learner KPIs from every `progress` doc. Read-only count on prod: 46 progress docs have quiz attempts, 41 of them belong to no `users` doc (deleted accounts), 5 to current students. The admin Analytics page showed "42 students with quiz activity (30D)" against 31 students total; quiz totals and average score used the same attempts.

- [x] G1: Attempts from progress docs of non-students / deleted accounts are excluded before range filtering
  CHECK: npx vitest run src/utils/__tests__/adminAnalyticsRange.test.ts 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: 3 passed (new keepCurrentLearners test failed first: "keepCurrentLearners is not a function")

- [x] G2: Full frontend suite, typecheck and anti-slop lint pass
  CHECK: npx tsc --noEmit 2>&1 && echo TSC_CLEAN
  EXPECT: TSC_CLEAN
  EVIDENCE: TSC_CLEAN; vitest Test Files 157 passed (157), Tests 1004 passed (1004); oxlint --quiet clean on changed files

Post-deploy check: admin Analytics "Active learners" <= total students.
