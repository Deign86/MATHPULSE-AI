// src/services/adminService.ts
// Firebase Firestore operations for admin panel features

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Types ───────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  /** Capitalized: 'Student' | 'Teacher' | 'Admin' */
  role: string;
  status: string;
  department: string;
  photo?: string;
  lastLogin: string;
}

export type AuditSeverity = 'Info' | 'Warning' | 'Error' | 'Critical';
export type AuditCategory = 'Auth' | 'User' | 'Content' | 'System' | 'Data';

export interface AuditLogEntry {
  id: string;
  severity: AuditSeverity;
  timestamp: string;
  user: { name: string; role: string; avatar: string | null };
  action: string;
  category: AuditCategory;
  details: string;
}

export interface ContentModule {
  id: string;
  title: string;
  subject: string;
  type: 'Video' | 'Quiz' | 'Document';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'N/A';
  status: 'Published' | 'Draft' | 'Archived';
  assigned: number;
  created: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeTeachers: number;
  totalClasses: number;
  atRiskStudents: number;
  avgPerformance: number;
  aiPredictions: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  avatar: string;
  class: string;
  performance: number;
  level: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function capitalizeRole(role: string): string {
  if (!role) return 'Student';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getDepartmentFromProfile(data: Record<string, unknown>): string {
  if (data.role === 'student') return (data.grade as string) || 'Student';
  if (data.role === 'teacher') return (data.department as string) || 'Mathematics';
  if (data.role === 'admin') return (data.department as string) || 'System';
  return '';
}

function formatLastLogin(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return 'Never';
  const date = ts.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function timestampToString(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return new Date().toISOString().replace('T', ' ').slice(0, 19);
  const d = ts.toDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function nowTimestamp(): string {
  return timestampToString({ toDate: () => new Date() });
}

// ─── User Management ─────────────────────────────────────────

/** Get all users from the 'users' Firestore collection. */
export async function getAllUsers(): Promise<AdminUser[]> {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        name: (data.name as string) || 'Unknown',
        email: (data.email as string) || '',
        role: capitalizeRole(data.role as string),
        status: (data.status as string) || 'Active',
        department: getDepartmentFromProfile(data),
        photo: (data.photo as string) || (data.photoURL as string) || '',
        lastLogin: formatLastLogin(data.lastLogin as { toDate?: () => Date } | null),
      };
    });
  } catch (err) {
    console.error('[adminService] getAllUsers error:', err);
    return [];
  }
}

/** Update a user's Firestore profile. */
export async function updateAdminUser(uid: string, updates: Partial<AdminUser>): Promise<void> {
  const ref = doc(db, 'users', uid);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firestoreUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) firestoreUpdates.name = updates.name;
  if (updates.email !== undefined) firestoreUpdates.email = updates.email;
  if (updates.status !== undefined) firestoreUpdates.status = updates.status;
  if (updates.role !== undefined) {
    firestoreUpdates.role = updates.role.toLowerCase();
  }
  if (updates.department !== undefined) {
    firestoreUpdates.department = updates.department;
    // Also update 'grade' for students
    if (updates.role?.toLowerCase() === 'student') {
      firestoreUpdates.grade = updates.department;
    }
  }
  await updateDoc(ref, firestoreUpdates);
}

/** Delete a user's Firestore profile document. */
export async function deleteAdminUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
}

/**
 * Create a new user profile directly in Firestore.
 * Note: This creates only the Firestore profile (no Firebase Auth account).
 * A server-side Cloud Function would be required to also create the Auth account.
 */
