import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ModuleStatus } from '../data/curriculumModules';

/**
 * Subscribe a student to notifications when a module becomes available.
 * Uses a composite doc ID (userId_moduleId) for idempotency.
 */
export async function watchModule(userId: string, moduleId: string): Promise<void> {
  const docId = `${userId}_${moduleId}`;
  await setDoc(doc(db, 'module_watch_requests', docId), {
    userId,
    moduleId,
    createdAt: serverTimestamp(),
  });
}

/**
 * Unsubscribe from module availability notifications.
 */
export async function unwatchModule(userId: string, moduleId: string): Promise<void> {
  const docId = `${userId}_${moduleId}`;
  await deleteDoc(doc(db, 'module_watch_requests', docId));
}

/**
 * Update a module's availability status (teacher/admin action).
 * Writes to the `modules` collection which triggers onModuleStatusUpdate Cloud Function.
 */
export async function setModuleStatus(
  moduleId: string,
  status: ModuleStatus,
  teacherId: string,
  pdfUrl?: string,
): Promise<void> {
  await setDoc(doc(db, 'modules', moduleId), {
    moduleStatus: status,
    status,
    updatedBy: teacherId,
    updatedAt: serverTimestamp(),
    ...(pdfUrl && { teacherPdfUrl: pdfUrl }),
  }, { merge: true });
}
