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

  it('blocks single-character learner names and percentage-formatted raw marks with row-level errors', () => {
    const validation = validateWorkbook({
      detection,
      inputData: {
        ...inputData,
        learners: [{ fullName: 'A', sourceSheet: 'Input Data', sourceRow: 12 }],
      },
      quarterSheets: [{
        sheetName: 'First Quarter',
        quarter: 'FIRST',
        assessmentColumns: {
          writtenWorks: [{ key: 'ww1', label: 'WW1', maxScore: 10 }],
          performanceTasks: [],
        },
        learnerGrades: [{
          fullName: 'Juan Dela Cruz',
          sourceRow: 15,
          writtenWorks: { ww1: '11%' },
        }],
        signatures: [],
        warnings: [],
      }],
      finalSheets: [{ sheetName: 'Final', learnerGrades: [], signatures: [], warnings: [] }],
      mappedCellRegions: 2,
      unmappedCellRegions: 0,
      totalSheets: 3,
    });

    expect(validation.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Input Data row 12'),
      expect.stringContaining('First Quarter row 15'),
    ]));
    expect(validation.isOfficialFormatLikely).toBe(false);
  });

  it('blocks imports when unmapped workbook regions outweigh mapped regions', () => {
    const validation = validateWorkbook({
      detection,
      inputData,
      quarterSheets: [{ sheetName: 'First Quarter', quarter: 'FIRST', assessmentColumns: { writtenWorks: [], performanceTasks: [] }, learnerGrades: [], signatures: [], warnings: [] }],
      finalSheets: [{ sheetName: 'Final', learnerGrades: [], signatures: [], warnings: [] }],
      mappedCellRegions: 1,
      unmappedCellRegions: 3,
      totalSheets: 3,
    });

    expect(validation.errors).toEqual(expect.arrayContaining([expect.stringContaining('unmapped workbook regions')]));
    expect(validation.isOfficialFormatLikely).toBe(false);
  });

  it('reports smaller unmapped-region counts instead of allowing them to pass silently', () => {
    const validation = validateWorkbook({
      detection,
      inputData,
      quarterSheets: [{ sheetName: 'First Quarter', quarter: 'FIRST', assessmentColumns: { writtenWorks: [], performanceTasks: [] }, learnerGrades: [], signatures: [], warnings: [] }],
      finalSheets: [{ sheetName: 'Final', learnerGrades: [], signatures: [], warnings: [] }],
      mappedCellRegions: 4,
      unmappedCellRegions: 1,
      totalSheets: 3,
    });

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual(expect.arrayContaining([expect.stringContaining('1 unmapped workbook regions')]));
  });
});
