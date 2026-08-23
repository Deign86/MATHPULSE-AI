import { runDiagnosticPolicySanityChecks, resolveCurriculumVersionSetId } from "../config/diagnosticPolicies";
import { runBackfillPatchSanityChecks } from "./backfillCurriculumVersion";

interface StringListMap { [key: string]: string[]; }

interface CheckResult { isValid: boolean; errors: string[]; }

interface VersionPropagationCheckResult extends CheckResult { defaultVersionsByGrade: Record<string, string>; }

const ALLOWED_LIFECYCLE_TRANSITIONS: StringListMap = {
  pending: ["queued", "in_progress", "completed", "expired"],
  queued: ["in_progress", "completed", "expired"],
  in_progress: ["completed", "expired"],
  expired: ["queued", "completed"],
  completed: [],
};

const VERSION_PROPAGATION_CONTRACT: StringListMap = {
  deepDiagnosticAssignments: ["curriculumVersionSetId", "lifecycleVersion"],
  recommendationLogs: ["curriculumVersionSetId"],
  learningPaths: ["curriculumVersionSetId"],
  assignedQuizzes: ["curriculumVersionSetId"],
  progressionAuditLog: ["curriculumVersionSetId", "unlockCriteriaVersion"],
};

export interface RuntimeCheckResult {
  isValid: boolean;
  checks: {
    policyNormalization: {
      isValid: boolean;
      errors: string[];
    };
    lifecycleTransitions: {
      isValid: boolean;
      errors: string[];
    };
    versionTagPropagation: {
      isValid: boolean;
      errors: string[];
      defaultVersionsByGrade: Record<string, string>;
    };
    migrationPatchValidity: {
      isValid: boolean;
      errors: string[];
    };
  };
}

function checkLifecycleTransitionMatrix(): CheckResult {
  const errors: string[] = [];

  for (const [from, nextStates] of Object.entries(ALLOWED_LIFECYCLE_TRANSITIONS)) {
    if (!Array.isArray(nextStates)) {
      errors.push(`Transition list missing for status: ${from}`);
      continue;
    }

    for (const to of nextStates) {
      if (!(to in ALLOWED_LIFECYCLE_TRANSITIONS)) {
        errors.push(`Unknown target lifecycle status: ${from} -> ${to}`);
      }
      if (from === "completed") {
        errors.push("Completed state must be terminal");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function checkVersionPropagationContract(): VersionPropagationCheckResult {
  const errors: string[] = [];

  for (const [collectionName, fields] of Object.entries(VERSION_PROPAGATION_CONTRACT)) {
    if (!fields.length) {
      errors.push(`No version fields configured for collection: ${collectionName}`);
      continue;
    }

    for (const field of fields) {
      if (!field.toLowerCase().includes("version")) {
        errors.push(`Non-version field in version propagation contract: ${collectionName}.${field}`);
      }
    }
  }

  const defaultVersionsByGrade = {
    "Grade 11": resolveCurriculumVersionSetId("Grade 11"),
    "Grade 12": resolveCurriculumVersionSetId("Grade 12"),
  };

  if (!defaultVersionsByGrade["Grade 11"] || !defaultVersionsByGrade["Grade 12"]) {
    errors.push("Default curriculum version map is missing Grade 11 or Grade 12 values");
  }

  return {
    isValid: errors.length === 0,
    errors,
    defaultVersionsByGrade,
  } satisfies VersionPropagationCheckResult;
}

export function runTargetedRuntimeChecks(): RuntimeCheckResult {
  const policyNormalization = runDiagnosticPolicySanityChecks();
  const lifecycleTransitions = checkLifecycleTransitionMatrix();
  const versionTagPropagation = checkVersionPropagationContract();
  const migrationPatchValidity = runBackfillPatchSanityChecks();

  return {
    isValid:
      policyNormalization.isValid &&
      lifecycleTransitions.isValid &&
      versionTagPropagation.isValid &&
      migrationPatchValidity.isValid,
    checks: {
      policyNormalization,
      lifecycleTransitions,
      versionTagPropagation,
      migrationPatchValidity,
    },
  };
}
