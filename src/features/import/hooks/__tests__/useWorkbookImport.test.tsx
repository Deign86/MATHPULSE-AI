// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { useShsExcelImport } from '../useShsExcelImport';

describe('useShsExcelImport', () => {
  it('keeps a structurally invalid workbook non-committable after parsing', async () => {
    const { result } = renderHook(() => useShsExcelImport());
    const invalidFile = new File(['not an excel workbook'], 'invalid.xlsx');

    await act(async () => {
      await result.current.parseFile(invalidFile);
    });

    expect(result.current.stage).toBe('complete');
    expect(result.current.result?.imported.validation.errors).toContain('Missing Input Data sheet.');
    expect(result.current.canConfirmImport).toBe(false);
  });

  it('parses a valid workbook into consumer entities and enables confirmation', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['INPUT DATA'],
      ['SCHOOL NAME', 'MathPulse High School'],
      ['SCHOOL YEAR', '2026-2027'],
      ['GRADE / SECTION', 'Grade 11 - STEM A'],
      ['LEARNERS NAMES', 'LRN', 'EMAIL'],
      ['Avery Santos', '123456789012', 'avery@example.com'],
    ]), 'Input Data');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['SENIOR HIGH SCHOOL CLASS RECORD'],
      ['FIRST QUARTER'],
      ['LEARNERS NAMES', 'WRITTEN WORK', 'PERFORMANCE TASKS', 'QUARTERLY ASSESSMENT', 'REMARK'],
      ['Avery Santos', 90, 92, 91, 'Passed'],
    ]), 'First Quarter');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['FINAL SEMESTRAL GRADES'],
      ['LEARNERS NAMES', 'FINAL GRADE', 'REMARK'],
      ['Avery Santos', 91, 'Passed'],
    ]), 'Final Semestral Grades');

    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const validFile = new File([bytes], 'valid-class-record.xlsx');
    const { result } = renderHook(() => useShsExcelImport());

    await act(async () => {
      await result.current.parseFile(validFile);
    });

    expect(result.current.stage).toBe('complete');
    expect(result.current.result?.mapping.studentEntities).toEqual([
      expect.objectContaining({ fullName: 'Avery Santos', lrn: '123456789012' }),
    ]);
    expect(result.current.result?.mapping.classEntity).toEqual(
      expect.objectContaining({ grade: 'Grade 11 - STEM A', schoolYear: '2026-2027' }),
    );
    expect(result.current.canConfirmImport).toBe(true);
  });
});
