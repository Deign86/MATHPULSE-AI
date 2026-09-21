import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGradesPdf } from './pdfExport';

const countPdfPages = (pdfBytes: Uint8Array): number => {
  const pdfText = new TextDecoder().decode(pdfBytes);
  return pdfText.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
};

const readPdfText = async (pdf: Blob): Promise<string> => {
  const pdfBytes = new Uint8Array(await pdf.arrayBuffer());
  return new TextDecoder().decode(pdfBytes);
};

describe('createGradesPdf', () => {
  it('creates multiple pages with numbered footers for long quiz lists', async () => {
    const quizRows = Array.from({ length: 80 }, (_unused, index) => ({
      title: `Quiz ${index + 1}`,
      subject: 'General Mathematics',
      score: 80 + (index % 20),
      date: '2026-09-21',
      type: 'Practice',
      status: 'Completed',
    }));

    const pdf = await createGradesPdf({
      studentName: 'Ada Lovelace',
      exportDate: '2026-09-21',
      subjectFilter: 'all',
      typeFilter: 'all',
      subjectRows: [{ subject: 'General Mathematics', average: 92 }],
      quizRows,
    });
    const pdfBytes = new Uint8Array(await pdf.arrayBuffer());
    const pageCount = countPdfPages(pdfBytes);
    const pdfText = new TextDecoder().decode(pdfBytes);

    expect(pageCount).toBeGreaterThan(1);
    expect(pdfText).toContain(`Page 1 of ${pageCount}`);
    expect(pdfText).toContain(`Page ${pageCount} of ${pageCount}`);
  });

  it('creates one empty-state page when both row sets are empty', async () => {
    const pdf = await createGradesPdf({
      studentName: 'Ada Lovelace',
      exportDate: '2026-09-21',
      subjectFilter: 'all',
      typeFilter: 'all',
      subjectRows: [],
      quizRows: [],
    });
    const pdfText = await readPdfText(pdf);
    const pdfBytes = new Uint8Array(await pdf.arrayBuffer());

    expect(countPdfPages(pdfBytes)).toBe(1);
    expect(pdfText).toContain('No grade data available for the selected filters.');
  });

  it('keeps jsPDF and AutoTable out of the initial module imports', () => {
    const source = readFileSync(new URL('./pdfExport.ts', import.meta.url), 'utf8');

    expect(source).toContain("Promise.all([import('jspdf'), import('jspdf-autotable')])");
    expect(source).not.toMatch(/from\s+['"]jspdf(?:-autotable)?['"]/);
  });
});
