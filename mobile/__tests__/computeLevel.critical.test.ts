/**
 * @file computeLevel.critical.test.ts
 * Critical tests for the computeLevel formula (exponential cumulative scale).
 *
 * Level thresholds: L1=0, L2=100, L3=250, L4=475, L5=812, L6=1318,
 *                   L7=2077, L8=3200, L9=4867, L10=7328
 */

import { computeLevel } from '../services/gamificationService';

describe('computeLevel - critical formula', () => {
  it('0 XP -> level 1', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('99 XP -> level 1 (below L2 threshold of 100)', () => {
    expect(computeLevel(99)).toBe(1);
  });

  it('100 XP -> level 2 (exact L2 threshold)', () => {
    expect(computeLevel(100)).toBe(2);
  });

  it('249 XP -> level 2 (below L3 threshold of 250)', () => {
    expect(computeLevel(249)).toBe(2);
  });

  it('250 XP -> level 3 (exact L3 threshold)', () => {
    expect(computeLevel(250)).toBe(3);
  });

  it('1267 XP -> level 5 (>= L5=812, < L6=1318)', () => {
    // 1267 >= 812 (L5 threshold) but 1267 < 1318 (L6 threshold)
    expect(computeLevel(1267)).toBe(5);
  });

  it('4852 XP -> level 8 (>= L8=3200, < L9=4867)', () => {
    // 4852 >= 3200 (L8 threshold) but 4852 < 4867 (L9 threshold)
    expect(computeLevel(4852)).toBe(8);
  });

  it('4853 XP -> level 8 (>= L8=3200, < L9=4867)', () => {
    // 4853 >= 3200 (L8 threshold) but 4853 < 4867 (L9 threshold)
    expect(computeLevel(4853)).toBe(8);
  });

  it('negative XP -> level 1', () => {
    expect(computeLevel(-50)).toBe(1);
  });

  it('1318 XP -> level 6 (exact L6 threshold, existing test parity)', () => {
    expect(computeLevel(1318)).toBe(6);
  });

  it('2077 XP -> level 7 (exact L7 threshold, existing test parity)', () => {
    expect(computeLevel(2077)).toBe(7);
  });
});
