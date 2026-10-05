# Group E teacher analytics regression gates

- [ ] TC-TCH-047: Risk chart renders available risk bands and does not expose raw `PENDING_ASSESSMENT`.
  CHECK: `npm test -- --run src/components/TeacherDashboard.regression.test.tsx`
  EXPECT: risk labels are normalized and an empty cohort has an honest empty state.
- [ ] TC-TCH-048: Medium risk students are included in risk counts and Needs Attention filtering.
  CHECK: `npm test -- --run src/components/TeacherDashboard.regression.test.tsx`
  EXPECT: watch/medium students appear in the Medium band and risk filter.
- [ ] TC-TCH-049: Topic mastery does not report fabricated 0/0/0 or substitute fake topic scores.
  CHECK: `npm test -- --run src/components/TeacherDashboard.regression.test.tsx`
  EXPECT: only topics backed by analytics are shown; no curriculum baseline scores are fabricated.
- [ ] TC-TCH-050: Retake changes can refresh class analytics and assigned quiz loading errors are surfaced.
  CHECK: `npm test -- --run src/components/TeacherDashboard.regression.test.tsx`
  EXPECT: analytics refreshes from current student data; no stale fallback risk state is presented as current.
- [ ] TC-TCH-054: Quiz completion creates a teacher-visible notification.
  CHECK: `npm test -- --run src/components/TeacherDashboard.regression.test.tsx`
  EXPECT: a completed assigned quiz can notify its assigning teacher.
- [ ] TC-TCH-060: Empty classes show no fabricated topic bars.
  CHECK: `npm test -- --run src/components/TeacherDashboard.regression.test.tsx`
  EXPECT: empty topic performance has zero rows, not sample scores.
- [ ] TC-TCH-062: Top Performers and Needs Attention counts agree with displayed students.
  CHECK: `npm test -- --run src/components/TeacherDashboard.regression.test.tsx`
  EXPECT: roster/backend identity matching retains eligible students in both lists.
- [ ] TC-TCH-064: Calendar save failures are visible and successful saves persist.
  CHECK: `npm run typecheck`
  EXPECT: save success closes the editor; failures remain visible to the teacher.
- [ ] TC-TCH-066: Topic subject/grade filters return matching topics and empty results honestly.
  CHECK: `npm run typecheck`
  EXPECT: selected filters constrain available topics and no-data results show no fabricated rows.

## Continuation: TCH-064 and TCH-050

- [x] TCH-064: Calendar create/update writes never send undefined values, persist optional class scope, roll back rejected optimistic updates, and leave the editor open with an error.
  CHECK: `npm test -- --run src/services/__tests__/calendarService.test.ts src/components/TeacherCalendarView.test.tsx`
  EXPECT: payload fields omit undefined values; classId is persisted; rejected writes restore prior event state and retain editor state.
- EVIDENCE: Calendar suite passed (2 files, 4 tests). Service tests confirm omitted fields/classId; rollback helper tests confirm failed create/update restoration. `handleSave` leaves the dialog open and sets an error in its failure branch.
- [x] TCH-050: Assigned quizzes load from the supported Firestore assignment fixtures and risk scoring uses only the latest attempt for each quiz.
  CHECK: `npm test -- --run src/services/__tests__/quizService.test.ts`
  CHECK: `npm test -- --run src/services/__tests__/progressService.test.ts`
  EXPECT: valid pending assignments load safely; latest attempt per quiz replaces earlier attempt scores for the risk average.
- EVIDENCE: Quiz service suite passed (5 tests), including a synthetic assignment using the legacy LRN field; progress service suite passed (2 tests), including a retake replacing the prior score; TeacherDashboard regression suite passed (3 tests).
- [x] Continuation verification
  CHECK: `npm run typecheck`
  CHECK: `pytest -q -k "quiz or import"` (working directory: `backend/`)
  EXPECT: typecheck and selected pytest suite pass.
- EVIDENCE: `npm run typecheck` exited 0; backend pytest selected 64 tests passed and 525 were deselected.

## Blocked work

- TC-TCH-054 teacher quiz-completion notification remains outside this continuation: its trusted server-side trigger belongs to the separate notifications lane, and `functions/` is explicitly excluded.
