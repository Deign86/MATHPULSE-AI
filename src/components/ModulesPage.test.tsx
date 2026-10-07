/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authNs from '../contexts/AuthContext';
import type { AuthContextType } from '../contexts/AuthContext';
import { type StudentProfile } from '../types/models';
import * as notificationsNs from '@/features/notifications';
import * as firestore from 'firebase/firestore';
import * as ModuleFolderCardNs from './ModuleFolderCard';
import * as ModulesMascotNs from './ModulesMascot';
import * as DailyCheckInModalNs from './DailyCheckInModal';
import * as PracticeCenterNs from './PracticeCenter';
import * as QuizExperienceNs from './QuizExperience';
import * as quizService from '../services/quizService';
import * as progressService from '../services/progressService';

// Firestore IO stubs: firebase deps are inlined in vitest.config, so these
// namespaces are configurable. No real network/IO is touched.
vi.spyOn(firestore, 'collection').mockImplementation(vi.fn());
vi.spyOn(firestore, 'query').mockImplementation(vi.fn());
vi.spyOn(firestore, 'where').mockImplementation(vi.fn());
// SAFETY: ModulesPage only consumes the unsubscribe function returned by onSnapshot.
vi.spyOn(firestore, 'onSnapshot').mockImplementation((() => vi.fn()) as typeof firestore.onSnapshot);

const testUserProfile: StudentProfile = {
  uid: 'user-1',
  lrn: 'school-lrn-1',
  email: 'user-1@example.test',
  name: 'Test Student',
  role: 'student',
  grade: '11',
  school: 'Test SHS',
  enrollmentDate: '2026-01-01',
  major: 'STEM',
  gpa: '90',
  level: 1,
  currentXP: 0,
  totalXP: 0,
  atRiskSubjects: [],
  hasTakenDiagnostic: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

vi.spyOn(authNs, 'useAuth').mockReturnValue({
  currentUser: null,
  userProfile: testUserProfile,
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => {},
});

vi.spyOn(notificationsNs, 'notify').mockImplementation(() => Promise.resolve());

// Child component seams stay rendered-but-inert so page-level behavior is isolated.
vi.spyOn(ModuleFolderCardNs, 'default').mockImplementation(
  () => React.createElement('div', null, 'ModuleCard'),
);
vi.spyOn(ModulesMascotNs, 'default').mockImplementation(
  () => React.createElement('div', null, 'ModulesMascot'),
);
vi.spyOn(DailyCheckInModalNs, 'default').mockImplementation(() => null);
vi.spyOn(PracticeCenterNs, 'default').mockImplementation(
  () => React.createElement('div', null, 'Practice Center Stub'),
);

import ModulesPage from './ModulesPage';

afterEach(cleanup);

const renderModulesPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ModulesPage />
    </QueryClientProvider>,
  );

