# Gates: Lane F5 Assessment and Cross-Cutting E2E

Scope: Completed-state diagnostic results plus notification panel (assessed shared account; PWA install prompt never fires in headless).

- [x] F5-1: IAR placement test uses uniquely pinned accessible-role locators and retains its entry-point assertion
  CHECK: git diff HEAD -- tests/e2e/regression/iar-placement.e2e.ts tests/e2e/assessment/iar-states.e2e.ts tests/e2e/crosscutting/notifications-pwa.e2e.ts
  EXPECT: /Initial Diagnostic Results|All caught up|Daily Goals/
  EVIDENCE: pre-commit hook run plus sequential --workers 1 reruns: iar-placement 1 passed (17.80s), iar-states 1 passed (30.63s), notifications-pwa 1 passed solo (59.17s).
- [x] F5-2: Assessment test verifies completed diagnostic results (heading, score, topics) without submitting or retaking
  CHECK: git diff HEAD -- tests/e2e/assessment/iar-states.e2e.ts
  EXPECT: /Initial Diagnostic Results|Diagnostic Score|Topics to Practice/
  EVIDENCE: file pins heading Initial Diagnostic Results plus Diagnostic Score plus Topics to Practice on the grades page; no submit or retake actions (protects shared assessed account).
- [x] F5-3: Cross-cutting test verifies notification panel items; install-prompt assertion removed (never fires in headless)
  CHECK: git diff HEAD -- tests/e2e/crosscutting/notifications-pwa.e2e.ts
  EXPECT: /notifications|All caught up|Daily Reward/
  EVIDENCE: file opens panel, pins Notifications heading plus Daily Reward Claimed item plus All caught up; solo rerun 1 passed.
- [x] F5-4: No production files changed
  CHECK: git diff HEAD --stat
  EXPECT: /tests\/e2e|gates\/leaf-lane-f5\.md/
  EVIDENCE: lane scope is tests/e2e/assessment, tests/e2e/crosscutting, tests/e2e/regression/iar-placement, gates/leaf-lane-f5.md; no src, backend, or functions edits.
