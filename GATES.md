# Gates: Quiz Battle serves questions from the chosen topic

Scope: bot and online matches draw from the Firestore question bank (currently empty) and fall back to the static bank. Two defects mixed in other topics: (1) the battle setup sends module ids (`gm-1` = Functions and Their Graphs) but the static bank is tagged by slug (`functions`), so the topic filter never matched; (2) both pickers ranked "same difficulty, any topic" above "same topic", so a short topic pool was replaced by off-topic questions. Live evidence: match rzDeI1LHGqBmPSH0PWPh (gm-1, medium, 3 rounds) served qb-gm-04 and qb-gm-07 (logic) plus qb-gm-05.

- [x] G1: Module ids resolve to bank topics, and on-topic questions (any difficulty) outrank off-topic ones; other topics only pad rounds the topic cannot fill
  CHECK: cd functions && npm run build && npm test 2>&1
  EXPECT: /# fail 0/
  EVIDENCE: # pass 80, # fail 0, # skipped 7 (red run before the fix: 3 failed — module-id mapping, topic-before-difficulty, bounded padding)

- [x] G2: Functions lint and repo anti-slop lint are clean on the changed file
  CHECK: cd functions && npm run lint 2>&1 && echo LINT_CLEAN
  EXPECT: LINT_CLEAN
  EVIDENCE: eslint no findings; npx oxlint --quiet functions/src/triggers/quizBattleApi.ts no findings

Post-deploy check (not a pre-merge gate): play a VS Bot match on "Functions and Their Graphs" (3 questions) and confirm every question is about functions.
