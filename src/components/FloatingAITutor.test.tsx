// @vitest-environment jsdom
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import { ChatProvider } from '../contexts/ChatContext';
import FloatingAITutor from './FloatingAITutor';

describe('FloatingAITutor', () => {
  it('opens its tutor panel for a student', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    render(<AuthContext.Provider value={authValue}><ChatProvider><FloatingAITutor constraintsRef={createRef<HTMLDivElement>()} onFullScreen={vi.fn()} /></ChatProvider></AuthContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'Open AI tutor chat' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
