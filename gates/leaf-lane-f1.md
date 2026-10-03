# Gates: Lane F1 Student Hub E2E

Scope: Pin Quiz Battle regression locators and add student gamification/dashboard coverage.

- [x] F1-1: Quiz Battle regression uses role-narrowed pins for signed-in Dashboard and Quiz Battle outcomes
  CHECK: git diff -- tests/e2e/regression/quiz-battle.e2e.ts
  EXPECT: /getByRole\('button', 'Dashboard'\)|getByRole\('heading', 'Quiz Battle'\)/
  EVIDENCE: full-suite run: tests/e2e/regression/quiz-battle.e2e.ts 1 passed in 123.46s, no INVALID_CONFIG.
- [x] F1-2: Student gamification test (at most two tests) covers dashboard streak/XP, daily check-in, avatar studio, leaderboard, grades, and competency radar
  CHECK: git diff -- tests/e2e/student/gamification.e2e.ts
  EXPECT: /streak|XP|check.?in|reward|avatar|leaderboard|grades|competency/i
  EVIDENCE: sequential --workers 1 rerun: tests/e2e/student/gamification.e2e.ts 2/2 passed.
- [x] F1-3: Static e2e listing discovers both student-hub files without INVALID_CONFIG
  CHECK: npx e2e list --reporter json
  EXPECT: /quiz-battle\.e2e\.ts|gamification\.e2e\.ts/
  EVIDENCE: list output discovered 15/15 tests including both files with disposition run, no INVALID_CONFIG.
- [x] F1-4: This lane changes only the scoped e2e tests and lane gate; unrelated concurrent workspace changes are not part of this lane
  CHECK: git status --short
  EXPECT: /tests\/e2e|gates\/leaf-lane-f1\.md/
  EVIDENCE: lane paths are tests/e2e/regression/quiz-battle.e2e.ts (modified), tests/e2e/student/gamification.e2e.ts (new), gates/leaf-lane-f1.md; no src/backend/functions edits by this lane.
