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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage, ChatSession } from '../types/models';

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
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ChatSession;
    });
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    return [];
  }
};

// Get chat session
export const getChatSession = async (sessionId: string): Promise<ChatSession | null> => {
  try {
    const sessionDoc = await getDoc(doc(db, 'chatSessions', sessionId));
    
    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ChatSession;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting chat session:', error);
    return null;
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
      ...(context ? { context } : {}),
    };

    // Get session to get userId
    const sessionDoc = await getDoc(doc(db, 'chatSessions', sessionId));
    if (sessionDoc.exists()) {
      message.userId = sessionDoc.data().userId;
    }

    // Build Firestore payload, excluding undefined values
    const payload: Record<string, unknown> = {
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
export const getSessionMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(messagesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as ChatMessage;
    });
  } catch (error) {
    console.error('Error getting session messages:', error);
    return [];
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
