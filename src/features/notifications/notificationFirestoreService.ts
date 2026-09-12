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
  writeBatch,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import type { Notification, NotificationPayload } from './types';

/** Auth guard: skip Firestore call silently if user is not authenticated.
 *  Prevents "Missing or insufficient permissions" errors from Firestore
 *  when auth state has not yet initialized or token is stale. */
function requireAuth(): string | null {
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) {
    console.warn('[notificationFirestoreService] Skipping Firestore call — user not authenticated');
  }
  return uid;
}

/**
 * `isRead` is the canonical read flag. Older documents were written with a
 * `read` field only; that fallback exists purely for migration and should be
 * removed once scripts/backfill-notification-read-flag.ts has run in production.
 */
const LEGACY_READ_FIELD = 'read';
/** Migration kill switch: flip to false (and drop LEGACY_READ_FIELD) once the
 *  backfill script has run and no `read`-only document remains in production. */
const HAS_LEGACY_READ_FIELD = true;

/** Type predicate: a stored Firestore field decoded as a boolean flag. */
function isBooleanFlag(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function readNotificationFlag(data: DocumentData): boolean {
  if (isBooleanFlag(data.isRead)) return data.isRead;
  if (isBooleanFlag(data[LEGACY_READ_FIELD])) return data[LEGACY_READ_FIELD];
  return false;
}

const mapNotificationDoc = (docSnap: { id: string; data: () => DocumentData }): Notification => {
  const data = docSnap.data();
  // SAFETY: Firestore `createdAt` is written as serverTimestamp() (read back as Timestamp) or a Date;
  // any other shape falls through to `new Date()` below.
  const createdAtRaw = data.createdAt as Timestamp | Date | undefined;
  const createdAt = createdAtRaw instanceof Timestamp
    ? createdAtRaw.toDate()
    : createdAtRaw instanceof Date
      ? createdAtRaw
      : new Date();

  // SAFETY: fields above were written by createNotification with exactly these Firestore types.
  return {
    id: docSnap.id,
    userId: data.userId as string,
    type: data.type as Notification['type'],
    title: data.title as string,
    message: data.message as string,
    isRead: readNotificationFlag(data),
    createdAt,
    metadata: data.metadata,
    actionUrl: data.actionUrl as string | undefined,
  };
};

export const createNotification = async (payload: NotificationPayload): Promise<string> => {
  const uid = requireAuth();
  if (!uid) throw new Error('Cannot create notification — not authenticated');
  try {
    const notificationRef = doc(collection(db, 'notifications', payload.userId, 'items'));
    const notificationData: DocumentData = {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      isRead: false,
      createdAt: serverTimestamp(),
    };
    if (payload.metadata) notificationData.metadata = payload.metadata;
    if (payload.actionUrl) notificationData.actionUrl = payload.actionUrl;

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
  if (!requireAuth()) return;
  try {
    const subRef = doc(db, 'notifications', userId, 'items', notificationId);
    await updateDoc(subRef, { isRead: true });
  } catch (error) {
    console.error('[notificationFirestoreService] Error marking as read:', error);
    throw error;
  }
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  if (!requireAuth()) throw new Error('Cannot mark all as read — not authenticated');
  try {
    const itemsRef = collection(db, 'notifications', userId, 'items');
    const queries = [query(itemsRef, where('isRead', '==', false))];
    if (HAS_LEGACY_READ_FIELD) {
      queries.push(query(itemsRef, where(LEGACY_READ_FIELD, '==', false)));
    }
    const snapshots = await Promise.all(queries.map((pending) => getDocs(pending)));
    const seen = new Set<string>();
    const batch = writeBatch(db);
    let count = 0;
    for (const docSnap of snapshots.flatMap((snapshot) => snapshot.docs)) {
      if (seen.has(docSnap.id)) continue;
      seen.add(docSnap.id);
      batch.update(docSnap.ref, { isRead: true });
      count += 1;
    }
    if (count > 0) await batch.commit();
  } catch (error) {
    console.error('[notificationFirestoreService] Error marking all as read:', error);
    throw error;
  }
};

export const deleteNotification = async (userId: string, notificationId: string): Promise<void> => {
  try {
    const subRef = doc(db, 'notifications', userId, 'items', notificationId);
    await deleteDoc(subRef);
  } catch (error) {
    console.error('[notificationFirestoreService] Error deleting notification:', error);
    throw error;
  }
};

export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
): (() => void) => {
  const uid = requireAuth();
  if (!uid || uid !== userId) {
    console.warn('[notificationFirestoreService] subscribeToNotifications skipped — auth UID mismatch or not signed in');
    callback([]);
    return () => undefined;
  }

  const subcollectionQuery = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    subcollectionQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => mapNotificationDoc(docSnap));
      callback(items);
    },
    (error) => {
      console.warn('[notificationFirestoreService] subscription error:', error);
    }
  );
};

export const hasCheckedInToday = async (userId: string): Promise<boolean> => {
  if (!requireAuth()) return false;
  try {
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    const q = query(
      collection(db, 'notifications', userId, 'items'),
      where('type', '==', 'daily_checkin'),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end),
      orderBy('createdAt', 'asc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[notificationFirestoreService] Error checking daily check-in:', error);
    return false;
  }
};

export const hasRemindedToday = async (userId: string): Promise<boolean> => {
  if (!requireAuth()) return false;
  try {
    const now = new Date();
    const start = startOfDay(now);

    const q = query(
      collection(db, 'notifications', userId, 'items'),
      where('type', '==', 'streak_reminder'),
      where('createdAt', '>=', start),
      orderBy('createdAt', 'asc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[notificationFirestoreService] Error checking reminder:', error);
    return false;
  }
};
