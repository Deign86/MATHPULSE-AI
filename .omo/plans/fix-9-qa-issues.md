# fix-9-qa-issues - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** All nine reported glitches fixed in one pass — lessons stop leaking staff-only details and stop losing progress, grade reports download as PDF too, notifications stay reachable and stay read, the student ID finally scans, and XP plus class sizes update live.

**Why this approach:** Fix the blocking interactive bugs first, derive live numbers from data already on screen instead of migrating counters, and reuse the proven export pattern with a proper table helper.

**What it will NOT do:** It won't touch the AI models, login/permissions, database rules, or redesign any screen — only the nine fixes plus their regression tests.

**Effort:** Large
**Risk:** Medium - eleven parallel fixes across lessons, notifications, reporting, and identity, plus two small new libraries.
**Decisions to sanity-check:** Scannable ID uses a short verify link carrying only the student ID; grade export gains a format toggle; sidebar uses a quick gentle slide that disables on reduced-motion.

Your next move: start work now, or run a high-accuracy review first? Full execution detail follows below.

---

> TL;DR (machine): Large effort, medium risk; 11 fixes ship lessons/notifications/grades/identity/sidebar + F1-F4 evidence.

## Scope
### Must have
- #165 gate Inspect Evidence cluster + modal behind isStaffView (LessonViewer.tsx:1499-1513 button, 1764-72 modal root, 1803-09/1814/1927-71 branches, 1647-48 inline precedent; ModuleDetailView.tsx:416-429 props).
- #171 fallback subjectId derivation + no-silent-skip logging + persist via completeLesson path (ModuleDetailView.tsx:107-113 derive, 195-198/212-230 fallbacks, 338-362 guard; useModuleProgress.ts:24).
- #166 CSV+PDF toggle on GradesPage (GradesPage.tsx:450-511 handler, 570-76 button) via lazy jspdf + jspdf-autotable; fixed layout (header banner, subject table, quiz table, footer Page X of Y), filenames grade-report-STUDENT-DATE.pdf/.csv, empty-state + error handling.
- #167 panel reachable in-match: panel z-[250] + backdrop z-[240] (NotificationPanel.tsx:38-47/127), battle in-match z-[100] (QuizBattlePage.tsx:2021) and victory modal z-[200] (2198) stay below panel; App header z-30 unchanged.
- #168 mark-read fires reliably: panel-inclusive outside-click (NotificationBell.tsx:15-30 + panelRef), catch field-less docs (notificationFirestoreService.ts:144-167), chunk batches >500, race-safe rollback (NotificationContext.tsx:78-91).
- #169 scannable QR: qrcode.react QRCodeSVG (level M, marginSize 4) encoding https://APP-HOST/verify/STUDENT-UID?src=id_card; barcode disposition: keep decorative bars OR remove (plan specifies remove barcode, keep QR only); invalid/revoked ID shows error state, no PII beyond uid in payload.
- #170 sidebar tween duration 0.2 easeInOut + will-change on width transition only, layoutId indicator kept, prefers-reduced-motion respected (Sidebar.tsx; App.tsx h-dvh untouched; SettingsPage sticky untouched).
- #172 await refreshProfile() on every match-completed path (QuizBattlePage.tsx:1491/1526/1620/1654) after finalizeCompletedMatch XP write; AuthContext profile is header source.
- #173 dropdown derives live count per class from in-memory resolved students (managedStudents join, same source as student list) with backend len(student_summaries) (class_analytics_engine.py:168) as analytics truth; remove Math.max ratchet (TeacherDashboard.tsx:490) so removals decrement.
### Must NOT have (guardrails, anti-slop, scope boundaries)
- No RAG/model/routing changes, no Firestore rules migration, no new auth flows, no schema migration (field-less docs handled on read path only).
- No QR backend redesign beyond /verify read contract; no notification schema migration; no export redesign beyond CSV/PDF toggle; no App/Settings layout restyle beyond sidebar transition prop.

