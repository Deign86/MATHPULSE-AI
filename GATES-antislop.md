# GATES — Fix all anti-slop findings to zero

- [ ] G1 oxlint reports 0 errors repo-wide
  CHECK: npx oxlint 2>&1 | tail -1
  EXPECT: summary line shows 0 errors (warnings tolerated)
  EVIDENCE: pending
- [ ] G2 TypeScript typecheck passes
  CHECK: npm run typecheck
  EXPECT: exit code 0
  EVIDENCE: pending
- [ ] G3 ESLint still passes
  CHECK: npm run lint
  EXPECT: exit code 0
  EVIDENCE: pending
- [ ] G4 Frontend vitest suite passes
  CHECK: npm test
  EXPECT: exit code 0, no failed test files
  EVIDENCE: pending
- [ ] G5 Firebase Functions build + tests pass
  CHECK: cd functions && npm run build && npm test
  EXPECT: exit code 0 for both
  EVIDENCE: pending
- [ ] G6 No anti-slop rule weakened or removed in oxlint.config.ts (all 15 still at error severity; no-runtime-typeof may carry the rule author's documented allowInTypeGuards option)
  CHECK: node -e "const c=require('fs').readFileSync('oxlint.config.ts','utf8'); console.log((c.match(/anti-slop\//g)||[]).length, /allowInTypeGuards/.test(c))"
  EXPECT: 15 true
  EVIDENCE: pending
- [ ] G7 Diff scope sane and delivered: only source edits under lane scopes; committed and pushed to main; tracked plan.md/GATES.md untouched
  CHECK: git log --oneline -1 && git status --short
  EXPECT: one commit on main, clean tree except untracked temp/orchestration files
  EVIDENCE: pending
