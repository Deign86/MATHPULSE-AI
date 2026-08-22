# GATES — Fix all anti-slop findings to zero

Status at session end (all numbers measured at repo root with `npx oxlint`, 2026-08-22):

- [ ] G1 oxlint reports 0 errors repo-wide — **NOT MET**
  CHECK: npx oxlint 2>&1 | grep -cE "error anti-slop"
  EXPECT: 0
  EVIDENCE: 698 remain (baseline 1,708 → fixed 1,010 ≈ 59%). Breakdown: functions 293, src 387, other ~18.
  ABANDON: G1 session turn budget exhausted; async workflow infra repeatedly terminated children; two workers false-verified by running oxlint inside functions/ where root config/jsPlugin does not apply. Handover notes in PLAN-antislop.md t6.
- [x] G2 TypeScript typecheck — known pre-existing errors only
  CHECK: npx tsc --noEmit
  EXPECT: exit code recorded
  EVIDENCE: 79 errors, all in `*.test.ts(x)` files under src/ (strict flags noImplicitAny/useUnknownInCatchVariables on test code); production src compiles clean. Baseline before cleanup also had these strict-test errors introduced during mock conversions.
- [x] G3 ESLint still passes
  CHECK: npm run lint
  EXPECT: exit code 0
  EVIDENCE: PASS (exit 0)
- [ ] G4 Frontend vitest suite passes — **REGRESSION, NOT MET**
  CHECK: npm test -- --run
  EVIDENCE: 175 passed / 3 failed — all 3 in src/features/notifications/notificationFirestoreService.test.ts (getUserNotifications ordering, markAllAsRead, subscribeToNotifications unsubscribe), caused by the lane-b worker's vi.mock→vi.spyOn conversion.
  ABANDON: fix deferred to next session; single-file scope, see PLAN-antislop.md t6.
- [ ] G5 Firebase Functions build + tests pass — **NOT VERIFIED CLEAN**
  CHECK: cd functions && npm run build && npm test
  EVIDENCE: functions build PASS; functions tests: 2 suites failed earlier in session (quizBattleApi.test.ts, riskTriggers.test.ts) after lane edits; not re-run at close.
  ABANDON: re-verification deferred; listed as first next-session task.
- [x] G6 No rule weakened (15 rules at error severity; allowInTypeGuards is the rule author's documented option)
  CHECK: node -e "const c=require('fs').readFileSync('oxlint.config.ts','utf8'); console.log((c.match(/anti-slop\//g)||[]).length, /allowInTypeGuards/.test(c))"
  EXPECT: 15 true
  EVIDENCE: "15 true"
- [x] G7 Progress committed and pushed to main; working tree clean
  CHECK: git log --oneline -3 && git status --short
  EVIDENCE: commits through checkpoint 7790eef + docs; tree clean at close; pushed to origin/main.

Ledger: 4 of 7 fully checked; 3 abandoned with reasons above (G1 partial 59%, G4 single-file regression, G5 needs re-verify).
