# Acceptance Gates

- [x] Desktop sidebar is hidden when `isInQuizMode` is true.
  CHECK: npm test -- --run src/components/QuizBattlePage.test.tsx
  EXPECT: Tests pass verifying sidebar omission during active battle and quiz modes.
  EVIDENCE: `src/components/QuizBattlePage.test.tsx` (2 tests passed)

- [x] `QuizBattlePage` keeps `isInQuizMode` active for live matches (`ready`, `in_progress`, `completed`) until match exits.
  CHECK: npm test -- --run src/components/QuizBattlePage.test.tsx
  EXPECT: Match lifecycle correctly toggles `setIsInQuizMode`.
  EVIDENCE: Verified `isLiveMatch` includes `completed` and `QuizBattlePage` clean teardown on match exit.

- [x] All linting and anti-slop checks pass.
  CHECK: npm run lint:anti-slop && npm run typecheck
  EXPECT: 0 errors.
  EVIDENCE: `tsc --noEmit` exited 0; `oxlint --quiet` exited 0 (0 errors).
