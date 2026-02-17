// src/services/automationService.ts
// Frontend client for the MathPulse automation engine.
//
// MIGRATION: Event-driven Cloud Functions (Firebase)
// Instead of calling FastAPI automation endpoints, the frontend now writes
// documents to Firestore collections.  Cloud Functions triggers fire
// automatically and handle all downstream processing (risk classification,
// remedial quizzes, teacher notifications, etc.).
//
// The FastAPI backend is still used for AI/ML features (chat, risk prediction,
// learning paths) — those calls are made by the Cloud Functions themselves.

import { doc, updateDoc, serverTimestamp, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createNotification } from './notificationService';
import { initializeUserProgress } from './progressService';

// ─── Types ────────────────────────────────────────────────────

export interface DiagnosticResult {
  subject: string;
  score: number;
}

export interface AutomationResult {
  success: boolean;
  event: string;
  studentId?: string;
  message: string;
  riskClassifications?: Record<string, {
    status: 'At Risk' | 'On Track';
    score: number;
    confidence: number;
    needsIntervention: boolean;
  }>;
  overallRisk?: string;
  atRiskSubjects?: string[];
  weakTopics?: { topic: string; accuracy: number; questionsAttempted: number; priority: string }[];
  learningPath?: string;
  remedialQuizzesCreated: number;
  interventions?: string;
  notifications: string[];
}

export interface QuizSubmissionPayload {
  studentId: string;
  quizId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  answers?: { questionId: string; selectedAnswer: string; isCorrect: boolean }[];
}

export interface StudentEnrollmentPayload {
  studentId: string;
  name: string;
  email: string;
  gradeLevel?: string;
  teacherId?: string;
}

export interface DataImportPayload {
  teacherId: string;
  students: Record<string, unknown>[];
  columnMapping: Record<string, string>;
}

export interface ContentUpdatePayload {
  adminId: string;
  action: 'create' | 'update' | 'delete';
  contentType: 'lesson' | 'quiz' | 'module' | 'subject';
  contentId: string;
  subjectId?: string;
  details?: string;
}

// ─── Trigger: Diagnostic Completed ────────────────────────────

/**
 * Write diagnostic results to Firestore.  The onDiagnosticComplete
 * Cloud Function fires automatically and handles:
 *   - Risk classification
 *   - Profile updates (badges, risk data)
 *   - Learning path generation (via FastAPI)
 *   - Remedial quiz creation
 *   - Teacher intervention recommendations
 *   - Student & teacher notifications
 *
 * The frontend no longer needs to orchestrate these steps.
 */
export async function triggerDiagnosticCompleted(
  studentId: string,
  results: DiagnosticResult[],
  gradeLevel: string = 'Grade 10',
  questionBreakdown?: Record<string, { correct: boolean }[]>,
): Promise<AutomationResult> {
  // Write to diagnosticResults — Cloud Function triggers from here
  await setDoc(doc(db, 'diagnosticResults', studentId), {
    studentId,
    results,
    gradeLevel,
    questionBreakdown: questionBreakdown || null,
    completedAt: serverTimestamp(),
    processed: false,
    processing: false,
  });

  // Return an optimistic result to the UI immediately.
  // The Cloud Function will handle the full processing asynchronously.
  return {
    success: true,
    event: 'diagnostic_completed',
    studentId,
    message: `Diagnostic submitted for ${studentId}. Processing will begin automatically.`,
    remedialQuizzesCreated: 0,
    notifications: ['Your diagnostic results are being processed. Check back shortly!'],
  };
}

// ─── Trigger: Quiz Submitted ──────────────────────────────────

/**
 * Write quiz results to Firestore.  The onQuizSubmitted Cloud Function
 * fires automatically and recalculates per-subject risk.
 */
