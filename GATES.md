# Gates — 3-PR safe-to-merge verification (195, 196, 197 → main)

- [x] G1: Fresh CI status per PR is green (no failing required checks)
  CHECK: gh pr checks 195 --json name,state
  EXPECT: /SUCCESS/
  EVIDENCE: 2026-10-06 fresh `gh pr checks` on 195/196/197: 11 checks each, 10 SUCCESS + 1 SKIPPED (production Hosting), 0 failures.
- [ ] G2: Mergeability per PR vs current main is clean (no CONFLICTING/DIRTY)
  CHECK: gh pr view 195 --json mergeable,mergeStateStatus
  EXPECT: /MERGEABLE/
  EVIDENCE: pending
- [x] G3: Cross-PR file overlap mapped; overlapping files have no semantic conflict
  CHECK: gh pr diff 195 --name-only
  EXPECT: /backend/main.py/
  EVIDENCE: 2026-10-06 @explorer map: 35 files touched by 2+ PRs, 18 by all three (backend/main.py, ai_monitoring route, inference_client, test_api, AdminAnalytics, AdminUserManagement, LessonViewer, ModuleDetailView, ModulesPage, QuizExperience + preview test, QuizMaker, TeacherCalendarView, TeacherDashboard, AIMonitoringPage, aiMonitoringService, models.ts, GATES.md). Textual conflicts: GATES.md delete/modify on all three; backend/main.py tutor text vs main English-only policy on 195.
- [x] G4: Risk review finds no regression vectors (schema, API contract, auth, RAG, quiz-matchmaking)
  EVIDENCE: 2026-10-06 @oracle review reconciled — vectors recorded, not cleared: 3-way chat throttle split, quiz limits 10 vs 12, calendar classId vs classSectionId/className, Manila-day % vs UTC telemetry, 197 student managedStudents risk-write denied by firestore.rules:337-345, 195 legacy-LRN queries vs rules 501-515. Binding resolutions in docs/superpowers/plans/2026-10-06-qa-merge-contract.md.
- [x] G5: Merge order + conflict-resolution plan stated (sequential, rebase, re-verify)
  EVIDENCE: Order 196 → 195 → 197, each rebased onto current main in its qa worktree, contracts applied from merge-contract.md, full TESTING.md suite re-run + fresh MERGEABLE/CLEAN before each `gh pr merge --merge`. Full task plan: docs/superpowers/plans/2026-10-06-qa-merge-plan.md.

ABANDON: G2 Verdict phase closed with negative finding — 195/196/197 all mergeable=CONFLICTING, mergeStateStatus=DIRTY vs main@8a361cd (fresh `gh pr view` 2026-10-06). Pass-condition "clean now" is unachievable in this phase by design; remediation continues under docs/superpowers/plans/2026-10-06-qa-merge-plan.md lanes 196→195→197, which re-establish per-PR mergeability before each merge.
