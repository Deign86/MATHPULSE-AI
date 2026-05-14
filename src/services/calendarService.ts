import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CalendarEvent } from '../types/models';

const mapCalendarEventDoc = (docSnap: { id: string; data: () => any }): CalendarEvent => {
  const data = docSnap.data();

  const startTimeRaw = data.startTime;
  const endTimeRaw = data.endTime;
  const createdAtRaw = data.createdAt;
  const updatedAtRaw = data.updatedAt;

  const toDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    return undefined;
  };

  return {
    ...(data as Omit<CalendarEvent, 'id' | 'startTime' | 'endTime' | 'createdAt' | 'updatedAt'>),
    id: docSnap.id,
    startTime: toDate(startTimeRaw) || new Date(),
    endTime: toDate(endTimeRaw),
    createdAt: toDate(createdAtRaw) || new Date(),
    updatedAt: toDate(updatedAtRaw),
  } as CalendarEvent;
};

export const createCalendarEvent = async (
  userId: string,
  payload: {
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
  },
): Promise<CalendarEvent> => {
  const eventRef = doc(collection(db, 'calendarEvents'));
  const event: CalendarEvent = {
    id: eventRef.id,
    userId,
    title: payload.title,
    description: payload.description,
    startTime: payload.startTime,
    endTime: payload.endTime,
    createdAt: new Date(),
  };

  await setDoc(eventRef, {
    ...event,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return event;
};

export const updateCalendarEvent = async (
  eventId: string,
  updates: Partial<Pick<CalendarEvent, 'title' | 'description' | 'startTime' | 'endTime'>>,
): Promise<void> => {
  const eventRef = doc(db, 'calendarEvents', eventId);
  await updateDoc(eventRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  await deleteDoc(doc(db, 'calendarEvents', eventId));
};

export const subscribeToUserCalendarEvents = (
  userId: string,
  options: {
    limitCount?: number;
  } = {},
  onChange: (events: CalendarEvent[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe => {
  if (!userId) {
    onChange([]);
    return () => undefined;
  }

  const { limitCount = 500 } = options;

  // Intentionally simple query (single equality filter) to avoid composite-index requirements.
  // UI will filter/sort by month/day client-side.
  const q = query(
    collection(db, 'calendarEvents'),
    where('userId', '==', userId),
    limit(limitCount),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapCalendarEventDoc(docSnap)));
    },
    (error) => {
      console.error('Error subscribing to calendar events:', error);
      onError?.(error);
    },
  );
};
