# Gates: lane c

Scope: profile pages (student / teacher / admin) issues #305 #299 #251 #250 #287 on branch fix/issues-lane-c.

- [x] G305: student Profile "Discard Changes" after Back leaves edit mode and navigates back
  CHECK: sed -n '/const handleDiscardChanges/,/^  };/p' src/components/ProfilePage.tsx | grep -c "setIsEditMode(false)\|onBack?.()"
  EXPECT: 2
  EVIDENCE: 2
- [x] G299: admin Profile "Discard Changes" navigates back only when the dialog was opened from Back
  CHECK: grep -ci "leaveAfterDiscard" src/components/admin/AdminProfilePage.tsx
  EXPECT: 6 (state, handler reads + resets, Back sets true, Discard button sets false, onClose resets)
  EVIDENCE: 6
- [x] G251: admin profileData carries lrn / position / department after reload
  CHECK: sed -n '/const profileData = useMemo/,/computedGpa, profileOverrides\]);/p' src/App.tsx | grep -c "adminProfile.lrn\|adminProfile.position\|adminProfile.department"
  EXPECT: 3
  EVIDENCE: 3
- [x] G250: admin Office / Department is bound to department, not school
  CHECK: grep -c "handleFieldChange('school'" src/components/admin/AdminProfilePage.tsx; grep -c "handleFieldChange('department'" src/components/admin/AdminProfilePage.tsx
  EXPECT: 0 then 1
  EVIDENCE: 0 then 1
- [x] G287: teacher Faculty / Teacher ID is read-only (lrn is admin-only per firestore.rules protectedProfileFieldsWriteAllowed), so Save no longer reports a success for a value that is dropped
  CHECK: grep -c "handleFieldChange('lrn'" src/components/teacher/TeacherProfilePage.tsx
  EXPECT: 0
  EVIDENCE: 0
- [x] G-E2E: known-bug tags removed from the admin (#299, #250) and student (#305) profile tests
  CHECK: grep -c "known-bug" tests/e2e/admin/profile-settings.e2e.ts tests/e2e/student/profile-settings.e2e.ts
  EXPECT: admin 3 (was 5), student 4 (was 5)
  EVIDENCE: tests/e2e/admin/profile-settings.e2e.ts:3 / tests/e2e/student/profile-settings.e2e.ts:4
- [x] G-TSC: typecheck passes
  CHECK: npx tsc --noEmit
  EXPECT: exit 0, no output
  EVIDENCE: tsc exit 0 (no output)
- [x] G-LINT: eslint passes on changed files
  CHECK: npx eslint src/App.tsx src/components/ProfilePage.tsx src/components/admin/AdminProfilePage.tsx src/components/teacher/TeacherProfilePage.tsx --max-warnings=0
  EXPECT: exit 0
  EVIDENCE: eslint exit 0
- [x] G-OX: oxlint anti-slop passes
  CHECK: npx oxlint --quiet
  EXPECT: exit 0
  EVIDENCE: oxlint exit 0
- [x] G-VITEST: suites covering changed files pass
  CHECK: npx vitest run src/App.test.tsx src/components/ProfileModal.test.tsx
  EXPECT: all passed
  EVIDENCE: Test Files 2 passed (2) / Tests 3 passed (3). Note: in this worktree the stock config fails every suite at load ("Cannot find module '/@fs/C:/Users/APG/Downloads/MATHPULSE-AI/node_modules/@testing-library/jest-dom/dist/vitest.mjs'", node_modules is a junction into the main checkout; an untouched suite fails identically); run with a temporary config adding server.fs.allow for the main checkout, removed afterwards.