describe('ModulesPage', () => {
  it('renders Practice tab and shows Practice Center when selected', async () => {
    renderModulesPage();

    const practiceTab = screen.getByRole('button', { name: /practice/i });
    fireEvent.click(practiceTab);

    expect(await screen.findByText(/practice center stub/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('shows teacher assignments above Practice topics when loaded at the assigned section URL', async () => {
    vi.spyOn(quizService, 'fetchPendingQuizzesForStudent').mockReset().mockResolvedValue([
      {
        generatedQuizId: 'quiz-1',
        id: 'quiz-1',
        title: 'Functions Review',
        subject: 'General Mathematics',
        difficulty: 'Medium',
        questions: 5,
        duration: '10 minutes',
        xpReward: 20,
        type: 'practice',
        completed: false,
        locked: false,
        source: 'ai_generated',
        loadedQuestions: [],
      },
    ]);
    window.history.replaceState({}, '', '/modules?section=assigned-quizzes');

    renderModulesPage();

    expect(await screen.findAllByRole('heading', { name: /assigned by your teacher/i })).not.toHaveLength(0);
    expect(await screen.findByText('Functions Review')).toBeInTheDocument();
    expect(screen.getAllByText(/practice center stub/i)).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^assigned$/i })).not.toBeInTheDocument();
    expect(window.location.search).toContain('section=assigned-quizzes');
  });

  it('waits for assigned quizzes to load and auto-opens the quiz from its deep link', async () => {
    vi.spyOn(quizService, 'fetchPendingQuizzesForStudent').mockReset().mockResolvedValue([
      {
        generatedQuizId: 'quiz-1',
        id: 'quiz-1',
        title: 'Functions Review',
        subject: 'General Mathematics',
        difficulty: 'Medium',
        questions: 1,
        duration: '10 minutes',
        xpReward: 20,
        type: 'practice',
        completed: false,
        locked: false,
        source: 'ai_generated',
        loadedQuestions: [],
      },
    ]);
    window.history.replaceState({}, '', '/modules?section=assigned-quizzes&quizId=quiz-1');

    renderModulesPage();

    expect(quizService.fetchPendingQuizzesForStudent).toHaveBeenCalledOnce();
    expect(quizService.fetchPendingQuizzesForStudent).toHaveBeenCalledWith('user-1');
    expect(await screen.findByText('Try It Yourself!')).toBeInTheDocument();
  });

  it('refreshes assignments when an assigned quiz is clicked while Practice is already open', async () => {
    let resolveRefresh: ((quizzes: quizService.PlayableQuiz[]) => void) | undefined;
    const fetchPendingQuizzes = vi.spyOn(quizService, 'fetchPendingQuizzesForStudent')
      .mockReset()
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve; }));
    window.history.replaceState({}, '', '/modules');

    renderModulesPage();
    fireEvent.click(screen.getAllByRole('button', { name: /^practice$/i })[0]);
    await screen.findByText(/you have no pending assigned quizzes/i);
    expect(fetchPendingQuizzes).toHaveBeenCalledTimes(1);

    fireEvent(window, new CustomEvent('mathpulse:navigate', {
      detail: { tab: 'Modules', section: 'assigned-quizzes', quizId: 'new-quiz' },
    }));
    await vi.waitFor(() => expect(fetchPendingQuizzes).toHaveBeenCalledTimes(2));

    resolveRefresh?.([{
      generatedQuizId: 'new-quiz',
      id: 'new-quiz',
      title: 'Newly Assigned Quiz',
      subject: 'General Mathematics',
      difficulty: 'Medium',
      questions: 1,
      duration: '10 minutes',
      xpReward: 20,
      type: 'practice',
      completed: false,
      locked: false,
      source: 'ai_generated',
      loadedQuestions: [],
    }]);

    expect(await screen.findByText('Try It Yourself!')).toBeInTheDocument();
  });

  it('preserves the requested quiz ID after fetch failure and retries the fetch', async () => {
    vi.spyOn(quizService, 'fetchPendingQuizzesForStudent')
      .mockReset()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce([{
        generatedQuizId: 'quiz-1',
        id: 'quiz-1',
        title: 'Functions Review',
        subject: 'General Mathematics',
        difficulty: 'Medium',
        questions: 1,
        duration: '10 minutes',
        xpReward: 20,
        type: 'practice',
        completed: false,
        locked: false,
        source: 'ai_generated',
        loadedQuestions: [],
      }]);
    window.history.replaceState({}, '', '/modules?section=assigned-quizzes&quizId=quiz-1');

    renderModulesPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load assigned quizzes.');
    expect(window.location.search).toContain('quizId=quiz-1');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Try It Yourself!')).toBeInTheDocument();
  });

  it('does not duplicate quiz persistence from the parent completion callback', async () => {
    vi.spyOn(quizService, 'fetchPendingQuizzesForStudent').mockReset().mockResolvedValue([{
      generatedQuizId: 'quiz-1',
      id: 'quiz-1',
      title: 'Functions Review',
      subject: 'General Mathematics',
      difficulty: 'Medium',
      questions: 1,
      duration: '10 minutes',
      xpReward: 20,
      type: 'practice',
      completed: false,
      locked: false,
      source: 'ai_generated',
      loadedQuestions: [],
    }]);
    const recordPracticeQuiz = vi.spyOn(progressService, 'recordPracticeQuiz').mockResolvedValue();
    vi.spyOn(QuizExperienceNs, 'default').mockImplementation(({ onComplete }) => (
      <button type="button" onClick={() => onComplete?.(80, 20)}>Complete mocked quiz</button>
    ));
    window.history.replaceState({}, '', '/modules?section=assigned-quizzes&quizId=quiz-1');

    renderModulesPage();
    fireEvent.click(await screen.findByRole('button', { name: /complete mocked quiz/i }));

    expect(recordPracticeQuiz).not.toHaveBeenCalled();
  });

  it('scopes teacher-uploaded modules to the signed-in student', () => {
    renderModulesPage();

    fireEvent.click(screen.getAllByRole('button', { name: /teacher uploaded/i })[0]);

    expect(firestore.where).toHaveBeenCalledWith('assignedTo', '==', 'user-1');
  });
});
