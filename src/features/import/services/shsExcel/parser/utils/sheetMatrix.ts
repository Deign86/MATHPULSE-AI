import { utils as xlsxUtils } from 'xlsx';
import type { MergeRange, RawSheetSnapshot, SheetMatrix } from '../types';
import { coerceDisplayValue, normalizeText } from './normalizeText';
import { buildMergedAddressRootMap, resolveCellSnapshot } from './mergedCells';

const FALLBACK_REF = 'A1:A1';
const MAX_MATRIX_ROWS = 1200;
const MAX_MATRIX_COLS = 200;
const MAX_MATRIX_CELLS = 200000;

type DecodedRange = {
  s: { r: number; c: number };
  e: { r: number; c: number };
};

function clampRange(range: DecodedRange): DecodedRange {
  const startRow = Math.max(0, range.s.r);
  const startCol = Math.max(0, range.s.c);
  let endRow = Math.max(startRow, range.e.r);
  let endCol = Math.max(startCol, range.e.c);

  if (endRow - startRow + 1 > MAX_MATRIX_ROWS) {
    endRow = startRow + MAX_MATRIX_ROWS - 1;
  }

  if (endCol - startCol + 1 > MAX_MATRIX_COLS) {
    endCol = startCol + MAX_MATRIX_COLS - 1;
  }

  const rowCount = endRow - startRow + 1;
  const colCount = endCol - startCol + 1;
  const cellCount = rowCount * colCount;

  if (cellCount > MAX_MATRIX_CELLS) {
    const maxRowsFromCellCap = Math.max(1, Math.floor(MAX_MATRIX_CELLS / colCount));
    endRow = startRow + Math.min(rowCount, maxRowsFromCellCap) - 1;
  }

  return {
    s: { r: startRow, c: startCol },
    e: { r: endRow, c: endCol },
  };
}

function tryDecodeRange(ref: string | undefined): DecodedRange {
  if (!ref) {
    return xlsxUtils.decode_range(FALLBACK_REF);
  }

  try {
    return xlsxUtils.decode_range(ref);
  } catch {
    return xlsxUtils.decode_range(FALLBACK_REF);
  }
}

function buildObservedRange(sheet: RawSheetSnapshot): DecodedRange | null {
  let minRow = Number.POSITIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;

  Object.keys(sheet.cells).forEach((address) => {
    try {
      const decoded = xlsxUtils.decode_cell(address);
      minRow = Math.min(minRow, decoded.r);
      minCol = Math.min(minCol, decoded.c);
      maxRow = Math.max(maxRow, decoded.r);
      maxCol = Math.max(maxCol, decoded.c);
    } catch {
      // Ignore malformed cell addresses.
    }
  });

  sheet.merges.forEach((merge) => {
    minRow = Math.min(minRow, merge.s.r, merge.e.r);
    minCol = Math.min(minCol, merge.s.c, merge.e.c);
    maxRow = Math.max(maxRow, merge.s.r, merge.e.r);
    maxCol = Math.max(maxCol, merge.s.c, merge.e.c);
  });

  if (!Number.isFinite(minRow) || !Number.isFinite(minCol) || !Number.isFinite(maxRow) || !Number.isFinite(maxCol)) {
    return null;
  }

  return {
    s: { r: Math.max(0, Math.trunc(minRow)), c: Math.max(0, Math.trunc(minCol)) },
    e: { r: Math.max(0, Math.trunc(maxRow)), c: Math.max(0, Math.trunc(maxCol)) },
  };
}

function resolveEffectiveRange(sheet: RawSheetSnapshot): DecodedRange {
  const declared = tryDecodeRange(sheet.ref || FALLBACK_REF);
  const observed = buildObservedRange(sheet);
  return clampRange(observed || declared);
}

export function buildSheetMatrix(sheetName: string, sheet: RawSheetSnapshot): SheetMatrix {
  const decodedRange = resolveEffectiveRange(sheet);
  const ref = `${xlsxUtils.encode_cell(decodedRange.s)}:${xlsxUtils.encode_cell(decodedRange.e)}`;
  const mergedRootMap = buildMergedAddressRootMap(sheet.merges);

  const rowCount = decodedRange.e.r - decodedRange.s.r + 1;
  const colCount = decodedRange.e.c - decodedRange.s.c + 1;
  const cells: SheetMatrix['cells'] = [];

  for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
    const row = decodedRange.s.r + rowOffset;
    const rowCells: Array<SheetMatrix['cells'][number][number]> = [];

    for (let colOffset = 0; colOffset < colCount; colOffset += 1) {
      const col = decodedRange.s.c + colOffset;
      const address = xlsxUtils.encode_cell({ r: row, c: col });
      const snapshot = resolveCellSnapshot(sheet, address, mergedRootMap);

      if (!snapshot) {
        rowCells.push(null);
        continue;
      }

      const displayValue = coerceDisplayValue(snapshot.w ?? snapshot.v);
      rowCells.push({
        address,
        row,
        col,
        v: snapshot.v,
        w: snapshot.w,
        t: snapshot.t,
        f: snapshot.f,
        displayValue,
        normalizedText: normalizeText(displayValue),
        mergedFrom: mergedRootMap[address] !== address ? mergedRootMap[address] : undefined,
      });
    }

    cells.push(rowCells);
  }

  return {
    sheetName,
    ref,
    startRow: decodedRange.s.r,
    endRow: decodedRange.e.r,
    startCol: decodedRange.s.c,
    endCol: decodedRange.e.c,
    rowCount,
    colCount,
    cells,
  };
}

export function getMatrixCell(matrix: SheetMatrix, row: number, col: number) {
  if (row < matrix.startRow || row > matrix.endRow) return null;
  if (col < matrix.startCol || col > matrix.endCol) return null;
  return matrix.cells[row - matrix.startRow]?.[col - matrix.startCol] ?? null;
}

export function getMatrixCellByOffset(matrix: SheetMatrix, rowOffset: number, colOffset: number) {
  return matrix.cells[rowOffset]?.[colOffset] ?? null;
}

export function getRowText(matrix: SheetMatrix, row: number): string {
  if (row < matrix.startRow || row > matrix.endRow) return '';
  const rowCells = matrix.cells[row - matrix.startRow] || [];
  return rowCells
    .map((cell) => cell?.normalizedText || '')
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function getColumnLabel(col: number): string {
  return xlsxUtils.encode_col(col);
}

export function getColumnIndex(colLabel: string): number {
  const normalized = String(colLabel || '').trim().toUpperCase();
  if (!normalized) return -1;
  if (!/^[A-Z]+$/.test(normalized)) return -1;

  try {
    return xlsxUtils.decode_col(normalized);
  } catch {
    return -1;
  }
}

export function rangeToA1(range: MergeRange): string {
  return `${xlsxUtils.encode_cell(range.s)}:${xlsxUtils.encode_cell(range.e)}`;
}

export function parseA1Range(range: string): MergeRange {
  const decoded = xlsxUtils.decode_range(range);
  return {
    s: { r: decoded.s.r, c: decoded.s.c },
    e: { r: decoded.e.r, c: decoded.e.c },
  };
}

export function sliceMatrix2D(
  matrix: SheetMatrix,
  range: MergeRange,
): Array<Array<string | number | boolean | null>> {
  const output: Array<Array<string | number | boolean | null>> = [];

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const rowValues: Array<string | number | boolean | null> = [];
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell = getMatrixCell(matrix, row, col);
      rowValues.push((cell?.displayValue as string | number | boolean | null) ?? null);
    }
    output.push(rowValues);
  }

  return output;
}
