# src/features/DataImport/

## Responsibility
- `DataImportView` is the teacher-facing workflow for importing SHS class records and course materials.

## Design
- One view owns upload selection, workbook parse results, confirmation, history/edit views, and callbacks to its host dashboard.
- Uses `parseShsWorkbook`, `resolveClassMetadata`, student assignment/risk helpers, and typed `apiService` calls.

## Flow
- Teacher class page → `DataImportView` → `parseShsWorkbook` for spreadsheet validation → `apiService.uploadClassRecords` (`POST /api/upload/class-records`) or `uploadCourseMaterials` (`POST /api/upload/course-materials`) → host callbacks update class/student UI.

## Integration
- Student imports may refresh records and risk fields; they do not set IAR states (`not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`).
- No Quiz Battle RTDB queue integration.
