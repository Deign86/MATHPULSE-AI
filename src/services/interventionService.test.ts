import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import { assignStepAsModule, type LearningStep } from './interventionService';

describe('single intervention step assignment', () => {
  const step: LearningStep = {
    step_number: 4, type: 'assessment', title: 'Mastery Check', description: 'Solve equations',
    duration_minutes: 12, num_items: 5, topic: 'Linear equations', competency_tag: 'GM-11',
    difficulty: 'hard', youtube_query: 'linear equations lesson', is_completed: false, completion_score: null,
  };

  beforeEach(() => {
    vi.spyOn(firestore, 'collection').mockImplementation(() => {
      // SAFETY: an opaque collection handle is only forwarded to the stubbed write boundary.
      return { path: 'modules' } as firestore.CollectionReference;
    });
    vi.spyOn(firestore, 'addDoc').mockImplementation(async () => {
      // SAFETY: the service reads only the created reference id; Firebase IO is stubbed at the write boundary.
      return { id: 'assigned-step' } as firestore.DocumentReference;
    });
  });

  it('stores metadata needed to generate the assigned assessment in the student step guide', async () => {
    expect(await assignStepAsModule(step, 'student-1', 'teacher-1')).toBe('assigned-step');
    expect(firestore.addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      assignedTo: 'student-1', teacherId: 'teacher-1', practice: [],
      sections: [{ title: 'Mastery Check', content: 'Solve equations', stepType: 'assessment', stepNumber: 4,
        topic: 'Linear equations', durationMinutes: 12, numItems: 5, difficulty: 'hard', competencyTag: 'GM-11',
        youtubeQuery: 'linear equations lesson', isCompleted: false }],
    }));
  });
});
