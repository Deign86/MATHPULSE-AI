import { METADATA_ANCHORS, STATUS_TOKENS } from './constants';
import type { InputDataExtraction, ParsedLearner, ParsedSignature, SheetMatrix } from './types';
import { findAllAnchors, findAnchorMatchesInSheet, findNeighborValue } from './utils/findAnchors';
import { classifyRowType, detectSexContextFromRow, parseLearnerNo } from './utils/classifyRows';
import { includesNormalized, normalizeText } from './utils/normalizeText';
import { getMatrixCell, getRowText } from './utils/sheetMatrix';

function readMetadataField(matrix: SheetMatrix, candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const matches = findAllAnchors(matrix, candidate);
    for (const match of matches) {
      const value = findNeighborValue(matrix, match.row, match.col, 8);
      if (value && value.trim()) {
        return value.trim();
      }
    }
  }
  return undefined;
}

function extractSignatures(matrix: SheetMatrix): ParsedSignature[] {
  const roles = ['SUBMITTED BY', 'CHECKED BY', 'VERIFIED BY', 'RECOMMENDED BY', 'APPROVED BY'];
  const signatures: ParsedSignature[] = [];

  roles.forEach((role) => {
    const matches = findAllAnchors(matrix, role);
    matches.forEach((match) => {
      const name = findNeighborValue(matrix, match.row, match.col, 10);
      signatures.push({
        role,
        name,
        sourceSheet: matrix.sheetName,
        sourceRow: match.row + 1,
      });
    });
  });

  return signatures;
}

function extractLearners(matrix: SheetMatrix): ParsedLearner[] {
  const learnerAnchor = findAllAnchors(matrix, 'LEARNERS NAMES')[0];
  if (!learnerAnchor) return [];

  const startRow = learnerAnchor.row + 1;
  const nameCol = learnerAnchor.col;
  const numberCol = Math.max(matrix.startCol, nameCol - 1);
  const remarksCol = Math.min(matrix.endCol, nameCol + 1);
  const additionalRemarksCol = Math.min(matrix.endCol, nameCol + 2);

  const learners: ParsedLearner[] = [];
  let sexContext: ParsedLearner['sex'] = 'UNKNOWN';
  let emptyRun = 0;

  for (let row = startRow; row <= matrix.endRow; row += 1) {
    const rowText = getRowText(matrix, row);
    const rowType = classifyRowType({
      rowText,
      hasLearnerNumber: Boolean(parseLearnerNo(getMatrixCell(matrix, row, numberCol)?.displayValue)),
      hasLearnerName: Boolean(String(getMatrixCell(matrix, row, nameCol)?.displayValue || '').trim()),
    });

    if (rowType === 'sex-header') {
      sexContext = detectSexContextFromRow(rowText) || sexContext;
      emptyRun = 0;
      continue;
    }

    if (rowType === 'signature' || rowType === 'helper') {
      break;
    }

    if (rowType !== 'learner') {
      if (rowType === 'blank') {
        emptyRun += 1;
      }
      if (emptyRun >= 5) {
        break;
      }
      continue;
    }

    emptyRun = 0;
    const learnerNo = parseLearnerNo(getMatrixCell(matrix, row, numberCol)?.displayValue);
    const fullName = String(getMatrixCell(matrix, row, nameCol)?.displayValue || '').trim();

    const remark = String(getMatrixCell(matrix, row, remarksCol)?.displayValue || '').trim() || undefined;
    const additionalRemarks = String(getMatrixCell(matrix, row, additionalRemarksCol)?.displayValue || '').trim() || undefined;

    const statuses = STATUS_TOKENS.filter((token) => includesNormalized(rowText, token));

    if (!fullName && learnerNo === undefined) {
      continue;
    }

    learners.push({
      learnerNo,
      sex: sexContext,
      fullName: fullName || `Unnamed Learner ${learnerNo || row}`,
      sourceSheet: matrix.sheetName,
      sourceRow: row + 1,
      remarks: remark,
      additionalRemarks,
      statuses: statuses.length > 0 ? statuses : undefined,
    });
  }

  return learners;
}

function extractAttachmentAndHelperNotes(matrix: SheetMatrix): { attachmentRules: string[]; helperNotes: string[] } {
  const attachmentRules: string[] = [];
  const helperNotes: string[] = [];

  for (let row = matrix.startRow; row <= matrix.endRow; row += 1) {
    const rowText = getRowText(matrix, row);
    if (!rowText) continue;

    if (STATUS_TOKENS.some((token) => includesNormalized(rowText, token))) {
      attachmentRules.push(rowText);
      continue;
    }

    if (
      includesNormalized(rowText, 'IMPORTANT')
      || includesNormalized(rowText, 'NOTE')
      || includesNormalized(rowText, 'ATTACHMENT')
      || includesNormalized(rowText, 'LOOK UP')
    ) {
      helperNotes.push(rowText);
    }
  }

  return {
    attachmentRules: Array.from(new Set(attachmentRules)),
    helperNotes: Array.from(new Set(helperNotes)),
  };
}

export function extractInputData(sheet: SheetMatrix): InputDataExtraction {
  const warnings: string[] = [];

  const metadata = {
    region: readMetadataField(sheet, METADATA_ANCHORS.region),
    division: readMetadataField(sheet, METADATA_ANCHORS.division),
    schoolName: readMetadataField(sheet, METADATA_ANCHORS.schoolName),
    schoolId: readMetadataField(sheet, METADATA_ANCHORS.schoolId),
    schoolYear: readMetadataField(sheet, METADATA_ANCHORS.schoolYear),
    gradeSection: readMetadataField(sheet, METADATA_ANCHORS.gradeSection),
    semester: readMetadataField(sheet, METADATA_ANCHORS.semester),
    track: readMetadataField(sheet, METADATA_ANCHORS.track),
    subjectCode: readMetadataField(sheet, METADATA_ANCHORS.subjectCode),
    subjectName: readMetadataField(sheet, METADATA_ANCHORS.subjectName),
    teacherName: readMetadataField(sheet, METADATA_ANCHORS.teacherName),
  };

  const learners = extractLearners(sheet);
  const signatures = extractSignatures(sheet);
  const { attachmentRules, helperNotes } = extractAttachmentAndHelperNotes(sheet);

  if (!metadata.schoolName) {
    warnings.push('Input Data metadata is missing School Name.');
  }
  if (!metadata.schoolYear) {
    warnings.push('Input Data metadata is missing School Year.');
  }
  if (learners.length === 0) {
    warnings.push('No learners detected in Input Data sheet.');
  }

  const metadataAnchorsFound = findAnchorMatchesInSheet(sheet, Object.values(METADATA_ANCHORS).flat());
  if (metadataAnchorsFound.length < 4) {
    warnings.push('Input Data sheet contains limited metadata anchors; layout may have drifted.');
  }

  return {
    sheetName: sheet.sheetName,
    schoolContext: metadata,
    learners,
    signatures,
    attachmentRules,
    helperNotes,
    warnings,
  };
}
