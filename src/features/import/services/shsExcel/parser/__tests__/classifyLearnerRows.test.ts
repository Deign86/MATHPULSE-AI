import { describe, expect, it } from 'vitest';
import { classifyRowType, detectSexContextFromRow } from '../utils/classifyRows';

describe('classifyRows', () => {
  it('classifies gender sections', () => {
    expect(detectSexContextFromRow(' MALE ')).toBe('MALE');
    expect(detectSexContextFromRow(' FEMALE ')).toBe('FEMALE');
  });

  it('classifies learner row using number/name signals', () => {
    const result = classifyRowType({
      rowText: '12 DELA CRUZ, JUAN',
      hasLearnerNumber: true,
      hasLearnerName: true,
    });

    expect(result).toBe('learner');
  });

  it('classifies helper/signature rows', () => {
    expect(classifyRowType({ rowText: 'SUBMITTED BY', hasLearnerNumber: false, hasLearnerName: false })).toBe('signature');
    expect(classifyRowType({ rowText: 'TOTAL', hasLearnerNumber: false, hasLearnerName: false })).toBe('helper');
  });
});
