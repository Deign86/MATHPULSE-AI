# src/features/

## Responsibility
- Feature modules group domain-specific UI, hooks, and services; sampled modules are `DataImport`, `import`, and `notifications`.

## Design
- `DataImportView` orchestrates teacher uploads; `features/import` parses SHS Excel workbooks; notifications expose provider-driven UI and Firestore sync.
- Modules compose shared `components/ui`, `apiService`, Firebase, and application contexts rather than introducing a store layer.

## Flow
- Teacher import view → `parseShsWorkbook` / `apiService.uploadClassRecords` or `uploadCourseMaterials` → `/api/upload/class-records` or `/api/upload/course-materials`.
- App notification provider → Firestore subscription service → notification context and bell/panel consumers.

## Integration
- Import can update learner records/risk data but does not itself drive IAR transitions: `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`.
- Quiz Battle RTDB matchmaking is not part of these sampled features.
