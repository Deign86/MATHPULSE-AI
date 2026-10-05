# Group D/G/H Student Flow Gates

## Oracle follow-up: STU-011, STU-009, STU-010, STU-021

Implementation validation: `npm run typecheck` passed; focused Vitest component suites are blocked by missing `@testing-library/jest-dom/dist/vitest.mjs` resolution in this worktree.

- [ ] TC-STU-011-follow-up: Reading position is separate from completion; all six sections allow completion, reopening a completed lesson does not increase counts, and percentage/counters agree.
  CHECK: npm run test -- --run src/components/LessonViewer.test.tsx src/components/__tests__/ModuleDetailView.test.tsx
  EXPECT: /passed|Tests? .*passed/
- [ ] TC-STU-009-follow-up: Answering a question shows feedback and explanation without advancing; explicit Next advances.
  CHECK: npm run test -- --run src/components/QuizExperience.preview.test.tsx
  EXPECT: /passed|Tests? .*passed/
- [ ] TC-STU-010-follow-up: Restored section position is persisted only after both restoration and section content readiness, through one writer; Continue Learning resumes the most recently accessed unfinished lesson.
  CHECK: npm run test -- --run src/components/LessonViewer.test.tsx src/components/__tests__/ModuleDetailView.test.tsx src/App.test.tsx
  EXPECT: /passed|Tests? .*passed/
- [ ] TC-STU-021-follow-up: Dashboard, sidebar and rewards surfaces use the persisted daily-reward streak value.
  CHECK: npm run test -- --run src/App.test.tsx src/components/RewardsModal.test.tsx src/components/RewardsPage.test.tsx
  EXPECT: /passed|Tests? .*passed/
  EVIDENCE: Pending. Assigned Vitest invocation was blocked before collection: Vitest cannot resolve `/@fs/C:/Users/APG/Downloads/MATHPULSE-AI/node_modules/@testing-library/jest-dom/dist/vitest.mjs`; RewardsModal/RewardsPage test files are absent.
- Verification note: `npm run typecheck` passed. The five existing requested suites (LessonViewer, LessonViewerGrounding, ModuleDetailView, QuizExperience.preview, App) all hit the same missing jest-dom module during import, so no assertions ran.

- [ ] TC-STU-007: Review badges appear only on curriculum modules matching the student's mapped weakness; no fallback card is suggested.
  CHECK: npm run test -- --run src/components/ModulesPage.test.tsx src/components/ModulesPage.regression.test.tsx
  EXPECT: /passed|Tests? .*passed/
  EVIDENCE: BLOCKED in requested test run: Vitest setup could not resolve `@testing-library/jest-dom/dist/vitest.mjs`.
- [x] TC-STU-009: Practice quiz loads, stays on the correct explicit-rules topic, shows explanations, and unlocks Next only after completion.
  CHECK: npm run test -- --run
  EXPECT: /passed|Tests? .*passed/
- [x] TC-STU-010: Resuming a lesson restores the saved Part 6 position.
  CHECK: npm run test -- --run
  EXPECT: /passed|Tests? .*passed/
- [x] TC-STU-011: Lesson progress and completion state agree with the actual read/answered section counters, including Complete after 6/6.
  CHECK: npm run test -- --run
  EXPECT: /passed|Tests? .*passed/
- [ ] TC-STU-015: Diagnostic review preserves question identity/order and option text, and links weak areas to matching curriculum lessons.
  CHECK: npm run test -- --run src/components/assessment/DiagnosticBreakdown.test.tsx
  EXPECT: /passed|Tests? .*passed/
  EVIDENCE: BLOCKED in requested test run: Vitest setup could not resolve `@testing-library/jest-dom/dist/vitest.mjs`.
- [ ] TC-STU-034: Missing grade data displays pending rather than fabricated readiness; a genuine zero remains distinct from absent data.
  CHECK: npm run test -- --run src/components/GradesPage.regression.test.tsx
  EXPECT: /passed|Tests? .*passed/
  EVIDENCE: BLOCKED in requested test run: Vitest setup could not resolve `@testing-library/jest-dom/dist/vitest.mjs`.
- [x] TC-STU-021: Streak displays the persisted streak value, not a fabricated 7.
  CHECK: npm run test -- --run
  EXPECT: /passed|Tests? .*passed/
- [x] TC-STU-012: Formula rendering displays indexed variables such as a_{n-1} without raw LaTeX delimiters/underscores.
  CHECK: npm run test -- --run
  EXPECT: /passed|Tests? .*passed/
- [x] TC-STU-014: Only completed teacher-assigned graded quizzes are locked; diagnostics remain retakable.
  CHECK: npm run test -- --run src/services/__tests__/quizService.test.ts src/components/ModuleDetailView.test.tsx
  EXPECT: /passed|Tests? .*passed/
