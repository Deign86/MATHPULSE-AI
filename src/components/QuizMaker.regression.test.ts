import { describe, expect, it } from 'vitest';
import { addQuizTopic, DEFAULT_QUIZ_QUESTION_COUNT, resolveQuizTitle } from './QuizMaker';

describe('quiz maker regression behavior', () => {
  it('defaults to five questions and refuses a thirteenth topic', () => {
    const twelveTopics = Array.from({ length: 12 }, (_, index) => `Topic ${index + 1}`);
    expect(DEFAULT_QUIZ_QUESTION_COUNT).toBe(5);
    expect(addQuizTopic(twelveTopics, 'Topic 13')).toBe(twelveTopics);
  });

  it('keeps the requested title and provides a topic-based fallback', () => {
    expect(resolveQuizTitle('  Quarter 1 Quiz ', 'Grade 11', ['Functions'])).toBe('Quarter 1 Quiz');
    expect(resolveQuizTitle('', 'Grade 11', ['Functions'])).toBe('Grade 11 Quiz – Functions');
  });
});
