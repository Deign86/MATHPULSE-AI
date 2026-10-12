// @vitest-environment jsdom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirstUseGuidePrompt } from './FirstUseGuidePrompt';

afterEach(cleanup);

interface OfferOwnerProps {
  onPlay: () => void;
  onSkip: () => void;
}

/** Closes the offer on an answer, as useOnboardingTour does. */
function OfferOwner({ onPlay, onSkip }: OfferOwnerProps) {
  const [open, setOpen] = useState(true);
  return (
    <FirstUseGuidePrompt
      open={open}
      onPlay={() => {
        setOpen(false);
        onPlay();
      }}
      onSkip={() => {
        setOpen(false);
        onSkip();
      }}
    />
  );
}

describe('first-use guide prompt', () => {
  it('shows nothing while no offer is pending', () => {
    render(<FirstUseGuidePrompt open={false} onPlay={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('asks before playing and plays only from Play tutorial', async () => {
    const play = vi.fn();
    const skip = vi.fn();
    render(<OfferOwner onPlay={play} onSkip={skip} />);
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Play the tutorial now?');
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(/introduce you to MathPulse AI/);
    fireEvent.click(screen.getByRole('button', { name: 'Play tutorial' }));
    expect(play).toHaveBeenCalledOnce();
    expect(skip).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('tells a student who skips where to find the tutorial later', async () => {
    const play = vi.fn();
    const skip = vi.fn();
    render(<OfferOwner onPlay={play} onSkip={skip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(skip).toHaveBeenCalledOnce();
    const info = await screen.findByRole('alertdialog', { name: 'You can play it later' });
    expect(info).toHaveAccessibleDescription(/\? button.*Settings/);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(play).not.toHaveBeenCalled();
  });

  it('moves focus to the ? button after Got it', async () => {
    render(
      <>
        <button type="button" aria-label="Guide for this page">?</button>
        <OfferOwner onPlay={vi.fn()} onSkip={vi.fn()} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guide for this page', hidden: true })).toHaveFocus());
  });

  it('treats Escape as Skip', async () => {
    const skip = vi.fn();
    render(<OfferOwner onPlay={vi.fn()} onSkip={skip} />);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(skip).toHaveBeenCalledOnce();
    expect(await screen.findByRole('alertdialog', { name: 'You can play it later' })).toBeInTheDocument();
  });
});