## Verification strategy
> Zero human intervention - all verification is agent-executed (browser steps run by agent via Playwright/Chrome DevTools, never by hand).
- Test decision: tests-after + framework Vitest (frontend) + pytest (backend analytics touch, if any); agent-executed happy + failure QA per todo.
- Commands: npm run typecheck | npm run lint | npm run lint:anti-slop | npm run test -- grades.spec.ts | npm run build; backend: npm run check:backend:quick (only if backend touched; G6 analytics read-only so likely skip).
- Evidence: .omo/evidence/fix-9-qa-issues/task-N.log/png (vitest log, tsc log, screenshot, curl/body). Executor resolves attemptDir=.omo/evidence/fix-9-qa-issues/.

## Execution strategy
### Parallel execution waves
- Wave 1 (blocking/interactive, 6 parallel): todos 1-6 (G3a, G3b, G1a, G1b, G6a, G6b). No inter-dependencies; distinct files except G3a/G3b share notifications dir (different files, safe parallel; G3b test run after G3a file write to avoid vitest cache clash — sequence test execution, not code).
- Wave 2 (reporting/identity/cosmetic, 5 parallel): todos 7-11 (G2a, G2b, G4a, G4b, G5). G4b depends on G4a contract (run G4a first within wave); G2b depends on G2a export util (run G2a first within wave); others parallel.
- Final wave: F1-F4 parallel after ALL todos green.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| 1 G3a stacking/click | none | F1-F4 | 2,3,4,5,6 |
| 2 G3b mark-read | none (test-sequenced after 1) | F1-F4 | 1,3,4,5,6 |
| 3 G1a gating | none | F1-F4 | 1,2,4,5,6 |
| 4 G1b persistence | none | F1-F4 | 1,2,3,5,6 |
| 5 G6a XP | none | F1-F4 | 1,2,3,4,6 |
| 6 G6b count | none | F1-F4 | 1,2,3,4,5 |
| 7 G2a pdf util | none | 8, F1-F4 | 9,11 (G4a/G5); 8 and 10 wait |
| 8 G2b toggle | 7 | F1-F4 | 9,10,11 after 7 done |
| 9 G4a QR contract | none | 10, F1-F4 | 7,8,11 |
| 10 G4b card render | 9 | F1-F4 | 8,11 after 9 done |
| 11 G5 sidebar | none | F1-F4 | 7,8,9,10 |

## Todos
> Implementation + Test = ONE todo. Never separate.
- [ ] 1. G3a #167 panel stacking + outside-click (#167)
  What to do: Panel z-[250] + backdrop z-[240] in NotificationPanel.tsx:38-47; Bell outside-check includes panelRef (portaled node) so mousedown inside panel does NOT close; panelRef mousedown self-guard kept; no header/battle layout change. Must NOT do: no z change to QuizBattlePage/App header; no behavior change to notification content.
  Parallelization: Wave 1 | Blocked by: none | Blocks: F1-F4
  References: src/features/notifications/NotificationPanel.tsx:23-33/38-47/127-128; src/features/notifications/NotificationBell.tsx:15-30/35-54; src/App.tsx:1217/1263; src/components/QuizBattlePage.tsx:2021/2198
  Acceptance criteria: vitest panel suite green; agent Playwright: open lobby → open panel → start match overlay → assert panel visible above overlay (z computed >100); click inside panel does not close; click outside closes.
  QA scenarios: happy — Playwright open panel in-match, assert visible + clickable (screenshot). failure — mousedown on Mark-read fires click (no pre-close); outside mousedown closes. Evidence .omo/evidence/fix-9-qa-issues/task-1.{log,png}
  Commit: Y | fix(notifications): panel above battle layer and portal-aware outside-click
- [ ] 2. G3b #168 mark-read query + batch + rollback (#168)
  What to do: markAllAsRead catches docs missing isRead/legacy read (treat as unread → update), chunks writeBatch at 450 ops, guards double-trigger, rollback merges instead of clobbering interim snapshots (prev merge by id). Must NOT do: no schema migration, no rules change, no role-scope expansion (raw collection query kept).
  Parallelization: Wave 1 (test-sequenced after 1) | Blocked by: none | Blocks: F1-F4
  References: src/features/notifications/notificationFirestoreService.ts:144-167 (query/batch), :54-58 readNotificationFlag; src/features/notifications/NotificationContext.tsx:60-63/78-91
  Acceptance criteria: vitest markAllAsRead suite green incl. field-less doc, >500 batch (mock 600), concurrent-arrival-during-write cases; npm run typecheck clean.
  QA scenarios: happy — seed 3 unread (1 field-less) → markAllAsRead → all isRead true (firestore readback). failure — forced batch throw → UI merges (no lost interim notification); 600-doc run commits in 2 chunks. Evidence .omo/evidence/fix-9-qa-issues/task-2.log
  Commit: Y | fix(notifications): mark-all-read covers legacy docs with chunked race-safe rollback
