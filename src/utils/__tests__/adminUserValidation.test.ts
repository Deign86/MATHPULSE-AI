import { describe, expect, it } from 'vitest';
import { validateAdminCreateUserForm } from '../adminUserValidation';

describe('validateAdminCreateUserForm', () => {
  it('does not require a section when creating a teacher', () => {
    const errors = validateAdminCreateUserForm({
      name: 'Taylor Teacher',
      email: 'teacher@example.com',
      password: 'Secure123!',
      confirmPassword: 'Secure123!',
      role: 'Teacher',
      status: 'Active',
      grade: 'Grade 11',
      section: '',
      lrn: '',
    });

    expect(errors.section).toBeUndefined();
  });
});
