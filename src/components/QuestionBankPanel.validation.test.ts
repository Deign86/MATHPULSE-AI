/** QuestionBankPanel PDF path validation (TCH-072): malformed paths never reach the API. */
import { describe, expect, it } from 'vitest';

import { validatePdfStoragePath } from './QuestionBankPanel';

describe('validatePdfStoragePath (TCH-072)', () => {
  it('accepts storage-relative PDF paths', () => {
    expect(validatePdfStoragePath('rag-pdfs/filename.pdf')).toBeNull();
    expect(validatePdfStoragePath('  quiz_pdfs/grade_8/test.PDF  ')).toBeNull();
  });

  it('rejects empty paths', () => {
    expect(validatePdfStoragePath('')).toBe('Please enter a storage path');
    expect(validatePdfStoragePath('   ')).toBe('Please enter a storage path');
  });

  it('rejects non-PDF paths', () => {
    expect(validatePdfStoragePath('quiz_pdfs/grade_8/test.docx')).toBe(
      'Storage path must point to a .pdf file',
    );
  });

  it('rejects URLs and absolute paths', () => {
    expect(validatePdfStoragePath('https://example.com/a.pdf')).toBe(
      'Enter a storage-relative path (e.g. rag-pdfs/filename.pdf), not a URL',
    );
    expect(validatePdfStoragePath('gs://bucket/a.pdf')).toBe(
      'Enter a storage-relative path (e.g. rag-pdfs/filename.pdf), not a URL',
    );
    expect(validatePdfStoragePath('/abs/path/a.pdf')).toBe(
      'Enter a storage-relative path (e.g. rag-pdfs/filename.pdf), not a URL',
    );
  });

  it('rejects traversal paths', () => {
    expect(validatePdfStoragePath('../secret/a.pdf')).toBe('Storage path must not contain ..');
  });
});