- [ ] 3. G1a #165 gate Evidence cluster + modal behind isStaffView (#165)
  What to do: Gate Inspect Evidence button (LessonViewer.tsx:1499-1513) + modal root (1764-72) behind isStaffView (1148-50); students see neither button nor modal; staff branch unchanged (telemetry); inline details gate (1647-48) kept as precedent. Must NOT do: no copy change to staff telemetry; no ModuleDetailView prop change beyond visibility passthrough if needed.
  Parallelization: Wave 1 | Blocked by: none | Blocks: F1-F4
  References: src/components/LessonViewer.tsx:1148-1150/1499-1513/1647-1648/1764-1772/1803-09/1814/1927-71; src/components/ModuleDetailView.tsx:416-429
  Acceptance criteria: vitest/RTL: student role → queryByLabel Inspect Evidence null; staff → visible; modal never mounts for student even with showEvidenceModal forced.
  QA scenarios: happy — Playwright login student → lesson → assert no Inspect button (screenshot). failure — direct state force → modal stays closed for student; staff still sees telemetry. Evidence .omo/evidence/fix-9-qa-issues/task-3.{log,png}
  Commit: Y | fix(lesson): gate grounding evidence behind staff view
- [ ] 4. G1b #171 subjectId fallback + persist without silent skip (#171)
  What to do: Derive fallback id when module.subjectId missing and parent lookup fails (slug/id map, deterministic); keep useMemo deps correct; replace silent skip in handleComplete (339) with warn log + fallback persist; keep sequential awaits (343/351). Must NOT do: no progress schema change; no XP/navigation change.
  Parallelization: Wave 1 | Blocked by: none | Blocks: F1-F4
  References: src/components/ModuleDetailView.tsx:107-113/195-198/212-230/338-362/382; src/hooks/useModuleProgress.ts:24; LessonViewer onComplete/onProgressUpdate props
  Acceptance criteria: vitest: unresolvable-subject module completes → completeLesson called with fallback id + console.warn emitted; Study Journey Lessons/percent update after reload (mocked progress readback).
  QA scenarios: happy — finish lesson on fallback module → progress persists (firestore mock). failure — forced persist throw → error logged, XP/navigation still proceed, no silent skip. Evidence .omo/evidence/fix-9-qa-issues/task-4.log
  Commit: Y | fix(journey): persist lesson completion with fallback subject id
- [ ] 5. G6a #172 refreshProfile on vs-AI completed (#172)
  What to do: await refreshProfile() after refreshBattleInsights on every completed path (QuizBattlePage.tsx:1491/1526/1620/1654) once finalizeCompletedMatch XP write resolves; guard unmounted; no AuthContext shape change. Must NOT do: no onSnapshot addition; no XP formula change.
  Parallelization: Wave 1 | Blocked by: none | Blocks: F1-F4
  References: src/components/QuizBattlePage.tsx:1491/1526/1620/1654; functions quizBattleApi finalizeCompletedMatch (users currentXP/totalXP); src/contexts/AuthContext (profile load + refreshProfile)
  Acceptance criteria: vitest/RTL: completed match → refreshProfile called once with fresh XP; header XP text updates without reload.
  QA scenarios: happy — Playwright complete vs-AI → header XP increments (screenshot before/after). failure — XP write delayed → header updates after resolve, no stale stick. Evidence .omo/evidence/fix-9-qa-issues/task-5.{log,png}
  Commit: Y | fix(battle): refresh profile XP on match completed
