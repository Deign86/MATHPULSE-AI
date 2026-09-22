import { describe, it, expect } from 'vitest';
import { selectDisplayXP, pluralize, sortByXpDesc } from './display';

describe('selectDisplayXP', () => {
  it('prefers lifetime totalXP so banner matches the leaderboard', () => {
    expect(selectDisplayXP(586, 486)).toBe(586);
  });

  it('falls back to spendable currentXP for legacy profiles', () => {
    expect(selectDisplayXP(undefined, 486)).toBe(486);
    expect(selectDisplayXP(null, 486)).toBe(486);
  });

  it('returns zero when no XP data exists', () => {
    expect(selectDisplayXP(undefined, undefined)).toBe(0);
    expect(selectDisplayXP(null, null)).toBe(0);
  });

  it('treats zero totalXP as a real value, not missing', () => {
    expect(selectDisplayXP(0, 486)).toBe(0);
  });
});

describe('pluralize', () => {
  it('uses the singular form for exactly one', () => {
    expect(pluralize(1, 'quiz', 'quizzes')).toBe('1 quiz');
    expect(pluralize(1, 'lesson')).toBe('1 lesson');
  });

  it('uses the plural form otherwise, including zero', () => {
    expect(pluralize(2, 'quiz', 'quizzes')).toBe('2 quizzes');
    expect(pluralize(0, 'lesson')).toBe('0 lessons');
    expect(pluralize(12, 'quiz', 'quizzes')).toBe('12 quizzes');
  });
});

describe('sortByXpDesc', () => {
  it('orders strictly by score descending (issue #158 top-3 case)', () => {
    const rows = [
      { id: 'rain', totalXP: 1600 },
      { id: 'faijah', totalXP: 2800 },
      { id: 'loraine', totalXP: 586 },
    ];
    expect(sortByXpDesc(rows).map((row) => row.id)).toEqual(['faijah', 'rain', 'loraine']);
  });

  it('does not mutate the input array', () => {
    const rows = [
      { id: 'a', totalXP: 10 },
      { id: 'b', totalXP: 99 },
    ];
    sortByXpDesc(rows);
    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('keeps tied scores in server order', () => {
    const rows = [
      { id: 'first', totalXP: 500 },
      { id: 'second', totalXP: 500 },
    ];
    expect(sortByXpDesc(rows).map((row) => row.id)).toEqual(['first', 'second']);
  });
});
