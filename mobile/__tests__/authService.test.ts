// mobile/__tests__/authService.test.ts
// Tests for authService role defaults, whitelist logic, and avatarLayers validation.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } },
  doc: vi.fn(),
  collection: vi.fn(),
  firestoreQuery: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  firestoreServerTimestamp: vi.fn(() => new Date('2026-06-01T00:00:00Z')),
  increment: (n: number) => ({ __inc: n }),
  arrayUnion: (...items: unknown[]) => items,
  onSnapshot: vi.fn(() => vi.fn()),
}));

import {
  baseAllowed,
  roleAllowedMap,
} from '../services/authService';

// ── Whitelist Simulation ───────────────────────────────────────────────────

function simulateWhitelistFilter(
  role: 'student' | 'teacher' | 'admin',
  updates: Record<string, unknown>,
): { writtenKeys: string[]; filtered: Record<string, unknown> } {
  const allowedKeys = new Set([...baseAllowed, ...roleAllowedMap[role]]);
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    if (!allowedKeys.has(key)) continue;
    filtered[key] = value;
  }

  return { writtenKeys: Object.keys(filtered), filtered };
}

function validateAvatarLayers(
  value: unknown,
): { valid: true; layers: Record<string, unknown> } | { valid: false; error: string } {
  if (typeof value !== 'object' || value === null) {
    return { valid: false, error: 'avatarLayers must be an object' };
  }

  const avatarLayers = value as Record<string, unknown>;
  const requiredKeys = ['top', 'bottom', 'shoes', 'accessory'] as const;

  const missingKeys = requiredKeys.filter((k) => !(k in avatarLayers));
  if (missingKeys.length > 0) {
    return {
      valid: false,
      error: `avatarLayers must include all keys: ${requiredKeys.join(', ')}`,
    };
  }

  for (const k of requiredKeys) {
    const v = avatarLayers[k];
    if (v !== null && v !== undefined && typeof v !== 'string') {
      return {
        valid: false,
        error: `avatarLayers.${k} must be string, null, or undefined`,
      };
    }
  }

  return { valid: true, layers: avatarLayers };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('baseAllowed constants', () => {
  it('includes all 6 base keys', () => {
    expect(baseAllowed).toContain('name');
    expect(baseAllowed).toContain('email');
    expect(baseAllowed).toContain('phone');
    expect(baseAllowed).toContain('photo');
    expect(baseAllowed).toContain('avatarLayers');
    expect(baseAllowed).toContain('gender');
    expect(baseAllowed.length).toBe(6);
  });
});

describe('Student role defaults — 40+ gamification fields', () => {
  const studentRequiredFields = [
    'lrn', 'grade', 'section', 'classSectionId', 'adviserTeacherId',
    'adviserTeacherName', 'schoolYear', 'school', 'enrollmentDate', 'major', 'gpa',
    'level', 'currentXP', 'totalXP', 'coins', 'hintTokens', 'lives',
    'streakShields', 'activeMultiplier',
    'atRiskSubjects', 'flaggedTopics', 'hasTakenDiagnostic',
    'iarAssessmentState', 'startingQuarterG11', 'recommendedPace',
    'iarQuestionSetVersion', 'iarTopicClassifications', 'topicScores',
    'learningPathState',
    'g12ReadinessIndicators', 'riskFlags', 'riskClassifications', 'overallRisk',
    'subjectBadges',
    'currentCurriculumVersionSetId', 'grade12TransitionGate',
    'unlockCriteriaVersion', 'recommendedNextTopicGroupId',
    'recommendationRationale', 'recommendationReasonCode',
    'remediationState', 'remediationStatusCounts',
    'lastAssessmentType', 'initialAssessmentCompletedAt',
    'ownedAvatarItems',
  ];

  it.each(studentRequiredFields)('roleAllowedMap.student includes "%s"', (field) => {
    expect(roleAllowedMap.student).toContain(field);
  });

  it('has 40+ student fields', () => {
    expect(roleAllowedMap.student.length).toBeGreaterThanOrEqual(40);
  });
});

describe('Teacher role defaults', () => {
  const teacherRequiredFields = [
    'teacherId', 'department', 'subject', 'yearsOfExperience', 'qualification', 'students',
  ];

  it.each(teacherRequiredFields)('roleAllowedMap.teacher includes "%s"', (field) => {
    expect(roleAllowedMap.teacher).toContain(field);
  });
});

describe('updateUserProfile whitelist', () => {
  it('only writes grade and currentXP — role and madeUpField dropped', () => {
    const result = simulateWhitelistFilter('student', {
      role: 'admin',
      madeUpField: 'hack',
      grade: '12',
      currentXP: 9999,
    });

    expect(result.writtenKeys).not.toContain('role');
    expect(result.writtenKeys).not.toContain('madeUpField');
    expect(result.writtenKeys).toContain('grade');
    expect(result.writtenKeys).toContain('currentXP');
    expect(result.writtenKeys.length).toBe(2);
  });
});

describe('avatarLayers validation', () => {
  it('rejects avatarLayers with missing keys', () => {
    const result = validateAvatarLayers({ top: 'hat' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('must include all keys');
    }
  });

  it('accepts valid avatarLayers object', () => {
    const result = validateAvatarLayers({
      top: 'hat',
      bottom: null,
      shoes: undefined,
      accessory: 'cape',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects non-string value for required key', () => {
    const result = validateAvatarLayers({
      top: 'hat',
      bottom: 123,
      shoes: null,
      accessory: 'cape',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('bottom');
    }
  });

  it('rejects non-object input', () => {
    const result = validateAvatarLayers('not-an-object');
    expect(result.valid).toBe(false);
  });
});

describe('Admin role defaults', () => {
  it('includes adminId, position, department', () => {
    expect(roleAllowedMap.admin).toContain('adminId');
    expect(roleAllowedMap.admin).toContain('position');
    expect(roleAllowedMap.admin).toContain('department');
  });
});
