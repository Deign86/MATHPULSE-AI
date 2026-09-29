# src/pages/teacher/

## Responsibility
- Teacher page samples include `AtRiskDashboard`, which monitors managed learners and their risk indicators.

## Design
- `AtRiskDashboard` subscribes to Firestore `managedStudents` with `onSnapshot`, then filters/searches/sorts locally.
- `RiskBadge`, `RiskDetailPanel`, `InterventionChecklistPanel`, and `TeacherStatCard` show summary and learner detail.

## Flow
- Teacher dashboard route → `AtRiskDashboard` → Firestore `managedStudents` live snapshot → risk/intervention components; no FastAPI endpoint is called by this page.

## Integration
- Risk/diagnostic fields inform intervention work; IAR workflow states are `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed` (dashboard reads risk data, not the IAR state machine).
- No Quiz Battle RTDB queue integration.
