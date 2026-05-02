// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// Top-level mock variables (hoisted with vi.mock)
let unreadCountValue = 0;

// Mock NotificationContext - must be before imports
vi.mock('./NotificationContext', () => ({
  useNotifications: vi.fn(() => ({ unreadCount: unreadCountValue })),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock NotificationPanel
vi.mock('./NotificationPanel', () => ({
  NotificationPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="panel">
      Panel Content
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Import after mocks
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
