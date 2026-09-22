/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MicroLessonDeck } from './MicroLessonDeck';
import type { MicroLessonCardProps } from './MicroLessonCard';

const lessonCards: readonly MicroLessonCardProps[] = [
  {
    phase: 'Activation',
    title: 'Wake up the pattern',
    body: 'Spot the change between two neighboring terms.',
    minutes: 2,
  },
  {
    phase: 'Demonstration',
    title: 'Watch the move',
    body: 'Follow one worked example from clue to equation.',
    katex: 'a_n = a_1 + (n - 1)d',
  },
  {
    phase: 'Application',
    title: 'Try the next step',
    body: 'Use the pattern to predict the next term.',
  },
  {
    phase: 'Integration',
    title: 'Take it to the arena',
    body: 'Put your new pattern skill into a quick battle.',
    minutes: 4,
  },
];

describe('MicroLessonDeck', () => {
  it('renders four typed cards as progress tabs', () => {
    render(<MicroLessonDeck cards={lessonCards} />);

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'Wake up the pattern' })).toBeInTheDocument();
    expect(screen.getByText('2 min quest')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-controls');
  });

  it('advances by dot click and keyboard navigation', async () => {
    render(<MicroLessonDeck cards={lessonCards} />);

    const progressTabs = screen.getAllByRole('tab');
    fireEvent.click(progressTabs[1]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Watch the move' })).toBeInTheDocument();
    });
    expect(progressTabs[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(progressTabs[1], { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Try the next step' })).toBeInTheDocument();
    });
    expect(progressTabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('3 min quest')).toBeInTheDocument();
  });

  it('renders optional KaTeX content', async () => {
    render(<MicroLessonDeck cards={[lessonCards[1]]} />);

    await waitFor(() => {
      expect(document.querySelector('.katex')).not.toBeNull();
    });
  });

  it('keeps the battle CTA linked and emits app navigation', async () => {
    render(<MicroLessonDeck cards={lessonCards} />);

    fireEvent.click(screen.getAllByRole('tab')[3]);
    const battleLink = await screen.findByRole('link', { name: /quiz battle/i });
    const navigationHandler = vi.fn();
    window.addEventListener('mathpulse:navigate', navigationHandler);

    expect(battleLink).toHaveAttribute('href', '/battle');
    fireEvent.click(battleLink);

    expect(navigationHandler).toHaveBeenCalledTimes(1);
    const navigateEvent = navigationHandler.mock.calls[0]?.[0];
    expect(navigateEvent).toBeInstanceOf(CustomEvent);
    if (navigateEvent instanceof CustomEvent) {
      expect(navigateEvent.detail).toEqual({ tab: 'Quiz Battle' });
    }

    window.removeEventListener('mathpulse:navigate', navigationHandler);
  });
});
