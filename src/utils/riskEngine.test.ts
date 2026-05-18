import { describe, it, expect } from 'vitest';
import {
  computeRisk,
  classifyWRI,
  riskStatusToOverallRisk,
  isAtRiskByScore,
  computeSystemPerformance,
  DEFAULT_WEIGHTS,
} from '../utils/riskEngine';

describe('riskEngine', () => {
  describe('computeRisk', () => {
    it('returns null WRI when diagnostic score is null', () => {
      const result = computeRisk({ diagnosticScore: null, externalGradesAvg: 80, systemPerformanceAvg: 70 });
      expect(result.wri).toBeNull();
      expect(result.riskStatus).toBeNull();
      expect(result.overallRisk).toBe('Low');
    });

    it('computes WRI correctly with all inputs', () => {
      // WRI = 0.30*90 + 0.40*85 + 0.30*80 = 27 + 34 + 24 = 85
      const result = computeRisk({ diagnosticScore: 90, externalGradesAvg: 85, systemPerformanceAvg: 80 });
      expect(result.wri).toBe(85);
      expect(result.riskStatus).toBe('watch');
      expect(result.overallRisk).toBe('Moderate');
    });

    it('falls back to diagnostic score when G and P are null', () => {
      // WRI = 0.30*70 + 0.40*70 + 0.30*70 = 70
      const result = computeRisk({ diagnosticScore: 70, externalGradesAvg: null, systemPerformanceAvg: null });
      expect(result.wri).toBe(70);
      expect(result.riskStatus).toBe('critical');
    });

    it('marks low-performing student as at_risk', () => {
      // WRI = 0.30*40 + 0.40*50 + 0.30*45 = 12 + 20 + 13.5 = 45.5
      const result = computeRisk({ diagnosticScore: 40, externalGradesAvg: 50, systemPerformanceAvg: 45 });
      expect(result.wri).toBe(45.5);
      expect(result.riskStatus).toBe('at_risk');
      expect(result.overallRisk).toBe('Critical');
    });

    it('marks high-performing student as safe', () => {
      // WRI = 0.30*95 + 0.40*92 + 0.30*90 = 28.5 + 36.8 + 27 = 92.3
      const result = computeRisk({ diagnosticScore: 95, externalGradesAvg: 92, systemPerformanceAvg: 90 });
      expect(result.wri).toBe(92.3);
      expect(result.riskStatus).toBe('safe');
      expect(result.overallRisk).toBe('Low');
    });
  });

  describe('classifyWRI', () => {
    it('classifies thresholds correctly', () => {
      expect(classifyWRI(88)).toBe('safe');
      expect(classifyWRI(80)).toBe('watch');
      expect(classifyWRI(75)).toBe('intervene');
      expect(classifyWRI(68)).toBe('critical');
      expect(classifyWRI(67)).toBe('at_risk');
      expect(classifyWRI(0)).toBe('at_risk');
    });
  });

  describe('riskStatusToOverallRisk', () => {
    it('maps all statuses to admin-readable labels', () => {
      expect(riskStatusToOverallRisk('safe')).toBe('Low');
      expect(riskStatusToOverallRisk('watch')).toBe('Moderate');
      expect(riskStatusToOverallRisk('intervene')).toBe('High');
      expect(riskStatusToOverallRisk('critical')).toBe('Critical');
      expect(riskStatusToOverallRisk('at_risk')).toBe('Critical');
    });
  });

  describe('isAtRiskByScore', () => {
    it('returns true for scores below 60', () => {
      expect(isAtRiskByScore(59)).toBe(true);
      expect(isAtRiskByScore(40)).toBe(true);
      expect(isAtRiskByScore(1)).toBe(true);
    });

    it('returns false for scores at or above 60', () => {
      expect(isAtRiskByScore(60)).toBe(false);
      expect(isAtRiskByScore(100)).toBe(false);
    });

    it('returns false for zero score (no data)', () => {
      expect(isAtRiskByScore(0)).toBe(false);
    });
  });

  describe('computeSystemPerformance', () => {
    it('returns null for empty array', () => {
      expect(computeSystemPerformance([])).toBeNull();
    });

    it('computes average of quiz scores', () => {
      expect(computeSystemPerformance([80, 60, 70])).toBe(70);
      expect(computeSystemPerformance([100])).toBe(100);
      expect(computeSystemPerformance([33, 67])).toBe(50);
    });
  });
});
