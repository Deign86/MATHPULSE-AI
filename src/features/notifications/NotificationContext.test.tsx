// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { useNotifications } from './NotificationContext';
import { NotificationProvider } from './NotificationContext';
import { subscribeToNotifications, markAsRead, markAllAsRead, deleteNotification } from './notificationFirestoreService';

vi.mock('./notificationFirestoreService', () => ({
  subscribeToNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: { uid: 'user-123' },
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./useDailyCheckInReminder', () => ({
  useDailyCheckInReminder: vi.fn(),
}));

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides notifications context to children', async () => {
    const mockUnsubscribe = vi.fn();
    (subscribeToNotifications as unknown as ReturnType<typeof vi.fn>).mockImplementation((userId, callback) => {
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
    (subscribeToNotifications as unknown as ReturnType<typeof vi.fn>).mockImplementation((userId, callback) => {
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

    expect(markAsRead).toHaveBeenCalledWith('user-123', 'notif-123');
  });

  it('calls markAllAsRead when invoked', async () => {
    (subscribeToNotifications as unknown as ReturnType<typeof vi.fn>).mockImplementation((userId, callback) => {
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

    expect(markAllAsRead).toHaveBeenCalledWith('user-123');
  });
});
