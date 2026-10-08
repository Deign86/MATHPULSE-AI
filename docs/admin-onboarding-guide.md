# Admin guided onboarding

The admin guide reuses the shared engine (`GuidedTour`), the role-scoped hook (`useOnboardingTour('admin', …)`) and the Settings card (`GuideReplayCard`). Engine behavior is documented in `docs/student-onboarding-guide.md`; teacher specifics are in `docs/teacher-onboarding-guide.md`.

## Admin experience

- **General guide (first use):** launches once on Overview when no modal is open and no create intent is pending. 13 steps: a welcome, one overview per admin page in sidebar order (Overview; User Management, Class Management; RAG Manager, AI Monitoring; Curriculum Control, Content; Analytics, Audit Log; Profile, Settings), and a closing step on the **?** button. The welcome and closing steps say that step-by-step help lives in each page's guide.
- **Page guides:** the **?** button in the admin header plays the current page's guide. Admin Settings → Admin guide lists every page guide and replays the general guide. Buttons are disabled while Settings has unsaved edits, an unsubmitted password, or a save or maintenance change in progress.
- On phones and tablets, the guide opens the Manage, AI, Curriculum or Insights menu for navigation steps. On screens below 1280px, Overview shows one card row at a time; the guide reveals the row it explains. The Content guide shows the Upload tab, then the Inventory tab, and restores the admin's own tab afterwards.
- First use is tracked per account and role: `mathpulse:admin-tour:v1:<uid>`.

## Safety

The guide only shows screens; the overlay blocks every click. Several admin controls write immediately, often without confirmation, so the guide explains them and never presses them: the **Maintenance** switch (locks the whole platform), subject availability switches, user activation and bulk actions (role, status, password reset), teacher assignment, file deletes, Deploy Knowledge Source, Rebuild Knowledge and Clear All, AI Monitoring Refresh, exports, and theme cards (live preview). The guide never uses the Overview "Add Faculty or Student" shortcut, because it auto-opens the create-user dialog.

## Files

| File | Responsibility |
| --- | --- |
| `src/components/onboarding/adminTourSteps.ts` | Admin pages (`adminTourPages`, each with an `overview` and detailed `steps`), general guide (`adminTourSteps`), `adminPageTour(tab)`. Tabs are `ADMIN_TABS` ids. |
| `src/components/AdminDashboard.tsx` | Hook wiring (ready = profile loaded; blocked = logout confirm, subjects help modal, pending create intent), navigation through `handleTabChange`, origin restore, Overview row reveal, header **?** button, notifications/profile anchors, Overview anchors, guide render, Content and Settings props. |
| `src/components/Sidebar.tsx` | `data-tour-nav={item.label}` for every role that uses it (students and admins). |
| `src/components/admin/AdminMobileBottomNav.tsx` | `tourMenu` hint, `data-tour-nav` items, `data-tour-sticky`, guide-safe outside-click handling; also fixed the Curriculum highlight for Curriculum Control. |
| `src/components/admin/AdminPdfUpload.tsx` | `tourView` shows Upload/Inventory while explained. |
| `src/components/admin/AdminSettingsPage.tsx` | Admin guide card, unsaved-edit protection. |

## Coverage

| Page | Features explained (`data-tour` anchor) |
| --- | --- |
| Overview | Hero (`admin-hero`), shortcuts (`admin-shortcuts`), key numbers (`admin-kpis`), row switcher* (`admin-overview-switch`, also `data-tour-sticky`), engagement, honor roll, academic priority, global mastery, subject mastery matrix, live campus stream (`admin-*`), quick counts* (`admin-quick-stats`), notifications, profile menu, page-guide button |
| User Management | Account counts (`users-kpis`), search/filter/add toolbar (`users-toolbar`), users list with row and bulk actions (`users-list`) |
| Class Management | Section totals (`classes-stats`), sections and teacher assignment (`classes-sections`) |
| RAG Manager | Totals (`rag-stats`), rebuild progress* (`rag-progress`), toolbar (`rag-toolbar`), subjects (`rag-subjects`), subject details (`rag-detail`) |
| AI Monitoring | Directory/refresh toolbar, main metrics, speed and success, summary, cost by feature* (`aimon-*`) |
| Curriculum Control | Totals, filters, subject list with availability switches (`subjects-*`), How it works button |
| Content | Totals, Upload/Inventory tabs, upload form, uploaded files (`content-*`) |
| Analytics | Range/refresh/export toolbar, key numbers, sub-tabs, outcomes (`analytics-*`) |
| Audit Log | Sync/export toolbar, totals, search and filters, events (`audit-*`) |
| Profile | ID card (`admin-id-card`), details form (`admin-profile-form`) |
| Settings | Sections (`admin-settings-sections`; phone strip is `data-tour-sticky`), options panel (`admin-settings-panel`), guide card (`settings-guide`) |

\* Optional: skipped when the screen does not render it.

## Verification

```powershell
npm test -- src/components/onboarding/ src/components/admin/AdminSettingsPage.tour.test.tsx --maxWorkers=1
```

Real-app results are recorded in `GATES.md` (ADMIN3).
