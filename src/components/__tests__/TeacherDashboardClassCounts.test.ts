// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  countResolvedStudentsForClass,
  deriveResolvedClassCounts,
  mergeClassViews,
  splitEnrolledStudents,
  UnassignedStudentsNotice,
} from '../TeacherDashboard';
import { ClassesOverviewMenu } from '../ClassesOverviewMenu';

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
  id: 'student-a',
  name: 'Student A',
  lrn: 'lrn-a',
  classroomId: 'grade_11_stem_a',
  classSectionId: 'grade_11_stem_a',
  className: 'Grade 11 - STEM A',
} satisfies Parameters<typeof deriveResolvedClassCounts>[1][number]);

describe('TeacherDashboard class counts', () => {
  it('counts all resolved members when the classroom count is stale', () => {
    const resolvedStudents = Array.from({ length: 12 }, () => buildResolvedStudent());

    expect(countResolvedStudentsForClass(classView, resolvedStudents)).toBe(12);
  });

  it('decrements when one resolved member is removed', () => {
    const resolvedStudents = Array.from({ length: 12 }, () => buildResolvedStudent());

    expect(countResolvedStudentsForClass(classView, resolvedStudents.slice(0, 11))).toBe(11);
  });

  it('moves a student to the reassigned section without counting them in the old class', () => {
    const reassignedStudent = {
      ...buildResolvedStudent(),
      classroomId: 'grade_11_stem_b',
      classSectionId: 'grade_11_stem_b',
      className: 'Grade 11 - STEM B',
    };
    const reassignedClass = { ...classView, id: 'class-b', name: 'Grade 11 - STEM B', classSectionId: 'grade_11_stem_b' };

    expect(countResolvedStudentsForClass(classView, [reassignedStudent])).toBe(0);
    expect(countResolvedStudentsForClass(reassignedClass, [reassignedStudent])).toBe(1);
  });

  it('counts overlapping class matches per class but deduplicates the teacher-wide total', () => {
    const overlappingClass = { ...classView, id: 'grade_11_stem_a', classSectionId: undefined };
    const counts = deriveResolvedClassCounts([classView, overlappingClass], [buildResolvedStudent()]);

    expect(counts.classes.map((classItem) => classItem.studentCount)).toEqual([1, 1]);
    expect(counts.totalStudents).toBe(1);
  });

  it('deduplicates repeated student identities in the teacher-wide total', () => {
    const repeatedIdentity = { ...buildResolvedStudent(), id: 'another-row' };

    expect(deriveResolvedClassCounts([classView], [buildResolvedStudent(), repeatedIdentity]).totalStudents).toBe(1);
  });

  it('renders the supplied resolved class count and deduplicated total in ClassesOverviewMenu', () => {
    render(React.createElement(ClassesOverviewMenu, {
      classes: [{ ...classView, studentCount: 1 }],
      totalStudentCount: 2,
      onSelectClass: () => {},
    }));

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('counts no enrolled students when the roster is the all-students fallback pool', () => {
    const pool = [buildResolvedStudent(), { ...buildResolvedStudent(), id: 'student-b', lrn: 'lrn-b', name: 'Student B' }];
    const split = splitEnrolledStudents(pool, [], true);

    expect(split.enrolled).toHaveLength(0);
    expect(split.unassigned).toHaveLength(2);
    expect(deriveResolvedClassCounts([], split.enrolled).totalStudents).toBe(0);
  });

  it('keeps pool students who are already in one of the teacher classes as enrolled', () => {
    const outsider = { ...buildResolvedStudent(), id: 'student-b', lrn: 'lrn-b', classroomId: 'other', classSectionId: 'other', className: 'Other' };
    const split = splitEnrolledStudents([buildResolvedStudent(), outsider], [classView], true);

    expect(split.enrolled).toHaveLength(1);
    expect(split.unassigned).toEqual([outsider]);
  });

  it('leaves a real roster unchanged', () => {
    const roster = [buildResolvedStudent()];
    const split = splitEnrolledStudents(roster, [], false);

    expect(split.enrolled).toEqual(roster);
    expect(split.unassigned).toHaveLength(0);
  });

  it('labels unassigned students with helper text', () => {
    render(React.createElement(UnassignedStudentsNotice, { count: 30 }));

    expect(screen.getByText('Unassigned students')).toBeInTheDocument();
    expect(screen.getByText(/30 students not in any class/)).toBeInTheDocument();
    expect(screen.getByText(/aren't in any of your classes yet/)).toBeInTheDocument();
  });

  it('uses the latest imported count instead of ratcheting upward', () => {
    const staleMergedClass = { ...classView, studentCount: 12 };
    const latestClass = { ...classView, studentCount: 11 };

    expect(mergeClassViews([staleMergedClass], [latestClass])[0]?.studentCount).toBe(11);
  });
});
