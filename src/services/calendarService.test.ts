/** TCH-064: optional calendar fields must never reach Firestore as undefined. */
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { CollectionReference, DocumentReference } from 'firebase/firestore';

import { createCalendarEvent, updateCalendarEvent } from './calendarService';

// SAFETY: opaque references returned by the Firestore boundary spies; consumed only by mocked IO.
const fakeCollectionReference = {} as CollectionReference;
// SAFETY: tests only read the id off the returned reference.
const fakeDocumentReference = { id: 'evt-1' } as DocumentReference;
// SAFETY: the global setup stubs serverTimestamp() as undefined; restore a fixed
// marker so undefined-value assertions target only the service's own fields.
const fakeTimestamp = 'server-time' as never;

function mockFirestore() {
  vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollectionReference);
  vi.spyOn(firestore, 'doc').mockReturnValue(fakeDocumentReference);
  vi.spyOn(firestore, 'serverTimestamp').mockReturnValue(fakeTimestamp);
  const setDoc = vi.spyOn(firestore, 'setDoc').mockResolvedValue(undefined);
  const updateDoc = vi.spyOn(firestore, 'updateDoc').mockResolvedValue(undefined);
  return { setDoc, updateDoc };
}

describe('calendarService undefined-field stripping (TCH-064)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates events without optional fields and no undefined values', async () => {
    const { setDoc } = mockFirestore();
    const event = await createCalendarEvent('teacher-1', {
      title: 'Quiz Friday',
      startTime: new Date('2026-10-10T08:00:00'),
    });
    expect(setDoc).toHaveBeenCalledTimes(1);
    const sent = setDoc.mock.calls[0][1];
    const sentKeys = Object.keys(sent);
    expect(sentKeys).not.toContain('description');
    expect(sentKeys).not.toContain('endTime');
    expect(sentKeys).not.toContain('color');
    expect(Object.values(sent).some((value) => value === undefined)).toBe(false);
    expect(event.title).toBe('Quiz Friday');
  });

  it('keeps defined optional fields on create', async () => {
    const { setDoc } = mockFirestore();
    await createCalendarEvent('teacher-1', {
      title: 'Quiz Friday',
      description: 'Chapter 3',
      startTime: new Date('2026-10-10T08:00:00'),
      color: 'blue',
    });
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: 'Chapter 3', color: 'blue' }),
    );
  });

  it('strips undefined fields on update', async () => {
    const { updateDoc } = mockFirestore();
    await updateCalendarEvent('evt-9', { title: 'Renamed', description: undefined });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const sent = updateDoc.mock.calls[0][1];
    expect(Object.keys(sent)).toContain('title');
    expect(Object.keys(sent)).not.toContain('description');
    expect(Object.values(sent).some((value) => value === undefined)).toBe(false);
  });
});
