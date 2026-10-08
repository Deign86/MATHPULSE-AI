# Gates: lane d1

Scope: issues #293 #292 #291 #290 #248 #289 #288 #244 #245 (admin analytics, audit log KPIs, user management, admin user search backend).

- [x] G293: Audit Log KPI trends and bars derive from loaded logs, no literal percentages
  CHECK: grep -nE "'\+18\.4%'|'\+12\.1%'|progressPercent: 84|progressPercent: 65" src/components/AdminAuditLog.tsx
  EXPECT: no matches (exit 1)
  EVIDENCE: grep exit 1 (no literal trends); trend: `${filteredLogs.length} shown` / `${adminSharePercent}% of events`, progressPercent from log counts
- [x] G292: Analytics summary failure surfaces an error with a Retry button instead of silent zeros
  CHECK: grep -nE "summaryError|Retry" src/components/AdminAnalytics.tsx; grep -n "catch (err)" -A 3 src/services/adminService.ts | grep -n "throw err"
  EXPECT: component keeps error state and renders Retry; getAnalyticsSummary rethrows
  EVIDENCE: AdminAnalytics.tsx:40 summaryError state, :320 role="alert" banner, :331 Retry button; adminService.ts:1230 `throw err;`
- [x] G291: Score-by-range chart draws a visible marker and the axis spans 0-100
  CHECK: grep -nE "domain=\{\[0, 100\]\}|dot=\{" src/components/AdminAnalytics.tsx
  EXPECT: YAxis domain 0-100 and Area series with dot props
  EVIDENCE: AdminAnalytics.tsx:509 domain={[0, 100]}; :537 dot={{ r: 5, ... }}; :547 dot={{ r: 3, ... }}
- [x] G290: Manage Sections is a button that navigates to Class Management
  CHECK: grep -n "onManageSections" src/components/AdminAnalytics.tsx src/components/AdminDashboard.tsx
  EXPECT: prop declared and wired to handleTabChange('Class Management')
  EVIDENCE: AdminAnalytics.tsx:35 onManageSections prop, :755 <button onClick={onManageSections}>; AdminDashboard.tsx:1298 onManageSections={() => handleTabChange('Class Management')}
- [x] G248: No hard-coded subject/class/weekly figures or static captions remain
  CHECK: grep -nE "SUBJECT_LIST|TOP_CLASSES|WEEKLY_ACTIVITY|Peak Comprehension|2,955|575 student sessions|Prof\. M\. Santos|\+34%" src/components/AdminAnalytics.tsx
  EXPECT: no matches (exit 1); weekly chart computed from summary.quizAttempts
  EVIDENCE: grep count 0; AdminAnalytics.tsx:100 weeklyActivity useMemo over summary.quizAttempts, :786 BarChart data={weeklyActivity}; subject/class panels replaced by "not available yet" notices
- [x] G289: Role filter trigger and chip show Administrator/Educator labels
  CHECK: grep -nE "Role: \{roleFilterLabel\}|\{roleFilterLabel\}" src/components/AdminUserManagement.tsx; grep -n "Role: Educator" tests/e2e/admin/admin-console.e2e.ts
  EXPECT: label used in both triggers and the chip; e2e asserts Role: Educator
  EVIDENCE: AdminUserManagement.tsx:1077,1138 {roleFilterLabel}; :1195 Role: {roleFilterLabel}; admin-console.e2e.ts:149,156 Role: Educator
- [x] G288: Empty-state Reset Filters clears section, page and selection too
  CHECK: grep -n "Reset Filters" -B 10 src/components/AdminUserManagement.tsx | grep -cE "setSectionFilter\('All Sections'\)|setCurrentPage\(1\)|clearSelection\(\)"
  EXPECT: 3
  EVIDENCE: grep -c => 3 (setSectionFilter, setCurrentPage(1), clearSelection in Reset Filters onClick)
- [x] G244: Admin user search matches LRN
  CHECK: PYTHONPATH=backend python -X utf8 -m pytest backend/tests -q -k "admin or user" 2>&1 | tail -3
  EXPECT: passed, including test_filter_admin_user_records_matches_lrn
  EVIDENCE: 74 passed, 526 deselected in 61.67s; test_filter_admin_user_records_matches_lrn fails on stashed main.py (assert [] == ['student-b']), passes with fix
- [x] G245: Admin user list scan window no longer depends on page/pageSize
  CHECK: grep -n "scan_limit" backend/main.py; pytest (G244) includes test_get_admin_users_search_total_is_independent_of_page_size
  EXPECT: scan_limit=ADMIN_USERS_MAX_SCAN_DOCS; test passes
  EVIDENCE: backend/main.py:6958 scan_limit=ADMIN_USERS_MAX_SCAN_DOCS; test_get_admin_users_search_total_is_independent_of_page_size fails on old code (assert [0, 1, 1] == [1, 1, 1]), passes with fix
- [x] G-E2E: known-bug tags removed from fixed issues' e2e tests
  CHECK: grep -n "known-bug" tests/e2e/admin/analytics-audit.e2e.ts tests/e2e/admin/admin-console.e2e.ts
  EXPECT: only the Export button accessible-name test (another lane) remains tagged
  EVIDENCE: only analytics-audit.e2e.ts:256 (Export button accessible name, other lane) still tagged known-bug
- [x] G-TSC: npx tsc --noEmit
  CHECK: npx tsc --noEmit
  EXPECT: exit 0
  EVIDENCE: tsc exit 0
- [x] G-LINT: eslint on changed files
  CHECK: npx eslint src/components/AdminAnalytics.tsx src/components/AdminAuditLog.tsx src/components/AdminUserManagement.tsx src/components/AdminDashboard.tsx src/services/adminService.ts --max-warnings=0
  EXPECT: exit 0
  EVIDENCE: eslint exit 0
- [x] G-OX: npx oxlint --quiet
  CHECK: npx oxlint --quiet
  EXPECT: exit 0
  EVIDENCE: oxlint exit 0
- [x] G-VITEST: related unit tests pass
  CHECK: npx vitest run src/components/AdminUserManagement.regression.test.tsx
  EXPECT: all passed
  EVIDENCE: Test Files 1 passed (1), Tests 2 passed (2)
- [x] G-PY: backend admin/user tests pass
  CHECK: PYTHONPATH=backend python -X utf8 -m pytest backend/tests -q -k "admin or user"
  EXPECT: 0 failed
  EVIDENCE: 74 passed, 526 deselected, 1 warning in 61.67s
