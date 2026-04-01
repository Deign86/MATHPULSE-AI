# BUG AUDIT REPORT

Date: 2026-04-01
Branch: fix/bug-audit-devtools-2026-04-01
Method: Chrome DevTools MCP route sweeps + source fixes + verification reloads
Scope: Student, Teacher, Admin routes; console/runtime/network/forms/a11y/mobile checks

## Fixed Bugs

### BUG-001
- Route(s): Admin Dashboard (Top Performers)
- Severity: High
- Category: Runtime / Firestore query robustness
- Symptom: Console error when top performers query required a composite index.
- Root Cause: `orderBy('currentXP')` query in `getTopPerformers` failed with Firestore `failed-precondition` in some deployments.
- Fix: Added fallback query path and local sort in `src/services/adminService.ts` when index is unavailable.
- Verification: Admin dashboard loaded without runtime errors after reload; top performers still rendered.
- Status: Fixed

### BUG-002
- Route(s): Student initial assessment skip flow
- Severity: High
- Category: Data persistence / runtime
- Symptom: Console `invalid-argument` surfaced during skip flow writes; diagnostic state did not persist reliably.
- Root Cause: Profile update allowlist blocked diagnostic-related fields from being saved.
- Fix: Expanded allowed student profile update keys in `src/services/authService.ts` to include diagnostic and learning-path state fields.
- Verification: Skip flow completed without console errors; profile state persisted across refresh.
- Status: Fixed

### BUG-003
- Route(s): Student dashboard initialization
- Severity: Medium
- Category: UX state race
- Symptom: Initial assessment modal reopened before profile hydration finished.
- Root Cause: Auto-open effect ran before profile readiness.
- Fix: Gated modal auto-open effect behind profile-ready state in `src/App.tsx`.
- Verification: Modal behavior stabilized on load/reload.
- Status: Fixed

### BUG-004
- Route(s): Notifications service writes
- Severity: Medium
- Category: Firestore payload validation
- Symptom: Notification writes intermittently failed with invalid argument.
- Root Cause: Optional `actionUrl` could be written as `undefined`.
- Fix: Omitted `actionUrl` from payload when undefined in `src/services/notificationService.ts`.
- Verification: Notification-related flows stopped throwing payload validation errors.
- Status: Fixed

### BUG-005
- Route(s): Teacher Dashboard UI metadata rows
- Severity: Medium
- Category: UI rendering quality
- Symptom: Corrupted separator glyphs (`-€¢`) appeared in teacher cards.
- Root Cause: Invalid character sequence in static copy.
- Fix: Replaced with stable separators (`|`, `-`) in `src/components/TeacherDashboard.tsx`.
- Verification: Teacher dashboard labels rendered cleanly.
- Status: Fixed

### BUG-006
- Route(s): Teacher Topic Mastery
- Severity: Medium
- Category: Accessibility / form semantics
- Symptom: DevTools issue: form fields missing id/name.
- Root Cause: Search and filter controls lacked identifiers.
- Fix: Added `id` and `name` attributes in `src/components/TopicMasteryView.tsx`.
- Verification: DevTools issue count reduced for teacher view.
- Status: Fixed

### BUG-007
- Route(s): Teacher Student Competency table
- Severity: Medium
- Category: Accessibility / form semantics
- Symptom: DevTools issue for unlabeled or unidentified search field.
- Root Cause: Search input lacked explicit id/name.
- Fix: Added id/name in `src/components/StudentCompetencyTable.tsx`.
- Verification: No related form identifier issue after reload.
- Status: Fixed

### BUG-008
- Route(s): Admin Mastery Heatmap
- Severity: Medium
- Category: Accessibility / form semantics
- Symptom: DevTools form control warning on filter select.
- Root Cause: Subject filter missing id/name.
- Fix: Added id/name in `src/components/MasteryHeatmap.tsx`.
- Verification: Warning cleared in admin heatmap checks.
- Status: Fixed

### BUG-009
- Route(s): Login / Register page
- Severity: Medium
- Category: Accessibility / auth form UX
- Symptom: Label-association and autocomplete warnings.
- Root Cause: Inputs/selects missing proper htmlFor/id/name/autocomplete wiring.
- Fix: Added explicit labels and autocomplete hints in `src/components/LoginPage.tsx`.
- Verification: Auth page no longer emitted missing-label form warnings.
- Status: Fixed

### BUG-010
- Route(s): AI Chat page
- Severity: Medium
- Category: Accessibility / form semantics
- Symptom: Search/message controls and icon buttons flagged by audit.
- Root Cause: Missing ids/names and aria labels.
- Fix: Added form identifiers and aria labels in `src/components/AIChatPage.tsx`.
- Verification: AI chat route passed follow-up console/issue sweep.
- Status: Fixed

### BUG-011
- Route(s): Grades / Assessment page
- Severity: Medium
- Category: Accessibility / form semantics
- Symptom: Filter controls lacked explicit identifiers.
- Root Cause: Subject/type selects missing id/name.
- Fix: Added id/name to filters in `src/components/GradesPage.tsx`.
- Verification: No form-field identifier issues on reassessment route checks.
- Status: Fixed

### BUG-012
- Route(s): Settings modal
- Severity: Medium
- Category: Accessibility / label associations
- Symptom: Persistent DevTools issue: "No label associated with a form field".
- Root Cause: Section headings were implemented as `<label>` without matching form targets; several controls lacked explicit identifiers/names.
- Fix: Reworked heading labels to semantic text, added htmlFor/id/name pairs, added switch aria labels, and labeled password input in `src/components/SettingsModal.tsx`.
- Verification: Issue disappeared across Account, Notifications, Appearance, Privacy, and Learning tabs.
- Status: Fixed

### BUG-013
- Route(s): Global top search
- Severity: Low
- Category: Accessibility
- Symptom: Missing explicit label association risk.
- Root Cause: Search input depended on placeholder/adjacent text.
- Fix: Added dedicated label + id/name wiring in `src/components/SearchBar.tsx`.
- Verification: Search control reported with explicit accessible name in snapshots.
- Status: Fixed

### BUG-014
- Route(s): Floating AI tutor widget
- Severity: Low
- Category: Accessibility
- Symptom: Icon-only controls lacked explicit names.
- Root Cause: Buttons relied on icon/title fallback only.
- Fix: Added aria labels and button typing in `src/components/FloatingAITutor.tsx`.
- Verification: Controls surfaced with explicit names in a11y snapshot.
- Status: Fixed

### BUG-015
- Route(s): Modules page
- Severity: Medium
- Category: Accessibility / form semantics
- Symptom: DevTools issue: "A form field element should have an id or name attribute".
- Root Cause: Modules search input missing id/name.
- Fix: Added explicit label + id/name in `src/components/ModulesPage.tsx`.
- Verification: Warning cleared after reload and route revisit.
- Status: Fixed

## Not Fixed (Intentionally Skipped)

### SKIP-001
- Observation: Intermittent Firestore listen long-poll request lines marked `net::ERR_ABORTED` during channel handoff.
- Reason Skipped: This is expected transport behavior during listen stream reconnection and did not surface as app-level runtime errors.
- Mitigation: Monitored console for paired errors; none persisted after route transitions.

## Verification Summary
- DevTools issue checks were rerun after each targeted patch.
- Student route smoke pass completed on Dashboard, Modules, AI Chat, Assessment, Leaderboard, Avatar Studio.
- Mobile viewport pass completed at 390x844 for critical routes.
- Build validation passed: `npm run build` completed successfully.
- Non-blocking note: Vite chunk-size advisory remains (existing optimization opportunity, not a functional failure).
