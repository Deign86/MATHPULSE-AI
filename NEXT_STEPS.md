# Next steps (hand-off, 2026-10-09)

Read this file before starting, then follow `AGENTS.md` (Ponytail + Unlazy + Anti-Slop; gates in `GATES.md` before implementing, evidence recorded, `npm run lint:anti-slop`). The shell is Windows PowerShell 5.1: no `&&`; write commit messages to a file and use `git commit -F`.

## Where things stand

Two local branches, stacked. Neither is pushed and there is no PR: the user asked to wait.

1. `claude/onboarding-tours`: `origin/main` at `a1e5e7d` plus the onboarding work.
   - `00e8cfc` guided tours for students, teachers and admins (cherry-pick of `e5263a1` from `codex/student-onboarding-tour`; main's "Assigned by your teacher" section carries `data-tour="assigned-quizzes"`, and both sides of `GATES.md` were kept).
   - `dd3ad30` the header **?** button asks "Play the <page> guide?" (**Play guide** / **Skip**) before it plays.
   - `de6b8fe` the Topic Mastery guide opens the Mastery Matrix tab when Module Availability was left open, and restores the teacher's tab afterwards.
   - `613badc` guides wait for pages that are still loading (`data-tour-loading` loaders, `data-tour-page` page containers), so a highlight never lands on a loading screen.
2. `claude/responsiveness-optimization-4b76c0` (this worktree), on top of `claude/onboarding-tours`: responsive primitives, admin, teacher and student layout fixes, the layout guide and audit tooling, the fixes from the real-app teacher check, then the student daily check-in and dev-reset change.

Merge in that order (onboarding first). A PR from the responsiveness branch alone would carry both.

- Conventions, the measuring method, and every layout finding with before/after numbers: `docs/responsive-layout-guide.md`. Guide engine rules: `docs/student-onboarding-guide.md`. Evidence: `GATES.md` (INT, PGC, TMV, GLW, RESP and DCI sections).
- Verified in the real app: student, teacher and admin pages at all eight sizes; touch sweeps at 390x844 and 768x1024; dialogs at 844x390 and 320x568; every student, teacher and admin page guide at phone (touch), landscape, tablet and desktop sizes; the student first-use guide and page guides after a fresh load with the new loading wait. The sign-in page was checked headless.
- Not verified in the real app:
  - Teacher and admin guides with the new loading wait (`GLW3b`, ABANDON): the Browser pane session was reset on 2026-10-09 and both accounts are signed out.
  - Quiz Battle after the layout fixes (`RESP5b`, ABANDON). See "Testing notes".
  - The teacher Intervention Center (`RESP4b`, ABANDON). Opening it sends AI requests for the selected student (issue #313).

## Next

1. **Sync with `main` before any PR.** `origin/main` is 71 commits ahead of our base (`5bbaa0e` on 2026-10-09). It removed AI Monitoring (`eb388c73`), which this branch restyled (expect conflicts in `src/pages/admin/AIMonitoringPage.tsx`; drop our changes there), and it contains its own leaderboard profile-modal close-button fix (`89fd4cfe`) that overlaps ours. Merge `main` into `claude/onboarding-tours` first, re-run its checks, then into this branch. Re-run the layout audit and guide runs on any page main changed.
2. **Teacher and admin guide check (GLW3b).** Once the user signs in on `teacher.localhost:5174` and `127.0.0.1:5174`: in the app page run `await import('/.tmp/guide-walker.js')` (gitignored helper that drives frames from a message loop, because the hidden pane pauses them), then `__startWalk('[data-tour="replay"]')` from Settings for the first-use guide and `__runPageGuides([...labels])` for the page guides, at 1440x900 and at 390x844 with touch, after a fresh load. Flags to look for: `LOADING-VISIBLE`, `ON-LOADER`, `HIDDEN-AGAIN`, `NO-SPOTLIGHT`. If the helper is gone, `tests/browser/layout-audit-guides.js` in the audit frame does the same walk.
3. **Quiz Battle check (RESP5b).** With a disposable student account (never a real student's), measure the hub, setup, match and results screens at all eight sizes. Opening the page resumes, and can start, that account's unfinished matches.
4. **Intervention Center check (RESP4b)**, only with the user's go-ahead: `__runPlan` with a `click` step at all eight sizes, then `__touchSweep()` with touch on.
5. **PR** only when the user asks. Ask before any force-push or replacing a remote branch.

## Testing notes

- The Browser pane preview uses a second dev server on 5174 (`.claude/launch.json`, gitignored). Claude must not type passwords (Firebase Auth is a remote identity provider), so the user signs in in the pane; sessions persist per origin (`localhost` student, `teacher.localhost` teacher, `127.0.0.1` admin) until the pane is reset.
- The pane document is often hidden (`document.visibilityState === 'hidden'`), which pauses animation frames and throttles timers. The guide engine measures on animation frames, so real-app guide checks must run through the layout-audit frame or `.tmp/guide-walker.js`, both of which drive frames from a message loop.
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
