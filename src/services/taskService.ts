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
} from 'firebase/firestore';
import { db } from '../lib/firebase';

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

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? new Date() : new Date(parsed);
  }
  if (typeof value === 'object' && value) {
    const record = value as { toDate?: () => Date; seconds?: number };
    if (typeof record.toDate === 'function') return record.toDate();
    if (typeof record.seconds === 'number') return new Date(record.seconds * 1000);
  }
  return new Date();
};

const mapTask = (id: string, data: Record<string, unknown>): TaskRecord => ({
  id,
  userId: typeof data.userId === 'string' ? data.userId : '',
  title: typeof data.title === 'string' ? data.title : 'Untitled Task',
  description: typeof data.description === 'string' ? data.description : '',
  dueDate: toDate(data.dueDate),
  priority:
    data.priority === 'high' || data.priority === 'medium' || data.priority === 'low'
      ? data.priority
      : 'medium',
  category: data.category === 'system' || data.category === 'custom' ? data.category : 'custom',
  status: data.status === 'completed' ? 'completed' : 'todo',
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

export const getUserTasks = async (userId: string): Promise<TaskRecord[]> => {
  const taskQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
  const snap = await getDocs(taskQuery);
  const tasks = snap.docs.map((entry) => mapTask(entry.id, entry.data() as Record<string, unknown>));
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
    status: 'todo' as TaskStatus,
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
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof updates.title === 'string') payload.title = updates.title.trim();
  if (typeof updates.description === 'string') payload.description = updates.description.trim();
  if (updates.dueDate instanceof Date) payload.dueDate = updates.dueDate;
  if (updates.priority) payload.priority = updates.priority;
  if (updates.category) payload.category = updates.category;
  if (updates.status) payload.status = updates.status;

  await updateDoc(doc(db, 'tasks', taskId), payload);
};
