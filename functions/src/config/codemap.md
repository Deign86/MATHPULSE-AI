# functions/src/config/

## Responsibility
Defines shared risk, quiz, IAR, lifecycle, WRI, backend, and curriculum diagnostic policy settings.

## Design
`constants.ts` centralizes thresholds/defaults/environment settings. `diagnosticPolicies.ts` defines the Grade 11 topic policy, aliases, version set resolver, validators, mastery evaluation, and sanity checks.

## Flow
Diagnostic handler → resolve and validate policy → aggregate question evidence by canonical topic → mastery statuses and summary → processor persists snapshot and progression records. Other processors import thresholds and workflow settings.

## Integration
Consumed by `automations/diagnosticProcessor`, `iarAssessmentScoring`, `quizProcessor`, `riskAnalyzer`, `reassessmentEngine`, `backfillCurriculumVersion`, and `triggers/*`. Policy aliases map diagnostic keys to `learnerMasterySnapshots.byTopicGroup`; version tags flow to `deepDiagnosticAssignments`, `recommendationLogs`, `learningPaths`, and `assignedQuizzes`.
