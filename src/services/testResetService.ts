import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Query,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole } from '../types/models';
import { initializeUserProgress } from './progressService';

const BATCH_SIZE = 400;
const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

export interface ResetTestingDataParams {
  uid: string;
  role: UserRole;
  lrn?: string;
}

export interface ResetTestingDataResult {
  role: UserRole;
  deletedDocs: number;
  updatedDocs: number;
  summary: string;
}

async function resetTestingDataViaBackend(params: ResetTestingDataParams): Promise<ResetTestingDataResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication is required to reset testing data.');
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_URL}/api/testing/reset-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      role: params.role,
      ...(params.lrn ? { lrn: params.lrn } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : '';
    throw new Error(detail || `Reset request failed with status ${response.status}.`);
  }

  const role = typeof payload?.role === 'string' ? payload.role : params.role;
  const deletedDocs = Number(payload?.deletedDocs ?? 0);
  const updatedDocs = Number(payload?.updatedDocs ?? 0);
  const summary = typeof payload?.summary === 'string'
    ? payload.summary
    : `${role} reset complete: ${deletedDocs} records deleted, ${updatedDocs} records reset.`;

  return {
    role: role as UserRole,
    deletedDocs,
    updatedDocs,
    summary,
  };
}

async function deleteByQuery(q: Query<DocumentData>): Promise<number> {
  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  let batch = writeBatch(db);
  let pending = 0;
  let deleted = 0;

  for (const item of snapshot.docs) {
    batch.delete(item.ref);
    pending += 1;
    deleted += 1;

    if (pending >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      pending = 0;
    }
  }

  if (pending > 0) {
    await batch.commit();
  }

  return deleted;
}

async function deleteByField(collectionName: string, field: string, value: string): Promise<number> {
  return deleteByQuery(query(collection(db, collectionName), where(field, '==', value)));
}

async function tryDeleteByField(collectionName: string, field: string, value: string): Promise<number> {
  try {
    return await deleteByField(collectionName, field, value);
  } catch {
    return 0;
  }
}

async function deleteSubcollectiondocs(
  parentPath: string,
  subcollectionName: string,
): Promise<number> {
  try {
    const q = collection(db, parentPath, subcollectionName);
    return await deleteByQuery(q);
  } catch {
    return 0;
  }
}

