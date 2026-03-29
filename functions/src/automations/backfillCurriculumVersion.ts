import * as admin from "firebase-admin";
import {
  DEEP_DIAGNOSTIC_DUE_DAYS,
  LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
} from "../config/constants";
import { resolveCurriculumVersionSetId } from "../config/diagnosticPolicies";

export type BackfillMode = "dry-run" | "commit";

export type BackfillCollectionName =
  | "recommendationLogs"
  | "learningPaths"
  | "assignedQuizzes"
  | "deepDiagnosticAssignments";

export interface BackfillCollectionMetrics {
  scanned: number;
  changed: number;
  skipped: number;
  failed: number;
  sampleChangedIds: string[];
  sampleFailedIds: string[];
}

export interface BackfillRunSummary {
  mode: BackfillMode;
  startedAt: string;
  completedAt: string;
  totals: {
    scanned: number;
    changed: number;
    skipped: number;
    failed: number;
  };
  collections: Record<BackfillCollectionName, BackfillCollectionMetrics>;
}

export interface BackfillRunOptions {
  db: admin.firestore.Firestore;
  mode: BackfillMode;
  pageSize?: number;
  sampleSize?: number;
  maxDocsPerCollection?: number;
}

type BackfillPatch = Record<string, unknown>;

const TARGET_COLLECTIONS: BackfillCollectionName[] = [
  "recommendationLogs",
  "learningPaths",
  "assignedQuizzes",
  "deepDiagnosticAssignments",
];

const ACTIVE_DEEP_DIAGNOSTIC_STATUSES = new Set(["queued", "pending", "in_progress"]);
const ALLOWED_PATCH_FIELDS: Record<BackfillCollectionName, Set<string>> = {
  recommendationLogs: new Set(["curriculumVersionSetId"]),
  learningPaths: new Set(["curriculumVersionSetId"]),
  assignedQuizzes: new Set(["curriculumVersionSetId"]),
  deepDiagnosticAssignments: new Set([
    "curriculumVersionSetId",
    "dueAt",
    "lifecycleVersion",
  ]),
};

const DEFAULT_PAGE_SIZE = 200;
const DEFAULT_SAMPLE_SIZE = 10;
const MAX_BATCH_WRITES = 450;

function parseDateLike(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  const timestampLike = value as { toDate?: () => Date };
  if (typeof timestampLike.toDate === "function") {
    const converted = timestampLike.toDate();
    return Number.isFinite(converted.getTime()) ? converted : null;
  }

  return null;
}