export async function triggerQuizSubmitted(
  payload: QuizSubmissionPayload,
): Promise<AutomationResult> {
  // Write to quizResults — Cloud Function triggers from here
  await addDoc(collection(db, 'quizResults'), {
    studentId: payload.studentId,
    quizId: payload.quizId,
    subject: payload.subject,
    score: payload.score,
    totalQuestions: payload.totalQuestions,
    correctAnswers: payload.correctAnswers,
    timeSpentSeconds: payload.timeSpentSeconds,
    answers: payload.answers || null,
    submittedAt: serverTimestamp(),
  });

  return {
    success: true,
    event: 'quiz_submitted',
    studentId: payload.studentId,
    message: `Quiz submitted for ${payload.studentId}. Risk recalculation will run automatically.`,
    remedialQuizzesCreated: 0,
    notifications: [`Quiz result recorded for ${payload.subject}.`],
  };
}

// ─── Trigger: Student Enrolled ────────────────────────────────

/**
 * Student creation is handled by the onStudentCreated Cloud Function,
 * which fires when a new user doc with role === 'student' is created.
 *
 * This function is kept for backward compatibility — it ensures the
 * progress record and welcome notification exist even if the Cloud
 * Function hasn't fired yet (e.g., during local development).
 */
export async function triggerStudentEnrolled(
  payload: StudentEnrollmentPayload,
): Promise<AutomationResult> {
  // The Cloud Function handles everything automatically when the user
  // document is created.  This is a fallback for safety.
  await initializeUserProgress(payload.studentId);

  await createNotification(
    payload.studentId,
    'reminder',
    'Welcome to MathPulse!',
    'Complete your diagnostic assessment to get started with personalised learning.',
  );

  if (payload.teacherId) {
    await createNotification(
      payload.teacherId,
      'message',
      'New Student Enrolled',
      `${payload.name} has joined. Diagnostic assessment is pending.`,
    );
  }

  return {
    success: true,
    event: 'student_enrolled',
    studentId: payload.studentId,
    message: `Student ${payload.name} enrolled and initialised`,
    remedialQuizzesCreated: 0,
    notifications: [
      `Welcome ${payload.name}! Please complete the diagnostic assessment.`,
    ],
  };
}

// ─── Trigger: Data Imported ───────────────────────────────────

/**
 * Write data import record to Firestore for audit/processing.
 */
export async function triggerDataImported(
  payload: DataImportPayload,
): Promise<AutomationResult> {
  await addDoc(collection(db, 'dataImports'), {
    teacherId: payload.teacherId,
    studentCount: payload.students.length,
    columnMapping: payload.columnMapping,
    importedAt: serverTimestamp(),
    processed: false,
  });

  await createNotification(
    payload.teacherId,
    'message',
    'Data Import Processed',
    `Data import complete — ${payload.students.length} student records processed.`,
  );

  return {
    success: true,
    event: 'data_imported',
    message: `Data import processed for ${payload.students.length} students`,
    remedialQuizzesCreated: 0,
    notifications: [
      `Data import complete — ${payload.students.length} student records processed.`,
    ],
  };
}

// ─── Trigger: Content Updated ─────────────────────────────────

/**
 * Write curriculum content changes to Firestore.  The onContentUpdated
 * Cloud Function fires and notifies affected teachers.
 */
export async function triggerContentUpdated(
  payload: ContentUpdatePayload,
): Promise<AutomationResult> {
  // Write or update the curriculumContent doc — Cloud Function triggers
  const contentRef = doc(db, 'curriculumContent', payload.contentId);

  if (payload.action === 'delete') {
    // For deletes, we mark as deleted so the onWrite trigger can log it
    await updateDoc(contentRef, {
      deleted: true,
      deletedBy: payload.adminId,
      deletedAt: serverTimestamp(),
      contentType: payload.contentType,
      subjectId: payload.subjectId || null,
    });
  } else {
    await setDoc(contentRef, {
      contentType: payload.contentType,
      subjectId: payload.subjectId || null,
      details: payload.details || null,
      updatedBy: payload.adminId,
      action: payload.action,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  return {
    success: true,
    event: 'content_updated',
    message: `Content ${payload.action} processed for ${payload.contentType}`,
    remedialQuizzesCreated: 0,
    notifications: [],
  };
}
