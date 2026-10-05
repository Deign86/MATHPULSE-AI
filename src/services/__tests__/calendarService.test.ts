import { afterEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { CollectionReference, DocumentReference } from 'firebase/firestore';
import type { CalendarEvent } from '../../types/models';
import { createCalendarEvent, updateCalendarEvent } from '../calendarService';

// SAFETY: opaque references are passed only through the Firestore boundary spies.
const fakeCollection = {} as CollectionReference;
// SAFETY: this reference is a minimal identifier fixture used only by the Firestore boundary spies.
const fakeDocument = { id: 'event-1' } as DocumentReference;

describe('calendar event persistence', () => {
  afterEach(() => vi.restoreAllMocks());

  it('omits undefined optional fields and persists the class scope', async () => {
    vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollection);
    vi.spyOn(firestore, 'doc').mockReturnValue(fakeDocument);
    const setDoc = vi.spyOn(firestore, 'setDoc').mockResolvedValue(undefined);
    const startTime = new Date('2026-10-05T09:00:00');

    const event = await createCalendarEvent('teacher-1', {
      title: 'Quiz',
      startTime,
      classId: 'class-1',
    });

    // SAFETY: the second setDoc argument is the object written by this Firestore boundary spy.
    const savedFields = setDoc.mock.calls[0][1] as Partial<Pick<CalendarEvent, 'classId' | 'title' | 'description' | 'startTime' | 'endTime' | 'color' | 'createdAt' | 'updatedAt'>>;
    expect(savedFields).toMatchObject({ title: 'Quiz', classId: 'class-1' });
    expect(savedFields).not.toHaveProperty('description');
    expect(savedFields).not.toHaveProperty('endTime');
    expect(event.classId).toBe('class-1');
  });

  it('does not send undefined update values to Firestore', async () => {
    vi.spyOn(firestore, 'doc').mockReturnValue(fakeDocument);
    const updateDoc = vi.spyOn(firestore, 'updateDoc').mockResolvedValue(undefined);

    await updateCalendarEvent('event-1', { title: 'Renamed', description: undefined, endTime: undefined });

    const updates = updateDoc.mock.calls[0][1];
    expect(updates).toMatchObject({ title: 'Renamed' });
    expect(Object.values(updates).every((value) => value !== undefined)).toBe(true);
  });
});