function isMissingVersionTag(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function resolveDocGradeLevel(data: admin.firestore.DocumentData): string {
  return typeof data.gradeLevel === "string" && data.gradeLevel.trim().length > 0
    ? data.gradeLevel
    : "Grade 11";
}

function computeFallbackDueAt(
  now: Date,
  data: admin.firestore.DocumentData,
): Date {
  const createdAt = parseDateLike(data.createdAt);
  const base = createdAt || now;
  return new Date(base.getTime() + DEEP_DIAGNOSTIC_DUE_DAYS * 24 * 60 * 60 * 1000);
}

export function buildBackfillPatch(
  collectionName: BackfillCollectionName,
  data: admin.firestore.DocumentData,
  now: Date,
): BackfillPatch {
  const patch: BackfillPatch = {};

  const gradeLevel = resolveDocGradeLevel(data);
  if (isMissingVersionTag(data.curriculumVersionSetId)) {
    patch.curriculumVersionSetId = resolveCurriculumVersionSetId(gradeLevel);
  }

  if (collectionName === "deepDiagnosticAssignments") {
    const status = typeof data.status === "string" ? data.status : "queued";
    const isActive = ACTIVE_DEEP_DIAGNOSTIC_STATUSES.has(status);

    if (isActive && !parseDateLike(data.dueAt)) {
      patch.dueAt = computeFallbackDueAt(now, data);
    }

    if (isActive && isMissingVersionTag(data.lifecycleVersion)) {
      patch.lifecycleVersion = LEARNING_PATH_UNLOCK_CRITERIA_VERSION;
    }
  }

  return patch;
}

export function validateBackfillPatch(
  collectionName: BackfillCollectionName,
  data: admin.firestore.DocumentData,
  patch: BackfillPatch,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allowed = ALLOWED_PATCH_FIELDS[collectionName];

  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) {
      errors.push(`Field not allowed for ${collectionName}: ${key}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, "curriculumVersionSetId")) {
    if (typeof patch.curriculumVersionSetId !== "string" || !patch.curriculumVersionSetId) {
      errors.push("curriculumVersionSetId patch must be a non-empty string");
    }
  }

  if (collectionName === "deepDiagnosticAssignments") {
    const status = typeof data.status === "string" ? data.status : "queued";
    const isActive = ACTIVE_DEEP_DIAGNOSTIC_STATUSES.has(status);

    if (!isActive && Object.prototype.hasOwnProperty.call(patch, "dueAt")) {
      errors.push("dueAt patch is only allowed for active deep-diagnostic statuses");
    }

    if (!isActive && Object.prototype.hasOwnProperty.call(patch, "lifecycleVersion")) {
      errors.push("lifecycleVersion patch is only allowed for active deep-diagnostic statuses");
    }

    if (Object.prototype.hasOwnProperty.call(patch, "dueAt") && !parseDateLike(patch.dueAt)) {
      errors.push("dueAt patch must be a valid Date/Timestamp");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function emptyMetrics(): BackfillCollectionMetrics {
  return {
    scanned: 0,
    changed: 0,
    skipped: 0,
    failed: 0,
    sampleChangedIds: [],
    sampleFailedIds: [],
  };
}

function addSampleId(buffer: string[], sampleSize: number, value: string): void {
  if (buffer.length < sampleSize) {
    buffer.push(value);
  }
}

async function processCollection(
  options: BackfillRunOptions,
  collectionName: BackfillCollectionName,
): Promise<BackfillCollectionMetrics> {
  const db = options.db;
  const mode = options.mode;
  const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
  const sampleSize = options.sampleSize || DEFAULT_SAMPLE_SIZE;
  const now = new Date();

  const metrics = emptyMetrics();

  let lastDocId: string | null = null;
  let scannedInCollection = 0;

  while (true) {
    if (
      typeof options.maxDocsPerCollection === "number" &&
      scannedInCollection >= options.maxDocsPerCollection
    ) {
      break;
    }

    const remaining = typeof options.maxDocsPerCollection === "number"
      ? Math.max(options.maxDocsPerCollection - scannedInCollection, 0)
      : pageSize;

    if (remaining === 0) break;

    let query = db
      .collection(collectionName)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(Math.min(pageSize, remaining));

    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snap = await query.get();
    if (snap.empty) {
      break;
    }

    let batch = db.batch();
    let batchWrites = 0;

    for (const doc of snap.docs) {
      scannedInCollection += 1;
      metrics.scanned += 1;

      try {
        const patch = buildBackfillPatch(collectionName, doc.data(), now);
        if (Object.keys(patch).length === 0) {
          metrics.skipped += 1;
          continue;
        }

        const validation = validateBackfillPatch(collectionName, doc.data(), patch);
        if (!validation.isValid) {
          metrics.failed += 1;
          addSampleId(metrics.sampleFailedIds, sampleSize, doc.id);
          continue;
        }

        metrics.changed += 1;
        addSampleId(metrics.sampleChangedIds, sampleSize, doc.id);

        if (mode === "commit") {
          batch.update(doc.ref, patch);
          batchWrites += 1;
          if (batchWrites >= MAX_BATCH_WRITES) {
            await batch.commit();
            batch = db.batch();
            batchWrites = 0;
          }
        }
      } catch (error) {
        metrics.failed += 1;
        addSampleId(metrics.sampleFailedIds, sampleSize, doc.id);
      }
    }

    if (mode === "commit" && batchWrites > 0) {
      await batch.commit();
    }

    lastDocId = snap.docs[snap.docs.length - 1].id;
  }

  return metrics;
}

export async function runCurriculumVersionBackfill(
  options: BackfillRunOptions,
): Promise<BackfillRunSummary> {
  const startedAt = new Date();

  const collections = {
    recommendationLogs: await processCollection(options, "recommendationLogs"),
    learningPaths: await processCollection(options, "learningPaths"),
    assignedQuizzes: await processCollection(options, "assignedQuizzes"),
    deepDiagnosticAssignments: await processCollection(options, "deepDiagnosticAssignments"),
  };

  const totals = TARGET_COLLECTIONS.reduce(
    (acc, collectionName) => {
      acc.scanned += collections[collectionName].scanned;
      acc.changed += collections[collectionName].changed;
      acc.skipped += collections[collectionName].skipped;
      acc.failed += collections[collectionName].failed;
      return acc;
    },
    { scanned: 0, changed: 0, skipped: 0, failed: 0 },
  );

  return {
    mode: options.mode,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    totals,
    collections,
  };
}

export function runBackfillPatchSanityChecks(): {
  isValid: boolean;
  errors: string[];
} {
  const now = new Date("2026-03-29T00:00:00.000Z");
  const checks: Array<{
    collectionName: BackfillCollectionName;
    data: admin.firestore.DocumentData;
    expectedKeys: string[];
    label: string;
  }> = [
    {
      label: "recommendationLogs missing version",
      collectionName: "recommendationLogs",
      data: { gradeLevel: "Grade 11" },
      expectedKeys: ["curriculumVersionSetId"],
    },
    {
      label: "learningPaths already complete",
      collectionName: "learningPaths",
      data: {
        gradeLevel: "Grade 12",
        curriculumVersionSetId: "g12-math-electives-strengthened-template",
      },
      expectedKeys: [],
    },
    {
      label: "deep diagnostic active missing fields",
      collectionName: "deepDiagnosticAssignments",
      data: {
        gradeLevel: "Grade 11",
        status: "queued",
      },
      expectedKeys: ["curriculumVersionSetId", "dueAt", "lifecycleVersion"],
    },
    {
      label: "deep diagnostic completed missing lifecycle should not patch lifecycle",
      collectionName: "deepDiagnosticAssignments",
      data: {
        gradeLevel: "Grade 11",
        status: "completed",
      },
      expectedKeys: ["curriculumVersionSetId"],
    },
  ];

  const errors: string[] = [];

  for (const check of checks) {
    const patch = buildBackfillPatch(check.collectionName, check.data, now);
    const validation = validateBackfillPatch(check.collectionName, check.data, patch);

    if (!validation.isValid) {
      errors.push(`${check.label}: ${validation.errors.join("; ")}`);
      continue;
    }

    const actualKeys = Object.keys(patch).sort();
    const expectedKeys = [...check.expectedKeys].sort();
    if (actualKeys.join("|") !== expectedKeys.join("|")) {
      errors.push(
        `${check.label}: expected keys [${expectedKeys.join(", ")}], got [${actualKeys.join(", ")}]`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}