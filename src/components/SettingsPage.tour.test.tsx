// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage';

afterEach(cleanup);
describe('Settings student tour replay', () => {
  it('requires saving preference edits before leaving for a tour', async () => {
    render(<SettingsPage profileData={{ name: 'Student', role: 'student' }} onSaveProfile={() => {}} onSaveSettings={async () => {}} onReplayTour={() => {}} />);
    const replay = screen.getByRole('button', { name: 'Replay student guide' });
    expect(replay).toBeEnabled();
    fireEvent.click(screen.getAllByRole('switch')[0]);
    expect(replay).toBeDisabled();
    expect(screen.getByText('Save or clear your changes before starting the guide.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(replay).toBeEnabled());
  });

  it('does not expose a student replay action to other role consumers', () => {
    render(<SettingsPage profileData={{ name: 'Teacher', role: 'teacher' }} onSaveProfile={() => {}} onSaveSettings={async () => {}} />);
    expect(screen.queryByRole('button', { name: 'Replay student guide' })).not.toBeInTheDocument();
  });
});

it('protects unfinished password edits when replay would leave Settings', async () => {
  render(<SettingsPage profileData={{ name: 'Student', role: 'student' }} onSaveProfile={() => {}} onSaveSettings={async () => {}} onReplayTour={() => {}} />);
  fireEvent.click(screen.getAllByRole('button', { name: /Login & Password/ })[0]);
  fireEvent.change((await screen.findAllByPlaceholderText('••••••••'))[0], { target: { value: 'unfinished-password' } });
  expect(screen.getByRole('button', { name: 'Replay student guide' })).toBeDisabled();
});

it('lists page guides that start one page and wait for unsaved edits', () => {
  const replay = vi.fn();
  render(<SettingsPage profileData={{ name: 'Student', role: 'student' }} onSaveProfile={() => {}} onSaveSettings={async () => {}} onReplayTour={replay} tourPages={[{ tab: 'Quiz Battle', label: 'Quiz Battle' }, { tab: 'Grades', label: 'Grades & Assessment' }]} />);
  const guides = screen.getByRole('group', { name: 'Page guides' });
  fireEvent.click(within(guides).getByRole('button', { name: 'Quiz Battle' }));
  expect(replay).toHaveBeenLastCalledWith('Quiz Battle');
  fireEvent.click(screen.getByRole('button', { name: 'Replay student guide' }));
  expect(replay).toHaveBeenLastCalledWith();
  fireEvent.click(screen.getAllByRole('switch')[0]);
  expect(within(guides).getByRole('button', { name: 'Grades & Assessment' })).toBeDisabled();
});
