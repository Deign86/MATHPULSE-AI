# GATES — Fix all anti-slop findings to zero

Status at handoff (WIP branch `fix/anti-slop-cleanup`):

- [x] G1 oxlint reports 0 errors repo-wide
  CHECK: npx oxlint 2>&1 | grep -c "error anti-slop"
  EXPECT: 0
  EVIDENCE: measured 0 errors (baseline was 1,708); only pre-existing eslint-family warnings remain.
- [ ] G2 TypeScript typecheck passes — **OPEN: 108 errors remain** (worker-introduced regressions in ~20 files; useModuleDifficulty repaired this session)
  CHECK: npm run typecheck
  EXPECT: exit code 0
  EVIDENCE: pending — measured 108 errors at handoff
- [ ] G3 ESLint still passes
  CHECK: npm run lint
  EXPECT: exit code 0
  EVIDENCE: pending re-run after G2
- [ ] G4 Frontend vitest suite passes — notification/daily-reward tests converted vi.mock→vi.spyOn but NOT yet executed
  CHECK: npm test
  EXPECT: exit code 0
  EVIDENCE: pending
- [ ] G5 Firebase Functions build + tests pass
  CHECK: cd functions && npm run build && npm test
  EXPECT: exit code 0 for both
  EVIDENCE: functions tsc verified clean mid-session; full build+test not re-run at handoff
- [x] G6 No anti-slop rule weakened or removed in oxlint.config.ts (all 15 rules present at error severity; no-runtime-typeof carries only the rule author's documented allowInTypeGuards option)
  CHECK: node -e "const c=require('fs').readFileSync('oxlint.config.ts','utf8'); console.log((c.match(/anti-slop\//g)||[]).length >= 15, /allowInTypeGuards/.test(c))"
  EXPECT: true true
  EVIDENCE: verified — 15 rules registered; single documented option added by parent decision (PLAN-antislop.md t3).
- [ ] G7 Delivered on separate branch for continuation (this commit) — main untouched since af9e98d except earlier checkpoint
  CHECK: git log --oneline -1 origin/fix/anti-slop-cleanup
  EXPECT: this commit pushed
  EVIDENCE: pending push

## Continuation notes for next session
1. Fix G2: run `npx tsc --noEmit`, fix the 108 errors file-by-file (largest clusters: ModulesPage area fixed already; check LoginPage 8, MasteryHeatmap 7, SupplementalBanner 6, DataImportView 4, QuizExperience 4, DailyCheckInModal 4, test-setup 3, useCurriculum 3, chart.tsx 3 + scattered). Rule: adjust types only, never revert behavior; prefer structural/named owner types over casts.
2. Re-run G3 ESLint, G4 vitest (esp. the five rewritten notification test files + dailyReward/profileImage/lessonQuiz/huggingface/useDailyReward spy conversions), G5 functions build+test.
3. Fresh-context reviewer pass, then merge to main.
