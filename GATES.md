# Gates: Seed script for the Quiz Battle question bank

Scope: `scripts/seed-quiz-battle-bank.ts` generates and verifies (Claude Haiku) Grade 11 multiple-choice questions for the 7 Quiz Battle modules and upserts them into `quizBattleQuestionBank`. Dry run only writes `scripts/output/quiz-battle-bank-seed.json`; `--write` (not run here) upserts it. Nothing was written to Firestore.

- [x] G1: Pure parts (validation, dedupe, quota, balance, doc mapping against the canonical shape) are unit-tested
  CHECK: node --test scripts/seed-quiz-battle-bank.test.ts 2>&1
  EXPECT: /# fail 0/
  EVIDENCE: # tests 8, # pass 8, # fail 0

- [x] G2: Anti-slop lint and typecheck are clean on the script and its test
  CHECK: npx oxlint --quiet scripts/seed-quiz-battle-bank.ts scripts/seed-quiz-battle-bank.test.ts 2>&1 && echo LINT_CLEAN
  EXPECT: LINT_CLEAN
  EVIDENCE: oxlint no findings; tsc --noEmit (strict, esnext/bundler) no errors

- [x] G3: Dry run covered all 7 modules via Claude with double verification, kept 25 per module, balanced answer positions, no Firestore access (no CHECK: re-running regenerates the reviewed JSON and spends API credit)
  EVIDENCE: kept 25 per module (8 easy / 9 medium / 8 hard) after two independent step-by-step verifier passes that must each find exactly the key correct; 175 total; verify drop 0-9%; 153215 in / 156260 out tokens, about 0.94 USD; correct index spread 49/42/42/42

- [x] G4: Hand review of the generated set before writing
  EVIDENCE: first dry run had 3/19 bad gm-1 items (wrong key P(4); two equivalent correct choices twice) -> verifier tightened; second run hand-checked gm-1 (25), gm-3 (25), sp-1 (25): 75/75 correct with exactly one correct choice

- [x] G6: Seeded docs carry the Grade 11 profile default version set, so matches select them (a "strengthened" tag was filtered out of every match)
  CHECK: node --test scripts/seed-quiz-battle-bank.test.ts 2>&1
  EXPECT: /# fail 0/
  EVIDENCE: 8 pass / 0 fail (red before the fix). Live: rules deployed, 175 docs upserted from the reviewed JSON (md5 336c609b… unchanged); 5-question VS Bot match on gm-1 xZrzKvQrm6foxPXz0ceQ served ai-gm-1-80228c82a608, -eeefd9bc35b0, -859394a2f267, -ce7d8f4eed85, -0215b3350a0e (all seeded Functions items); previous match before the fix served static qb-gm-01..05

- [x] G5: Students cannot read bank answers; teachers/admins keep read access for the Question Bank panel; writes stay server-only
  CHECK: cd functions && npm run build && npm test 2>&1
  EXPECT: /# fail 0/
  EVIDENCE: # pass 81, # fail 0; rules test fails with the old `allow read: if isSignedIn();` (not ok 9) and passes with `isTeacherOrAdmin()`
