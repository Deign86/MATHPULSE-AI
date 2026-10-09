// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatProvider } from '../contexts/ChatContext';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import AIChatPage, { QUICK_PROMPTS } from './AIChatPage';
import { getScopeBoundaryResponse } from '../utils/mathScope';

describe('AIChatPage', () => {
  it('renders the tutoring conversation view', () => {
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    render(<AuthContext.Provider value={authValue}><ChatProvider><AIChatPage /></ChatProvider></AuthContext.Provider>);
    expect(screen.getByRole('heading', { name: 'Meet L.O.L.I.' })).toBeInTheDocument();
  });

  it.each(QUICK_PROMPTS.map(({ label, prompt }) => [label, prompt]))('quick-prompt chip "%s" passes the math scope check', (_label, prompt) => {
    expect(getScopeBoundaryResponse(prompt)).toBeNull();
  });
});
