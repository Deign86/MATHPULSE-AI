# Next steps (hand-off, 2026-10-09)

Read this file before starting, then follow `AGENTS.md` (Ponytail + Unlazy + Anti-Slop; gates in `GATES.md` before implementing, evidence recorded, `npm run lint:anti-slop`). The shell is Windows PowerShell 5.1: no `&&`; write commit messages to a file and use `git commit -F`.

## Where things stand

Two stacked branches, both merged with `origin/main` at `1bc66f06` on 2026-10-09 and opened as stacked PRs (onboarding into `main`, responsiveness into the onboarding branch).

1. `claude/onboarding-tours`: `origin/main` plus the onboarding work.
   - `00e8cfc` guided tours for students, teachers and admins (cherry-pick of `e5263a1` from `codex/student-onboarding-tour`; main's "Assigned by your teacher" section carries `data-tour="assigned-quizzes"`, and both sides of `GATES.md` were kept).
   - `dd3ad30` the header **?** button asks "Play the <page> guide?" (**Play guide** / **Skip**) before it plays.
   - `de6b8fe` the Topic Mastery guide opens the Mastery Matrix tab when Module Availability was left open, and restores the teacher's tab afterwards.
   - `613badc` guides wait for pages that are still loading (`data-tour-loading` loaders, `data-tour-page` page containers), so a highlight never lands on a loading screen.
   - `da0bebd` only the full-screen loader hides a guide step that is already showing (a page's own loader under a phone menu no longer makes it flicker).
   - `535478d` merge of `origin/main` (76 commits): main's logic kept; the admin AI Monitoring page guide and the student Leaderboard "Time period" step were removed because main removed those features.
2. `claude/responsiveness-optimization-4b76c0` (this worktree), on top of `claude/onboarding-tours`: responsive primitives, admin, teacher and student layout fixes, the layout guide and audit tooling, the fixes from the real-app teacher check, then two student commits: the daily check-in no longer closes on outside taps, the Modules page always offers "Claim Daily Reward" / "Check Daily Rewards", claimed days are now saved (they never were, also on `main`), past unclaimed days read "Missed", and the dev-only reset buttons are hidden (`VITE_SHOW_DEV_RESET=true` shows them).

Merge in that order (onboarding first; GitHub then retargets the responsiveness PR to `main`). The responsiveness branch's own merge commit keeps main's logic too: AI Chat keeps main's shell padding for the bottom nav (our duplicate padding inside `AIChatPage` was dropped), the leaderboard rank message uses main's `rankBarMessage`, Data Import's "Go to Modules" uses main's `onNavigateToModuleAvailability`, and the AI Monitoring components stay deleted.

- Conventions, the measuring method, and every layout finding with before/after numbers: `docs/responsive-layout-guide.md`. Guide engine rules: `docs/student-onboarding-guide.md`. Evidence: `GATES.md` (INT, PGC, TMV, GLW, RESP and DCI sections).
- Verified in the real app: student, teacher and admin pages at all eight sizes; touch sweeps at 390x844 and 768x1024; dialogs at 844x390 and 320x568; every student, teacher and admin page guide at phone (touch), landscape, tablet and desktop sizes; the student, teacher and admin first-use guides and page guides after a fresh load with the new loading wait (1440x900 and 390x844 with touch). The sign-in page was checked headless.
- Not verified in the real app:
  - Quiz Battle after the layout fixes (`RESP5b`, ABANDON). See "Testing notes".
  - The teacher Intervention Center (`RESP4b`, ABANDON). Opening it sends AI requests for the selected student (issue #313).

## Next

1. **Review and merge the PRs** in order (onboarding, then responsiveness). If `main` moves again before merging, merge it into `claude/onboarding-tours` first, then into this branch, keeping main's logic.
2. **Quiz Battle check (RESP5b).** With a disposable student account (never a real student's), measure the hub, setup, match and results screens at all eight sizes. Opening the page resumes, and can start, that account's unfinished matches.
3. **Intervention Center check (RESP4b)**, only with the user's go-ahead: `__runPlan` with a `click` step at all eight sizes, then `__touchSweep()` with touch on.
4. Ask before any force-push or replacing a remote branch.

On this Windows checkout (`core.autocrlf=true`), main's `ragLessonStream.contract.test.ts` fails 4 tests because its fixture `src/services/__tests__/fixtures/ragLessonStream.sse` is written with CRLF; git stores it with LF and CI (Linux) passes. Rewrite the working copy with LF (git sees no change) or add `*.sse text eol=lf` to `.gitattributes` (dev lead's call).

The user asked on 2026-10-09 to keep further testing light; prefer unit tests and one targeted real-app check over full sweeps.

## Testing notes

- The Browser pane preview uses a second dev server on 5174 (`.claude/launch.json`, gitignored). Claude must not type passwords (Firebase Auth is a remote identity provider), so the user signs in in the pane; sessions persist per origin (`localhost` student, `teacher.localhost` teacher, `127.0.0.1` admin) until the pane is reset.
- The pane document is often hidden (`document.visibilityState === 'hidden'`), which pauses animation frames and throttles timers. The guide engine and page transitions run on animation frames, so real-app guide checks must run inside the layout-audit frame (its shim is installed before the app starts). `.tmp/guide-walker.js` and `.tmp/guide-trace.js` (gitignored) add a step walker and a step tracer; load them into the frame as module scripts.
- Seed test accounts are defined in `scripts/seed-users.js` with plain-text passwords. Rotate them and move them out of the repo (issue #322).
- **Quiz Battle:** opening `/battle` outside a guide resumes, and can start, the signed-in student's unfinished match (`resumeQuizBattleSession` and `startQuizBattleMatch` run on mount). Guides open it in preview, which skips that. Keep Quiz Battle out of audit plans on real accounts.
- Vite reloads every open page when a watched file changes (docs and `GATES.md` included), or when a module the page imported changes. Don't edit files while an audit or guide run is going; results already saved to `localStorage` survive, but the audit page comes back with an empty frame, so call `__load('/')` before the next run.
- The dev-only test reset buttons (Modules daily rewards, Avatar Studio purchases) are hidden unless `VITE_SHOW_DEV_RESET=true` is set in `.env.local`. They are due to be deleted.
- The seeded teacher's first-use guide was dismissed during the 2026-10-08 check (Escape). It can be replayed from Teacher Settings.

## Known issues

Filed on GitHub on 2026-10-09 after a cross-check against `main` at `5bbaa0e`; each issue asks the reader to re-check against the current `main` first:

- #313 Intervention Center sends AI requests on every open (lesson plan likely generated twice)
- #314 Teacher Notifications page has no entry point
- #315 Admin Profile: Save Changes is always enabled
- #316 Subject availability switch saves immediately without confirmation
- #317 AI Chat deletes a conversation with no confirmation or undo
- #318 Teacher/Admin Settings: unsaved dark-mode preview may stay applied after leaving
- #319 Teacher Competency Matrix takes 7+ seconds to load
- #320 Admin Class Management replaces the whole page with a spinner while loading
- #321 Remove unused admin files, an unused import, unused Sidebar props and the `edit_records` view id
- #322 Seed account passwords are stored in plain text

Not filed, because `main` already fixed or removed them: AI Monitoring's endless skeleton and hover-only pricing tooltip (page removed), Data Import's no-op target-class select, QuizMaker's duplicate `id="quiz-title"`, the blank Intervention view from the "N at risk" pill, Admin Analytics' demo data, Admin/Teacher Settings Discard, and Admin Content file delete without confirmation.

Still open on these branches (not filed; they belong to this work):

- Ordinary text buttons and form fields are 30–40px on touch (all ≥ 24px), for example Avatar Studio purchase buttons, Grades "Practice" links, the sign-in form, and Module Availability's Refresh Statuses, Configure and page-size controls. Raising them would change layouts beyond the responsiveness pass.
- At 390x844 the guide walker read the sections list under the admin Class Management "Section totals" highlight (the stats sit above the list at that size). Not investigated; check the spotlight there before the PR.
- Daily rewards claimed before the claimed-days fix are not recorded, so they show as "Missed" until the week resets (Monday, PHT).
