import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  type FieldValue,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage, ChatSession } from '../types/models';
import { toDateSafe } from '../utils/timestamp';

/** Firestore payload for a new chat message; the timestamp uses the server sentinel. */

// Issue #159: read failures must be distinguishable from legitimately empty
// results, so offline chat history shows an error state instead of a blank list.
export class ChatLoadError extends Error {
  readonly offline: boolean;
  declare cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'ChatLoadError';
    this.cause = cause;
    this.offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  }
}

interface ChatMessagePayload {  id: string;
  userId: string;
  role: ChatMessage['role'];
  content: string;
  sessionId: string;
  timestamp: FieldValue | null;
  context?: ChatMessage['context'];
}

// Create chat session
export const createChatSession = async (
  userId: string,
  title: string = 'New Conversation'
): Promise<ChatSession> => {
  try {
    const sessionRef = doc(collection(db, 'chatSessions'));
    const session: ChatSession = {
      id: sessionRef.id,
      userId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    await setDoc(sessionRef, {
      ...session,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return session;
  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

// Get user chat sessions
export const getUserChatSessions = async (userId: string): Promise<ChatSession[]> => {
  try {
    const sessionsQuery = query(
      collection(db, 'chatSessions'),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(sessionsQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // SAFETY: session docs are written by createChatSession with the ChatSession field set.
      return {
        ...data,
        createdAt: toDateSafe(data.createdAt),
        updatedAt: toDateSafe(data.updatedAt),
      } as ChatSession;
    });
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    throw new ChatLoadError('Unable to load chat history. Check your connection and retry.', error);
  }
};

// Get chat session
export const getChatSession = async (sessionId: string): Promise<ChatSession | null> => {
  try {
    const sessionDoc = await getDoc(doc(db, 'chatSessions', sessionId));
    
    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      // SAFETY: session docs are written by createChatSession with the ChatSession field set.
      return {
        ...data,
        createdAt: toDateSafe(data.createdAt),
        updatedAt: toDateSafe(data.updatedAt),
      } as ChatSession;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting chat session:', error);
    throw new ChatLoadError('Unable to load this conversation. Check your connection and retry.', error);
  }
};

// Add message to session
export const addMessageToSession = async (
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  context?: {
    subjectId?: string;
    moduleId?: string;
    lessonId?: string;
  }
): Promise<ChatMessage> => {
  try {
    const messageRef = doc(collection(db, 'chatMessages'));
    const message: ChatMessage = {
      id: messageRef.id,
      userId: '', // Will be set from session
      role,
      content,
      timestamp: new Date(),
    };
    if (context) {
      message.context = context;
    }

    // Get session to get userId
    const sessionDoc = await getDoc(doc(db, 'chatSessions', sessionId));
    if (sessionDoc.exists()) {
      message.userId = sessionDoc.data().userId;
    }

    // Build Firestore payload, excluding undefined values
    const payload: ChatMessagePayload = {
      id: message.id,
      userId: message.userId,
      role: message.role,
      content: message.content,
      sessionId,
      timestamp: serverTimestamp(),
    };
    if (message.context) {
      payload.context = message.context;
    }

    // Save message
    await setDoc(messageRef, payload);

    // Update session
    await updateDoc(doc(db, 'chatSessions', sessionId), {
      updatedAt: serverTimestamp(),
    });

    return message;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

// Get session messages
export const getSessionMessages = async (sessionId: string, userId: string): Promise<ChatMessage[]> => {
  try {
    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('sessionId', '==', sessionId),
      where('userId', '==', userId),  // Filter by userId for security rules
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(messagesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // SAFETY: message docs are written by addMessageToSession with the ChatMessage field set.
      return {
        ...data,
        timestamp: toDateSafe(data.timestamp),
      } as ChatMessage;
    });
  } catch (error) {
    console.error('Error getting session messages:', error);
    throw new ChatLoadError('Unable to load conversation messages. Check your connection and retry.', error);
  }
};

// Update session title
export const updateSessionTitle = async (sessionId: string, title: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'chatSessions', sessionId), {
      title,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating session title:', error);
    throw error;
  }
};

// Delete session
export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'chatSessions', sessionId), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};
