// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TeacherSettingsPage from './TeacherSettingsPage';

afterEach(cleanup);

describe('Teacher settings tour replay', () => {
  it('replays the full guide or one page guide', () => {
    const replay = vi.fn();
    render(<TeacherSettingsPage onSaveSettings={async () => {}} onReplayTour={replay} tourPages={[{ tab: 'analytics', label: 'Analytics' }]} />);
    const replayButton = screen.getByRole('button', { name: 'Replay teacher guide' });
    expect(replayButton).toBeEnabled();
    fireEvent.click(replayButton);
    expect(replay).toHaveBeenLastCalledWith();
    fireEvent.click(within(screen.getByRole('group', { name: 'Page guides' })).getByRole('button', { name: 'Analytics' }));
    expect(replay).toHaveBeenLastCalledWith('analytics');
  });

  it('requires saving preference edits before leaving for a tour', () => {
    render(<TeacherSettingsPage onSaveSettings={async () => {}} onReplayTour={() => {}} tourPages={[{ tab: 'analytics', label: 'Analytics' }]} />);
    fireEvent.click(screen.getAllByRole('switch')[0]);
    expect(screen.getByRole('button', { name: 'Replay teacher guide' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Analytics' })).toBeDisabled();
    expect(screen.getByText('Save or clear your changes before starting the guide.')).toBeInTheDocument();
  });

  it('hides the guide card without a replay handler', () => {
    render(<TeacherSettingsPage onSaveSettings={async () => {}} />);
    expect(screen.queryByRole('button', { name: 'Replay teacher guide' })).not.toBeInTheDocument();
  });
});
