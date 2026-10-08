# Student guided onboarding

Implemented on `codex/student-onboarding-tour`, based on fetched `origin/main` commit `e92d2cf09053d3c3c6f64eb9f5d37188e97d05bc`.

## Purpose and scope

This is an interactive feature walkthrough, separate from Initial Assessment & Readiness (IAR). Each step spotlights the feature region it explains (a card, toolbar, list or form, never just a page title), and Continue moves to the next feature or screen. It does not change product appearance or backend behavior.

Students can use Back, Continue, Finish tour, or the header close button labelled Skip tour. Escape, browser Back/Forward, and the Android hardware back action dismiss the walkthrough; browser history traversal keeps the page the student navigated to. While a guide is open the page cannot be clicked or scrolled by the student; the guide does all scrolling itself. The tour never answers or submits an assessment, joins matchmaking, creates a battle room, sends a chat message, spends rewards, or edits a profile.

## Student experience

1. Sign in and wait for profile hydration and the initial diagnostic check.
2. Complete or dismiss the IAR workflow. A tour cannot open over an assessment, result screen, quiz, calculator, logout dialog, or open mobile sidebar.
3. On the dashboard, an unseen general guide launches after a short settling delay. Other feature dialogs also defer launch until closed. The general guide is deliberately short (12 steps): a welcome, one overview per page (what the page is for and where it lives in navigation), and a closing step on the **?** button. Both the welcome and the closing step tell the student that step-by-step instructions live in each page's own guide.
4. Each step scrolls its feature to the top of the page and highlights it. If the page was scrolled before launch, or drifts during a step, the guide scrolls it back. Sticky filter/tab bars, the floating Quiz Battle header, the phone's pinned leaderboard strip and the bottom navigation never cover a highlighted feature: the guide scrolls past top bars and trims the highlight above bottom bars. While a page is still loading, the card stays hidden (up to 12 s, with a "Loading this page…" indicator after 0.6 s) so it never jumps into place.
5. Features that only exist in some account states (assessment focus topics, the AI diagnostic banner, past conversations, the floating tutor on large screens) are skipped automatically when absent.
6. On phones, the guide opens the correct bottom-navigation submenu automatically. Tablet and desktop use their existing visible controls.
7. Screens that are hidden by default are shown read-only while explained: Modules sub-tabs (Recommended, Practice, Teacher Uploaded), the Quiz Battle setup screen, and on AI Chat the conversation list and an existing chat (phones show only one at a time). The student's own Modules tab, chat selection and the Quiz Battle hub return when the guide ends.
8. Pages that open a modal on their own hold it until the guide closes. The Modules Daily Check-In appears after the guide instead of covering it. The guide also layers above every app overlay.
9. Finish or Skip records dismissal and restores the screen from which the guide started. Tour-driven navigation replaces the current history entry, preserving browser Back behavior.

### Page guides

Every page has its own short guide:

- The **?** button in the top bar asks first ("Play the Modules guide?", with **Play guide** and **Skip**), then plays the guide for the page the student is on. Skip and Escape close the question and return focus to the button.
- Settings → Student guide lists every page guide, plus **Replay student guide** for the full walkthrough.

A page guide stays on its page and returns there when finished. A guide requested while the profile is still loading opens as soon as it is ready. Replay and page guides are disabled while Settings has unsaved edits or a password field holds unsubmitted text.

