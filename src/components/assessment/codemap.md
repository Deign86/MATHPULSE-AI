# src/components/assessment/

## Responsibility
- Assessment entry, question interaction, timing/progress, feedback/results, diagnostic detail, and assessment-history visualizations.
- Files: AssessmentAnswerOptions, AssessmentFeedback, AssessmentHistoryChart, AssessmentHub, AssessmentProgressBar, AssessmentQuestionCard, AssessmentResultsModal, AssessmentTimer, DiagnosticBreakdown, InitialAssessmentModal; test: AssessmentHub.

## Design
- Reusable question/progress/feedback pieces are prop-driven; hubs and modals coordinate assessment lifecycle and diagnostic/result views.
- Props examples: `AssessmentProgressBar({ current, total })`, `AssessmentHistoryChart({ history })`, `DiagnosticBreakdown({ userId, mode, isOpen, onClose })`; question cards receive question, answer, and selection/submit callbacks.
- State tracks selected answers, current question, timer, active modal, and assessment status; result data uses assessment domain types.

## Flow
- Learner opens assessment → hub/modal starts and selects a question → answer changes local response and progress/timer → submit invokes assessment service → feedback/results/diagnostic components render saved response and history.

## Integration
- Used from assessment hub/dashboard and onboarding flows; assessment service/domain types provide questions, results, history, and diagnostic records.
- `AuthContext` supplies learner identity as needed; shared question controls, dialogs, charts, and progress primitives are consumed from `components/ui/`.
