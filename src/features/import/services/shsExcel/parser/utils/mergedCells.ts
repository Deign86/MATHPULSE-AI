import { utils as xlsxUtils } from 'xlsx';
import type { CellSnapshot, MergeRange, RawSheetSnapshot } from '../types';

export function isAddressInRange(row: number, col: number, range: MergeRange): boolean {
  return row >= range.s.r && row <= range.e.r && col >= range.s.c && col <= range.e.c;
}

export function buildMergedAddressRootMap(merges: MergeRange[]): Record<string, string> {
  const mergedMap: Record<string, string> = {};
  merges.forEach((merge) => {
    const rootAddress = xlsxUtils.encode_cell(merge.s);
    for (let r = merge.s.r; r <= merge.e.r; r += 1) {
      for (let c = merge.s.c; c <= merge.e.c; c += 1) {
        const address = xlsxUtils.encode_cell({ r, c });
        mergedMap[address] = rootAddress;
      }
    }
  });
  return mergedMap;
}

export function resolveCellSnapshot(
  sheet: RawSheetSnapshot,
  address: string,
  mergedRootMap?: Record<string, string>,
): CellSnapshot | undefined {
  const rootMap = mergedRootMap || buildMergedAddressRootMap(sheet.merges);
  const rootAddress = rootMap[address] || address;
  return sheet.cells[rootAddress] || sheet.cells[address];
}

export function resolveCellValue(
  sheet: RawSheetSnapshot,
  address: string,
  mergedRootMap?: Record<string, string>,
): unknown {
  const snapshot = resolveCellSnapshot(sheet, address, mergedRootMap);
  if (!snapshot) return undefined;
  if (snapshot.w !== undefined) return snapshot.w;
  return snapshot.v;
}
