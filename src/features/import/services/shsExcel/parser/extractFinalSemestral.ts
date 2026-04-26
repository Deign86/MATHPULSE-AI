import { COLUMN_ANCHORS, MAX_EMPTY_LEARNER_ROWS_BEFORE_STOP, STATUS_TOKENS } from './constants';
import type { FinalSemestralRecordExtraction, ParsedSignature, SheetMatrix } from './types';
import { classifyRowType, detectSexContextFromRow, parseLearnerNo } from './utils/classifyRows';
import { findAllAnchors, findHeaderRowNearAnchor } from './utils/findAnchors';
import { includesNormalized } from './utils/normalizeText';
import { getMatrixCell, getRowText } from './utils/sheetMatrix';

function extractSignatures(sheet: SheetMatrix): ParsedSignature[] {
  const roles = ['SUBMITTED BY', 'CHECKED BY', 'VERIFIED BY', 'RECOMMENDED BY', 'APPROVED BY'];
  const signatures: ParsedSignature[] = [];

  roles.forEach((role) => {
    findAllAnchors(sheet, role).forEach((match) => {
      signatures.push({
        role,
        name: String(getMatrixCell(sheet, match.row, match.col + 1)?.displayValue || '').trim() || undefined,
        sourceSheet: sheet.sheetName,
        sourceRow: match.row + 1,
      });
    });
  });

  return signatures;
}

export function extractFinalSemestral(sheet: SheetMatrix): FinalSemestralRecordExtraction {
  const warnings: string[] = [];
  const learnerAnchor = findAllAnchors(sheet, 'LEARNERS NAMES')[0];
  const headerRow = learnerAnchor ? findHeaderRowNearAnchor(sheet, learnerAnchor.row, 5) : sheet.startRow;

  const getColumn = (anchor: string, fallback: number): number => {
    const match = findAllAnchors(sheet, anchor).find((item) => Math.abs(item.row - headerRow) <= 2);
    return match?.col ?? fallback;
  };

  const noCol = getColumn(COLUMN_ANCHORS.learnerNo[0], sheet.startCol);
  const nameCol = getColumn(COLUMN_ANCHORS.learnerName[0], sheet.startCol + 1);
  const firstQuarterCol = getColumn(COLUMN_ANCHORS.firstQuarter[0], nameCol + 1);
  const secondQuarterCol = getColumn(COLUMN_ANCHORS.secondQuarter[0], firstQuarterCol + 1);
  const firstSemesterCol = getColumn(COLUMN_ANCHORS.firstSemester[0], secondQuarterCol + 1);
  const finalGradeCol = getColumn(COLUMN_ANCHORS.finalGrades[0], firstSemesterCol + 1);
  const remarkCol = getColumn(COLUMN_ANCHORS.remark[0], finalGradeCol + 1);
  const additionalRemarkCol = getColumn(COLUMN_ANCHORS.additionalRemarks[0], remarkCol + 1);

  const learnerGrades: FinalSemestralRecordExtraction['learnerGrades'] = [];
  let sexContext: FinalSemestralRecordExtraction['learnerGrades'][number]['sex'] = 'UNKNOWN';
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

    const learnerNo = parseLearnerNo(getMatrixCell(sheet, row, noCol)?.displayValue);
    const fullName = String(getMatrixCell(sheet, row, nameCol)?.displayValue || '').trim();
    if (!fullName && learnerNo === undefined) {
      continue;
    }

    const firstQuarter = (getMatrixCell(sheet, row, firstQuarterCol)?.displayValue as number | string | null) ?? null;
    const secondQuarter = (getMatrixCell(sheet, row, secondQuarterCol)?.displayValue as number | string | null) ?? null;
    const firstSemester = (getMatrixCell(sheet, row, firstSemesterCol)?.displayValue as number | string | null) ?? null;
    const finalGrades = (getMatrixCell(sheet, row, finalGradeCol)?.displayValue as number | string | null) ?? null;
    const remark = (getMatrixCell(sheet, row, remarkCol)?.displayValue as string | null) ?? null;
    let additionalRemarks = (getMatrixCell(sheet, row, additionalRemarkCol)?.displayValue as string | null) ?? null;

    const statuses = STATUS_TOKENS.filter((token) => includesNormalized(rowText, token));
    if (statuses.length > 0) {
      additionalRemarks = [additionalRemarks, statuses.join('; ')].filter(Boolean).join('; ') || null;
    }

    if (!fullName && learnerNo !== undefined) {
      warnings.push(`Row ${row + 1} has learner number ${learnerNo} but empty learner name.`);
    }

    learnerGrades.push({
      learnerNo,
      fullName: fullName || `Unnamed Learner ${learnerNo || row + 1}`,
      sex: sexContext,
      firstQuarter,
      secondQuarter,
      firstSemester,
      finalGrades,
      remark,
      additionalRemarks,
      sourceRow: row + 1,
    });
  }

  return {
    sheetName: sheet.sheetName,
    learnerGrades,
    signatures: extractSignatures(sheet),
    warnings,
  };
}
