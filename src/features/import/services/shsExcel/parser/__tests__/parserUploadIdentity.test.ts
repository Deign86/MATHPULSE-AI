import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { parseShsWorkbook } from '../index';

describe('SHS parser upload identities', () => {
  it('preserves same-row learner identity headers and reports malformed LRN rows', async () => {
    const workbook = XLSX.utils.book_new();
    const inputData = XLSX.utils.aoa_to_sheet([
      ['LEARNERS NAMES', 'LRN', 'EMAIL'],
      ['Avery Santos', '123456789012', 'avery@example.com'],
      ['Blair Reyes', '', 'blair@example.com'],
      ['Casey Lim', '12345', 'casey@example.com'],
    ]);
    XLSX.utils.book_append_sheet(workbook, inputData, 'Input Data');

    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const file = new File([bytes], 'learner-identities.xlsx');
    const parsed = await parseShsWorkbook(file);

    expect(parsed.mapping.studentEntities.map(({ fullName, lrn, email }) => ({ fullName, lrn, email }))).toEqual([
      { fullName: 'Avery Santos', lrn: '123456789012', email: 'avery@example.com' },
      { fullName: 'Blair Reyes', lrn: undefined, email: 'blair@example.com' },
      { fullName: 'Casey Lim', lrn: '12345', email: 'casey@example.com' },
    ]);

    const rejectedRows = parsed.mapping.studentEntities
      .map((student) => ({
        row: student.sourceRow,
        lrn: student.lrn?.trim() || '',
        email: student.email?.trim() || '',
      }))
      .filter(({ lrn, email }) => (lrn ? !/^\d{12}$/.test(lrn) : !email))
      .map(({ row, lrn }) => `Row ${row}: ${lrn ? 'LRN must contain exactly 12 digits.' : 'LRN or email is required.'}`);

    expect(rejectedRows).toEqual(['Row 4: LRN must contain exactly 12 digits.']);
  });
});
