# GATES — ui-skills full sweep (worktree: MATHPULSE-AI-ui-sweep, branch chore/ui-skills-sweep)

Scope: audit all 5 UI seams, apply every applicable ui-skills skill (max 3 per task),
verify, review, PR. Base: origin/main @45da2f3 (includes PR #146).

## Phase 1 — Audit (3 scouts, read-only, parallel)
- [ ] `audit-auth` — CHECK: lane output lists findings with file:line for LoginPage + InteractiveRobotBackground + assessment modals / EXPECT: ≥3 findings, each mapped to a registry skill slug
- [ ] `audit-motion` — CHECK: lane output lists findings with file:line for battle + tutor + 3 admin framer-motion leftovers / EXPECT: same
- [ ] `audit-dash` — CHECK: lane output lists findings with file:line for TeacherDashboard + HeroBanner + widgets + skeletons / EXPECT: same

## Phase 2 — Implement (3 workers, disjoint scopes, parallel)
- [ ] `impl-auth` — CHECK: `git diff --stat -- src/components/LoginPage.tsx src/components/login/ src/components/assessment/` non-empty, scoped to those paths / EXPECT: only those paths touched
- [ ] `impl-motion` — CHECK: `grep -rn "from 'framer-motion'" src/ ` empty AND `git diff --stat` scoped to battle+tutor+admin paths / EXPECT: zero legacy imports
- [ ] `impl-dash` — CHECK: `git diff --stat` scoped to dashboard/widget paths / EXPECT: only those paths touched

## Phase 3 — Verify + Review
- [ ] `build-clean` — CHECK: `npx tsc --noEmit` exit 0 AND `npm run build` exit 0 / EXPECT: both exit 0, no new errors
- [ ] `review-pass` — CHECK: reviewer verdict for combined diff / EXPECT: OK or OK-with-notes, zero P0
- [ ] `pr-open` — CHECK: `gh pr view` for sweep branch / EXPECT: state OPEN, base main

EVIDENCE:
- build-clean: `npx tsc --noEmit` exit 0, 0 errors; `npm run build` exit 0 in 16.62s (chunk-size warning pre-existing). Both parent-run in sweep worktree across all 3 lanes.
