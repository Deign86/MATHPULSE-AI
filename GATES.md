# Gates: Fix Teacher Create Student Account 500 Bug

Scope: Ensure POST /api/teacher/create-student-account and CreateStudentAccountModal reliably satisfy Firebase Auth password policies with proper validation, secure password generation, and clear error handling.

- [x] G1: Frontend temporary password generator produces passwords satisfying Firebase Auth policy (min 10 chars, uppercase, lowercase, digit, special character)
  CHECK: npx vitest run src/components/__tests__/CreateStudentAccountModal.test.tsx
  EXPECT: /passed/
  EVIDENCE: ✓ src/components/__tests__/CreateStudentAccountModal.test.tsx (2 tests) passed

- [x] G2: Backend validates password complexity before calling Firebase Auth and returns 400 Bad Request with informative message if policy is violated
  CHECK: node scripts/gate-check-student-account.mjs backend-validation
  EXPECT: /PASS: backend password validation/
  EVIDENCE: PASS: backend password validation

- [x] G3: Backend maps Firebase Auth password policy / format errors to 400 instead of 500
  CHECK: node scripts/gate-check-student-account.mjs error-mapping
  EXPECT: /PASS: error mapping/
  EVIDENCE: PASS: error mapping

- [x] G4: Full TypeScript typecheck and linting pass with anti-slop rules
  CHECK: node -e "const { execSync } = require('child_process'); execSync('npm run typecheck', { stdio: 'inherit' }); execSync('npx oxlint --quiet', { stdio: 'inherit' }); console.log('TYPECHECK_AND_LINT_OK');"
  EXPECT: /TYPECHECK_AND_LINT_OK/
  EVIDENCE: To eliminate this warning, add "type": "module" to C:\Users\APG\Downloads\MATHPULSE-AI\package.json. | (Use `node --trace-warnings ...` to show where the warning was created)

- [x] G5: End-to-end verification in browser via Chrome DevTools confirms successful student account creation
  EVIDENCE: Chrome DevTools evaluate_script invoked createStudentAccountFromRoster in active teacher session -> POST /api/teacher/create-student-account returned 200 OK (duration 1696ms) with uid fAPxFlwv6PML4Wk482BlKyn5T1y1 and generated password g3y8U%MJ6uRK meeting all Firebase Auth requirements


# Gates: G1a #165 Evidence cluster visibility

Scope: Keep the Inspect Evidence trigger and embedded evidence modal staff-only while leaving staff telemetry, inline staff details, and ModuleDetailView wiring unchanged.

- [x] G1a-1: RTL RED characterization proves the student trigger is currently exposed and a forced/stale open modal remains mounted
  EVIDENCE: Focused RED run failed 2 of 3 assertions before the production gate; the student Inspect Evidence trigger was exposed and the stale/modal role-switch assertions were red.

- [x] G1a-2: RTL GREEN coverage proves students have no Inspect Evidence label and no evidence modal, including after a staff-open modal is rerendered as student, while staff can see and open it
  CHECK: npm run test -- --run src/components/__tests__/LessonViewerGrounding.test.tsx --reporter=verbose
  EXPECT: /Test Files 1 passed/
  EVIDENCE: Test Files 1 passed; Tests 3 passed. Student trigger/modal absence, staff trigger/full telemetry, and staff-open-to-student stale-modal removal all passed.

- [x] G1a-3: TypeScript and anti-slop lint pass for the exact role-gating change
  CHECK: npm run typecheck && npm run lint:anti-slop && echo G1A_STATIC_GREEN
  EXPECT: /G1A_STATIC_GREEN/
  EVIDENCE: `npm run typecheck` passed; `npm run lint:anti-slop` passed with the existing Node module-type warning.

- [x] G1a-4: Full frontend Vitest suite passes without changing ModuleDetailView or staff telemetry copy
  CHECK: npm run test -- --run
  EXPECT: /Test Files .* passed|Tests .* passed/
  EVIDENCE: Full Vitest passed 49 files and 298 tests; the diff contains no `ModuleDetailView.tsx` change and preserves the staff telemetry copy.

- [ ] G1a-5: Exact Playwright manual QA records student hidden trigger, forced modal closed, and staff telemetry visible with the requested screenshot
  EVIDENCE: Partial; student `Test Student` lesson flow passed with trigger count 0 and modal heading count 0 using a controlled 200 response for the live `/api/rag/lesson` 502, screenshot saved at `.omo/evidence/fix-9-qa-issues/task-3.png`. Forced/stale state and staff telemetry pass in RTL. Live teacher login succeeded, but `/modules` intentionally renders `TeacherDashboard` and has no route to `LessonViewer`; see task-3.log. Gate remains unchecked.

- [x] G1a-6: Adversarial checks cover prompt_injection (N/A: no untrusted text), stale_state, dirty_worktree, and misleading_success_output
  EVIDENCE: Dispositions recorded in `.omo/evidence/fix-9-qa-issues/task-3.log`; live API 502 and unavailable teacher LessonViewer route were retained instead of being reported as passes.

- [ ] G1a-7: Task artifacts exist and the final commit has the requested subject
  CHECK: node -e "const fs=require('fs'); for (const f of ['.omo/evidence/fix-9-qa-issues/task-3.log','.omo/evidence/fix-9-qa-issues/task-3.png']) { if (!fs.existsSync(f)) throw new Error('missing '+f); } console.log('TASK_3_ARTIFACTS_OK')" && git log -1 --pretty=%s
  EXPECT: /TASK_3_ARTIFACTS_OK[\s\S]*fix\(lesson\): gate grounding evidence behind staff view/
  EVIDENCE: pending
