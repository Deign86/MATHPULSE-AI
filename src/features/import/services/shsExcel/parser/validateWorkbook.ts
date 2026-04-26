import { DETECTION_CONFIDENCE_THRESHOLD } from './constants';
import type {
  FinalSemestralRecordExtraction,
  FormatDetectionResult,
  ImportedShsWorkbook,
  InputDataExtraction,
  QuarterlyRecordExtraction,
  ValidationCoverage,
  WorkbookValidationResult,
} from './types';

function buildCoverage(input: {
  detection: FormatDetectionResult;
  mappedCellRegions: number;
  unmappedCellRegions: number;
  totalSheets: number;
}): ValidationCoverage {
  const detected = input.detection.detectedSheets;
  const recognizedSheets = [
    detected.inputData ? 1 : 0,
    detected.firstQuarter.length,
    detected.secondQuarter.length,
    detected.finalSemestral.length,
    detected.helper.length,
    detected.lookup.length,
  ].reduce((a, b) => a + b, 0);

  return {
    totalSheets: input.totalSheets,
    recognizedSheets,
    unclassifiedSheets: detected.other.length,
    mappedCellRegions: input.mappedCellRegions,
    unmappedCellRegions: input.unmappedCellRegions,
  };
}

function detectDuplicateLearners(learners: InputDataExtraction['learners']): string[] {
  const seen = new Map<string, number[]>();
  learners.forEach((learner) => {
    const key = `${learner.learnerNo || ''}|${learner.fullName.trim().toUpperCase()}`;
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)?.push(learner.sourceRow);
  });

  const duplicates: string[] = [];
  seen.forEach((rows, key) => {
    if (rows.length > 1) {
      duplicates.push(`Duplicate learner entry detected for ${key} at rows ${rows.join(', ')}.`);
    }
  });

  return duplicates;
}

function detectIncompleteQuarterRows(sheets: QuarterlyRecordExtraction[]): string[] {
  const issues: string[] = [];
  sheets.forEach((sheet) => {
    sheet.learnerGrades.forEach((row) => {
      if (!row.fullName.trim()) {
        issues.push(`${sheet.sheetName} row ${row.sourceRow}: learner name is blank.`);
      }

      const hasWW = row.writtenWorks && Object.values(row.writtenWorks).some((value) => value !== null && value !== '');
      const hasPT = row.performanceTasks && Object.values(row.performanceTasks).some((value) => value !== null && value !== '');

      if (!hasWW && !hasPT && row.quarterlyAssessment == null) {
        issues.push(`${sheet.sheetName} row ${row.sourceRow}: all grade blocks are empty.`);
      }
    });
  });
  return issues;
}

function detectFinalSemIssues(sheets: FinalSemestralRecordExtraction[]): string[] {
  const issues: string[] = [];
  sheets.forEach((sheet) => {
    sheet.learnerGrades.forEach((row) => {
      if (!row.fullName.trim()) {
        issues.push(`${sheet.sheetName} row ${row.sourceRow}: learner name is blank.`);
      }
      if (row.finalGrades == null && row.firstSemester == null && row.firstQuarter == null && row.secondQuarter == null) {
        issues.push(`${sheet.sheetName} row ${row.sourceRow}: no semestral/final values detected.`);
      }
    });
  });
  return issues;
}

