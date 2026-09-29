# functions/src/automations/

## Responsibility
Implements diagnostic and quiz workflows, risk and IAR classification, learning-path recommendations, reassessment, notifications, lifecycle checks, and version backfill.

## Design
`riskAnalyzer`, `iarAssessmentScoring`, and `learningPathEngine` provide rule-based logic; `diagnosticProcessor` coordinates writes and optional backend calls. Backfill validates allowed patches and pages collections.

## Flow
`onDiagnosticComplete` → `processDiagnosticCompletion` → risk/policy scoring → assignments, profile, snapshots, logs, quizzes, interventions, learning path, notification. `onQuizSubmitted` → `processQuizSubmission` → `users` update → notification. Manual handlers reuse these processors.

## Integration
Consumes `config/constants` and `config/diagnosticPolicies`; uses `services/backendApi` and `notificationSender`. Reads/writes `users`, `deepDiagnosticAssignments`, `learnerMasterySnapshots`, `recommendationLogs`, `learningPaths`, `assignedQuizzes`, `progressionAuditLog`, `auditLogs`, `interventions`, and `notifications`. Triggers: `onDiagnosticComplete`, `onQuizSubmitted`, `onStudentProfileUpdated`, and manual callables.
