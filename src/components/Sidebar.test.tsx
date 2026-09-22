/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Sidebar, { getSidebarWidthTransition } from './Sidebar';

const setReducedMotion = (matches: boolean) => {
  window.matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const renderSidebar = () => {
  render(
    <Sidebar
      activeTab="Dashboard"
      setActiveTab={vi.fn()}
      onOpenSettings={vi.fn()}
    />,
  );
};

describe('Sidebar width motion', () => {
  it('uses the width-only tween contract', () => {
    setReducedMotion(false);
    renderSidebar();

    expect(screen.getByRole('complementary').style.willChange).toBe('width');
    expect(getSidebarWidthTransition(false)).toEqual({
      type: 'tween',
      duration: 0.2,
      ease: 'easeInOut',
    });
  });

  it('sets the width tween duration to zero for reduced motion', () => {
    setReducedMotion(true);
    renderSidebar();

    expect(getSidebarWidthTransition(true)).toEqual({
      type: 'tween',
      duration: 0,
      ease: 'easeInOut',
    });
  });
});
