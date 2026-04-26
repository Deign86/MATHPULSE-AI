import { describe, expect, it } from 'vitest';
import { detectFormat } from '../detectFormat';
import type { WorkbookReadResult } from '../types';

function createWorkbookMock(sheetNames: string[]): WorkbookReadResult {
  const matrixBase = {
    ref: 'A1:Z80',
    startRow: 0,
    endRow: 10,
    startCol: 0,
    endCol: 5,
    rowCount: 11,
    colCount: 6,
  };

  const matrices = Object.fromEntries(
    sheetNames.map((sheetName) => [
      sheetName,
      {
        ...matrixBase,
        sheetName,
        cells: Array.from({ length: 11 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => {
            const value = row === 0 && col === 0
              ? sheetName
              : '';
            return value
              ? {
                  address: `${String.fromCharCode(65 + col)}${row + 1}`,
                  row,
                  col,
                  displayValue: value,
                  normalizedText: value.toUpperCase(),
                }
              : null;
          }),
        ),
      },
    ]),
  );

  return {
    fileName: 'sample.xlsx',
    sheetNames,
    matrices,
    raw: { sheets: {} },
  };
}

describe('detectFormat', () => {
  it('returns low confidence for unrelated workbook', () => {
    const workbook = createWorkbookMock(['Sheet1', 'Notes']);
    const result = detectFormat(workbook);
    expect(result.confidence).toBeLessThan(0.6);
    expect(result.isOfficialFormatLikely).toBe(false);
  });

  it('classifies known sheet name hints', () => {
    const workbook = createWorkbookMock(['Input Data', 'First Quarter', 'Second Quarter', 'Final Semestral Grades']);
    const result = detectFormat(workbook);

    expect(result.detectedSheets.inputData).toBe('Input Data');
    expect(result.detectedSheets.firstQuarter).toContain('First Quarter');
    expect(result.detectedSheets.secondQuarter).toContain('Second Quarter');
    expect(result.detectedSheets.finalSemestral).toContain('Final Semestral Grades');
  });
});
