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
      actionUrl,
      createdAt: new Date(),
    };

    await setDoc(notificationRef, {
      ...notification,
      // Backwards compatibility with older cloud-function payloads
      link: actionUrl || null,
      createdAt: serverTimestamp(),
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
