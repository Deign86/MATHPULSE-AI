import { describe, expect, it } from 'vitest';
import { classifyRowType, parseLearnerNo } from '../utils/classifyRows';

describe('learner row classification regressions', () => {
  it('accepts a named roster row and parses a formatted learner number', () => {
    expect(classifyRowType({ rowText: '12 DELA CRUZ, JUAN', hasLearnerNumber: true, hasLearnerName: true })).toBe('learner');
    expect(parseLearnerNo('No. 0012')).toBe(12);
  });

  it('keeps blank and non-positive learner numbers out of the roster', () => {
    expect(classifyRowType({ rowText: '  ', hasLearnerNumber: false, hasLearnerName: false })).toBe('blank');
    expect(parseLearnerNo('0')).toBeUndefined();
    expect(parseLearnerNo('')).toBeUndefined();
  });
});
