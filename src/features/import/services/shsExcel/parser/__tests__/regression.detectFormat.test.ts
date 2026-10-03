import { describe, expect, it } from 'vitest';
import { detectFormat } from '../detectFormat';
import type { WorkbookReadResult } from '../types';

const emptyWorkbook = (sheetNames: string[]): WorkbookReadResult => ({
  fileName: 'empty.xlsx', sheetNames, matrices: {}, raw: { sheets: {} },
});

describe('workbook format detection regressions', () => {
  it('recognizes named core sheets in a minimal workbook', () => {
    const detection = detectFormat(emptyWorkbook(['Input Data', 'First Quarter', 'Final Semestral Grades']));
    expect(detection.detectedSheets.inputData).toBe('Input Data');
    expect(detection.detectedSheets.firstQuarter).toContain('First Quarter');
    expect(detection.detectedSheets.finalSemestral).toContain('Final Semestral Grades');
  });

  it('treats an empty workbook safely with no recognized sheets', () => {
    const detection = detectFormat(emptyWorkbook([]));
    expect(detection.confidence).toBe(0);
    expect(detection.detectedSheets.other).toEqual([]);
  });
});
