# Next steps (hand-off, 2026-10-08)

Read this file before starting, then follow `AGENTS.md` (Ponytail + Unlazy + Anti-Slop; gates in `GATES.md` before implementing, evidence recorded, `npm run lint:anti-slop`). The shell is Windows PowerShell 5.1: no `&&`; write commit messages to a file and use `git commit -F`.

## Where things stand

- Branch `claude/responsiveness-optimization-4b76c0` (a worktree), based on `origin/main` at `a1e5e7d`. Not pushed, no PR: the user asked to wait.
- `00e8cfc` brings in the onboarding tours (cherry-pick of `e5263a1` from `codex/student-onboarding-tour`). The two expected conflicts were resolved: main's "Assigned by your teacher" section carries `data-tour="assigned-quizzes"`, and both sides of `GATES.md` were kept. The student Modules step now says assigned quizzes appear on Practice and Recommended.
- The responsiveness pass follows in its own commits. Conventions, the measuring method, and every finding with before/after numbers are in `docs/responsive-layout-guide.md`. Evidence: `GATES.md` (INT1–INT3, RESP1–RESP10).
- Verified in the real app: student and admin pages at all eight sizes, touch sweeps at 390x844 and 768x1024, and student and admin page guides at phone, landscape, tablet and desktop sizes. The sign-in page was checked headless.
- Not verified in the real app:
  - Teacher pages. No teacher account was signed in during the pass. The teacher changes repeat the admin and student patterns and pass the build, unit tests and a check that every added class compiles. `RESP4` is marked ABANDON in `GATES.md` with this reason.
  - Quiz Battle after the fixes (`RESP5b`, ABANDON). See "Testing notes".

## Next

1. **Teacher check (RESP4).** Sign in on `http://teacher.localhost:5174`, open `/tests/browser/layout-audit.html`, then run:
   - `__runPlan` with `nav` steps for each teacher page;
   - `__touchSweep()` with mobile emulation on;
   - `__guideRun([[390, 844], [844, 390], [1024, 768], [1440, 900]], [...labels], 'role')`.

   Skip the Intervention Center: it sends AI requests when it opens. Fix what the audit finds with the patterns in the guide, then mark RESP4.
2. **Quiz Battle check (RESP5b).** With a disposable student account (never a real student's), measure the hub, setup, match and results screens at all eight sizes. Opening the page resumes, and can start, that account's unfinished matches. The pass changed the hub's column split at `lg`, safe centring of the results overlay and match content, and the match footer height on short screens.
3. **PR** only when the user asks. Ask before any force-push or replacing a remote branch.

## Testing notes

- The Browser pane preview uses a second dev server on 5174 (`.claude/launch.json`, gitignored). Claude must not type passwords (Firebase Auth is a remote identity provider), so the user signs in in the pane; sessions persist per origin (`localhost` student, `teacher.localhost` teacher, `127.0.0.1` admin).
- Seed test accounts are defined in `scripts/seed-users.js` with plain-text passwords. Rotate them and move them out of the repo.
- **Quiz Battle:** opening `/battle` resumes, and can start, the signed-in student's unfinished match (`resumeQuizBattleSession` and `startQuizBattleMatch` run on mount). During this pass that resumed an unfinished Practice Bot match on the test student's account (no answers were submitted). Keep Quiz Battle out of audit plans and guide runs on real accounts.
- Vite reloads every open page when a watched file changes, or when a module the page imported changes. Don't edit files while an audit or guide run is going; results already saved to `localStorage` survive.

## Known issues found but not fixed

From the onboarding session:

- `src/pages/admin/AIMonitoringPage.tsx`: the skeleton never ends if the summary fetch fails (no error state); `latestDailyMetric.totalAttempts` throws when `dailyMetrics` is empty.
- Admin and Teacher Settings "Discard" only clears the dirty flag (theme preview and toggles stay applied).
- `DataImportView`: the target-class `<select>` has `onChange={() => {}}`. `QuizMaker` renders two inputs with `id="quiz-title"`.
- Teacher Intervention Center:
  - sends AI requests and telemetry when it opens;
  - the dashboard "N at risk" pill opens it with no student selected (a blank view);
  - the `'edit_records'` view is unreachable.
- Admin:
  - Content file delete and subject availability switches write without confirmation;
  - Profile "Save Changes" is always enabled;
  - the Analytics Curriculum and Engagement tabs use hardcoded demo data;
  - `AdminContent.tsx`, `AdminSettings.tsx` and `AdminPriorityModules` are unused;
  - `Sidebar` ignores `onOpenSettings` and `onLogout`.
- Competency (teacher) takes about 10 seconds to load in dev. Class Management (admin) replaces the whole view with a spinner while loading.

From the responsiveness pass:

- AI Chat deletes a conversation immediately, with no confirmation or undo. The delete button is now visible on touch screens (it used to be invisible but tappable there).
- AI Monitoring's pricing tooltip opens on hover only (`PricingInfoTooltip`); touch screens rely on the browser's emulated hover.
- The RAG Manager page guide once showed its optional "Rebuild in progress" step without a highlight. The banner appeared and vanished during the step, following backend status. An optional step whose target disappears could be skipped.
- Ordinary text buttons and form fields are 30–40px on touch (all ≥ 24px). Examples: item purchase buttons in Avatar Studio, "Practice" links on Grades, and the compact sign-in form. Raising them would change layouts beyond this pass.
