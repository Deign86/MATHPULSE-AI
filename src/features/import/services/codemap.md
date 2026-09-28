# src/features/import/services/

## Responsibility
- Contains SHS Excel parsing and workbook transformation services used by teacher import UI.

## Design
- `shsExcel/parser` decomposes workbook reading, format detection, sheet extraction, normalization, and validation.
- Parser modules exchange typed `SheetMatrix`, `WorkbookReadResult`, and parse-result structures from `types.ts`.

## Flow
- Import UI/hook → `parseShsWorkbook` → parser stages → normalized/validated `ParseWorkbookResult`; accepted records are sent by `apiService.uploadClassRecords` to `POST /api/upload/class-records`.

## Integration
- These services are client-side and do not transition IAR states (`not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`).
- Quiz Battle RTDB queue is unrelated.
