# src/components/onboarding/

## Responsibility

Interactive onboarding for students, teachers and admins: a general first-use guide per role plus detailed per-page guides, on one role-neutral engine.

## Design

- `GuidedTour.tsx`: controlled-by-mount Radix modal. Ordered `TourStep`s (`target`, `tab`, `menu`, `view`, `optional`), spotlight on the feature region, card placement that never covers the highlight, scrolling of user-scrollable ancestors only (never `scrollIntoView`), clearance from `data-tour-sticky` bars, waiting up to 12 s for slow pages with a loading indicator, focus trap and restore. Exports `TourStep` and `TourPage` (`overview` + detailed `steps`). Navigation and dismissal are caller-owned.
- `studentTourSteps.ts`, `teacherTourSteps.ts`, `adminTourSteps.ts`: each role's pages (`*TourPages`), general guide (`*TourSteps`: welcome, one overview per page, page-guide pointer) and `*PageTour(tab)` lookup. Tabs are the host's own tab/view ids.
- `PageGuideConfirm.tsx`: the question the header ? button asks before a guide plays ("Play the <page> guide?", Play guide / Skip), on the shared `AlertDialog`; the ? button is its trigger, so focus returns to it after Skip.
- `GuideReplayCard.tsx`: the Settings card (replay full guide, page-guide grid, unsaved-edit protection) shared by all three Settings pages.
- `*TourSteps.test.ts`: every selector must exist as an anchor in production source; no heading targets; page guides stay on their tab.

## Flow

Host (`App` for students, `TeacherDashboard`, `AdminDashboard`) + `useOnboardingTour(role, …)` eligibility (the header ? button goes through `PageGuideConfirm` first) → mount `GuidedTour` (keyed by guide) → per step: host navigates, opens phone submenus (`menu`) and reveals hidden screens (`view`) → engine measures the visible target, scrolls it clear of pinned bars, draws the cutout and card → Back/Continue/Skip → host persists dismissal and restores the starting page.

## Integration

Anchors: `data-tour` on feature regions, `data-tour-nav` on navigation entries, `data-tour-group="Profile"` on profile menus, `data-tour-sticky` on pinned bars. Keep these attributes when changing layouts; the config tests fail if one disappears.

Docs: `docs/student-onboarding-guide.md` (engine and student), `docs/teacher-onboarding-guide.md`, `docs/admin-onboarding-guide.md`. Browser fixture and viewport runner: `tests/browser/`.
