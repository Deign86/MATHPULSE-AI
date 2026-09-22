import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import * as gamificationService from '../gamificationService';
import { computeHonestXp } from '../honestXp';
import { recordLearningEvent } from '../learningEventsService';

const awardXpSpy = vi.spyOn(gamificationService, 'awardXP');

function snapshotWith(payload: DocumentData | null): DocumentSnapshot<DocumentData> {
  // SAFETY: the service reads only exists() and data() from this opaque test snapshot.
  return {
    exists: () => payload !== null,
    data: () => payload ?? {},
  } as DocumentSnapshot<DocumentData>;
}

describe('computeHonestXp', () => {
  it('awards the base amount for a zero-score, first-day attempt', () => {
    expect(computeHonestXp({ quizScore: 0, hintsUsed: 0, streakDays: 1 })).toBe(30);
  });

  it('applies the 14-day multiplier to a perfect score', () => {
    expect(computeHonestXp({ quizScore: 100, hintsUsed: 0, streakDays: 14 })).toBe(120);
  });

  it.each([
    [2, 30],
    [3, 33],
    [7, 37],
    [14, 45],
  ])('uses the correct streak tier at %i days', (streakDays, expectedXp) => {
    expect(computeHonestXp({ quizScore: 0, hintsUsed: 0, streakDays })).toBe(expectedXp);
  });

  it('keeps the minimum reward at 10 XP after hint deductions', () => {
    expect(computeHonestXp({ quizScore: 100, hintsUsed: 20, streakDays: 1 })).toBe(10);
  });
});

describe('recordLearningEvent', () => {
  beforeEach(() => {
    vi.mocked(getDoc).mockReset();
    vi.mocked(setDoc).mockReset().mockResolvedValue(undefined);
    vi.mocked(serverTimestamp).mockClear();
    awardXpSpy.mockReset().mockResolvedValue({
      newLevel: 1,
      leveledUp: false,
      xp: 80,
      addedXp: 80,
    });
  });

  it('awards XP once when the same learning event is recorded twice', async () => {
    const storedEvent = {
      eventId: '9d2f315f6ae026b437bc5fb127caaa79',
      userId: 'user-1',
      lessonId: 'lesson-1',
      quizScore: 100,
      hintsUsed: 0,
      streakDays: 1,
      xpEarned: 80,
    };
    let eventExists = false;
    vi.mocked(getDoc).mockImplementation(async () => snapshotWith(eventExists ? storedEvent : null));
    vi.mocked(setDoc).mockImplementation(async () => {
      eventExists = true;
    });

    await recordLearningEvent({
      userId: 'user-1',
      lessonId: 'lesson-1',
      quizScore: 100,
      hintsUsed: 0,
      streakDays: 1,
    });
    const cachedEvent = await recordLearningEvent({
      userId: 'user-1',
      lessonId: 'lesson-1',
      quizScore: 100,
      hintsUsed: 0,
      streakDays: 1,
    });

    expect(cachedEvent).toEqual(storedEvent);
    expect(getDoc).toHaveBeenCalledTimes(2);
    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(serverTimestamp).toHaveBeenCalledTimes(1);
    expect(awardXpSpy).toHaveBeenCalledTimes(1);
    expect(awardXpSpy).toHaveBeenCalledWith(
      'user-1',
      80,
      'lesson_complete',
      'Completed lesson: lesson-1',
    );
    expect(vi.mocked(setDoc).mock.calls[0]?.[1]).toMatchObject({
      eventId: '9d2f315f6ae026b437bc5fb127caaa79',
    });
    expect(vi.mocked(setDoc).mock.calls[0]?.[1]).toHaveProperty('timestamp');
  });
});
