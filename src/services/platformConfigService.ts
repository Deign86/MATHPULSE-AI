import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Platform Config Service — Dynamic subject availability (Firestore-backed)
// ─────────────────────────────────────────────────────────────────────────────

export interface SubjectAvailabilityEntry {
  available: boolean;
  pdfPath: string | null;
  lastUpdated: Date;
}

export interface PlatformSubjectsConfig {
  subjects: Record<string, SubjectAvailabilityEntry>;
  updatedAt: Date;
  updatedBy: string;
}

const CONFIG_DOC_ID = 'subjects';
const CONFIG_COLLECTION = 'platformConfig';

/**
 * Build the default subject availability map from hardcoded fallbacks.
 * Used when no Firestore doc exists yet.
 */
function getDefaultSubjectAvailability(): Record<string, SubjectAvailabilityEntry> {
  return {
    'gen-math': { available: true, pdfPath: null, lastUpdated: new Date() },
    'stats-prob': { available: true, pdfPath: null, lastUpdated: new Date() },
    'pre-calc': { available: false, pdfPath: null, lastUpdated: new Date() },
    'basic-calc': { available: false, pdfPath: null, lastUpdated: new Date() },
  };
}

function convertTimestamps(data: Record<string, unknown>): PlatformSubjectsConfig {
  const subjectsRaw = (data.subjects as Record<string, Record<string, unknown>>) || {};
  const subjects: Record<string, SubjectAvailabilityEntry> = {};

  for (const [key, entry] of Object.entries(subjectsRaw)) {
    subjects[key] = {
      available: Boolean(entry.available),
      pdfPath: entry.pdfPath ? String(entry.pdfPath) : null,
      lastUpdated: entry.lastUpdated
        ? (entry.lastUpdated as { toDate?: () => Date }).toDate?.() || new Date()
        : new Date(),
    };
  }

  return {
    subjects,
    updatedAt: data.updatedAt
      ? (data.updatedAt as { toDate?: () => Date }).toDate?.() || new Date()
      : new Date(),
    updatedBy: String(data.updatedBy || ''),
  };
}

/**
 * Read the subject availability config from Firestore (one-shot).
 * Falls back to hardcoded defaults if the doc doesn't exist.
 */
export async function getSubjectAvailability(): Promise<PlatformSubjectsConfig> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return convertTimestamps(snap.data() as Record<string, unknown>);
    }

    // No doc yet — return defaults
    return {
      subjects: getDefaultSubjectAvailability(),
      updatedAt: new Date(),
      updatedBy: '',
    };
  } catch (err) {
    console.error('[platformConfigService] getSubjectAvailability error:', err);
    return {
      subjects: getDefaultSubjectAvailability(),
      updatedAt: new Date(),
      updatedBy: '',
    };
  }
}

/**
 * Subscribe to real-time subject availability updates.
 * Returns an unsubscribe function.
 */
export function subscribeToSubjectAvailability(
  onChange: (config: PlatformSubjectsConfig) => void,
): () => void {
  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onChange(convertTimestamps(snapshot.data() as Record<string, unknown>));
      } else {
        onChange({
          subjects: getDefaultSubjectAvailability(),
          updatedAt: new Date(),
          updatedBy: '',
        });
      }
    },
    (error) => {
      console.error('[platformConfigService] subscribe error:', error);
      onChange({
        subjects: getDefaultSubjectAvailability(),
        updatedAt: new Date(),
        updatedBy: '',
      });
    },
  );
}

/**
 * Toggle a subject's availability status.
 * Also updates the timestamp and admin user ID.
 */
export async function toggleSubjectAvailability(
  subjectId: string,
  available: boolean,
  adminUserId: string,
): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(docRef);

    const existingSubjects = snap.exists()
      ? ((snap.data() as Record<string, unknown>).subjects as Record<string, Record<string, unknown>>) || {}
      : {};

    await setDoc(
      docRef,
      {
        subjects: {
          ...existingSubjects,
          [subjectId]: {
            available,
            pdfPath: existingSubjects[subjectId]?.pdfPath ?? null,
            lastUpdated: serverTimestamp(),
          },
        },
        updatedAt: serverTimestamp(),
        updatedBy: adminUserId,
      },
      { merge: true },
    );
  } catch (err) {
    console.error('[platformConfigService] toggleSubjectAvailability error:', err);
    throw err;
  }
}

/**
 * Update a subject's PDF path.
 */
export async function updateSubjectPdfPath(
  subjectId: string,
  pdfPath: string | null,
  adminUserId: string,
): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(docRef);

    const existingSubjects = snap.exists()
      ? ((snap.data() as Record<string, unknown>).subjects as Record<string, Record<string, unknown>>) || {}
      : {};

    await setDoc(
      docRef,
      {
        subjects: {
          ...existingSubjects,
          [subjectId]: {
            available: existingSubjects[subjectId]?.available ?? true,
            pdfPath,
            lastUpdated: serverTimestamp(),
          },
        },
        updatedAt: serverTimestamp(),
        updatedBy: adminUserId,
      },
      { merge: true },
    );
  } catch (err) {
    console.error('[platformConfigService] updateSubjectPdfPath error:', err);
    throw err;
  }
}
