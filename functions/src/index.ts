/**
 * MathPulse AI - Firebase Cloud Functions Entry Point
 *
 * Event-driven automation replacing the polling-based system
 * in the FastAPI backend.  Each exported function is automatically
 * deployed as a Cloud Function by `firebase deploy --only functions`.
 *
 * Trigger map:
 * ┌────────────────────────┬──────────────────────────────────────┐
 * │ Firestore Collection   │ Cloud Function                      │
 * ├────────────────────────┼──────────────────────────────────────┤
 * │ users (onCreate)       │ onStudentCreated                    │
 * │ diagnosticResults      │ onDiagnosticComplete                │
 * │ quizResults            │ onQuizSubmitted                     │
 * │ attendance (onWrite)   │ onAttendanceUpdate                  │
 * │ curriculumContent      │ onContentUpdated                    │
 * └────────────────────────┴──────────────────────────────────────┘
 *
 * HTTP Callable:
 * - manualProcessStudent   — reprocess a diagnostic for a student
 * - manualProcessQuiz      — reprocess a quiz result
 */

import * as admin from "firebase-admin";

// Initialise Firebase Admin SDK (must happen before any trigger imports)
admin.initializeApp();

// ─── Firestore Triggers ──────────────────────────────────────

export { onStudentCreated } from "./triggers/onStudentCreated";
export { onDiagnosticComplete } from "./triggers/onDiagnosticComplete";
export { onQuizSubmitted } from "./triggers/onQuizSubmitted";
export { onAttendanceUpdate } from "./triggers/onAttendanceUpdate";
export { onContentUpdated } from "./triggers/onContentUpdated";

// ─── HTTP Callable Functions ─────────────────────────────────

export {
  manualProcessStudent,
  manualProcessQuiz,
} from "./triggers/manualTriggers";
