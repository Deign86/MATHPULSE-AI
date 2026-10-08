# Teacher guided onboarding

The teacher guide reuses the student guide's engine (`GuidedTour`), hook (`useOnboardingTour`) and Settings card (`GuideReplayCard`). Engine behavior (scrolling, pinned bars, waiting for slow pages, focus, keyboard and history rules) is documented in `docs/student-onboarding-guide.md`; this file covers what is teacher-specific.

## Teacher experience

- **General guide (first use):** launches once on the teacher Dashboard after data loads, when no modal or drawer is open. 12 steps: a welcome, one overview per teacher page (what it is for and where it lives in navigation), and a closing step on the **?** button. The welcome and closing steps say that step-by-step help lives in each page's guide.
- **Page guides:** the **?** button in the teacher header asks "Play the <page> guide?" (**Play guide** or **Skip**), then plays the guide for the current page. Teacher Settings → Teacher guide lists every page guide and replays the general guide. Buttons are disabled while Settings has unsaved edits, an unsubmitted password, or a save in progress.
- A guide started from a page returns there when it finishes or is skipped.
- First use is tracked per account and role: `mathpulse:teacher-tour:v1:<uid>` (students use `mathpulse:student-tour:v1:<uid>`).

## Safety

The guide only shows screens; the overlay blocks every click. It never generates, saves, publishes, assigns, uploads, imports, excludes topics, marks notifications read or changes the theme.

The **Intervention Center is never opened** by the guide: mounting it starts AI requests and telemetry for the selected student. My Classes explains it instead ("tap a student to open their Intervention Center"). `teacherTourSteps.test.ts` fails if any step targets the `intervention` view.

## Files

| File | Responsibility |
| --- | --- |
| `src/components/onboarding/teacherTourSteps.ts` | Teacher pages (`teacherTourPages`, each with an `overview` and detailed `steps`), general guide (`teacherTourSteps`), `teacherPageTour(view)`. Tabs are TeacherDashboard view ids. |
| `src/components/TeacherDashboard.tsx` | Hook wiring (ready = data loaded; blocked = logout/create-class/add-students/insight modals, schedule drawer, delete/remove confirmations), view navigation for the guide, origin restore, phone submenu hint (`teaching` / `insights` / `tools`), header **?** button, `NavItem` `tourNav` anchors, phone popup `data-tour-nav` anchors, bottom nav `data-tour-sticky`, guide-safe outside-click handling. |
| `src/components/teacher/TeacherSettingsPage.tsx` | Teacher guide card (`GuideReplayCard`), unsaved-edit protection. |
| Teacher feature components | `data-tour` anchors listed below. |

## Coverage

| Page (view id) | Features explained (`data-tour` anchor) |
| --- | --- |
| Dashboard (`dashboard`) | Class snapshot (`teacher-stats`), AI insight banner* (`teacher-insight`), My Classes (`teacher-classes`), quick counts* (`teacher-quick-stats`, xl only), AI insight button, schedule & activity panel (`teacher-schedule-toggle`), notifications (`notifications`), profile menu (`data-tour-group="Profile"`), page-guide button (`page-guide`) |
| My Classes (`analytics`) | Class switcher (`class-switcher`, or `class-empty` with no classes), class details*, class numbers*, students (with Intervention Center explanation)*, risk chart*, topic chart*, top performers / needs attention*, AI class insights*, section management* |
| Schedule & Calendar (`calendar`) | Month navigation (`calendar-month`), month grid (`calendar-grid`), day agenda* (`calendar-agenda`) |
| Topic Mastery (`topic_mastery`) | Mastery / availability tabs, filters, totals, topics with exclude (`mastery-*`) |
| Competency Matrix (`competency`) | Filters (`competency-filters`, also `data-tour-sticky`), totals, curriculum topics*, table (`competency-*`) |
| AI Quiz Maker (`quiz_maker`) | Create / Quiz Bank tabs (`quiz-tabs`), four-step flow*, guidelines*, basic settings* (`quiz-*`) |
| Question Bank (`question_bank`) | Totals, PDF processing form, processing status, questions (`qbank-*`) |
| Data Import (`import`) | Target class, uploads, student accounts, module availability*, data health, recent uploads (`import-*`) |
| Notifications (`notifications`) | Filters (`notif-filters`), list (`notif-list`) |
| Profile (`profile`) | Faculty ID card (`teacher-id-card`), edit actions, teacher information, account settings shortcut* (`teacher-profile-*`) |
| Settings (`settings`) | Sections (`teacher-settings-sections`; the phone tab list is `data-tour-sticky`), options panel, save bar*, guide card (`settings-guide`) |

\* Optional: skipped when the account's screen does not render it. Profile and Settings have no teacher header, so their overview steps highlight the ID card and the guide card.

## Verification

```powershell
npm test -- src/components/onboarding/ src/hooks/useOnboardingTour.test.tsx src/components/teacher/TeacherSettingsPage.tour.test.tsx --maxWorkers=1
```

Real app, 2026-10-08, signed in as the seeded teacher account: general guide and all 11 page guides measured per step on desktop (1440x900), tablet (768x1024) and phone (390x844). Every highlight landed on its own feature; phone menus opened for navigation steps; guides returned to the starting page. Findings fixed during this run: Profile/Settings overview targets, Competency's ~10 s data load (card now waits up to 12 s with a "Loading this page…" indicator), and Teacher Settings shrinking below its content in the dashboard's flex column (`shrink-0`), which had hidden the Save bar behind the tablet/phone bottom navigation for every teacher.
