// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import MobileBottomNav from './MobileBottomNav';

afterEach(cleanup);
describe('student tour phone navigation', () => {
  it('reveals nested destinations and closes the menu after the tour step', () => {
    const { rerender } = render(<MobileBottomNav activeTab="Dashboard" onSelectTab={() => {}} tourMenu="Grades" />);
    expect(screen.getByRole('button', { name: 'Module Options: Modules and Assessment' })).toHaveAttribute('aria-expanded', 'true');
    rerender(<MobileBottomNav activeTab="Grades" onSelectTab={() => {}} tourMenu="Avatar Studio" />);
    expect(screen.getByRole('button', { name: 'AI Options: AI Chat and Avatar Studio' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Module Options: Modules and Assessment' })).toHaveAttribute('aria-expanded', 'false');
    rerender(<MobileBottomNav activeTab="Grades" onSelectTab={() => {}} tourMenu={null} />);
    expect(screen.getByRole('button', { name: 'AI Options: AI Chat and Avatar Studio' })).toHaveAttribute('aria-expanded', 'false');
  });
});
