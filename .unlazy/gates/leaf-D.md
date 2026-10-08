# Gates: Leaf D — Frontend

Scope: student lessons consume the SSE stream with visible stage text and cancel on unmount; teacher jobs never double-run; AI effects stop refiring on reference churn.

- [ ] G1: useLessonContent calls POST /api/rag/lesson/stream, exposes `stage`, aborts on unmount/lessonId change, falls back to POST /api/rag/lesson on 404, accepts a plain JSON response (non-event-stream content-type), maps `event: error` to the same messages as today's ApiError path; retry sends forceRefresh: true.
  CHECK: npx vitest run src/hooks/__tests__/useLessonContent.test.tsx
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: pending

- [ ] G2: LessonViewer loading state shows a human-readable stage line (e.g. "Finding curriculum sources…", "Writing your lesson…") with aria-live="polite".
  CHECK: npx vitest run src/components/__tests__/LessonViewerGrounding.test.tsx src/components/__tests__/ModuleDetailView.test.tsx
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: pending

- [ ] G3: generateQuiz / generateLessonPlan: no sync call after a successful async submit; on failed+code "interrupted" or 404 while polling, resubmit async once (contract C3); covered by tests.
  CHECK: npx vitest run src/services
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: pending

- [ ] G4: Refiring AI effects fixed where real: TeacherDashboard daily insight ([students]), teacher learning path ([student, effectiveStruggles]), ModuleFolderCard module-preview on mount. EVIDENCE lists each with the fix or why it was not a real refire.
  EVIDENCE: pending

- [ ] G5: Frontend checks clean.
  CHECK: npm run typecheck
  EXPECT: /^(?![\s\S]*error TS)/
  EVIDENCE: pending
