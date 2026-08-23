/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authNs from '../contexts/AuthContext';
import type { AuthContextType } from '../contexts/AuthContext';
import { type StudentProfile } from '../types/models';
import * as notificationsNs from '@/features/notifications';
import * as firestore from 'firebase/firestore';
import * as ModuleFolderCardNs from './ModuleFolderCard';
import * as ModulesMascotNs from './ModulesMascot';
import * as DailyCheckInModalNs from './DailyCheckInModal';
import * as PracticeCenterNs from './PracticeCenter';

// Firestore IO stubs: firebase deps are inlined in vitest.config, so these
// namespaces are configurable. No real network/IO is touched.
vi.spyOn(firestore, 'collection').mockImplementation(vi.fn());
vi.spyOn(firestore, 'query').mockImplementation(vi.fn());
vi.spyOn(firestore, 'where').mockImplementation(vi.fn());
// SAFETY: ModulesPage only consumes the unsubscribe function returned by onSnapshot.
vi.spyOn(firestore, 'onSnapshot').mockImplementation((() => vi.fn()) as typeof firestore.onSnapshot);

const testUserProfile: StudentProfile = {
  uid: 'user-1',
  email: 'user-1@example.test',
  name: 'Test Student',
  role: 'student',
  grade: '11',
  school: 'Test SHS',
  enrollmentDate: '2026-01-01',
  major: 'STEM',
  gpa: '90',
  level: 1,
  currentXP: 0,
  totalXP: 0,
  atRiskSubjects: [],
  hasTakenDiagnostic: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

vi.spyOn(authNs, 'useAuth').mockReturnValue({
  currentUser: null,
  userProfile: testUserProfile,
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => {},
});

vi.spyOn(notificationsNs, 'notify').mockImplementation(() => Promise.resolve());

// Child component seams stay rendered-but-inert so page-level behavior is isolated.
vi.spyOn(ModuleFolderCardNs, 'default').mockImplementation(
  () => React.createElement('div', null, 'ModuleCard'),
);
vi.spyOn(ModulesMascotNs, 'default').mockImplementation(
  () => React.createElement('div', null, 'ModulesMascot'),
);
vi.spyOn(DailyCheckInModalNs, 'default').mockImplementation(() => null);
vi.spyOn(PracticeCenterNs, 'default').mockImplementation(
  () => React.createElement('div', null, 'Practice Center Stub'),
);

import ModulesPage from './ModulesPage';

const renderModulesPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ModulesPage />
    </QueryClientProvider>,
  );

describe('ModulesPage', () => {
  it('renders Practice tab and shows Practice Center when selected', async () => {
    renderModulesPage();

    const practiceTab = screen.getByRole('button', { name: /practice/i });
    fireEvent.click(practiceTab);

    expect(await screen.findByText(/practice center stub/i)).toBeInTheDocument();
  });
});
