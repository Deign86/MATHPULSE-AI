// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import * as authNs from '@/contexts/AuthContext';
import { useNotifications } from './NotificationContext';
import { NotificationProvider } from './NotificationContext';
import * as notificationFirestoreNs from './notificationFirestoreService';
import * as dailyCheckInNs from './useDailyCheckInReminder';
import type { Notification } from './types';

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
const markAllAsReadSpy = vi.spyOn(notificationFirestoreNs, 'markAllAsRead');
vi.spyOn(notificationFirestoreNs, 'deleteNotification');

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
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

  it('ignores a second mark-all trigger while the first write is pending', async () => {
    subscribeToNotificationsSpy.mockImplementation((_userId, callback) => {
      callback([]);
      return vi.fn();
    });
    let resolveWrite: () => void = () => undefined;
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    markAllAsReadSpy.mockImplementation(() => writePromise);

    const TestComponent = () => {
      const { markAllAsRead } = useNotifications();
      return <button onClick={() => markAllAsRead()}>Mark All Read</button>;
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark All Read' }));
      fireEvent.click(screen.getByRole('button', { name: 'Mark All Read' }));
    });

    expect(notificationFirestoreNs.markAllAsRead).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveWrite();
      await writePromise;
    });
  });

  it('merges interim snapshots into rollback by notification id', async () => {
    let pushSnapshot: ((notifications: Notification[]) => void) | undefined;
    const originalNotification = {
      id: 'original',
      userId: 'user-123',
      type: 'daily_checkin' as const,
      title: 'Original',
      message: 'Original message',
      isRead: false,
      createdAt: new Date(),
    };
    const interimNotification = {
      ...originalNotification,
      id: 'interim',
      title: 'Interim',
    };
    subscribeToNotificationsSpy.mockImplementation((_userId, callback) => {
      pushSnapshot = callback;
      callback([originalNotification]);
      return vi.fn();
    });
    let rejectWrite: (error: Error) => void = () => undefined;
    const writePromise = new Promise<void>((_resolve, reject) => {
      rejectWrite = reject;
    });
    markAllAsReadSpy.mockImplementation(() => writePromise);

    const TestComponent = () => {
      const { markAllAsRead, notifications, unreadCount } = useNotifications();
      return (
        <>
          <button onClick={() => markAllAsRead()}>Mark All Read</button>
          <span data-testid="notification-ids">{notifications.map((notification) => notification.id).join(',')}</span>
          <span data-testid="unread-count">{unreadCount}</span>
        </>
      );
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );
    await waitFor(() => expect(pushSnapshot).toBeDefined());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark All Read' }));
    });
    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('0'));

    await act(async () => {
      pushSnapshot?.([{ ...originalNotification, isRead: true }, interimNotification]);
    });
    await waitFor(() => expect(screen.getByTestId('notification-ids')).toHaveTextContent('original,interim'));

    await act(async () => {
      rejectWrite(new Error('forced batch failure'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-ids')).toHaveTextContent('original,interim');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
    });
  });
});
