# src/pages/

## Responsibility
- Contains page-level experiences; current sample: `AssessmentPage` runs a student's diagnostic test.

## Design
- `AssessmentPage` receives test ID, `DiagnosticQuestion[]`, learner name, and completion/cancel callbacks rather than loading route data itself.
- Local state tracks question progression, timed answers, submission, and result display.

## Flow
- Assessment route/container → `AssessmentPage` → `submitDiagnostic` in `diagnosticService` → `POST /api/diagnostic/submit` → completion callback.
- Questions/test ID are provided by the caller; timer expiry advances with an unanswered response.

## Integration
- Diagnostic completion feeds the caller's assessment workflow; IAR states are `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed` (page does not directly set these).
- No Quiz Battle RTDB queue integration in this page.
