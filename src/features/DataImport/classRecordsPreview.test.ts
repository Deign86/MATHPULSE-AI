/** Regression coverage for class-records preview rows (TCH-043/045/074). */
import { describe, expect, it } from 'vitest';

import {
  buildWorkbookPreviewRows,
  flagIdentity,
  isBlockedRow,
  parseCsvPreviewRows,
  PREVIEW_ROW_CAP,
} from './classRecordsPreview';

describe('flagIdentity', () => {
  it('flags malformed LRN values', () => {
    expect(flagIdentity('Dela Cruz Juan', '12345', 'a@b.c')).toContain(
      'LRN must contain exactly 12 digits.',
    );
  });

  it('requires LRN or email', () => {
    expect(flagIdentity('Dela Cruz Juan', '', '')).toContain('LRN or email is required.');
  });

  it('flags single-letter names as mapping suspects without blocking', () => {
    const flags = flagIdentity('B', '123456789012', '');
    expect(flags).toContain('Verify name column mapping (name looks like an initial).');
    expect(
      isBlockedRow({ sourceRow: 2, name: 'B', lrn: '123456789012', email: '', flags }),
    ).toBe(false);
  });

  it('passes clean identities with no flags', () => {
    expect(flagIdentity('Dela Cruz Juan', '123456789012', '')).toEqual([]);
  });
});

describe('buildWorkbookPreviewRows', () => {
  it('passes parser output through without fabrication', () => {
    const { rows, total } = buildWorkbookPreviewRows([
      { fullName: 'Dela Cruz Juan', lrn: '123456789012', email: '', sourceRow: 5 },
    ]);
    expect(total).toBe(1);
    expect(rows[0]).toMatchObject({ sourceRow: 5, name: 'Dela Cruz Juan' });
    expect(rows[0].flags).toEqual([]);
  });

  it('caps displayed rows at PREVIEW_ROW_CAP', () => {
    const entities = Array.from({ length: PREVIEW_ROW_CAP + 10 }, (_, index) => ({
      fullName: `Learner ${index + 1}`,
      lrn: '123456789012',
      sourceRow: index + 2,
    }));
    const { rows, total } = buildWorkbookPreviewRows(entities);
    expect(rows).toHaveLength(PREVIEW_ROW_CAP);
    expect(total).toBe(PREVIEW_ROW_CAP + 10);
  });
});

describe('parseCsvPreviewRows', () => {
  it('parses quoted commas and reports malformed LRN', () => {
    const text = 'Name,LRN,Email\n"Dela Cruz, Juan",12345,juan@example.com\nReyes Ana,123456789012,\n';
    const { rows, total, note } = parseCsvPreviewRows(text);
    expect(note).toBeNull();
    expect(total).toBe(2);
    expect(rows[0].name).toBe('Dela Cruz, Juan');
    expect(rows[0].flags).toContain('LRN must contain exactly 12 digits.');
    expect(rows[1].flags).toEqual([]);
  });

  it('reports empty files and missing name columns', () => {
    expect(parseCsvPreviewRows('   \n').note).toBe('Empty file.');
    expect(parseCsvPreviewRows('LRN,Email\n123456789012,a@b.c\n').note).toBe(
      'No name column detected.',
    );
  });
});
