import { describe, expect, it } from 'vitest';
import { getSavedLessonSectionIndex } from './lessonSectionProgress';

describe('getSavedLessonSectionIndex', () => {
  it('restores the persisted zero-based index instead of treating it as a Part number', () => {
    expect(getSavedLessonSectionIndex({ lastSectionIndex: 1 }, 6)).toBe(1);
  });

  it('clamps saved progress to the available sections', () => {
    expect(getSavedLessonSectionIndex({ lastSectionIndex: 8 }, 6)).toBe(5);
  });

  it('does not restore before the lesson sections have loaded', () => {
    expect(getSavedLessonSectionIndex({ lastSectionIndex: 1 }, 0)).toBeUndefined();
  });
});