First-use means the account has not dismissed this version of the guide in this browser. Existing student accounts also receive the guide if they have no stored dismissal marker.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `src/components/onboarding/GuidedTour.tsx` | Role-neutral spotlight and explanation dialog. Owns step index, target discovery, scrolling, optional-step skipping, placement, progress, focus, and keyboard dismissal. |
| `src/components/onboarding/studentTourSteps.ts` | Per-page student guides (`studentTourPages`, each with one general `overview` step and detailed `steps`), the general guide (`studentTourSteps`), and `studentPageTour(tab)`. |
| `src/components/onboarding/PageGuideConfirm.tsx` | The question the header **?** button asks before a guide plays, shared by all three roles. It wraps the button as its trigger, so Skip and Escape return focus there; Play guide hands focus to the guide card. |
| `src/hooks/useOnboardingTour.ts` | Student eligibility, delayed first launch, full or page replay, dismissal, browser-history dismissal, account isolation, and local persistence. |
| `src/App.tsx` | Assessment safety, real student navigation, history replacement, original-screen restoration, hardware back, header page-guide button with its confirmation, and passing the current step's menu/view to pages. |
| `src/components/ModulesPage.tsx` | Holds the Daily Check-In while a guide is open (`tourActive`); shows the explained sub-tab (`tourView`) and restores the student's tab afterwards. |
| `src/components/QuizBattlePage.tsx` | `tourPreview` blocks session resume; `tourView` shows the read-only setup screen. |
| `src/components/SettingsPage.tsx` | Student guide card (shared `onboarding/GuideReplayCard.tsx`: full replay, page-guide grid, unsaved-change protection). Teacher/admin consumers receive no student guide. |
| `src/components/Sidebar.tsx`, `MobileBottomNav.tsx` | `data-tour-nav` anchors and the phone submenu hint. |
| Feature components | `data-tour` anchors on the feature regions listed under Coverage. |

The core uses the existing Radix dialog and Button primitives. No dependency was added.

## Engine contract

`GuidedTour` is mounted only while its caller wants an active tour; key it by guide so switching guides restarts at step 1.

```ts
interface TourStep {
  title: string;
  description: string;
  target?: string;    // selector; comma-separated fallbacks in priority order, first visible match wins
  tab: string;        // passed to the caller's navigation adapter
  menu?: string;      // optional navigation hint, e.g. which phone submenu to open
  view?: string;      // in-page screen the host shows while this step is explained
  optional?: boolean; // skipped (in the direction of travel) when the target does not render within 1.5 s
}
```

Props:

- `steps`: immutable ordered steps.
- `label`: role- or page-specific progress label; defaults to Feature guide.
- `onNavigate(tab)`: caller-owned route/tab adapter. Use real navigation, respecting existing guards.
- `onStepChange(step)`: receives each step so the host can open menus or show a `view`.
- `onDismiss()`: caller handles persistence and returning to the original screen.

The card stays hidden for up to 12 s while a non-optional target renders (lazy pages, slow data), showing "Loading this page…" after 0.6 s, then shows. A target that never renders does not trap the learner or block Continue: the instruction appears in a bounded central card without a spotlight. `src/components/onboarding/studentTourSteps.test.ts` fails if any step selector has no matching anchor in production source, or if a step targets a bare heading.

## Responsive and accessibility rules

- Use the same explanation and controls at all widths.
- Use the first visible selector match, skipping controls hidden by breakpoint styles; the same anchor may sit on a desktop and a phone copy of a region.
- Scroll each new target to the top of every user-scrollable ancestor (instant). Never use `scrollIntoView`: it also scrolls `overflow: hidden` layout shells, which pushed the fixed header off screen and left the app shifted after the guide. Re-scroll if the target later drifts off-screen; do not retry a position the page cannot reach.
- Mark pinned bars with `data-tour-sticky` (currently the app header, Modules filter bar, Rewards tab bar, phone bottom navigation, Leaderboard top-three strip and Quiz Battle Hall of Fame strip). The engine scrolls targets clear of top bars (retrying up to three times for bars that appear after scrolling) and trims the spotlight above bottom bars. Add the marker to any new sticky or fixed bar on a student page.
- Pad and clip the spotlight to the viewport.
- Place the card below the target where possible, then above, to the right, or to the left. For regions too large for any of these, spotlight the region's top part (at least 96 px) and place the card below it, so the explanation never covers the highlight; only if even that fails, shrink the card and scroll its text.
- Keep text scrollable separately from the footer on short screens.
- Keep the tour controls at least 44 CSS pixels high and allow the footer to wrap on small phones.
- Use the dynamic viewport height and bottom safe-area inset.
- Re-measure after page/menu mutations, resize, viewport changes, and nested scrolling.
- Use a modal focus trap, accessible title/description, and live step announcements.
- Suppress the student's global navigation shortcuts while a tour dialog is open.
- Restore focus to replay or a visible heading/navigation control; do not permanently remove buttons from the tab order.
- Dim the rest of the screen at 62% so the highlight stands out without hiding the page.
- Avoid animated spotlight movement so reduced-motion users receive the same experience.
- Keep the feature behind the spotlight inert: the walkthrough is a demonstration, not a live-action task.

