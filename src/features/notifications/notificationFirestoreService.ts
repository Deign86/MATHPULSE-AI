/**
 * @file notificationFirestoreService.ts
 * Firestore CRUD operations for notifications.
 * Path: notifications/{userId}/items/{notificationId}
 */
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
  Timestamp,
} from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { db } from '@/lib/firebase';
import type { Notification, NotificationPayload } from './types';

const mapNotificationDoc = (docSnap: { id: string; data: () => Record<string, unknown> }): Notification => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt as Timestamp | Date | undefined;
  const createdAt = createdAtRaw instanceof Timestamp
    ? createdAtRaw.toDate()
    : createdAtRaw instanceof Date
      ? createdAtRaw
      : new Date();

  return {
    id: docSnap.id,
    userId: data.userId as string,
    type: data.type as Notification['type'],
    title: data.title as string,
    message: data.message as string,
    isRead: data.isRead as boolean,
    createdAt,
    metadata: data.metadata as Record<string, unknown> | undefined,
    actionUrl: data.actionUrl as string | undefined,
  };
};

export const createNotification = async (payload: NotificationPayload): Promise<string> => {
  try {
    const notificationRef = doc(collection(db, 'notifications', payload.userId, 'items'));
    const notificationData = {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      isRead: false,
      createdAt: serverTimestamp(),
      ...(payload.metadata ? { metadata: payload.metadata } : {}),
      ...(payload.actionUrl ? { actionUrl: payload.actionUrl } : {}),
    };

    await setDoc(notificationRef, notificationData);
    return notificationRef.id;
  } catch (error) {
    console.error('[notificationFirestoreService] Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications', userId, 'items'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map((docSnap) => mapNotificationDoc(docSnap));
  } catch (error) {
    console.error('[notificationFirestoreService] Error getting notifications:', error);
    return [];
  }
};

export const markAsRead = async (userId: string, notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', userId, 'items', notificationId);
    await updateDoc(notificationRef, { isRead: true });
  } catch (error) {
    console.error('[notificationFirestoreService] Error marking as read:', error);
    throw error;
  }
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications', userId, 'items'),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    await Promise.all(snapshot.docs.map((docSnap) => updateDoc(docSnap.ref, { isRead: true })));
  } catch (error) {
    console.error('[notificationFirestoreService] Error marking all as read:', error);
    throw error;
  }
};

export const deleteNotification = async (userId: string, notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', userId, 'items', notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error('[notificationFirestoreService] Error deleting notification:', error);
    throw error;
  }
};

export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
): (() => void) => {
  const notificationsQuery = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => mapNotificationDoc(docSnap)));
    },
    (error) => {
      console.error('[notificationFirestoreService] Error subscribing to notifications:', error);
    }
  );
};

export const hasCheckedInToday = async (userId: string): Promise<boolean> => {
  try {
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    const q = query(
      collection(db, 'notifications', userId, 'items'),
      where('type', '==', 'daily_checkin'),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[notificationFirestoreService] Error checking daily check-in:', error);
    return false;
  }
};
