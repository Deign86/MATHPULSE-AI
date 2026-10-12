// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import * as dateFnsNs from 'date-fns';
import * as notificationContextNs from './NotificationContext';
import * as authNs from '@/contexts/AuthContext';
import type { AuthContextType } from '@/contexts/AuthContext';
import type { User } from '@/types/models';

// Date seam: fixed relative-time label keeps snapshots deterministic.
vi.spyOn(dateFnsNs, 'formatDistanceToNow').mockReturnValue('2 hours ago');

// Context seam: spy on the real hook so markAsRead/deleteNotification are observable.
const mockMarkAsRead = vi.fn();
const mockDeleteNotification = vi.fn();
vi.spyOn(notificationContextNs, 'useNotifications').mockReturnValue({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  markAsRead: mockMarkAsRead,
  markAllAsRead: vi.fn(),
  deleteNotification: mockDeleteNotification,
});

const studentProfile: User = {
  uid: 'user-123',
  email: 'user-123@example.test',
  name: 'Test Student',
  role: 'student',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const studentAuth: AuthContextType = {
  currentUser: null,
  userProfile: studentProfile,
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => {},
};
vi.spyOn(authNs, 'useAuth').mockReturnValue(studentAuth);

import { NotificationItem } from './NotificationItem';
import type { Notification } from './types';

describe('NotificationItem', () => {
  const onActivate = vi.fn();
  const navigateListener = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    window.addEventListener('mathpulse:navigate', navigateListener);
  });

  afterEach(() => {
    window.removeEventListener('mathpulse:navigate', navigateListener);
  });

  const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 'notif-123',
    userId: 'user-123',
    type: 'daily_checkin',
    title: 'Daily Check-In Complete!',
    message: 'You earned 20 XP!',
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  });

  const renderItem = (notification: Notification) =>
    render(<NotificationItem notification={notification} onActivate={onActivate} />);

  const navigationDetails = () =>
    navigateListener.mock.calls.map(([event]) => event.detail);

  it('renders notification title and message', () => {
    renderItem(createNotification());

    expect(screen.getByText('Daily Check-In Complete!')).toBeInTheDocument();
    expect(screen.getByText('You earned 20 XP!')).toBeInTheDocument();
  });

  it('shows unread indicator for unread notifications', () => {
    renderItem(createNotification({ isRead: false }));

    expect(screen.getByText('Daily Check-In Complete!')).toBeInTheDocument();
  });

  it('shows read style for read notifications', () => {
    renderItem(createNotification({ isRead: true }));

    expect(screen.getByText('Daily Check-In Complete!')).toBeInTheDocument();
  });

  it('calls markAsRead when clicked', () => {
    renderItem(createNotification({ isRead: false }));

    fireEvent.click(screen.getByText('Daily Check-In Complete!'));
    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-123');
  });

  it('navigates to actionUrl when clicked', () => {
    renderItem(createNotification({ actionUrl: '/dashboard' }));

    fireEvent.click(screen.getByText('Daily Check-In Complete!'));
    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-123');
  });

  it('calls deleteNotification when delete button clicked', () => {
    renderItem(createNotification());

    const deleteButton = screen.getByRole('button', { name: 'Delete notification' });
    fireEvent.click(deleteButton);
    expect(mockDeleteNotification).toHaveBeenCalledWith('notif-123');
  });

  it('displays formatted time', () => {
    renderItem(createNotification());

    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  describe('closing the panel', () => {
    it('closes the panel when the row is clicked', () => {
      renderItem(createNotification());

      fireEvent.click(screen.getByText('Daily Check-In Complete!'));

      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('closes the panel when Enter is pressed on the row', () => {
      renderItem(createNotification());

      fireEvent.keyDown(screen.getByRole('button', { name: /daily check-in complete/i }), { key: 'Enter' });

      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('closes the panel when Space is pressed on the row', () => {
      renderItem(createNotification());

      fireEvent.keyDown(screen.getByRole('button', { name: /daily check-in complete/i }), { key: ' ' });

      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('closes the panel for a read notification that has nowhere to navigate', () => {
      renderItem(createNotification({ type: 'xp_earned', isRead: true }));

      fireEvent.click(screen.getByText('Daily Check-In Complete!'));

      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });

    it('keeps the panel open when the delete button is clicked', () => {
      renderItem(createNotification());

      fireEvent.click(screen.getByRole('button', { name: 'Delete notification' }));

      expect(mockDeleteNotification).toHaveBeenCalledWith('notif-123');
      expect(onActivate).not.toHaveBeenCalled();
      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });

    it('does not treat Enter or Space on the delete button as a row activation', () => {
      renderItem(createNotification());
      const deleteButton = screen.getByRole('button', { name: 'Delete notification' });

      fireEvent.keyDown(deleteButton, { key: 'Enter' });
      fireEvent.keyDown(deleteButton, { key: ' ' });

      expect(onActivate).not.toHaveBeenCalled();
      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });
  });

  describe('navigation events', () => {
    it.each(['daily_checkin', 'streak_reminder'] as const)(
      'sends a %s tap to the daily rewards section for students',
      (type) => {
        renderItem(createNotification({ type }));

        fireEvent.click(screen.getByText('Daily Check-In Complete!'));

        expect(navigationDetails()).toEqual([{ tab: 'Modules', section: 'daily-rewards' }]);
      },
    );

    it('does not navigate for a daily reward tap from a non-student', () => {
      vi.spyOn(authNs, 'useAuth').mockReturnValueOnce({
        ...studentAuth,
        userProfile: { ...studentProfile, role: 'teacher' },
        userRole: 'teacher',
      });
      renderItem(createNotification({ type: 'streak_reminder' }));

      fireEvent.click(screen.getByText('Daily Check-In Complete!'));

      expect(navigationDetails()).toEqual([]);
    });

    it('sends a class_assigned tap to Modules without the daily rewards section', () => {
      renderItem(createNotification({ type: 'class_assigned' }));

      fireEvent.click(screen.getByText('Daily Check-In Complete!'));

      expect(navigationDetails()).toEqual([{ tab: 'Modules' }]);
    });
  });
});
