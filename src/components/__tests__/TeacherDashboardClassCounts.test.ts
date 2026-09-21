import { describe, expect, it } from 'vitest';
import {
  countResolvedStudentsForClass,
  mergeClassViews,
} from '../TeacherDashboard';

const classView = {
  id: 'class-a',
  name: 'Grade 11 - STEM A',
  classSectionId: 'grade_11_stem_a',
  schedule: 'Mon-Fri',
  studentCount: 0,
  avgScore: 0,
  atRiskCount: 0,
  riskLevel: 'low',
} satisfies Parameters<typeof mergeClassViews>[0][number];

const buildResolvedStudent = () => ({
  classroomId: 'grade_11_stem_a',
  classSectionId: 'grade_11_stem_a',
  className: 'Grade 11 - STEM A',
} satisfies Parameters<typeof countResolvedStudentsForClass>[1][number]);

describe('TeacherDashboard class counts', () => {
  it('counts all resolved members when the classroom count is stale', () => {
    const resolvedStudents = Array.from({ length: 12 }, () => buildResolvedStudent());

    expect(countResolvedStudentsForClass(classView, resolvedStudents)).toBe(12);
  });

  it('decrements when one resolved member is removed', () => {
    const resolvedStudents = Array.from({ length: 12 }, () => buildResolvedStudent());

    expect(countResolvedStudentsForClass(classView, resolvedStudents.slice(0, 11))).toBe(11);
  });

  it('uses the latest imported count instead of ratcheting upward', () => {
    const staleMergedClass = { ...classView, studentCount: 12 };
    const latestClass = { ...classView, studentCount: 11 };

    expect(mergeClassViews([staleMergedClass], [latestClass])[0]?.studentCount).toBe(11);
  });
});
