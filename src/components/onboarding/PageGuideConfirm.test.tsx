// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageGuideConfirm } from './PageGuideConfirm';

afterEach(cleanup);

function renderConfirm(guide: string | null, onPlay: () => void) {
  render(
    <PageGuideConfirm guide={guide} audience="student" onPlay={onPlay}>
      <button type="button" aria-label="Guide for this page">?</button>
    </PageGuideConfirm>,
  );
  return screen.getByRole('button', { name: 'Guide for this page' });
}

describe('page guide confirmation', () => {
  it('shows nothing until the ? button is pressed', () => {
    renderConfirm('Modules', vi.fn());
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('names the page guide and plays it only from Play guide', async () => {
    const play = vi.fn();
    fireEvent.click(renderConfirm('Modules', play));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Play the Modules guide?');
    fireEvent.click(screen.getByRole('button', { name: 'Play guide' }));
    expect(play).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('closes without playing on Skip and Escape, returning focus to the ? button', async () => {
    const play = vi.fn();
    const trigger = renderConfirm('Modules', play);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(play).not.toHaveBeenCalled();
  });

  it('offers the full guide on a page without its own', () => {
    fireEvent.click(renderConfirm(null, vi.fn()));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Play the full student guide?');
  });
});
