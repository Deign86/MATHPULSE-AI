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
 * │ users (onUpdate)       │ onStudentProfileUpdated             │
 * │ diagnosticResults      │ onDiagnosticComplete                │
 * │ quizResults            │ onQuizSubmitted                     │
 * │ attendance (onWrite)   │ onAttendanceUpdate                  │
 * │ curriculumContent      │ onContentUpdated                    │
 * └────────────────────────┴──────────────────────────────────────┘
 *
 * HTTP Callable:
 * - manualProcessStudent   — reprocess a diagnostic for a student
 * - manualProcessQuiz      — reprocess a quiz result
 * - manualRequestReassessment — force reassessment eligibility
 */

/*
MIGRATION SUMMARY:
- Upgraded firebase-functions 4.9.0 -> 5.1.0
- Runtime: nodejs20 -> nodejs22 (firebase.json)
- functions.config() not used in current codebase -> not a direct blocker for firebase-functions 7.x
- Deploy: firebase deploy --only functions
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
export {
  onStudentProfileUpdated,
  runInactivityReassessmentSweep,
} from "./triggers/onStudentProfileUpdated";

// ─── HTTP Callable Functions ─────────────────────────────────

export {
  manualProcessStudent,
  manualProcessQuiz,
  manualBackfillCurriculumVersion,
  manualRequestReassessment,
} from "./triggers/manualTriggers";

export {
  quizBattleJoinQueue,
  quizBattleLeaveQueue,
  quizBattleCreatePrivateRoom,
  quizBattleJoinPrivateRoom,
  quizBattleLeavePrivateRoom,
  quizBattleGetPrivateRoomState,
  quizBattleCreateBotMatch,
  quizBattleStartMatch,
  quizBattleGetMatchState,
  quizBattleGetGenerationAudit,
  quizBattleSubmitAnswer,
  quizBattleRequestRematch,
  quizBattleHeartbeat,
  quizBattleResumeSession,
  quizBattleResolvePublicMatchmakingSweep,
} from "./triggers/quizBattleApi";
