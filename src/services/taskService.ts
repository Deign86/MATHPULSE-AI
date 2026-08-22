import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { z } from 'zod';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'system' | 'custom';
export type TaskStatus = 'todo' | 'completed';

export interface TaskRecord {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Firestore timestamp-like values accepted by toDate. */
const timestampLikeValue = z.looseObject({
  toDate: z.instanceof(Function).optional(),
  seconds: z.number().optional(),
});

const toDate = <V>(value: V): Date => {
  if (value instanceof Date) return value;

  const asNumber = z.number().safeParse(value);
  if (asNumber.success) return new Date(asNumber.data);

  const asString = z.string().safeParse(value);
  if (asString.success) {
    const parsed = Date.parse(asString.data);
    return Number.isNaN(parsed) ? new Date() : new Date(parsed);
  }

  const record = timestampLikeValue.safeParse(value);
  if (record.success && record.data.toDate instanceof Function) return record.data.toDate();
  if (record.success && record.data.seconds !== undefined) return new Date(record.data.seconds * 1000);
  return new Date();
};

/** tasks collection document fields read by mapTask; parsing never throws. */
const taskDocContract = z.looseObject({
  userId: z.string().catch(''),
  title: z.string().catch('Untitled Task'),
  description: z.string().catch(''),
  priority: z.enum(['high', 'medium', 'low']).catch('medium'),
  category: z.enum(['system', 'custom']).catch('custom'),
  status: z.string().catch('todo'),
});

const mapTask = (id: string, data: DocumentData): TaskRecord => {
  const parsed = taskDocContract.parse(data);
  return {
    id,
    userId: parsed.userId,
    title: parsed.title,
    description: parsed.description,
    dueDate: toDate(data.dueDate),
    priority: parsed.priority,
    category: parsed.category,
    status: parsed.status === 'completed' ? 'completed' : 'todo',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

export const getUserTasks = async (userId: string): Promise<TaskRecord[]> => {
  const taskQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
  const snap = await getDocs(taskQuery);
  const tasks = snap.docs.map((entry) => mapTask(entry.id, entry.data()));
  tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return tasks;
};

export const createTask = async (
  userId: string,
  title: string,
  description: string,
  dueDate: Date,
  priority: TaskPriority,
  category: TaskCategory,
): Promise<TaskRecord> => {
  const now = new Date();
  const baseFields = {
    userId,
    title: title.trim(),
    description: description.trim(),
    dueDate,
    priority,
    category,
    status: 'todo' satisfies TaskStatus,
  };

  const ref = await addDoc(collection(db, 'tasks'), {
    ...baseFields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    ...baseFields,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
  await updateDoc(doc(db, 'tasks', taskId), {
    status,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await deleteDoc(doc(db, 'tasks', taskId));
};

export const updateTask = async (
  taskId: string,
  updates: Partial<Pick<TaskRecord, 'title' | 'description' | 'dueDate' | 'priority' | 'category' | 'status'>>,
): Promise<void> => {
  const payload: DocumentData = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.dueDate instanceof Date) payload.dueDate = updates.dueDate;
  if (updates.priority) payload.priority = updates.priority;
  if (updates.category) payload.category = updates.category;
  if (updates.status) payload.status = updates.status;

  await updateDoc(doc(db, 'tasks', taskId), payload);
};
