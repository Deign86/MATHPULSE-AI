import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Query,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserRole } from '../types/models';
import { initializeUserProgress } from './progressService';

const BATCH_SIZE = 400;

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

async function resetStudentTestingData(uid: string, lrn?: string): Promise<{ deletedDocs: number; updatedDocs: number }> {
  const effectiveLrn = lrn || uid;
  let deletedDocs = 0;
  let updatedDocs = 0;

  await initializeUserProgress(uid);
  updatedDocs += 1;

  await setDoc(
    doc(db, 'users', uid),
    {
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
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  updatedDocs += 1;

  deletedDocs += await tryDeleteByField('notifications', 'userId', uid);
  deletedDocs += await tryDeleteByField('chatSessions', 'userId', uid);
  deletedDocs += await tryDeleteByField('chatMessages', 'userId', uid);

  if (effectiveLrn !== uid) {
    deletedDocs += await tryDeleteByField('notifications', 'userId', effectiveLrn);
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

  let result: { deletedDocs: number; updatedDocs: number };

  if (role === 'student') {
    result = await resetStudentTestingData(uid, lrn);
  } else if (role === 'teacher') {
    result = await resetTeacherTestingData(uid);
  } else {
    result = await resetAdminTestingData(uid);
  }

  const summary = `${role} reset complete: ${result.deletedDocs} records deleted, ${result.updatedDocs} records reset.`;

  return {
    role,
    deletedDocs: result.deletedDocs,
    updatedDocs: result.updatedDocs,
    summary,
  };
}
