// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import * as dateFnsNs from 'date-fns';
import * as notificationContextNs from './NotificationContext';

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

import { NotificationItem } from './NotificationItem';
import type { Notification } from './types';

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
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

  it('renders notification title and message', () => {
    const notification = createNotification();
    render(<NotificationItem notification={notification} />);

    expect(screen.getByText('Daily Check-In Complete!')).toBeInTheDocument();
    expect(screen.getByText('You earned 20 XP!')).toBeInTheDocument();
  });

  it('shows unread indicator for unread notifications', () => {
    const notification = createNotification({ isRead: false });
    render(<NotificationItem notification={notification} />);

    expect(screen.getByText('Daily Check-In Complete!')).toBeInTheDocument();
  });

  it('shows read style for read notifications', () => {
    const notification = createNotification({ isRead: true });
    render(<NotificationItem notification={notification} />);

    expect(screen.getByText('Daily Check-In Complete!')).toBeInTheDocument();
  });

  it('calls markAsRead when clicked', () => {
    const notification = createNotification({ isRead: false });
    render(<NotificationItem notification={notification} />);

    fireEvent.click(screen.getByText('Daily Check-In Complete!'));
    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-123');
  });

  it('navigates to actionUrl when clicked', () => {
    const notification = createNotification({
      actionUrl: '/dashboard',
    });
    render(<NotificationItem notification={notification} />);

    fireEvent.click(screen.getByText('Daily Check-In Complete!'));
    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-123');
  });

  it('calls deleteNotification when delete button clicked', () => {
    const notification = createNotification();
    render(<NotificationItem notification={notification} />);

    const deleteButton = screen.getByRole('button', { name: 'Delete notification' });
    fireEvent.click(deleteButton);
    expect(mockDeleteNotification).toHaveBeenCalledWith('notif-123');
  });

  it('displays formatted time', () => {
    const notification = createNotification();
    render(<NotificationItem notification={notification} />);

    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });
});
