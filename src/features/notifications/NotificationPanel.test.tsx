// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import * as notificationContextNs from './NotificationContext';
import * as notificationItemNs from './NotificationItem';
import type { Notification } from './types';

// Mutable context fixtures read by the context seam on every render.
let notificationsValue: Notification[] = [];
let unreadCountValue = 0;
let isLoadingValue = false;
const markAllAsReadMock = vi.fn();

// Context seam: spy on the real hook; the fixtures above drive each scenario.
vi.spyOn(notificationContextNs, 'useNotifications').mockImplementation(() => ({
  notifications: notificationsValue,
  unreadCount: unreadCountValue,
  isLoading: isLoadingValue,
  markAsRead: vi.fn(),
  markAllAsRead: markAllAsReadMock,
  deleteNotification: vi.fn(),
}));

// Item seam: rendered-but-inert stub keyed by notification id.
// SAFETY: the stub preserves the notification prop contract consumed by the panel.
vi.spyOn(notificationItemNs, 'NotificationItem').mockImplementation(
  (({ notification }: { notification: { id: string; title: string } }) => (
    <div data-testid={`item-${notification.id}`}>{notification.title}</div>
  )) as typeof notificationItemNs.NotificationItem,
);

import { NotificationPanel } from './NotificationPanel';

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsValue = [];
    unreadCountValue = 0;
    isLoadingValue = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders notifications when not loading', () => {
    notificationsValue = [
      { id: 'notif-1', userId: 'user-1', title: 'Test 1', message: 'Msg 1', isRead: false, createdAt: new Date(), type: 'daily_checkin' },
      { id: 'notif-2', userId: 'user-1', title: 'Test 2', message: 'Msg 2', isRead: true, createdAt: new Date(), type: 'streak_reminder' },
    ];
    unreadCountValue = 1;
    isLoadingValue = false;

    render(<NotificationPanel onClose={() => {}} />);

    expect(screen.getByTestId('item-notif-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-notif-2')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading', () => {
    isLoadingValue = true;

    render(<NotificationPanel onClose={() => {}} />);

    // Check for skeleton elements (animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no notifications', () => {
    notificationsValue = [];
    isLoadingValue = false;

    render(<NotificationPanel onClose={() => {}} />);

    expect(screen.getByText(/caught up/i)).toBeInTheDocument();
  });

  it('calls onClose when clicking outside', () => {
    const mockOnClose = vi.fn();
    notificationsValue = [];
    isLoadingValue = false;

    render(<NotificationPanel onClose={mockOnClose} />);

    // Simulate mousedown on document (outside click)
    fireEvent(document, new MouseEvent('mousedown', {
      bubbles: true,
    }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls markAllAsRead when button clicked', () => {
    notificationsValue = [
      { id: 'notif-1', userId: 'user-1', title: 'Test 1', message: 'Msg 1', isRead: false, createdAt: new Date(), type: 'daily_checkin' },
    ];
    unreadCountValue = 1;
    isLoadingValue = false;

    render(<NotificationPanel onClose={() => {}} />);

    const markAllButton = screen.getByText(/mark all read/i);
    fireEvent.click(markAllButton);

    expect(markAllAsReadMock).toHaveBeenCalled();
  });
});
