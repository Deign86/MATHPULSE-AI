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
import {
  ApiError,
  ApiNetworkError,
  ApiTimeoutError,
  apiService,
  type AdminBulkActionApiResponse,
  type AdminBulkActionRequestApi,
  type AdminUserApiRecord,
} from './apiService';

// ─── Types ───────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  /** Capitalized: 'Student' | 'Teacher' | 'Admin' */
  role: string;
  status: string;
  department: string;
  grade?: string;
  section?: string;
  classSectionId?: string;
  classSection?: string;
  lrn?: string;
  photo?: string;
  lastLogin: string;
  createdAt?: string;
}

export interface AdminUsersPageOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  roleFilter?: string;
  statusFilter?: string;
  gradeFilter?: string;
  sectionFilter?: string;
  classSectionId?: string;
}

export interface AdminUsersPageResult {
  users: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export type AdminBulkActionType = AdminBulkActionRequestApi['action'];

export interface AdminBulkActionInput {
  action: AdminBulkActionType;
  userIds?: string[];
  excludeUserIds?: string[];
  filters?: {
    search?: string;
    role?: string;
    status?: string;
    grade?: string;
    section?: string;
    classSectionId?: string;
  };
  role?: string;
  status?: string;
  grade?: string;
  section?: string;
  lrn?: string;
  dryRun?: boolean;
  exportFormat?: 'csv' | 'json';
}

export interface AdminBulkActionResult {
  success: boolean;
  action: string;
  summary: {
    targeted: number;
    succeeded: number;
    failed: number;
    skipped: number;
    exported: number;
  };
  results: Array<{
    uid: string;
    email?: string | null;
    status: string;
    message: string;
  }>;
  warnings: string[];
  exportRows: Record<string, unknown>[];
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'Student' | 'Teacher' | 'Admin';
  status: 'Active' | 'Inactive';
  grade: string;
  section: string;
  lrn?: string;
}

export interface CreateAdminUserResult {
  uid: string;
  userCreated: boolean;
  emailSent: boolean;
  resultCode: 'created_and_emailed' | 'created_email_failed';
  message: string;
  warnings: string[];
  emailError?: {
    provider?: string;
    code?: string;
    message?: string;
    retryable?: boolean;
  } | null;
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
  if (data.role === 'student') {
    const grade = (data.grade as string) || '';
    const section = (data.section as string) || '';
    return [grade, section].filter(Boolean).join(' - ') || 'Student';
  }
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

function formatLastLoginString(lastLogin?: string | null): string {
  if (!lastLogin) return 'Never';

  const parsed = new Date(lastLogin);
  if (Number.isNaN(parsed.getTime())) {
    return lastLogin;
  }

  const now = Date.now();
  const diffMs = now - parsed.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return parsed.toLocaleDateString();
}

function mapAdminUserRecord(record: AdminUserApiRecord): AdminUser {
  const grade = (record.grade || '').trim();
  const section = (record.section || '').trim();
  const computedClassSection = [grade, section].filter(Boolean).join(' - ');

  return {
    id: record.uid,
    name: record.name || 'Unknown',
    email: record.email || '',
    role: capitalizeRole(record.role || ''),
    status: record.status || 'Active',
    department: record.department || (record.role?.toLowerCase() === 'student' ? (computedClassSection || 'Student') : ''),
    grade,
    section,
    classSectionId: record.classSectionId || undefined,
    classSection: computedClassSection,
    lrn: (record.lrn || '').trim(),
    photo: (record.photo || '').trim(),
    lastLogin: formatLastLoginString(record.lastLogin),
    createdAt: record.createdAt || undefined,
  };
}

function extractApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.responseBody) as { detail?: string };
      if (parsed?.detail && typeof parsed.detail === 'string') {
        return parsed.detail;
      }
    } catch {
      // Fall through to status-based message.
    }
    return `Request failed (${error.status}).`;
  }
  return error instanceof Error ? error.message : 'Request failed.';
}

// ─── User Management ─────────────────────────────────────────

/** Retrieve one paginated page of users from backend admin APIs. */
export async function getAdminUsersPage(options: AdminUsersPageOptions = {}): Promise<AdminUsersPageResult> {
  try {
    const response = await apiService.getAdminUsers({
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 25,
      search: options.searchQuery,
      role: options.roleFilter,
      status: options.statusFilter,
      grade: options.gradeFilter,
      section: options.sectionFilter,
      classSectionId: options.classSectionId,
    });

    if (!response.success) {
      throw new Error('Failed to load admin users');
    }

    return {
      users: (response.users || []).map(mapAdminUserRecord),
      page: response.page,
      pageSize: response.pageSize,
      total: response.total,
      totalPages: response.totalPages,
      hasNextPage: response.hasNextPage,
    };
  } catch (err) {
    console.error('[adminService] getAdminUsersPage error:', err);
    if (err instanceof ApiTimeoutError) {
      throw new Error('Loading users timed out. Please refresh and try again.');
    }

    if (err instanceof ApiNetworkError) {
      throw new Error('Unable to reach the server. Please check your connection and retry.');
    }

    if (err instanceof ApiError && err.status === 504) {
      throw new Error('Loading users took too long. Try narrowing your filters and retrying.');
    }

    throw new Error(extractApiErrorMessage(err));
  }
}

