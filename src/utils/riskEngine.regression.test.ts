import { describe, expect, it } from 'vitest';
import { classifyWRI, computeRisk, computeSystemPerformance } from './riskEngine';

describe('risk engine regression', () => {
  it.each([[88, 'safe'], [80, 'watch'], [75, 'intervene'], [68, 'critical'], [67.99, 'at_risk']] as const)(
    'keeps exact WRI threshold %s in band %s', (wri, expected) => {
      expect(classifyWRI(wri)).toBe(expected);
    },
  );

  it('uses the diagnostic score for missing grade and performance values', () => {
    expect(computeRisk({ diagnosticScore: 81, externalGradesAvg: null, systemPerformanceAvg: null }))
      .toMatchObject({ wri: 81, riskStatus: 'watch' });
    expect(computeSystemPerformance([])).toBeNull();
  });
});
