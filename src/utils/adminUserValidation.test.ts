/** ADM-076: grade/section must be student-only requirements; teachers create without them. */
import { describe, expect, it } from 'vitest';

import { validateAdminCreateUserForm } from './adminUserValidation';

const teacherBase = {
  name: 'Maria Santos',
  email: 'maria.santos@mathpulse.ai',
  password: 'Teacher@123',
  confirmPassword: 'Teacher@123',
  role: 'Teacher',
  status: 'Active',
  grade: '',
  section: '',
  lrn: '',
};

const studentBase = {
  ...teacherBase,
  role: 'Student',
};

describe('validateAdminCreateUserForm role-scoped requirements (ADM-076)', () => {
  it('allows teacher accounts without grade or section', () => {
    expect(validateAdminCreateUserForm(teacherBase)).toEqual({});
  });

  it('still requires grade and section for students', () => {
    const errors = validateAdminCreateUserForm({
      ...studentBase,
      lrn: '123456789012',
    });
    expect(errors.grade).toBe('Grade is required.');
    expect(errors.section).toBe('Section is required.');
  });

  it('keeps the 12-digit LRN rule student-only', () => {
    const studentErrors = validateAdminCreateUserForm({
      ...studentBase,
      grade: 'Grade 11',
      section: 'STEM-A',
      lrn: '12345',
    });
    expect(studentErrors.lrn).toBe('LRN must be exactly 12 digits.');
    expect(validateAdminCreateUserForm(teacherBase).lrn).toBeUndefined();
  });

  it('rejects empty names and mismatched passwords regardless of role', () => {
    const errors = validateAdminCreateUserForm({
      ...teacherBase,
      name: '  ',
      confirmPassword: 'Other@123',
    });
    expect(errors.name).toBe('Name is required.');
    expect(errors.confirmPassword).toBe('Passwords do not match.');
  });
});
