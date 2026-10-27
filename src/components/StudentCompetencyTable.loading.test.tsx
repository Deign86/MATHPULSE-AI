// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import * as AuthContext from '../contexts/AuthContext';
import * as studentService from '../services/studentService';
import * as progressService from '../services/progressService';
import { apiService } from '../services/apiService';
import StudentCompetencyTable from './StudentCompetencyTable';

type TeacherRoster = Awaited<ReturnType<typeof studentService.getStudentsByTeacher>>;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const rosterStudent = () => ({
  id: 'stu-1',
  name: 'Ana Cruz',
  riskLevel: 'low' as const,
  engagementScore: 70,
  avgQuizScore: 80,
  weakestTopic: 'Functions',
  classSectionId: 'g11-a',
});

describe('StudentCompetencyTable loading (issue #319)', () => {
  it('starts the roster and imported-overview reads together and ignores an equal new roster array', async () => {
    // SAFETY: the table reads only currentUser.uid and userProfile from the auth context.
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ currentUser: { uid: 'teacher-1' }, userProfile: null } as ReturnType<typeof AuthContext.useAuth>);
    let resolveRoster = (_students: TeacherRoster) => {};
    const rosterSpy = vi.spyOn(studentService, 'getStudentsByTeacher').mockReturnValue(
      new Promise<TeacherRoster>((resolve) => { resolveRoster = resolve; }),
    );
    // SAFETY: the table reads only students and warnings from the overview response.
    const overviewSpy = vi.spyOn(apiService, 'getImportedClassOverview').mockResolvedValue({ students: [], warnings: [] } as never);
    // SAFETY: the table reads only topics and warnings from the topic map response.
    vi.spyOn(apiService, 'getCourseMaterialTopics').mockResolvedValue({ topics: [], warnings: [] } as never);
    vi.spyOn(progressService, 'getUserProgress').mockResolvedValue(null);

    const view = render(<StudentCompetencyTable classSectionId="g11-a" fallbackStudents={[rosterStudent()]} />);
    expect(rosterSpy).toHaveBeenCalledTimes(1);
    expect(overviewSpy).toHaveBeenCalledTimes(1);

    await act(async () => { resolveRoster([]); });
    expect((await screen.findAllByText('Ana Cruz')).length).toBeGreaterThan(0);

    view.rerender(<StudentCompetencyTable classSectionId="g11-a" fallbackStudents={[rosterStudent()]} />);
    await act(async () => {});
    expect(rosterSpy).toHaveBeenCalledTimes(1);
    expect(overviewSpy).toHaveBeenCalledTimes(1);
  });
});
