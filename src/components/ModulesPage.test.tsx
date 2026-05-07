/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [] }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { uid: 'user-1', grade: '11' } }),
}));

vi.mock('../hooks/useCurriculum', () => ({
  useCurriculum: () => ({ isLoading: false, refetch: vi.fn() }),
}));

vi.mock('../services/dailyCheckInService', () => ({
  getDailyCheckInState: vi.fn(() => Promise.resolve({ currentDay: 1, claimedDays: [], lastClaimDate: '' })),
  claimDailyCheckIn: vi.fn(),
}));

vi.mock('@/features/notifications', () => ({
  notify: vi.fn(() => Promise.resolve()),
}));

vi.mock('../services/assessmentService', () => ({
  getStudentCompetencyProfile: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('./ModuleFolderCard', () => ({
  default: () => <div>ModuleCard</div>,
}));

vi.mock('./ModulesMascot', () => ({
  default: () => <div>ModulesMascot</div>,
}));

vi.mock('./DailyCheckInModal', () => ({
  default: () => null,
}));

vi.mock('./PracticeCenter', () => ({
  default: () => <div>Practice Center Stub</div>,
}));

import ModulesPage from './ModulesPage';

describe('ModulesPage', () => {
  it('renders Practice tab and shows Practice Center when selected', async () => {
    render(<ModulesPage />);

    const practiceTab = screen.getByRole('button', { name: /practice/i });
    fireEvent.click(practiceTab);

    expect(await screen.findByText(/practice center stub/i)).toBeInTheDocument();
  });
});
