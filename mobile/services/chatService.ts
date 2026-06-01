import EventSource from 'react-native-sse';
import { auth } from '../lib/firebase';
import { useChatStore } from '../stores/useChatStore';
import type { ChatSession, ChatMessage } from '../types/models';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function createSession(topic?: string): Promise<ChatSession> {
  const now = new Date();
  return {
    id: `session-${Date.now()}`,
    userId: '',
    title: topic ?? 'New Chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };
}

export async function sendMessage(
  sessionId: string,
  content: string,
): Promise<ChatMessage> {
  return {
    id: `msg-${Date.now()}`,
    userId: '',
    role: 'user',
    content,
    timestamp: new Date(),
  };
}

export async function getSessionMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  return [];
}

export async function listSessions(): Promise<ChatSession[]> {
  return [];
}

/**
 * Stream an AI chat response from the backend via SSE.
 *
 * Opens a POST EventSource to /api/chat/stream, feeds token chunks
 * into the Zustand store as they arrive, and resolves when the stream
 * ends or errors.
 *
 * @param sessionId  The active chat session ID (passed to the backend).
 * @param content    The user's message text.
 * @param placeholderId  The ID of the assistant placeholder message in the store.
 * @param history    Previous messages (role + content) to send as conversation context.
 */
export async function sendMessageStream(
  sessionId: string,
  content: string,
  placeholderId: string,
  history: { role: string; content: string }[],
): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not authenticated');

  const userId = auth.currentUser?.uid ?? '';

  return new Promise<void>((resolve) => {
    const es = new EventSource<'chunk' | 'end'>(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        message: content,
        history,
        userId,
        sessionId,
      }),
    });

    es.addEventListener('chunk', (event) => {
      if (event.data) {
        try {
          const payload = JSON.parse(event.data) as { chunk?: string };
          const chunk = payload.chunk ?? '';
          if (chunk) {
            useChatStore.getState().appendStreamingChunk(placeholderId, chunk);
          }
        } catch {
          // Ignore parse errors on malformed chunks
        }
      }
    });

    es.addEventListener('end', () => {
      es.close();
      useChatStore.getState().finalizeStreamingMessage(placeholderId);
      resolve();
    });

    es.addEventListener('error', () => {
      es.close();
      useChatStore.getState().finalizeStreamingMessage(placeholderId);
      resolve();
    });
  });
}
