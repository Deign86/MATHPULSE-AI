import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Notification } from '../types/models';

const mapNotificationDoc = (docSnap: { id: string; data: () => any }): Notification => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt;
  const createdAt = typeof createdAtRaw?.toDate === 'function'
    ? createdAtRaw.toDate()
    : createdAtRaw instanceof Date
      ? createdAtRaw
      : new Date();

  const actionUrl = (data.actionUrl ?? data.link ?? undefined) as string | undefined;

  return {
    ...(data as Omit<Notification, 'id' | 'createdAt' | 'actionUrl'>),
    id: docSnap.id,
    createdAt,
    actionUrl,
  } as Notification;
};

// Create notification
export const createNotification = async (
  userId: string,
  type: 'achievement' | 'message' | 'grade' | 'reminder' | 'risk_alert' | 'automation',
  title: string,
  message: string,
  actionUrl?: string
): Promise<Notification> => {
  try {
    const notificationRef = doc(collection(db, 'notifications'));
    const notification: Notification = {
      id: notificationRef.id,
      userId,
      type,
      title,
      message,
      read: false,
      ...(actionUrl ? { actionUrl } : {}),
      createdAt: new Date(),
    };

    const notificationData: Record<string, unknown> = {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      createdAt: serverTimestamp(),
      // Backwards compatibility with older cloud-function payloads
      link: actionUrl || null,
    };

    if (actionUrl) {
      notificationData.actionUrl = actionUrl;
    }

    await setDoc(notificationRef, {
      ...notificationData,
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get user notifications
export const getUserNotifications = async (
  userId: string,
  limitCount: number = 50,
  unreadOnly: boolean = false
): Promise<Notification[]> => {
  try {
    let notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (unreadOnly) {
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map((docSnap) => mapNotificationDoc(docSnap));
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

export const subscribeToUserNotifications = (
  userId: string,
  options: {
    limitCount?: number;
    unreadOnly?: boolean;
  } = {},
  onChange: (notifications: Notification[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe => {
  if (!userId) {
    onChange([]);
    return () => undefined;
  }

  const { limitCount = 50, unreadOnly = false } = options;

  const baseConstraints = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  ] as const;

  const notificationsQuery = unreadOnly
    ? query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false), orderBy('createdAt', 'desc'), limit(limitCount))
    : query(collection(db, 'notifications'), ...baseConstraints);

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapNotificationDoc(docSnap)));
    },
    (error) => {
      console.error('Error subscribing to notifications:', error);
      onError?.(error);
    }
  );
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    
    await Promise.all(
      snapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      )
    );
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Delete notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Get unread count
export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// ============================================================================
// CROSS-ROLE NOTIFICATIONS (Phase 4)
// ============================================================================

export type NotificationTarget = 
  | { type: 'student'; lrn: string }
  | { type: 'class'; classroomId: string; teacherId: string }
  | { type: 'all' };

/**
 * Send notification to a single student (from teacher or admin)
 */
export const sendToStudent = async (
  lrn: string,
  type: 'achievement' | 'message' | 'grade' | 'reminder' | 'risk_alert' | 'automation' | 'teacher_message' | 'system_announcement' | 'quiz_assigned' | 'assignment',
  title: string,
  message: string,
  actionUrl?: string,
  senderId?: string,
  senderRole?: string
): Promise<Notification> => {
  try {
    const notificationRef = doc(collection(db, 'notifications'));
    const notification: Notification = {
      id: notificationRef.id,
      userId: lrn,
      type,
      title,
      message,
      read: false,
      ...(actionUrl ? { actionUrl } : {}),
      createdAt: new Date(),
    };

    const notificationData: Record<string, unknown> = {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: false,
      createdAt: serverTimestamp(),
      link: actionUrl || null,
      senderId: senderId || null,
      senderRole: senderRole || null,
    };

    if (actionUrl) {
      notificationData.actionUrl = actionUrl;
    }

    await setDoc(notificationRef, notificationData);
    return notification;
  } catch (error) {
    console.error('Error sending notification to student:', error);
    throw error;
  }
};

/**
 * Send notification to all students in a teacher's class
 */
export const sendToClass = async (
  classroomId: string,
  teacherId: string,
  type: 'teacher_message' | 'reminder' | 'assignment',
  title: string,
  message: string,
  actionUrl?: string
): Promise<{ sent: number; failed: number }> => {
  try {
    // Get all students in the class
    const studentsQuery = query(
      collection(db, 'managedStudents'),
      where('teacherId', '==', teacherId),
      where('classroomId', '==', classroomId)
    );
    const studentsSnap = await getDocs(studentsQuery);
    
    const studentLRNs = studentsSnap.docs.map(d => d.id);
    let sent = 0, failed = 0;

    // Send to each student
    const sendPromises = studentLRNs.map(async (lrn) => {
      try {
        await sendToStudent(lrn, type, title, message, actionUrl, teacherId, 'teacher');
        sent++;
      } catch {
        failed++;
      }
    });

    await Promise.all(sendPromises);
    return { sent, failed };
  } catch (error) {
    console.error('Error sending notification to class:', error);
    throw error;
  }
};

/**
 * Broadcast system-wide announcement (admin only)
 */
export const broadcastAll = async (
  adminId: string,
  title: string,
  message: string,
  actionUrl?: string
): Promise<{ sent: number; failed: number }> => {
  try {
    // Get all users
    const usersSnap = await getDocs(collection(db, 'users'));
    let sent = 0, failed = 0;

    // Filter to students and teachers
    const targets = usersSnap.docs
      .filter(d => {
        const data = d.data();
        return data.role === 'student' || data.role === 'teacher';
      })
      .map(d => d.id);

    // Send to each user
    const sendPromises = targets.map(async (uid) => {
      try {
        await sendToStudent(uid, 'system_announcement', title, message, actionUrl, adminId, 'admin');
        sent++;
      } catch {
        failed++;
      }
    });

    await Promise.all(sendPromises);
    return { sent, failed };
  } catch (error) {
    console.error('Error broadcasting announcement:', error);
    throw error;
  }
};

/**
 * Get notifications for teacher from admin (admin messages)
 */
export const getTeacherNotifications = async (teacherId: string): Promise<Notification[]> => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('senderRole', '==', 'admin'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    // Note: This reads all admin-sent notifications - in production, 
    // you'd want to filter by recipient which requires additional logic
    // For now, we'll return recent admin notifications
    const snapshot = await getDocs(notificationsQuery);
    
    return snapshot.docs
      .map(docSnap => mapNotificationDoc(docSnap))
      .filter(n => n.userId === teacherId);
  } catch (error) {
    console.error('Error getting teacher notifications:', error);
    return [];
  }
};
