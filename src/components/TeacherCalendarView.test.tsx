// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import type { AuthContextType } from '../contexts/AuthContext';
import AuthContext from '../contexts/AuthContext';
import * as calendarService from '../services/calendarService';
import TeacherCalendarView from './TeacherCalendarView';

describe('TeacherCalendarView optional field clearing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('deletes the existing description and end time when both are cleared in the editor', async () => {
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);
    const existingEvent = {
      id: 'event-1',
      userId: 'teacher-1',
      title: 'Existing event',
      description: 'Old description',
      startTime,
      endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
      createdAt: startTime,
    };
    vi.spyOn(calendarService, 'subscribeToUserCalendarEvents').mockImplementation((_userId, _options, onChange) => {
      onChange([existingEvent]);
      return () => undefined;
    });
    const sentinel = firestore.deleteField();
    const deleteFieldSpy = vi.spyOn(firestore, 'deleteField').mockReturnValue(sentinel);
    const updateDocSpy = vi.mocked(firestore.updateDoc);
    // SAFETY: the calendar component only reads currentUser.uid from this auth stub.
    const currentUser = { uid: 'teacher-1' } as AuthContextType['currentUser'];
    const authValue: AuthContextType = {
      currentUser,
      userProfile: null,
      loading: false,
      isLoggedIn: true,
      userRole: 'teacher',
      refreshProfile: async () => undefined,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <TeacherCalendarView teacherId="teacher-1" />
      </AuthContext.Provider>,
    );

    fireEvent.click(screen.getAllByText('Existing event')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Edit Event/ }));
    fireEvent.change(screen.getByPlaceholderText('Additional details about this event...'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('End Time (Optional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Event' }));

    await waitFor(() => expect(updateDocSpy).toHaveBeenCalled());
    const update = updateDocSpy.mock.calls.at(-1)?.[1];
    expect(update).toMatchObject({ description: sentinel, endTime: sentinel });
    expect(Object.entries(update ?? {}).filter(([, value]) => value === sentinel).map(([key]) => key).sort())
      .toEqual(['description', 'endTime']);
    expect(deleteFieldSpy).toHaveBeenCalledTimes(2);
  });
});
