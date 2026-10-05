import { describe, expect, it } from 'vitest';
import { buildQuizRequestBasics } from './quizRequest';

describe('buildQuizRequestBasics', () => {
  it('keeps the selected topic, question count, and editable title together for preview and draft', () => {
    expect(buildQuizRequestBasics(['Rational Functions'], 'Grade 11', 5, 'Function Review'))
      .toEqual({ topics: ['Rational Functions'], gradeLevel: 'Grade 11', numQuestions: 5, title: 'Function Review' });
  });
});
