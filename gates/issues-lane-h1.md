# Gates: lane h1

Scope: issues #270 #269 #268 #214 #226 #212 #213 #267 (quiz experience and XP crediting) in worktree lane-h1.

- [x] G270: fullscreen button state follows document.fullscreenElement (Esc / denied request resync)
  CHECK: grep -n "fullscreenchange" src/components/QuizExperience.tsx
  EXPECT: a fullscreenchange listener syncs isFullscreen; toggleFullscreen no longer sets state synchronously
  EVIDENCE: src/components/QuizExperience.tsx: `document.addEventListener('fullscreenchange', syncFullscreen)` in a useEffect; toggleFullscreen only calls request/exitFullscreen
- [x] G269: Hint button spends an extra hint once the 5 local keys are gone
  CHECK: npx vitest run src/components/QuizExperience.hints.test.tsx
  EXPECT: test "spends an extra hint once local keys run out" passes
  EVIDENCE: npx vitest run src/components/QuizExperience.hints.test.tsx -> Tests 3 passed (3); 'spends an extra hint once local keys run out' failed (x) before the fix with the component stashed
- [x] G268: Correct! popup stacks above the z-[100] quiz container
  CHECK: grep -n "round-result" -A 6 src/components/QuizExperience.tsx | grep -o "z-\[[0-9]*\]"
  EXPECT: popup z-index > 100
  EVIDENCE: grep -> popup className now `z-[101]` (quiz container stays z-[100], leave dialog z-[110])
- [x] G214: reviewing an earlier question shows Back to Current Question, not Next Question
  CHECK: npx vitest run src/components/QuizExperience.hints.test.tsx
  EXPECT: test "offers Back to Current Question while reviewing an earlier question" passes
  EVIDENCE: npx vitest run src/components/QuizExperience.hints.test.tsx -> 'offers Back to Current Question while reviewing an earlier question' passed; failed before the fix
- [x] G226: reopening a completed module/lesson quiz passes completed=true so no XP is re-awarded
  CHECK: grep -n "completedQuizIds.has" src/components/ModuleDetailView.tsx
  EXPECT: both the practice quiz and the checkpoint quiz derive `completed` from saved progress
  EVIDENCE: grep -> ModuleDetailView.tsx:360 `completed: completedQuizIds.has(`${currentLesson.id}-practice`)` and :492 `completed: selectedLesson.quiz.completed || completedQuizIds.has(selectedLesson.quiz.id)`; results screen shows 'Retake · no XP awarded'
- [x] G212: module/lesson quiz and lesson completion credit XP exactly once
  CHECK: grep -n "awardXP(" src/services/progressService.ts
  EXPECT: completeQuiz and completeLesson no longer call awardXP; only onEarnXP (gamificationService.awardXP) credits
  EVIDENCE: grep 'awardXP(' src/services/progressService.ts -> no call sites left (only the export at :570); completeQuiz/completeLesson no longer credit XP
- [x] G213: practice attempt credits XP once and both toasts show the client figure
  CHECK: set PYTHONPATH=backend; python -X utf8 -m pytest backend/tests -q -k practice
  EXPECT: all practice tests pass incl. new test that /practice/submit does not increment totalXP
  EVIDENCE: python -X utf8 -m pytest backend/tests -q -k practice -> 13 passed, 585 deselected; test_submit_scores_correctly asserts 'totalXP' not in update payload and updated_stats.totalXP == 0; ModulesPage score toast uses client xpEarned from onQuizEnd
- [x] G267: finishing a lesson quiz writes lessons[lessonId].quizCompleted so the button turns into Retry
  CHECK: grep -n "quizCompleted" src/services/progressService.ts src/components/ModuleDetailView.tsx
  EXPECT: completeQuiz writes quizCompleted for the lesson that owns the practice quiz
  EVIDENCE: grep -> progressService.ts completeQuiz writes `lessons.${lessonId}.quizCompleted: true` (+ lessonId, quizScore); ModuleDetailView passes selectedLesson.returnToLesson?.id
- [x] G-E2E: known-bug tag removed from the e2e tests named by #268 #214 #267 #213
  CHECK: grep -c "known-bug" tests/e2e/quiz.e2e.ts tests/e2e/learning/practice-center.e2e.ts
  EXPECT: quiz.e2e.ts 0, practice-center.e2e.ts 1 (the shelved-subjects test belongs to another lane)
  EVIDENCE: grep -c known-bug -> tests/e2e/quiz.e2e.ts:0, tests/e2e/learning/practice-center.e2e.ts:1
- [x] G-TSC: typecheck clean
  CHECK: npx tsc --noEmit
  EXPECT: exit 0, no output
  EVIDENCE: npx tsc --noEmit -> no output, exit 0
- [x] G-LINT: eslint clean on changed files
  CHECK: npx eslint src/components/QuizExperience.tsx src/components/ModuleDetailView.tsx src/components/ModulesPage.tsx src/services/progressService.ts src/components/QuizExperience.hints.test.tsx --max-warnings=0
  EXPECT: exit 0
  EVIDENCE: npx eslint <5 changed files> --max-warnings=0 -> exit 0
- [x] G-OX: oxlint anti-slop clean
  CHECK: npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: npx oxlint --quiet -> exit 0
- [x] G-PY: backend practice tests pass
  CHECK: set PYTHONPATH=backend; python -X utf8 -m pytest backend/tests -q -k practice
  EXPECT: all passed
  EVIDENCE: python -X utf8 -m pytest backend/tests -q -k practice -> 13 passed, 585 deselected, 1 warning in 58.54s
