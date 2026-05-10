import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Interface representing a module activity log
 */
export interface ModuleActivity {
  id?: string;
  userId: string;
  activityType: 'quiz_generated' | 'chat_session' | 'lesson_view' | 'quiz_completed';
  moduleId?: string;
  topicId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Timestamp;
}

const COLLECTION_NAME = 'moduleActivities';

/**
 * Logs when a user generates a quiz.
 * @param userId - The ID of the user
 * @param moduleId - The ID of the module
 * @param itemCount - Number of items generated
 */
export const logQuizGeneration = async (
  userId: string,
  moduleId: string,
  itemCount: number
): Promise<void> => {
  try {
    const activityRef = collection(db, COLLECTION_NAME);
    await addDoc(activityRef, {
      userId,
      activityType: 'quiz_generated',
      moduleId,
      metadata: { itemCount },
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging quiz generation:', error);
    throw error;
  }
};

/**
 * Logs a chat session activity.
 * @param userId - The ID of the user
 * @param sessionId - The ID of the chat session
 * @param messageCount - Total number of messages in the session
 */
export const logChatSession = async (
  userId: string,
  sessionId: string,
  messageCount: number
): Promise<void> => {
  try {
    const activityRef = collection(db, COLLECTION_NAME);
    await addDoc(activityRef, {
      userId,
      activityType: 'chat_session',
      metadata: { sessionId, messageCount },
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging chat session:', error);
    throw error;
  }
};

/**
 * Logs when a user views a lesson.
 * @param userId - The ID of the user
 * @param moduleId - The ID of the module
 * @param topicId - The ID of the specific topic viewed
 */
export const logLessonView = async (
  userId: string,
  moduleId: string,
  topicId: string
): Promise<void> => {
  try {
    const activityRef = collection(db, COLLECTION_NAME);
    await addDoc(activityRef, {
      userId,
      activityType: 'lesson_view',
      moduleId,
      topicId,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging lesson view:', error);
    throw error;
  }
};

/**
 * Retrieves module activity logs based on optional filters.
 * @param moduleId - Optional module ID to filter by
 * @param dateRange - Optional date range to filter by
 * @returns Array of module activities
 */
export const getModuleActivity = async (
  moduleId?: string,
  dateRange?: { start: Date; end: Date }
): Promise<ModuleActivity[]> => {
  try {
    let q = query(collection(db, COLLECTION_NAME));
    const constraints: any[] = [];

    if (moduleId) {
      constraints.push(where('moduleId', '==', moduleId));
    }

    if (dateRange) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(dateRange.start)));
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(dateRange.end)));
    }

    // Default sorting by timestamp descending
    constraints.push(orderBy('timestamp', 'desc'));

    q = query(q, ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ModuleActivity[];
  } catch (error) {
    console.error('Error getting module activity:', error);
    throw error;
  }
};

/**
 * Identifies at-risk students based on inactivity or low scores.
 * Note: A complete implementation might require Cloud Functions or complex aggregation.
 * @param thresholdDays - Number of days of inactivity to consider "at risk"
 * @param minScore - Minimum score to consider not at risk (optional)
 * @returns List of at-risk student userIds with their risk reasons
 */
export const getAtRiskStudents = async (
  thresholdDays: number,
  minScore?: number
): Promise<{ userId: string; reasons: string[] }[]> => {
  try {
    // Determine the threshold date
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
    const thresholdTimestamp = Timestamp.fromDate(thresholdDate);

    // We can find users with recent low scores by querying activities
    const constraints: any[] = [
      where('timestamp', '>=', thresholdTimestamp),
      orderBy('timestamp', 'desc')
    ];
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);

    const activeUsers = new Set<string>();
    const strugglingUsers = new Map<string, string[]>();

    querySnapshot.docs.forEach(doc => {
      const data = doc.data() as ModuleActivity;
      activeUsers.add(data.userId);

      // Check for low scores if minScore is provided
      if (minScore !== undefined && data.activityType === 'quiz_completed') {
        const score = data.metadata?.score as number | undefined;
        if (score !== undefined && score < minScore) {
          const reasons = strugglingUsers.get(data.userId) || [];
          if (!reasons.includes('Low quiz scores')) {
            reasons.push('Low quiz scores');
          }
          strugglingUsers.set(data.userId, reasons);
        }
      }
    });

    const atRiskList: { userId: string; reasons: string[] }[] = [];
    
    // Add users with low scores to the at-risk list
    strugglingUsers.forEach((reasons, userId) => {
      atRiskList.push({ userId, reasons });
    });

    return atRiskList;
  } catch (error) {
    console.error('Error getting at-risk students:', error);
    throw error;
  }
};
