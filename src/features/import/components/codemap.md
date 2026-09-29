# src/features/import/components/

## Responsibility
- `DataImportExcel` presents SHS workbook selection, parse progress, validation feedback, and result review entry point.

## Design
- Uses `useShsExcelImport` for parser state and reports completed `ParseShsWorkbookResult` via `onParsed`.
- Enforces `.xlsx`/`.xls` extensions and a 10 MB client-side limit; parser errors and low-confidence results are surfaced to the teacher.

## Flow
- Teacher file/drop → `DataImportExcel.handleFile` → `useShsExcelImport.parseFile` → `parseShsWorkbook` → `onParsed`; the owning page performs confirmation/upload to `POST /api/upload/class-records`.

## Integration
- Component has no direct IAR or RTDB dependency; surrounding student workflow states remain `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`.
- Quiz Battle RTDB queue is unrelated.
