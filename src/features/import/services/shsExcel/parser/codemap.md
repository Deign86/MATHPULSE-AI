# src/features/import/services/shsExcel/parser/

## Responsibility
- Parses, classifies, extracts, normalizes, and validates SHS workbook content into MathPulse import records.

## Design
- Public entry `parseShsWorkbook` coordinates `readWorkbookFromFile`, `detectFormat`, `extractInputData`, `extractQuarterSheet`, `extractFinalSemestral`, `extractReferenceSheets`, `normalizeWorkbook`, and `validateWorkbook`.
- `RangeTracker`, parser `types.ts`, and `constants.ts` track cell provenance, schema, and confidence thresholds; progress/telemetry are emitted by the entry point.

## Flow
- File → workbook matrices → detected sheet roles → extracted content → normalized entities → validation/diagnostics and parse result; caller then posts accepted class records to `/api/upload/class-records`.

## Integration
- Parsing has no IAR transition side effects: `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`.
- Quiz Battle RTDB queue is unrelated.
