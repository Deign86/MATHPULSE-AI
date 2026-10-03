import { describe, expect, it } from 'vitest';
import { validateWorkbook } from '../validateWorkbook';
import type { FormatDetectionResult, InputDataExtraction } from '../types';

const detection: FormatDetectionResult = {
  format: 'PH_SHS_OFFICIAL_CLASS_RECORD', isOfficialFormatLikely: true, confidence: 0.9,
  evidence: [], missingCriticalAnchors: [],
  detectedSheets: { inputData: 'Input Data', firstQuarter: ['First Quarter'], secondQuarter: [], finalSemestral: ['Final'], helper: [], lookup: [], other: [] },
  anchorMatches: [],
};
const inputData: InputDataExtraction = {
  sheetName: 'Input Data', schoolContext: {}, learners: [], signatures: [], attachmentRules: [], helperNotes: [], warnings: [],
};

describe('workbook validation regressions', () => {
  it('accepts structurally complete workbook sections', () => {
    const validation = validateWorkbook({
      detection, inputData,
      quarterSheets: [{ sheetName: 'First Quarter', quarter: 'FIRST', assessmentColumns: { writtenWorks: [], performanceTasks: [] }, learnerGrades: [], signatures: [], warnings: [] }],
      finalSheets: [{ sheetName: 'Final', learnerGrades: [], signatures: [], warnings: [] }],
      mappedCellRegions: 2, unmappedCellRegions: 0, totalSheets: 3,
    });
    expect(validation.errors).toEqual([]);
    expect(validation.isOfficialFormatLikely).toBe(true);
  });

  it('reports missing core sheets when no extracts are available', () => {
    const validation = validateWorkbook({
      detection: { ...detection, detectedSheets: { ...detection.detectedSheets, inputData: undefined, firstQuarter: [], finalSemestral: [] } },
      inputData, quarterSheets: [], finalSheets: [], mappedCellRegions: 0, unmappedCellRegions: 0, totalSheets: 0,
    });
    expect(validation.errors).toHaveLength(3);
    expect(validation.isOfficialFormatLikely).toBe(false);
  });
});