async function resetStudentTestingData(uid: string, lrn?: string): Promise<{ deletedDocs: number; updatedDocs: number }> {
  const effectiveLrn = lrn || uid;
  let deletedDocs = 0;
  let updatedDocs = 0;

  await initializeUserProgress(uid);
  updatedDocs += 1;

  // Preserve profile identity fields before reset
  const userSnap = await getDoc(doc(db, 'users', uid));
  let preservedFields: Record<string, any> = {};
  if (userSnap.exists()) {
    const data = userSnap.data();
    preservedFields = {
      ...(data.photo ? { photo: data.photo } : {}),
      ...(data.avatarLayers ? { avatarLayers: data.avatarLayers } : {}),
      ...(data.ownedAvatarItems ? { ownedAvatarItems: data.ownedAvatarItems } : {}),
    };
  }

  // Reset users/{uid} with all assessment fields cleared
  await setDoc(
    doc(db, 'users', uid),
    {
      ...preservedFields,
      level: 1,
      currentXP: 0,
      totalXP: 0,
      streak: 0,
      streakHistory: [],
      atRiskSubjects: [],
      hasTakenDiagnostic: false,
      iarAssessmentState: 'not_started',
      learningPathState: 'unlocked',
      remediationState: 'not_required',
      subjectBadges: {},
      riskClassifications: {},
      overallRisk: 'Low',
      assessmentDismissed: false,
      initialAssessmentCompleted: false,
      hasCompletedInitialAssessment: false,
      assessmentResults: null,
      assessmentCompletedAt: null,
      initialAssessmentCompletedAt: deleteField(),
      // Additional assessment fields to reset
      diagnosticCompleted: false,
      lastAssessmentDate: deleteField(),
      assessmentAttemptCount: 0,
      initialProficiencyLevel: deleteField(),
      iarQuestionSetVersion: deleteField(),
      iarTopicClassifications: deleteField(),
      topicScores: deleteField(),
      priorityTopics: deleteField(),
      recommendedPace: deleteField(),
      g12ReadinessIndicators: deleteField(),
      riskFlags: deleteField(),
      iarMode: deleteField(),
      lastAssessmentType: deleteField(),
      startingQuarterG11: deleteField(),
      recommendedNextTopicGroupId: deleteField(),
      recommendationRationale: deleteField(),
      recommendationReasonCode: deleteField(),
      grade12TransitionGate: deleteField(),
      currentCurriculumVersionSetId: deleteField(),
      unlockCriteriaVersion: deleteField(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  updatedDocs += 1;

  deletedDocs += await tryDeleteByField('notifications', 'userId', uid);
  deletedDocs += await tryDeleteByField('chatSessions', 'userId', uid);
  deletedDocs += await tryDeleteByField('chatMessages', 'userId', uid);

  // Delete legacy diagnostic results and competency profile so checkDiagnostic
  // on next load sees no completed assessment and shows the modal.
  await deleteDoc(doc(db, 'diagnosticResults', uid)).then(() => { deletedDocs += 1; }).catch(() => undefined);
  await deleteDoc(doc(db, 'competencyProfiles', uid)).then(() => { deletedDocs += 1; }).catch(() => undefined);
  await deleteDoc(doc(db, 'assessments', uid)).then(() => { deletedDocs += 1; }).catch(() => undefined);

  // Delete assessment subcollection documents
  deletedDocs += await deleteSubcollectiondocs(`assessmentResults/${uid}`, 'attempts');
  deletedDocs += await deleteSubcollectiondocs(`assessments/${uid}`, 'attempts');
  deletedDocs += await deleteSubcollectiondocs(`studentProgress/${uid}`, 'diagnostics');
  deletedDocs += await deleteSubcollectiondocs(`assessmentQuestionHistory/${uid}`, 'questions');

  if (effectiveLrn !== uid) {
    deletedDocs += await tryDeleteByField('notifications', 'userId', effectiveLrn);
    await deleteDoc(doc(db, 'diagnosticResults', effectiveLrn)).then(() => { deletedDocs += 1; }).catch(() => undefined);
  }

  await setDoc(
    doc(db, 'achievements', uid),
    {
      userId: uid,
      achievements: [],
      totalAchievements: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  ).catch(() => undefined);

  return { deletedDocs, updatedDocs };
}

async function resetTeacherTestingData(uid: string): Promise<{ deletedDocs: number; updatedDocs: number }> {
  let deletedDocs = 0;
  let updatedDocs = 0;

  const classroomsSnapshot = await getDocs(query(collection(db, 'classrooms'), where('teacherId', '==', uid)));
  const classroomIds = classroomsSnapshot.docs.map((entry) => entry.id);

  deletedDocs += await tryDeleteByField('notifications', 'userId', uid);
  deletedDocs += await tryDeleteByField('chatSessions', 'userId', uid);
  deletedDocs += await tryDeleteByField('chatMessages', 'userId', uid);
  deletedDocs += await tryDeleteByField('announcements', 'teacherId', uid);
  deletedDocs += await tryDeleteByField('classSectionOwnership', 'ownerTeacherId', uid);

  // Remove teacher-owned dashboard and import data so reset leaves no residual class/student records.
  deletedDocs += await tryDeleteByField('managedStudents', 'teacherId', uid);
  deletedDocs += await tryDeleteByField('classrooms', 'teacherId', uid);
  deletedDocs += await tryDeleteByField('normalizedClassRecords', 'teacherId', uid);
  deletedDocs += await tryDeleteByField('classRecordImports', 'teacherId', uid);
  deletedDocs += await tryDeleteByField('courseMaterials', 'teacherId', uid);
  deletedDocs += await tryDeleteByField('riskRefreshEvents', 'teacherId', uid);
  deletedDocs += await tryDeleteByField('riskRefreshJobs', 'teacherId', uid);
  deletedDocs += await tryDeleteByField('importGroundedFeedbackEvents', 'teacherId', uid);

  // Remove audit traces tied to the teacher's import actions.
  deletedDocs += await tryDeleteByField('accessAuditLogs', 'actorUid', uid);
  deletedDocs += await tryDeleteByField('accessAuditLogs', 'teacherId', uid);

  for (const classroomId of classroomIds) {
    deletedDocs += await tryDeleteByField('managedStudents', 'classroomId', classroomId);
    deletedDocs += await tryDeleteByField('activities', 'classroomId', classroomId);
    deletedDocs += await tryDeleteByField('announcements', 'classroomId', classroomId);
    await deleteDoc(doc(db, 'classrooms', classroomId)).then(() => {
      deletedDocs += 1;
    }).catch(() => undefined);
  }

  await deleteDoc(doc(db, 'riskRefreshStats', uid)).then(() => {
    deletedDocs += 1;
  }).catch(() => undefined);

  await setDoc(
    doc(db, 'users', uid),
    {
      testingResetAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  ).catch(() => undefined);
  updatedDocs += 1;

  return { deletedDocs, updatedDocs };
}

async function resetAdminTestingData(uid: string): Promise<{ deletedDocs: number; updatedDocs: number }> {
  let deletedDocs = 0;
  let updatedDocs = 0;

  deletedDocs += await tryDeleteByField('notifications', 'userId', uid);
  deletedDocs += await tryDeleteByField('chatSessions', 'userId', uid);
  deletedDocs += await tryDeleteByField('chatMessages', 'userId', uid);
  deletedDocs += await tryDeleteByField('curriculumContent', 'updatedBy', uid);
  deletedDocs += await tryDeleteByField('curriculumContent', 'deletedBy', uid);

  await setDoc(
    doc(db, 'users', uid),
    {
      testingResetAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  ).catch(() => undefined);
  updatedDocs += 1;

  return { deletedDocs, updatedDocs };
}

export async function resetTestingDataForRole(
  params: ResetTestingDataParams,
): Promise<ResetTestingDataResult> {
  const { uid, role, lrn } = params;

  if (!uid) {
    throw new Error('Missing user id for reset.');
  }

  let localResult: { deletedDocs: number; updatedDocs: number };
  if (role === 'student') {
    localResult = await resetStudentTestingData(uid, lrn);
  } else if (role === 'teacher') {
    localResult = await resetTeacherTestingData(uid);
  } else {
    localResult = await resetAdminTestingData(uid);
  }

  // Also persist to backend for audit / server-side cleanup
  let backendResult: ResetTestingDataResult | null = null;
  try {
    backendResult = await resetTestingDataViaBackend(params);
  } catch (err) {
    console.warn('[testReset] Backend sync failed (non-fatal):', err);
  }

  return {
    role,
    deletedDocs: localResult.deletedDocs + (backendResult?.deletedDocs ?? 0),
    updatedDocs: localResult.updatedDocs + (backendResult?.updatedDocs ?? 0),
    summary: `${role} reset complete: ${localResult.deletedDocs} local records deleted, ${localResult.updatedDocs} local records updated.${backendResult ? ` Backend: ${backendResult.summary}` : ''}`,
  };
}
