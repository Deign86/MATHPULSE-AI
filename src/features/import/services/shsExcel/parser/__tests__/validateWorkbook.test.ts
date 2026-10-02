import { describe, expect, it } from 'vitest';
import { mapWorkbookToMathPulseEntities, validateWorkbook } from '../validateWorkbook';
import type { FormatDetectionResult, InputDataExtraction } from '../types';

const baseDetection: FormatDetectionResult = {
  format: 'PH_SHS_OFFICIAL_CLASS_RECORD',
  isOfficialFormatLikely: true,
  confidence: 0.91,
  evidence: [],
  missingCriticalAnchors: [],
  detectedSheets: {
    inputData: 'Input Data',
    firstQuarter: ['First Quarter'],
    secondQuarter: ['Second Quarter'],
    finalSemestral: ['Final Semestral Grades'],
    helper: [],
    lookup: [],
    other: [],
  },
  anchorMatches: [],
};

const baseInput: InputDataExtraction = {
  sheetName: 'Input Data',
  schoolContext: {},
  learners: [
    { fullName: 'Juan Dela Cruz', learnerNo: 1, sourceSheet: 'Input Data', sourceRow: 12 },
  ],
  signatures: [],
  attachmentRules: [],
  helperNotes: [],
  warnings: [],
};

describe('validateWorkbook', () => {
  it('returns errors when core sheets are missing', () => {
    const result = validateWorkbook({
      detection: {
        ...baseDetection,
        detectedSheets: {
          ...baseDetection.detectedSheets,
          inputData: undefined,
          finalSemestral: [],
        },
      },
      inputData: baseInput,
      quarterSheets: [],
      finalSheets: [],
      mappedCellRegions: 1,
      unmappedCellRegions: 4,
      totalSheets: 5,
    });

    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('flags low confidence threshold warning', () => {
    const result = validateWorkbook({
      detection: { ...baseDetection, confidence: 0.6 },
      inputData: baseInput,
      quarterSheets: [
        {
          sheetName: 'First Quarter',
          quarter: 'FIRST',
          assessmentColumns: { writtenWorks: [], performanceTasks: [] },
          learnerGrades: [
            { fullName: 'Juan Dela Cruz', sourceRow: 15 },
          ],
          signatures: [],
          warnings: [],
        },
      ],
      finalSheets: [
        {
          sheetName: 'Final Semestral Grades',
          learnerGrades: [
            {
              fullName: 'Juan Dela Cruz',
              sourceRow: 12,
              finalGrades: 90,
            },
          ],
          signatures: [],
          warnings: [],
        },
      ],
      mappedCellRegions: 6,
      unmappedCellRegions: 1,
      totalSheets: 4,
    });

    expect(result.warnings.some((warning) => warning.toLowerCase().includes('confidence'))).toBe(true);
  });

  it('maps a validated workbook into the class-record consumer entities', () => {
    const mapped = mapWorkbookToMathPulseEntities({
      format: 'PH_SHS_OFFICIAL_CLASS_RECORD',
      workbookMeta: {
        fileName: 'class-record.xlsx',
        sheetNames: ['Input Data', 'First Quarter'],
        detectedSheets: { inputData: 'Input Data', firstQuarter: ['First Quarter'] },
      },
      schoolContext: { gradeSection: 'Grade 11 - STEM A', subjectName: 'General Mathematics' },
      learners: [{ fullName: 'Juan Dela Cruz', learnerNo: 1, sourceSheet: 'Input Data', sourceRow: 12 }],
      quarterlyRecords: [{
        sheetName: 'First Quarter',
        quarter: 'FIRST',
        assessmentColumns: { writtenWorks: [], performanceTasks: [] },
        learnerGrades: [{ fullName: 'Juan Dela Cruz', sourceRow: 15, quarterlyGrade: 91 }],
      }],
      finalSemestralRecords: [],
      references: {},
      validation: {
        isOfficialFormatLikely: true,
        confidence: 0.91,
        warnings: [],
        errors: [],
        coverage: { totalSheets: 2, recognizedSheets: 2, unclassifiedSheets: 0, mappedCellRegions: 2, unmappedCellRegions: 0 },
      },
      raw: { sheets: {} },
    });

    expect(mapped.classEntity.classSectionId).toBe('grade_11_-_stem_a');
    expect(mapped.studentEntities).toEqual([
      expect.objectContaining({ fullName: 'Juan Dela Cruz', learnerNo: 1, sourceRow: 12 }),
    ]);
    expect(mapped.gradeEntities).toEqual([
      expect.objectContaining({ fullName: 'Juan Dela Cruz', quarter: 'FIRST', quarterlyGrade: 91 }),
    ]);
  });
});