## Persistence and versioning

Key: `mathpulse:student-tour:v1:<Firebase uid>`. Value: `seen`.

Skip, Finish, Escape, browser history traversal, and hardware-back dismissal all mark the guide seen. Explicit replay, from Settings or the page-guide button, ignores that marker. Starting the tour alone does not mark it seen; interrupted tours can be offered again.

Storage access is caught. If persistent storage is unavailable, dismissal is remembered in memory for the current app session. Clearing browser storage or moving to another browser/device shows the tour again. This implementation does not write onboarding state to Firestore. If cross-device completion is needed later, persist a versioned per-role completion record through the existing typed service and profile boundary; do not repurpose IAR fields.

The hook receives account identity, readiness, blocking state, and an `autoStart` flag. Automatic launch is dashboard-only so it cannot interrupt work on a deep-linked page. `start(pageTab?)` plays one page's guide, or the full guide when no tab is given. Unmounting, switching accounts, losing readiness, or entering a blocking workflow clears the active display.

## Coverage

Two kinds of guide share these steps:

- **General guide** (first use, Settings → Replay student guide): welcome, one `overview` step per page in the order below, then the page-guide button. 12 steps.
- **Page guides** (**?** button, Settings page list): the detailed steps below for one page. 75 steps across 10 pages (8 optional, skipped when the feature is absent for that account).

| Page | Features explained (`data-tour` anchor) |
| --- | --- |
| Dashboard | Hero (`hero`), Continue Learning (`continue-learning`), level/XP (`level`), daily goals (`daily-goals`), XP and streak (`xp-streak` / `xp-card`), topics to review* (`review-topics`), learning path (`learning-path`), competency matrix (`competency`), leaderboard preview (`leaderboard-preview`), floating tutor* (`floating-tutor`), calculator, notifications (`notifications`), page-guide button (`page-guide`) |
| Modules | Search and filters (`module-search`), assessment focus areas* (`module-focus`), Modules tab and cards (`module-tab-modules`, `module-grid`), Recommended tab and list (`module-tab-recommended`, `recommended-modules`), Practice tab, assigned quizzes, stats, filters and topics (`module-tab-practice`, `assigned-quizzes`, `practice-stats`, `practice-filters`, `practice-topics`), Teacher Uploaded tab and list (`module-tab-teacher_uploaded`, `teacher-modules`) |
| Grades & Assessment | Quarter filter and export (`grades-export`), grade summary (`grades-kpis`), AI diagnostic* (`grades-diagnostic`), subject grades chart (`grades-subjects`), subject standings (`grades-standings`), recent quizzes (`grades-history`), exam readiness (`grades-readiness`) |
| AI Chat | New chat (`chat-new` / `chat-start`), search* (`chat-search`), conversations* (`chat-history` / `chat-recent`), messages* (`chat-messages`), quick prompts (`chat-prompts` / `chat-topics`), question input (`chat-input`) |
| Quiz Battle | Battle modes (`battle-modes`), Hall of Fame (`hall-of-fame`), battle stats (`battle-stats`), match history (`battle-history`); setup screen: mode switch, subject, topic, difficulty, rounds, timer, public/private room*, sound, start (`battle-mode-switch`, `battle-subject`, `battle-topic`, `battle-difficulty`, `battle-rounds`, `battle-timer`, `battle-room`, `battle-sound`, `battle-start`) |
| Leaderboard | Period toggle (`leaderboard-period`), podium (`leaderboard-podium`), your rank (`leaderboard-rank`), class standings (`leaderboard-standings`) |
| Avatar Studio | Preview (`avatar-preview`), surprise outfit and XP (`avatar-tools`), categories (`avatar-categories`), items/buy/preview (`avatar-items`), save/reset (`avatar-save`) |
| Rewards | Level progress (`rewards-level`), totals (`rewards-metrics`), achievements/quests/journey tabs (`rewards-tabs`), badge list (`rewards-content`) |
| Profile | Student ID pass (`profile-id-card`), Avatar Studio shortcut (`profile-avatar`), edit/save (`profile-edit`), basic information (`profile-basic`), school and grade (`profile-school`) |
| Settings | Profile shortcuts (`settings-profile`), sections (`settings-sections`), preferences panel (`settings-panel`), save (`settings-save`), guides (`settings-guide`) |

