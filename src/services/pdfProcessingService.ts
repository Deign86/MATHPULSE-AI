import { db, storage } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  StorageReference,
  UploadTaskSnapshot,
} from 'firebase/storage';
// ─────────────────────────────────────────────────────────────────────────────
// PDF Processing Service — Firestore-backed job management + Firebase Storage upload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique ID (no external dependency).
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type ProcessingStatus =
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ProcessingJob {
  id: string;
  fileName: string;
  fileSize: number;
  subject: string;
  gradeLevel: string;
  storagePath: string;
  downloadURL?: string;
  status: ProcessingStatus;
  progress: number; // 0–100
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  chunksCount?: number;
  processingTimeMs?: number;
}

export interface CreateJobParams {
  file: File;
  subject: string;
  gradeLevel: string;
  userId: string;
}

export interface JobStatusUpdate {
  status: ProcessingStatus;
  progress: number;
  errorMessage?: string;
  chunksCount?: number;
  processingTimeMs?: number;
}

const JOBS_COLLECTION = 'pdf_processing_jobs';
const STORAGE_PATH = 'pdf-uploads';

/**
 * Create a processing job document in Firestore and start uploading the file
 * to Firebase Storage. Returns the job ID for tracking.
 */
export async function createProcessingJob(params: CreateJobParams): Promise<string> {
  const { file, subject, gradeLevel, userId } = params;
  const jobId = generateId();
  const storagePath = `${STORAGE_PATH}/${subject}/${jobId}/${file.name}`;

  // Create Firestore job document
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await setDoc(jobRef, {
    id: jobId,
    fileName: file.name,
    fileSize: file.size,
    subject,
    gradeLevel,
    storagePath,
    status: 'uploading',
    progress: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
  });

  return jobId;
}

/**
 * Upload a file to Firebase Storage with progress tracking.
 * Updates the Firestore job document on completion or failure.
 */
export function uploadFileWithProgress(
  jobId: string,
  file: File,
  subject: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storagePath = `${STORAGE_PATH}/${subject}/${jobId}/${file.name}`;
    const storageRef: StorageReference = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(progress);

        // Update Firestore progress
        updateJobProgress(jobId, progress).catch(console.error);
      },
      async (error) => {
        // Upload failed
        await updateJobStatus(jobId, {
          status: 'failed',
          progress: 0,
          errorMessage: `Upload failed: ${error.message}`,
        }).catch(console.error);
        reject(error);
      },
      async () => {
        // Upload succeeded
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        await updateJobStatus(jobId, {
          status: 'queued',
          progress: 100,
        }).catch(console.error);

        // Store download URL
        const jobRef = doc(db, JOBS_COLLECTION, jobId);
        await setDoc(jobRef, { downloadURL }, { merge: true }).catch(console.error);

        resolve(downloadURL);
      },
    );
  });
}

/**
 * Update the progress field on a job document.
 */
async function updateJobProgress(jobId: string, progress: number): Promise<void> {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await setDoc(jobRef, { progress, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Update the status of a processing job.
 */
export async function updateJobStatus(jobId: string, update: JobStatusUpdate): Promise<void> {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await setDoc(
    jobRef,
    {
      ...update,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Subscribe to real-time updates for a single processing job.
 * Returns an unsubscribe function.
 */
export function subscribeToJob(
  jobId: string,
  onUpdate: (job: ProcessingJob) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);

  return onSnapshot(
    jobRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate(convertToJob(data));
      }
    },
    (error) => {
      console.error('[pdfProcessingService] subscribeToJob error:', error);
      onError?.(error);
    },
  );
}

/**
 * Subscribe to real-time updates for all processing jobs.
 * Returns an unsubscribe function.
 */
export function subscribeToAllJobs(
  userId: string,
  onUpdate: (jobs: ProcessingJob[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, JOBS_COLLECTION),
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const jobs = snapshot.docs.map((d) => convertToJob(d.data()));
      onUpdate(jobs);
    },
    (error) => {
      console.error('[pdfProcessingService] subscribeToAllJobs error:', error);
      onError?.(error);
    },
  );
}

/**
 * Get all processing jobs for a user (one-shot, no subscription).
 */
export async function getProcessingJobs(userId: string): Promise<ProcessingJob[]> {
  const q = query(
    collection(db, JOBS_COLLECTION),
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => convertToJob(d.data()));
}

/**
 * Cancel a processing job by updating its status.
 */
export async function cancelJob(jobId: string): Promise<void> {
  await updateJobStatus(jobId, {
    status: 'cancelled',
    progress: 0,
    errorMessage: 'Cancelled by user',
  });
}

/**
 * Delete a processing job document from Firestore.
 * Note: This does NOT delete the file from Firebase Storage.
 */
export async function deleteJob(jobId: string): Promise<void> {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await setDoc(jobRef, { status: 'cancelled', updatedAt: serverTimestamp() }, { merge: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function convertToJob(data: Record<string, unknown>): ProcessingJob {
  const ts = (data.createdAt as Timestamp)?.toDate?.() || new Date();
  const ts2 = (data.updatedAt as Timestamp)?.toDate?.() || new Date();

  return {
    id: String(data.id || ''),
    fileName: String(data.fileName || ''),
    fileSize: Number(data.fileSize || 0),
    subject: String(data.subject || ''),
    gradeLevel: String(data.gradeLevel || ''),
    storagePath: String(data.storagePath || ''),
    downloadURL: data.downloadURL ? String(data.downloadURL) : undefined,
    status: (data.status as ProcessingStatus) || 'queued',
    progress: Number(data.progress || 0),
    errorMessage: data.errorMessage ? String(data.errorMessage) : undefined,
    createdAt: ts,
    updatedAt: ts2,
    createdBy: String(data.createdBy || ''),
    chunksCount: data.chunksCount ? Number(data.chunksCount) : undefined,
    processingTimeMs: data.processingTimeMs ? Number(data.processingTimeMs) : undefined,
  };
}

/**
 * Subject options for the PDF upload form.
 * Matches the SHS_MATH_SUBJECTS from src/data/subjects.ts.
 */
export const PDF_SUBJECT_OPTIONS = [
  { value: 'gen-math', label: 'General Mathematics' },
  { value: 'bus-math', label: 'Business Mathematics' },
  { value: 'stats-prob', label: 'Statistics & Probability' },
  { value: 'pre-calc', label: 'Pre-Calculus' },
  { value: 'basic-calc', label: 'Basic Calculus' },
] as const;

/**
 * Grade level options for the PDF upload form.
 */
export const GRADE_LEVEL_OPTIONS = [
  { value: 'grade-11', label: 'Grade 11' },
  { value: 'grade-12', label: 'Grade 12' },
] as const;

/**
 * Human-readable status labels and colors.
 */
export const STATUS_CONFIG: Record<ProcessingStatus, { label: string; color: string; bgColor: string }> = {
  uploading: { label: 'Uploading', color: 'text-sky-700', bgColor: 'bg-sky-50 border-sky-200' },
  queued: { label: 'Queued', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  processing: { label: 'Processing', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  completed: { label: 'Completed', color: 'text-teal-700', bgColor: 'bg-teal-50 border-teal-200' },
  failed: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bgColor: 'bg-slate-50 border-slate-200' },
};