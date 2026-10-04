/** QuizMaker pure logic: topic cap + title resolution (TCH-069/070). */
import { describe, expect, it } from 'vitest';

import { buildQuizTitle, canSelectTopic } from './QuizMaker';

describe('canSelectTopic (TCH-069)', () => {
  it('always allows removing an already-selected topic', () => {
    const full = Array.from({ length: 12 }, (_, i) => `Topic ${i + 1}`);
    expect(canSelectTopic(full, 'Topic 1')).toBe(true);
  });

  it('allows additions below the cap', () => {
    expect(canSelectTopic(['A', 'B'], 'C', 12)).toBe(true);
    expect(canSelectTopic(Array.from({ length: 11 }, (_, i) => `T${i}`), 'T11', 12)).toBe(true);
  });

  it('refuses the 13th topic at the default cap', () => {
    const full = Array.from({ length: 12 }, (_, i) => `Topic ${i + 1}`);
    expect(canSelectTopic(full, 'Topic 13')).toBe(false);
  });
});

describe('buildQuizTitle (TCH-070)', () => {
  it('keeps a custom title trimmed', () => {
    expect(buildQuizTitle('  My Midterm  ', 'Grade 11', ['A', 'B'])).toBe('My Midterm');
  });

  it('falls back to grade plus first two topics', () => {
    expect(buildQuizTitle('', 'Grade 11', ['Functions', 'Logic', 'Stats'])).toBe(
      'Grade 11 Quiz – Functions, Logic',
    );
  });

  it('falls back to Mixed Topics with no topics', () => {
    expect(buildQuizTitle('   ', 'Grade 11', [])).toBe('Grade 11 Quiz – Mixed Topics');
  });
});
