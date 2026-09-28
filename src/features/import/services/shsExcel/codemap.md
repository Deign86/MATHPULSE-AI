# src/features/import/services/shsExcel/

## Responsibility
- Implements client-side interpretation of official DepEd SHS Excel class-record workbooks.

## Design
- `parser/index.ts` exports `parseShsWorkbook`; parser helpers use spreadsheet matrices and typed extraction/validation results.
- Workbook parsing is independent from persistence; callers decide whether to submit imported records.

## Flow
- `parseShsWorkbook(File)` → `readWorkbookFromFile` → `detectFormat` → extract input/quarter/final/reference sheets → `normalizeWorkbook` → `validateWorkbook` / `mapWorkbookToMathPulseEntities`.
- Parent confirmation submits class data through `apiService.uploadClassRecords` → `POST /api/upload/class-records`.

## Integration
- No direct IAR-state mutation; states in the broader workflow are `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`.
- No Quiz Battle RTDB queue integration.
