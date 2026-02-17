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
  name: string;
  email: string;
  avatar: string;
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
  schedule: string;
  studentCount: number;
  avgScore: number;
  atRiskCount: number;
  createdAt: Timestamp;
}

export interface ClassActivity {
  id: string;
  studentId: string;
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

// ─── Student Operations ───────────────────────────────────────

export async function getStudentsByTeacher(teacherId: string): Promise<ManagedStudent[]> {
  const classrooms = await getClassroomsByTeacher(teacherId);
  const classroomIds = classrooms.map((c) => c.id);

  if (classroomIds.length === 0) return [];

  const studentsRef = collection(db, 'managedStudents');
  const q = query(studentsRef, where('classroomId', 'in', classroomIds), orderBy('name'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ManagedStudent[];
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
  studentId: string,
  riskLevel: 'High' | 'Medium' | 'Low',
  confidence?: number
): Promise<void> {
  const studentRef = doc(db, 'managedStudents', studentId);
  await updateDoc(studentRef, {
    riskLevel,
    ...(confidence !== undefined ? { riskConfidence: confidence } : {}),
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

export async function deleteManagedStudent(studentId: string): Promise<void> {
  await deleteDoc(doc(db, 'managedStudents', studentId));
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
  const docRef = await addDoc(classroomsRef, {
    ...classroom,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
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
