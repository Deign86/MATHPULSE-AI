import type { AnchorMatch, SheetMatrix } from '../types';
import { includesNormalized, normalizeText } from './normalizeText';
import { getMatrixCell, getRowText } from './sheetMatrix';

function scoreAnchorMatch(cellValue: unknown, anchor: string): number {
  const normalizedCell = normalizeText(cellValue);
  const normalizedAnchor = normalizeText(anchor);
  if (!normalizedCell || !normalizedAnchor) return 0;
  if (normalizedCell === normalizedAnchor) return 1;
  if (normalizedCell.includes(normalizedAnchor)) return 0.9;
  return 0.75;
}

export function findAnchorMatchesInSheet(
  matrix: SheetMatrix,
  anchors: readonly string[],
): AnchorMatch[] {
  const matches: AnchorMatch[] = [];

  for (let rowOffset = 0; rowOffset < matrix.rowCount; rowOffset += 1) {
    for (let colOffset = 0; colOffset < matrix.colCount; colOffset += 1) {
      const cell = matrix.cells[rowOffset][colOffset];
      if (!cell || !cell.normalizedText) continue;

      anchors.forEach((anchor) => {
        if (!includesNormalized(cell.normalizedText, anchor)) return;
        matches.push({
          sheetName: matrix.sheetName,
          anchor,
          row: cell.row,
          col: cell.col,
          address: cell.address,
          value: String(cell.displayValue ?? ''),
          confidence: scoreAnchorMatch(cell.displayValue, anchor),
        });
      });
    }

    const row = matrix.startRow + rowOffset;
    const rowText = getRowText(matrix, row);
    if (rowText) {
      anchors.forEach((anchor) => {
        if (!includesNormalized(rowText, anchor)) return;

        const firstCellInRow = matrix.cells[rowOffset].find((cell) => cell?.normalizedText);
        if (!firstCellInRow) return;

        matches.push({
          sheetName: matrix.sheetName,
          anchor,
          row,
          col: firstCellInRow.col,
          address: firstCellInRow.address,
          value: rowText,
          confidence: 0.8,
        });
      });
    }
  }

  return matches;
}

export function findAnchorMatchesAcrossWorkbook(
  matrices: Record<string, SheetMatrix>,
  anchors: readonly string[],
): AnchorMatch[] {
  return Object.values(matrices).flatMap((matrix) => findAnchorMatchesInSheet(matrix, anchors));
}

export function findFirstAnchor(matrix: SheetMatrix, anchor: string): AnchorMatch | undefined {
  const matches = findAnchorMatchesInSheet(matrix, [anchor]);
  return matches.sort((a, b) => a.row - b.row || a.col - b.col)[0];
}

export function findAllAnchors(matrix: SheetMatrix, anchor: string): AnchorMatch[] {
  return findAnchorMatchesInSheet(matrix, [anchor]).sort((a, b) => a.row - b.row || a.col - b.col);
}

export function findNeighborValue(
  matrix: SheetMatrix,
  row: number,
  col: number,
  searchDistance = 6,
): string | undefined {
  for (let delta = 1; delta <= searchDistance; delta += 1) {
    const right = getMatrixCell(matrix, row, col + delta);
    const rightValue = right?.displayValue;
    if (rightValue !== undefined && rightValue !== null && String(rightValue).trim()) {
      return String(rightValue).trim();
    }
  }

  for (let delta = 1; delta <= searchDistance; delta += 1) {
    const down = getMatrixCell(matrix, row + delta, col);
    const downValue = down?.displayValue;
    if (downValue !== undefined && downValue !== null && String(downValue).trim()) {
      return String(downValue).trim();
    }
  }

  return undefined;
}

export function findHeaderRowNearAnchor(matrix: SheetMatrix, anchorRow: number, windowSize = 5): number {
  let bestRow = anchorRow;
  let bestSignalCount = -1;

  for (let row = Math.max(matrix.startRow, anchorRow - windowSize); row <= Math.min(matrix.endRow, anchorRow + windowSize); row += 1) {
    const rowText = getRowText(matrix, row);
    const signalCount = [
      'LEARNERS NAMES',
      'WRITTEN WORK',
      'PERFORMANCE TASKS',
      'QUARTERLY ASSESSMENT',
      'REMARK',
    ].reduce((count, token) => (rowText.includes(token) ? count + 1 : count), 0);

    if (signalCount > bestSignalCount) {
      bestSignalCount = signalCount;
      bestRow = row;
    }
  }

  return bestRow;
}
