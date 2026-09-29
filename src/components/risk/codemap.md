# src/components/risk/

## Responsibility
- Display student risk classification/details and allow review of the associated intervention checklist.
- Files: InterventionChecklistPanel, RiskBadge, RiskDetailPanel.

## Design
- `RiskBadge` is a compact prop-driven risk indicator; detail/checklist panels accept selected student/risk/intervention records and change callbacks.
- State tracks checklist expansion or local checklist edits only; risk level and learner metrics are supplied by the parent.

## Flow
- Teacher selects a learner flagged by risk analytics → parent supplies risk record → badge/details render classification and evidence → teacher checks intervention action → callback/service updates the intervention record → panel reflects latest status.

## Integration
- Composed by teacher dashboards/student-risk views and root `AtRiskStudyBrief`; risk data and persistence are supplied by risk/analytics/intervention services and parent props.
- May connect conceptually to `intervention/InterventionVideoStep`; shared badges, panels, and controls use `components/ui/`.
