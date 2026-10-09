// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import AdminSettingsPage from './AdminSettingsPage';

function generalSettingsSnapshot(): DocumentSnapshot {
  // SAFETY: AdminSettingsPage only calls data() on the settings/general snapshot.
  return { data: (): DocumentData => ({ maintenanceMode: false }) } as DocumentSnapshot;
}

beforeEach(() => {
  vi.spyOn(firestore, 'getDoc').mockResolvedValue(generalSettingsSnapshot());
});

afterEach(cleanup);

const tourPages = [{ tab: 'User Management', label: 'User Management' }];

describe('Admin settings tour replay', () => {
  it('replays the full guide or one page guide', async () => {
    const replay = vi.fn();
    await act(async () => {
      render(<AdminSettingsPage onSaveSettings={async () => {}} onReplayTour={replay} tourPages={tourPages} />);
    });
    const replayButton = screen.getByRole('button', { name: 'Replay admin guide' });
    expect(replayButton).toBeEnabled();
    fireEvent.click(replayButton);
    expect(replay).toHaveBeenLastCalledWith();
    fireEvent.click(within(screen.getByRole('group', { name: 'Page guides' })).getByRole('button', { name: 'User Management' }));
    expect(replay).toHaveBeenLastCalledWith('User Management');
  });

  it('requires saving preference edits before leaving for a tour', async () => {
    await act(async () => {
      render(<AdminSettingsPage onSaveSettings={async () => {}} onReplayTour={() => {}} tourPages={tourPages} />);
    });
    fireEvent.click(screen.getAllByRole('switch')[0]);
    expect(screen.getByRole('button', { name: 'Replay admin guide' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'User Management' })).toBeDisabled();
    expect(screen.getByText('Save or clear your changes before starting the guide.')).toBeInTheDocument();
  });

  it('hides the guide card without a replay handler', async () => {
    await act(async () => {
      render(<AdminSettingsPage onSaveSettings={async () => {}} />);
    });
    expect(screen.queryByRole('button', { name: 'Replay admin guide' })).not.toBeInTheDocument();
  });
});
