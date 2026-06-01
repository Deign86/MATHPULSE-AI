/**
 * @file authService.createProfile.critical.test.ts
 * Critical test for getRoleDefaults: verifies role-specific field defaults
 * (student 40+ fields, teacher gets teacherId+students, admin gets adminId).
 */

import { getRoleDefaults } from '../services/authService';

describe('getRoleDefaults - critical: role-specific defaults', () => {
  // ── Student defaults ─────────────────────────────────────────
  it('student defaults have 40+ fields', () => {
    const defaults = getRoleDefaults('student');
    const keys = Object.keys(defaults);
    expect(keys.length).toBeGreaterThanOrEqual(40);
  });

  it('student defaults include all gamification/risk/curriculum system fields', () => {
    const defaults = getRoleDefaults('student');
    const requiredFields = [
      'lrn', 'grade', 'section', 'level', 'currentXP', 'totalXP',
      'coins', 'hintTokens', 'lives', 'streakShields',
      'hasTakenDiagnostic', 'iarAssessmentState', 'topicScores',
      'riskFlags', 'riskClassifications', 'overallRisk',
      'currentCurriculumVersionSetId', 'grade12TransitionGate',
      'remediationState', 'remediationStatusCounts',
      'ownedAvatarItems',
    ];
    for (const field of requiredFields) {
      expect(defaults).toHaveProperty(field);
    }
  });

  it('student defaults have correct initial values for key fields', () => {
    const defaults = getRoleDefaults('student');
    expect(defaults.level).toBe(1);
    expect(defaults.currentXP).toBe(0);
    expect(defaults.totalXP).toBe(0);
    expect(defaults.coins).toBe(0);
    expect(defaults.hintTokens).toBe(3);
    expect(defaults.lives).toBe(5);
    expect(defaults.streakShields).toBe(1);
    expect(defaults.hasTakenDiagnostic).toBe(false);
    expect(defaults.iarAssessmentState).toBe('not_started');
    expect(defaults.remediationState).toBe('none');
  });

  // ── Teacher defaults ─────────────────────────────────────────
  it('teacher defaults include teacherId and students array', () => {
    const defaults = getRoleDefaults('teacher');
    expect(defaults).toHaveProperty('teacherId');
    expect(defaults).toHaveProperty('students');
    expect(defaults).toHaveProperty('department');
    expect(defaults).toHaveProperty('subject');
    expect(defaults).toHaveProperty('yearsOfExperience');
    expect(defaults).toHaveProperty('qualification');
  });

  it('teacher defaults have null teacherId and empty students array', () => {
    const defaults = getRoleDefaults('teacher');
    expect(defaults.teacherId).toBeNull();
    expect(defaults.students).toEqual([]);
    expect(defaults.yearsOfExperience).toBe(0);
  });

  // ── Admin defaults ───────────────────────────────────────────
  it('admin defaults include adminId', () => {
    const defaults = getRoleDefaults('admin');
    expect(defaults).toHaveProperty('adminId');
    expect(defaults).toHaveProperty('position');
    expect(defaults).toHaveProperty('department');
  });

  it('admin defaults have null adminId and position', () => {
    const defaults = getRoleDefaults('admin');
    expect(defaults.adminId).toBeNull();
    expect(defaults.position).toBeNull();
    expect(defaults.department).toBeNull();
  });

  // ── Role differentiation ─────────────────────────────────────
  it('student does NOT have teacherId or adminId', () => {
    const defaults = getRoleDefaults('student');
    expect(defaults).not.toHaveProperty('teacherId');
    expect(defaults).not.toHaveProperty('adminId');
  });

  it('teacher does NOT have level/currentXP or adminId', () => {
    const defaults = getRoleDefaults('teacher');
    expect(defaults).not.toHaveProperty('level');
    expect(defaults).not.toHaveProperty('currentXP');
    expect(defaults).not.toHaveProperty('adminId');
  });

  it('admin does NOT have level/currentXP or teacherId', () => {
    const defaults = getRoleDefaults('admin');
    expect(defaults).not.toHaveProperty('level');
    expect(defaults).not.toHaveProperty('currentXP');
    expect(defaults).not.toHaveProperty('teacherId');
  });
});