- [ ] 6. G6b #173 live dropdown count, remove ratchet (#173)
  What to do: Class switcher label (TeacherDashboard.tsx:3251-55) reads live per-class count from resolved students (managedStudents join already backing student list), not classrooms.studentCount; delete Math.max ratchet (:490/522) so removals decrement; keep student_summaries listener (2921-45) + backend len(student_summaries) (:168 engine) as analytics truth. Must NOT do: no studentService counter migration; no backend change.
  Parallelization: Wave 1 | Blocked by: none | Blocks: F1-F4
  References: src/components/TeacherDashboard.tsx:490/522/2921-2945/3251-3255; src/services/studentService.ts:1064/1103-1160/1620-1748; backend/services/class_analytics_engine.py:138-140/164-181
  Acceptance criteria: vitest: 12-member class shows 12; remove 1 → 11; classroom doc stale 0 ignored.
  QA scenarios: happy — Test Class dropdown reads 12 (screenshot). failure — reassign away → count decrements, analytics agree with backend truth. Evidence .omo/evidence/fix-9-qa-issues/task-6.{log,png}
  Commit: Y | fix(teacher): derive class counts live and drop stale ratchet
- [ ] 7. G2a #166 PDF export util via jspdf-autotable (#166)
  What to do: Add lazy PDF util (Promise.all import jspdf + jspdf-autotable) mirroring TeacherDashboard precedent (banner/checkPage/splitTextToSize/footers) with autoTable head/body + lastAutoTable.finalY chaining; add jspdf-autotable dep (pin version, verify license/build); register in package.json. Must NOT do: no GradesPage UI change in this todo; no CSV logic change.
  Parallelization: Wave 2 | Blocked by: none | Blocks: 8, F1-F4
  References: src/components/GradesPage.tsx:450-511; src/components/TeacherDashboard.tsx:4578-4780; package.json:48/50 (html2canvas/jspdf)
  Acceptance criteria: npm run build green with new dep; vitest pdf util: multi-page fixture → correct pages + footer numbering; bundle lazy (no jspdf in initial chunk — assert dynamic import present).
  QA scenarios: happy — export fixture → PDF bytes + 2+ pages. failure — empty rows → single-page PDF with empty-state line, no throw. Evidence .omo/evidence/fix-9-qa-issues/task-7.log
  Commit: Y | feat(grades): lazy pdf export util with autotable
- [ ] 8. G2b #166 CSV/PDF toggle + filenames + errors (#166)
  What to do: GradesPage toggle (CSV|PDF) reusing handleExportReport data shaping; filenames grade-report-ANA-CRUZ-20260921.csv/.pdf; empty-grades message; download failure toast; button row keeps single-row layout (570-76 extended, not redesigned). Must NOT do: no table column redesign; no TeacherDashboard change.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: F1-F4
  References: src/components/GradesPage.tsx:450-511/570-576; todo 7 util
  Acceptance criteria: vitest: toggle renders both options; CSV bytes == legacy shape; PDF path calls util with same rows; failure mock shows toast.
  QA scenarios: happy — Playwright click PDF → download .pdf (screenshot + file exists). failure — empty grades → PDF with empty-state; blocked download → error toast. Evidence .omo/evidence/fix-9-qa-issues/task-8.{log,png}
  Commit: Y | feat(grades): csv-pdf export toggle
- [ ] 9. G4a #169 QR payload + verify contract + dep (#169)
  What to do: Add qrcode.react dep (pin, license/build check); define contract: payload https://APP-HOST/verify/STUDENT-UID?src=id_card (uid only, no PII), level M, marginSize 4, size 192, title; /verify route spec: valid → profile summary, invalid/revoked → error state. Must NOT do: no barcode change here; no auth/session change.
  Parallelization: Wave 2 | Blocked by: none | Blocks: 10, F1-F4
  References: src/components/StudentIDCard.tsx:17-88; src/pages or routes verify entry (executor locates); SettingsPage.tsx:379
  Acceptance criteria: vitest: payload builder exact URL for fixture uid/host; invalid uid → error contract; dep present + build green.
  QA scenarios: happy — payload URL scans (decode assert). failure — revoked uid → error state, no profile leak. Evidence .omo/evidence/fix-9-qa-issues/task-9.log
  Commit: Y | feat(id): qr payload contract and qrcode dep
