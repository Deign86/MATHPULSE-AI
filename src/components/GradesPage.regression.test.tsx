// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import GradesPage from './GradesPage';

describe('GradesPage anonymous access', () => {
  it('shows no student grade records without an authenticated profile', () => {
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    render(<AuthContext.Provider value={authValue}><GradesPage /></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: /export report/i })).not.toBeInTheDocument();
  });
});
