# Teacher UI/UX Discovery Plan

## Objective
Track discoveries and fixes in teacher-facing UI, with live progress updates after each concrete action.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Completed

## Work Plan
- [x] Create this tracking file and define working structure.
- [x] Re-audit teacher-facing screens on desktop/mobile with Chrome DevTools.
- [x] Capture new discoveries with evidence.
- [x] Implement highest-impact UI/UX fixes.
- [x] Validate via snapshot + build and summarize final deltas.

## Discoveries Log
- Initial baseline: major mobile sidebar issue previously fixed in `TeacherDashboard.tsx`.
- Discovery 1 (Desktop): AI Insight banner displays raw markdown markers (`**...**`) in the rendered text.
- Discovery 2 (Analytics flow): Opening Class Analytics from sidebar can show a class title that does not match the student list when no class has been selected yet.
- Validation note: loading spinner seen briefly during reload was transient; dashboard resolves after data load.
- Discovery 3 (Student Competency): duplicated student rows appear in the competency table, and row expansion can become ambiguous when rows share the same student id.
- Discovery 4 (Intervention UX): low-risk students still receive a red warning-styled “AI Analysis - Learning Barriers” panel, which overstates urgency.
- Discovery 3 status: resolved by stable composite student keys, normalized class-section matching, and safer competency expansion identity handling.
- Discovery 4 status: resolved with risk-sensitive intervention framing and non-urgent visual tone for low-risk students.

## Changes Log
- Created `plan.md` and initialized progress workflow.
- Re-audited teacher dashboard via Chrome DevTools at desktop/mobile breakpoints.
- Fixed Discovery 1: AI Insight now renders through `ChatMarkdown` instead of plain text, preventing raw markdown tokens from leaking to UI.
- Fixed Discovery 2: analytics now uses an `effectiveAnalyticsClass` to keep selected class context and filtered students aligned, plus a fallback placeholder if no classes exist.
- Revalidated via snapshots and `npm run build` (success).
- Completed second pass hardening: competency-table dedup/row-key behavior and intervention severity styling.
- Final hardening: switched teacher analytics/edit-record views to composite student identity keys to prevent row key/state collisions when imported and managed data overlap.
- Final validation: frontend build and focused backend tests pass with updated changes.
