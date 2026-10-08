# Gates: lane g

Scope: Quiz Battle and Leaderboard fixes for #276 #275 #232 #274 #234 #233 (QuizBattlePage, LeaderboardPage, e2e tags).

Decisions (data checked before coding):
- #233: `leaderboard` docs hold name/photo/totalXP/level/role plus `weeklyXP`/`monthlyXP` that no writer ever sets (`users.weeklyXP` has no writer; functions only copy it), there is no daily field, `xpActivities` is owner-readable only, and no backend leaderboard endpoint exists. Daily/Weekly pills removed; a static All Time label replaces them.
- #234: `leaderboard` docs carry no grade/section, and `users` is not readable across students, so Class scoping is impossible client-side. Panel relabeled School Standings (subtitle = student's school), rows only show a section for the viewer's own row, and the no-op section filter is removed.
- #275: `studentBattleLeaderboard` has no season/period field (functions write userId/displayName/photo/rank/leaderboardScore/winRate/bestStreak). Season 1 pill removed; static All Time label kept.
- G274 CHECK uses `vitest.lane-g.config.ts`, an untracked worktree shim that allows Vite to read through the node_modules junction; it is not committed.

- [x] G276: Match History loads the full history once; pill counts no longer depend on the selected mode filter
  CHECK: grep -c "mode: 'all', limitCount: 20" src/components/QuizBattlePage.tsx
  EXPECT: 1
  EVIDENCE: 1

- [x] G275: Hall of Fame no longer offers a Season 1 pill
  CHECK: grep -c "Season 1\|hallOfFameTimeFilter" src/components/QuizBattlePage.tsx
  EXPECT: 0
  EVIDENCE: 0

- [x] G232: handleDuelAgain resets queueType to public_matchmaking when the next mode is not online
  CHECK: grep -n "queueType: nextMode === 'online' ? prev.queueType : 'public_matchmaking'" src/components/QuizBattlePage.tsx
  EXPECT: /queueType: nextMode === 'online'/
  EVIDENCE: 866:        queueType: nextMode === 'online' ? prev.queueType : 'public_matchmaking',

- [x] G274: rank bar message says "#1 rank" only when the rank is 1; unit test covers rank 1, rival, and outside-list cases
  CHECK: npx vitest run --config ./vitest.lane-g.config.ts src/components/LeaderboardPage.test.tsx
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Test Files  1 passed (1) | Tests  2 passed (2)

- [x] G234: Standings panel is labeled school-wide, rows no longer carry the viewer's section, and the no-op section filter is gone
  CHECK: grep -c "Class Standings\|activeView\|myClassSection || 'Grade 11 - STEM A'" src/components/LeaderboardPage.tsx
  EXPECT: 0
  EVIDENCE: 0

- [x] G233: Daily/Weekly pills removed; the page queries the all-time ranking explicitly
  CHECK: grep -c "TIME_FILTERS\|setTimeFilter" src/components/LeaderboardPage.tsx
  EXPECT: 0
  EVIDENCE: 0

- [x] G-E2E-QB: known-bug tag removed from the #232 e2e test
  CHECK: grep -c "known-bug" tests/e2e/student/quiz-battle.e2e.ts
  EXPECT: 0
  EVIDENCE: 0

- [x] G-E2E-LB: the only known-bug tag left in the leaderboard e2e file is the pre-existing skipped error-state test (not in this lane)
  CHECK: grep -c "known-bug" tests/e2e/student/leaderboard.e2e.ts
  EXPECT: 1
  EVIDENCE: 1

- [x] G-TSC: TypeScript passes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: TSC_OK

- [x] G-LINT: ESLint passes on changed files
  CHECK: npx eslint src/components/QuizBattlePage.tsx src/components/LeaderboardPage.tsx src/components/LeaderboardPage.test.tsx --max-warnings=0 && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: LINT_OK

- [x] G-OX: oxlint anti-slop passes
  CHECK: npx oxlint --quiet && echo OX_OK
  EXPECT: OX_OK
  EVIDENCE: OX_OK
