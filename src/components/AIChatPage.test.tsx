// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as ChatContextModule from '../contexts/ChatContext';
import { ChatProvider } from '../contexts/ChatContext';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import AIChatPage, { QUICK_PROMPTS } from './AIChatPage';
import { getScopeBoundaryResponse } from '../utils/mathScope';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };

describe('AIChatPage', () => {
  it('renders the tutoring conversation view', () => {
    render(<AuthContext.Provider value={authValue}><ChatProvider><AIChatPage /></ChatProvider></AuthContext.Provider>);
    expect(screen.getByRole('heading', { name: 'Meet L.O.L.I.' })).toBeInTheDocument();
  });

  it.each(QUICK_PROMPTS.map(({ label, prompt }) => [label, prompt]))('quick-prompt chip "%s" passes the math scope check', (_label, prompt) => {
    expect(getScopeBoundaryResponse(prompt)).toBeNull();
  });

  it('deletes a conversation only after the student confirms', () => {
    const deleteSession = vi.fn();
    const session: ChatContextModule.ChatSession = {
      id: 'chat-1',
      title: 'Limits practice',
      date: 'Today',
      messageCount: 2,
      preview: 'What is the limit of 1/x?',
      topics: [],
      messages: [],
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    };
    vi.spyOn(ChatContextModule, 'useChatContext').mockReturnValue({
      sessions: [session],
      activeSessionId: null,
      isLoading: false,
      loadingSessionId: null,
      sessionsLoaded: true,
      sessionsLoadError: null,
      retrySessionsLoad: vi.fn(),
      setActiveSessionId: vi.fn(),
      createNewSession: vi.fn(() => 'chat-2'),
      addMessageToSession: vi.fn(),
      sendMessage: vi.fn(async () => undefined),
      updateSessionTitle: vi.fn(),
      deleteSession,
      getActiveSession: () => null,
      generateTitleFromMessages: () => '',
    });

    render(<AuthContext.Provider value={authValue}><AIChatPage /></AuthContext.Provider>);
    const deleteButton = screen.getByRole('button', { name: 'Delete conversation: Limits practice' });

    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deleteSession).not.toHaveBeenCalled();

    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteSession).toHaveBeenCalledWith('chat-1');
  });
});