- [ ] 10. G4b #169 card render QR + remove barcode (#169)
  What to do: StudentIDCard renders QRCodeSVG per contract, removes StudentBarcodeSVG block (keep layout/spacing), CuteMiniQRSVG deleted; click → opens verify URL (new tab) + a11y title; SettingsPage render unchanged. Must NOT do: no profile data change; no new card redesign.
  Parallelization: Wave 2 | Blocked by: 9 | Blocks: F1-F4
  References: src/components/StudentIDCard.tsx:17-88; src/pages/SettingsPage.tsx:379 (render site); todo 9 contract
  Acceptance criteria: vitest/RTL: QR svg encodes exact contract URL; barcode nodes absent; click opens verify URL.
  QA scenarios: happy — Playwright Profile → ID card QR visible, click opens /verify/STUDENT-UID (screenshot). failure — missing uid → card shows error placeholder, no throw. Evidence .omo/evidence/fix-9-qa-issues/task-10.{log,png}
  Commit: Y | feat(id): scannable qr card without fake barcode
- [ ] 11. G5 #170 sidebar tween + reduced-motion (#170)
  What to do: motion.aside width spring (stiffness 360 damping 34) → tween duration 0.2 easeInOut; will-change: width on aside only; keep layoutId indicator; honor prefers-reduced-motion (duration 0); no App/Settings layout change. Must NOT do: no sidebar redesign; no SettingsPage change.
  Parallelization: Wave 2 | Blocked by: none | Blocks: F1-F4
  References: src/components/Sidebar.tsx (motion.aside + layoutId); src/App.tsx flex h-dvh wrapper; SettingsPage sticky layout
  Acceptance criteria: vitest/RTL or motion prop assert: transition type tween, duration 0.2, reduced-motion 0; Playwright Profile/Settings toggle shows no jank (frame sampling agent-side).
  QA scenarios: happy — toggle sidebar on Profile → width animates, screenshots stable. failure — reduced-motion on → instant (no animation), layout intact. Evidence .omo/evidence/fix-9-qa-issues/task-11.{log,png}
  Commit: Y | fix(sidebar): tween width transition with reduced-motion

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — assert every issue #165-#173 maps to ≥1 todo, every todo has refs+acceptance+QA+commit; fail on placeholder text. Evidence .omo/evidence/fix-9-qa-issues/F1.log
- [ ] F2. Code quality review — npm run typecheck + npm run lint + npm run lint:anti-slop clean; no as-any/ts-ignore, no empty catch, no console-only error handling on new paths. Evidence .omo/evidence/fix-9-qa-issues/F2.log
- [ ] F3. Real manual QA (agent-executed, Playwright/Chrome, no human) — student lesson (no evidence btn), journey persist+reload, grades CSV+PDF downloads, in-match panel reachable + mark-read sticks, QR scans to /verify, sidebar tween + reduced-motion, XP + counts live. Screenshots + files in .omo/evidence/fix-9-qa-issues/F3/
- [ ] F4. Scope fidelity — diff touches only listed files + 2 new deps (jspdf-autotable, qrcode.react); no RAG/rules/auth/schema/layout drift; Must-NOT-have grep clean. Evidence .omo/evidence/fix-9-qa-issues/F4.log

## Commit strategy
- One atomic commit per todo (11) after its RED→GREEN + evidence captured; never end-of-run omnibus. Message shape: type(scope): summary per todo Commit line; match git log --oneline -20 style. Skip only if user forbade commits.
- New deps (jspdf-autotable, qrcode.react) committed with their util todos (7, 9) including lockfile.

## Success criteria
- All 9 issues closed: #165 student sees no evidence UI; #171 journey persists on fallback modules; #166 CSV+PDF toggle downloads both; #167 panel usable in-match; #168 mark-read sticks incl. legacy docs; #169 QR scans to verify URL, barcode gone; #170 sidebar tween smooth + reduced-motion safe; #172 header XP fresh after vs-AI; #173 dropdown shows live counts.
- npm run typecheck + lint + lint:anti-slop + full vitest green; npm run build green; F1-F4 all APPROVE with evidence paths recorded.
