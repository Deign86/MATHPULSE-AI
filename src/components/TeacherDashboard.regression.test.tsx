import { describe, expect, it } from 'vitest';
import { countResolvedStudentsForClass, deriveResolvedClassCounts, hasJoinFailure, hasTopicChartData, isHighRiskLevel, normalizeRiskStatusOrNull } from './TeacherDashboard';
import { classifyWRI } from '../utils/riskEngine';

describe('teacher dashboard roster and risk regressions', () => {
  it('counts distinct roster identities against a section id', () => {
    const counts = deriveResolvedClassCounts(
      // SAFETY: only id, section id, and name are read by the count resolver.
      [{ id: 'doc-a', classSectionId: 'g11-stem-a', name: 'Grade 11 STEM A', studentCount: 8 } as never],
      [
        // SAFETY: each roster stub contains every field used for matching and unique identity.
        { id: 'acct-1', lrn: '1', name: 'One', classroomId: 'g11-stem-a', className: 'Grade 11 STEM A' } as never,
        // SAFETY: duplicate identity intentionally uses the same LRN and matching fields.
        { id: 'import-1', lrn: '1', name: 'One copy', classroomId: 'g11-stem-a', className: 'Grade 11 STEM A' } as never,
        // SAFETY: unique roster entry provides all count/identity fields.
        { id: 'acct-2', lrn: '2', name: 'Two', classroomId: 'other', className: 'Other' } as never,
      ],
    );
    expect(counts.classes[0].studentCount).toBe(2);
    expect(counts.totalStudents).toBe(2);
  });

  it('counts an empty class as zero and maps the four WRI bands', () => {
    expect(countResolvedStudentsForClass({ id: 'class-1', classSectionId: 'section-a', name: 'A' }, [])).toBe(0);
    expect([88, 80, 75, 68].map(classifyWRI)).toEqual(['safe', 'watch', 'intervene', 'critical']);
  });
});

describe('teacher dashboard risk normalization (TCH-047/048/062)', () => {
  it('keeps known risk statuses and nulls unknown values', () => {
    expect(normalizeRiskStatusOrNull('intervene')).toBe('intervene');
    expect(normalizeRiskStatusOrNull('Watch')).toBe('watch');
    expect(normalizeRiskStatusOrNull(' safe ')).toBe('safe');
    expect(normalizeRiskStatusOrNull('PENDING_ASSESSMENT')).toBeNull();
    expect(normalizeRiskStatusOrNull('')).toBeNull();
    expect(normalizeRiskStatusOrNull(null)).toBeNull();
    expect(normalizeRiskStatusOrNull(undefined)).toBeNull();
  });

  it('detects high risk in any casing', () => {
    expect(isHighRiskLevel('high')).toBe(true);
    expect(isHighRiskLevel('High')).toBe(true);
    expect(isHighRiskLevel('HIGH')).toBe(true);
    expect(isHighRiskLevel('medium')).toBe(false);
    expect(isHighRiskLevel('low')).toBe(false);
    expect(isHighRiskLevel(null)).toBe(false);
    expect(isHighRiskLevel(undefined)).toBe(false);
  });

  it('flags total backend roster join failures only', () => {
    expect(hasJoinFailure(5, 0, 10)).toBe(true);
    expect(hasJoinFailure(5, 3, 10)).toBe(false);
    expect(hasJoinFailure(0, 0, 10)).toBe(false);
    expect(hasJoinFailure(5, 0, 0)).toBe(false);
  });

  it('shows the topic chart empty state only for empty classes without backend data (TCH-060)', () => {
    expect(hasTopicChartData(0, 0)).toBe(false);
    expect(hasTopicChartData(0, 3)).toBe(true);
    expect(hasTopicChartData(5, 0)).toBe(true);
    expect(hasTopicChartData(5, 2)).toBe(true);
  });
});
