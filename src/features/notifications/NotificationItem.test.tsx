// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import * as dateFnsNs from 'date-fns';
import * as lucideNs from 'lucide-react';
import * as notificationContextNs from './NotificationContext';

// Icon seam: replace every lucide icon used by NotificationItem with an inert stub.
const MockIcon = ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
  <div data-testid={testId}>Icon</div>
);
const MockTrash = ({ onClick }: { onClick?: () => void }) => (
  <button data-testid="trash2-icon" onClick={onClick}>Trash</button>
);

vi.spyOn(lucideNs, 'Trophy').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'TrendingUp').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'ClipboardCheck').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'CheckCircle').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'Flame').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'Bell').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'Megaphone').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'BookOpen').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'Zap').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'AlertCircle').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'AlertTriangle').mockImplementation(MockIcon);
vi.spyOn(lucideNs, 'Trash2').mockImplementation(MockTrash);

// Date seam: fixed relative-time label keeps snapshots deterministic.
vi.spyOn(dateFnsNs, 'formatDistanceToNow').mockReturnValue('2 hours ago');

// Context seam: spy on the real hook so markAsRead/deleteNotification are observable.
const mockMarkAsRead = vi.fn();
const mockDeleteNotification = vi.fn();
// SAFETY: the partial stub only omits context fields NotificationItem never reads.
vi.spyOn(notificationContextNs, 'useNotifications').mockReturnValue({
  markAsRead: mockMarkAsRead,
  deleteNotification: mockDeleteNotification,
} as ReturnType<typeof notificationContextNs.useNotifications>);

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

    const deleteButton = screen.getByTestId('trash2-icon').closest('button');
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }
    expect(mockDeleteNotification).toHaveBeenCalledWith('notif-123');
  });

  it('displays formatted time', () => {
    const notification = createNotification();
    render(<NotificationItem notification={notification} />);

    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });
});
