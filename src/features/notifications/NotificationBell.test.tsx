// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import * as notificationContextNs from './NotificationContext';
import * as notificationPanelNs from './NotificationPanel';

// Mutable unread-count fixture read by the context seam on every render.
let unreadCountValue = 0;

// Context seam: spy on the real hook; unreadCountValue drives the badge.
// SAFETY: the partial stub only omits context fields the bell never reads.
vi.spyOn(notificationContextNs, 'useNotifications').mockImplementation(
  () => ({ unreadCount: unreadCountValue }) as ReturnType<typeof notificationContextNs.useNotifications>,
);

// Panel seam: rendered-but-inert stub isolates bell toggle behavior.
// SAFETY: the stub preserves the onClose prop contract consumed by the bell.
vi.spyOn(notificationPanelNs, 'NotificationPanel').mockImplementation(
  (({ onClose }: { onClose: () => void }) => (
    <div data-testid="panel">
      Panel Content
      <button onClick={onClose}>Close</button>
    </div>
  )) as typeof notificationPanelNs.NotificationPanel,
);

import { NotificationBell } from './NotificationBell';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unreadCountValue = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders bell icon', () => {
    unreadCountValue = 0;
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    unreadCountValue = 5;
    render(<NotificationBell />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays 99+ when unread count exceeds 99', () => {
    unreadCountValue = 150;
    render(<NotificationBell />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('toggles panel on click', () => {
    unreadCountValue = 3;
    render(<NotificationBell />);

    // Panel should not be visible initially
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    // Panel should be visible
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('closes panel when clicking outside', () => {
    unreadCountValue = 3;
    render(<NotificationBell />);

    // Open panel
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByTestId('panel')).toBeInTheDocument();

    // Click outside
    fireEvent(document, new MouseEvent('mousedown', { bubbles: true }));

    // Panel should close
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });
});
