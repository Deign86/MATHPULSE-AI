// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { DocumentSnapshot } from 'firebase/firestore';
import * as lessonContent from '../../hooks/useLessonContent';
import type { UseLessonContentResult } from '../../hooks/useLessonContent';
import * as lessonQuizService from '../../services/lessonQuizService';
import * as progressService from '../../services/progressService';
import * as trackingService from '../../services/trackingService';
import type { AuthContextType } from '../../contexts/AuthContext';
import AuthContext from '../../contexts/AuthContext';
import type { Module } from '../../data/subjects';
import type { ModuleProgress, User, UserProgress } from '../../types/models';
import * as tryItYourselfModule from '../TryItYourselfEngine';
import ModuleDetailView from '../ModuleDetailView';

const USER_ID = 'student-fallback-1';
const MODULE_ID = 'gm-q9-unresolvable';
const LESSON_ID = `${MODULE_ID}-l1`;
const FALLBACK_SUBJECT_ID = 'gen-math';

const fallbackModule: Module = {
  id: MODULE_ID,
  title: 'Fallback Module',
  description: 'A runtime module whose subject metadata is missing.',
  lessons: [
    {
      id: LESSON_ID,
      title: 'Fallback Lesson',
      duration: '22 min',
      completed: false,
      locked: false,
    },
  ],
  quizzes: [],
  progress: 0,
  color: 'bg-white',
  iconColor: 'text-slate-700',
  accentColor: 'bg-slate-700',
};

const lessonContentResult: UseLessonContentResult = {
  sections: [
    {
      type: 'try_it_yourself',
      title: 'Practice',
      content: 'Practice the lesson.',
    },
  ],
  isLoading: false,
  error: null,
  retry: vi.fn(),
  sources: [],
  retrievalBand: 'low',
  retrievalConfidence: 0,
  needsReview: false,
  isOffline: false,
};

const studentProfile: User = {
  uid: USER_ID,
  email: 'student@example.com',
  name: 'Fallback Student',
  role: 'student',
  createdAt: new Date('2026-09-21T00:00:00.000Z'),
  updatedAt: new Date('2026-09-21T00:00:00.000Z'),
};

const authContext: AuthContextType = {
  currentUser: null,
  userProfile: studentProfile,
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => undefined,
};

let progressListener: (progress: UserProgress | null) => void = () => undefined;

function buildModuleProgress(lessonsCompleted: string[]): ModuleProgress {
  return {
    moduleId: MODULE_ID,
    subjectId: FALLBACK_SUBJECT_ID,
    progress: lessonsCompleted.length > 0 ? 100 : 0,
    lessonsCompleted,
    quizzesCompleted: [],
    startedAt: new Date('2026-09-21T00:00:00.000Z'),
    lastAccessedAt: new Date('2026-09-21T00:00:00.000Z'),
  };
}

function buildProgress(lessonsCompleted: string[]): UserProgress {
  const moduleProgress = buildModuleProgress(lessonsCompleted);
  return {
    userId: USER_ID,
    subjects: {
      [FALLBACK_SUBJECT_ID]: {
        subjectId: FALLBACK_SUBJECT_ID,
        progress: moduleProgress.progress,
        completedModules: lessonsCompleted.length > 0 ? 1 : 0,
        totalModules: 1,
        modulesProgress: { [MODULE_ID]: moduleProgress },
      },
    },
    lessons: {},
    quizAttempts: [],
    totalLessonsCompleted: lessonsCompleted.length,
    totalQuizzesCompleted: 0,
    averageScore: 0,
    updatedAt: new Date('2026-09-21T00:00:00.000Z'),
  };
}

function missingFirestoreSnapshot(): DocumentSnapshot {
  // SAFETY: the component only calls exists() and data() for this diagnostic lookup.
  return {
    exists: () => false,
    data: () => undefined,
  } as DocumentSnapshot;
}

function renderFallbackModule(onEarnXP: (xp: number, message: string) => void, onBack: () => void) {
  return render(
    <AuthContext.Provider value={authContext}>
      <ModuleDetailView module={fallbackModule} onBack={onBack} onEarnXP={onEarnXP} />
    </AuthContext.Provider>,
  );
}

async function finishLesson(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /Fallback Lesson/i }));
  await screen.findByRole('button', { name: /Start Practice Quiz/i });
  fireEvent.click(screen.getByRole('button', { name: /Start Practice Quiz/i }));
  await screen.findByRole('button', { name: 'Finish practice' });
  fireEvent.click(screen.getByRole('button', { name: 'Finish practice' }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete lesson' }));
  await screen.findByText('Lesson Complete!');
  fireEvent.click(screen.getByRole('button', { name: 'Back to Modules' }));
}

describe('G1b #171 lesson completion subject fallback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    vi.clearAllMocks();
    progressListener = () => undefined;

    vi.spyOn(firestore, 'getDoc').mockResolvedValue(missingFirestoreSnapshot());
    vi.spyOn(firestore, 'setDoc').mockResolvedValue(undefined);
    vi.spyOn(lessonContent, 'useLessonContent').mockReturnValue(lessonContentResult);
    vi.spyOn(lessonQuizService, 'generateLessonQuiz').mockResolvedValue([]);
    vi.spyOn(trackingService, 'logLessonView').mockResolvedValue(undefined);
    vi.spyOn(tryItYourselfModule, 'default').mockImplementation(({ onComplete }) => (
      <button type="button" onClick={() => onComplete(100)}>
        Finish practice
      </button>
    ));
    vi.spyOn(progressService, 'subscribeToUserProgress').mockImplementation((_userId, onChange) => {
      progressListener = onChange;
      onChange(buildProgress([]));
      return () => undefined;
    });
    vi.spyOn(progressService, 'recalculateAndUpdateModuleProgress').mockResolvedValue(100);
  });

  it('persists fallback subject progress and updates the journey after readback', async () => {
    const onEarnXP = vi.fn();
    const onBack = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const completeLessonSpy = vi.spyOn(progressService, 'completeLesson').mockImplementation(
      async (_userId, subjectId, moduleId, lessonId) => {
        expect(subjectId).toBe(FALLBACK_SUBJECT_ID);
        expect(moduleId).toBe(MODULE_ID);
        expect(lessonId).toBe(LESSON_ID);
        progressListener(buildProgress([LESSON_ID]));
      },
    );

    renderFallbackModule(onEarnXP, onBack);
    await finishLesson();

    await waitFor(() => {
      expect(completeLessonSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Lessons 1/1')).toBeInTheDocument();
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('fallback subject id'),
      expect.objectContaining({ moduleId: MODULE_ID, subjectId: FALLBACK_SUBJECT_ID }),
    );
    expect(onEarnXP).toHaveBeenCalledWith(10, 'Completed "Fallback Lesson"');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('logs persistence failure while XP and navigation still proceed', async () => {
    const onEarnXP = vi.fn();
    const onBack = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const completeLessonSpy = vi.spyOn(progressService, 'completeLesson').mockRejectedValue(
      new Error('forced persistence failure'),
    );

    renderFallbackModule(onEarnXP, onBack);
    await finishLesson();

    await waitFor(() => {
      expect(completeLessonSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        '[LessonComplete] Failed to persist progress:',
        expect.any(Error),
      );
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(onEarnXP).toHaveBeenCalledWith(10, 'Completed "Fallback Lesson"');
    expect(screen.getByText('Study Journey')).toBeInTheDocument();
    expect(screen.queryByText('Lesson Complete!')).not.toBeInTheDocument();
  });
});
