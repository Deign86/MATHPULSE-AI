# Open Issues #211–#306 Fix Plan

## Scope
Fix all 96 open GitHub issues (#211–#306, all `bug` + `frontend`/`backend`/`teacher-ui`, filed 2026-10-08 from the e2e static review). Deliver one integration branch `fix/open-issues-211-306` and one PR that closes every issue, with the matching `known-bug` e2e tags removed.

## Contract
- Each lane owns a disjoint primary file set (table below). `src/App.tsx` is owned by lane A; other lanes may add minimal, local hunks there only when an issue requires it.
- Root-cause fixes only, smallest correct diff (Ponytail). No new dependencies, no new abstractions.
- Anti-Slop: no `any`, every `as` assertion carries `// SAFETY:`, no generic names, no narrating comments.
- Every fixed issue: its `known-bug` e2e tag is removed and assertions the issue flags are updated. No e2e runs, no dev servers, no browsers in lanes (slow, hits live Firebase).
- Each lane commits on its own branch `fix/issues-lane-<x>` inside `.worktrees/lane-<x>` (node_modules junctioned to the main checkout). No pushes from lanes.
- Driver merges lanes into `fix/open-issues-211-306`, resolves conflicts, runs the root gates in `GATES.md`, pushes, opens the PR.

## Lanes (tree depth 2: root → 11 leaves)
| Lane | Issues | Primary files |
|---|---|---|
| a app shell/nav/shortcuts | 256 257 255 254 221 220 219 218 216 261 222 223 259 | App.tsx, ScientificCalculator.tsx (keydown), ProgressGate.tsx, MobileBottomNav.tsx, HeroBanner.tsx, RightSidebar.tsx, firestore.rules (maintenance) |
| b settings (all roles) | 306 302 301 235 217 303 300 253 252 242 241 286 | SettingsPage.tsx, SettingsModal.tsx, TeacherSettingsPage.tsx, AdminSettingsPage.tsx, settingsService.ts, testResetService.ts |
| c profiles | 305 299 251 250 287 | ProfilePage.tsx, AdminProfilePage.tsx, TeacherProfilePage.tsx, authService.ts |
| d1 admin analytics/audit/users | 293 292 291 290 248 289 288 244 245 | AdminAnalytics.tsx, AdminAuditLog.tsx, AdminUserManagement.tsx, backend/main.py (user search) |
| d2 admin rag/monitoring/misc | 298 297 296 295 249 247 246 258 294 | AdminRagManager.tsx, PricingInfoTooltip.tsx, ConfirmModal.tsx, AdminPdfUpload.tsx, AIMonitoringPage.tsx, backend/routes/ai_monitoring.py, AdminMobileBottomNav.tsx |
| e teacher dashboard/calendar | 284 238 237 236 211 285 243 | TeacherDashboard.tsx, TeacherCalendarView.tsx, `xs` breakpoint |
| f data import/quiz maker | 283 282 281 280 240 279 278 239 277 | DataImportView.tsx, QuizMaker.tsx |
| g quiz battle/leaderboard | 276 275 232 274 234 233 | QuizBattlePage.tsx, quizBattleService.ts, LeaderboardPage.tsx, gamificationService.ts (getLeaderboard) |
| h1 quiz experience/XP | 270 269 268 214 226 212 213 267 | QuizExperience.tsx, ModuleDetailView.tsx (quiz/XP), progressService.ts, gamificationService.ts (XP award), backend/routes/practice.py |
| h2 modules/lessons | 271 265 225 264 263 266 224 262 260 | ModulesPage.tsx, PracticeCenter.tsx, curriculumModules.ts, useModuleProgress.ts, useLessonContent.ts, apiUtils.ts, LessonViewer.tsx, backend/routes/rag_routes.py |
| i chat/assessment/avatar | 272 227 228 215 273 230 231 229 304 | ChatContext.tsx, AIChatPage.tsx, FloatingAITutor.tsx, mathScope.ts, AssessmentHub.tsx, AssessmentPage.tsx, InitialAssessmentModal.tsx, diagnosticService.ts, DiagnosticBreakdown.tsx, GradesPage.tsx, AvatarShop.tsx |

Leaf gates: `gates/issues-lane-<x>.md` (written by each lane). Root gates: `GATES.md`.

## Status log
- 2026-10-08: Plan written; 11 worktrees created; lanes dispatched in parallel.
- 2026-10-08: Lanes D2, H1, H2, I hit the session limit; H1/H2 had committed, D2/I were finished by fresh agents. All 11 lanes merged; root ledger met (96/96 issues, 605 vitest, 601 pytest, build green). Pushed and opened PR #309.
- (previous task) 2026-10-07: Investigation started; latest merged PRs identified as #204, #206, and #197.
- (previous task) 2026-10-07: Fixed proven merge regressions in assessment CTA navigation, assessment-alert dismissal persistence, quiz attempt persistence ownership, profile failed-save handling, teacher calendar save state, and Admin Subjects availability totals/realtime reconciliation; final CI-equivalent verification completed.
- (previous task) 2026-10-07: Post-fix regression sweep passed frontend (551), backend (598), targeted changed-feature tests (27), production build/static checks, and all 79 Functions tests under Firestore+RTDB emulators. Authenticated browser E2E remains credential-gated because no E2E user credentials are configured locally.
