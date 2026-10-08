# Gates: lane e

Scope: Fix issues #284 #238 #237 #236 #211 #285 #243 (teacher dashboard, calendar, intervention) with the smallest root-cause change each; untag the matching known-bug e2e tests; no e2e runs.

- [x] G284: Back to Classes in Student Competency shows the class picker; the table opens scoped to the effective class.
  CHECK: grep -n "competencyPickerOpen" src/components/TeacherDashboard.tsx
  EXPECT: state declared, set true in onBack, set false in onSelectClass, and used in both competency render conditions
  EVIDENCE: `grep` hits lines 1717 (state), 2227 (table renders only when `!competencyPickerOpen`), 2242 (picker renders when `!effectiveAnalyticsClass || competencyPickerOpen`); onBack sets it true, onSelectClass sets it false.

- [x] G238: Assign in Export Materials calls assignQuizToStudent and only reports success after the write resolves.
  CHECK: grep -n "assignQuizToStudent" src/components/TeacherDashboard.tsx
  EXPECT: import line plus an awaited call inside InterventionView's assign handler
  EVIDENCE: line 92 imports `assignQuizToStudent`; line 4602 `await assignQuizToStudent(quiz.id, assignedUid, teacherId)` inside `handleAssignBankQuiz`, with the success toast after the await and an error toast in catch.

- [x] G237: Drawer mini calendar leading padding is Monday-first.
  CHECK: grep -n "getFirstDayOfMonth = " src/components/TeacherDashboard.tsx
  EXPECT: line contains "(getDay() + 6) % 7"
  EVIDENCE: line 7080: `getFirstDayOfMonth = (date: Date) => (new Date(...).getDay() + 6) % 7`.

- [x] G236: The xs breakpoint exists so xs: utilities apply (risk pills, calendar weekday headers, Audit Log labels).
  CHECK: grep -n "breakpoint-xs" src/styles/globals.css
  EXPECT: --breakpoint-xs declared inside a @theme block
  EVIDENCE: src/styles/globals.css line 7: `--breakpoint-xs: 30rem;` inside `@theme { }`; all `xs:` utilities in TeacherDashboard, TeacherCalendarView and AdminAuditLog now compile without touching their class strings.

- [x] G211: Intervention view without a selected student lists at-risk students or says none are at risk.
  CHECK: grep -n "activeView === 'intervention' && !selectedStudent" src/components/TeacherDashboard.tsx
  EXPECT: a render branch exists for the no-student case
  EVIDENCE: line 2157: `activeView === 'intervention' && !selectedStudent` renders `ToolsPlaceholderView` "No students at risk" when `totalAtRisk === 0`, else a `StudentCard` grid of `riskLevel === 'high'` students wired to `handleViewStudent`.

- [x] G285: openAdd and openEdit clear the stale error.
  CHECK: awk '/const openAdd = /,/^  };/' src/components/TeacherCalendarView.tsx | grep -c "setError('')"
  EXPECT: 1
  EVIDENCE: awk/grep count = 1 in openAdd (and openEdit also calls `setError('')`).

- [x] G243: Editing a class-schedule entry hides it only after the replacement event is saved; Cancel leaves it visible.
  CHECK: awk '/const openEdit = /,/^  };/' src/components/TeacherCalendarView.tsx | grep -c "setHiddenScheduleIds"
  EXPECT: 0
  EVIDENCE: awk/grep count = 0; `openEdit` now stores `editingScheduleId`, and `handleSave` adds it to `hiddenScheduleIds` only after `createCalendarEvent` resolves.

- [x] G-E2E: known-bug tags removed from the e2e tests named in the fixed issues.
  CHECK: grep -c "known-bug" tests/e2e/teacher/topic-mastery-competency.e2e.ts tests/e2e/teacher/teacher-dashboard.e2e.ts tests/e2e/teacher/interventions-import.e2e.ts tests/e2e/teacher/schedule-calendar.e2e.ts tests/e2e/admin/analytics-audit.e2e.ts
  EXPECT: 0 for all but analytics-audit.e2e.ts, which keeps 1 (unrelated issue at line 87)
  EVIDENCE: grep -c: topic-mastery-competency 0, teacher-dashboard 0, interventions-import 0, schedule-calendar 0, analytics-audit 1 (line 87, issue outside this lane).

- [x] G-TSC: Type check passes.
  CHECK: npx tsc --noEmit
  EXPECT: exit 0, no output
  EVIDENCE: `npx tsc --noEmit` printed nothing, TSC_EXIT=0 (re-run after the final calendar edit).

- [x] G-LINT: ESLint passes on changed files with zero warnings.
  CHECK: npx eslint src/components/TeacherDashboard.tsx src/components/TeacherCalendarView.tsx --max-warnings=0
  EXPECT: exit 0
  EVIDENCE: `npx eslint src/components/TeacherDashboard.tsx src/components/TeacherCalendarView.tsx --max-warnings=0` ESLINT_EXIT=0.

- [x] G-OX: oxlint anti-slop passes.
  CHECK: npx oxlint --quiet
  EXPECT: exit 0
  EVIDENCE: `npx oxlint --quiet` OX_EXIT=0 (only the MODULE_TYPELESS_PACKAGE_JSON node warning on stderr).

- [x] G-VITEST: Unit suites related to the changed files run.
  CHECK: npx vitest run src/components/TeacherCalendarView.test.tsx src/components/TeacherDashboard.regression.test.tsx src/components/__tests__/TeacherDashboardClassCounts.test.ts src/services/__tests__/quizService.test.ts
  EXPECT: every suite that can load passes
  EVIDENCE: TeacherDashboard.regression.test.tsx and quizService.test.ts passed (Tests 16 passed). TeacherCalendarView.test.tsx and TeacherDashboardClassCounts.test.ts fail at setup with `Cannot find module .../@testing-library/jest-dom/dist/vitest.mjs`; the installed jest-dom dist has no vitest.mjs, and the same two suites fail identically with this lane's changes stashed (pre-existing, needs a dependency install that this lane may not run).
