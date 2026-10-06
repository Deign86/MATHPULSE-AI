import { describe, expect, it } from 'vitest';
import { buildLessonCompletionActivity } from './lessonCompletionActivity';

describe('buildLessonCompletionActivity', () => {
  it('creates a teacher-feed activity with the student, classroom, and completed lesson', () => {
    expect(buildLessonCompletionActivity('Ari Cruz', '12345', 'section-a', 'lesson-2')).toEqual({
      lrn: '12345',
      studentName: 'Ari Cruz',
      action: 'completed a lesson',
      topic: 'lesson-2',
      classroomId: 'section-a',
      type: 'success',
    });
  });
});
