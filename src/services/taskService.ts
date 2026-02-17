import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task } from '../types/models';

// Create task
export const createTask = async (
  userId: string,
  title: string,
  description: string,
  dueDate: Date,
  priority: 'low' | 'medium' | 'high',
  category: string
): Promise<Task> => {
  try {
    const taskRef = doc(collection(db, 'tasks'));
    const task: Task = {
      id: taskRef.id,
      userId,
      title,
      description,
      dueDate,
      priority,
      status: 'todo',
      category,
      createdAt: new Date(),
    };

    await setDoc(taskRef, {
      ...task,
      createdAt: serverTimestamp(),
    });

    return task;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Get user tasks
export const getUserTasks = async (userId: string): Promise<Task[]> => {
  try {
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      orderBy('dueDate', 'asc')
    );

    const snapshot = await getDocs(tasksQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        dueDate: data.dueDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
      } as Task;
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

// Update task
export const updateTask = async (
  taskId: string,
  updates: Partial<Task>
): Promise<void> => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

// Update task status
export const updateTaskStatus = async (
  taskId: string,
  status: 'todo' | 'in-progress' | 'completed'
): Promise<void> => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === 'completed') {
      updateData.completedAt = serverTimestamp();
    }

    await updateDoc(taskRef, updateData);
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

// Delete task
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// Get tasks by status
export const getTasksByStatus = async (
  userId: string,
  status: 'todo' | 'in-progress' | 'completed'
): Promise<Task[]> => {
  try {
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('status', '==', status),
      orderBy('dueDate', 'asc')
    );

    const snapshot = await getDocs(tasksQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        dueDate: data.dueDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
      } as Task;
    });
  } catch (error) {
    console.error('Error getting tasks by status:', error);
    return [];
  }
};
