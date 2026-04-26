import { COLUMN_ANCHORS, MAX_EMPTY_LEARNER_ROWS_BEFORE_STOP, QUARTER_HINTS, STATUS_TOKENS } from './constants';
import type {
  ParsedAssessmentColumn,
  ParsedLearnerGradeRow,
  ParsedSignature,
  QuarterType,
  QuarterlyRecordExtraction,
  SheetMatrix,
} from './types';
import { classifyRowType, detectSexContextFromRow, parseLearnerNo } from './utils/classifyRows';
import { findAllAnchors, findHeaderRowNearAnchor } from './utils/findAnchors';
import { includesNormalized, normalizeText, parseNumeric, sanitizeKey } from './utils/normalizeText';
import { getColumnIndex, getColumnLabel, getMatrixCell, getRowText } from './utils/sheetMatrix';

function inferQuarter(sheet: SheetMatrix): QuarterType {
  const sheetName = normalizeText(sheet.sheetName);
  if (QUARTER_HINTS.SECOND.some((hint) => includesNormalized(sheetName, hint))) {
    return 'SECOND';
  }
  return 'FIRST';
}

function detectAssessmentColumns(sheet: SheetMatrix, headerRow: number): QuarterlyRecordExtraction['assessmentColumns'] {
  const writtenWorks: ParsedAssessmentColumn[] = [];
  const performanceTasks: ParsedAssessmentColumn[] = [];
  const derived: ParsedAssessmentColumn[] = [];
  let quarterlyAssessment: ParsedAssessmentColumn | undefined;

  let currentBand: 'WW' | 'PT' | 'DERIVED' | 'NONE' = 'NONE';

  for (let col = sheet.startCol; col <= sheet.endCol; col += 1) {
    const headerCell = getMatrixCell(sheet, headerRow, col);
    const headerText = normalizeText(headerCell?.displayValue || '');
    const nextRowCell = getMatrixCell(sheet, headerRow + 1, col);
    const label = String(nextRowCell?.displayValue || headerCell?.displayValue || '').trim();

    if (!headerText && !label) continue;

    if (includesNormalized(headerText, COLUMN_ANCHORS.writtenWork[0])) {
      currentBand = 'WW';
      continue;
    }

    if (includesNormalized(headerText, COLUMN_ANCHORS.performanceTasks[0])) {
      currentBand = 'PT';
      continue;
    }

    if (includesNormalized(headerText, COLUMN_ANCHORS.quarterlyAssessment[0])) {
      quarterlyAssessment = {
        key: sanitizeKey(label || 'quarterly_assessment'),
        label: label || 'Quarterly Assessment',
        column: getColumnLabel(col),
      };
      currentBand = 'DERIVED';
      continue;
    }

    if (
      includesNormalized(headerText, COLUMN_ANCHORS.initialGrade[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.quarterlyGrade[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.remark[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.additionalRemarks[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.firstQuarter[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.secondQuarter[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.firstSemester[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.finalGrades[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.ps[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.ws[0])
      || includesNormalized(headerText, COLUMN_ANCHORS.total[0])
    ) {
      currentBand = 'DERIVED';
      derived.push({
        key: sanitizeKey(label || headerText),
        label: label || headerText,
        column: getColumnLabel(col),
      });
      continue;
    }

    const columnMeta = {
      key: sanitizeKey(label || headerText || getColumnLabel(col)),
      label: label || headerText || getColumnLabel(col),
      maxScore: parseNumeric(nextRowCell?.displayValue),
      column: getColumnLabel(col),
    };

    if (currentBand === 'WW') {
      writtenWorks.push(columnMeta);
    } else if (currentBand === 'PT') {
      performanceTasks.push(columnMeta);
    } else if (currentBand === 'DERIVED') {
      derived.push(columnMeta);
    }
  }

  return {
    writtenWorks,
    performanceTasks,
    quarterlyAssessment,
    derived,
  };
}

function extractSignatures(sheet: SheetMatrix): ParsedSignature[] {
  const roles = ['SUBMITTED BY', 'CHECKED BY', 'VERIFIED BY', 'RECOMMENDED BY', 'APPROVED BY'];
  const signatures: ParsedSignature[] = [];

  roles.forEach((role) => {
    findAllAnchors(sheet, role).forEach((match) => {
      const rightCell = getMatrixCell(sheet, match.row, match.col + 1);
      const name = String(rightCell?.displayValue || '').trim() || undefined;
      signatures.push({
        role,
        name,
        sourceSheet: sheet.sheetName,
        sourceRow: match.row + 1,
      });
    });
  });

  return signatures;
}

function pickColumnByAnchor(sheet: SheetMatrix, headerRow: number, anchors: string[]): number | undefined {
  for (let col = sheet.startCol; col <= sheet.endCol; col += 1) {
    const header = normalizeText(getMatrixCell(sheet, headerRow, col)?.displayValue || '');
    const subHeader = normalizeText(getMatrixCell(sheet, headerRow + 1, col)?.displayValue || '');
    if (anchors.some((anchor) => includesNormalized(header, anchor) || includesNormalized(subHeader, anchor))) {
      return col;
    }
  }
  return undefined;
}

function parseRowValues(
  sheet: SheetMatrix,
  row: number,
  assessmentColumns: QuarterlyRecordExtraction['assessmentColumns'],
  columns: { numberCol: number; nameCol: number },
): ParsedLearnerGradeRow {
  const rowRecord: ParsedLearnerGradeRow = {
    learnerNo: parseLearnerNo(getMatrixCell(sheet, row, columns.numberCol)?.displayValue),
    fullName: String(getMatrixCell(sheet, row, columns.nameCol)?.displayValue || '').trim(),
    sourceRow: row + 1,
  };

  const ww: Record<string, number | string | null> = {};
  assessmentColumns.writtenWorks.forEach((colMeta) => {
    const colIndex = colMeta.column ? getColumnIndex(colMeta.column) : -1;
    if (colIndex < 0) return;
    const value = getMatrixCell(sheet, row, colIndex)?.displayValue;
    ww[colMeta.key] = (value as number | string | null) ?? null;
  });
  if (Object.keys(ww).length > 0) rowRecord.writtenWorks = ww;

  const pt: Record<string, number | string | null> = {};
  assessmentColumns.performanceTasks.forEach((colMeta) => {
    const colIndex = colMeta.column ? getColumnIndex(colMeta.column) : -1;
    if (colIndex < 0) return;
    const value = getMatrixCell(sheet, row, colIndex)?.displayValue;
    pt[colMeta.key] = (value as number | string | null) ?? null;
  });
  if (Object.keys(pt).length > 0) rowRecord.performanceTasks = pt;

  if (assessmentColumns.quarterlyAssessment?.column) {
    const qaCol = getColumnIndex(assessmentColumns.quarterlyAssessment.column);
    rowRecord.quarterlyAssessment = (getMatrixCell(sheet, row, qaCol)?.displayValue as number | string | null) ?? null;
  }

  const derivedCols = assessmentColumns.derived || [];
  const derivedValues: Record<string, number | string | null> = {};

  derivedCols.forEach((colMeta) => {
    if (!colMeta.column) return;
    const colIndex = getColumnIndex(colMeta.column);
    if (colIndex < 0) return;
    const value = (getMatrixCell(sheet, row, colIndex)?.displayValue as number | string | null) ?? null;
    derivedValues[colMeta.key] = value;

    if (includesNormalized(colMeta.label, COLUMN_ANCHORS.initialGrade[0])) rowRecord.initialGrade = value;
    if (includesNormalized(colMeta.label, COLUMN_ANCHORS.quarterlyGrade[0])) rowRecord.quarterlyGrade = value;
    if (includesNormalized(colMeta.label, COLUMN_ANCHORS.firstQuarter[0])) rowRecord.firstQuarter = value;
    if (includesNormalized(colMeta.label, COLUMN_ANCHORS.secondQuarter[0])) rowRecord.secondQuarter = value;
    if (includesNormalized(colMeta.label, COLUMN_ANCHORS.firstSemester[0])) rowRecord.firstSemester = value;
    if (includesNormalized(colMeta.label, COLUMN_ANCHORS.finalGrades[0])) rowRecord.finalGrades = value;
    if (includesNormalized(colMeta.label, COLUMN_ANCHORS.remark[0])) rowRecord.remark = value !== null ? String(value) : null;
    if (includesNormalized(colMeta.label, COLUMN_ANCHORS.additionalRemarks[0])) rowRecord.additionalRemarks = value !== null ? String(value) : null;
  });

  if (Object.keys(derivedValues).length > 0) {
    rowRecord.totals = derivedValues;
  }

  return rowRecord;
}

export function extractQuarterSheet(sheet: SheetMatrix): QuarterlyRecordExtraction {
  const quarter = inferQuarter(sheet);
  const warnings: string[] = [];

  const learnerAnchor = findAllAnchors(sheet, COLUMN_ANCHORS.learnerName[0])[0]
    || findAllAnchors(sheet, COLUMN_ANCHORS.learnerName[1])[0];

  const headerRow = learnerAnchor ? findHeaderRowNearAnchor(sheet, learnerAnchor.row, 4) : sheet.startRow;
  const assessmentColumns = detectAssessmentColumns(sheet, headerRow);
  const numberCol = pickColumnByAnchor(sheet, headerRow, COLUMN_ANCHORS.learnerNo) ?? sheet.startCol;
  const nameCol = pickColumnByAnchor(sheet, headerRow, COLUMN_ANCHORS.learnerName)
    ?? Math.min(sheet.endCol, numberCol + 1);

  const learnerGrades: ParsedLearnerGradeRow[] = [];
  let sexContext: ParsedLearnerGradeRow['sex'] = 'UNKNOWN';
  let emptyRun = 0;

  for (let row = headerRow + 1; row <= sheet.endRow; row += 1) {
    const rowText = getRowText(sheet, row);
    const rowType = classifyRowType({
      rowText,
      hasLearnerNumber: /\b\d{1,2}\b/.test(rowText),
      hasLearnerName: /[A-Z]{2,}/.test(rowText),
    });

    if (rowType === 'sex-header') {
      sexContext = detectSexContextFromRow(rowText) || sexContext;
      continue;
    }

    if (rowType === 'signature' || rowType === 'helper') {
      break;
    }

    if (rowType === 'blank') {
      emptyRun += 1;
      if (emptyRun >= MAX_EMPTY_LEARNER_ROWS_BEFORE_STOP) break;
      continue;
    }

    if (rowType !== 'learner') {
      continue;
    }

    emptyRun = 0;
    const parsed = parseRowValues(sheet, row, assessmentColumns, { numberCol, nameCol });
    parsed.sex = sexContext;

    if (!parsed.fullName && parsed.learnerNo === undefined) {
      continue;
    }

    const statuses = STATUS_TOKENS.filter((token) => includesNormalized(rowText, token));
    if (statuses.length > 0 && !parsed.additionalRemarks) {
      parsed.additionalRemarks = statuses.join('; ');
    }

    if (!parsed.fullName && parsed.learnerNo !== undefined) {
      warnings.push(`Row ${row + 1} has learner number ${parsed.learnerNo} but empty name.`);
      parsed.fullName = `Unnamed Learner ${parsed.learnerNo}`;
    }

    learnerGrades.push(parsed);
  }

  if (assessmentColumns.writtenWorks.length === 0 && assessmentColumns.performanceTasks.length === 0) {
    warnings.push(`No detailed assessment columns detected in ${sheet.sheetName}.`);
  }

  const wwWeight = parseNumeric(
    findAllAnchors(sheet, 'WRITTEN WORK %')[0]?.value
    || findAllAnchors(sheet, 'WRITTEN WORK')[0]?.value,
  );
  const ptWeight = parseNumeric(
    findAllAnchors(sheet, 'PERFORMANCE TASKS %')[0]?.value
    || findAllAnchors(sheet, 'PERFORMANCE TASKS')[0]?.value,
  );
  const qaWeight = parseNumeric(
    findAllAnchors(sheet, 'QUARTERLY ASSESSMENT %')[0]?.value
    || findAllAnchors(sheet, 'QUARTERLY ASSESSMENT')[0]?.value,
  );

  return {
    sheetName: sheet.sheetName,
    quarter,
    gradingWeights: {
      writtenWork: wwWeight,
      performanceTasks: ptWeight,
      quarterlyAssessment: qaWeight,
    },
    assessmentColumns,
    learnerGrades,
    signatures: extractSignatures(sheet),
    warnings,
  };
}
