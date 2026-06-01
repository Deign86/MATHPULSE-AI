// mobile/services/tutorMemoryService.ts
// Reads/writes tutor memory in Firestore for context-aware AI tutor follow-ups.
// Subcollection root: users/{uid}/tutorMemory/{profile, sessions, working}

import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  firestoreServerTimestamp,
} from '../lib/firebase';

// ── Type definitions ──────────────────────────────────────────

export interface TutorProfile {
  /** Subject expertise areas */
  subjects: string[];
  /** Learning style preference (e.g. "visual", "step_by_step") */
  learningStyle: string;
  /** Student's self-reported strengths */
  strengths: string[];
  /** Student's self-reported weaknesses */
  weaknesses: string[];
  /** Grade level (e.g. "Grade 11") */
  gradeLevel: string;
  /** Date the profile was last updated */
  updatedAt: Date;
}

export interface TutorSessionSummary {
  /** Display title for the session */
  title: string;
  /** Top 2-3 topics discussed */
  topics: string[];
  /** One-line summary of what was covered */
  summary: string;
  /** Key concepts the student struggled with */
  struggles: string[];
  /** Date the session summary was written */
  createdAt: Date;
}

export interface TutorWorkingMemory {
  /** Recent topic tags (sliding window) */
  recentTopics: string[];
  /** Concepts the tutor should review or reinforce */
  reviewQueue: string[];
  /** Last interaction timestamp */
  lastInteractionAt: Date;
  /** Active session ID if a chat is in progress */
  activeSessionId: string | null;
}

// ── Firestore path helpers ──────────────────────────────────

function profileDoc(uid: string) {
  return doc(db, 'users', uid, 'tutorMemory', 'profile');
}

function sessionDoc(uid: string, sessionId: string) {
  return doc(db, 'users', uid, 'tutorMemory', 'sessions', sessionId);
}

function workingDoc(uid: string) {
  return doc(db, 'users', uid, 'tutorMemory', 'working');
}

// ── Public API ────────────────────────────────────────────────

/**
 * Load the tutor profile for a given user.
 * Returns null if no profile exists yet.
 */
export async function loadTutorProfile(uid: string): Promise<TutorProfile | null> {
  const snap = await getDoc(profileDoc(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    subjects: data.subjects ?? [],
    learningStyle: data.learningStyle ?? 'step_by_step',
    strengths: data.strengths ?? [],
    weaknesses: data.weaknesses ?? [],
    gradeLevel: data.gradeLevel ?? '',
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

/**
 * Create or overwrite the tutor profile for a given user.
 */
export async function saveTutorProfile(
  uid: string,
  profile: Omit<TutorProfile, 'updatedAt'>,
): Promise<void> {
  await setDoc(profileDoc(uid), {
    subjects: profile.subjects,
    learningStyle: profile.learningStyle,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    gradeLevel: profile.gradeLevel,
    updatedAt: firestoreServerTimestamp(),
  });
}

/**
 * Append a session summary to the sessions subcollection.
 * Uses sessionId as the document key so it is idempotent.
 */
export async function appendTutorSession(
  uid: string,
  sessionId: string,
  summary: TutorSessionSummary,
): Promise<void> {
  await setDoc(sessionDoc(uid, sessionId), {
    title: summary.title,
    topics: summary.topics,
    summary: summary.summary,
    struggles: summary.struggles,
    createdAt: firestoreServerTimestamp(),
  });
}

/**
 * Read the current working memory for a user.
 * Returns null if no working memory document exists.
 */
export async function getTutorWorkingMemory(uid: string): Promise<TutorWorkingMemory | null> {
  const snap = await getDoc(workingDoc(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    recentTopics: data.recentTopics ?? [],
    reviewQueue: data.reviewQueue ?? [],
    lastInteractionAt: data.lastInteractionAt?.toDate?.() ?? new Date(),
    activeSessionId: data.activeSessionId ?? null,
  };
}

/**
 * Write (or overwrite) the working memory for a user.
 */
export async function setTutorWorkingMemory(
  uid: string,
  working: Omit<TutorWorkingMemory, 'lastInteractionAt'>,
): Promise<void> {
  await setDoc(workingDoc(uid), {
    recentTopics: working.recentTopics,
    reviewQueue: working.reviewQueue,
    activeSessionId: working.activeSessionId,
    lastInteractionAt: firestoreServerTimestamp(),
  });
}

/**
 * Build a context string for the AI prompt from the user's tutor memory
 * profile, working memory, and recent chat messages.
 *
 * Designed to be appended to the system prompt so the AI tutor can provide
 * personalised, context-aware follow-ups.
 */
export function buildFollowUpContext(
  uid: string,
  recentMessages: { role: string; content: string }[],
): string {
  const userMsg = recentMessages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .slice(-5);

  const lines: string[] = [];

  lines.push('[TUTOR CONTEXT]');
  lines.push(`User ID: ${uid}`);

  if (userMsg.length > 0) {
    lines.push('');
    lines.push('Recent user messages:');
    userMsg.forEach((msg, i) => {
      lines.push(`  ${i + 1}. ${msg}`);
    });
  }

  lines.push('');
  lines.push(
    'Use the tutor memory profile and working memory to personalise your responses. ' +
      'Reference prior topics and struggles when relevant. ' +
      'If the student seems stuck on a concept, offer a review or a simpler analogy.',
  );

  return lines.join('\n');
}
