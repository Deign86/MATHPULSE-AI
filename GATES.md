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

- [x] G3: Dry run covered all 7 modules via Claude with double verification, kept 25 per module, balanced answer positions, no Firestore access
  CHECK: node scripts/seed-quiz-battle-bank.ts --dry-run 2>&1
  EXPECT: /tokens input=\d+ output=\d+/
  EVIDENCE: kept 25 per module (8 easy / 9 medium / 8 hard) after two independent step-by-step verifier passes that must each find exactly the key correct; 175 total; verify drop 0-9%; 153215 in / 156260 out tokens, about 0.94 USD; correct index spread 49/42/42/42