\* Optional: skipped when the account's screen does not render it.

The guide explains workflows without fabricating quiz questions, module content, achievements, or battle participants.

## Verification

Run from the repository root:

```powershell
npm test -- src/hooks/useOnboardingTour.test.tsx src/components/onboarding/ src/components/SettingsPage.tour.test.tsx src/components/MobileBottomNav.tour.test.tsx src/components/ModulesPage.tour.test.tsx src/components/QuizBattlePage.tour.test.tsx --maxWorkers=1
node tests/browser/student-tour-smoke.mjs
npm test -- --run --maxWorkers=2
npm run typecheck
npm run lint -- --max-warnings=0
npm run lint:anti-slop
$env:VITE_API_URL='/api'; npm run build
git diff --check
node .agents/skills/unlazy/scripts/gate-check.mjs GATES.md --status
```

The browser runner uses installed Edge by default. Set `TOUR_BROWSER_CHANNEL=chrome` to use installed Chrome. It opens a local Vite server on port 5187 and, in a fresh browser context per viewport, scrolls the page before launch, walks the full guide, checks that wheel scrolling is blocked, and on the phone and desktop viewports plays every page guide from Settings plus the header button. It closes the browser/server afterward. It stores screenshots and a JSON report under `.tmp/student-tour-browser/`.

**Browser verification boundary:** the fixture uses the real GuidedTour, step config, Sidebar, MobileBottomNav, SettingsPage, CSS, and lifecycle hook. Other feature screens are blocks generated from each step's anchor, with optional features left out as for a new student; the anchor-coverage unit test ties those anchors to production components. This proves tour/navigation geometry, spotlight existence, control bounds, focus containment, replay, and dismissal persistence without backend writes. It is not an authenticated end-to-end test of account-specific student content. No local student E2E credentials were configured during this implementation.

Signed-in release walkthrough:

- Check first login with both an outstanding IAR and a completed diagnostic.
- Complete/dismiss IAR, then verify automatic launch.
- Verify module, chat, battle, ranking, avatar and profile headings/targets against real loaded content.
- Check empty, offline, error, and loading states; Continue and Skip must remain available.
- Replay from Settings, including after saving preference edits.
- Check dismissal/reload and another student account on the same browser.
- Confirm no unintended assessment, chat, battle, reward or profile writes occur.
- Check Android hardware Back and safe-area behavior on a real device.

Recorded run results are in the `GATES.md` "Student guided onboarding tour" section; the browser runner writes screenshots to `.tmp/student-tour-browser/`.

## Teacher/admin implementation checklist

Reuse the engine rather than copying it. Keep role-specific policy in the caller.

1. Inventory actual role tabs and important workflows. Use the role's existing labels, not student labels.
2. Create `teacherTourSteps.ts` or `adminTourSteps.ts` using the same `TourStep` contract.
3. Add stable `data-tour` anchors to real role navigation and compact feature controls/headings.
4. Supply a role-specific navigation adapter with history replacement and original-screen restoration.
5. Define role readiness and blockers: unsaved work, import/upload progress, editors, destructive confirmation dialogs, or live operational workflows.
6. Add a role-specific first-use hook/storage key. Never share the student key or eligibility state.
7. Supply the progress label and menu preparation appropriate to the role's responsive navigation.
8. Add a replay action to that role's Settings/Help surface; preserve unsaved-change protection.
9. Write tests for launch, persistence, identity changes, blockers, keyboard behavior, and replay.
10. Extend the browser fixture/matrix with real role navigation, then run signed-in checks with role credentials.
11. Record feature coverage, omitted account-specific states, exact verification commands, and evidence.
12. Keep external changes out of the demonstration: no user creation, grade edits, assignments, uploads, deletions, imports, or notifications sent by advancing a tour.

Do not enable teacher/admin onboarding simply by mounting the student hook under those roles. They require their own step configuration and workflow safety audit.
