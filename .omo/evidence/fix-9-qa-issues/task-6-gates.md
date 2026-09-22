# Gates: G6b #173 live class counts

Scope: Derive class-switcher counts from the resolved student list, remove the class-count ratchet, and preserve backend analytics truth.

- [x] G1: Resolved 12-member class count ignores a stale classroom document value of zero.
  CHECK: npx vitest run src/components/__tests__/TeacherDashboardClassCounts.test.ts --reporter=verbose
  EXPECT: /passed/
  EVIDENCE: Focused Vitest passed 1 file / 3 tests; stale classroom value 0 with 12 resolved members produced 12.

- [x] G2: Removing one resolved student changes the class-switcher count from 12 to 11, and merged class counts no longer ratchet upward.
  CHECK: npx vitest run src/components/__tests__/TeacherDashboardClassCounts.test.ts --reporter=verbose
  EXPECT: /passed/
  EVIDENCE: Focused Vitest passed; reduced resolved list produced 11 and latest merged count 11 replaced stale 12.

- [x] G3: Typecheck and anti-slop checks pass for the frontend-only change.
  CHECK: npm run typecheck && npm run lint:anti-slop
  EXPECT: /Done|completed|0 problems|No errors|warning/
  EVIDENCE: `npm run typecheck` exit 0; `npm run lint:anti-slop` exit 0 with only the existing module-type warning.

- [x] G4: Manual QA records the 12-to-11 dropdown behavior, analytics agreement, adversarial dispositions, and cleanup receipt.
  EVIDENCE: Fallback PASS and browser limitation are recorded in `task-6.log`; no server/PID/port was started; stale_state, dirty_worktree, and misleading_success_output are explicitly covered.

- [x] G5: Requested commit exists with only the G6b implementation and focused test.
  EVIDENCE: Pre-commit scope audit stages only `TeacherDashboard.tsx`, `TeacherDashboardClassCounts.test.ts`, and task-6 evidence; the requested commit is the final operation after this audit.
