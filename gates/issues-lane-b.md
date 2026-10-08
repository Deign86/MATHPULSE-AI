# Gates: lane b

Scope: Settings fixes for student/teacher/admin (#306 #302 #301 #235 #217 #303 #300 #253 #252 #242 #241 #286) in the lane-b worktree; e2e tests untagged, no e2e runs.

- [x] G306: one success toast per settings save (App.handleSaveSettings no longer toasts; each settings UI toasts once)
  CHECK: grep -n "toast.success('Settings saved successfully')" src/App.tsx | wc -l
  EXPECT: 0
  EVIDENCE: grep count = 0 (App.tsx:865 toast removed; SettingsPage/Teacher/Admin/SettingsModal each toast once)
- [x] G302: data export reads the per-user notifications subcollection instead of the denied top-level collection, and export failures surface an error toast
  CHECK: grep -n "notifications', uid, 'items'\|Failed to export data" src/services/settingsService.ts src/App.tsx
  EXPECT: both lines present
  EVIDENCE: settingsService.ts:222 getDocs(collection(db, 'notifications', uid, 'items')); App.tsx:900 toast.error('Failed to export data')
- [x] G301: the student reset dialog names XP, level, streak, chats, battle/quiz history, progress, rewards and achievements
  CHECK: grep -n "resets your XP, level and streak" src/components/SettingsPage.tsx
  EXPECT: one match in the ConfirmModal message
  EVIDENCE: SettingsPage.tsx:1377 message now lists XP, level, streak, chats, quiz/battle history, module progress, daily rewards, achievements
- [x] G235: leaving the student Settings page reverts an unsaved preview to the saved settings
  CHECK: grep -n "savedSettingsRef" src/components/SettingsPage.tsx
  EXPECT: unmount cleanup re-applies savedSettingsRef.current
  EVIDENCE: SettingsPage.tsx:127 savedSettingsRef; :178 set on external settingsData; :185-186 unmount cleanup onApplySettingsPreview?.(savedSettingsRef.current)
- [x] G217: student Settings no longer previews through an effect that feeds back into settingsData
  CHECK: grep -n "onApplySettingsPreview?.(localSettings)" src/components/SettingsPage.tsx | wc -l
  EXPECT: 0
  EVIDENCE: grep count = 0; updateSettings previews explicitly and the sync effect skips previewedSettingsRef echoes
- [x] G303: admin "Export System Audit Trail" downloads an audit CSV built from getAuditLogs
  CHECK: grep -n "downloadAuditLogCsv" src/components/admin/AdminSettingsPage.tsx src/components/AdminAuditLog.tsx src/utils/auditLogCsv.ts
  EXPECT: helper defined once and used by both components
  EVIDENCE: auditLogCsv.ts:33 defines downloadAuditLogCsv; AdminSettingsPage.tsx:186 and AdminAuditLog.tsx:152 call it
- [x] G300: admin Academic Support and Security alert switches are loaded from and saved to notificationTypes
  CHECK: grep -n "achievements: atRiskAlerts\|newContent: securityAlerts" src/components/admin/AdminSettingsPage.tsx
  EXPECT: both present in the save payload
  EVIDENCE: AdminSettingsPage.tsx:212 newContent: securityAlerts; :213 achievements: atRiskAlerts
- [x] G253: admin Daily Digest switch loads from stored weeklySummary
  CHECK: grep -n "setDailyDigest(.*weeklySummary" src/components/admin/AdminSettingsPage.tsx
  EXPECT: one sync line
  EVIDENCE: AdminSettingsPage.tsx:103 setDailyDigest(saved.notifications?.notificationTypes?.weeklySummary ?? true)
- [x] G252: admin Discard restores saved switches and reverts the previewed theme
  CHECK: grep -n "discardChanges" src/components/admin/AdminSettingsPage.tsx
  EXPECT: used by the Discard button and the discard confirm modal
  EVIDENCE: AdminSettingsPage.tsx:173 discardChanges defined; :358 Discard button; :707 discard confirm modal
- [x] G242: teacher Discard restores saved switches and reverts the previewed theme
  CHECK: grep -n "discardChanges" src/components/teacher/TeacherSettingsPage.tsx
  EXPECT: used by the Discard button and the discard confirm modal
  EVIDENCE: TeacherSettingsPage.tsx:123 discardChanges defined; :643 Discard button; :678 discard confirm modal
- [x] G241: teacher notification switches load from notificationTypes
  CHECK: grep -n "setWeeklyDigest(.*weeklySummary\|setQuizAlerts(.*quizReminders\|setAtRiskAlerts(.*achievements" src/components/teacher/TeacherSettingsPage.tsx
  EXPECT: three sync lines
  EVIDENCE: TeacherSettingsPage.tsx:94-96 setAtRiskAlerts/setQuizAlerts/setWeeklyDigest read notificationTypes
- [x] G286: Clear Browser Cache copy no longer promises a reload
  CHECK: grep -c "Will reload the workspace" src/components/teacher/TeacherSettingsPage.tsx
  EXPECT: 0
  EVIDENCE: grep -c = 0
- [x] G-E2E: known-bug tags removed from the e2e tests for every fixed issue
  CHECK: grep -n "known-bug" tests/e2e/student/profile-settings.e2e.ts tests/e2e/teacher/profile-settings.e2e.ts tests/e2e/admin/profile-settings.e2e.ts
  EXPECT: no matches for the tests named in the fixed issues
  EVIDENCE: remaining known-bug matches are student:158, admin:88, admin:111 (profile issues owned by another lane); all 10 lane-b tests untagged
- [x] G-TSC: typecheck passes
  CHECK: npx tsc --noEmit
  EXPECT: exit 0
  EVIDENCE: npx tsc --noEmit -> TSC_EXIT=0
- [x] G-LINT: eslint passes on changed files
  CHECK: npx eslint src/App.tsx src/components/SettingsPage.tsx src/components/SettingsModal.tsx src/components/teacher/TeacherSettingsPage.tsx src/components/admin/AdminSettingsPage.tsx src/components/AdminAuditLog.tsx src/services/settingsService.ts src/utils/auditLogCsv.ts --max-warnings=0
  EXPECT: exit 0
  EVIDENCE: npx eslint <changed files> --max-warnings=0 -> ESLINT_EXIT=0
- [x] G-OX: oxlint anti-slop passes
  CHECK: npx oxlint --quiet
  EXPECT: exit 0
  EVIDENCE: npx oxlint --quiet -> OX_EXIT=0
- [x] G-VITEST: unit tests related to changed files pass
  CHECK: npx vitest run src/utils/auditLogCsv.test.ts
  EXPECT: all tests pass
  EVIDENCE: npx vitest run src/utils/auditLogCsv.test.ts src/utils/adminBugRegressions.test.ts -> Test Files 2 passed, Tests 3 passed, VITEST_EXIT=0
