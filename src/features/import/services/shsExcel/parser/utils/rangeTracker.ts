import type { MergeRange, RegionMapping, SheetMatrix, UnclassifiedBlock } from '../types';
import { getMatrixCell, rangeToA1, sliceMatrix2D } from './sheetMatrix';

interface SheetTrackerState {
  mappedAddresses: Set<string>;
  mappings: RegionMapping[];
}

export class RangeTracker {
  private readonly state: Record<string, SheetTrackerState> = {};

  markRange(sheetName: string, range: MergeRange, reason: string): void {
    const key = sheetName;
    if (!this.state[key]) {
      this.state[key] = {
        mappedAddresses: new Set<string>(),
        mappings: [],
      };
    }

    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        this.state[key].mappedAddresses.add(`${row}:${col}`);
      }
    }

    this.state[key].mappings.push({ sheetName, range, reason });
  }

  getMappings(): RegionMapping[] {
    return Object.values(this.state).flatMap((sheet) => sheet.mappings);
  }

  getMappedRegionCount(): number {
    return this.getMappings().length;
  }

  getUnmappedBlocks(
    matrices: Record<string, SheetMatrix>,
    purposeGuess: string = 'unclassified',
  ): UnclassifiedBlock[] {
    const blocks: UnclassifiedBlock[] = [];

    Object.values(matrices).forEach((matrix) => {
      const visited = new Set<string>();
      const mapped = this.state[matrix.sheetName]?.mappedAddresses ?? new Set<string>();

      for (let row = matrix.startRow; row <= matrix.endRow; row += 1) {
        for (let col = matrix.startCol; col <= matrix.endCol; col += 1) {
          const key = `${row}:${col}`;
          if (visited.has(key) || mapped.has(key)) continue;

          const cell = getMatrixCell(matrix, row, col);
          const hasValue = cell && cell.displayValue !== null && cell.displayValue !== undefined && String(cell.displayValue).trim();
          if (!hasValue) {
            visited.add(key);
            continue;
          }

          const component = this.collectComponent(matrix, row, col, mapped, visited);
          if (!component) continue;

          blocks.push({
            sheetName: matrix.sheetName,
            range: rangeToA1(component),
            purposeGuess,
            raw2D: sliceMatrix2D(matrix, component),
          });
        }
      }
    });

    return blocks;
  }

  private collectComponent(
    matrix: SheetMatrix,
    seedRow: number,
    seedCol: number,
    mapped: Set<string>,
    visited: Set<string>,
  ): MergeRange | null {
    const queue: Array<{ row: number; col: number }> = [{ row: seedRow, col: seedCol }];
    let minRow = seedRow;
    let maxRow = seedRow;
    let minCol = seedCol;
    let maxCol = seedCol;
    let found = false;

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      const key = `${current.row}:${current.col}`;
      if (visited.has(key) || mapped.has(key)) continue;
      visited.add(key);

      const cell = getMatrixCell(matrix, current.row, current.col);
      const hasValue = cell && cell.displayValue !== null && cell.displayValue !== undefined && String(cell.displayValue).trim();
      if (!hasValue) continue;

      found = true;
      minRow = Math.min(minRow, current.row);
      maxRow = Math.max(maxRow, current.row);
      minCol = Math.min(minCol, current.col);
      maxCol = Math.max(maxCol, current.col);

      [
        { row: current.row - 1, col: current.col },
        { row: current.row + 1, col: current.col },
        { row: current.row, col: current.col - 1 },
        { row: current.row, col: current.col + 1 },
      ].forEach((neighbor) => {
        if (neighbor.row < matrix.startRow || neighbor.row > matrix.endRow) return;
        if (neighbor.col < matrix.startCol || neighbor.col > matrix.endCol) return;
        queue.push(neighbor);
      });
    }

    if (!found) return null;
    return {
      s: { r: minRow, c: minCol },
      e: { r: maxRow, c: maxCol },
    };
  }
}
