# src/features/import/services/shsExcel/parser/utils/

## Responsibility
- Supplies reusable low-level workbook matrix, cell, range, anchor, text, and learner-row helpers to the SHS parser.

## Design
- `sheetMatrix.ts` converts raw snapshots into indexed `SheetMatrix` values; `mergedCells.ts` resolves merged-cell roots and values.
- `findAnchors.ts`, `classifyRows.ts`, `normalizeText.ts`, and `rangeTracker.ts` support structural detection, row classification, comparison, and provenance.

## Flow
- Parser stages call these pure/helper functions while reading and extracting a workbook; normalized results eventually reach caller upload via `POST /api/upload/class-records`.

## Integration
- Utilities do not call backend endpoints or modify IAR; broader IAR states are `not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`.
- No Quiz Battle RTDB queue integration.
