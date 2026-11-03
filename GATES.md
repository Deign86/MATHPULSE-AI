# Gates: open issues #313-#321

Scope: fix the nine open frontend issues. #313 Intervention Center reuses the cached learning path and generates the lesson plan only when the teacher opens the Lesson tab or presses Regenerate. #314 the teacher bell panel gets a "View all notifications" link, and the never-called onOpenNotifications prop is removed. #315 Admin Profile Save is disabled until something changes. #316 subject availability switch asks first. #317 AI Chat delete asks first. #318 Teacher/Admin Settings restore the saved theme on unmount. #319 Competency Matrix ignores equal roster arrays, starts both roster reads together and fills matrix rows per batch. #320 Class Management keeps header and filters on screen with skeleton rows. #321 dead admin files, props and the edit_records view id are gone. Post-commit (not gated here): PR CI, merge, and a manual look in the live app.

- [x] G1: TypeScript compiles
  CHECK: npx tsc --noEmit >NUL 2>&1 && echo TYPECHECK_OK
  EXPECT: TYPECHECK_OK
  EVIDENCE: TYPECHECK_OK

- [x] G2: ESLint passes
  CHECK: npx eslint src --ext .ts,.tsx --quiet >NUL 2>&1 && echo ESLINT_OK
  EXPECT: ESLINT_OK
  EVIDENCE: ESLINT_OK

- [x] G3: Oxlint anti-slop rules pass
  CHECK: npx oxlint --quiet >NUL 2>&1 && echo OXLINT_OK
  EXPECT: OXLINT_OK
  EVIDENCE: OXLINT_OK

- [x] G4: Tests for every issue pass (settings preview, subjects confirm, chat delete confirm, class skeleton, bell View all, intervention pins, competency loading, sidebar)
  CHECK: npx vitest run src/components/admin/AdminSettingsPage.tour.test.tsx src/components/teacher/TeacherSettingsPage.tour.test.tsx src/components/admin/AdminSubjects.test.tsx src/components/AIChatPage.test.tsx src/components/admin/AdminClassManagement.regression.test.tsx src/features/notifications src/__tests__/regression/aiPerf.regression.test.tsx src/components/StudentCompetencyTable.loading.test.tsx src/components/Sidebar.test.tsx 2>&1 | findstr /C:"Tests "
  EXPECT: /Tests\s+\d+ passed \(\d+\)/
  EVIDENCE: Tests  133 passed (133)

- [x] G5: Full frontend suite passes
  CHECK: npx vitest run 2>&1 | findstr /C:"Test Files " /C:"Tests "
  EXPECT: /Tests\s+\d+ passed \(\d+\)/
  EVIDENCE: Test Files  158 passed (158) | Tests  1013 passed (1013)

- [x] G6: #321 dead files and view id are gone, and no view still takes onOpenNotifications (#314)
  CHECK: git grep -n -E "onOpenNotifications|'edit_records'|AdminPriorityModules|from './AdminSettings'|AdminContent" -- src || echo NO_DEAD_REFS
  EXPECT: NO_DEAD_REFS
  EVIDENCE: NO_DEAD_REFS

- [x] G7: New tests fail on the old code (red before green)
  EVIDENCE: with the source fixes stashed, the new tests fail: Admin+Teacher theme preview 2 failed (#318); getImportedClassOverview called 0 times (#319); class skeleton, chat delete confirm, both subject toggle tests, bell View all = "Tests  5 failed | 18 passed (23)" (#320, #317, #316, #314); #313 pins match setLessonTrigger in the old source. #315 is a one-line disabled guard with no new test.
