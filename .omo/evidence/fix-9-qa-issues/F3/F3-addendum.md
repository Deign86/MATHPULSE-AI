# F3 Local-proof Addendum

Date: 2026-09-21  
Source summary: `.omo/evidence/fix-9-qa-issues/F3/F3-summary.md`  
Scope: Reconcile the earlier production-deploy observations with the existing local GREEN receipts.  
Method: Existing-log compilation only. No full suite, server, browser, Playwright, or live-deploy retest was run for this addendum.

## Local APPROVE proof ledger

| Surface | Existing local GREEN proof | Artifact path(s) |
| --- | --- | --- |
| Notification panel stacking and pointer handling | **13 tests** passed; computed panel z-index **250 > 100** battle overlay; mark-read probe recorded `clickCount=1`; outside mousedown closed the panel. | `.omo/evidence/fix-9-qa-issues/task-1.log`<br>`.omo/evidence/fix-9-qa-issues/task-1.png` |
| Mark-all-read persistence | **23 tests** passed across the focused notification specs; readback, rollback merge, and **2 chunks** for 600 documents are recorded. | `.omo/evidence/fix-9-qa-issues/task-2.log` |
| Student lesson evidence visibility | **3/3 RTL** passed: students have no evidence trigger/modal, while staff retains the evidence telemetry; stale staff-open modal state is removed on student rerender. | `.omo/evidence/fix-9-qa-issues/task-3.log`<br>`.omo/evidence/fix-9-qa-issues/task-3.png` |
| Study Journey completion fallback | **2/2** passed: missing `subjectId` falls back to `gen-math`, emits `console.warn`, persists, and reads progress back; forced persistence failure still permits XP/navigation. | `.omo/evidence/fix-9-qa-issues/task-4.log` |
| Quiz Battle completed-match XP refresh | **4/4 local checks** recorded for the delayed refresh: the header held at **100 XP**, then updated to **150 XP** without reload after the profile write resolved; the production build passed. | `.omo/evidence/fix-9-qa-issues/task-5.log`<br>`.omo/evidence/fix-9-qa-issues/task-5.png` |
| Teacher class-switcher count | **3/3** passed: stale `0` was ignored, 12 resolved members produced 12, and removing one member changed the count **12 → 11** without a ratchet. | `.omo/evidence/fix-9-qa-issues/task-6.log`<br>`.omo/evidence/fix-9-qa-issues/task-6-gates.md` |
| Grades lazy PDF utility | **3/3** focused tests passed; the manual fixture produced **122110B** (`122110 bytes`) across **4 pages**, and the production build/lazy-bundle checks passed. | `.omo/evidence/fix-9-qa-issues/task-7.log` |
| Grades CSV/PDF export toggle | **5/5** passed: format toggle, legacy CSV bytes/filename, PDF routing/filename, row shaping, empty-state behavior, and failure toast are covered by the local spec. | `.omo/evidence/fix-9-qa-issues/task-8.log`<br>`.omo/evidence/fix-9-qa-issues/task-8.png` |
| Student ID QR payload and `/verify` contract | **4/4 (4 tests)** passed; pixel extraction and `jsQR` decoded exactly `https://mathpulse-ai-2026.web.app/verify/uid-fixture-169?src=id_card`, with valid, blank-UID, and revoked outcomes covered. | `.omo/evidence/fix-9-qa-issues/task-9.log` |
| Student ID card QR rendering/link | **4/4 (4 tests)** passed; exact href/target, barcode absence, and missing-UID fallback are covered. The full local Vitest receipt is **51 files / 307 tests** passed. | `.omo/evidence/fix-9-qa-issues/task-10.log`<br>`.omo/evidence/fix-9-qa-issues/task-10.png` |
| Sidebar tween and reduced motion | **2/2** passed: width-only tween/ease contract, preserved active-indicator `layoutId`, and reduced-motion duration `0` are covered. | `.omo/evidence/fix-9-qa-issues/task-11.log` |

## F3 live-result reconciliation

The original F3 summary tested `https://mathpulse-ai-2026.web.app` before the relevant local commits were deployed. Its live FAILs therefore describe the older deployment, not the current checked-in behavior represented by the receipts above.

| F3 summary surface | Local disposition | Live-deploy exception |
| --- | --- | --- |
| Student lesson: no evidence button | **LOCAL-APPROVE** — task 3 RTL role-gating and staff telemetry proof. | No exception needed for the local verdict. |
| Study Journey persistence after reload | **LOCAL-APPROVE** — task 4 fallback persistence/readback proof. | The live FAIL is deploy-old; local mock persistence/readback is green. No live retest was run. |
| Grades CSV export | **LOCAL-APPROVE** — task 8 legacy CSV contract proof. | No exception needed for the local verdict. |
| Grades PDF export | **LOCAL-APPROVE** — task 7 utility plus task 8 toggle proof. | The live page still lacked the new control; **redeploy is required** before claiming live PDF confirmation. |
| In-match panel | **LOCAL-APPROVE** — task 1 layering/pointer proof and task 5 completed-match regression receipt. | No exception needed for the local verdict. |
| Notification mark-read persistence | **LOCAL-APPROVE** — task 1 click guard plus task 2 readback/rollback proof. | The live FAIL is deploy-old; local mock readback/rollback is green. No live retest was run. |
| Student Pass QR to `/verify` | **LOCAL-APPROVE** — task 9 decoded payload/contract and task 10 card/link proof. | The live QR/route observation is deploy-old; **redeploy is required** before claiming live QR/verify confirmation. |
| Sidebar tween and reduced motion | **LOCAL-APPROVE** — task 11 **2/2** proof. | No exception needed for the local verdict. |
| XP and counts live update | **LOCAL-APPROVE** — task 5 delayed **100 → 150 XP** proof plus task 6 **12 → 11** count proof. | The live FAIL is deploy-old; local regression/mock proofs are green. No live retest was run. |

## Verdict

**APPROVE (local)**

The PDF and QR live observations remain redeploy-required exceptions. The live mark-read, Study Journey, and XP/count observations remain deploy-old exceptions with green local mock/regression evidence. This addendum does not claim a new production-deploy result.
