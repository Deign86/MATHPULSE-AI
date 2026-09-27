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

    expect(screen.getByText(/You're all caught up!/i)).toBeInTheDocument();
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

  it('does not call onClose when clicking on the trigger element', () => {
    const mockOnClose = vi.fn();
    notificationsValue = [];
    isLoadingValue = false;

    const triggerElement = document.createElement('button');
    document.body.appendChild(triggerElement);
    const triggerRef = { current: triggerElement };

    render(<NotificationPanel onClose={mockOnClose} triggerRef={triggerRef} />);

    fireEvent(triggerElement, new MouseEvent('mousedown', {
      bubbles: true,
    }));

    expect(mockOnClose).not.toHaveBeenCalled();
    document.body.removeChild(triggerElement);
  });

  it('calls markAllAsRead when button clicked', () => {
    notificationsValue = [
      { id: 'notif-1', userId: 'user-1', title: 'Test 1', message: 'Msg 1', isRead: false, createdAt: new Date(), type: 'daily_checkin' },
    ];
    unreadCountValue = 1;
    isLoadingValue = false;

    render(<NotificationPanel onClose={() => {}} />);

    const markAllButton = screen.getByRole('button', { name: /mark all notifications as read/i });
    fireEvent.click(markAllButton);

    expect(markAllAsReadMock).toHaveBeenCalled();
  });

  it('renders above the battle overlay z-index', () => {
    const style = document.createElement('style');
    style.textContent = '[class~="z-[250]"] { z-index: 250; } [class~="z-[240]"] { z-index: 240; } [class~="z-[100]"] { z-index: 100; }';
    document.head.append(style);

    const battleOverlay = document.createElement('div');
    battleOverlay.className = 'fixed z-[100]';
    document.body.append(battleOverlay);

    render(<NotificationPanel onClose={() => {}} />);

    const panel = document.querySelector<HTMLElement>('[class~="z-[250]"]');
    const backdrop = document.querySelector<HTMLElement>('[class~="z-[240]"]');
    try {
      expect(panel).not.toBeNull();
      expect(backdrop).not.toBeNull();

      if (panel && backdrop) {
        expect(Number.parseInt(getComputedStyle(panel).zIndex, 10)).toBeGreaterThan(
          Number.parseInt(getComputedStyle(battleOverlay).zIndex, 10),
        );
      }
    } finally {
      style.remove();
      battleOverlay.remove();
    }
  });

  it('paginates the list at 20 rows with a Show more control', () => {
    notificationsValue = Array.from({ length: 25 }, (_, index) => ({
      id: `notif-${index}`,
      userId: 'user-1',
      title: `Test ${index}`,
      message: `Msg ${index}`,
      isRead: index % 2 === 0,
      createdAt: new Date(),
      type: 'message' as const,
    }));
    unreadCountValue = 12;
    isLoadingValue = false;

    render(<NotificationPanel onClose={() => {}} />);

    expect(screen.getByTestId('item-notif-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-notif-19')).toBeInTheDocument();
    expect(screen.queryByTestId('item-notif-20')).not.toBeInTheDocument();
    expect(screen.getByText('12 unread alerts')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show more notifications/i }));

    expect(screen.getByTestId('item-notif-20')).toBeInTheDocument();
    expect(screen.getByTestId('item-notif-24')).toBeInTheDocument();
  });
});