export async function createAdminUser(
  email: string,
  name: string,
  role: string,
  department: string
): Promise<string> {
  const roleLower = role.toLowerCase() as 'student' | 'teacher' | 'admin';
  const baseProfile: Record<string, unknown> = {
    email,
    name,
    role: roleLower,
    status: 'Active',
    department,
    photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d9488&color=fff`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (roleLower === 'student') {
    Object.assign(baseProfile, {
      studentId: `STU-${Date.now()}`,
      grade: department,
      level: 1,
      currentXP: 0,
      totalXP: 0,
      streak: 0,
      friends: [],
      atRiskSubjects: [],
      hasTakenDiagnostic: false,
    });
  } else if (roleLower === 'teacher') {
    Object.assign(baseProfile, {
      teacherId: `TCH-${Date.now()}`,
      subject: 'Mathematics',
      yearsOfExperience: '0',
      qualification: '',
      students: [],
    });
  } else if (roleLower === 'admin') {
    Object.assign(baseProfile, {
      adminId: `ADM-${Date.now()}`,
      position: 'Administrator',
    });
  }

  const docRef = await addDoc(collection(db, 'users'), baseProfile);
  return docRef.id;
}

// ─── Audit Logs ──────────────────────────────────────────────

/** Fetch audit log entries ordered by most recent. */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestampRaw', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        severity: (data.severity as AuditSeverity) || 'Info',
        timestamp: (data.timestamp as string) || timestampToString(data.timestampRaw as { toDate?: () => Date }),
        user: (data.user as AuditLogEntry['user']) || { name: 'System', role: 'Admin', avatar: null },
        action: (data.action as string) || '',
        category: (data.category as AuditCategory) || 'System',
        details: (data.details as string) || '',
      };
    });
  } catch (err) {
    console.error('[adminService] getAuditLogs error:', err);
    return [];
  }
}

/** Write a new audit log entry to Firestore. */
export async function addAuditLog(
  action: string,
  category: AuditCategory,
  severity: AuditSeverity,
  details: string,
  user: AuditLogEntry['user']
): Promise<void> {
  await addDoc(collection(db, 'auditLogs'), {
    severity,
    timestamp: nowTimestamp(),
    timestampRaw: serverTimestamp(),
    user,
    action,
    category,
    details,
  });
}

// ─── Content Modules ─────────────────────────────────────────

/** Fetch all content modules from Firestore. */
export async function getModules(): Promise<ContentModule[]> {
  try {
    const q = query(collection(db, 'modules'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
      return {
        id: d.id,
        title: (data.title as string) || '',
        subject: (data.subject as string) || '',
        type: (data.type as ContentModule['type']) || 'Video',
        difficulty: (data.difficulty as ContentModule['difficulty']) || 'Beginner',
        status: (data.status as ContentModule['status']) || 'Draft',
        assigned: (data.assigned as number) || 0,
        created:
          (data.created as string) ||
          (createdAt?.toDate?.()?.toLocaleDateString() ?? ''),
      };
    });
  } catch (err) {
    console.error('[adminService] getModules error:', err);
    return [];
  }
}

/** Create a new module in Firestore. */
export async function createModule(
  moduleData: Omit<ContentModule, 'id'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'modules'), {
    ...moduleData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update an existing module in Firestore. */
export async function updateModule(
  id: string,
  updates: Partial<Omit<ContentModule, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'modules', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a module from Firestore. */
export async function deleteModule(id: string): Promise<void> {
  await deleteDoc(doc(db, 'modules', id));
}

// ─── Dashboard Stats ─────────────────────────────────────────

/** Aggregate stats from Firestore for the admin overview dashboard. */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let totalStudents = 0;
    let activeTeachers = 0;
    let atRiskStudents = 0;

    usersSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      if (data.role === 'student') {
        totalStudents++;
        if (data.overallRisk === 'High') atRiskStudents++;
      }
      if (data.role === 'teacher' && data.status !== 'Inactive') {
        activeTeachers++;
      }
    });

    let totalClasses = 0;
    try {
      const classroomsSnap = await getDocs(collection(db, 'classrooms'));
      totalClasses = classroomsSnap.size;
    } catch { /* collection may not exist yet */ }

    let aiPredictions = 0;
    try {
      const xpSnap = await getDocs(collection(db, 'xpActivities'));
      aiPredictions = xpSnap.size;
    } catch { /* collection may not exist yet */ }

    let avgPerformance = 0;
    try {
      const progressSnap = await getDocs(collection(db, 'progress'));
      const scores: number[] = [];
      progressSnap.docs.forEach(d => {
        const data = d.data() as Record<string, unknown>;
        if (typeof data.averageScore === 'number') scores.push(data.averageScore);
      });
      avgPerformance =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
    } catch { /* collection may not exist yet */ }

    return {
      totalStudents,
      activeTeachers,
      totalClasses,
      atRiskStudents,
      avgPerformance,
      aiPredictions,
    };
  } catch (err) {
    console.error('[adminService] getDashboardStats error:', err);
    return {
      totalStudents: 0,
      activeTeachers: 0,
      totalClasses: 0,
      atRiskStudents: 0,
      avgPerformance: 0,
      aiPredictions: 0,
    };
  }
}

// ─── Top Performers ──────────────────────────────────────────

/** Get top N students ordered by level descending. */
export async function getTopPerformers(n = 3): Promise<TopPerformer[]> {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      orderBy('level', 'desc'),
      limit(n)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      const level = (data.level as number) || 1;
      const currentXP = (data.currentXP as number) || 0;
      // Rough performance estimate: clamp level*8 to [0,100]
      const performance = Math.min(100, level * 8 + Math.round(currentXP / 100));
      return {
        id: d.id,
        name: (data.name as string) || 'Student',
        avatar:
          (data.photo as string) ||
          (data.photoURL as string) ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent((data.name as string) || 'S')}&background=0d9488&color=fff`,
        class: (data.grade as string) || 'Math',
        performance,
        level,
      };
    });
  } catch (err) {
    console.error('[adminService] getTopPerformers error:', err);
    return [];
  }
}

// ─── Analytics Summary ───────────────────────────────────────

export interface AnalyticsSummary {
  totalActiveUsers: number;
  totalStudents: number;
  totalTeachers: number;
  atRiskStudents: number;
  achievementsUnlocked: number;
  totalXPEarned: number;
  activeStreaks: number;
  aiTutorSessions: number;
}

/** Aggregate analytics KPIs from Firestore. */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let totalStudents = 0;
    let totalTeachers = 0;
    let atRiskStudents = 0;
    let totalXPEarned = 0;
    let activeStreaks = 0;

    usersSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      if (data.role === 'student') {
        totalStudents++;
        if (data.overallRisk === 'High') atRiskStudents++;
        if ((data.streak as number) > 0) activeStreaks++;
        totalXPEarned += (data.totalXP as number) || 0;
      }
      if (data.role === 'teacher') totalTeachers++;
    });

    let achievementsUnlocked = 0;
    try {
      const achSnap = await getDocs(collection(db, 'achievements'));
      achievementsUnlocked = achSnap.size;
    } catch { /* optional */ }

    let aiTutorSessions = 0;
    try {
      const chatSnap = await getDocs(collection(db, 'chatSessions'));
      aiTutorSessions = chatSnap.size;
    } catch { /* optional */ }

    return {
      totalActiveUsers: totalStudents + totalTeachers,
      totalStudents,
      totalTeachers,
      atRiskStudents,
      achievementsUnlocked,
      totalXPEarned,
      activeStreaks,
      aiTutorSessions,
    };
  } catch (err) {
    console.error('[adminService] getAnalyticsSummary error:', err);
    return {
      totalActiveUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      atRiskStudents: 0,
      achievementsUnlocked: 0,
      totalXPEarned: 0,
      activeStreaks: 0,
      aiTutorSessions: 0,
    };
  }
}
