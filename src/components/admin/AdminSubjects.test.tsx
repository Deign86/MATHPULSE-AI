// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as AuthContext from '../../contexts/AuthContext';
import * as SubjectAvailability from '../../hooks/useSubjectAvailability';
import * as platformConfigService from '../../services/platformConfigService';
import { SHS_MATH_SUBJECTS } from '../../data/subjects';
import AdminSubjects from './AdminSubjects';

afterEach(() => cleanup());

describe('AdminSubjects', () => {
  it('includes shelved subjects in the locked total when config is missing', () => {
    // SAFETY: The subject overview reads only the profile UID from the authentication context.
    const authSpy = vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ userProfile: { uid: 'admin-1' } } as ReturnType<typeof AuthContext.useAuth>);
    const availabilitySpy = vi.spyOn(SubjectAvailability, 'useSubjectAvailability').mockReturnValue({
      availability: {},
      config: null,
      loading: false,
      error: null,
      isSubjectAvailable: () => true,
      getSubjectEntry: () => undefined,
    });

    try {
      render(<AdminSubjects />);
      const shelvedCount = SHS_MATH_SUBJECTS.filter((subject) => 'shelved' in subject && subject.shelved).length;
      expect(shelvedCount).toBeGreaterThan(0);
      expect(screen.getByText('Materials not yet linked').parentElement?.querySelector('h3')).toHaveTextContent(String(shelvedCount));
    } finally {
      authSpy.mockRestore();
      availabilitySpy.mockRestore();
    }
  });

  it('reflects later real-time changes after a successful local toggle', async () => {
    const subject = SHS_MATH_SUBJECTS.find((entry) => !('shelved' in entry && entry.shelved));
    if (!subject) throw new Error('The test needs an active subject');
    // SAFETY: The overview only reads the profile UID when toggling a subject.
    const authSpy = vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ userProfile: { uid: 'admin-1' } } as ReturnType<typeof AuthContext.useAuth>);
    const initialEntry = { available: false, pdfPath: null, lastUpdated: new Date('2026-10-01') };
    const hookState = {
      availability: { [subject.id]: initialEntry },
      config: null,
      loading: false,
      error: null,
      isSubjectAvailable: () => true,
      getSubjectEntry: () => undefined,
    };
    const availabilitySpy = vi.spyOn(SubjectAvailability, 'useSubjectAvailability').mockReturnValue(hookState);
    const toggleSpy = vi.spyOn(platformConfigService, 'toggleSubjectAvailability').mockResolvedValue(undefined);
    const getToggle = () => screen.getAllByRole('switch', { name: `Toggle ${subject.name} availability` })[0];

    try {
      const view = render(<AdminSubjects />);
      fireEvent.click(getToggle());
      await waitFor(() => expect(toggleSpy).toHaveBeenCalledWith(subject.id, true, 'admin-1'));
      await waitFor(() => expect(getToggle()).toHaveAttribute('data-state', 'checked'));

      availabilitySpy.mockReturnValue({ ...hookState, availability: { [subject.id]: { ...initialEntry, available: true } } });
      view.rerender(<AdminSubjects />);
      availabilitySpy.mockReturnValue({ ...hookState, availability: { [subject.id]: { ...initialEntry, available: false } } });
      view.rerender(<AdminSubjects />);

      expect(getToggle()).toHaveAttribute('data-state', 'unchecked');
    } finally {
      authSpy.mockRestore();
      availabilitySpy.mockRestore();
      toggleSpy.mockRestore();
    }
  });
});
