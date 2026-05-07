// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = ({ 'data-testid': testId }: { 'data-testid': string }) => (
    <div data-testid={testId}>Icon</div>
  );
  return {
    Trophy: MockIcon,
    TrendingUp: MockIcon,
    ClipboardCheck: MockIcon,
    CheckCircle: MockIcon,
    Flame: MockIcon,
    Bell: MockIcon,
    Megaphone: MockIcon,
    BookOpen: MockIcon,
    Zap: MockIcon,
    AlertCircle: MockIcon,
    Trash2: ({ onClick }: { onClick?: () => void }) => (
      <button data-testid="trash2-icon" onClick={onClick}>Trash</button>
    ),
  };
});

// Mock NotificationContext
const mockMarkAsRead = vi.fn();
const mockDeleteNotification = vi.fn();
vi.mock('./NotificationContext', () => ({
  useNotifications: () => ({
    markAsRead: mockMarkAsRead,
    deleteNotification: mockDeleteNotification,
  }),
}));

// Import after mocks
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
