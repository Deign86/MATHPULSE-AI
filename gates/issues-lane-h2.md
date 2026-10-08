# Gates: lane h2

Scope: issues #271 #265 #225 #264 #263 #266 #224 #262 #260 (modules / lessons / practice center content) on branch fix/issues-lane-h2; e2e tests for fixed issues untagged from known-bug; no e2e run.

- [x] G271: Teacher-assigned module step progress survives a reload (persisted, not only in-memory state)
  CHECK: grep -c "INTERVENTION_STEPS_STORAGE_KEY" src/components/ModulesPage.tsx
  EXPECT: /^3$/
  EVIDENCE: `3` (constant declared, read in the useState initializer, written in the persistence effect).

- [x] G265: About modal list and hero sentence are derived from curriculumSubjects, not hard-coded shelved subjects
  CHECK: grep -c "Business Mathematics\|Statistics & Probability" src/components/ModulesPage.tsx
  EXPECT: /^0$/
  EVIDENCE: `0`

- [x] G225: PracticeCenter falls back to the grade's active subjects instead of the full SHS_MATH_SUBJECTS list
  CHECK: grep -n "getActiveSubjectIdsForGrade" src/components/PracticeCenter.tsx
  EXPECT: /getActiveSubjectIdsForGrade\(/
  EVIDENCE: `61:    const visibleSubjectIds = allowedSubjectIds?.length ? allowedSubjectIds : getActiveSubjectIdsForGrade();`

- [x] G264: Module hero chapter badge is numeric (no raw slug segment)
  CHECK: grep -c "module.id.split('-')" src/components/ModuleDetailView.tsx
  EXPECT: /^0$/
  EVIDENCE: `0`

- [x] G263: markStudyMaterialsComplete writes a nested lessons map (no dotted keys through setDoc)
  CHECK: grep -c "\`lessons\.\${lessonId}" src/hooks/useModuleProgress.ts
  EXPECT: /^0$/
  EVIDENCE: `0`

- [x] G266: 404 no_curriculum_context is read from ApiError.responseBody under FastAPI's detail key
  CHECK: npx vitest run src/services/apiUtils.test.ts
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: `Test Files  1 passed (1)` / `Tests  2 passed (2)` (part of the 3-file run below: Tests 17 passed (17)).

- [x] G224: PDF fallback and load-error panels offer a Go back control wired to onBack
  CHECK: grep -c "aria-label=\"Go back\"" src/components/LessonViewer.tsx
  EXPECT: /^[2-9]$/
  EVIDENCE: `2` (notebook header + new PdfFallbackPanel button); ErrorPanel on the load-error path gets onCancel={onBack} with label "Back to module".

- [x] G262: Failed SymPy verification does not render the SymPy Verified badge
  CHECK: grep -n "verified: false" src/components/ScientificCalculator.tsx
  EXPECT: /verified: false/
  EVIDENCE: `22:  | { verified: false };` and `532:      setSympyResult({ verified: false });`

- [x] G260: Daily reward claim reports streakAfter back to App so the header streak updates without reload
  CHECK: grep -n "onStreakChange" src/App.tsx src/components/ModulesPage.tsx
  EXPECT: /App\.tsx:\d+:.*onStreakChange=\{setCurrentStreak\}/
  EVIDENCE: `src/App.tsx:1658: onStreakChange={setCurrentStreak}`; `src/components/ModulesPage.tsx:475: onStreakChange?.(result.streakAfter);`

- [x] G-E2E: known-bug tag removed from the eight e2e tests the fixed issues name
  CHECK: grep -c "known-bug" tests/e2e/learning/teacher-modules.e2e.ts tests/e2e/student/modules.e2e.ts tests/e2e/learning/practice-center.e2e.ts tests/e2e/regression/rag-lesson.e2e.ts tests/e2e/student/shortcuts-calculator.e2e.ts
  EXPECT: teacher-modules.e2e.ts:0, modules.e2e.ts:0, practice-center.e2e.ts:1, rag-lesson.e2e.ts:0, shortcuts-calculator.e2e.ts:3
  EVIDENCE: `teacher-modules.e2e.ts:0 modules.e2e.ts:0 practice-center.e2e.ts:1 rag-lesson.e2e.ts:0 shortcuts-calculator.e2e.ts:3` (remaining tags belong to other lanes' issues).

- [x] G-TSC: Typecheck passes
  CHECK: npx tsc --noEmit; echo "tsc exit=$?"
  EXPECT: /tsc exit=0/
  EVIDENCE: `tsc exit=0` with no diagnostics.

- [x] G-LINT: ESLint passes on changed files with zero warnings
  CHECK: npx eslint src/components/ModulesPage.tsx src/components/PracticeCenter.tsx src/components/ModuleDetailView.tsx src/hooks/useModuleProgress.ts src/hooks/useLessonContent.ts src/services/apiUtils.ts src/services/apiUtils.test.ts src/components/LessonViewer.tsx src/components/ScientificCalculator.tsx src/App.tsx --max-warnings=0; echo "eslint exit=$?"
  EXPECT: /eslint exit=0/
  EVIDENCE: `eslint exit=0` (only Node's util._extend DeprecationWarning on stderr).

- [x] G-OX: Anti-slop oxlint passes
  CHECK: npx oxlint --quiet; echo "oxlint exit=$?"
  EXPECT: /oxlint exit=0/
  EVIDENCE: `oxlint exit=0`, no diagnostics (an earlier run flagged anti-slop(no-unknown-parameters) on readFastApiErrorDetail; parameter narrowed to ApiError).

- [x] G-VITEST: Unit tests that load in this worktree pass
  CHECK: npx vitest run src/services/apiUtils.test.ts src/data
  EXPECT: /Test Files\s+3 passed \(3\)/
  EVIDENCE: `Test Files  3 passed (3)` / `Tests  17 passed (17)`. Component suites (ModulesPage, LessonViewer, ScientificCalculator *.test.tsx) cannot load in this junction worktree: `Error: Cannot find module '/@fs/C:/Users/APG/Downloads/MATHPULSE-AI/node_modules/@testing-library/jest-dom/dist/vitest.mjs'` from the setupFiles entry, before any test runs; the same suite passes unchanged on the main checkout (`Test Files 1 passed (1)`), so this is the worktree's node_modules junction, not the change.
