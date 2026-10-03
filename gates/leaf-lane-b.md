# Gates: Lane B frontend regression tests

Scope: Add new frontend-only regression tests for teacher/admin, workbook parsing, notifications, push notifications, and PWA connectivity without production changes.

- [x] G1: Every lane B regression test passes.
  CHECK: npm run test -- src/components/TeacherDashboard.regression.test.tsx src/components/CreateStudentAccountModal.regression.test.tsx src/components/AddStudentsModal.regression.test.tsx src/features/import/services/shsExcel/parser/__tests__/regression.classifyLearnerRows.test.ts src/features/import/services/shsExcel/parser/__tests__/regression.detectFormat.test.ts src/features/import/services/shsExcel/parser/__tests__/regression.validateWorkbook.test.ts src/components/AdminUserManagement.regression.test.tsx src/components/admin/AdminClassManagement.regression.test.tsx src/components/AdminRagManager.regression.test.tsx src/pages/admin/AIMonitoringPage.regression.test.tsx src/features/notifications/notificationCollation.regression.test.tsx src/features/notifications/notificationScoping.regression.test.tsx src/features/notifications/notificationMarkAllRead.regression.test.tsx src/components/PushNotificationsManager.regression.test.tsx src/components/InstallPwaButton.regression.test.tsx src/components/OnlineOfflineBanner.regression.test.tsx
  EXPECT: Test Files  16 passed (16)
  EVIDENCE: 16 test files passed; 32 tests passed. Gate-check completed successfully at 12:44:07.

- [x] G2: Lane B files pass anti-slop lint.
  CHECK: npm run lint:anti-slop -- src/components/TeacherDashboard.regression.test.tsx src/components/CreateStudentAccountModal.regression.test.tsx src/components/AddStudentsModal.regression.test.tsx src/features/import/services/shsExcel/parser/__tests__/regression.classifyLearnerRows.test.ts src/features/import/services/shsExcel/parser/__tests__/regression.detectFormat.test.ts src/features/import/services/shsExcel/parser/__tests__/regression.validateWorkbook.test.ts src/components/AdminUserManagement.regression.test.tsx src/components/admin/AdminClassManagement.regression.test.tsx src/components/AdminRagManager.regression.test.tsx src/pages/admin/AIMonitoringPage.regression.test.tsx src/features/notifications/notificationCollation.regression.test.tsx src/features/notifications/notificationScoping.regression.test.tsx src/features/notifications/notificationMarkAllRead.regression.test.tsx src/components/PushNotificationsManager.regression.test.tsx src/components/InstallPwaButton.regression.test.tsx src/components/OnlineOfflineBanner.regression.test.tsx
  EXPECT: oxlint --quiet
  EVIDENCE: Exit 0 with no lint diagnostics; Node emitted only a MODULE_TYPELESS_PACKAGE_JSON warning for oxlint.config.ts.

- [x] G3: Requested work is new test files only, with no production code or excluded-path edits.
  EVIDENCE: This lane created 16 test files listed below plus this gate file; no production code or excluded paths were changed by this lane.
