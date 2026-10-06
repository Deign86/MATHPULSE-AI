import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import { updateCalendarEvent } from './calendarService';

describe('calendar event optional field updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('omits undefined fields unless the caller explicitly requests clearing', async () => {
    await updateCalendarEvent('event-1', { title: 'Updated title', description: undefined });
    const update = vi.mocked(firestore.updateDoc).mock.calls.at(-1)?.[1];
    expect(update).toMatchObject({ title: 'Updated title' });
    expect(update).not.toHaveProperty('description');
    expect(update).not.toHaveProperty('endTime');
  });

  it('writes deleteField sentinels for optional fields cleared by the editor', async () => {
    const sentinel = firestore.deleteField();
    vi.spyOn(firestore, 'deleteField').mockReturnValue(sentinel);

    await updateCalendarEvent('event-1', { title: 'Updated title' }, ['description', 'endTime']);

    const update = vi.mocked(firestore.updateDoc).mock.calls.at(-1)?.[1];
    expect(update).toMatchObject({
      title: 'Updated title',
      description: sentinel,
      endTime: sentinel,
    });
  });
});
