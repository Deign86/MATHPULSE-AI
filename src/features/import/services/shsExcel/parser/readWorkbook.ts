import * as XLSX from 'xlsx';
import type { MergeRange, RawSheetSnapshot, WorkbookReadResult } from './types';
import { buildSheetMatrix } from './utils/sheetMatrix';

function cloneMerges(merges: XLSX.Range[] | undefined): MergeRange[] {
  if (!merges || merges.length === 0) return [];
  return merges.map((merge) => ({
    s: { r: merge.s.r, c: merge.s.c },
    e: { r: merge.e.r, c: merge.e.c },
  }));
}

function toRawSheetSnapshot(sheet: XLSX.WorkSheet): RawSheetSnapshot {
  const raw: RawSheetSnapshot = {
    ref: sheet['!ref'],
    merges: cloneMerges(sheet['!merges'] as XLSX.Range[] | undefined),
    cells: {},
  };

  Object.keys(sheet)
    .filter((key) => !key.startsWith('!'))
    .forEach((address) => {
      const cell = sheet[address] as XLSX.CellObject | undefined;
      if (!cell) return;

      const hasMeaningfulValue =
        cell.v !== undefined
        || (typeof cell.w === 'string' && cell.w.trim().length > 0)
        || (typeof cell.f === 'string' && cell.f.trim().length > 0);

      if (!hasMeaningfulValue) {
        return;
      }

      raw.cells[address] = {
        v: cell.v,
        w: cell.w,
        t: cell.t,
        f: cell.f,
      };
    });

  return raw;
}

export function readWorkbookFromArrayBuffer(fileName: string, buffer: ArrayBuffer): WorkbookReadResult {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellFormula: true,
    cellNF: true,
    cellText: true,
    cellDates: true,
    raw: false,
  });

  const matrices: WorkbookReadResult['matrices'] = {};
  const rawSheets: WorkbookReadResult['raw']['sheets'] = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;
    const rawSheet = toRawSheetSnapshot(worksheet);
    rawSheets[sheetName] = rawSheet;
    matrices[sheetName] = buildSheetMatrix(sheetName, rawSheet);
  });

  return {
    fileName,
    sheetNames: workbook.SheetNames,
    raw: { sheets: rawSheets },
    matrices,
  };
}

export async function readWorkbookFromFile(file: File): Promise<WorkbookReadResult> {
  const buffer = await file.arrayBuffer();
  return readWorkbookFromArrayBuffer(file.name, buffer);
}
