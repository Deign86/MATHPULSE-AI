// src/services/studentService.ts
// Firebase Firestore operations for student management (teacher features)

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ClassSectionMetadata } from '../types/models';

// Types for the teacher's student management
export interface ManagedStudent {
  id: string;
  lrn?: string;
  name: string;
  email: string;
  avatar: string;
  teacherId?: string;
  className?: string;
  grade?: string;
  gradeLevel?: string;
  classification?: string;
  strand?: string;
  section?: string;
  classSectionId?: string;
  managerId?: string;
  managerName?: string;
  classMetadata?: ClassSectionMetadata;
  riskLevel: 'High' | 'Medium' | 'Low';
  engagementScore: number;
  avgQuizScore: number;
  weakestTopic: string;
  classroomId: string;
  attendance: number;
  assignmentCompletion: number;
  lastActive: Timestamp | null;
  struggles: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  grade?: string;
  gradeLevel?: string;
  classification?: string;
  strand?: string;
  section?: string;
  classSectionId?: string;
  schoolYear?: string;
  ownerTeacherId?: string;
  ownerTeacherName?: string;
  adviserTeacherId?: string;
  adviserTeacherName?: string;
  managerId?: string;
  managerName?: string;
  classMetadata?: ClassSectionMetadata;
  schedule: string;
  studentCount: number;
  avgScore: number;
  atRiskCount: number;
  createdAt: Timestamp;
}

export interface ClassActivity {
  id: string;
  lrn: string;
  studentName: string;
  action: string;
  topic: string;
  classroomId: string;
  type: 'success' | 'warning' | 'info';
  timestamp: Timestamp;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  classroomId: string;
  teacherId: string;
  createdAt: Timestamp;
}

