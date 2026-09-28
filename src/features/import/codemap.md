# src/features/import/

## Responsibility
- Implements SHS class-record workbook import; `DataImportExcel` collects a workbook and `useShsExcelImport` manages parser lifecycle.

## Design
- UI, hook, and parser layers are separated; parser results carry normalized records, diagnostics, and confidence/validation metadata.
- `DataImportView` also calls the parser directly for its integrated class-record upload flow.

## Flow
- `DataImportExcel` → `useShsExcelImport.parseFile` → `parseShsWorkbook` → callback supplies parsed result for review; parent confirms via `apiService.uploadClassRecords` → `POST /api/upload/class-records`.

## Integration
- Parser itself is client-side and does not set IAR states: `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`.
- No Quiz Battle RTDB queue integration.
