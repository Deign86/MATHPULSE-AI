import { describe, expect, it } from 'vitest';
import { getFirstValidationError, validateAdminCreateUserForm } from '../utils/adminUserValidation';

describe('admin user management validation regressions', () => {
  it('accepts a complete student record with matching credentials', () => {
    const errors = validateAdminCreateUserForm({
      name: 'Juan Dela Cruz', email: 'juan@example.test', password: 'SecurePass1!', confirmPassword: 'SecurePass1!',
      role: 'Student', status: 'Active', grade: 'Grade 11', section: 'STEM A', lrn: '123456789012',
    });
    expect(errors).toEqual({});
  });

  it('returns a first actionable error for malformed account details', () => {
    const errors = validateAdminCreateUserForm({
      name: '', email: 'bad-address', password: 'x', confirmPassword: 'y',
      role: 'Student', status: 'Active', grade: '', section: '', lrn: '',
    });
    expect(getFirstValidationError(errors)).toEqual(expect.any(String));
    expect(Object.keys(errors).length).toBeGreaterThan(0);
  });
});