export interface ClassSectionOwnershipRecord {
  id: string;
  classSectionId: string;
  grade: string;
  gradeLevel?: string;
  classification?: string;
  strand?: string;
  section: string;
  schoolYear: string;
  ownerTeacherId: string;
  ownerTeacherName?: string;
  managerId?: string;
  managerName?: string;
  className?: string;
  studentUids: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeacherDirectoryOption {
  uid: string;
  name: string;
  email: string;
  photo?: string;
}

export interface AssignClassSectionManagerInput {
  classSectionId: string;
  grade: string;
  section: string;
  schoolYear: string;
  ownerTeacherId: string;
  ownerTeacherName?: string;
  managerId: string;
  managerName?: string;
  className?: string;
  classification?: string;
  strand?: string;
  gradeLevel?: string;
}

// ─── Student Operations ───────────────────────────────────────

export async function getStudentsByTeacher(teacherId: string): Promise<ManagedStudent[]> {
  const studentsRef = collection(db, 'managedStudents');

  // Prefer teacher-scoped reads to avoid Firestore `in` query limits after many imports.
  try {
    const teacherScopedQuery = query(studentsRef, where('teacherId', '==', teacherId));
    const teacherScopedSnapshot = await getDocs(teacherScopedQuery);
    if (!teacherScopedSnapshot.empty) {
      const mappedStudents = teacherScopedSnapshot.docs
        .map((entry) => ({
          id: entry.id,
          ...entry.data(),
        } as ManagedStudent));
      return mappedStudents.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
  } catch {
    // Fall back to classroom-based reads for legacy documents or restricted indexes.
  }

  const classrooms = await getClassroomsByTeacher(teacherId);
  const classroomIds = classrooms.map((c) => c.id);
  if (classroomIds.length === 0) return [];

  const dedupedStudents = new Map<string, ManagedStudent>();
  for (let index = 0; index < classroomIds.length; index += 10) {
    const classroomChunk = classroomIds.slice(index, index + 10);
    const chunkQuery = query(studentsRef, where('classroomId', 'in', classroomChunk));
    const chunkSnapshot = await getDocs(chunkQuery);
    chunkSnapshot.docs.forEach((entry) => {
      dedupedStudents.set(entry.id, {
        id: entry.id,
        ...entry.data(),
      } as ManagedStudent);
    });
  }

  return Array.from(dedupedStudents.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export async function getStudentsByClassroom(classroomId: string): Promise<ManagedStudent[]> {
  const studentsRef = collection(db, 'managedStudents');
  const q = query(studentsRef, where('classroomId', '==', classroomId), orderBy('name'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ManagedStudent[];
}

export async function updateStudentRisk(
  lrn: string,
  riskLevel: 'High' | 'Medium' | 'Low',
  confidence?: number
): Promise<void> {
  const studentRef = doc(db, 'managedStudents', lrn);
  await updateDoc(studentRef, {
    riskLevel,
    ...(confidence !== undefined ? { riskConfidence: confidence } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function updateManagedStudentSectionAssignment(
  lrn: string,
  grade: string,
  section: string
): Promise<void> {
  const classSectionId = buildClassSectionId(grade, section);
  const studentRef = doc(db, 'managedStudents', lrn);
  await updateDoc(studentRef, {
    grade,
    section,
    classSectionId,
    updatedAt: serverTimestamp(),
  });
}

export async function addManagedStudent(student: Omit<ManagedStudent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const studentsRef = collection(db, 'managedStudents');
  const docRef = await addDoc(studentsRef, {
    ...student,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function addManagedStudentsBatch(
  students: Omit<ManagedStudent, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const student of students) {
    const id = await addManagedStudent(student);
    ids.push(id);
  }
  return ids;
}

export async function deleteManagedStudent(lrn: string): Promise<void> {
  await deleteDoc(doc(db, 'managedStudents', lrn));
}

export function buildClassSectionId(grade: string, section: string): string {
  return [grade, section].filter(Boolean).join('_').replace(/\s+/g, '_').toLowerCase();
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined);
  return Object.fromEntries(entries) as T;
}

export function normalizeGradeLevel(rawGrade?: string | null): string | null {
  const value = (rawGrade || '').trim();
  if (!value) return null;

  const match = value.match(/(\d{1,2})/);
  if (match) {
    return `Grade ${match[1]}`;
  }

  if (/^grade\s+/i.test(value)) {
    return value
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^grade/i, 'Grade');
  }

  return value;
}

export function inferClassification(gradeLevel?: string | null): string | null {
  const normalized = normalizeGradeLevel(gradeLevel);
  const gradeMatch = normalized?.match(/(\d{1,2})/);
  const gradeNumber = gradeMatch ? Number.parseInt(gradeMatch[1], 10) : Number.NaN;

  if (Number.isFinite(gradeNumber)) {
    if (gradeNumber >= 11) return 'Senior High School';
    return 'Junior High School';
  }

  return null;
}

export function inferStrand(className?: string | null, section?: string | null): string | null {
  const source = `${className || ''} ${section || ''}`.toUpperCase();
  if (!source.trim()) return null;

  const known = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'ICT'];
  for (const token of known) {
    if (new RegExp(`\\b${token}\\b`).test(source)) {
      return token;
    }
  }

  return null;
}

export function parseClassName(className?: string | null): { grade: string; section: string } {
  const normalized = (className || '').trim();
  if (!normalized) {
    return { grade: 'Grade 11', section: 'Section A' };
  }

  const [grade = 'Grade 11', section = 'Section A'] = normalized
    .split(' - ')
    .map((token) => token.trim()) as [string?, string?];

  return {
    grade: grade || 'Grade 11',
    section: section || 'Section A',
  };
}

export function resolveClassMetadata(input: {
  metadata?: ClassSectionMetadata | null;
  classSectionId?: string | null;
  className?: string | null;
  grade?: string | null;
  gradeLevel?: string | null;
  classification?: string | null;
  strand?: string | null;
  section?: string | null;
  schoolYear?: string | null;
  ownerTeacherId?: string | null;
  ownerTeacherName?: string | null;
  adviserTeacherId?: string | null;
  adviserTeacherName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
}): ClassSectionMetadata {
  const metadata = input.metadata || {};
  const preferredClassName = input.className || metadata.className;
  const parsed = parseClassName(preferredClassName);
  const grade = (input.grade || metadata.grade || parsed.grade || '').trim() || null;
  const section = (input.section || metadata.section || parsed.section || '').trim() || null;
  const classSectionId =
    (input.classSectionId || metadata.classSectionId || '').trim()
    || (grade && section ? buildClassSectionId(grade, section) : '')
    || null;
  const className =
    (preferredClassName || '').trim()
    || (grade && section ? `${grade} - ${section}` : '')
    || null;
  const gradeLevel = normalizeGradeLevel(input.gradeLevel || metadata.gradeLevel || grade);
  const classification =
    (input.classification || metadata.classification || '').trim()
    || inferClassification(gradeLevel)
    || null;
  const strand =
    (input.strand || metadata.strand || '').trim()
    || inferStrand(className, section)
    || null;

  return {
    classSectionId,
    className,
    grade,
    section,
    gradeLevel,
    classification,
    strand,
    schoolYear: (input.schoolYear || metadata.schoolYear || '').trim() || null,
    ownerTeacherId: (input.ownerTeacherId || metadata.ownerTeacherId || '').trim() || null,
    ownerTeacherName: (input.ownerTeacherName || metadata.ownerTeacherName || '').trim() || null,
    adviserTeacherId: (input.adviserTeacherId || metadata.adviserTeacherId || '').trim() || null,
    adviserTeacherName: (input.adviserTeacherName || metadata.adviserTeacherName || '').trim() || null,
    managerId: (input.managerId || metadata.managerId || '').trim() || null,
    managerName: (input.managerName || metadata.managerName || '').trim() || null,
  };
}

export function buildClassSectionMetadata(input: {
  classSectionId?: string | null;
  className?: string | null;
  grade?: string | null;
  section?: string | null;
  gradeLevel?: string | null;
  classification?: string | null;
  strand?: string | null;
  schoolYear?: string | null;
  ownerTeacherId?: string | null;
  ownerTeacherName?: string | null;
  adviserTeacherId?: string | null;
  adviserTeacherName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
}): ClassSectionMetadata {
  const normalizedClassName = (input.className || '').trim();
  const [derivedGrade = '', derivedSection = ''] = normalizedClassName.split(' - ');
  const grade = (input.grade || derivedGrade || '').trim() || null;
  const section = (input.section || derivedSection || '').trim() || null;
  const classSectionId = (input.classSectionId || '').trim() || (grade && section ? buildClassSectionId(grade, section) : '') || null;
  const className = normalizedClassName || (grade && section ? `${grade} - ${section}` : null);
  const gradeLevel = normalizeGradeLevel(input.gradeLevel || grade);
  const classification = (input.classification || '').trim() || inferClassification(gradeLevel);
  const strand = (input.strand || '').trim() || inferStrand(className, section);

  return {
    classSectionId,
    className,
    grade,
    section,
    gradeLevel,
    classification,
    strand,
    schoolYear: (input.schoolYear || '').trim() || null,
    ownerTeacherId: (input.ownerTeacherId || '').trim() || null,
    ownerTeacherName: (input.ownerTeacherName || '').trim() || null,
    adviserTeacherId: (input.adviserTeacherId || '').trim() || null,
    adviserTeacherName: (input.adviserTeacherName || '').trim() || null,
    managerId: (input.managerId || '').trim() || null,
    managerName: (input.managerName || '').trim() || null,
  };
}

// ─── Classroom Operations ─────────────────────────────────────

export async function getClassroomsByTeacher(teacherId: string): Promise<Classroom[]> {
  const classroomsRef = collection(db, 'classrooms');
  const deduped = new Map<string, Classroom>();

  const teacherOwnedQuery = query(classroomsRef, where('teacherId', '==', teacherId));
  const teacherOwnedSnapshot = await getDocs(teacherOwnedQuery);
  teacherOwnedSnapshot.docs.forEach((entry) => {
    deduped.set(entry.id, {
      id: entry.id,
      ...entry.data(),
    } as Classroom);
  });

  // Include classes where this teacher is currently assigned as manager.
  const managerQuery = query(classroomsRef, where('managerId', '==', teacherId));
  const managerSnapshot = await getDocs(managerQuery);
  managerSnapshot.docs.forEach((entry) => {
    deduped.set(entry.id, {
      id: entry.id,
      ...entry.data(),
    } as Classroom);
  });

  return Array.from(deduped.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export async function createClassroom(classroom: Omit<Classroom, 'id' | 'createdAt'>): Promise<string> {
  const classroomsRef = collection(db, 'classrooms');
  const classSectionId = classroom.classSectionId || buildClassSectionId(classroom.grade || '', classroom.section || '');
  const docRef = await addDoc(classroomsRef, {
    ...classroom,
    classSectionId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function upsertClassSectionOwnership(
  payload: Omit<ClassSectionOwnershipRecord, 'id' | 'createdAt' | 'updatedAt' | 'studentUids'> & { studentUids?: string[] }
): Promise<string> {
  const classSectionId = payload.classSectionId || buildClassSectionId(payload.grade, payload.section);
  const ref = doc(db, 'classSectionOwnership', classSectionId);
  const existing = await getDoc(ref);
  const existingStudentUids = existing.exists() ? (((existing.data() as { studentUids?: string[] }).studentUids) || []) : [];
  const mergedStudentUids = Array.from(new Set([...(payload.studentUids || []), ...existingStudentUids]));
  const basePayload = withoutUndefined(payload);

  if (existing.exists()) {
    await updateDoc(ref, {
      ...basePayload,
      classSectionId,
      studentUids: mergedStudentUids,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      ...basePayload,
      classSectionId,
      studentUids: mergedStudentUids,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return classSectionId;
}

export async function assignClassSectionManager(input: AssignClassSectionManagerInput): Promise<string> {
  const classSectionId = (input.classSectionId || '').trim() || buildClassSectionId(input.grade, input.section);
  const className = (input.className || '').trim() || `${input.grade} - ${input.section}`;
  const classMetadata = buildClassSectionMetadata({
    classSectionId,
    className,
    grade: input.grade,
    section: input.section,
    schoolYear: input.schoolYear,
    ownerTeacherId: input.ownerTeacherId,
    ownerTeacherName: input.ownerTeacherName,
    adviserTeacherId: input.ownerTeacherId,
    adviserTeacherName: input.ownerTeacherName,
    managerId: input.managerId,
    managerName: input.managerName,
    classification: input.classification,
    strand: input.strand,
    gradeLevel: input.gradeLevel,
  });

  await upsertClassSectionOwnership({
    classSectionId,
    className,
    grade: classMetadata.grade || input.grade,
    gradeLevel: classMetadata.gradeLevel || input.gradeLevel || input.grade,
    classification: classMetadata.classification || input.classification,
    strand: classMetadata.strand || input.strand,
    section: classMetadata.section || input.section,
    schoolYear: input.schoolYear,
    ownerTeacherId: input.ownerTeacherId,
    ownerTeacherName: input.ownerTeacherName,
    managerId: input.managerId,
    managerName: input.managerName,
    studentUids: [],
  });

  const classroomsRef = collection(db, 'classrooms');
  const classroomQuery = query(classroomsRef, where('classSectionId', '==', classSectionId));
  const classroomSnapshot = await getDocs(classroomQuery);

  if (classroomSnapshot.empty) {
    const createPayload = withoutUndefined({
      name: className,
      teacherId: input.ownerTeacherId,
      grade: classMetadata.grade,
      gradeLevel: classMetadata.gradeLevel,
      classification: classMetadata.classification,
      strand: classMetadata.strand,
      section: classMetadata.section,
      classSectionId,
      schoolYear: input.schoolYear,
      ownerTeacherId: input.ownerTeacherId,
      ownerTeacherName: input.ownerTeacherName || '',
      adviserTeacherId: input.ownerTeacherId,
      adviserTeacherName: input.ownerTeacherName || '',
      managerId: input.managerId,
      managerName: input.managerName || '',
      classMetadata,
      schedule: 'Mon-Fri',
      studentCount: 0,
      avgScore: 0,
      atRiskCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, 'classrooms', classSectionId),
      createPayload,
      { merge: true }
    );
  } else {
    for (const classroomDoc of classroomSnapshot.docs) {
      const updatePayload = withoutUndefined({
        name: className,
        grade: classMetadata.grade,
        gradeLevel: classMetadata.gradeLevel,
        classification: classMetadata.classification,
        strand: classMetadata.strand,
        section: classMetadata.section,
        schoolYear: input.schoolYear,
        ownerTeacherId: input.ownerTeacherId,
        ownerTeacherName: input.ownerTeacherName || '',
        adviserTeacherId: input.ownerTeacherId,
        adviserTeacherName: input.ownerTeacherName || '',
        managerId: input.managerId,
        managerName: input.managerName || '',
        classMetadata,
        updatedAt: serverTimestamp(),
      });

      await updateDoc(classroomDoc.ref, updatePayload);
    }
  }

  return classSectionId;
}

export async function assignStudentToClassSection(
  studentUid: string,
  grade: string,
  section: string,
  ownerTeacherId: string,
  schoolYear: string,
  ownerTeacherName?: string
): Promise<void> {
  const classSectionId = buildClassSectionId(grade, section);

  await upsertClassSectionOwnership({
    classSectionId,
    grade,
    section,
    schoolYear,
    ownerTeacherId,
    ownerTeacherName,
    studentUids: [studentUid],
  });

  await setDoc(
    doc(db, 'users', studentUid),
    {
      grade,
      section,
      classSectionId,
      adviserTeacherId: ownerTeacherId,
      adviserTeacherName: ownerTeacherName || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getClassSectionOwnershipByTeacher(teacherId: string): Promise<ClassSectionOwnershipRecord[]> {
  const ref = collection(db, 'classSectionOwnership');
  const byId = new Map<string, ClassSectionOwnershipRecord>();

  const ownerQuery = query(ref, where('ownerTeacherId', '==', teacherId));
  const ownerSnapshot = await getDocs(ownerQuery);
  ownerSnapshot.docs.forEach((entry) => {
    byId.set(entry.id, { id: entry.id, ...entry.data() } as ClassSectionOwnershipRecord);
  });

  const managerQuery = query(ref, where('managerId', '==', teacherId));
  const managerSnapshot = await getDocs(managerQuery);
  managerSnapshot.docs.forEach((entry) => {
    byId.set(entry.id, { id: entry.id, ...entry.data() } as ClassSectionOwnershipRecord);
  });

  return Array.from(byId.values()).sort((a, b) => String(a.classSectionId || '').localeCompare(String(b.classSectionId || '')));
}

export async function getTeacherDirectoryOptions(searchText = '', maxResults = 25): Promise<TeacherDirectoryOption[]> {
  const usersRef = collection(db, 'users');
  const cappedLimit = Math.max(1, Math.min(100, maxResults));
  const teacherQuery = query(usersRef, where('role', '==', 'teacher'), limit(cappedLimit * 4));
  const snapshot = await getDocs(teacherQuery);

  const normalizedQuery = searchText.trim().toLowerCase();
  const mapped = snapshot.docs
    .map((entry) => {
      const data = entry.data() as Record<string, unknown>;
      const name = String(data.name || '').trim();
      const email = String(data.email || '').trim();
      return {
        uid: entry.id,
        name: name || 'Teacher',
        email,
        photo: String(data.photo || data.photoURL || '').trim() || undefined,
      } as TeacherDirectoryOption;
    })
    .filter((teacher) => {
      if (!normalizedQuery) return true;
      return (
        teacher.name.toLowerCase().includes(normalizedQuery)
        || teacher.email.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, cappedLimit);

  return mapped;
}

// ─── Activity Feed ────────────────────────────────────────────

export function subscribeToActivityFeed(
  classroomIds: string[],
  callback: (activities: ClassActivity[]) => void,
  limitCount = 20
): () => void {
  if (classroomIds.length === 0) {
    callback([]);
    return () => {};
  }

  const activitiesRef = collection(db, 'activities');
  const q = query(
    activitiesRef,
    where('classroomId', 'in', classroomIds),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.slice(0, limitCount).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ClassActivity[];
    callback(activities);
  });
}

export async function logActivity(activity: Omit<ClassActivity, 'id' | 'timestamp'>): Promise<void> {
  const activitiesRef = collection(db, 'activities');
  await addDoc(activitiesRef, {
    ...activity,
    timestamp: serverTimestamp(),
  });
}

// ─── Announcements ────────────────────────────────────────────

export async function getAnnouncements(classroomId: string): Promise<Announcement[]> {
  const announcementsRef = collection(db, 'announcements');
  const q = query(
    announcementsRef,
    where('classroomId', '==', classroomId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Announcement[];
}

export async function createAnnouncement(
  announcement: Omit<Announcement, 'id' | 'createdAt'>
): Promise<string> {
  const announcementsRef = collection(db, 'announcements');
  const docRef = await addDoc(announcementsRef, {
    ...announcement,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Real-time Listeners ──────────────────────────────────────

export function subscribeToStudents(
  classroomId: string,
  callback: (students: ManagedStudent[]) => void
): () => void {
  const studentsRef = collection(db, 'managedStudents');
  const q = query(studentsRef, where('classroomId', '==', classroomId), orderBy('name'));

  return onSnapshot(q, (snapshot) => {
    const students = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ManagedStudent[];
    callback(students);
  });
}

// ============================================================================
// CROSS-ROLE STUDENT DATA (Phase 2: Connect Student Data to Teacher)
// ============================================================================

import {
  getQuizResultsByTeacher,
  getModuleProgressByTeacher,
  getEngagementMetricsByTeacher,
  getDiagnosticResultsByTeacher,
  getAITutorUsageByTeacher,
  getClassMasterySummary,
  type StudentQuizResult,
  type StudentModuleProgress,
  type StudentEngagementMetrics,
  type StudentDiagnosticResult,
  type StudentAITutorUsage,
  type ClassMasterySummary
} from './studentDataService';

/**
 * Get quiz results for all students in a teacher's classes
 */
export async function getStudentQuizResults(teacherId: string): Promise<StudentQuizResult[]> {
  try {
    // Get teacher's classrooms first
    const classrooms = await getClassroomsByTeacher(teacherId);
    const classroomIds = classrooms.map(c => c.id);
    
    if (classroomIds.length === 0) return [];
    
    return await getQuizResultsByTeacher(teacherId, classroomIds);
  } catch (error) {
    console.error('[studentService] getStudentQuizResults error:', error);
    return [];
  }
}

/**
 * Get module progress for all students in a teacher's classes
 */
export async function getStudentModuleProgress(teacherId: string, subjectId?: string): Promise<StudentModuleProgress[]> {
  try {
    return await getModuleProgressByTeacher(teacherId, subjectId);
  } catch (error) {
    console.error('[studentService] getStudentModuleProgress error:', error);
    return [];
  }
}

/**
 * Get XP and engagement metrics for all students in a teacher's classes
 */
export async function getStudentEngagementMetrics(teacherId: string): Promise<StudentEngagementMetrics[]> {
  try {
    return await getEngagementMetricsByTeacher(teacherId);
  } catch (error) {
    console.error('[studentService] getStudentEngagementMetrics error:', error);
    return [];
  }
}

/**
 * Get diagnostic assessment results for all students in a teacher's classes
 */
export async function getStudentDiagnosticResults(teacherId: string): Promise<StudentDiagnosticResult[]> {
  try {
    return await getDiagnosticResultsByTeacher(teacherId);
  } catch (error) {
    console.error('[studentService] getStudentDiagnosticResults error:', error);
    return [];
  }
}

/**
 * Get AI tutor usage statistics for all students in a teacher's classes
 */
export async function getStudentAITutorUsage(teacherId: string): Promise<StudentAITutorUsage[]> {
  try {
    return await getAITutorUsageByTeacher(teacherId);
  } catch (error) {
    console.error('[studentService] getStudentAITutorUsage error:', error);
    return [];
  }
}

/**
 * Get class-wide mastery summary for a subject
 */
export async function getClassMasteryBySubject(teacherId: string, subjectId: string): Promise<ClassMasterySummary[]> {
  try {
    return await getClassMasterySummary(teacherId, subjectId);
  } catch (error) {
    console.error('[studentService] getClassMasteryBySubject error:', error);
    return [];
  }
}
