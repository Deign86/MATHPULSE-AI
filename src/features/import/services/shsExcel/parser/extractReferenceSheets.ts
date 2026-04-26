import { STATUS_TOKENS } from './constants';
import type { ParsedSignature, ReferenceSheetExtraction, SheetMatrix } from './types';
import { findAllAnchors } from './utils/findAnchors';
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

function extractComponentWeights(sheet: SheetMatrix): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  let inWeightBlock = false;

  for (let row = sheet.startRow; row <= sheet.endRow; row += 1) {
    const rowText = getRowText(sheet, row);
    if (!rowText) {
      if (inWeightBlock && rows.length > 0) break;
      continue;
    }

    if (includesNormalized(rowText, 'WEIGHT OF COMPONENTS')) {
      inWeightBlock = true;
      continue;
    }

    if (!inWeightBlock) continue;

    const record: Record<string, unknown> = {
      sourceRow: row + 1,
      raw: rowText,
    };

    for (let col = sheet.startCol; col <= sheet.endCol; col += 1) {
      const value = getMatrixCell(sheet, row, col)?.displayValue;
      if (value === undefined || value === null || String(value).trim() === '') continue;
      record[`c${col}`] = value;
    }

    if (Object.keys(record).length > 2) {
      rows.push(record);
    }
  }

  return rows;
}

export function extractReferenceSheets(sheets: SheetMatrix[]): ReferenceSheetExtraction {
  const warnings: string[] = [];
  const signatures: ParsedSignature[] = [];
  const componentWeights: Array<Record<string, unknown>> = [];
  const attachmentRules: string[] = [];
  const helperNotes: string[] = [];

  sheets.forEach((sheet) => {
    extractSignatures(sheet).forEach((sig) => signatures.push(sig));
    extractComponentWeights(sheet).forEach((weight) => componentWeights.push({ ...weight, sourceSheet: sheet.sheetName }));

    for (let row = sheet.startRow; row <= sheet.endRow; row += 1) {
      const rowText = getRowText(sheet, row);
      if (!rowText) continue;

      if (STATUS_TOKENS.some((token) => includesNormalized(rowText, token))) {
        attachmentRules.push(`${sheet.sheetName}: ${rowText}`);
        continue;
      }

      if (
        includesNormalized(rowText, 'HELPER')
        || includesNormalized(rowText, 'LOOK UP')
        || includesNormalized(rowText, 'IMPORTANT')
        || includesNormalized(rowText, 'REFERENCE')
        || includesNormalized(rowText, 'ATTACHMENT')
      ) {
        helperNotes.push(`${sheet.sheetName}: ${rowText}`);
      }
    }
  });

  if (componentWeights.length === 0) {
    warnings.push('No component weight rows were parsed from reference sheets.');
  }

  return {
    sheetName: sheets.map((sheet) => sheet.sheetName).join(', '),
    componentWeights,
    attachmentRules: Array.from(new Set(attachmentRules)),
    helperNotes: Array.from(new Set(helperNotes)),
    signatures,
    warnings,
  };
}
