import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type DocumentData,
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
function getDefaultSubjectAvailability() {
  return {
    'gen-math': { available: true, pdfPath: null, lastUpdated: new Date() },
    'stats-prob': { available: true, pdfPath: null, lastUpdated: new Date() },
    'business-math': { available: true, pdfPath: null, lastUpdated: new Date() },
    'finite-math': { available: true, pdfPath: null, lastUpdated: new Date() },
  };
}

/** Values Firestore may store for timestamp fields. */
type FirestoreDateValue = Timestamp | Date | null | undefined;

/** Firestore timestamp-like values; parsing never throws. */
const firestoreToDate = (value: FirestoreDateValue): Date => {
  // NOTE: call toDate() on the original Timestamp instance — detaching the
  // method (e.g. via a generic object parser) breaks its internal this.toMillis().
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
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

/** Field-level patch applied to one subject entry. */
type SubjectEntryPatch = Partial<Pick<SubjectAvailabilityEntry, 'available' | 'pdfPath'>>;

/** Defaults used when a stored subject entry is missing or malformed. */
const SUBJECT_ENTRY_DEFAULTS = { available: true, pdfPath: null } as const;

/** Type predicate: a stored subject field decoded as a boolean. */
function isBooleanField(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** Type predicate: a stored subject field decoded as a string. */
function isStringField(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Read a stored subject entry, defaulting fields that were not written.
 * `available` defaults to true and `pdfPath` to null so a partially written
 * entry never disables a subject or silently drops its PDF.
 */
function readSubjectEntry(subjects: DocumentData, subjectId: string): SubjectAvailabilityEntry {
  const stored = subjects[subjectId];
  return {
    available: isBooleanField(stored?.available) ? stored.available : SUBJECT_ENTRY_DEFAULTS.available,
    pdfPath: isStringField(stored?.pdfPath) ? stored.pdfPath : SUBJECT_ENTRY_DEFAULTS.pdfPath,
    lastUpdated: new Date(),
  };
}

/**
 * Single owner of the platformConfig/subjects read-modify-write.
 *
 * Both public mutators previously duplicated this sequence, so each carried its
 * own fallback defaults and could overwrite the other's field.
 */
async function updateSubjectEntry(
  subjectId: string,
  patch: SubjectEntryPatch,
  adminUserId: string,
  operation: string,
): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    // SAFETY: subjects is a map of SubjectAvailabilityEntry records written by this service.
    const existingSubjects: DocumentData = snap.exists()
      ? (snap.data().subjects as DocumentData) || {}
      : {};
    const current = readSubjectEntry(existingSubjects, subjectId);

    await setDoc(
      docRef,
      {
        subjects: {
          ...existingSubjects,
          [subjectId]: {
            available: patch.available ?? current.available,
            pdfPath: patch.pdfPath !== undefined ? patch.pdfPath : current.pdfPath,
            lastUpdated: serverTimestamp(),
          },
        },
        updatedAt: serverTimestamp(),
        updatedBy: adminUserId,
      },
      { merge: true },
    );
  } catch (err) {
    console.error(`[platformConfigService] ${operation} error:`, err);
    throw err;
  }
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
  await updateSubjectEntry(subjectId, { available }, adminUserId, 'toggleSubjectAvailability');
}

/**
 * Update a subject's PDF path.
 */
export async function updateSubjectPdfPath(
  subjectId: string,
  pdfPath: string | null,
  adminUserId: string,
): Promise<void> {
  await updateSubjectEntry(subjectId, { pdfPath }, adminUserId, 'updateSubjectPdfPath');
}