export function validateWorkbook(input: {
  detection: FormatDetectionResult;
  inputData: InputDataExtraction;
  quarterSheets: QuarterlyRecordExtraction[];
  finalSheets: FinalSemestralRecordExtraction[];
  mappedCellRegions: number;
  unmappedCellRegions: number;
  totalSheets: number;
}): WorkbookValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!input.detection.detectedSheets.inputData) {
    errors.push('Missing Input Data sheet.');
  }
  if (input.quarterSheets.length === 0) {
    errors.push('No quarter class record sheets were extracted.');
  }
  if (input.finalSheets.length === 0) {
    errors.push('No Final Semestral sheet was extracted.');
  }

  if (input.detection.missingCriticalAnchors.length > 0) {
    warnings.push(`Missing critical anchors: ${input.detection.missingCriticalAnchors.join(', ')}.`);
  }

  detectDuplicateLearners(input.inputData.learners).forEach((issue) => warnings.push(issue));
  detectIncompleteQuarterRows(input.quarterSheets).forEach((issue) => warnings.push(issue));
  detectFinalSemIssues(input.finalSheets).forEach((issue) => warnings.push(issue));

  warnings.push(...input.inputData.warnings);
  input.quarterSheets.forEach((sheet) => warnings.push(...sheet.warnings));
  input.finalSheets.forEach((sheet) => warnings.push(...sheet.warnings));

  if (input.unmappedCellRegions > input.mappedCellRegions) {
    warnings.push('A significant portion of workbook regions are unclassified; review diagnostics before confirming import.');
  }

  const confidence = input.detection.confidence;
  const isOfficialFormatLikely = input.detection.isOfficialFormatLikely && errors.length === 0;

  if (confidence < DETECTION_CONFIDENCE_THRESHOLD) {
    warnings.push(`Detection confidence ${confidence.toFixed(2)} is below threshold ${DETECTION_CONFIDENCE_THRESHOLD.toFixed(2)}.`);
  }

  return {
    isOfficialFormatLikely,
    confidence,
    warnings,
    errors,
    coverage: buildCoverage({
      detection: input.detection,
      mappedCellRegions: input.mappedCellRegions,
      unmappedCellRegions: input.unmappedCellRegions,
      totalSheets: input.totalSheets,
    }),
  };
}

export function mapWorkbookToMathPulseEntities(workbook: ImportedShsWorkbook) {
  const classEntity = {
    className: workbook.schoolContext.gradeSection || workbook.workbookMeta.detectedSheets.inputData || 'Imported SHS Class',
    classSectionId: (workbook.schoolContext.gradeSection || 'imported_shs_class').replace(/\s+/g, '_').toLowerCase(),
    grade: workbook.schoolContext.gradeSection,
    section: workbook.schoolContext.gradeSection,
    semester: workbook.schoolContext.semester,
    schoolYear: workbook.schoolContext.schoolYear,
    subjectCode: workbook.schoolContext.subjectCode,
    subjectName: workbook.schoolContext.subjectName,
    track: workbook.schoolContext.track,
    teacherName: workbook.schoolContext.teacherName,
  };

  const studentEntities = workbook.learners.map((learner) => ({
    fullName: learner.fullName,
    learnerNo: learner.learnerNo,
    sex: learner.sex,
    remarks: learner.remarks,
    additionalRemarks: learner.additionalRemarks,
    statuses: learner.statuses,
    sourceSheet: learner.sourceSheet,
    sourceRow: learner.sourceRow,
  }));

  const gradeEntities = workbook.quarterlyRecords.flatMap((record) =>
    record.learnerGrades.map((row) => ({
      fullName: row.fullName,
      sourceSheet: record.sheetName,
      sourceRow: row.sourceRow,
      quarter: record.quarter,
      firstQuarter: row.firstQuarter,
      secondQuarter: row.secondQuarter,
      firstSemester: row.firstSemester,
      finalGrades: row.finalGrades,
      quarterlyGrade: row.quarterlyGrade,
      initialGrade: row.initialGrade,
      remark: row.remark,
      additionalRemarks: row.additionalRemarks,
    })),
  );

  const finalEntities = workbook.finalSemestralRecords.flatMap((record) =>
    record.learnerGrades.map((row) => ({
      fullName: row.fullName,
      sourceSheet: record.sheetName,
      sourceRow: row.sourceRow,
      firstQuarter: row.firstQuarter,
      secondQuarter: row.secondQuarter,
      firstSemester: row.firstSemester,
      finalGrades: row.finalGrades,
      remark: row.remark,
      additionalRemarks: row.additionalRemarks,
    })),
  );

  const remarksEntities = [...workbook.learners, ...workbook.quarterlyRecords.flatMap((record) => record.learnerGrades.map((row) => ({
    learnerNo: row.learnerNo,
    sex: row.sex,
    fullName: row.fullName,
    sourceSheet: record.sheetName,
    sourceRow: row.sourceRow,
    remarks: row.remark || undefined,
    additionalRemarks: row.additionalRemarks || undefined,
  })))].map((row) => ({
    fullName: row.fullName,
    remark: row.remarks || null,
    additionalRemarks: row.additionalRemarks || null,
    statuses: row.statuses,
    sourceSheet: row.sourceSheet,
    sourceRow: row.sourceRow,
  }));

  return {
    classEntity,
    studentEntities,
    gradeEntities: [...gradeEntities, ...finalEntities],
    remarksEntities,
  };
}