/** Compatibility helper that returns the first page of users as a flat array. */
export async function getAllUsers(): Promise<AdminUser[]> {
  const page = await getAdminUsersPage({ page: 1, pageSize: 200 });
  return page.users;
}

/** Update a user via backend admin API. */
export async function updateAdminUser(uid: string, updates: Partial<AdminUser>): Promise<void> {
  try {
    await apiService.updateAdminUser(uid, {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.role !== undefined ? { role: updates.role } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.department !== undefined ? { department: updates.department } : {}),
      ...(updates.grade !== undefined ? { grade: updates.grade } : {}),
      ...(updates.section !== undefined ? { section: updates.section } : {}),
      ...(updates.lrn !== undefined ? { lrn: updates.lrn } : {}),
    });
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

/** Delete a user account through backend (Auth + Firestore profile). */
export async function deleteAdminUser(uid: string): Promise<void> {
  try {
    const response = await apiService.deleteAdminUser(uid);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete user account.');
    }
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

/**
 * Create a new user account through backend provisioning (Auth + Firestore)
 * and trigger transactional welcome email delivery.
 */
export async function createAdminUser(input: CreateAdminUserInput): Promise<CreateAdminUserResult> {
  try {
    const response = await apiService.createAdminUser({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      confirmPassword: input.confirmPassword,
      role: input.role,
      status: input.status,
      grade: input.grade.trim(),
      section: input.section.trim(),
      ...(input.lrn?.trim() ? { lrn: input.lrn.trim() } : {}),
    });

    if (!response.success || !response.userCreated || !response.uid) {
      throw new Error(response.message || 'Failed to create user account.');
    }

    return {
      uid: response.uid,
      userCreated: response.userCreated,
      emailSent: response.emailSent,
      resultCode: response.resultCode,
      message: response.message,
      warnings: response.warnings ?? [],
      emailError: response.emailError,
    };
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

/** Apply backend bulk action against selected users or a filtered scope. */
export async function applyAdminBulkAction(input: AdminBulkActionInput): Promise<AdminBulkActionResult> {
  try {
    const response: AdminBulkActionApiResponse = await apiService.bulkAdminUsers({
      action: input.action,
      userIds: input.userIds ?? [],
      excludeUserIds: input.excludeUserIds ?? [],
      filters: input.filters,
      role: input.role,
      status: input.status,
      grade: input.grade,
      section: input.section,
      lrn: input.lrn,
      dryRun: input.dryRun,
      exportFormat: input.exportFormat ?? 'csv',
    });

    return {
      success: response.success,
      action: response.action,
      summary: response.summary,
      results: response.results,
      warnings: response.warnings || [],
      exportRows: response.export?.rows || [],
    };
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
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
          (createdAt?.toDate?.()?.toLocaleDateString() ??
            ((data.created as string) || 'Unknown')),
      };
    });
  } catch (err) {
    console.error('[adminService] getModules error:', err);
    return [];
  }
}

/** Create a new module in Firestore. */
export async function createModule(
  moduleData: Omit<ContentModule, 'id' | 'created'>
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
  const mapDocToPerformer = (d: { id: string; data: () => Record<string, unknown> }): TopPerformer => {
    const data = d.data();
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
  };

  const sortAndTrim = (performers: TopPerformer[]): TopPerformer[] =>
    performers
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.performance - a.performance;
      })
      .slice(0, n);

  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      orderBy('level', 'desc'),
      limit(n)
    );
    const snap = await getDocs(q);
    return sortAndTrim(snap.docs.map(mapDocToPerformer));
  } catch (err) {
    const errorCode = (err as { code?: string } | null)?.code;
    if (errorCode === 'failed-precondition') {
      try {
        // Fallback avoids composite-index requirements by sorting in memory.
        const fallbackQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          limit(Math.max(50, n))
        );
        const fallbackSnap = await getDocs(fallbackQuery);
        return sortAndTrim(fallbackSnap.docs.map(mapDocToPerformer));
      } catch (fallbackError) {
        console.error('[adminService] getTopPerformers fallback error:', fallbackError);
        return [];
      }
    }

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
