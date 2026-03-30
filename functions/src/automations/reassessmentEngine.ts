import * as admin from "firebase-admin";

export type ReassessmentReasonCode =
  | "grade_level_changed"
  | "strand_changed"
  | "manual_teacher_admin"
  | "inactivity_threshold";

export interface ReassessmentRequestInput {
  db: admin.firestore.Firestore;
  userId: string;
  reasonCodes: ReassessmentReasonCode[];
  source: "profile_change" | "manual" | "scheduled_inactivity";
  actorId?: string;
  actorRole?: "teacher" | "admin" | "system";
  metadata?: Record<string, unknown>;
}

interface InactivityAnchor {
  field: string;
  date: Date;
}

const COMPLETED_ASSESSMENT_STATES = new Set([
  "completed",
  "placed",
  "deep_diagnostic_required",
  "deep_diagnostic_in_progress",
]);

function normalizeComparableValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeTs = value as { toDate?: () => Date };
    const date = maybeTs.toDate?.();
    return date instanceof Date ? date : null;
  }

  return null;
}

function extractGradeValue(data: Record<string, unknown>): string {
  return normalizeComparableValue(data.grade || data.gradeLevel);
}

function extractStrandValue(data: Record<string, unknown>): string {
  return normalizeComparableValue(data.strand || data.track || data.major);
}

export function hasCompletedInitialAssessment(data: Record<string, unknown>): boolean {
  const hasTakenDiagnostic = data.hasTakenDiagnostic === true;
  const state = typeof data.iarAssessmentState === "string" ? data.iarAssessmentState : "";
  return hasTakenDiagnostic || COMPLETED_ASSESSMENT_STATES.has(state);
}

export function detectProfileReassessmentReasons(
  beforeData: Record<string, unknown>,
  afterData: Record<string, unknown>,
): ReassessmentReasonCode[] {
  const reasons: ReassessmentReasonCode[] = [];

  const beforeGrade = extractGradeValue(beforeData);
  const afterGrade = extractGradeValue(afterData);
  if (beforeGrade && afterGrade && beforeGrade !== afterGrade) {
    reasons.push("grade_level_changed");
  }

  const beforeStrand = extractStrandValue(beforeData);
  const afterStrand = extractStrandValue(afterData);
  if (beforeStrand && afterStrand && beforeStrand !== afterStrand) {
    reasons.push("strand_changed");
  }

  return reasons;
}

export function resolveInactivityAnchor(data: Record<string, unknown>): InactivityAnchor | null {
  const candidateFields = [
    "lastActiveAt",
    "lastLoginAt",
    "lastSeenAt",
    "lastLessonActivityAt",
    "lastQuizCompletedAt",
    "lastRiskUpdate",
    "initialAssessmentCompletedAt",
    "updatedAt",
  ];

  for (const field of candidateFields) {
    const date = toDate(data[field]);
    if (date) {
      return { field, date };
    }
  }

  return null;
}

export function calculateInactivityDays(anchorDate: Date, referenceDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = Math.max(0, referenceDate.getTime() - anchorDate.getTime());
  return Math.floor(diffMs / msPerDay);
}

export function shouldQueueInactivityReassessment(
  data: Record<string, unknown>,
  inactivityThresholdDays: number,
  referenceDate: Date,
): { shouldQueue: boolean; inactivityDays: number; anchorField?: string } {
  if (inactivityThresholdDays <= 0) {
    return { shouldQueue: false, inactivityDays: 0 };
  }

  if (data.role !== "student") {
    return { shouldQueue: false, inactivityDays: 0 };
  }

  if (!hasCompletedInitialAssessment(data)) {
    return { shouldQueue: false, inactivityDays: 0 };
  }

  if (data.reassessmentRequired === true) {
    return { shouldQueue: false, inactivityDays: 0 };
  }

  const anchor = resolveInactivityAnchor(data);
  if (!anchor) {
    return { shouldQueue: false, inactivityDays: 0 };
  }

  const inactivityDays = calculateInactivityDays(anchor.date, referenceDate);
  return {
    shouldQueue: inactivityDays >= inactivityThresholdDays,
    inactivityDays,
    anchorField: anchor.field,
  };
}

export async function requestReassessmentForStudent(
  input: ReassessmentRequestInput,
): Promise<{ wasUpdated: boolean; reasonCodes: ReassessmentReasonCode[] }> {
  const {
    db,
    userId,
    reasonCodes,
    source,
    actorId = "system",
    actorRole = "system",
    metadata,
  } = input;

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error(`User ${userId} does not exist.`);
  }

  const userData = userSnap.data() as Record<string, unknown>;
  if (userData.role !== "student") {
    return { wasUpdated: false, reasonCodes: [] };
  }

  const existingReasonCodes = Array.isArray(userData.reassessmentReasonCodes)
    ? userData.reassessmentReasonCodes.filter((item): item is string => typeof item === "string")
    : [];

  const mergedReasonCodes = [...new Set([...existingReasonCodes, ...reasonCodes])];

  await userRef.update({
    hasTakenDiagnostic: false,
    iarAssessmentState: "not_started",
    learningPathState: "locked_pending_deep_diagnostic",
    reassessmentRequired: true,
    reassessmentStatus: "pending",
    reassessmentReasonCodes: mergedReasonCodes,
    reassessmentSource: source,
    reassessmentRequestedBy: actorId,
    reassessmentRequestedByRole: actorRole,
    reassessmentRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
    reassessmentMetadata: metadata || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("progressionAuditLog").add({
    lrn: userData.lrn || userId,
    userId,
    eventType: "reassessment_requested",
    gradeLevel: userData.grade || userData.gradeLevel || "Grade 11",
    workflowMode: userData.iarMode || "iar_only",
    assessmentType: "initial_assessment",
    curriculumVersionSetId: userData.currentCurriculumVersionSetId || null,
    payload: {
      source,
      reasonCodes: mergedReasonCodes,
      actorId,
      actorRole,
      metadata: metadata || null,
    },
    immutable: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    wasUpdated: true,
    reasonCodes: mergedReasonCodes as ReassessmentReasonCode[],
  };
}
