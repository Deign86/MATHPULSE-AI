import { describe, expect, it } from 'vitest';
import { validateAdminCreateUserForm } from './adminUserValidation';
import { isValidFirebaseStoragePdfPath } from './firebaseStoragePath';

describe('admin regression validation', () => {
  it('allows teacher creation without student-only grade and section fields', () => {
    expect(validateAdminCreateUserForm({
      name: 'Taylor Teacher',
      email: 'taylor@example.org',
      password: 'GoodPass1!',
      confirmPassword: 'GoodPass1!',
      role: 'Teacher',
      status: 'Active',
      grade: '',
      section: '',
      lrn: '',
    })).toEqual({});
  });

  it('accepts only a nonblank Firebase Storage PDF object path', () => {
    expect(isValidFirebaseStoragePdfPath('quiz_pdfs/grade_11/lesson.pdf')).toBe(true);
    expect(isValidFirebaseStoragePdfPath('  ')).toBe(false);
    expect(isValidFirebaseStoragePdfPath('https://example.org/lesson.pdf')).toBe(false);
    expect(isValidFirebaseStoragePdfPath('quiz_pdfs/../private.pdf')).toBe(false);
    expect(isValidFirebaseStoragePdfPath('quiz_pdfs/lesson.txt')).toBe(false);
  });
});
