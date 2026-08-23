import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { z } from 'zod';

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
function getDefaultSubjectAvailability() {
  return {
    'gen-math': { available: true, pdfPath: null, lastUpdated: new Date() },
    'stats-prob': { available: true, pdfPath: null, lastUpdated: new Date() },
    'pre-calc': { available: false, pdfPath: null, lastUpdated: new Date() },
    'basic-calc': { available: false, pdfPath: null, lastUpdated: new Date() },
  };
}

/** Firestore timestamp-like values; parsing never throws. */
const timestampLikeValue = z.looseObject({ toDate: z.instanceof(Function).optional() }).catch({});

const firestoreToDate = <V>(value: V): Date => {
  const parsed = timestampLikeValue.safeParse(value);
  return parsed.success && parsed.data.toDate instanceof Function ? parsed.data.toDate() : new Date();
};

function convertTimestamps(data: DocumentData): PlatformSubjectsConfig {
  // SAFETY: subjects maps are written by this service as SubjectAvailabilityEntry records.
  const subjectsRaw: DocumentData = (data.subjects as DocumentData) || {};
  const subjects: Record<string, SubjectAvailabilityEntry> = {};

  for (const [key, value] of Object.entries(subjectsRaw)) {
    // SAFETY: subjects entries are written by this service with SubjectAvailabilityEntry fields.
    const entry: DocumentData = (value ?? {}) as DocumentData;
    subjects[key] = {
      available: Boolean(entry.available),
      pdfPath: entry.pdfPath ? String(entry.pdfPath) : null,
      lastUpdated: entry.lastUpdated ? firestoreToDate(entry.lastUpdated) : new Date(),
    };
  }

  return {
    subjects,
    updatedAt: firestoreToDate(data.updatedAt),
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
      return convertTimestamps(snap.data());
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
        onChange(convertTimestamps(snapshot.data()));
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

    const existingSubjects: DocumentData = snap.exists()
      ? snap.data().subjects || {}
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

    const existingSubjects: DocumentData = snap.exists()
      ? snap.data().subjects || {}
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
