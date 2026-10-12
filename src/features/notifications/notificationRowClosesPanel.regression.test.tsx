// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as notificationContextNs from './NotificationContext';
import * as authNs from '@/contexts/AuthContext';
import type { AuthContextType } from '@/contexts/AuthContext';
import type { Notification } from './types';

const streakReminder: Notification = {
  id: 'streak-1',
  userId: 'student-1',
  type: 'streak_reminder',
  title: 'Keep your streak alive',
  message: 'Claim today\'s reward.',
  isRead: false,
  createdAt: new Date('2026-10-12T08:00:00Z'),
};

const deleteNotification = vi.fn();

// Context seam: real bell, panel and row render against one unread notification.
vi.spyOn(notificationContextNs, 'useNotifications').mockReturnValue({
  notifications: [streakReminder],
  unreadCount: 1,
  isLoading: false,
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification,
});

const studentAuth: AuthContextType = {
  currentUser: null,
  userProfile: {
    uid: 'student-1',
    email: 'student-1@example.test',
    name: 'Test Student',
    role: 'student',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => {},
};
vi.spyOn(authNs, 'useAuth').mockReturnValue(studentAuth);

import { NotificationBell } from './NotificationBell';

describe('notification panel stays open over the Daily Rewards modal', () => {
  const navigateListener = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.addEventListener('mathpulse:navigate', navigateListener);
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  });

  afterEach(() => {
    window.removeEventListener('mathpulse:navigate', navigateListener);
    cleanup();
  });

  it('closes the panel and opens the daily rewards section when a reward notification is tapped', () => {
    expect(screen.getByTestId('notification-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Keep your streak alive'));

    expect(screen.queryByTestId('notification-panel')).not.toBeInTheDocument();
    expect(navigateListener).toHaveBeenCalledTimes(1);
    expect(navigateListener.mock.calls[0][0].detail).toEqual({ tab: 'Modules', section: 'daily-rewards' });
  });

  it('closes the panel when Enter is pressed on a row', () => {
    fireEvent.keyDown(screen.getByRole('button', { name: /keep your streak alive/i }), { key: 'Enter' });

    expect(screen.queryByTestId('notification-panel')).not.toBeInTheDocument();
  });

  it('keeps the panel open when a notification is deleted', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Delete notification' }));

    expect(deleteNotification).toHaveBeenCalledWith('streak-1');
    expect(screen.getByTestId('notification-panel')).toBeInTheDocument();
    expect(navigateListener).not.toHaveBeenCalled();
  });
});
