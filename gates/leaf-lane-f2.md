# Lane F2 acceptance gates

- [x] Existing quiz and RAG lesson e2e locators use unambiguous semantic selectors while preserving student navigation goals.
  CHECK: `npx e2e run tests/e2e/quiz.e2e.ts tests/e2e/regression/rag-lesson.e2e.ts`
  EXPECT: Both existing student e2e flows pass.
  EVIDENCE: full-suite run: quiz.e2e.ts 1 passed in 119.26s; rag-lesson.e2e.ts 1 passed in 139.12s.
- [x] Lesson viewer e2e opens a module and verifies lessons plus checkpoint entry.
  CHECK: `npx e2e run tests/e2e/learning/lesson-viewer.e2e.ts`
  EXPECT: The module detail goal passes with Study Journey, Lesson 1, and START pins.
  EVIDENCE: sequential --workers 1 rerun: lesson-viewer.e2e.ts 1 passed in 66.06s. (Full lesson-body grounding still needs backend RAG: EMBEDDING_MODEL unset, viewer stalls on its loading screen.)
- [x] AI chat e2e verifies a math answer and opens the floating tutor.
  CHECK: `npx e2e run tests/e2e/learning/ai-chat.e2e.ts`
  EXPECT: The answer contains relevant math content and the floating tutor panel is visible.
  EVIDENCE: sequential --workers 1 rerun: ai-chat.e2e.ts 1 passed in 112.03s, conversation plus Copy-message answer plus dialog AI tutor chat pins.
- [ ] All four learning-domain e2e files pass in one invocation.
  CHECK: `npx e2e run tests/e2e/quiz.e2e.ts tests/e2e/regression/rag-lesson.e2e.ts tests/e2e/learning/lesson-viewer.e2e.ts tests/e2e/learning/ai-chat.e2e.ts`
  EXPECT: Four tests pass with no production files changed.
ABANDON: line15 verified in halves instead of one invocation (quiz plus rag-lesson in full suite; lesson-viewer plus ai-chat in BROWSER_QA reruns); no production files changed by this lane.
