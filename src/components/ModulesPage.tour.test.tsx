/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authNs from '../contexts/AuthContext';
import type { StudentProfile } from '../types/models';
import * as notificationsNs from '@/features/notifications';
import * as firestore from 'firebase/firestore';
import * as ModuleFolderCardNs from './ModuleFolderCard';
import * as ModulesMascotNs from './ModulesMascot';
import * as DailyCheckInModalNs from './DailyCheckInModal';
import * as PracticeCenterNs from './PracticeCenter';
import * as dailyRewardNs from '../hooks/useDailyReward';

vi.spyOn(firestore, 'collection').mockImplementation(vi.fn());
vi.spyOn(firestore, 'query').mockImplementation(vi.fn());
vi.spyOn(firestore, 'where').mockImplementation(vi.fn());
// SAFETY: ModulesPage only consumes the unsubscribe function returned by onSnapshot.
vi.spyOn(firestore, 'onSnapshot').mockImplementation((() => vi.fn()) as typeof firestore.onSnapshot);

const learner: StudentProfile = {
  uid: 'tour-learner', email: 'learner@example.test', name: 'Tour Learner', role: 'student',
  grade: '11', school: 'Test SHS', enrollmentDate: '2026-01-01', major: 'STEM', gpa: '90',
  level: 1, currentXP: 0, totalXP: 0, atRiskSubjects: [], hasTakenDiagnostic: false,
  createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'),
};
vi.spyOn(authNs, 'useAuth').mockReturnValue({
  currentUser: null, userProfile: learner, loading: false, isLoggedIn: true, userRole: 'student', refreshProfile: async () => {},
});
vi.spyOn(notificationsNs, 'notify').mockImplementation(() => Promise.resolve());
vi.spyOn(ModuleFolderCardNs, 'default').mockImplementation(() => React.createElement('div', null, 'ModuleCard'));
vi.spyOn(ModulesMascotNs, 'default').mockImplementation(() => React.createElement('div', null, 'ModulesMascot'));
vi.spyOn(PracticeCenterNs, 'default').mockImplementation(() => React.createElement('div', null, 'Practice Center Stub'));
vi.spyOn(DailyCheckInModalNs, 'default').mockImplementation(({ isOpen, onClose }) => (isOpen
  ? React.createElement(React.Fragment, null,
    React.createElement('div', null, 'Daily check-in open'),
    React.createElement('button', { type: 'button', onClick: onClose }, 'Close check-in'))
  : null));
const unclaimedToday: ReturnType<typeof dailyRewardNs.useDailyReward> = {
  weekRewards: [], todayReward: null, canClaim: true, isClaiming: false, claimedDays: [], currentStreak: 0,
  longestStreak: 0, totalClaimed: 0, hintTokens: 0, streakShields: 0, activeMultiplier: null, timeUntilReset: '',
  showModal: false, lastClaimResult: null, error: null, claim: async () => null, dismissModal: () => {}, refresh: async () => {},
};
const dailyReward = vi.spyOn(dailyRewardNs, 'useDailyReward').mockReturnValue(unclaimedToday);

import ModulesPage from './ModulesPage';

afterEach(cleanup);

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const page = (tourActive: boolean, tourView: string | null) => (
  <QueryClientProvider client={client}>
    <ModulesPage tourActive={tourActive} tourView={tourView} />
  </QueryClientProvider>
);

describe('ModulesPage during the student guide', () => {
  it('holds the daily check-in until the guide closes', async () => {
    const { rerender } = render(page(true, 'modules'));
    await new Promise(resolve => setTimeout(resolve, 700));
    expect(screen.queryByText('Daily check-in open')).not.toBeInTheDocument();
    rerender(page(false, null));
    expect(await screen.findByText('Daily check-in open')).toBeInTheDocument();
  });

  it('shows the explained tab and returns to the student\'s tab afterwards', async () => {
    const { rerender, container } = render(page(true, 'practice'));
    expect(await screen.findByText('Practice Center Stub', {}, { timeout: 5000 })).toBeInTheDocument();
    rerender(page(false, null));
    await waitFor(() => expect(screen.queryByText('Practice Center Stub')).not.toBeInTheDocument(), { timeout: 5000 });
    expect(container.querySelector('[data-tour="module-grid"]')).toBeInTheDocument();
  });
});

describe('ModulesPage daily check-in', () => {
  it('reopens the check-in from Claim daily reward after it was closed', async () => {
    render(page(false, null));
    expect(await screen.findByText('Daily check-in open')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim daily reward' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close check-in' }));
    expect(screen.queryByText('Daily check-in open')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Claim daily reward' }));
    expect(screen.getByText('Daily check-in open')).toBeInTheDocument();
  });

  it('offers no reopen button once today\'s reward is claimed', async () => {
    dailyReward.mockReturnValue({ ...unclaimedToday, canClaim: false });
    render(page(false, null));
    await new Promise(resolve => setTimeout(resolve, 700));
    expect(screen.queryByRole('button', { name: 'Claim daily reward' })).not.toBeInTheDocument();
    dailyReward.mockReturnValue(unclaimedToday);
  });

  it('hides the dev-only daily rewards reset unless VITE_SHOW_DEV_RESET is set', async () => {
    render(page(false, null));
    expect(await screen.findByText('Daily check-in open')).toBeInTheDocument();
    expect(screen.queryByTitle('Reset Daily Rewards (Dev Only)')).not.toBeInTheDocument();
  });
});
