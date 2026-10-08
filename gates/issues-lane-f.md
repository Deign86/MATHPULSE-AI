# Gates: lane f

Scope: Fix teacher Data Import and AI Quiz Maker issues #283 #282 #281 #280 #240 #279 #278 #239 #277 in DataImportView.tsx, QuizMaker.tsx and the two hard-coded Grade inputs in TeacherDashboard.tsx; untag the matching known-bug e2e tests.

- [x] G283: Edit Class Records distinguishes "no managed classes" from "class with no students"
  CHECK: grep -n "No students in this class yet\|No managed classes found" src/features/DataImport/DataImportView.tsx
  EXPECT: both headings present, chosen by availableClasses.length
  EVIDENCE: grep: 1234 'No managed classes found' (availableClasses.length === 0 branch), 1239 'No students in this class yet' (else branch).
- [x] G282: Data Health card reflects import failure / no-data / synced state instead of a static success card
  CHECK: grep -n "dataHealth" src/features/DataImport/DataImportView.tsx
  EXPECT: card heading and copy derived from uploadResult, history/materials errors and filteredStudents
  EVIDENCE: grep: 672 const dataHealth = uploadResult ? error : history/materials error ? warning : filteredStudents.length === 0 ? empty : synced; 1047-1056 badge/card/icon/title/detail bound to dataHealth.
- [x] G281: Go to Modules navigates the teacher instead of dispatching an unhandled window event
  CHECK: grep -n "mathpulse:navigate" src/features/DataImport/DataImportView.tsx; grep -n "known-bug" tests/e2e/teacher/data-import.e2e.ts
  EXPECT: no mathpulse:navigate dispatch in DataImportView; Go to Modules test no longer tagged known-bug
  EVIDENCE: grep mathpulse:navigate in DataImportView.tsx: no matches (exit 1); Go to Modules now calls onNavigateToModuleAvailability. grep known-bug data-import.e2e.ts: no matches (exit 1).
- [x] G280: Target Class Context select reflects the class in scope and changes the import scope
  CHECK: grep -n "onChange={() => {}}\|onSelectClass" src/features/DataImport/DataImportView.tsx
  EXPECT: no no-op onChange; scope state drives select value, filteredStudents and uploads
  EVIDENCE: grep 'onChange={() => {}}': no match; 757 onChange -> onSelectClass(value or null); TeacherDashboard 2243 onSelectClass sets selectedClass, which feeds classSectionId/className into DataImportView.
- [x] G240: Cancel / Back to Uploads in Edit Class Records discard the in-progress row edit
  CHECK: grep -n "closeEditRecords" src/features/DataImport/DataImportView.tsx
  EXPECT: both buttons call closeEditRecords, which resets editingRowKey and sectionDrafts
  EVIDENCE: grep closeEditRecords: 666 definition (setEditingRowKey(null); setSectionDrafts(buildSectionDrafts(localStudents)); setCurrentImportView('main')), 1174 Back to Uploads, 1188 Cancel.
- [x] G279: Back to Quiz Bank resets the Create tab to the setup step
  CHECK: grep -n "Back to Quiz Bank" -B4 src/components/QuizMaker.tsx
  EXPECT: handler resets step, quizResult, previewResult, savedQuizId
  EVIDENCE: QuizMaker.tsx 2164: onClick resets activeTab, step('setup'), quizResult, previewResult, savedQuizId, viewingBankQuizId.
- [x] G278: Setup step renders one Quiz title field
  CHECK: grep -c 'id="quiz-title"' src/components/QuizMaker.tsx
  EXPECT: 1
  EVIDENCE: grep -c 'id="quiz-title"' = 1 (second field removed; maxLength={120} kept on the remaining one).
- [x] G239: Quiz Bank Delete asks for confirmation via ConfirmModal before deleting
  CHECK: grep -n "pendingDeleteQuizId" src/components/QuizMaker.tsx
  EXPECT: Delete sets pendingDeleteQuizId; ConfirmModal onConfirm calls handleDeleteBankQuiz
  EVIDENCE: QuizMaker.tsx 1017 pendingDeleteQuizId state; 1426 Delete sets it; 2264-2273 ConfirmModal type=danger icon=delete, onConfirm -> handleDeleteBankQuiz.
- [x] G277: Grade fields show the student's grade instead of a literal "Grade 11"
  CHECK: grep -n 'value="Grade 11"' src/components/TeacherDashboard.tsx src/features/DataImport/DataImportView.tsx; grep -n "toHaveValue(/\^Grade" tests/e2e/teacher/intervention-center.e2e.ts
  EXPECT: no literal value="Grade 11"; e2e asserts the grade pattern
  EVIDENCE: grep 'value="Grade 11"' in TeacherDashboard.tsx + DataImportView.tsx: no matches (exit 1); intervention-center.e2e.ts:306 toHaveValue(/^Grade 1[12]$/).
- [x] G-TSC: typecheck passes
  CHECK: npx tsc --noEmit
  EXPECT: exit 0
  EVIDENCE: npx tsc --noEmit -> TSC_EXIT=0.
- [x] G-LINT: eslint passes on changed files
  CHECK: npx eslint src/features/DataImport/DataImportView.tsx src/components/QuizMaker.tsx src/components/TeacherDashboard.tsx --max-warnings=0
  EXPECT: exit 0
  EVIDENCE: npx eslint <3 src files + 3 e2e files> --max-warnings=0 -> ESLINT_EXIT=0.
- [x] G-OX: oxlint anti-slop passes
  CHECK: npx oxlint --quiet
  EXPECT: exit 0
  EVIDENCE: npx oxlint --quiet -> OX_EXIT=0. Related vitest: 3 files / 13 tests passed (ClassCounts suite needs fs.allow for the junctioned node_modules; passes with that override and in the main checkout).
