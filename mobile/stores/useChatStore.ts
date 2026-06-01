import { create } from "zustand";
import type { ChatSession, ChatMessage } from "../types/models";
import * as chatService from "../services/chatService";

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  createSession: (topic?: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setActiveSession: (sessionId: string, messages: ChatMessage[]) => void;
  clearSession: () => void;
  clearError: () => void;
  appendStreamingChunk: (messageId: string, chunk: string) => void;
  finalizeStreamingMessage: (messageId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  error: null,
  createSession: async (topic?: string) => {
    try {
      const session = await chatService.createSession(topic);
      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: session.id,
        messages: [],
        error: null,
      }));
    } catch (err: any) {
      set({ error: err.message ?? "Failed to create session" });
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
      userId: "",
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
    } catch (err: any) {
      set({
        error: err.message ?? "Failed to send message",
        isStreaming: false,
      });
    }
  },
  setActiveSession: (sessionId: string, messages: ChatMessage[]) => {
    set({ activeSessionId: sessionId, messages, error: null });
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
}));
