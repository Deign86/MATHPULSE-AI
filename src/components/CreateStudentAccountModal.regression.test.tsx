import { describe, expect, it } from 'vitest';
import { generateTemporaryPassword, validatePasswordRequirements } from './CreateStudentAccountModal';

describe('student account modal credential regressions', () => {
  it('generates a credential that meets each password requirement', () => {
    const password = generateTemporaryPassword(16);
    expect(password).toHaveLength(16);
    expect(validatePasswordRequirements(password)).toEqual({ valid: true });
  });

  it('rejects short passwords and does not generate a shorter-than-policy value', () => {
    expect(validatePasswordRequirements('Ab1!')).toMatchObject({ valid: false });
    expect(generateTemporaryPassword(4)).toHaveLength(12);
  });
});
