import { describe, expect, it } from 'vitest';
import {
  generateTemporaryPassword,
  validatePasswordRequirements,
} from '../CreateStudentAccountModal';

describe('CreateStudentAccountModal password policies', () => {
  it('validates password requirements correctly', () => {
    // Missing uppercase
    expect(validatePasswordRequirements('abcdef12!@').valid).toBe(false);
    // Missing lowercase
    expect(validatePasswordRequirements('ABCDEF12!@').valid).toBe(false);
    // Missing digit
    expect(validatePasswordRequirements('Abcdefgh!@').valid).toBe(false);
    // Missing special char
    expect(validatePasswordRequirements('Abcdefgh12').valid).toBe(false);
    // Too short
    expect(validatePasswordRequirements('Ab1!').valid).toBe(false);
    // Valid password
    expect(validatePasswordRequirements('StrongPass123!').valid).toBe(true);
  });

  it('generates passwords that strictly satisfy Firebase Auth password requirements', () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generateTemporaryPassword(12);
      expect(password.length).toBeGreaterThanOrEqual(12);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[^A-Za-z0-9]/.test(password)).toBe(true);

      const validation = validatePasswordRequirements(password);
      expect(validation.valid).toBe(true);
    }
  });
});
