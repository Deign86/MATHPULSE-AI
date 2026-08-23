// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import * as authNs from '@/contexts/AuthContext';
import { useNotifications } from './NotificationContext';
import { NotificationProvider } from './NotificationContext';
import * as notificationFirestoreNs from './notificationFirestoreService';
import * as dailyCheckInNs from './useDailyCheckInReminder';

// Auth seam: spy on the real hook so the provider sees a signed-in user.
// SAFETY: the partial stub only omits auth fields the notification context never reads.
vi.spyOn(authNs, 'useAuth').mockReturnValue({
  currentUser: { uid: 'user-123' },
  userProfile: null,
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => {},
} as ReturnType<typeof authNs.useAuth>);

// Reminder hook seam stays inert so notifications drive the context alone.
vi.spyOn(dailyCheckInNs, 'useDailyCheckInReminder').mockReturnValue(undefined);

// Firestore seams: spy on the real functions; each test sets its own behavior.
const subscribeToNotificationsSpy = vi.spyOn(notificationFirestoreNs, 'subscribeToNotifications');
vi.spyOn(notificationFirestoreNs, 'markAsRead');
vi.spyOn(notificationFirestoreNs, 'markAllAsRead');
vi.spyOn(notificationFirestoreNs, 'deleteNotification');

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides notifications context to children', async () => {
    const mockUnsubscribe = vi.fn();
    subscribeToNotificationsSpy.mockImplementation((userId, callback) => {
      callback([
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'daily_checkin',
          title: 'Test',
          message: 'Test message',
          isRead: false,
          createdAt: new Date(),
        },
      ]);
      return mockUnsubscribe;
    });

    const TestComponent = () => {
      const { notifications, unreadCount } = useNotifications();
      return (
        <div>
          <span data-testid="count">{notifications.length}</span>
          <span data-testid="unread">{unreadCount}</span>
        </div>
      );
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
      expect(screen.getByTestId('unread')).toHaveTextContent('1');
    });
  });

  it('throws when useNotifications is used outside provider', () => {
    const TestComponent = () => {
      try {
        useNotifications();
        return <div>No error</div>;
      } catch (e) {
        return <div>Error thrown</div>;
      }
    };

    render(<TestComponent />);
    expect(screen.getByText('Error thrown')).toBeInTheDocument();
  });

  it('calls markAsRead when invoked', async () => {
    subscribeToNotificationsSpy.mockImplementation((userId, callback) => {
      callback([]);
      return vi.fn();
    });

    const TestComponent = () => {
      const { markAsRead } = useNotifications();
      return <button onClick={() => markAsRead('notif-123')}>Mark Read</button>;
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    const button = screen.getByText('Mark Read');
    button.click();

    expect(notificationFirestoreNs.markAsRead).toHaveBeenCalledWith('user-123', 'notif-123');
  });

  it('calls markAllAsRead when invoked', async () => {
    subscribeToNotificationsSpy.mockImplementation((userId, callback) => {
      callback([]);
      return vi.fn();
    });

    const TestComponent = () => {
      const { markAllAsRead } = useNotifications();
      return <button onClick={() => markAllAsRead()}>Mark All Read</button>;
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    const button = screen.getByText('Mark All Read');
    button.click();

    expect(notificationFirestoreNs.markAllAsRead).toHaveBeenCalledWith('user-123');
  });
});
