import { create } from "zustand";
import type { ChatSession, ChatMessage } from "../types/models";
import { auth } from "../lib/firebase";
import * as chatService from "../services/chatService";

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  createSession: (topic?: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setActiveSession: (sessionId: string) => void;
  clearSession: () => void;
  clearError: () => void;
  appendStreamingChunk: (messageId: string, chunk: string) => void;
  finalizeStreamingMessage: (messageId: string) => void;
  loadSessions: (uid: string) => Promise<void>;
  loadSessionMessages: (sessionId: string) => Promise<void>;
  setSessions: (sessions: ChatSession[]) => void;
  endSession: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  error: null,

  createSession: async (topic?: string) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        set({ error: "Not authenticated" });
        return;
      }
      const session = await chatService.createSession(uid, topic);
      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: session.id,
        messages: [],
        error: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      set({ error: message });
    }
  },

  sendMessage: async (content: string) => {
    const { activeSessionId, messages: prevMessages } = get();
    if (!activeSessionId) {
      set({ error: "No active session" });
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      userId: auth.currentUser?.uid ?? "",
      role: "user",
      content,
      timestamp: new Date(),
    };

    const placeholder: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      userId: "",
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    // Persist user message to Firestore before streaming
    try {
      await chatService.addMessageToSession(activeSessionId, {
        role: userMsg.role,
        content: userMsg.content,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to persist user message";
      console.error(message);
    }

    set((state) => ({
      messages: [...state.messages, userMsg, placeholder],
      isStreaming: true,
      error: null,
    }));

    try {
      const history = prevMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      await chatService.sendMessageStream(
        activeSessionId,
        content,
        placeholder.id,
        history,
      );

      // Persist assistant message to Firestore after streaming completes
      const currentMessages = get().messages;
      const assistantMsg = currentMessages.find((m) => m.id === placeholder.id);
      if (assistantMsg && assistantMsg.content.trim()) {
        await chatService.addMessageToSession(activeSessionId, {
          role: assistantMsg.role,
          content: assistantMsg.content,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      set({ error: message, isStreaming: false });
    }
  },

  setActiveSession: (sessionId: string) => {
    set({ activeSessionId: sessionId, messages: [], error: null });
  },

  clearSession: () => {
    set({ activeSessionId: null, messages: [], isStreaming: false, error: null });
  },

  clearError: () => {
    set({ error: null });
  },

  appendStreamingChunk: (messageId: string, chunk: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content: m.content + chunk } : m
      ),
    }));
  },

  finalizeStreamingMessage: (messageId: string) => {
    set({ isStreaming: false });
  },

  loadSessions: async (uid: string) => {
    try {
      const sessions = await chatService.getUserChatSessions(uid);
      set({ sessions, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load sessions";
      set({ error: message });
    }
  },

  loadSessionMessages: async (sessionId: string) => {
    try {
      const messages = await chatService.getSessionMessages(sessionId);
      set({ messages, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load messages";
      set({ error: message });
    }
  },

  setSessions: (sessions: ChatSession[]) => {
    set({ sessions });
  },

  endSession: async (sessionId: string) => {
    try {
      await chatService.endSession(sessionId);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
        error: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to end session";
      set({ error: message });
    }
  },
}));
