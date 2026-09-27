import { describe, expect, it } from 'vitest';
import type { SheetMatrix } from '../types';
import { findAnchorMatchesInSheet, findNeighborValue } from '../utils/findAnchors';

function buildMatrix(values: string[][]): SheetMatrix {
  const rowCount = values.length;
  const colCount = values[0]?.length || 0;
  return {
    sheetName: 'TestSheet',
    ref: 'A1:E20',
    startRow: 0,
    endRow: rowCount - 1,
    startCol: 0,
    endCol: colCount - 1,
    rowCount,
    colCount,
    cells: values.map((row, rowIndex) =>
      row.map((value, colIndex) => ({
        address: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`,
        row: rowIndex,
        col: colIndex,
        displayValue: value,
        normalizedText: value.toUpperCase(),
      })),
    ),
  };
}

describe('findAnchors', () => {
  it('finds normalized anchors with spacing drift', () => {
    const matrix = buildMatrix([
      ['Senior   High', 'School Class Record', '', '', ''],
      ['', '', '', '', ''],
    ]);

    const matches = findAnchorMatchesInSheet(matrix, ['SENIOR HIGH SCHOOL CLASS RECORD']);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('finds neighbor value on same row', () => {
    const matrix = buildMatrix([
      ['School Name', 'MathPulse High School', '', '', ''],
    ]);

    const value = findNeighborValue(matrix, 0, 0);
    expect(value).toBe('MathPulse High School');
  });
});
