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
  onSnapshot,
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Types for the teacher's student management
export interface ManagedStudent {
  id: string;
  lrn?: string;
  name: string;
  email: string;
  avatar: string;
  grade?: string;
  section?: string;
  classSectionId?: string;
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
  section?: string;
  classSectionId?: string;
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
  section: string;
  schoolYear: string;
  ownerTeacherId: string;
  ownerTeacherName?: string;
  studentUids: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

// ─── Classroom Operations ─────────────────────────────────────

export async function getClassroomsByTeacher(teacherId: string): Promise<Classroom[]> {
  const classroomsRef = collection(db, 'classrooms');
  const q = query(classroomsRef, where('teacherId', '==', teacherId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Classroom[];
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

  if (existing.exists()) {
    await updateDoc(ref, {
      ...payload,
      classSectionId,
      studentUids: mergedStudentUids,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      ...payload,
      classSectionId,
      studentUids: mergedStudentUids,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
  const q = query(ref, where('ownerTeacherId', '==', teacherId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as ClassSectionOwnershipRecord[];
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
