import { utils as xlsxUtils } from 'xlsx';
import type { CellSnapshot, MergeRange, RawSheetSnapshot, ReferenceCellValue } from '../types';

export function isAddressInRange(row: number, col: number, range: MergeRange): boolean {
  return row >= range.s.r && row <= range.e.r && col >= range.s.c && col <= range.e.c;
}

/** Merged-cell root lookup: slave address to its top-left anchor address. */
export interface MergedAddressRootMap { [address: string]: string }

export function buildMergedAddressRootMap(merges: MergeRange[]): MergedAddressRootMap {
  const mergedMap: MergedAddressRootMap = {};
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
  mergedRootMap?: MergedAddressRootMap,
): CellSnapshot | undefined {
  const rootMap = mergedRootMap || buildMergedAddressRootMap(sheet.merges);
  const rootAddress = rootMap[address] || address;
  return sheet.cells[rootAddress] || sheet.cells[address];
}

export function resolveCellValue(
  sheet: RawSheetSnapshot,
  address: string,
  mergedRootMap?: MergedAddressRootMap,
): ReferenceCellValue | undefined {
  const snapshot = resolveCellSnapshot(sheet, address, mergedRootMap);
  if (!snapshot) return undefined;
  if (snapshot.w !== undefined) return snapshot.w;
  // SAFETY: the parser only emits primitive sheet cell values, matching ReferenceCellValue.
  return snapshot.v as ReferenceCellValue | undefined;
}
