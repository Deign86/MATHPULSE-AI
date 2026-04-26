import { describe, expect, it } from 'vitest';
import { getColumnIndex, getColumnLabel } from '../utils/sheetMatrix';

describe('sheetMatrix column helpers', () => {
  it('decodes multi-letter Excel columns correctly', () => {
    expect(getColumnIndex('A')).toBe(0);
    expect(getColumnIndex('Z')).toBe(25);
    expect(getColumnIndex('AA')).toBe(26);
    expect(getColumnIndex('AB')).toBe(27);
    expect(getColumnLabel(26)).toBe('AA');
  });

  it('returns -1 for invalid column labels', () => {
    expect(getColumnIndex('')).toBe(-1);
    expect(getColumnIndex('1')).toBe(-1);
  });
});
