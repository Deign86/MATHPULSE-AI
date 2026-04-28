import { SHS_FORMAT, SHS_PARSER_VERSION } from './constants';
import type {
  FinalSemestralRecordExtraction,
  FormatDetectionResult,
  ImportedShsWorkbook,
  InputDataExtraction,
  QuarterType,
  QuarterlyRecordExtraction,
  ReferenceSheetExtraction,
  WorkbookReadResult,
  WorkbookValidationResult,
} from './types';
import { normalizeText } from './utils/normalizeText';

function dedupeLearners(
  baseLearners: ImportedShsWorkbook['learners'],
  quarterSheets: QuarterlyRecordExtraction[],
  finalSheets: FinalSemestralRecordExtraction[],
): ImportedShsWorkbook['learners'] {
  const byKey = new Map<string, ImportedShsWorkbook['learners'][number]>();

  const register = (learner: ImportedShsWorkbook['learners'][number]) => {
    const key = `${normalizeText(learner.fullName)}|${learner.learnerNo || ''}|${learner.sourceSheet}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, learner);
      return;
    }

    const mergedStatuses = Array.from(new Set([...(existing.statuses || []), ...(learner.statuses || [])]));
    byKey.set(key, {
      ...existing,
      ...learner,
      remarks: learner.remarks || existing.remarks,
      additionalRemarks: learner.additionalRemarks || existing.additionalRemarks,
      statuses: mergedStatuses.length > 0 ? mergedStatuses : undefined,
    });
  };

  baseLearners.forEach(register);

  quarterSheets.forEach((sheet) => {
    sheet.learnerGrades.forEach((gradeRow) => {
      register({
        learnerNo: gradeRow.learnerNo,
        sex: gradeRow.sex,
        fullName: gradeRow.fullName,
        sourceSheet: sheet.sheetName,
        sourceRow: gradeRow.sourceRow,
        remarks: gradeRow.remark || undefined,
        additionalRemarks: gradeRow.additionalRemarks || undefined,
      });
    });
  });

  finalSheets.forEach((sheet) => {
    sheet.learnerGrades.forEach((gradeRow) => {
      register({
        learnerNo: gradeRow.learnerNo,
        sex: gradeRow.sex,
        fullName: gradeRow.fullName,
        sourceSheet: sheet.sheetName,
        sourceRow: gradeRow.sourceRow,
        remarks: gradeRow.remark || undefined,
        additionalRemarks: gradeRow.additionalRemarks || undefined,
      });
    });
  });

  return Array.from(byKey.values());
}

function mergeReferenceSignatures(
  input: InputDataExtraction,
  quarters: QuarterlyRecordExtraction[],
  finals: FinalSemestralRecordExtraction[],
  references: ReferenceSheetExtraction,
): ImportedShsWorkbook['references']['signatures'] {
  const signatures = [
    ...input.signatures,
    ...quarters.flatMap((sheet) => sheet.signatures),
    ...finals.flatMap((sheet) => sheet.signatures),
    ...references.signatures,
  ];

  const deduped = new Map<string, NonNullable<ImportedShsWorkbook['references']['signatures']>[number]>();
  signatures.forEach((sig) => {
    const key = `${normalizeText(sig.role)}|${normalizeText(sig.name || '')}|${sig.sourceSheet}`;
    deduped.set(key, sig);
  });

  return Array.from(deduped.values());
}

export function normalizeWorkbook(input: {
  workbook: WorkbookReadResult;
  detection: FormatDetectionResult;
  inputData: InputDataExtraction;
  quarterSheets: QuarterlyRecordExtraction[];
  finalSheets: FinalSemestralRecordExtraction[];
  references: ReferenceSheetExtraction;
  validation: WorkbookValidationResult;
  unclassifiedBlocks: ImportedShsWorkbook['references']['unclassifiedBlocks'];
}): ImportedShsWorkbook {
  const learners = dedupeLearners(input.inputData.learners, input.quarterSheets, input.finalSheets);

  return {
    format: SHS_FORMAT,
    version: SHS_PARSER_VERSION,
    workbookMeta: {
      fileName: input.workbook.fileName,
      sheetNames: input.workbook.sheetNames,
      detectedSheets: {
        inputData: input.detection.detectedSheets.inputData,
        firstQuarter: input.detection.detectedSheets.firstQuarter,
        secondQuarter: input.detection.detectedSheets.secondQuarter,
        finalSemestral: input.detection.detectedSheets.finalSemestral,
        helper: input.detection.detectedSheets.helper,
        lookup: input.detection.detectedSheets.lookup,
        other: input.detection.detectedSheets.other,
      },
    },
    schoolContext: {
      ...input.inputData.schoolContext,
    },
    learners,
    quarterlyRecords: input.quarterSheets.map((sheet) => ({
      sheetName: sheet.sheetName,
      quarter: sheet.quarter as QuarterType,
      gradingWeights: sheet.gradingWeights,
      assessmentColumns: sheet.assessmentColumns,
      learnerGrades: sheet.learnerGrades,
    })),
    finalSemestralRecords: input.finalSheets.map((sheet) => ({
      sheetName: sheet.sheetName,
      learnerGrades: sheet.learnerGrades,
    })),
    references: {
      componentWeights: input.references.componentWeights,
      attachmentRules: Array.from(new Set([...(input.inputData.attachmentRules || []), ...(input.references.attachmentRules || [])])),
      helperNotes: Array.from(new Set([...(input.inputData.helperNotes || []), ...(input.references.helperNotes || [])])),
      signatures: mergeReferenceSignatures(input.inputData, input.quarterSheets, input.finalSheets, input.references),
      unclassifiedBlocks: input.unclassifiedBlocks,
    },
    validation: input.validation,
    raw: input.workbook.raw,
  };
}
