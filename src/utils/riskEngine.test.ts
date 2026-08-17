import { describe, it, expect } from 'vitest';
import {
  computeRisk,
  classifyWRI,
  riskStatusToOverallRisk,
  isAtRiskByScore,
  computeSystemPerformance,
  DEFAULT_WEIGHTS,
} from './riskEngine';

describe('riskEngine', () => {
  describe('classifyWRI', () => {
    it('classifies >= 88 as safe', () => {
      expect(classifyWRI(90)).toBe('safe');
      expect(classifyWRI(88)).toBe('safe');
    });

    it('classifies 80..87.99 as watch', () => {
      expect(classifyWRI(87.99)).toBe('watch');
      expect(classifyWRI(80)).toBe('watch');
    });

    it('classifies 75..79.99 as intervene', () => {
      expect(classifyWRI(79.99)).toBe('intervene');
      expect(classifyWRI(75)).toBe('intervene');
    });

    it('classifies 68..74.99 as critical', () => {
      expect(classifyWRI(74.99)).toBe('critical');
      expect(classifyWRI(68)).toBe('critical');
    });

    it('classifies < 68 as at_risk', () => {
      expect(classifyWRI(67.99)).toBe('at_risk');
      expect(classifyWRI(50)).toBe('at_risk');
    });
  });

  describe('riskStatusToOverallRisk', () => {
    it('maps statuses correctly', () => {
      expect(riskStatusToOverallRisk('safe')).toBe('Low');
      expect(riskStatusToOverallRisk('watch')).toBe('Moderate');
      expect(riskStatusToOverallRisk('intervene')).toBe('High');
      expect(riskStatusToOverallRisk('critical')).toBe('Critical');
      expect(riskStatusToOverallRisk('at_risk')).toBe('Critical');
    });
  });

  describe('computeRisk', () => {
    it('returns null WRI and Low overall risk when diagnosticScore is null', () => {
      const res = computeRisk({
        diagnosticScore: null,
        externalGradesAvg: 80,
        systemPerformanceAvg: 90,
      });
      expect(res.wri).toBeNull();
      expect(res.riskStatus).toBeNull();
      expect(res.overallRisk).toBe('Low');
    });

    it('computes standard weights correctly (safe)', () => {
      // 0.3*90 + 0.4*90 + 0.3*90 = 90.0
      const res = computeRisk({
        diagnosticScore: 90,
        externalGradesAvg: 90,
        systemPerformanceAvg: 90,
      });
      expect(res.wri).toBe(90.0);
      expect(res.riskStatus).toBe('safe');
      expect(res.overallRisk).toBe('Low');
    });

    it('computes standard weights correctly (at_risk)', () => {
      // 0.3*60 + 0.4*70 + 0.3*65 = 18 + 28 + 19.5 = 65.5
      const res = computeRisk({
        diagnosticScore: 60,
        externalGradesAvg: 70,
        systemPerformanceAvg: 65,
      });
      expect(res.wri).toBe(65.5);
      expect(res.riskStatus).toBe('at_risk');
      expect(res.overallRisk).toBe('Critical');
    });

    it('computes standard weights correctly (intervene)', () => {
      // 0.3*78 + 0.4*76 + 0.3*74 = 23.4 + 30.4 + 22.2 = 76.0
      const res = computeRisk({
        diagnosticScore: 78,
        externalGradesAvg: 76,
        systemPerformanceAvg: 74,
      });
      expect(res.wri).toBe(76.0);
      expect(res.riskStatus).toBe('intervene');
      expect(res.overallRisk).toBe('High');
    });

    it('defaults missing G and P to D', () => {
      const res = computeRisk({
        diagnosticScore: 68,
        externalGradesAvg: null,
        systemPerformanceAvg: null,
      });
      expect(res.wri).toBe(68.0);
      expect(res.riskStatus).toBe('critical');
      expect(res.overallRisk).toBe('Critical');
    });

    it('handles custom weights', () => {
      const res = computeRisk({
        diagnosticScore: 70,
        externalGradesAvg: 90,
        systemPerformanceAvg: 80,
        weights: { w1: 0.2, w2: 0.5, w3: 0.3 },
      });
      // 0.2*70 + 0.5*90 + 0.3*80 = 14 + 45 + 24 = 83.0
      expect(res.wri).toBe(83.0);
      expect(res.riskStatus).toBe('watch');
      expect(res.overallRisk).toBe('Moderate');
    });
  });

  describe('isAtRiskByScore', () => {
    it('returns true only for scores in (0, 60)', () => {
      expect(isAtRiskByScore(59)).toBe(true);
      expect(isAtRiskByScore(60)).toBe(false);
      expect(isAtRiskByScore(75)).toBe(false);
      expect(isAtRiskByScore(0)).toBe(false);
    });
  });

  describe('computeSystemPerformance', () => {
    it('returns null for empty array', () => {
      expect(computeSystemPerformance([])).toBeNull();
    });

    it('computes rounded average', () => {
      expect(computeSystemPerformance([80, 90, 85])).toBe(85);
      expect(computeSystemPerformance([70, 75])).toBe(73);
    });
  });
});
