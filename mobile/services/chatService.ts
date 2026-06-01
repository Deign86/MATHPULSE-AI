import EventSource from 'react-native-sse';
import { auth, db, doc, getDoc, setDoc, getDocs, collection, firestoreQuery, where, orderBy, onSnapshot, writeBatch, firestoreServerTimestamp } from '../lib/firebase';
import { useChatStore } from '../stores/useChatStore';
import type { ChatSession, ChatMessage } from '../types/models';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ── Firestore Persistence ──────────────────────────────────────

/**
 * Create a new chat session in Firestore.
 * Returns the ChatSession with a local createdAt for immediate UI use.
 */
export async function createSession(uid: string, topic?: string): Promise<ChatSession> {
  const sessionRef = doc(collection(db, 'chatSessions'));
  const now = new Date();

  const session: ChatSession = {
    id: sessionRef.id,
    userId: uid,
    title: topic ?? 'New Chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };

  await setDoc(sessionRef, {
    ...session,
    createdAt: firestoreServerTimestamp(),
    updatedAt: firestoreServerTimestamp(),
  });

  return session;
}

/**
 * Fetch all active chat sessions for a user, newest first.
 */
export async function getUserChatSessions(uid: string): Promise<ChatSession[]> {
  const q = firestoreQuery(
    collection(db, 'chatSessions'),
    where('userId', '==', uid),
    where('isActive', '==', true),
    orderBy('updatedAt', 'desc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      title: data.title,
      messages: data.messages ?? [],
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      isActive: data.isActive ?? false,
    } as ChatSession;
  });
}

/**
 * Subscribe to real-time updates for a user's active sessions.
 * Returns an unsubscribe function.
 */
export function subscribeToUserSessions(
  uid: string,
  callback: (sessions: ChatSession[]) => void,
): () => void {
  const q = firestoreQuery(
    collection(db, 'chatSessions'),
    where('userId', '==', uid),
    where('isActive', '==', true),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(q, (snapshot) => {
    const sessions: ChatSession[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        title: data.title,
        messages: data.messages ?? [],
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        isActive: data.isActive ?? false,
      } as ChatSession;
    });
    callback(sessions);
  });
}

/**
 * Fetch messages for a session, ordered oldest first.
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const q = firestoreQuery(
    collection(db, 'chatMessages'),
    where('sessionId', '==', sessionId),
    orderBy('timestamp', 'asc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      role: data.role,
      content: data.content,
      timestamp: data.timestamp?.toDate?.() ?? new Date(),
      context: data.context,
    } as ChatMessage;
  });
}

/**
 * Subscribe to real-time message updates for a session.
 * Returns an unsubscribe function.
 */
export function subscribeToSessionMessages(
  sessionId: string,
  callback: (messages: ChatMessage[]) => void,
): () => void {
  const q = firestoreQuery(
    collection(db, 'chatMessages'),
    where('sessionId', '==', sessionId),
    orderBy('timestamp', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp?.toDate?.() ?? new Date(),
        context: data.context,
      } as ChatMessage;
    });
    callback(messages);
  });
}

/**
 * Write a message and atomically bump the session's updatedAt timestamp.
 *
 * @param sessionId  Target session.
 * @param message    The message fields (role, content, optional context).
 *                   userId and sessionId are derived automatically.
 */
export async function addMessageToSession(
  sessionId: string,
  message: {
    role: ChatMessage['role'];
    content: string;
    context?: ChatMessage['context'];
  },
): Promise<ChatMessage> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const messageRef = doc(collection(db, 'chatMessages'));
  const chatMessage: ChatMessage = {
    id: messageRef.id,
    userId: uid,
    role: message.role,
    content: message.content,
    timestamp: new Date(),
    ...(message.context ? { context: message.context } : {}),
  };

  const batch = writeBatch(db);

  batch.set(messageRef, {
    id: chatMessage.id,
    userId: chatMessage.userId,
    role: chatMessage.role,
    content: chatMessage.content,
    sessionId,
    timestamp: firestoreServerTimestamp(),
    ...(chatMessage.context ? { context: chatMessage.context } : {}),
  });

  batch.update(doc(db, 'chatSessions', sessionId), {
    updatedAt: firestoreServerTimestamp(),
  });

  await batch.commit();

  return chatMessage;
}

/**
 * Mark a session as inactive (end session).
 */
export async function endSession(sessionId: string): Promise<void> {
  await setDoc(
    doc(db, 'chatSessions', sessionId),
    { isActive: false, updatedAt: firestoreServerTimestamp() },
    { merge: true },
  );
}

/**
 * Soft-delete a session by marking it inactive.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await setDoc(
    doc(db, 'chatSessions', sessionId),
    { isActive: false, updatedAt: firestoreServerTimestamp() },
    { merge: true },
  );
}

// ── SSE Streaming (UNCHANGED) ──────────────────────────────────

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
