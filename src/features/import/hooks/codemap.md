# src/features/import/hooks/

## Responsibility
- `useShsExcelImport` manages SHS workbook parsing state and derives whether a parsed workbook may be confirmed.

## Design
- State machine stages are `idle`, `reading`, `detecting format`, `extracting`, `validating`, `complete`, and `failed` with progress/message/result/error fields.
- Uses `DETECTION_CONFIDENCE_THRESHOLD`; parser progress callbacks update stage, and critical validation/confidence errors block confirmation.

## Flow
- `DataImportExcel` → `parseFile` → `parseShsWorkbook` → result/stage returned to UI; parent upload later uses `POST /api/upload/class-records`.

## Integration
- This hook has no IAR writes; IAR states are `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`.
- No Quiz Battle RTDB queue integration.
