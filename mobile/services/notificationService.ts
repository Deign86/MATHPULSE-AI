import { Platform } from 'react-native'
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Notification, NotificationType } from '../types/models'

const API_URL = process.env.EXPO_PUBLIC_API_URL

// ── Helpers ─────────────────────────────────────────────────────

function mapNotificationDoc(docSnap: { id: string; data: () => Record<string, unknown> }): Notification {
  const data = docSnap.data()
  const createdAtRaw = data.createdAt

  let createdAt: Date
  if (typeof createdAtRaw === 'object' && createdAtRaw !== null && 'toDate' in createdAtRaw) {
    createdAt = (createdAtRaw as { toDate: () => Date }).toDate()
  } else if (createdAtRaw instanceof Date) {
    createdAt = createdAtRaw
  } else {
    createdAt = new Date()
  }

  return {
    id: docSnap.id,
    userId: data.userId as string,
    type: data.type as NotificationType,
    title: data.title as string,
    message: data.message as string,
    read: (data.read ?? data.isRead ?? false) as boolean,
    actionUrl: (data.actionUrl ?? data.link) as string | undefined,
    createdAt,
    senderId: data.senderId as string | undefined,
    senderRole: data.senderRole as string | undefined,
  }
}

// ── Realtime Subscription ───────────────────────────────────────

/**
 * Subscribe to real-time notification updates for a user.
 * Returns an unsubscribe function. Callback fires on every snapshot change.
 */
export function subscribeToUserNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  if (!uid) {
    callback([])
    return () => {}
  }

  const notificationsQuery = query(
    collection(db, 'notifications', uid, 'items'),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((snap) => mapNotificationDoc(snap)))
    },
    (error) => {
      console.error('[notifications] subscribe error:', error)
      onError?.(error)
    },
  )
}

// ── Read / Write Operations ─────────────────────────────────────

export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  const notifRef = doc(db, 'notifications', uid, 'items', notifId)
  await updateDoc(notifRef, {
    read: true,
    readAt: serverTimestamp(),
  })
}

export async function markAllRead(uid: string): Promise<void> {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    where('read', '==', false),
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return

  const batch = writeBatch(db)
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { read: true })
  })
  await batch.commit()
}

export async function deleteNotification(uid: string, notifId: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', uid, 'items', notifId))
}

export async function getUnreadCount(uid: string): Promise<number> {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    where('read', '==', false),
  )
  const snapshot = await getDocs(q)
  return snapshot.size
}

// ── Cross-Role Notifications ────────────────────────────────────

interface CrossRolePayload {
  toUid: string
  fromUid: string
  fromRole: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
}

/**
 * Send a cross-role notification (teacher→student, admin→broadcast, etc.).
 * Writes to both recipient's items and sender's sent subcollection for history.
 * Returns the generated notification ID.
 */
export async function sendCrossRoleNotification(payload: CrossRolePayload): Promise<string> {
  const { toUid, fromUid, fromRole, type, title, message, actionUrl } = payload

  const notifData: Record<string, unknown> = {
    userId: toUid,
    type,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
    senderId: fromUid,
    senderRole: fromRole,
  }
  if (actionUrl) {
    notifData.actionUrl = actionUrl
  }

  // Write to recipient's items subcollection
  const recipientRef = doc(collection(db, 'notifications', toUid, 'items'))
  await setDoc(recipientRef, notifData)

  // Write to sender's outbox: notifications/{fromUid}/items/sent/{id}
  const sentRef = doc(collection(db, 'notifications', fromUid, 'items', 'sent'))
  await setDoc(sentRef, {
    ...notifData,
    recipientId: toUid,
  })

  return recipientRef.id
}

// ── Push Token Registration (UNCHANGED) ─────────────────────────

export async function registerPushToken(token: string, idToken: string): Promise<void> {
  const url = `${API_URL}/notifications/register-device`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ expoPushToken: token, platform: Platform.OS }),
    })
    if (!res.ok) {
      console.warn(
        `[notifications] Backend /notifications/register-device returned ${res.status} — endpoint may not exist yet.`,
      )
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[notifications] registerPushToken failed (endpoint likely not deployed): ${message}`)
  }
}
