# F3 Manual QA Summary

Date: 2026-09-21
Environment: `https://mathpulse-ai-2026.web.app`
Account: authenticated `Test Student`
Browser: existing Chrome DevTools tab, pageId `1`; no Playwright, server, or new browser window
Viewport checks: desktop `1280x900`; mobile `390x844`

## Verdicts

| Surface | Verdict | Evidence | Observation |
| --- | --- | --- | --- |
| Student lesson: no evidence button | APPROVE | `04-student-lesson-no-evidence.png` | Lesson fallback showed `AI lesson unavailable (Failed to load lesson content.)` and the DepEd PDF. No `Inspect evidence` or evidence action was exposed to the student. |
| Study Journey persistence after reload | FAIL | `19-study-journey-selected-before-reload.png`, `20-study-journey-after-reload-no-selection.png` | Financial Application journey showed `Study Journey`, `Lessons 0/2`, and `Quizzes 0/1` before reload. Reloading `/modules` without reselecting returned to the module list and removed the selected journey. |
| Grades CSV export | APPROVE | `01-grades-baseline.png`, `02-grades-export-trigger.png`, `18-grades-export-no-pdf-control.png` | `Export Report` produced CSV files twice. Artifacts: `C:\Users\APG\Downloads\grade-report-test-student-2026-09-21.csv` and `C:\Users\APG\Downloads\grade-report-test-student-2026-09-21 (1).csv`; both were 1685 bytes. |
| Grades PDF export | FAIL | `18-grades-export-no-pdf-control.png` | The deployed page exposed only one `Export Report` button. No CSV/PDF format control or PDF artifact was available. |
| In-match panel | APPROVE | `08-battle-starting-validation.png`, `09-in-match-panel.png` | `/battle` reached an active quiz panel with question `1 / 5`, answer options, and result feedback. |
| Notification mark-read persistence | FAIL | `21-notifications-before-mark-read-mobile.png`, `22-notifications-after-mark-read-still-unread.png` | Panel initially showed `1 unread alerts`. Clicking `Mark all notifications as read` closed the panel and temporarily removed the badge, but reopening immediately restored `1 unread alerts`. |
| Student Pass QR to `/verify` | FAIL | `11-student-pass-qr.png`, `16-student-pass-flipped.png`, `17-verify-route-dashboard-fallback.png` | The flipped card rendered a plain `Digital Verification QR` SVG with no enclosing `href`. Direct navigation to `/verify/FFPaNjRJrzQbFmarEw8DPNX1JnI2?src=id_card` loaded the dashboard shell rather than a verification page. |
| Sidebar tween and reduced motion | APPROVE | `12-sidebar-expanded.png`, `13-sidebar-collapsed.png`, `14-sidebar-expanded-reduced-motion.png`, `15-sidebar-collapsed-reduced-motion.png` | Desktop collapse removed labels and hover exposed `Expand sidebar`; expanding restored `Collapse sidebar`. The same state transitions settled under a reduced-motion media-query override. |
| XP and counts live update | FAIL | `05-dashboard-live-metrics-before.png`, `10-notifications-unread-before-mark-read.png`, `21-notifications-before-mark-read-mobile.png` | Dashboard consistently showed `XP 287` and `Lesson Progress 2 of 5 Lessons`. A claimed daily reward notification was present, but XP and lesson counts did not change during the sweep. |

## Additional observations

- `/modules` lesson generation fell back to the source PDF because AI lesson loading failed.
- The daily reward claim remained `CLAIMING...` during the initial interaction and did not visibly change XP.
- The desktop/full-page screenshot operation intermittently timed out; node and viewport screenshots were captured successfully instead.
- No application source files were changed during this QA sweep.

## Evidence inventory

```text
01-grades-baseline.png
02-grades-export-trigger.png
03-modules-list.png
04-student-lesson-no-evidence.png
05-dashboard-live-metrics-before.png
06-study-journey-before-reload.png
07-study-journey-after-reload.png
08-battle-starting-validation.png
09-in-match-panel.png
10-notifications-unread-before-mark-read.png
11-student-pass-qr.png
12-sidebar-expanded.png
13-sidebar-collapsed.png
14-sidebar-expanded-reduced-motion.png
15-sidebar-collapsed-reduced-motion.png
16-student-pass-flipped.png
17-verify-route-dashboard-fallback.png
18-grades-export-no-pdf-control.png
19-study-journey-selected-before-reload.png
20-study-journey-after-reload-no-selection.png
21-notifications-before-mark-read-mobile.png
22-notifications-after-mark-read-still-unread.png
```
