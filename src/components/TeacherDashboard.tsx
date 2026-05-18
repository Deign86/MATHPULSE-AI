import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Virtuoso } from 'react-virtuoso';
import AppLoadingScreen from './AppLoadingScreen';
import {
  Users, TrendingUp, AlertTriangle, Calendar,
  CheckCircle, BarChart3, Clock, AlertCircle, ChevronRight, Menu, X,
  FileText, Target, Zap, FileSpreadsheet,
  Video, ClipboardCheck, Info, Bell, Search, LayoutDashboard, Database, BookOpen,
  ChevronLeft, ChevronDown, Download, Send, Edit3, Save, Settings, Sparkles, Activity, MoreHorizontal, ArrowLeft, Bot, RefreshCw, PenTool, ListChecks, Award, CalendarPlus, Printer, Play, CheckCircle2, Wand2, Library, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton as BoneSkeleton } from 'boneyard-js/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import ConfirmModal from './ConfirmModal';
import { CreateClassModal } from './CreateClassModal';
import { AddStudentsModal } from './AddStudentsModal';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/features/notifications';
import LogoutActionButton from './LogoutActionButton';
import UserAvatar from './UserAvatar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import {
  getClassAnalytics,
  refreshClassInsights,
  type ClassAnalyticsReport,
} from '../services/classAnalyticsService';
import {
  getInterventionPlan,
  generateInterventionPlan,
  type InterventionPlan,
} from '../services/interventionService';
import { InterventionStepGuide } from './InterventionStepGuide';
import {
  getClassroomsByTeacher,
  getStudentsByTeacher,
  getAllRegisteredStudentsByTeacher,
  mapRegisteredStudentToManaged,
  markRosterStudentsWithoutAccounts,
  normalizeStudentName,
  reassignStudentSection,
  removeStudentFromClass,
  subscribeToActivityFeed,
  updateStudentRisk,
  assignStudentToClassSection,
  updateManagedStudentSectionAssignment,
  assignClassSectionManager,
  getClassSectionOwnershipByTeacher,
  getTeacherDirectoryOptions,
  buildClassSectionId,
  normalizeGradeLevel,
  inferClassification,
  inferStrand,
  parseClassName,
  resolveClassMetadata,
  type Classroom,
  type ManagedStudent,
  type RegisteredStudentAccount,
  type TeacherDirectoryOption,
} from '../services/studentService';
import {
  apiService,
  ApiError,
  fetchAnalysisCurriculumContext,
  type ImportedClassOverviewResponse,
  type LessonPlanResponse,
  type UploadResponse,
} from '../services/apiService';
import {
  publishLessonPlan,
  saveGeneratedLessonPlan,
  generateLessonPlanWithCurriculumGrounding,
} from '../services/lessonPlanService';
import { fetchQuizzesByTeacher } from '../services/quizService';
import type { GeneratedQuiz } from '../types/models';
import type { CurriculumSource } from '../types/curriculum';
import CurriculumSourceBadge from './CurriculumSourceBadge';
import { toast } from 'sonner';
import QuizMaker from './QuizMaker';
import QuestionBankPanel from './QuestionBankPanel';
import TopicMasteryView from './TopicMasteryView';
import StudentCompetencyTable from './StudentCompetencyTable';
import ChatMarkdown from './ChatMarkdown';
import TeacherNotificationsView from './TeacherNotificationsView';
import TeacherCalendarView from './TeacherCalendarView';
import { Skeleton } from './ui/skeleton';
import type { ClassSectionMetadata } from '../types/models';
import type { ParseWorkbookResult } from '../features/import/services/shsExcel/parser/types';
import { ClassesOverviewMenu, CLASS_COLORS } from './ClassesOverviewMenu';
import { DETECTION_CONFIDENCE_THRESHOLD } from '../features/import/services/shsExcel/parser/constants';
import { parseShsWorkbook } from '../features/import/services/shsExcel/parser';
import DataImportView from '../features/DataImport/DataImportView';
import TeacherModuleStatusControl from './TeacherModuleStatusControl';
import { subscribeToUserCalendarEvents } from '../services/calendarService';
import type { CalendarEvent } from '../types/models';
import CreateStudentAccountModal, {
  type CreateStudentAccountSeed,
} from './CreateStudentAccountModal';

interface TeacherDashboardProps {
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

type View =
  | 'dashboard'
  | 'analytics'
  | 'intervention'
  | 'import'
  | 'edit_records'
  | 'topic_mastery'
  | 'competency'
  | 'notifications'
  | 'calendar'
  | 'quiz_maker'
  | 'question_bank';

// Local view types mapped from service types
interface ClassView {
  id: string;
  name: string;
  classSectionId?: string;
  classMetadata?: ClassSectionMetadata;
  gradeLevel?: string;
  classification?: string;
  strand?: string;
  managerId?: string;
  managerName?: string;
  schedule: string;
  studentCount: number;
  avgScore: number;
  atRiskCount: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface StudentView {
  id: string;
  lrn?: string;
  name: string;
  avatar: string;
  avgScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  weakestTopic: string;
  classroomId: string;
  className: string;
  grade: string;
  gradeLevel?: string;
  classification?: string;
  strand?: string;
  section: string;
  classSectionId?: string;
  classMetadata?: ClassSectionMetadata;
  managerId?: string;
  managerName?: string;
  lastActive: string;
  struggles: string[];
  engagementScore: number;
  attendance: number;
  assignmentCompletion: number;
  // Registered-account linkage (registered-first merge pipeline).
  hasRegisteredAccount?: boolean;
  source?: 'registered' | 'import' | 'both';
  accountUid?: string;
  email?: string;
}

function toClassView(c: Classroom): ClassView {
  const riskLevel = c.atRiskCount >= 5 ? 'high' : c.atRiskCount >= 2 ? 'medium' : 'low';
  const classMetadata = resolveClassMetadata({
    metadata: c.classMetadata,
    classSectionId: c.classSectionId,
    className: c.name,
    grade: c.grade,
    gradeLevel: c.gradeLevel,
    classification: c.classification,
    strand: c.strand,
    section: c.section,
    schoolYear: c.schoolYear,
    ownerTeacherId: c.ownerTeacherId || c.teacherId,
    ownerTeacherName: c.ownerTeacherName,
    adviserTeacherId: c.adviserTeacherId || c.teacherId,
    adviserTeacherName: c.adviserTeacherName || c.ownerTeacherName,
    managerId: c.managerId,
    managerName: c.managerName,
  });

  return {
    id: c.id,
    name: classMetadata.className || c.name,
    classSectionId: classMetadata.classSectionId || c.classSectionId,
    classMetadata,
    gradeLevel: classMetadata.gradeLevel || undefined,
    classification: classMetadata.classification || undefined,
    strand: classMetadata.strand || undefined,
    managerId: classMetadata.managerId || undefined,
    managerName: classMetadata.managerName || undefined,
    schedule: c.schedule,
    studentCount: c.studentCount,
    avgScore: c.avgScore,
    atRiskCount: c.atRiskCount,
    riskLevel,
  };
}

function toStudentView(s: ManagedStudent, className: string): StudentView {
  const riskLevel = s.riskLevel.toLowerCase() as 'high' | 'medium' | 'low';
  const lastActiveStr = s.lastActive
    ? formatRelativeTime(s.lastActive.toDate())
    : 'Unknown';
  const baseClassName = s.className || className || 'Imported Class';
  const parsed = parseClassName(baseClassName);
  const grade = s.grade || parsed.grade;
  const section = s.section || parsed.section;
  const classMetadata = resolveClassMetadata({
    metadata: s.classMetadata,
    classSectionId: s.classSectionId || s.classroomId,
    className: [grade, section].filter(Boolean).join(' - ') || baseClassName,
    grade,
    gradeLevel: s.gradeLevel,
    classification: s.classification,
    strand: s.strand,
    section,
    adviserTeacherId: s.teacherId,
    ownerTeacherId: s.teacherId,
    managerId: s.classMetadata?.managerId || s.managerId,
    managerName: s.classMetadata?.managerName || s.managerName,
  });

  return {
    id: s.id,
    lrn: s.lrn,
    name: s.name,
    avatar: s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
    avgScore: s.avgQuizScore,
    riskLevel,
    weakestTopic: s.weakestTopic || 'N/A',
    classroomId: s.classroomId || classMetadata.classSectionId || baseClassName,
    className: classMetadata.className || [grade, section].filter(Boolean).join(' - ') || baseClassName,
    grade,
    gradeLevel: classMetadata.gradeLevel || normalizeGradeLevel(grade) || undefined,
    classification: classMetadata.classification || inferClassification(classMetadata.gradeLevel || grade) || undefined,
    strand: classMetadata.strand || inferStrand(classMetadata.className, section) || undefined,
    section,
    classSectionId: classMetadata.classSectionId || s.classSectionId,
    classMetadata,
    managerId: classMetadata.managerId || undefined,
    managerName: classMetadata.managerName || undefined,
    lastActive: lastActiveStr,
    struggles: s.struggles || [],
    engagementScore: s.engagementScore,
    attendance: s.attendance,
    assignmentCompletion: s.assignmentCompletion,
    hasRegisteredAccount: s.hasRegisteredAccount,
    source: s.source,
    accountUid: s.accountUid,
    email: s.email,
  };
}

function toImportedClassView(c: ImportedClassOverviewResponse['classrooms'][number]): ClassView {
  const riskLevel = c.atRiskCount >= 5 ? 'high' : c.atRiskCount >= 2 ? 'medium' : 'low';
  const classMetadata = resolveClassMetadata({
    metadata: c.classMetadata,
    classSectionId: c.classSectionId,
    className: c.name,
    grade: c.grade,
    gradeLevel: c.gradeLevel || c.classMetadata?.gradeLevel,
    classification: c.classification || c.classMetadata?.classification,
    strand: c.strand || c.classMetadata?.strand,
    section: c.section,
    managerId: c.managerId || c.classMetadata?.managerId,
    managerName: c.managerName || c.classMetadata?.managerName,
  });

  return {
    id: c.id,
    name: classMetadata.className || c.name,
    classSectionId: classMetadata.classSectionId || c.classSectionId || undefined,
    classMetadata,
    gradeLevel: classMetadata.gradeLevel || undefined,
    classification: classMetadata.classification || undefined,
    strand: classMetadata.strand || undefined,
    managerId: classMetadata.managerId || undefined,
    managerName: classMetadata.managerName || undefined,
    schedule: c.schedule || 'Mon-Fri',
    studentCount: c.studentCount,
    avgScore: c.avgScore,
    atRiskCount: c.atRiskCount,
    riskLevel,
  };
}

function toImportedStudentView(s: ImportedClassOverviewResponse['students'][number]): StudentView {
  const riskLevel = (s.riskLevel || 'Low').toLowerCase() as 'high' | 'medium' | 'low';
  const classMetadata = resolveClassMetadata({
    metadata: s.classMetadata,
    classSectionId: s.classSectionId,
    className: s.className || [s.grade, s.section].filter(Boolean).join(' - ') || 'Imported Class',
    grade: s.grade,
    gradeLevel: s.gradeLevel || s.classMetadata?.gradeLevel,
    classification: s.classification || s.classMetadata?.classification,
    strand: s.strand || s.classMetadata?.strand,
    section: s.section,
    managerId: s.managerId || s.classMetadata?.managerId,
    managerName: s.managerName || s.classMetadata?.managerName,
  });
  const className = classMetadata.className || 'Imported Class';

  return {
    id: s.id,
    lrn: s.lrn || undefined,
    name: s.name,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
    avgScore: s.avgQuizScore,
    riskLevel,
    weakestTopic: s.weakestTopic || 'Foundational Skills',
    classroomId: classMetadata.classSectionId || s.classSectionId || className,
    className,
    grade: classMetadata.grade || parseClassName(className).grade,
    gradeLevel: classMetadata.gradeLevel || normalizeGradeLevel(classMetadata.grade || parseClassName(className).grade) || undefined,
    classification: classMetadata.classification || inferClassification(classMetadata.gradeLevel || classMetadata.grade) || undefined,
    strand: classMetadata.strand || inferStrand(className, classMetadata.section || s.section) || undefined,
    section: classMetadata.section || parseClassName(className).section,
    classSectionId: classMetadata.classSectionId || s.classSectionId || undefined,
    classMetadata,
    managerId: classMetadata.managerId || undefined,
    managerName: classMetadata.managerName || undefined,
    lastActive: 'Recently imported',
    struggles: [s.weakestTopic || 'Foundational Skills'],
    engagementScore: s.engagementScore,
    attendance: s.attendance,
    assignmentCompletion: s.assignmentCompletion,
  };
}

function deriveRiskLevel(avgQuiz: number, attendance: number, engagement: number): 'high' | 'medium' | 'low' {
  if (avgQuiz < 60 || attendance < 75 || engagement < 55) return 'high';
  if (avgQuiz < 75 || attendance < 85 || engagement < 70) return 'medium';
  return 'low';
}

function toUploadedStudentView(
  student: UploadResponse['students'][number],
  classSectionId?: string,
  className?: string,
  classMetadata?: ClassSectionMetadata | null,
): StudentView {
  const resolvedMetadata = resolveClassMetadata({
    metadata: classMetadata,
    classSectionId,
    className,
  });
  const resolvedClassName = resolvedMetadata.className || 'Imported Class';
  const resolvedClassSectionId = resolvedMetadata.classSectionId || 'imported_class';
  const avgScore = Number(student.avgQuizScore || 0);
  const attendance = Number(student.attendance || 0);
  const engagementScore = Number(student.engagementScore || 0);
  const assignmentCompletion = Number(student.assignmentCompletion || 0);
  const weakestTopic = student.unknownFields?.weakestTopic || student.unknownFields?.topic || 'Foundational Skills';
  const riskLevel = deriveRiskLevel(avgScore, attendance, engagementScore);
  const identity = student.studentId || student.lrn || student.email || student.name || Math.random().toString(36).slice(2);

  return {
    id: `upload-${resolvedClassSectionId}-${identity}`,
    lrn: student.lrn,
    name: student.name,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`,
    avgScore,
    riskLevel,
    weakestTopic,
    classroomId: resolvedClassSectionId,
    className: resolvedClassName,
    grade: resolvedMetadata.grade || parseClassName(resolvedClassName).grade,
    gradeLevel: resolvedMetadata.gradeLevel || normalizeGradeLevel(resolvedMetadata.grade || parseClassName(resolvedClassName).grade) || undefined,
    classification: resolvedMetadata.classification || inferClassification(resolvedMetadata.gradeLevel || resolvedMetadata.grade) || undefined,
    strand: resolvedMetadata.strand || inferStrand(resolvedClassName, resolvedMetadata.section) || undefined,
    section: resolvedMetadata.section || parseClassName(resolvedClassName).section,
    classSectionId: resolvedClassSectionId,
    classMetadata: resolvedMetadata,
    managerId: resolvedMetadata.managerId || undefined,
    managerName: resolvedMetadata.managerName || undefined,
    lastActive: 'Recently imported',
    struggles: [weakestTopic],
    engagementScore,
    attendance,
    assignmentCompletion,
  };
}

function resolveUploadedClassContext(
  result: UploadResponse,
  fallbackClassSectionId?: string,
  fallbackClassName?: string,
  fallbackClassMetadata?: ClassSectionMetadata | null,
): { classSectionId: string; className: string; classMetadata: ClassSectionMetadata } {
  const responseMetadata = resolveClassMetadata({
    metadata: result.dashboardSync?.classMetadata || result.classMetadata || fallbackClassMetadata,
    classSectionId: result.dashboardSync?.classSectionId || fallbackClassSectionId,
    className: result.dashboardSync?.className || fallbackClassName,
  });

  const classSectionId = responseMetadata.classSectionId || 'imported_class';
  const className = responseMetadata.className || 'Imported Class';

  return {
    classSectionId,
    className,
    classMetadata: {
      ...responseMetadata,
      classSectionId,
      className,
    },
  };
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}


function normalizeClassSectionId(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function buildClassMergeKey(classView: ClassView): string {
  const classSectionKey = normalizeClassSectionId(classView.classSectionId);
  if (classSectionKey) return `section:${classSectionKey}`;
  const idKey = (classView.id || '').trim().toLowerCase();
  if (idKey) return `id:${idKey}`;
  return `name:${(classView.name || '').trim().toLowerCase()}`;
}

function mergeClassViews(primary: ClassView[], imported: ClassView[]): ClassView[] {
  const merged = new Map<string, ClassView>();

  primary.forEach((item) => {
    merged.set(buildClassMergeKey(item), item);
  });

  imported.forEach((item) => {
    const key = buildClassMergeKey(item);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      return;
    }

    const atRiskCount = Math.max(existing.atRiskCount || 0, item.atRiskCount || 0);
    const studentCount = Math.max(existing.studentCount || 0, item.studentCount || 0);
    const avgScore = item.avgScore > 0 ? item.avgScore : existing.avgScore;
    const riskLevel = atRiskCount >= 5 ? 'high' : atRiskCount >= 2 ? 'medium' : 'low';
    const classMetadata = resolveClassMetadata({
      metadata: existing.classMetadata,
      classSectionId: existing.classSectionId || item.classSectionId,
      className: existing.name || item.name,
      grade: existing.classMetadata?.grade || item.classMetadata?.grade,
      gradeLevel: existing.classMetadata?.gradeLevel || item.classMetadata?.gradeLevel,
      classification: existing.classMetadata?.classification || item.classMetadata?.classification,
      strand: existing.classMetadata?.strand || item.classMetadata?.strand,
      section: existing.classMetadata?.section || item.classMetadata?.section,
      schoolYear: existing.classMetadata?.schoolYear || item.classMetadata?.schoolYear,
      ownerTeacherId: existing.classMetadata?.ownerTeacherId || item.classMetadata?.ownerTeacherId,
      ownerTeacherName: existing.classMetadata?.ownerTeacherName || item.classMetadata?.ownerTeacherName,
      adviserTeacherId: existing.classMetadata?.adviserTeacherId || item.classMetadata?.adviserTeacherId,
      adviserTeacherName: existing.classMetadata?.adviserTeacherName || item.classMetadata?.adviserTeacherName,
      managerId: existing.classMetadata?.managerId || item.classMetadata?.managerId,
      managerName: existing.classMetadata?.managerName || item.classMetadata?.managerName,
    });

    merged.set(key, {
      ...existing,
      classSectionId: classMetadata.classSectionId || existing.classSectionId || item.classSectionId,
      name: classMetadata.className || existing.name || item.name,
      classMetadata,
      gradeLevel: classMetadata.gradeLevel || undefined,
      classification: classMetadata.classification || undefined,
      strand: classMetadata.strand || undefined,
      managerId: classMetadata.managerId || undefined,
      managerName: classMetadata.managerName || undefined,
      schedule: existing.schedule || item.schedule,
      studentCount,
      atRiskCount,
      avgScore,
      riskLevel,
    });
  });

  return Array.from(merged.values());
}

function buildStudentMergeKey(student: StudentView): string {
  const lrnKey = (student.lrn || '').trim().toLowerCase();
  if (lrnKey) return `lrn:${lrnKey}`;
  const nameKey = student.name.trim().toLowerCase();
  if (nameKey) return `name:${nameKey}`;
  const classSectionKey = normalizeClassSectionId(student.classSectionId) || normalizeClassSectionId(student.classroomId);
  const idKey = (student.id || '').trim().toLowerCase();
  if (classSectionKey && idKey) return `${classSectionKey}|id:${idKey}`;
  return `${classSectionKey}|anonymous`;
}

function buildStudentViewKey(student: StudentView): string {
  const classSectionKey = normalizeClassSectionId(student.classSectionId) || normalizeClassSectionId(student.classroomId);
  const lrnKey = (student.lrn || '').trim().toLowerCase();
  const idKey = (student.id || '').trim().toLowerCase();
  const nameKey = student.name.trim().toLowerCase().replace(/\s+/g, '_');

  if (classSectionKey && lrnKey) return `${classSectionKey}|lrn:${lrnKey}`;
  if (classSectionKey && idKey) return `${classSectionKey}|id:${idKey}`;
  if (lrnKey) return `lrn:${lrnKey}`;
  if (idKey && nameKey) return `id:${idKey}|name:${nameKey}`;
  if (idKey) return `id:${idKey}`;
  if (classSectionKey && nameKey) return `${classSectionKey}|name:${nameKey}`;
  return `name:${nameKey || 'unknown'}`;
}

function mergeStudentViews(primary: StudentView[], imported: StudentView[]): StudentView[] {
  const merged = new Map<string, StudentView>();

  primary.forEach((item) => {
    merged.set(buildStudentMergeKey(item), item);
  });

  imported.forEach((item) => {
    const key = buildStudentMergeKey(item);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      return;
    }

    const chosenRisk = [existing.riskLevel, item.riskLevel].includes('high')
      ? 'high'
      : [existing.riskLevel, item.riskLevel].includes('medium')
        ? 'medium'
        : 'low';
    const classMetadata = resolveClassMetadata({
      metadata: existing.classMetadata,
      classSectionId: existing.classSectionId || item.classSectionId,
      className: existing.className || item.className,
      grade: existing.grade || item.grade,
      gradeLevel: existing.gradeLevel || item.gradeLevel,
      classification: existing.classification || item.classification,
      strand: existing.strand || item.strand,
      section: existing.section || item.section,
      managerId: existing.managerId || item.managerId,
      managerName: existing.managerName || item.managerName,
    });

    merged.set(key, {
      ...existing,
      lrn: existing.lrn || item.lrn,
      classSectionId: classMetadata.classSectionId || existing.classSectionId || item.classSectionId,
      classroomId: existing.classroomId || item.classroomId,
      className: classMetadata.className || existing.className || item.className,
      grade: classMetadata.grade || existing.grade || item.grade,
      gradeLevel: classMetadata.gradeLevel || existing.gradeLevel || item.gradeLevel,
      classification: classMetadata.classification || existing.classification || item.classification,
      strand: classMetadata.strand || existing.strand || item.strand,
      section: classMetadata.section || existing.section || item.section,
      managerId: classMetadata.managerId || existing.managerId || item.managerId,
      managerName: classMetadata.managerName || existing.managerName || item.managerName,
      classMetadata,
      avgScore: item.avgScore > 0 ? item.avgScore : existing.avgScore,
      attendance: item.attendance > 0 ? item.attendance : existing.attendance,
      engagementScore: item.engagementScore > 0 ? item.engagementScore : existing.engagementScore,
      assignmentCompletion: item.assignmentCompletion > 0 ? item.assignmentCompletion : existing.assignmentCompletion,
      weakestTopic: existing.weakestTopic && existing.weakestTopic !== 'N/A' ? existing.weakestTopic : item.weakestTopic,
      riskLevel: chosenRisk,
      struggles: existing.struggles.length > 0 ? existing.struggles : item.struggles,
      hasRegisteredAccount:
        existing.hasRegisteredAccount === true || item.hasRegisteredAccount === true
          ? true
          : existing.hasRegisteredAccount ?? item.hasRegisteredAccount,
      source:
        (existing.source === 'registered' && item.source === 'import')
        || (existing.source === 'import' && item.source === 'registered')
        || existing.source === 'both'
        || item.source === 'both'
          ? 'both'
          : existing.source || item.source,
      accountUid: existing.accountUid || item.accountUid,
      email: existing.email || item.email,
    });
  });

  return Array.from(merged.values());
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, onOpenProfile, onOpenSettings }) => {
  const { currentUser, userProfile } = useAuth();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);

  const STUDENT_ONLY_NOTIF_TYPES = ['streak_reminder', 'daily_checkin', 'streak_milestone', 'achievement_unlocked', 'level_up', 'xp_earned', 'quiz_result'];
  const { notifications: allNotifications } = useNotifications();
  const teacherUnreadCount = allNotifications.filter((n) => !n.isRead && !STUDENT_ONLY_NOTIF_TYPES.includes(n.type)).length;
  const [selectedClass, setSelectedClass] = useState<ClassView | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentView | null>(null);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  // Data from Firebase
  const [classes, setClasses] = useState<ClassView[]>([]);
  const [students, setStudents] = useState<StudentView[]>([]);

  // Only classes this teacher manages (managerId matches current user)
  const managedClasses = useMemo(() => {
    if (!currentUser?.uid) return classes;
    return classes.filter(c => c.managerId === currentUser.uid || c.classMetadata?.managerId === currentUser.uid);
  }, [classes, currentUser?.uid]);
  const [liveActivity, setLiveActivity] = useState<{ id: string; student: string; action: string; topic: string; time: string; type: string }[]>([]);
  const [dailyInsight, setDailyInsight] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [dataRefreshNonce, setDataRefreshNonce] = useState(0);
  const [teacherDirectory, setTeacherDirectory] = useState<TeacherDirectoryOption[]>([]);
  const [managerUpdating, setManagerUpdating] = useState(false);
  const [createAccountSeed, setCreateAccountSeed] = useState<CreateStudentAccountSeed | null>(null);
  const [reassignBusyId, setReassignBusyId] = useState<string | null>(null);

  const teacherName = userProfile?.name || 'Teacher';
  const interventionCacheRef = useRef<Map<string, {
    lessonPlan: LessonPlanResponse | null;
    learningPath: string;
    gradeDraft: string;
    sectionDraft: string;
  }>>(new Map());

  // Track mobile viewport (< 1024px = below lg breakpoint)
  useEffect(() => {
    const checkViewport = () => setIsMobileViewport(window.innerWidth < 1024);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Fetch classrooms and students from Firebase
  useEffect(() => {
    if (!currentUser) return;
    const teacherId = currentUser.uid;
    let isActive = true;

    let unsubActivity: (() => void) | undefined;

    const fetchData = async () => {
      setDataLoading(true);
      try {
        const classrooms = await getClassroomsByTeacher(teacherId);
        let classViews = classrooms.map(toClassView);
        const ownershipRecords = await getClassSectionOwnershipByTeacher(teacherId).catch(() => []);

        const ownershipMap = new Map<string, (typeof ownershipRecords)[number]>();
        ownershipRecords.forEach((record) => {
          const key = normalizeClassSectionId(record.classSectionId);
          if (key) {
            ownershipMap.set(key, record);
          }
        });

        classViews = classViews.map((item) => {
          const ownership = ownershipMap.get(normalizeClassSectionId(item.classSectionId));
          if (!ownership) return item;

          const classMetadata = resolveClassMetadata({
            metadata: item.classMetadata,
            classSectionId: ownership.classSectionId || item.classSectionId,
            className: ownership.className || item.name,
            grade: ownership.grade || item.classMetadata?.grade,
            gradeLevel: ownership.gradeLevel || item.classMetadata?.gradeLevel,
            classification: ownership.classification || item.classMetadata?.classification,
            strand: ownership.strand || item.classMetadata?.strand,
            section: ownership.section || item.classMetadata?.section,
            schoolYear: ownership.schoolYear || item.classMetadata?.schoolYear,
            ownerTeacherId: ownership.ownerTeacherId || item.classMetadata?.ownerTeacherId,
            ownerTeacherName: ownership.ownerTeacherName || item.classMetadata?.ownerTeacherName,
            managerId: ownership.managerId || item.classMetadata?.managerId,
            managerName: ownership.managerName || item.classMetadata?.managerName,
          });

          return {
            ...item,
            name: classMetadata.className || item.name,
            classSectionId: classMetadata.classSectionId || item.classSectionId,
            classMetadata,
            gradeLevel: classMetadata.gradeLevel || item.gradeLevel,
            classification: classMetadata.classification || item.classification,
            strand: classMetadata.strand || item.strand,
            managerId: classMetadata.managerId || item.managerId,
            managerName: classMetadata.managerName || item.managerName,
          };
        });

        // Build a lookup by both classroom doc id and classSectionId.
        const classNameLookup = new Map<string, string>();
        const classMetadataLookup = new Map<string, ClassSectionMetadata>();
        classrooms.forEach((c) => {
          const normalizedMetadata = resolveClassMetadata({
            metadata: c.classMetadata,
            classSectionId: c.classSectionId,
            className: c.name,
            grade: c.grade,
            gradeLevel: c.gradeLevel,
            classification: c.classification,
            strand: c.strand,
            section: c.section,
            schoolYear: c.schoolYear,
            ownerTeacherId: c.ownerTeacherId || c.teacherId,
            ownerTeacherName: c.ownerTeacherName,
            adviserTeacherId: c.adviserTeacherId || c.teacherId,
            adviserTeacherName: c.adviserTeacherName,
            managerId: c.managerId,
            managerName: c.managerName,
          });

          classNameLookup.set(c.id, normalizedMetadata.className || c.name);
          classMetadataLookup.set(c.id, normalizedMetadata);
          const normalizedClassSectionId = normalizeClassSectionId(c.classSectionId);
          if (normalizedClassSectionId) {
            const ownership = ownershipMap.get(normalizedClassSectionId);
            const mergedMetadata = resolveClassMetadata({
              metadata: normalizedMetadata,
              classSectionId: ownership?.classSectionId || normalizedClassSectionId,
              className: ownership?.className || normalizedMetadata.className,
              grade: ownership?.grade || normalizedMetadata.grade,
              gradeLevel: ownership?.gradeLevel || normalizedMetadata.gradeLevel,
              classification: ownership?.classification || normalizedMetadata.classification,
              strand: ownership?.strand || normalizedMetadata.strand,
              section: ownership?.section || normalizedMetadata.section,
              schoolYear: ownership?.schoolYear || normalizedMetadata.schoolYear,
              ownerTeacherId: ownership?.ownerTeacherId || normalizedMetadata.ownerTeacherId,
              ownerTeacherName: ownership?.ownerTeacherName || normalizedMetadata.ownerTeacherName,
              managerId: ownership?.managerId || normalizedMetadata.managerId,
              managerName: ownership?.managerName || normalizedMetadata.managerName,
            });
            classNameLookup.set(normalizedClassSectionId, mergedMetadata.className || c.name);
            classMetadataLookup.set(normalizedClassSectionId, mergedMetadata);
          }
        });

        // Apply the same class metadata lookup to a student-shaped record so
        // that registered, managed, and roster rows all share the same
        // class-name/strand/grade-level enrichment.
        const enrichStudentClassMetadata = (mapped: StudentView): StudentView => {
          const sectionLookupKey = normalizeClassSectionId(mapped.classSectionId || mapped.classroomId);
          if (!sectionLookupKey) return mapped;
          const matchedMetadata = classMetadataLookup.get(sectionLookupKey);
          if (!matchedMetadata) return mapped;

          const classMetadata = resolveClassMetadata({
            metadata: matchedMetadata,
            classSectionId: mapped.classSectionId || matchedMetadata.classSectionId,
            className: mapped.className || matchedMetadata.className,
            grade: mapped.grade || matchedMetadata.grade,
            gradeLevel: mapped.gradeLevel || matchedMetadata.gradeLevel,
            classification: mapped.classification || matchedMetadata.classification,
            strand: mapped.strand || matchedMetadata.strand,
            section: mapped.section || matchedMetadata.section,
            managerId: mapped.managerId || matchedMetadata.managerId,
            managerName: mapped.managerName || matchedMetadata.managerName,
          });

          return {
            ...mapped,
            className: classMetadata.className || mapped.className,
            grade: classMetadata.grade || mapped.grade,
            gradeLevel: classMetadata.gradeLevel || mapped.gradeLevel,
            classification: classMetadata.classification || mapped.classification,
            strand: classMetadata.strand || mapped.strand,
            section: classMetadata.section || mapped.section,
            classSectionId: classMetadata.classSectionId || mapped.classSectionId,
            classMetadata,
            managerId: classMetadata.managerId || mapped.managerId,
            managerName: classMetadata.managerName || mapped.managerName,
          };
        };

        const resolveClassNameFor = (classroomId: string, classSectionKey: string, fallback?: string) =>
          classNameLookup.get(classroomId)
          || (classSectionKey ? classNameLookup.get(classSectionKey) : undefined)
          || fallback
          || 'Unknown';

        // Build the deduped list of class section ids the teacher can see —
        // ownership + classroom rows. Registered student lookup keys off this.
        const knownClassSectionIds = Array.from(
          new Set(
            [
              ...ownershipRecords.map((record) => record.classSectionId),
              ...classrooms.map((classroom) => classroom.classSectionId).filter(Boolean) as string[],
              ...classViews.map((view) => view.classSectionId).filter(Boolean) as string[],
            ]
              .map((entry) => (entry || '').trim())
              .filter((entry): entry is string => !!entry)
          )
        );

        // ── PRIMARY DATA LOAD (registered users + managed-student enrichment) ──
        // Both queries run in parallel; the dashboard does not finish loading
        // until both resolve.
        const [allManagedStudents, registeredStudents] = await Promise.all([
          getStudentsByTeacher(teacherId).catch((error) => {
            console.warn('[TeacherDashboard] managed-student fetch failed:', error);
            return [] as ManagedStudent[];
          }),
          getAllRegisteredStudentsByTeacher(teacherId, knownClassSectionIds).catch((error) => {
            console.warn('[TeacherDashboard] registered-student fetch failed:', error);
            return [] as RegisteredStudentAccount[];
          }),
        ]);

        // Fallback: if no students found via teacher-scoped queries, load all
        // registered students so the teacher can see and assign them to classes.
        let finalRegisteredStudents = registeredStudents;
        if (registeredStudents.length === 0 && allManagedStudents.length === 0) {
          try {
            const { collection: firestoreCollection, query: firestoreQuery, where: firestoreWhere, getDocs: firestoreGetDocs } = await import('firebase/firestore');
            const { db: firestoreDb } = await import('../lib/firebase');
            const allStudentsQuery = firestoreQuery(
              firestoreCollection(firestoreDb, 'users'),
              firestoreWhere('role', '==', 'student')
            );
            const allStudentsSnap = await firestoreGetDocs(allStudentsQuery);
            finalRegisteredStudents = allStudentsSnap.docs.map((d) => {
              const data = d.data();
              return {
                uid: d.id,
                name: String(data.name || data.displayName || '').trim() || 'Student',
                email: String(data.email || '').trim(),
                lrn: data.lrn ? String(data.lrn).trim() : undefined,
                photo: data.photo ? String(data.photo).trim() : data.photoURL ? String(data.photoURL).trim() : undefined,
                grade: data.grade ? String(data.grade).trim() : undefined,
                section: data.section ? String(data.section).trim() : undefined,
                classSectionId: data.classSectionId ? String(data.classSectionId).trim() : undefined,
                adviserTeacherId: data.adviserTeacherId ? String(data.adviserTeacherId).trim() : undefined,
                role: 'student' as const,
                createdAt: data.createdAt || undefined,
              };
            }).filter((s) => s.name !== 'Student' || s.email);
          } catch (err) {
            console.warn('[TeacherDashboard] fallback all-students fetch failed:', err);
          }
        }

        // Index managed students for fast match-by-uid / LRN / name+section.
        const managedById = new Map<string, ManagedStudent>();
        const managedByLrn = new Map<string, ManagedStudent>();
        const managedByNameSection = new Map<string, ManagedStudent>();
        allManagedStudents.forEach((managed) => {
          managedById.set(managed.id, managed);
          if (managed.lrn) {
            managedByLrn.set(managed.lrn.trim().toLowerCase(), managed);
          }
          const nameKey = normalizeStudentName(managed.name);
          const sectionKey = normalizeClassSectionId(managed.classSectionId || managed.classroomId);
          if (nameKey) {
            managedByNameSection.set(`${nameKey}|${sectionKey}`, managed);
          }
        });

        // Track which managed records have been claimed by a registered base
        // row so we can later identify the import-only orphans.
        const consumedManagedIds = new Set<string>();

        // (Step 1) Build the base list from registered accounts and enrich
        // each one with the matching managed-student record (academic data).
        const enrichedRegistered: StudentView[] = finalRegisteredStudents.map((account) => {
          const baseManaged = mapRegisteredStudentToManaged(account);
          const lrnKey = (account.lrn || '').trim().toLowerCase();
          const nameKey = normalizeStudentName(account.name);
          const sectionKey = normalizeClassSectionId(account.classSectionId);

          let match: ManagedStudent | undefined;
          if (managedById.has(account.uid)) {
            match = managedById.get(account.uid);
          } else if (lrnKey && managedByLrn.has(lrnKey)) {
            match = managedByLrn.get(lrnKey);
          } else if (nameKey) {
            const composite = `${nameKey}|${sectionKey}`;
            match = managedByNameSection.get(composite);
          }

          if (match) {
            consumedManagedIds.add(match.id);
            const merged: ManagedStudent = {
              ...baseManaged,
              // Identity from registered side wins.
              id: account.uid,
              accountUid: account.uid,
              email: baseManaged.email || match.email,
              lrn: baseManaged.lrn || match.lrn,
              name: baseManaged.name || match.name,
              avatar: baseManaged.avatar || match.avatar,
              // Academic enrichment from managed side wins where present.
              riskLevel: match.riskLevel || baseManaged.riskLevel,
              avgQuizScore: match.avgQuizScore || baseManaged.avgQuizScore,
              engagementScore: match.engagementScore || baseManaged.engagementScore,
              attendance: match.attendance || baseManaged.attendance,
              assignmentCompletion: match.assignmentCompletion || baseManaged.assignmentCompletion,
              weakestTopic: match.weakestTopic || baseManaged.weakestTopic,
              struggles: match.struggles || baseManaged.struggles,
              lastActive: match.lastActive || baseManaged.lastActive,
              wri: match.wri ?? null,
              riskStatus: match.riskStatus ?? null,
              riskUpdatedAt: match.riskUpdatedAt ?? null,
              diagnosticScore: match.diagnosticScore ?? null,
              externalGradesAvg: match.externalGradesAvg ?? null,
              systemPerformanceAvg: match.systemPerformanceAvg ?? null,
              riskHistory: match.riskHistory,
              // Section/classroom: prefer registered's classSectionId so the
              // section management UI follows the user profile, but fall back
              // to managed's where registered is empty.
              grade: baseManaged.grade || match.grade,
              gradeLevel: baseManaged.gradeLevel || match.gradeLevel,
              section: baseManaged.section || match.section,
              classSectionId: baseManaged.classSectionId || match.classSectionId,
              classroomId: baseManaged.classroomId || match.classroomId,
              classMetadata: match.classMetadata || baseManaged.classMetadata,
              hasRegisteredAccount: true,
              source: 'both',
            };
            const sectionLookupKey = normalizeClassSectionId(merged.classSectionId || merged.classroomId);
            const resolvedClassName = resolveClassNameFor(merged.classroomId || '', sectionLookupKey, merged.className);
            return enrichStudentClassMetadata(toStudentView(merged, resolvedClassName));
          }

          // No managed match — pure registered row.
          const sectionLookupKey = normalizeClassSectionId(baseManaged.classSectionId || baseManaged.classroomId);
          const resolvedClassName = resolveClassNameFor(baseManaged.classroomId || '', sectionLookupKey, baseManaged.className);
          return enrichStudentClassMetadata(toStudentView(baseManaged, resolvedClassName));
        });

        // (Step 2) Surface managed students that have no registered account —
        // these are roster-only rows that need a "Create Account" CTA.
        const importOnlyStudents: StudentView[] = allManagedStudents
          .filter((managed) => !consumedManagedIds.has(managed.id))
          .map((managed) => {
            const taggedManaged: ManagedStudent = {
              ...managed,
              hasRegisteredAccount: false,
              source: 'import',
            };
            const sectionLookupKey = normalizeClassSectionId(taggedManaged.classSectionId || taggedManaged.classroomId);
            const resolvedClassName = resolveClassNameFor(taggedManaged.classroomId, sectionLookupKey, taggedManaged.className);
            return enrichStudentClassMetadata(toStudentView(taggedManaged, resolvedClassName));
          });

        const studentViews: StudentView[] = [...enrichedRegistered, ...importOnlyStudents];

        if (!isActive) return;
        setClasses((prev) => {
          if (classViews.length === 0 && prev.length > 0) {
            return prev;
          }
          return classViews;
        });
        setStudents((prev) => {
          if (studentViews.length === 0 && prev.length > 0) {
            return prev;
          }
          return studentViews;
        });

        // Load imported overview as a best-effort background merge so dashboard render is never blocked.
        // Per the registered-first contract, this background pass MUST NOT
        // introduce new student rows that bypass the registered/managed merge
        // — it is restricted to enriching class metadata and patching
        // already-known students.
        void apiService
          .getImportedClassOverview({
            limit: 3000,
            forceRefresh: dataRefreshNonce > 0,
          })
          .then((imported) => {
            if (!isActive) return;
            if (imported.warnings.length > 0) {
              console.warn('Imported class overview warnings:', imported.warnings.join(' '));
            }
            setClasses((prev) => mergeClassViews(prev, imported.classrooms.map(toImportedClassView)));
            setStudents((prev) => {
              if (prev.length === 0) return prev;
              const importedViews = imported.students.map(toImportedStudentView);
              // Build the set of dedupe keys present in the current
              // (registered-first) state. Anything not already present is
              // dropped so we never silently inject roster-only rows.
              const existingKeys = new Set<string>();
              prev.forEach((entry) => existingKeys.add(buildStudentMergeKey(entry)));
              const enrichmentOnly = importedViews.filter((entry) =>
                existingKeys.has(buildStudentMergeKey(entry))
              );
              if (enrichmentOnly.length === 0) return prev;
              return mergeStudentViews(prev, enrichmentOnly);
            });
          })
          .catch((importedErr) => {
            console.warn('Imported class overview merge unavailable:', importedErr);
          });

        // Subscribe to live activity
        const classroomIds = classrooms.map((c) => c.id);
        if (classroomIds.length > 0) {
          unsubActivity = subscribeToActivityFeed(classroomIds, (activities) => {
            if (!isActive) return;
            setLiveActivity(
              activities.map((a) => ({
                id: a.id,
                student: a.studentName,
                action: a.action,
                topic: a.topic,
                time: formatRelativeTime(a.timestamp.toDate()),
                type: a.type,
              }))
            );
          });
        }
      } catch (err) {
        console.error('Failed to load teacher data:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();

    return () => {
      isActive = false;
      if (unsubActivity) unsubActivity();
    };
  }, [currentUser, dataRefreshNonce]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    void getTeacherDirectoryOptions('', 80)
      .then((teachers) => {
        if (!active) return;
        setTeacherDirectory(teachers);
      })
      .catch((err) => {
        console.warn('Failed to load teacher directory options:', err);
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  // Fetch AI daily insight when students data is available
  useEffect(() => {
    if (students.length === 0) return;

    const fetchInsight = async () => {
      if (students.length === 0) {
        setDailyInsight('');
        return;
      }
      setInsightLoading(true);
      try {
        const studentData = students.map((s) => ({
          name: s.name,
          engagementScore: s.engagementScore,
          avgQuizScore: s.avgScore,
          attendance: s.attendance,
          riskLevel: s.riskLevel,
        }));
        const response = await apiService.getDailyInsight({ students: studentData });
        setDailyInsight(response.insight);
      } catch {
        setDailyInsight(`${students.filter((s) => s.riskLevel === 'high').length} students are at high risk of falling behind. Review their progress in the analytics view.`);
      } finally {
        setInsightLoading(false);
      }
    };

    fetchInsight();
  }, [students]);

  // Computed stats
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const totalAtRisk = classes.reduce((sum, c) => sum + c.atRiskCount, 0);
  const avgPerformance = classes.length > 0 ? Math.round(classes.reduce((sum, c) => sum + c.avgScore, 0) / classes.length) : 0;

  const riskDistribution = [
    { name: 'High Risk', value: students.filter((s) => s.riskLevel === 'high').length, color: '#FF8B8B' },
    { name: 'Medium Risk', value: students.filter((s) => s.riskLevel === 'medium').length, color: '#F08386' },
    { name: 'Low Risk', value: students.filter((s) => s.riskLevel === 'low').length, color: '#75D06A' },
  ];

  // Gather weakest topics as topic performance data
  const topicCounts: Record<string, { total: number; sum: number }> = {};
  students.forEach((s) => {
    if (s.weakestTopic && s.weakestTopic !== 'N/A') {
      if (!topicCounts[s.weakestTopic]) topicCounts[s.weakestTopic] = { total: 0, sum: 0 };
      topicCounts[s.weakestTopic].total += 1;
      topicCounts[s.weakestTopic].sum += s.avgScore;
    }
  });
  const topicPerformance = Object.entries(topicCounts)
    .map(([topic, data]) => ({ topic, score: Math.round(data.sum / data.total) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  const handleViewClass = (classItem: ClassView) => {
    setSelectedClass(classItem);
    setActiveView('analytics');
  };

  const handleViewStudent = (student: StudentView) => {
    setSelectedStudent(student);
    setActiveView('intervention');
  };

  const handleBackToAnalytics = () => {
    setSelectedStudent(null);
    setActiveView('analytics');
  };

  const handleBackToDashboard = () => {
    setSelectedClass(null);
    setSelectedStudent(null);
    setActiveView('dashboard');
  };

  const handleAssignClassManager = async (classItem: ClassView, manager: TeacherDirectoryOption) => {
    if (!currentUser) {
      toast.error('Unable to assign manager: teacher context is missing.');
      return;
    }

    const parsed = parseClassName(classItem.classMetadata?.className || classItem.name);
    const classMetadata = resolveClassMetadata({
      metadata: classItem.classMetadata,
      classSectionId: classItem.classSectionId,
      className: classItem.name,
      grade: classItem.classMetadata?.grade || parsed.grade,
      gradeLevel: classItem.classMetadata?.gradeLevel,
      classification: classItem.classMetadata?.classification,
      strand: classItem.classMetadata?.strand,
      section: classItem.classMetadata?.section || parsed.section,
      schoolYear: classItem.classMetadata?.schoolYear || String(new Date().getFullYear()),
      ownerTeacherId: classItem.classMetadata?.ownerTeacherId || currentUser.uid,
      ownerTeacherName: classItem.classMetadata?.ownerTeacherName || teacherName,
      adviserTeacherId: classItem.classMetadata?.adviserTeacherId || currentUser.uid,
      adviserTeacherName: classItem.classMetadata?.adviserTeacherName || teacherName,
      managerId: manager.uid,
      managerName: manager.name,
    });

    const classSectionId = classMetadata.classSectionId || buildClassSectionId(classMetadata.grade || parsed.grade, classMetadata.section || parsed.section);
    if (!classSectionId) {
      toast.error('Unable to assign manager: missing class section ID.');
      return;
    }

    setManagerUpdating(true);
    try {
      await assignClassSectionManager({
        classSectionId,
        className: classMetadata.className || classItem.name,
        grade: classMetadata.grade || parsed.grade,
        gradeLevel: classMetadata.gradeLevel || normalizeGradeLevel(classMetadata.grade || parsed.grade) || classMetadata.grade || parsed.grade,
        classification: classMetadata.classification || inferClassification(classMetadata.gradeLevel || classMetadata.grade) || undefined,
        strand: classMetadata.strand || inferStrand(classMetadata.className, classMetadata.section) || undefined,
        section: classMetadata.section || parsed.section,
        schoolYear: classMetadata.schoolYear || String(new Date().getFullYear()),
        ownerTeacherId: classMetadata.ownerTeacherId || currentUser.uid,
        ownerTeacherName: classMetadata.ownerTeacherName || teacherName,
        managerId: manager.uid,
        managerName: manager.name,
      });

      const updatedMetadata = resolveClassMetadata({
        metadata: classMetadata,
        classSectionId,
        managerId: manager.uid,
        managerName: manager.name,
      });
      const normalizedTargetSection = normalizeClassSectionId(classSectionId);

      setClasses((prev) =>
        prev.map((entry) => {
          const entrySectionId = normalizeClassSectionId(entry.classSectionId);
          if (entrySectionId !== normalizedTargetSection) return entry;
          return {
            ...entry,
            name: updatedMetadata.className || entry.name,
            classSectionId: updatedMetadata.classSectionId || entry.classSectionId,
            classMetadata: updatedMetadata,
            gradeLevel: updatedMetadata.gradeLevel || entry.gradeLevel,
            classification: updatedMetadata.classification || entry.classification,
            strand: updatedMetadata.strand || entry.strand,
            managerId: manager.uid,
            managerName: manager.name,
          };
        })
      );

      setStudents((prev) =>
        prev.map((entry) => {
          const studentSection = normalizeClassSectionId(entry.classSectionId || entry.classroomId);
          if (studentSection !== normalizedTargetSection) return entry;
          const mergedMetadata = resolveClassMetadata({
            metadata: entry.classMetadata,
            classSectionId: updatedMetadata.classSectionId || entry.classSectionId,
            className: entry.className || updatedMetadata.className,
            grade: entry.grade || updatedMetadata.grade,
            gradeLevel: entry.gradeLevel || updatedMetadata.gradeLevel,
            classification: entry.classification || updatedMetadata.classification,
            strand: entry.strand || updatedMetadata.strand,
            section: entry.section || updatedMetadata.section,
            managerId: manager.uid,
            managerName: manager.name,
          });

          return {
            ...entry,
            classMetadata: mergedMetadata,
            gradeLevel: mergedMetadata.gradeLevel || entry.gradeLevel,
            classification: mergedMetadata.classification || entry.classification,
            strand: mergedMetadata.strand || entry.strand,
            managerId: manager.uid,
            managerName: manager.name,
          };
        })
      );

      setSelectedClass((prev) => {
        if (!prev) return prev;
        const prevSection = normalizeClassSectionId(prev.classSectionId);
        if (prevSection !== normalizedTargetSection) return prev;
        return {
          ...prev,
          classMetadata: updatedMetadata,
          managerId: manager.uid,
          managerName: manager.name,
          gradeLevel: updatedMetadata.gradeLevel || prev.gradeLevel,
          classification: updatedMetadata.classification || prev.classification,
          strand: updatedMetadata.strand || prev.strand,
        };
      });

      toast.success(`Assigned ${manager.name} as section manager.`);
    } catch (error) {
      console.error('Failed to assign class manager:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign class manager');
    } finally {
      setManagerUpdating(false);
    }
  };

  const handleOpenCreateAccount = useCallback((student: StudentView) => {
    setCreateAccountSeed({
      rosterId: student.id,
      name: student.name,
      lrn: student.lrn,
      email: student.email,
      grade: student.grade,
      section: student.section,
      classSectionId: student.classSectionId,
    });
  }, []);

  const handleAccountCreated = useCallback(
    (result: { uid: string; email: string; temporaryPassword: string; rosterId: string }) => {
      setStudents((prev) =>
        prev.map((entry) =>
          entry.id === result.rosterId
            ? {
                ...entry,
                hasRegisteredAccount: true,
                source: 'both',
                accountUid: result.uid,
                email: result.email || entry.email,
              }
            : entry,
        ),
      );
      // Trigger a quiet background refresh so the new uid-keyed registered
      // record replaces the import row on the next pass.
      setDataRefreshNonce((nonce) => nonce + 1);
    },
    [],
  );

  const handleReassignSection = useCallback(
    async (
      student: StudentView,
      target: { classSectionId: string; grade: string; section: string },
    ) => {
      if (!currentUser) {
        toast.error('Cannot reassign section without an authenticated teacher.');
        return;
      }
      const teacherId = currentUser.uid;
      const targetSectionId = (target.classSectionId || '').trim();
      if (!targetSectionId) {
        toast.error('Pick a target section first.');
        return;
      }

      setReassignBusyId(student.id);
      try {
        await reassignStudentSection({
          studentId: student.accountUid || student.id,
          isRegisteredAccount: !!student.hasRegisteredAccount,
          newClassSectionId: targetSectionId,
          newGrade: target.grade,
          newSection: target.section,
          previousClassSectionId: student.classSectionId,
          teacherId,
          teacherName,
          schoolYear:
            student.classMetadata?.schoolYear || String(new Date().getFullYear()),
        });

        setStudents((prev) =>
          prev.map((entry) => {
            if (entry.id !== student.id) return entry;
            const refreshedMetadata = resolveClassMetadata({
              metadata: entry.classMetadata,
              classSectionId: targetSectionId,
              className: entry.className,
              grade: target.grade,
              section: target.section,
            });
            return {
              ...entry,
              grade: target.grade,
              section: target.section,
              classSectionId: targetSectionId,
              classroomId: targetSectionId,
              classMetadata: refreshedMetadata,
            };
          }),
        );
        toast.success(`Moved ${student.name} to ${target.grade} - ${target.section}.`);
      } catch (err) {
        console.error('Section reassignment failed:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to reassign section.');
      } finally {
        setReassignBusyId(null);
      }
    },
    [currentUser, teacherName],
  );

  const handleRemoveStudent = useCallback(
    async (student: StudentView) => {
      if (!currentUser) return;
      if (!window.confirm(`Remove ${student.name} from this class? This cannot be undone.`)) return;
      const classSectionId = student.classSectionId || student.classroomId || '';
      if (!classSectionId) {
        toast.error('Cannot determine class section for this student.');
        return;
      }
      try {
        await removeStudentFromClass(student.accountUid || student.id, classSectionId);
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        toast.success(`Removed ${student.name} from class.`);
      } catch (err) {
        console.error('Remove student failed:', err);
        toast.error('Failed to remove student.');
      }
    },
    [currentUser],
  );

  useEffect(() => {
    const updateViewport = () => {
      const nextIsMobile = window.innerWidth < 1024;
      setIsMobileViewport(nextIsMobile);
      if (nextIsMobile) {
        setSidebarCollapsed(false);
      } else {
        setMobileNavOpen(false);
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) return;
    setMobileNavOpen(false);
  }, [activeView, isMobileViewport]);

  const handleSidebarNav = (view: View) => {
    setActiveView(view);
    setSelectedClass(null);
    setSelectedStudent(null);
  };

  const selectedClassSectionId = useMemo(() => {
    if (!selectedClass) return undefined;
    if (selectedClass.classMetadata?.classSectionId) return selectedClass.classMetadata.classSectionId || undefined;
    if (selectedClass.classSectionId) return selectedClass.classSectionId;
    const parsed = parseClassName(selectedClass.classMetadata?.className || selectedClass.name);
    const computed = buildClassSectionId(parsed.grade, parsed.section);
    return computed || undefined;
  }, [selectedClass]);

  const effectiveAnalyticsClass = useMemo(() => {
    return selectedClass || null;
  }, [selectedClass]);

  const effectiveClassColor = useMemo(() => {
    if (!effectiveAnalyticsClass) return undefined;
    const idx = classes.findIndex(c => c.id === effectiveAnalyticsClass.id);
    return CLASS_COLORS[Math.max(0, idx) % CLASS_COLORS.length];
  }, [effectiveAnalyticsClass, classes]);

  const filteredStudentsForAnalytics = useMemo(() => {
    if (!effectiveAnalyticsClass) return students;

    const selectedId = (effectiveAnalyticsClass.id || '').trim().toLowerCase();
    const selectedSectionId = normalizeClassSectionId(effectiveAnalyticsClass.classSectionId);
    const selectedName = (effectiveAnalyticsClass.name || '').trim().toLowerCase();

    return students.filter((student) => {
      const studentClassroomId = normalizeClassSectionId(student.classroomId);
      const studentClassSectionId = normalizeClassSectionId(student.classSectionId);
      const studentClassName = (student.className || '').trim().toLowerCase();

      return (
        (selectedSectionId && (studentClassSectionId === selectedSectionId || studentClassroomId === selectedSectionId))
        || (selectedId && (studentClassroomId === selectedId || studentClassSectionId === selectedId))
        || (selectedName && studentClassName === selectedName)
      );
    });
  }, [effectiveAnalyticsClass, students]);

  if (dataLoading) {
    return <AppLoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="relative flex h-screen w-full bg-background overflow-hidden">
      {isMobileViewport && mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px]"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isMobileViewport ? 280 : sidebarCollapsed && !sidebarHovered ? 80 : 280,
          x: isMobileViewport ? (mobileNavOpen ? 0 : -300) : 0,
        }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        onMouseEnter={() => !isMobileViewport && sidebarCollapsed && setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className="fixed inset-y-0 left-0 z-40 bg-[#f7f9fc] rounded-3xl border border-[#dde3eb] flex flex-col shadow-sm lg:static lg:z-auto p-5"
      >
        {/* Logo & Toggle */}
        <div className={`mb-8 flex items-center ${sidebarCollapsed && !sidebarHovered ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-[#7274ED] to-[#9956DE] rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
              <img src="/avatar/avatar_icon.png" alt="MathPulse AI" className="w-10 h-10 object-contain drop-shadow-md" />
            </div>
            {(!sidebarCollapsed || sidebarHovered) && (
              <div>
                <h1 className="text-base font-semibold font-display text-[#0a1628] whitespace-nowrap">MathPulse AI</h1>
              </div>
            )}
          </div>
          {!isMobileViewport && (!sidebarCollapsed || sidebarHovered) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-[#dde3eb] rounded-lg transition-colors text-[#5a6578]"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </motion.button>
          )}
          {isMobileViewport && (
            <button
              onClick={() => setMobileNavOpen(false)}
              className="p-2 hover:bg-[#dde3eb] rounded-lg transition-colors text-[#5a6578]"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5">
          {/* Overview Section */}
          <div>
            {sidebarCollapsed && !sidebarHovered ? (
              <div className="px-4 mb-2 flex items-center gap-2">
                <div className="flex-1 h-[1px] bg-[#dde3eb]"></div>
              </div>
            ) : (
              <p className="px-4 mb-2 text-[10px] font-semibold text-[#5a6578] uppercase tracking-widest">Overview</p>
            )}
            <div className="space-y-1">
              <NavItem
                icon={LayoutDashboard}
                label="Dashboard"
                active={activeView === 'dashboard'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={handleBackToDashboard}
                forceExpanded={isMobileViewport}
              />
              <NavItem
                icon={BarChart3}
                label="Class Analytics"
                active={activeView === 'analytics' || activeView === 'intervention'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => handleSidebarNav('analytics')}
                forceExpanded={isMobileViewport}
              />
            </div>
          </div>

          {/* Students Section */}
          <div>
            {sidebarCollapsed && !sidebarHovered ? (
              <div className="px-4 mb-2 flex items-center gap-2">
                <div className="flex-1 h-[1px] bg-[#dde3eb]"></div>
              </div>
            ) : (
              <p className="px-4 mb-2 text-[10px] font-semibold text-[#5a6578] uppercase tracking-widest">Students</p>
            )}
            <div className="space-y-1">
              <NavItem
                icon={Target}
                label="Topic Mastery"
                active={activeView === 'topic_mastery'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => handleSidebarNav('topic_mastery')}
                forceExpanded={isMobileViewport}
              />
              <NavItem
                icon={Users}
                label="Competency"
                active={activeView === 'competency'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => handleSidebarNav('competency')}
                forceExpanded={isMobileViewport}
              />
            </div>
          </div>

          {/* Tools Section */}
          <div>
            {sidebarCollapsed && !sidebarHovered ? (
              <div className="px-4 mb-2 flex items-center gap-2">
                <div className="flex-1 h-[1px] bg-[#dde3eb]"></div>
              </div>
            ) : (
              <p className="px-4 mb-2 text-[10px] font-semibold text-[#5a6578] uppercase tracking-widest">Tools</p>
            )}
            <div className="space-y-1">
              <NavItem
                icon={Database}
                label="Data Import"
                active={activeView === 'import'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => setActiveView('import')}
                forceExpanded={isMobileViewport}
              />
              <NavItem
                icon={ClipboardCheck}
                label="AI Quiz Maker"
                active={activeView === 'quiz_maker'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => setActiveView('quiz_maker')}
                forceExpanded={isMobileViewport}
              />
              <NavItem
                icon={BookOpen}
                label="Question Bank"
                active={activeView === 'question_bank'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => setActiveView('question_bank')}
                forceExpanded={isMobileViewport}
              />
              <NavItem
                icon={Calendar}
                label="Calendar"
                active={activeView === 'calendar'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => setActiveView('calendar')}
                forceExpanded={isMobileViewport}
              />
            </div>
          </div>
        </nav>

        {/* User Section */}
        <div className="space-y-2 border-t border-[#dde3eb] pt-4">
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[#5a6578] font-semibold border border-transparent hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628] transition-all duration-200 whitespace-nowrap ${sidebarCollapsed && !sidebarHovered ? 'justify-center' : ''
              }`}
            onClick={onOpenSettings}
            title={sidebarCollapsed && !sidebarHovered ? 'Settings' : ''}
          >
            <Settings size={18} strokeWidth={2} className="flex-shrink-0" />
            {(!sidebarCollapsed || sidebarHovered) && <span className="font-body text-xs">Settings</span>}
          </motion.button>

          <div className="text-[#5a6578]">
            <LogoutActionButton onClick={() => setShowLogoutConfirm(true)} collapsed={sidebarCollapsed && !sidebarHovered} />
          </div>
        </div>
      </motion.aside>

      {/* Main Content + Right Sidebar */}
      <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-[#fff7ed]">

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          {['dashboard', 'analytics', 'intervention', 'competency', 'topic_mastery', 'calendar', 'notifications', 'question_bank', 'import', 'quiz_maker'].includes(activeView) && (
            <header className="bg-transparent border-b border-[#e2e8f0]/40 px-[24px] xl:px-[32px] pt-[24px] pb-[16px] flex-shrink-0 z-30">
              <div className="flex flex-row items-center justify-between gap-2 mb-0">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {isMobileViewport && (
                    <button
                      onClick={() => setMobileNavOpen(true)}
                      className="mt-1 p-2 rounded-lg border border-border text-muted-foreground hover:text-[#9956DE] hover:border-[#9956DE]/30 hover:bg-[#9956DE]/12 transition-colors"
                      aria-label="Open navigation"
                    >
                      <Menu size={18} />
                    </button>
                  )}
                  <div>
                    <h1 className="text-lg sm:text-[26px] font-bold text-[#1e293b] tracking-tight leading-tight truncate">
                      {activeView === 'dashboard' && 'Teacher Dashboard'}
                      {activeView === 'analytics' && 'Class Analytics'}
                      {activeView === 'intervention' && 'Intervention Center'}
                      {activeView === 'competency' && 'Student Competency'}
                      {activeView === 'topic_mastery' && 'Topic Mastery'}
                      {activeView === 'calendar' && 'Academic Calendar'}
                      {activeView === 'notifications' && 'Notifications'}
                      {activeView === 'question_bank' && 'Question Bank'}
                      {activeView === 'import' && 'Data Import'}
                      {activeView === 'quiz_maker' && 'AI Quiz Maker'}
                    </h1>
                    <p className="text-[13px] text-[#64748b] mt-1">
                      {activeView === 'dashboard' && `Welcome back, ${teacherName}`}
                      {activeView === 'analytics' && 'Analyze performance and risk across your classes.'}
                      {activeView === 'intervention' && 'Identify and support students who need immediate help.'}
                      {activeView === 'competency' && 'Track individual student progress against learning goals.'}
                      {activeView === 'topic_mastery' && 'Overview of student mastery levels across different math topics.'}
                      {activeView === 'calendar' && 'Manage your schedules and academic events.'}
                      {activeView === 'notifications' && 'Stay updated with student activity and system alerts.'}
                      {activeView === 'question_bank' && 'Manage and create math questions for your quizzes.'}
                      {activeView === 'import' && 'Upload class records and materials to power AI analytics.'}
                      {activeView === 'quiz_maker' && 'Create AI-powered quizzes based on your curriculum.'}
                    </p>
                  </div>
                  {/* Quick teacher stats */}
                  {activeView === 'dashboard' && (
                    <div className="hidden xl:flex items-center gap-2 ml-4 mt-1">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9956DE]/12 border border-[#9956DE]/30 rounded-lg">
                        <Users size={13} className="text-[#9956DE]" />
                        <span className="text-xs font-display font-semibold text-[#9956DE]">{totalStudents} students</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F08386]/12 border border-[#F08386]/30 rounded-lg">
                        <AlertTriangle size={13} className="text-[#F08386]" />
                        <span className="text-xs font-display font-semibold text-[#C65E63]">{totalAtRisk} at risk</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#75D06A]/14 border border-[#75D06A]/35 rounded-lg">
                        <TrendingUp size={13} className="text-[#75D06A]" />
                        <span className="text-xs font-display font-semibold text-[#4D9F46]">{avgPerformance}% avg</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* AI Insights Button */}
                  <div className="relative group">
                    <button
                      onClick={() => {
                        setInsightModalOpen(true);
                        setInsightDismissed(true);
                      }}
                      className="relative w-10 h-10 flex items-center justify-center bg-[#eef2ff]/80 hover:bg-[#e0e7ff] rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#a5b4fc]/60 text-[#4f46e5] hover:border-[#818cf8] transition-colors cursor-pointer hover:scale-[1.02]"
                      aria-label="View AI Insight"
                    >
                      <Sparkles size={18} />
                      {!insightDismissed && dailyInsight && (
                        <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
                      )}
                    </button>
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-[#1e293b] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      AI Insight
                    </span>
                  </div>
                  {/* Mobile Calendar Toggle — only visible on mobile when on dashboard */}
                  {isMobileViewport && activeView === 'dashboard' && (
                    <button
                      onClick={() => setShowMobileCalendar(v => !v)}
                      className={`relative w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border transition-colors cursor-pointer hover:scale-[1.02] ${showMobileCalendar
                        ? 'bg-[#818cf8] border-[#6366f1] text-white'
                        : 'bg-white/60 hover:bg-white/80 border-white/50 text-[#64748b] hover:text-[#1e293b]'
                        }`}
                      aria-label={showMobileCalendar ? 'Close calendar panel' : 'Open calendar panel'}
                      title={showMobileCalendar ? 'Close calendar' : 'View calendar'}
                    >
                      <Calendar size={18} />
                    </button>
                  )}
                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative w-10 h-10 flex items-center justify-center bg-white/60 hover:bg-white/80 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 text-[#64748b] hover:text-[#1e293b] transition-colors cursor-pointer hover:scale-[1.02]"
                      aria-label="View notifications"
                      title="Notifications"
                    >
                      <Bell size={18} />
                      {teacherUnreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>}
                    </button>

                    <NotificationDropdown
                      isOpen={showNotifications}
                      onClose={() => setShowNotifications(false)}
                      onViewAll={() => setActiveView('notifications')}
                    />
                  </div>
                  {/* Profile Pill - Hidden on Dashboard view since it has its own profile in the right sidebar */}
                  {activeView !== 'dashboard' && (
                    <div
                      onClick={onOpenProfile}
                      className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 cursor-pointer hover:bg-white/80 transition-colors h-10 hover:scale-[1.02]"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 overflow-hidden shrink-0">
                        <img src={userProfile?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName || 'Teacher')}&background=e0e7ff&color=4f46e5`} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#1e293b]">{teacherName || 'Test Teacher'}</span>
                    </div>
                  )}
                </div>
              </div>
            </header>
          )}

          {/* View Content */}
          <main className={`flex-1 flex flex-col ${activeView === 'intervention' || activeView === 'analytics' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            <AnimatePresence mode="wait">
              {activeView === 'dashboard' && (
                <DashboardView
                  classes={managedClasses}
                  liveActivity={liveActivity}
                  onViewClass={handleViewClass}
                  onViewAllClasses={() => setActiveView('analytics')}
                  onViewActivityStudent={(name) => {
                    const match = students.find(s => s.name === name);
                    if (match) handleViewStudent(match);
                  }}
                  dailyInsight={dailyInsight}
                  insightLoading={insightLoading}
                  isInsightDismissed={insightDismissed}
                  onDismissInsight={() => setInsightDismissed(true)}
                  onOpenInsightModal={() => { setInsightModalOpen(true); setInsightDismissed(true); }}
                  totalStudents={totalStudents}
                  totalAtRisk={totalAtRisk}
                  avgPerformance={avgPerformance}
                  onCreateClass={() => setShowCreateClassModal(true)}
                />
              )}
              {activeView === 'analytics' && effectiveAnalyticsClass && (
                <AnalyticsView
                  selectedClass={effectiveAnalyticsClass}
                  students={filteredStudentsForAnalytics}
                  allClasses={classes}
                  riskDistribution={riskDistribution}
                  topicPerformance={topicPerformance}
                  onViewStudent={handleViewStudent}
                  onCreateAccount={handleOpenCreateAccount}
                  onReassignSection={handleReassignSection}
                  reassignBusyId={reassignBusyId}
                  onBack={() => setSelectedClass(null)}
                  teacherOptions={teacherDirectory}
                  managerUpdating={managerUpdating}
                  onAssignManager={(manager) => handleAssignClassManager(effectiveAnalyticsClass, manager)}
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                  classColor={effectiveClassColor}
                  insightDismissed={insightDismissed}
                  onOpenInsightModal={() => setInsightModalOpen(true)}
                  onAddStudents={() => setShowAddStudentsModal(true)}
                  onRemoveStudent={handleRemoveStudent}
                />
              )}
              {activeView === 'analytics' && !effectiveAnalyticsClass && managedClasses.length > 0 && (
                <ClassesOverviewMenu
                  classes={managedClasses}
                  onSelectClass={handleViewClass}
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                  insightDismissed={insightDismissed}
                  onOpenInsightModal={() => setInsightModalOpen(true)}
                  onCreateClass={() => setShowCreateClassModal(true)}
                />
              )}
              {activeView === 'analytics' && !effectiveAnalyticsClass && managedClasses.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-6"
                >
                  <div className="bg-card border border-border rounded-2xl p-8 shadow-sm max-w-2xl">
                    <div className="w-12 h-12 rounded-xl bg-[#9956DE]/20 text-[#9956DE] flex items-center justify-center mb-4">
                      <BarChart3 size={24} />
                    </div>
                    <h2 className="text-2xl font-display font-semibold text-foreground mb-2">Class Analytics</h2>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">No classes available yet. Create a class or import class records to unlock analytics views.</p>
                    <Button onClick={() => setShowCreateClassModal(true)} className="bg-[#9956DE] hover:bg-[#7c3aed] text-white">
                      <Plus size={16} className="mr-1.5" />Create Class
                    </Button>
                  </div>
                </motion.div>
              )}
              {activeView === 'intervention' && selectedStudent && (
                <InterventionView
                  student={selectedStudent}
                  teacherId={currentUser?.uid || ''}
                  teacherName={teacherName}
                  initialCache={interventionCacheRef.current.get(selectedStudent.id)}
                  onCacheUpdate={(id, cache) => interventionCacheRef.current.set(id, cache)}
                  onStudentUpdated={(updatedStudent) => {
                    const previousStudentKey = selectedStudent ? buildStudentViewKey(selectedStudent) : null;
                    setSelectedStudent(updatedStudent);
                    setStudents((prev) =>
                      prev.map((item) => {
                        const itemKey = buildStudentViewKey(item);
                        const matchesPreviousKey = previousStudentKey ? itemKey === previousStudentKey : false;
                        const matchesExactIdentity =
                          item.id === updatedStudent.id
                          && normalizeClassSectionId(item.classSectionId) === normalizeClassSectionId(updatedStudent.classSectionId);
                        return matchesPreviousKey || matchesExactIdentity ? updatedStudent : item;
                      })
                    );
                  }}
                  onBack={handleBackToAnalytics}
                  onNavigateToQuizMaker={(tab) => {
                    setActiveView('quiz_maker');
                    // pass tab hint via sessionStorage so QuizMaker can pick it up
                    if (tab) sessionStorage.setItem('quizMakerInitialTab', tab);
                  }}
                />
              )}
              {activeView === 'topic_mastery' && (
                <TopicMasteryView
                  classSectionId={selectedClassSectionId}
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                />
              )}
              {activeView === 'competency' && effectiveAnalyticsClass && (
                <StudentCompetencyTable
                  classSectionId={selectedClassSectionId}
                  className={selectedClass?.name}
                  fallbackStudents={students}
                  onBack={() => setSelectedClass(null)}
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                  insightDismissed={insightDismissed}
                  onOpenInsightModal={() => setInsightModalOpen(true)}
                />
              )}
              {activeView === 'competency' && !effectiveAnalyticsClass && classes.length > 0 && (
                <ClassesOverviewMenu
                  classes={managedClasses}
                  onSelectClass={(cls) => setSelectedClass(cls)}
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                  insightDismissed={insightDismissed}
                  onOpenInsightModal={() => setInsightModalOpen(true)}
                  viewType="competency"
                />
              )}
              {activeView === 'competency' && !effectiveAnalyticsClass && classes.length === 0 && (
                <ToolsPlaceholderView
                  icon={Users}
                  title="Student Competency"
                  description="No classes available yet. Import class records to view competency breakdowns."
                />
              )}
              {activeView === 'import' && (
                <>
                <DataImportView
                  classSectionId={selectedClassSectionId}
                  className={selectedClass?.name}
                  classMetadata={selectedClass?.classMetadata}
                  students={students}
                  classes={managedClasses.map(c => ({ id: c.id, name: c.name, classSectionId: c.classSectionId }))}
                  teacherId={currentUser?.uid || ''}
                  teacherName={teacherName}
                  onStudentsUpdated={(updated) => setStudents(updated)}
                  onBackToClasses={() => setActiveView('dashboard')}
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                  onOpenInsightModal={() => { setInsightModalOpen(true); setInsightDismissed(true); }}
                  userPhoto={userProfile?.photo}
                  onImportedClassRecords={(payload) => {
                    const uploadedStudents = payload.students.map((item) =>
                      toUploadedStudentView(item, payload.classSectionId, payload.className, payload.classMetadata),
                    );

                    const resolvedClassMetadata = resolveClassMetadata({
                      metadata: payload.classMetadata,
                      classSectionId: payload.classSectionId,
                      className: payload.className,
                    });
                    const classSection = resolvedClassMetadata.classSectionId || 'imported_class';
                    const resolvedClassName = resolvedClassMetadata.className || 'Imported Class';
                    const atRiskCount = uploadedStudents.filter((item) => item.riskLevel === 'high').length;
                    const avgScore = uploadedStudents.length > 0
                      ? Math.round(uploadedStudents.reduce((sum, item) => sum + item.avgScore, 0) / uploadedStudents.length)
                      : 0;

                    const uploadedClass: ClassView = {
                      id: classSection,
                      name: resolvedClassName,
                      classSectionId: classSection,
                      classMetadata: {
                        ...resolvedClassMetadata,
                        classSectionId: classSection,
                        className: resolvedClassName,
                      },
                      schedule: 'Mon-Fri',
                      studentCount: uploadedStudents.length,
                      avgScore,
                      atRiskCount,
                      riskLevel: atRiskCount >= 5 ? 'high' : atRiskCount >= 2 ? 'medium' : 'low',
                    };

                    setStudents((prev) => mergeStudentViews(prev, uploadedStudents));
                    setClasses((prev) => mergeClassViews(prev, [uploadedClass]));
                  }}
                  onDataChanged={() => setDataRefreshNonce((prev) => prev + 1)}
                />
                <div className="mt-6">
                  <TeacherModuleStatusControl teacherId={currentUser?.uid || ''} />
                </div>
                </>
              )}
              {activeView === 'notifications' && (
                <TeacherNotificationsView
                  liveActivity={liveActivity}
                  atRiskStudents={students
                    .filter(s => s.riskLevel === 'high')
                    .map(s => ({ name: s.name, riskLevel: s.riskLevel, weakestTopic: s.weakestTopic }))}
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                  onOpenInsightModal={() => { setInsightModalOpen(true); setInsightDismissed(true); }}
                  userPhoto={userProfile?.photo}
                  teacherName={teacherName}
                />
              )}
              {activeView === 'calendar' && (
                <TeacherCalendarView
                  classes={classes}
                  teacherId={currentUser?.uid}
                />
              )}
              {/* Edit records view is now handled internally by DataImportView */}
              {activeView === 'quiz_maker' && (
                <QuizMaker
                  onBack={() => {
                    const returnTo = sessionStorage.getItem('quizMakerReturnTo');
                    sessionStorage.removeItem('quizMakerReturnTo');
                    sessionStorage.removeItem('quizMakerInitialTab');
                    setActiveView((returnTo === 'intervention' ? 'intervention' : 'dashboard') as View);
                  }}
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                  onOpenInsightModal={() => { setInsightModalOpen(true); setInsightDismissed(true); }}
                  userPhoto={userProfile?.photo}
                  teacherName={teacherName}
                />
              )}
              {activeView === 'question_bank' && (
                <QuestionBankPanel
                  onOpenNotifications={() => setActiveView('notifications')}
                  onOpenProfile={onOpenProfile}
                  onOpenInsightModal={() => { setInsightModalOpen(true); setInsightDismissed(true); }}
                  userPhoto={userProfile?.photo}
                  teacherName={teacherName}
                />
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Desktop: right sidebar always visible alongside main content */}
        {activeView === 'dashboard' && !isMobileViewport && (
          <DashboardRightSidebar
            onViewCalendar={() => setActiveView('calendar')}
            onOpenProfile={onOpenProfile}
            userProfile={userProfile}
            teacherName={teacherName}
            liveActivity={liveActivity}
          />
        )}
      </div>

      {/* Mobile: calendar/profile panel as a fixed right-side drawer */}
      <AnimatePresence>
        {isMobileViewport && activeView === 'dashboard' && showMobileCalendar && (
          <>
            {/* Backdrop */}
            <motion.button
              key="cal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
              aria-label="Close calendar panel"
              onClick={() => setShowMobileCalendar(false)}
            />
            {/* Drawer panel */}
            <motion.div
              key="cal-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[300px] max-w-[85vw] shadow-2xl"
            >
              <DashboardRightSidebar
                onViewCalendar={() => { setActiveView('calendar'); setShowMobileCalendar(false); }}
                onOpenProfile={() => { onOpenProfile?.(); setShowMobileCalendar(false); }}
                userProfile={userProfile}
                teacherName={teacherName}
                liveActivity={liveActivity}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Insight Modal */}
      <AnimatePresence>
        {insightModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-semibold text-slate-800">Detailed AI Insight</h3>
                </div>
                <button
                  onClick={() => { setInsightModalOpen(false); }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                  <div className="text-sm text-slate-600 leading-relaxed">
                    <ChatMarkdown>
                      {(dailyInsight?.replace(/[*_]*\s*\(?Word\s*count\s*:\s*[*_]*\s*\d+\)?\s*[*_]*/gi, '').trim()) || `**${totalAtRisk} students (${totalStudents > 0 ? Math.round((totalAtRisk / totalStudents) * 100) : 0}%)** are currently at high risk of falling behind in recent topics. Review their progress in the analytics view to plan interventions.`}
                    </ChatMarkdown>
                  </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button
                  onClick={() => { setInsightModalOpen(false); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Minimize to Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
      />

      <CreateClassModal
        open={showCreateClassModal}
        onClose={() => setShowCreateClassModal(false)}
        onCreated={() => setDataRefreshNonce((n) => n + 1)}
        teacherName={teacherName}
      />

      <AddStudentsModal
        open={showAddStudentsModal}
        onClose={() => setShowAddStudentsModal(false)}
        onAdded={() => setDataRefreshNonce((n) => n + 1)}
        grade={effectiveAnalyticsClass?.gradeLevel || effectiveAnalyticsClass?.classMetadata?.grade || 'Grade 11'}
        section={effectiveAnalyticsClass?.classMetadata?.section || effectiveAnalyticsClass?.name?.split(' - ')[1] || ''}
        teacherName={teacherName}
        existingStudentUids={filteredStudentsForAnalytics.map((s) => s.id)}
      />

      {/* Provision system account for a roster-only student */}
      <CreateStudentAccountModal
        isOpen={!!createAccountSeed}
        onClose={() => setCreateAccountSeed(null)}
        seed={createAccountSeed}
        adviserTeacherId={currentUser?.uid || ''}
        adviserTeacherName={teacherName}
        schoolYear={
          createAccountSeed
            ? students.find((entry) => entry.id === createAccountSeed.rosterId)?.classMetadata?.schoolYear
              || String(new Date().getFullYear())
            : undefined
        }
        onCreated={handleAccountCreated}
      />
    </div>
  );
};

// Navigation Item Component
const NavItem: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  active: boolean;
  collapsed: boolean;
  forceExpanded?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, collapsed, forceExpanded = false, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ x: 2 }}
    whileTap={{ scale: 0.98 }}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 border whitespace-nowrap ${collapsed && !forceExpanded ? 'justify-center' : ''
      } ${active
        ? 'bg-[#9956DE]/12 border-[#9956DE]/30 shadow-sm text-[#9956DE]'
        : 'bg-transparent border-transparent text-[#5a6578] hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628]'
      }`}
  >
    <Icon size={18} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
    {(!collapsed || forceExpanded) && <span className="font-body font-semibold text-xs">{label}</span>}
    {active && !collapsed && (
      <motion.div
        layoutId="sidebar-active-indicator"
        className="ml-auto w-2 h-2 rounded-full bg-[#9956DE]"
        transition={{ type: 'spring', duration: 0.4 }}
      />
    )}
  </motion.button>
);

const ToolsPlaceholderView: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="p-6"
  >
    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm max-w-2xl">
      <div className="w-12 h-12 rounded-xl bg-[#9956DE]/20 text-[#9956DE] flex items-center justify-center mb-4">
        <Icon size={24} />
      </div>
      <h2 className="text-2xl font-display font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground font-body leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// Dashboard View
const DashboardView: React.FC<{
  classes: ClassView[];
  liveActivity: { id: string; student: string; action: string; topic: string; time: string; type: string }[];
  onViewClass: (classItem: ClassView) => void;
  onViewAllClasses: () => void;
  onViewActivityStudent?: (studentName: string) => void;
  dailyInsight: string;
  insightLoading: boolean;
  isInsightDismissed: boolean;
  onDismissInsight: () => void;
  onOpenInsightModal: () => void;
  totalStudents: number;
  totalAtRisk: number;
  avgPerformance: number;
  onCreateClass?: () => void;
}> = ({ classes, liveActivity, onViewClass, onViewAllClasses, onViewActivityStudent, dailyInsight, insightLoading, isInsightDismissed, onDismissInsight, onOpenInsightModal, totalStudents, totalAtRisk, avgPerformance, onCreateClass }) => {
  const riskPercentage = totalStudents > 0 ? Math.round((totalAtRisk / totalStudents) * 100) : 0;
  const engagementRate = totalStudents > 0 ? Math.round(((totalStudents - totalAtRisk) / totalStudents) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-3 sm:p-6 space-y-4"
    >
      {/* AI Banner */}
      {!isInsightDismissed && dailyInsight && (
        <div
          onClick={onOpenInsightModal}
          className="bg-white/80 backdrop-blur-[12px] rounded-[18px] border border-white p-[14px_16px] sm:p-[18px_20px] flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-md transition-shadow group"
        >
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-[5px] rounded-full border-2 border-[#a5b4fc] opacity-50 animate-pulse" />
            <div className="w-[46px] h-[46px] rounded-full bg-[#eef2ff] border-2 border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] text-xl relative overflow-hidden group-hover:scale-[1.05] transition-transform">
              <img src="/avatar/avatar_icon.png" alt="AI Mascot" className="w-[85%] h-[85%] object-contain" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold text-[#1e1b4b] flex flex-wrap items-center gap-2 mb-1">
              <Sparkles size={14} className="text-[#818cf8]" />
              MathPulse AI insight
              <span className="bg-[#fee2e2] text-[#b91c1c] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#fca5a5]">Attention needed</span>
            </div>
            <div className="text-[12.5px] text-[#475569] leading-[1.55]">
              Some students may be at risk of falling behind. Click to view detailed analysis.
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 self-end sm:self-auto">
            <button onClick={(e) => { e.stopPropagation(); onDismissInsight(); }} className="px-[15px] py-[7px] rounded-[10px] text-xs font-medium cursor-pointer border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] transition-colors">Dismiss</button>
            <button onClick={(e) => { e.stopPropagation(); onViewAllClasses(); }} className="px-[15px] py-[7px] rounded-[10px] text-xs font-medium cursor-pointer border border-[#4f46e5] bg-[#4f46e5] text-white shadow-[0_2px_8px_rgba(79,70,229,0.13)] hover:bg-[#4338ca] transition-colors">Review students</button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {/* Card 1 — Total Students */}
        <div className="group relative overflow-hidden bg-[#10b981] shadow-[0_4px_16px_rgba(16,185,129,0.13)] rounded-sm sm:rounded-lg p-[10px] sm:p-[15px] text-white flex flex-col gap-[6px] sm:gap-[10px]">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-500 ease-out" />
          <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-500 delay-75 ease-out" />
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-[9px] sm:text-[11px] opacity-90 leading-tight">Total students</span>
            <div className="hidden sm:flex bg-white/20 p-1.5 rounded-lg"><Users size={15} /></div>
          </div>
          <div className="relative z-10 text-[18px] sm:text-[26px] font-semibold tracking-tight">{totalStudents}</div>
          <div className="relative z-10 border-t border-white/30 pt-1.5 sm:pt-2 flex justify-between items-center text-[9px] sm:text-[10px] opacity-90">
            <span className="hidden sm:block">Added this year</span>
            <span className="bg-black/15 px-[5px] sm:px-[7px] py-[2px] rounded font-semibold">{totalStudents > 0 ? '+1' : '0'}</span>
          </div>
        </div>

        {/* Card 2 — Class Average */}
        <div className="group relative overflow-hidden bg-[#0ea5e9] shadow-[0_4px_16px_rgba(14,165,233,0.13)] rounded-sm sm:rounded-lg p-[10px] sm:p-[15px] text-white flex flex-col gap-[6px] sm:gap-[10px]">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-500 ease-out" />
          <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-500 delay-75 ease-out" />
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-[9px] sm:text-[11px] opacity-90 leading-tight">Class average</span>
            <div className="hidden sm:flex bg-white/20 p-1.5 rounded-lg"><Target size={15} /></div>
          </div>
          <div className="relative z-10 text-[18px] sm:text-[26px] font-semibold tracking-tight">{avgPerformance}%</div>
          <div className="relative z-10 border-t border-white/30 pt-1.5 sm:pt-2 flex justify-between items-center text-[9px] sm:text-[10px] opacity-90">
            <span className="hidden sm:block">Vs. last month</span>
            <span className="bg-black/15 px-[5px] sm:px-[7px] py-[2px] rounded font-semibold">+2.5%</span>
          </div>
        </div>

        {/* Card 3 — Engagement Rate */}
        <div className="group relative overflow-hidden bg-[#a855f7] shadow-[0_4px_16px_rgba(168,85,247,0.13)] rounded-sm sm:rounded-lg p-[10px] sm:p-[15px] text-white flex flex-col gap-[6px] sm:gap-[10px]">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-500 ease-out" />
          <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-500 delay-75 ease-out" />
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-[9px] sm:text-[11px] opacity-90 leading-tight">Engage&shy;ment</span>
            <div className="hidden sm:flex bg-white/20 p-1.5 rounded-lg"><Activity size={15} /></div>
          </div>
          <div className="relative z-10 text-[18px] sm:text-[26px] font-semibold tracking-tight">{engagementRate}%</div>
          <div className="relative z-10 border-t border-white/30 pt-1.5 sm:pt-2 flex justify-between items-center text-[9px] sm:text-[10px] opacity-90">
            <span className="hidden sm:block">Active participants</span>
            <span className="bg-black/15 px-[5px] sm:px-[7px] py-[2px] rounded font-semibold">{Math.round((engagementRate / 100) * totalStudents)}</span>
          </div>
        </div>

        {/* Card 4 — At Risk */}
        <div className="group relative overflow-hidden bg-[#f97316] shadow-[0_4px_16px_rgba(249,115,22,0.13)] rounded-sm sm:rounded-lg p-[10px] sm:p-[15px] text-white flex flex-col gap-[6px] sm:gap-[10px]">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-500 ease-out" />
          <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-500 delay-75 ease-out" />
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-[9px] sm:text-[11px] opacity-90 leading-tight">At risk</span>
            <div className="hidden sm:flex bg-white/20 p-1.5 rounded-lg"><AlertCircle size={15} /></div>
          </div>
          <div className="relative z-10 text-[18px] sm:text-[26px] font-semibold tracking-tight">{totalAtRisk}</div>
          <div className="relative z-10 border-t border-white/30 pt-1.5 sm:pt-2 flex justify-between items-center text-[9px] sm:text-[10px] opacity-90">
            <span className="hidden sm:block">Requires attention</span>
            <span className="bg-black/15 px-[5px] sm:px-[7px] py-[2px] rounded font-semibold">{riskPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Classes Container */}
      <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] border border-white p-[18px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex justify-between items-center mb-[14px]">
          <h2 className="text-[15px] font-semibold text-[#1e293b]">My classes</h2>
          <span onClick={onViewAllClasses} className="text-[12px] text-[#10b981] font-semibold cursor-pointer hover:underline">View all</span>
        </div>

        <div className="space-y-[9px]">
          {classes.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-3">No classes imported yet.</p>
              {onCreateClass && (
                <button onClick={onCreateClass} className="text-sm text-[#9956DE] font-semibold hover:underline">
                  + Create a class
                </button>
              )}
            </div>
          )}
          {classes.map((classItem, idx) => {
            const colors = [
              { bg: 'bg-[#f3e8ff]', text: 'text-[#a855f7]', borderHover: 'hover:border-[#d8b4fe]', stripe: 'bg-[#a855f7]' },
              { bg: 'bg-[#eff6ff]', text: 'text-[#3b82f6]', borderHover: 'hover:border-[#bfdbfe]', stripe: 'bg-[#3b82f6]' },
              { bg: 'bg-[#f0fdf4]', text: 'text-[#22c55e]', borderHover: 'hover:border-[#bbf7d0]', stripe: 'bg-[#22c55e]' },
              { bg: 'bg-[#fff7ed]', text: 'text-[#f97316]', borderHover: 'hover:border-[#fed7aa]', stripe: 'bg-[#f97316]' },
              { bg: 'bg-[#fff1f2]', text: 'text-[#f43f5e]', borderHover: 'hover:border-[#fecdd3]', stripe: 'bg-[#f43f5e]' },
            ];
            const color = colors[idx % colors.length];

            return (
              <div
                key={classItem.id}
                onClick={() => onViewClass(classItem)}
                className={`relative overflow-hidden flex items-center gap-3 p-[12px_13px] pl-[16px] border border-[#f1f5f9] rounded-[14px] cursor-pointer ${color.borderHover} hover:shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:bg-[#fafbff] transition-all group`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-[5px] ${color.stripe}`} />
                <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 text-[17px] ${color.bg} ${color.text} group-hover:scale-110 transition-transform duration-300`}>
                  <BookOpen size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] font-medium text-[#1e293b]">{classItem.name}</div>
                  <div className="text-[11px] text-[#94a3b8] mt-[1px]">{classItem.classification || 'High School'}</div>
                </div>
                <div className="hidden sm:block text-[12px] text-[#64748b] min-w-[65px]">{classItem.schedule || 'Mon-Fri'}</div>
                <div className="hidden sm:block text-[12px] text-[#64748b] min-w-[85px]">{classItem.studentCount} students</div>
                <span className={`text-[10px] font-semibold px-[9px] py-[3px] rounded-[6px] ${classItem.riskLevel === 'high' ? 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]' : classItem.riskLevel === 'medium' ? 'bg-[#fffbeb] text-[#b45309] border border-[#fcd34d]' : 'bg-[#ecfdf5] text-[#065f46] border border-[#6ee7b7]'}`}>
                  {classItem.riskLevel === 'high' ? 'High risk' : classItem.riskLevel === 'medium' ? 'Medium risk' : 'On track'}
                </span>
                <MoreHorizontal size={16} className="text-[#cbd5e1] ml-auto hover:text-[#64748b]" />
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

const StudentCard = React.memo(({
  student,
  onViewStudent,
  onCreateAccount,
  onRemoveStudent,
}: {
  student: StudentView;
  onViewStudent: (s: StudentView) => void;
  onCreateAccount?: (s: StudentView) => void;
  onRemoveStudent?: (s: StudentView) => void;
}) => {
  const getTheme = () => {
    if (student.riskLevel === 'high') {
      return { borderLeft: 'border-l-rose-500', bgAvatar: 'bg-rose-50 text-rose-600 border-rose-100/50', badge: 'text-rose-600 bg-rose-50', progress: 'bg-rose-500' };
    }
    if (student.riskLevel === 'medium') {
      return { borderLeft: 'border-l-amber-500', bgAvatar: 'bg-amber-50 text-amber-600 border-amber-100/50', badge: 'text-amber-600 bg-amber-50', progress: 'bg-amber-500' };
    }
    return { borderLeft: 'border-l-emerald-500', bgAvatar: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', badge: 'text-emerald-600 bg-emerald-50', progress: 'bg-emerald-500' };
  };

  const theme = getTheme();
  const isRosterOnly = student.hasRegisteredAccount === false && student.source === 'import';
  const hasActiveAccount = student.hasRegisteredAccount === true;

  return (
    <div
      onClick={() => onViewStudent(student)}
      className={`p-[12px] bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#f1f5f9] border-l-[4px] ${theme.borderLeft} hover:scale-[1.02] transition-transform cursor-pointer group flex flex-col justify-between`}
    >
      <div className="flex justify-between items-start mb-[10px]">
        <div className="flex gap-[8px] items-center min-w-0 pr-2">
          {student.avatar ? (
            <img src={student.avatar} alt={student.name} className={`w-8 h-8 rounded-full border ${theme.bgAvatar.split(' ')[2]} object-cover shrink-0`} />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[11px] shrink-0 border ${theme.bgAvatar}`}>
              {student.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-[13px] font-semibold text-[#1e293b] leading-tight truncate">{student.name}</p>
              {hasActiveAccount && (
                <span
                  title="Registered student account"
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                />
              )}
            </div>
            <p className="text-[10px] text-[#64748b] flex items-center gap-[4px] mt-0.5 truncate">
              <Clock className="w-[10px] h-[10px] shrink-0" /> {student.lastActive || 'recently'}
            </p>
          </div>
        </div>
        <span className={`font-semibold text-[11px] px-[6px] py-[2px] rounded-[14px] shrink-0 ${theme.badge}`}>{student.avgScore}%</span>
        {onRemoveStudent && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemoveStudent(student); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1 rounded shrink-0"
            aria-label={`Remove ${student.name} from class`}
            title="Remove from class"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {isRosterOnly && (
        <div className="flex items-center justify-between gap-2 mb-2 px-2 py-1 rounded-[10px] bg-amber-50 border border-amber-100/80">
          <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">No Account</span>
          {onCreateAccount && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCreateAccount(student);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-amber-700 border border-amber-200 hover:bg-amber-100 text-[10px] font-semibold transition-colors"
              aria-label={`Create system account for ${student.name}`}
            >
              <span aria-hidden>+</span>
              Create
            </button>
          )}
        </div>
      )}
      <div className="w-full bg-[#f1f5f9] h-1.5 rounded-full overflow-hidden mt-auto">
        <div className={`h-full rounded-full ${theme.progress}`} style={{ width: `${student.avgScore}%` }}></div>
      </div>
    </div>
  );
});

// Section Management Panel — moves students between class sections.
// Renders as a collapsible card below the analytics summary.
const SectionManagementPanel: React.FC<{
  students: StudentView[];
  allClasses: ClassView[];
  currentClass: ClassView;
  onReassignSection: (
    student: StudentView,
    target: { classSectionId: string; grade: string; section: string },
  ) => void | Promise<void>;
  reassignBusyId: string | null;
}> = ({ students, allClasses, currentClass, onReassignSection, reassignBusyId }) => {
  const [expanded, setExpanded] = useState(false);

  const sectionTargets = useMemo(() => {
    const seen = new Map<
      string,
      { classSectionId: string; grade: string; section: string; label: string }
    >();
    allClasses.forEach((classView) => {
      const sectionId = (classView.classSectionId || classView.id || '').trim();
      if (!sectionId) return;
      const grade = (classView.classMetadata?.grade || '').trim();
      const section = (classView.classMetadata?.section || '').trim();
      if (!grade || !section) return;
      const label = classView.name || `${grade} - ${section}`;
      seen.set(sectionId, { classSectionId: sectionId, grade, section, label });
    });
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allClasses]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, { label: string; students: StudentView[] }>();
    const unassigned: StudentView[] = [];
    students.forEach((student) => {
      const sectionId = (student.classSectionId || '').trim();
      if (!sectionId) {
        unassigned.push(student);
        return;
      }
      const label = student.section || student.className || sectionId;
      const bucket = buckets.get(sectionId) || { label, students: [] };
      bucket.students = [...bucket.students, student];
      buckets.set(sectionId, bucket);
    });
    return {
      assigned: Array.from(buckets.entries())
        .map(([sectionId, value]) => ({ sectionId, ...value }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      unassigned,
    };
  }, [students]);

  return (
    <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] border border-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="text-[15px] font-semibold text-[#1e293b]">Section Management</h3>
          <p className="text-[12px] text-[#64748b] mt-0.5">
            Move students between sections. Showing {students.length} students across {grouped.assigned.length} section
            {grouped.assigned.length === 1 ? '' : 's'}
            {grouped.unassigned.length > 0 ? ` · ${grouped.unassigned.length} unassigned` : ''}.
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#64748b] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-[#f1f5f9] divide-y divide-[#f1f5f9]">
          {grouped.assigned.length === 0 && grouped.unassigned.length === 0 && (
            <p className="text-[12px] text-[#64748b] px-6 py-5">
              No students yet. Add students to this teacher to manage section assignments.
            </p>
          )}

          {grouped.assigned.map((bucket) => (
            <div key={bucket.sectionId} className="px-6 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b] mb-2">
                {bucket.label}{' '}
                <span className="text-[10px] font-normal text-[#94a3b8]">({bucket.students.length})</span>
              </p>
              <div className="space-y-1.5">
                {bucket.students.map((student) => (
                  <SectionAssignmentRow
                    key={`section-row-${student.id}`}
                    student={student}
                    sectionTargets={sectionTargets}
                    currentSectionId={currentClass.classSectionId}
                    onReassign={onReassignSection}
                    isBusy={reassignBusyId === student.id}
                  />
                ))}
              </div>
            </div>
          ))}

          {grouped.unassigned.length > 0 && (
            <div className="px-6 py-4 bg-amber-50/40">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-2">
                Unassigned <span className="text-[10px] font-normal text-amber-600/80">({grouped.unassigned.length})</span>
              </p>
              <div className="space-y-1.5">
                {grouped.unassigned.map((student) => (
                  <SectionAssignmentRow
                    key={`section-row-${student.id}`}
                    student={student}
                    sectionTargets={sectionTargets}
                    currentSectionId={currentClass.classSectionId}
                    onReassign={onReassignSection}
                    isBusy={reassignBusyId === student.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SectionAssignmentRow: React.FC<{
  student: StudentView;
  sectionTargets: { classSectionId: string; grade: string; section: string; label: string }[];
  currentSectionId?: string;
  onReassign: (
    student: StudentView,
    target: { classSectionId: string; grade: string; section: string },
  ) => void | Promise<void>;
  isBusy: boolean;
}> = ({ student, sectionTargets, currentSectionId, onReassign, isBusy }) => {
  const [draftSectionId, setDraftSectionId] = useState<string>(student.classSectionId || '');

  useEffect(() => {
    setDraftSectionId(student.classSectionId || '');
  }, [student.classSectionId]);

  const handleApply = () => {
    const target = sectionTargets.find((entry) => entry.classSectionId === draftSectionId);
    if (!target) return;
    if (target.classSectionId === student.classSectionId) return;
    void onReassign(student, target);
  };

  const isUnchanged = draftSectionId === (student.classSectionId || '');

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-3 py-2 rounded-[12px] bg-white border border-[#f1f5f9]">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1e293b] truncate">{student.name}</p>
        <p className="text-[11px] text-[#64748b] truncate">
          {student.lrn ? `LRN ${student.lrn} · ` : ''}
          {student.classMetadata?.className || student.className || 'Unassigned section'}
          {currentSectionId && student.classSectionId === currentSectionId ? ' · current' : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={draftSectionId}
          onChange={(event) => setDraftSectionId(event.target.value)}
          disabled={isBusy || sectionTargets.length === 0}
          className="text-[12px] rounded-xl border border-[#dde3eb] bg-white px-3 py-1.5 text-[#0a1628] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
        >
          <option value="">Select section…</option>
          {sectionTargets.map((target) => (
            <option key={target.classSectionId} value={target.classSectionId}>
              {target.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApply}
          disabled={isBusy || isUnchanged || !draftSectionId}
          className="text-[12px] font-semibold rounded-xl px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
        >
          {isBusy ? 'Saving…' : 'Move'}
        </button>
      </div>
    </div>
  );
};

// Analytics View
const AnalyticsView: React.FC<{
  selectedClass: ClassView;
  students: StudentView[];
  allClasses: ClassView[];
  riskDistribution: { name: string; value: number; color: string }[];
  topicPerformance: { topic: string; score: number }[];
  onViewStudent: (student: StudentView) => void;
  onCreateAccount: (student: StudentView) => void;
  onReassignSection: (
    student: StudentView,
    target: { classSectionId: string; grade: string; section: string },
  ) => void | Promise<void>;
  reassignBusyId: string | null;
  onBack: () => void;
  teacherOptions: TeacherDirectoryOption[];
  managerUpdating: boolean;
  onAssignManager: (manager: TeacherDirectoryOption) => void | Promise<void>;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  classColor?: { hex: string; bg: string; border: string; borderLeft: string; text: string; groupHover: string };
  insightDismissed?: boolean;
  onOpenInsightModal?: () => void;
  onAddStudents?: () => void;
  onRemoveStudent?: (student: StudentView) => void;
}> = ({
  selectedClass,
  students,
  allClasses,
  riskDistribution: _parentRiskDist,
  topicPerformance,
  onViewStudent,
  onCreateAccount,
  onReassignSection,
  reassignBusyId,
  onBack,
  teacherOptions,
  managerUpdating,
  onAssignManager,
  onOpenNotifications,
  onOpenProfile,
  classColor,
  insightDismissed,
  onOpenInsightModal,
  onAddStudents,
  onRemoveStudent,
}) => {
    const { currentUser, userProfile } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [backendReport, setBackendReport] = useState<ClassAnalyticsReport | null>(null);
    const [backendLoading, setBackendLoading] = useState(true);
    const [insightsRefreshing, setInsightsRefreshing] = useState(false);
    const [showInsights, setShowInsights] = useState(true);

    // Fetch real analytics from backend
    useEffect(() => {
      let cancelled = false;
      setBackendLoading(true);
      getClassAnalytics(selectedClass.id)
        .then((report) => { if (!cancelled) setBackendReport(report); })
        .catch((err) => console.warn('[AnalyticsView] Backend fetch failed, using local data:', err))
        .finally(() => { if (!cancelled) setBackendLoading(false); });
      return () => { cancelled = true; };
    }, [selectedClass.id]);

    // Real-time listener: refetch when student_summaries change (debounced)
    useEffect(() => {
      let unsubscribe: (() => void) | undefined;
      let debounceTimer: ReturnType<typeof setTimeout> | undefined;
      (async () => {
        try {
          const { collection: firestoreCollection, onSnapshot: firestoreOnSnapshot } = await import('firebase/firestore');
          const { db: firestoreDb } = await import('../lib/firebase');
          const summariesRef = firestoreCollection(firestoreDb, 'classes', selectedClass.id, 'student_summaries');
          let firstSnapshot = true;
          unsubscribe = firestoreOnSnapshot(summariesRef, () => {
            // Skip the initial snapshot (we already fetched above)
            if (firstSnapshot) { firstSnapshot = false; return; }
            // Debounce: coalesce rapid writes into a single refetch
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              getClassAnalytics(selectedClass.id)
                .then(setBackendReport)
                .catch(() => {});
            }, 2000);
          });
        } catch { /* Firestore listener non-critical */ }
      })();
      return () => { unsubscribe?.(); if (debounceTimer) clearTimeout(debounceTimer); };
    }, [selectedClass.id]);

    // Use backend data when available, fall back to local computation
    const classAverage = backendReport?.class_average ?? selectedClass.avgScore;
    const completionRate = backendReport?.completion_rate ?? (() => {
      if (students.length === 0) return 0;
      const total = students.reduce((sum, student) => sum + (student.assignmentCompletion || 0), 0);
      return Math.round(total / students.length);
    })();
    const participationRate = backendReport?.participation_rate ?? (() => {
      if (students.length === 0) return 0;
      const attendanceAverage = students.reduce((sum, student) => sum + (student.attendance || 0), 0) / students.length;
      const engagementAverage = students.reduce((sum, student) => sum + (student.engagementScore || 0), 0) / students.length;
      return Math.round((attendanceAverage * 0.6) + (engagementAverage * 0.4));
    })();

    // Compute risk distribution with Unassessed + Critical categories
    const riskDistribution = backendReport?.insights?.risk_distribution
      ? [
          { name: 'Critical', value: backendReport.insights.risk_distribution['Critical'] || 0, color: '#dc2626' },
          { name: 'High Risk', value: backendReport.insights.risk_distribution['High Risk'] || 0, color: '#f43f5e' },
          { name: 'Medium Risk', value: backendReport.insights.risk_distribution['Medium Risk'] || 0, color: '#f59e0b' },
          { name: 'Low Risk', value: backendReport.insights.risk_distribution['Low Risk'] || 0, color: '#10b981' },
          { name: 'Unassessed', value: backendReport.insights.risk_distribution['Unassessed'] || 0, color: '#94a3b8' },
        ].filter(d => d.value > 0)
      : [
          { name: 'High Risk', value: students.filter((s) => s.riskLevel === 'high').length, color: '#FF8B8B' },
          { name: 'Medium Risk', value: students.filter((s) => s.riskLevel === 'medium').length, color: '#F08386' },
          { name: 'Low Risk', value: students.filter((s) => s.riskLevel === 'low').length, color: '#75D06A' },
        ];

    useEffect(() => {
      setSelectedManagerId(selectedClass.classMetadata?.managerId || selectedClass.managerId || '');
    }, [selectedClass]);

    const visibleStudents = useMemo(() => {
      const query = searchTerm.trim().toLowerCase();
      let filtered = students;
      if (query) {
        filtered = filtered.filter((student) => {
          return (
            student.name.toLowerCase().includes(query)
            || (student.lrn || '').toLowerCase().includes(query)
            || (student.weakestTopic || '').toLowerCase().includes(query)
          );
        });
      }

      if (filterType === 'Good') {
        // Use backend data for accurate filtering
        if (backendReport) {
          const topIds = new Set(
            backendReport.students
              .filter(s => s.quiz_attempt_count > 0 && s.avg_score >= 75)
              .map(s => s.student_id)
          );
          filtered = filtered.filter(s => topIds.has(s.id));
        } else {
          filtered = filtered.filter(s => s.avgScore >= 85 && s.riskLevel !== 'high');
        }
      } else if (filterType === 'Risk') {
        if (backendReport) {
          const riskIds = new Set(
            backendReport.students
              .filter(s => ['High Risk', 'Critical', 'Unassessed'].includes(s.risk_level))
              .map(s => s.student_id)
          );
          filtered = filtered.filter(s => riskIds.has(s.id));
        } else {
          filtered = filtered.filter(s => s.riskLevel === 'high' || s.avgScore < 75);
        }
      }
      return filtered;
    }, [searchTerm, students, filterType, backendReport]);

    const topPerformers = useMemo(() => {
      if (backendReport) {
        return backendReport.students
          .filter(s => s.quiz_attempt_count > 0)
          .sort((a, b) => b.avg_score - a.avg_score)
          .slice(0, 5)
          .map(bs => {
            const match = students.find(s => s.id === bs.student_id);
            return match ? { ...match, avgScore: bs.avg_score } : null;
          })
          .filter(Boolean) as StudentView[];
      }
      return [...students]
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5);
    }, [students, backendReport]);

    const attentionStudents = useMemo(() => {
      if (backendReport) {
        return backendReport.students
          .filter(s => ['High Risk', 'Critical'].includes(s.risk_level))
          .sort((a, b) => a.avg_score - b.avg_score)
          .map(bs => {
            const match = students.find(s => s.id === bs.student_id);
            return match ? { ...match, avgScore: bs.avg_score, _backendRisk: bs.risk_level } : null;
          })
          .filter(Boolean) as (StudentView & { _backendRisk?: string })[];
      }
      return [...students].filter((student) => student.riskLevel === 'high' || student.avgScore < 70 || student.assignmentCompletion < 65);
    }, [students, backendReport]);

    // Topic performance from backend
    const effectiveTopicPerformance = useMemo(() => {
      if (backendReport?.insights?.topic_performance?.length) {
        return backendReport.insights.topic_performance.map(t => ({
          topic: t.topic,
          score: t.class_accuracy,
        }));
      }
      return topicPerformance;
    }, [backendReport, topicPerformance]);

    // Helper to get backend score for a student
    const getStudentScore = (studentId: string): number | null => {
      if (!backendReport) return null;
      const bs = backendReport.students.find(s => s.student_id === studentId);
      return bs ? bs.avg_score : null;
    };

    // Helper to get backend risk level for a student
    const getStudentRisk = (studentId: string): string | null => {
      if (!backendReport) return null;
      const bs = backendReport.students.find(s => s.student_id === studentId);
      return bs ? bs.risk_level : null;
    };

    const handleRefreshInsights = async () => {
      setInsightsRefreshing(true);
      try {
        const newInsights = await refreshClassInsights(selectedClass.id);
        setBackendReport(prev => prev ? { ...prev, insights: newInsights } : prev);
      } catch (err: any) {
        console.warn('[AnalyticsView] Refresh insights failed:', err?.message);
      } finally {
        setInsightsRefreshing(false);
      }
    };

    const selectedManager = useMemo(
      () => teacherOptions.find((teacher) => teacher.uid === selectedManagerId),
      [teacherOptions, selectedManagerId],
    );

    const handleAssignManager = () => {
      if (!selectedManager) {
        toast.error('Select a teacher manager first.');
        return;
      }
      void onAssignManager(selectedManager);
    };

    const classBadges = [
      selectedClass.classMetadata?.gradeLevel || selectedClass.gradeLevel,
      selectedClass.classMetadata?.classification || selectedClass.classification,
      selectedClass.classMetadata?.strand || selectedClass.strand,
    ].filter(Boolean) as string[];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="p-3 sm:p-[24px] xl:p-[32px] space-y-3 sm:space-y-[24px] h-full overflow-y-auto"
      >
        {/* Header handled by global dashboard header pattern if needed, but Analytics has a specialized sub-header */}
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-[13px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-colors bg-white/60 hover:bg-white/80 px-[18px] py-2 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50">
            <ChevronLeft className="w-4 h-4" />
            Back to Classes
          </button>
        </div>

        {/* Header Card */}
        <header
          style={{
            backgroundColor: classColor?.hex || '#6366f1'
          }}
          className="rounded-[24px] p-4 sm:p-[24px] lg:p-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden group text-white"
        >
          {/* Decorative Circles */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 group-hover:scale-[1.3] transition-transform duration-700 ease-out pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-32 h-32 rounded-full bg-white/10 group-hover:scale-[1.2] transition-transform duration-700 delay-75 ease-out pointer-events-none" />

          {/* Left Side Info */}
          <div className="shrink-0 relative z-10">
            <h1 className="text-xl sm:text-[28px] font-bold mb-2 sm:mb-3 tracking-tight">{selectedClass.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {classBadges.map((badge, idx) => (
                <span key={badge} className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[12px] font-semibold rounded-full shadow-sm border border-white/20">{badge}</span>
              ))}
            </div>
            <p className="text-[13px] text-white/80 font-medium">Manager: {selectedClass.classMetadata?.managerName || selectedClass.managerName || 'Not assigned'}</p>
          </div>

        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-[18px] w-full">
          <div className="group relative overflow-hidden bg-[#0ea5e9] shadow-[0_4px_16px_rgba(14,165,233,0.13)] rounded-lg sm:rounded-2xl p-[12px] sm:p-[15px] text-white flex flex-col gap-[8px] sm:gap-[10px]">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-500 ease-out" />
            <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-500 delay-75 ease-out" />
            <div className="relative z-10 flex justify-between items-start">
              <span className="text-[10px] sm:text-[11px] opacity-90 uppercase tracking-wider font-semibold">Class Average</span>
              <div className="bg-white/20 p-1.5 rounded-lg flex"><Target size={14} /></div>
            </div>
            <div className="relative z-10 text-[22px] sm:text-[26px] font-semibold tracking-tight">{Math.round(classAverage)}%</div>
          </div>

          <div className="group relative overflow-hidden bg-[#10b981] shadow-[0_4px_16px_rgba(16,185,129,0.13)] rounded-lg sm:rounded-2xl p-[12px] sm:p-[15px] text-white flex flex-col gap-[8px] sm:gap-[10px]">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-500 ease-out" />
            <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-500 delay-75 ease-out" />
            <div className="relative z-10 flex justify-between items-start">
              <span className="text-[10px] sm:text-[11px] opacity-90 uppercase tracking-wider font-semibold">Completion</span>
              <div className="bg-white/20 p-1.5 rounded-lg flex"><CheckCircle size={14} /></div>
            </div>
            <div className="relative z-10 text-[22px] sm:text-[26px] font-semibold tracking-tight">{Math.round(completionRate)}%</div>
          </div>

          <div className="group relative overflow-hidden bg-[#a855f7] shadow-[0_4px_16px_rgba(168,85,247,0.13)] rounded-lg sm:rounded-2xl p-[12px] sm:p-[15px] text-white flex flex-col gap-[8px] sm:gap-[10px]">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-500 ease-out" />
            <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-500 delay-75 ease-out" />
            <div className="relative z-10 flex justify-between items-start">
              <span className="text-[10px] sm:text-[11px] opacity-90 uppercase tracking-wider font-semibold">Participation</span>
              <div className="bg-white/20 p-1.5 rounded-lg flex"><Users size={14} /></div>
            </div>
            <div className="relative z-10 text-[22px] sm:text-[26px] font-semibold tracking-tight">{Math.round(participationRate)}%</div>
          </div>

          <div className="group relative overflow-hidden bg-[#f97316] shadow-[0_4px_16px_rgba(249,115,22,0.13)] rounded-lg sm:rounded-2xl p-[12px] sm:p-[15px] text-white flex flex-col gap-[8px] sm:gap-[10px]">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-500 ease-out" />
            <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-500 delay-75 ease-out" />
            <div className="relative z-10 flex justify-between items-start">
              <span className="text-[10px] sm:text-[11px] opacity-90 uppercase tracking-wider font-semibold">Attention</span>
              <div className="bg-white/20 p-1.5 rounded-lg flex"><AlertTriangle size={14} /></div>
            </div>
            <div className="relative z-10 text-[22px] sm:text-[26px] font-semibold tracking-tight">
              {attentionStudents.length} <span className="text-[12px] opacity-90 font-medium">students</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-[24px] h-auto xl:h-[600px]">
          {/* Left Column - Student List */}
          <div className="xl:col-span-1 bg-white/80 backdrop-blur-[12px] rounded-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white flex flex-col overflow-hidden h-[500px] xl:h-full">
            <div className="p-5 border-b border-[#f1f5f9] shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-[#1e293b]">Students <span className="text-[#64748b] text-[13px]">({visibleStudents.length})</span></h2>
                <button
                  onClick={() => onAddStudents?.()}
                  className="text-[11px] font-semibold text-[#9956DE] hover:text-[#7c3aed] bg-[#9956DE]/10 hover:bg-[#9956DE]/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="flex items-center bg-white px-4 py-2 rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#f1f5f9] group">
                <Search className="w-4 h-4 text-[#64748b] shrink-0 group-focus-within:text-[#4f46e5] transition-colors" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none focus:outline-none ml-2 text-[13px] w-full text-[#475569] placeholder:text-[#64748b]"
                />
              </div>
              <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setFilterType('All')}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-[14px] whitespace-nowrap transition-all hover:scale-[1.02] ${filterType === 'All' ? 'bg-[#4f46e5] text-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]' : 'bg-[#f8fafc] text-[#64748b] hover:bg-[#f1f5f9]'}`}
                >All Students</button>
                <button
                  onClick={() => setFilterType('Good')}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-[14px] whitespace-nowrap transition-all hover:scale-[1.02] ${filterType === 'Good' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-[0_1px_4px_rgba(0,0,0,0.04)]' : 'bg-emerald-50/40 text-emerald-600 border border-emerald-50 hover:bg-emerald-50'}`}
                >Top Performers</button>
                <button
                  onClick={() => setFilterType('Risk')}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-[14px] whitespace-nowrap transition-all hover:scale-[1.02] ${filterType === 'Risk' ? 'bg-rose-50 text-rose-600 border border-rose-100/50 shadow-[0_1px_4px_rgba(0,0,0,0.04)]' : 'bg-rose-50/40 text-rose-600 border border-rose-50 hover:bg-rose-50'}`}
                >Needs Attention</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col no-scrollbar">
              <Virtuoso
                style={{ height: '100%' }}
                data={visibleStudents}
                className="no-scrollbar"
                itemContent={(_, student) => {
                  const backendScore = getStudentScore(student.id);
                  const enrichedStudent = backendScore !== null ? { ...student, avgScore: backendScore } : student;
                  return (
                    <div className="py-[6px] px-[8px]">
                      <StudentCard student={enrichedStudent} onViewStudent={onViewStudent} onCreateAccount={onCreateAccount} onRemoveStudent={onRemoveStudent} />
                    </div>
                  );
                }}
                computeItemKey={(index, student) => buildStudentViewKey(student)}
              />
            </div>
          </div>

          {/* Right Column - Charts & Lists */}
          <div className="xl:col-span-2 flex flex-col gap-[24px] h-full overflow-y-auto no-scrollbar pb-10 xl:pb-0">
            {/* Top Row Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
              {/* Visual Chart 1: Risk Distribution */}
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white flex flex-col group h-[280px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-[15px] text-[#1e293b]">Risk Distribution</h3>
                  <MoreHorizontal className="w-4 h-4 text-[#64748b] cursor-pointer group-hover:scale-110 transition-transform" />
                </div>
                <div className="relative w-full flex-1 min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskDistribution}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={80}>
                        {riskDistribution.map((entry, index) => {
                          const mapping: Record<string, string> = { 'Critical': '#dc2626', 'High Risk': '#f43f5e', 'Medium Risk': '#f59e0b', 'Low Risk': '#10b981', 'Unassessed': '#94a3b8' };
                          return <Cell key={`cell-${index}`} fill={mapping[entry.name] || entry.color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Visual Chart 2: Topic Performance */}
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white flex flex-col group h-[280px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-[15px] text-[#1e293b]">Topic Performance</h3>
                  <MoreHorizontal className="w-4 h-4 text-[#64748b] cursor-pointer group-hover:scale-110 transition-transform" />
                </div>
                <div className="relative w-full flex-1 min-h-[180px] -ml-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={effectiveTopicPerformance} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} tickFormatter={(val) => `${val}%`} />
                      <YAxis dataKey="topic" type="category" axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 600 }} dx={-10} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={28}>
                        {effectiveTopicPerformance.map((entry, index) => {
                          const color = entry.score >= 75 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#f43f5e';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Row Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
              {/* Top Performers List */}
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[15px] text-[#1e293b] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Top Performers
                  </h3>
                </div>
                <div className="space-y-[8px]">
                  {topPerformers.map((student) => (
                    <div key={`top-${student.id}`} onClick={() => onViewStudent(student)} className="flex justify-between items-center p-3 bg-emerald-50/40 rounded-[14px] border border-emerald-50 group hover:scale-[1.02] transition-transform cursor-pointer">
                      <span className="text-[13px] font-semibold text-[#1e293b]">{student.name}</span>
                      <span className="text-[13px] font-semibold text-emerald-600">{getStudentScore(student.id) ?? student.avgScore}%</span>
                    </div>
                  ))}
                  {topPerformers.length === 0 && <p className="text-xs text-muted-foreground">No students available yet.</p>}
                </div>
              </div>

              {/* Needs Attention List */}
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[15px] text-[#1e293b] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Needs Attention
                  </h3>
                </div>
                <div className="space-y-[8px]">
                  {attentionStudents.slice(0, 4).map((student) => {
                    const backendRisk = getStudentRisk(student.id);
                    const riskLabel = backendRisk || (student.riskLevel === 'high' ? 'HIGH RISK' : 'MEDIUM RISK');
                    const isCritical = backendRisk === 'Critical' || (student.avgScore === 0 && student.riskLevel === 'high');
                    const isHigh = backendRisk === 'High Risk' || student.riskLevel === 'high';
                    const theme = isCritical ? 'bg-red-50/60 border-red-100' : isHigh ? 'bg-rose-50/40 border-rose-50' : 'bg-amber-50/40 border-amber-50';
                    const labelColor = isCritical ? 'text-red-700' : isHigh ? 'text-rose-600' : 'text-amber-600';
                    return (
                      <div key={`attn-${student.id}`} onClick={() => onViewStudent(student)} className={`flex justify-between items-center p-3 rounded-[14px] border group hover:scale-[1.02] transition-transform cursor-pointer ${theme}`}>
                        <span className="text-[13px] font-semibold text-[#1e293b]">{student.name}</span>
                        <span className={`text-[11px] font-semibold bg-white px-2 py-0.5 rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#f1f5f9] ${labelColor}`}>
                          {riskLabel.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                  {attentionStudents.length === 0 && <p className="text-xs text-muted-foreground">No urgent students.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Class Insights Panel */}
        {backendReport?.insights && (
          <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/60 backdrop-blur-[12px] rounded-[18px] p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-indigo-100/50">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowInsights(!showInsights)}
                className="flex items-center gap-2 text-[15px] font-semibold text-[#1e293b]"
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                AI Class Insights
                <ChevronDown className={`w-4 h-4 text-[#64748b] transition-transform ${showInsights ? '' : '-rotate-90'}`} />
              </button>
              <button
                onClick={handleRefreshInsights}
                disabled={insightsRefreshing}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white/70 hover:bg-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${insightsRefreshing ? 'animate-spin' : ''}`} />
                {insightsRefreshing ? 'Refreshing...' : 'Refresh AI Analysis'}
              </button>
            </div>
            {showInsights && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/70 rounded-[14px] p-4 border border-white">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={18} className="text-indigo-600" />
                    <h4 className="text-[13px] font-semibold text-[#1e293b]">Class Overview</h4>
                  </div>
                  <p className="text-[12px] text-[#475569] leading-relaxed">{backendReport.insights.class_summary}</p>
                </div>
                <div className="bg-white/70 rounded-[14px] p-4 border border-white">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={18} className="text-emerald-600" />
                    <h4 className="text-[13px] font-semibold text-[#1e293b]">What's Working</h4>
                  </div>
                  <p className="text-[12px] text-[#475569] leading-relaxed">{backendReport.insights.class_strengths}</p>
                </div>
                <div className="bg-white/70 rounded-[14px] p-4 border border-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={18} className="text-amber-600" />
                    <h4 className="text-[13px] font-semibold text-[#1e293b]">Recommended Actions</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {backendReport.insights.recommended_actions.map((action, i) => (
                      <li key={i} className="text-[12px] text-[#475569] leading-relaxed flex items-start gap-1.5">
                        <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

      <SectionManagementPanel
        students={students}
        allClasses={allClasses}
        currentClass={selectedClass}
        onReassignSection={onReassignSection}
        reassignBusyId={reassignBusyId}
      />
    </motion.div>
  );
};

// Intervention View
const InterventionView: React.FC<{
  student: StudentView;
  teacherId: string;
  teacherName: string;
  onStudentUpdated: (student: StudentView) => void;
  onBack: () => void;
  onNavigateToQuizMaker?: (tab?: 'create' | 'bank') => void;
  initialCache?: { lessonPlan: LessonPlanResponse | null; learningPath: string; gradeDraft: string; sectionDraft: string };
  onCacheUpdate?: (studentId: string, cache: { lessonPlan: LessonPlanResponse | null; learningPath: string; gradeDraft: string; sectionDraft: string }) => void;
}> = ({ student, teacherId, teacherName, onStudentUpdated, onBack, onNavigateToQuizMaker, initialCache, onCacheUpdate }) => {
  const normalizedRiskLevel = (student.riskLevel || 'low').toLowerCase() as 'high' | 'medium' | 'low';
  const isUrgentBarrier = normalizedRiskLevel === 'high' || normalizedRiskLevel === 'medium';
  const analysisTone = isUrgentBarrier
    ? {
      card: 'bg-[#FF8B8B]/14 border-[#FF8B8B]/35',
      icon: 'bg-red-600',
      bullet: 'text-[#FF8B8B]',
    }
    : {
      card: 'bg-[#9956DE]/12 border-[#9956DE]/30',
      icon: 'bg-[#9956DE]',
      bullet: 'text-[#9956DE]',
    };
  const rolloutFlags = useMemo(() => apiService.getImportGroundedRolloutFlags(), []);
  const [interventionPlan, setInterventionPlan] = useState<InterventionPlan | null>(null);
  const [interventionLoading, setInterventionLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<import('../services/interventionService').LearningStep | null>(null);
  const [learningPath, setLearningPath] = useState<string>(initialCache?.learningPath || '');
  const [pathLoading, setPathLoading] = useState(true);
  const [gradeDraft, setGradeDraft] = useState(initialCache?.gradeDraft || student.grade || 'Grade 11');
  const [sectionDraft, setSectionDraft] = useState(initialCache?.sectionDraft || student.section || 'Section A');
  const [savingSection, setSavingSection] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlanResponse | null>(initialCache?.lessonPlan ?? null);
  const [lessonCurriculumSources, setLessonCurriculumSources] = useState<CurriculumSource[]>([]);
  const [analysisCurriculumContext, setAnalysisCurriculumContext] = useState('');
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState('');
  const [lessonSourceFilter, setLessonSourceFilter] = useState<string>('all');
  const [lessonMaterialFilter, setLessonMaterialFilter] = useState<string>('all');
  const [allowReviewSources, setAllowReviewSources] = useState(false);
  const [allowUnverifiedLesson, setAllowUnverifiedLesson] = useState(false);
  const [savedLessonPlanId, setSavedLessonPlanId] = useState<string | null>(null);
  const [savingLessonDraft, setSavingLessonDraft] = useState(false);
  const [publishingLesson, setPublishingLesson] = useState(false);
  const [lessonTrigger, setLessonTrigger] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalStep, setExportModalStep] = useState<'choose' | 'bank'>('choose');
  const [bankQuizzes, setBankQuizzes] = useState<GeneratedQuiz[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  // Drawer state
  const [showQuizDrawer, setShowQuizDrawer] = useState(false);
  const [drawerDirty, setDrawerDirty] = useState(false);  // true once quiz generation starts
  const [showDrawerCloseConfirm, setShowDrawerCloseConfirm] = useState(false);

  useEffect(() => {
    setGradeDraft(student.grade || 'Grade 11');
    setSectionDraft(student.section || 'Section A');
  }, [student.grade, student.section]);

  // Fetch intervention plan from backend
  useEffect(() => {
    let cancelled = false;
    setInterventionLoading(true);
    getInterventionPlan(student.id)
      .then((plan) => { if (!cancelled) setInterventionPlan(plan); })
      .catch((err) => console.warn('[InterventionView] Backend fetch failed:', err))
      .finally(() => { if (!cancelled) setInterventionLoading(false); });
    return () => { cancelled = true; };
  }, [student.id]);

  // Escape key closes drawer (with confirm if dirty), Escape also closes export modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDrawerCloseConfirm) { setShowDrawerCloseConfirm(false); return; }
      if (showQuizDrawer) {
        if (drawerDirty) { setShowDrawerCloseConfirm(true); } else { setShowQuizDrawer(false); }
        return;
      }
      if (showExportModal) { setShowExportModal(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showQuizDrawer, showExportModal, drawerDirty, showDrawerCloseConfirm]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (showQuizDrawer) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showQuizDrawer]);

  useEffect(() => {
    onCacheUpdate?.(student.id, { lessonPlan, learningPath, gradeDraft, sectionDraft });
  }, [lessonPlan, learningPath, gradeDraft, sectionDraft, student.id, onCacheUpdate]);

  useEffect(() => {
    const fetchPath = async () => {
      setPathLoading(true);
      try {
        let curriculumContext = '';
        try {
          curriculumContext = await fetchAnalysisCurriculumContext(
            student.struggles.length > 0 ? student.struggles : [student.weakestTopic],
            'general_math',
          );
          setAnalysisCurriculumContext(curriculumContext);
        } catch {
          setAnalysisCurriculumContext('');
        }

        const response = await apiService.getLearningPath({
          weaknesses: student.struggles.length > 0 ? student.struggles : [student.weakestTopic],
          gradeLevel: 'High School',
          subject: 'general_math',
        });
        const enrichedLearningPath = curriculumContext
          ? `${response.learningPath}\n\n${curriculumContext}`
          : response.learningPath;
        setLearningPath(enrichedLearningPath);
      } catch {
        setLearningPath('Unable to generate learning path. Please try again later.');
        setAnalysisCurriculumContext('');
      } finally {
        setPathLoading(false);
      }
    };
    fetchPath();
  }, [student]);

  const generateTargetedLessonPlan = useCallback(async () => {
    setLessonLoading(true);
    setLessonError('');
    try {
      const classSectionId = student.classSectionId || buildClassSectionId(gradeDraft || 'Grade 11', sectionDraft || 'Section A');
      const selectedCompetency = student.struggles.length > 0 ? student.struggles[0] : student.weakestTopic;
      const response = await generateLessonPlanWithCurriculumGrounding({
        gradeLevel: gradeDraft || student.grade || 'Grade 11',
        subject: 'general_math',
        quarter: 1,
        moduleUnit: [gradeDraft, sectionDraft].filter(Boolean).join(' - ') || student.className,
        lessonTitle: `Grounded Lesson: ${selectedCompetency}`,
        learningCompetency: selectedCompetency,
        learnerLevel: student.avgScore < 60 ? 'support' : student.avgScore < 80 ? 'developing' : 'advanced',
        classSectionId,
        className: [gradeDraft, sectionDraft].filter(Boolean).join(' - ') || student.className,
        focusTopics: student.struggles.length > 0 ? student.struggles : [student.weakestTopic],
        topicCount: 5,
        preferImportedTopics: rolloutFlags.lessonEnabled,
        allowReviewSources,
        allowUnverifiedLesson,
      }, true);
      setLessonPlan(response);
      setLessonCurriculumSources(response.curriculumSources || []);
      setSavedLessonPlanId(null);
      void apiService.reportImportGroundedFeedback({
        flow: 'lesson',
        status: 'success',
        classSectionId,
        className: [gradeDraft, sectionDraft].filter(Boolean).join(' - ') || student.className,
        metadata: {
          usedImportedTopics: response.usedImportedTopics,
          importedTopicCount: response.importedTopicCount,
          blockCount: response.blocks.length,
          publishReady: response.publishReady,
          sourceLegitimacyStatus: response.sourceLegitimacy.status,
          selfValidationPassed: response.selfValidation.passed,
          importGroundingEnabled: rolloutFlags.lessonEnabled,
        },
      });
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Unable to generate lesson plan at this time.';
      if (err instanceof ApiError && err.status === 422) {
        try {
          const parsed = JSON.parse(err.responseBody) as {
            detail?: {
              message?: string;
              sourceLegitimacy?: { status?: string; issues?: string[] };
              selfValidation?: { issues?: string[] };
            };
          };
          const detail = parsed?.detail;
          if (detail?.message) {
            errorMessage = detail.message;
          }
          const sourceIssues = detail?.sourceLegitimacy?.issues || [];
          const validationIssues = detail?.selfValidation?.issues || [];
          const issuePreview = [...sourceIssues, ...validationIssues].filter(Boolean).slice(0, 3);
          if (issuePreview.length > 0) {
            errorMessage = `${errorMessage} ${issuePreview.join(' ')}`;
          }
        } catch {
          // Keep original ApiError message when body is not JSON.
        }
      }
      setLessonError(errorMessage);
      setLessonPlan(null);
      setLessonCurriculumSources([]);
      void apiService.reportImportGroundedFeedback({
        flow: 'lesson',
        status: 'failed',
        classSectionId: student.classSectionId || buildClassSectionId(gradeDraft || 'Grade 11', sectionDraft || 'Section A'),
        className: [gradeDraft, sectionDraft].filter(Boolean).join(' - ') || student.className,
        metadata: {
          error: errorMessage,
          allowReviewSources,
          allowUnverifiedLesson,
          importGroundingEnabled: rolloutFlags.lessonEnabled,
        },
      });
    } finally {
      setLessonLoading(false);
    }
  }, [student, gradeDraft, sectionDraft, rolloutFlags.lessonEnabled, allowReviewSources, allowUnverifiedLesson]);

  const saveLessonDraft = useCallback(async (): Promise<string | null> => {
    if (!lessonPlan) {
      toast.error('Generate a lesson plan first.');
      return null;
    }

    setSavingLessonDraft(true);
    try {
      const lessonId = await saveGeneratedLessonPlan(lessonPlan, teacherId, {
        teacherName,
        studentId: student.id,
        studentName: student.name,
      });
      setSavedLessonPlanId(lessonId);
      toast.success('Lesson plan saved as draft.');
      return lessonId;
    } catch (error) {
      console.error('Failed to save lesson draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save lesson draft.');
      return null;
    } finally {
      setSavingLessonDraft(false);
    }
  }, [lessonPlan, teacherId, teacherName, student.id, student.name]);

  const publishCurrentLessonPlan = useCallback(async () => {
    if (!lessonPlan) {
      toast.error('Generate a lesson plan first.');
      return;
    }

    if (!lessonPlan.publishReady) {
      const issues = [...lessonPlan.sourceLegitimacy.issues, ...lessonPlan.selfValidation.issues]
        .filter(Boolean)
        .slice(0, 2)
        .join(' ');
      toast.error(issues || 'Lesson is not publish-ready. Resolve legitimacy and validation checks first.');
      return;
    }

    setPublishingLesson(true);
    try {
      let lessonId = savedLessonPlanId;
      if (!lessonId) {
        lessonId = await saveLessonDraft();
      }
      if (!lessonId) {
        return;
      }

      await publishLessonPlan(lessonId);
      toast.success('Lesson plan published to class content.');
      void apiService.reportImportGroundedFeedback({
        flow: 'lesson',
        status: 'success',
        classSectionId: lessonPlan.classSectionId || student.classSectionId,
        className: lessonPlan.className || student.className,
        metadata: {
          action: 'publish_lesson_plan',
          lessonPlanId: lessonId,
          publishReady: lessonPlan.publishReady,
          sourceLegitimacyStatus: lessonPlan.sourceLegitimacy.status,
          selfValidationPassed: lessonPlan.selfValidation.passed,
        },
      });
    } catch (error) {
      console.error('Failed to publish lesson plan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish lesson plan.');
      void apiService.reportImportGroundedFeedback({
        flow: 'lesson',
        status: 'failed',
        classSectionId: lessonPlan.classSectionId || student.classSectionId,
        className: lessonPlan.className || student.className,
        metadata: {
          action: 'publish_lesson_plan',
          error: error instanceof Error ? error.message : 'Failed to publish lesson plan.',
        },
      });
    } finally {
      setPublishingLesson(false);
    }
  }, [lessonPlan, savedLessonPlanId, saveLessonDraft, student.className, student.classSectionId]);

  useEffect(() => {
    void generateTargetedLessonPlan();
  }, [lessonTrigger]);

  useEffect(() => {
    setLessonTrigger(n => n + 1);
  }, [student.id]);

  useEffect(() => {
    setLessonSourceFilter('all');
    setLessonMaterialFilter('all');
  }, [lessonPlan]);

  const lessonProvenanceSources = useMemo(() => {
    if (!lessonPlan) return [];
    return Array.from(
      new Set(
        lessonPlan.blocks
          .map((block) => block.provenance?.sourceFile?.trim())
          .filter((source): source is string => Boolean(source))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [lessonPlan]);

  const lessonProvenanceMaterials = useMemo(() => {
    if (!lessonPlan) return [];
    return Array.from(
      new Set(
        lessonPlan.blocks
          .map((block) => block.provenance?.materialId?.trim())
          .filter((material): material is string => Boolean(material))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [lessonPlan]);

  const filteredLessonBlocks = useMemo(() => {
    if (!lessonPlan) return [];
    return lessonPlan.blocks.filter((block) => {
      const matchesSource =
        lessonSourceFilter === 'all' ||
        (block.provenance?.sourceFile || '').trim() === lessonSourceFilter;
      const matchesMaterial =
        lessonMaterialFilter === 'all' ||
        (block.provenance?.materialId || '').trim() === lessonMaterialFilter;
      return matchesSource && matchesMaterial;
    });
  }, [lessonPlan, lessonSourceFilter, lessonMaterialFilter]);

  const remedialSteps = useMemo(() => {
    if (interventionPlan?.learning_path?.steps?.length) {
      return interventionPlan.learning_path.steps.map((s) => ({
        id: s.step_number,
        type: s.type === 'video_lesson' ? 'video' : s.type === 'assessment' ? 'assessment' : 'quiz',
        title: s.title,
        duration: `${s.duration_minutes} mins`,
        questions: s.num_items || undefined,
        icon: s.type === 'video_lesson' ? Video : s.type === 'assessment' ? CheckCircle2 : s.type === 'review' ? RefreshCw : ClipboardCheck,
        competency: s.competency_tag,
        difficulty: s.difficulty,
        is_completed: s.is_completed,
      }));
    }
    return [
      { id: 1, type: 'video', title: `${student.weakestTopic} Fundamentals`, duration: '8 mins', questions: undefined, icon: Video, competency: '', difficulty: 'easy' as const, is_completed: false },
      { id: 2, type: 'quiz', title: `${student.weakestTopic} Practice`, duration: '12 mins', questions: 10, icon: ClipboardCheck, competency: '', difficulty: 'easy' as const, is_completed: false },
      { id: 3, type: 'assessment', title: 'Final Check', duration: '10 mins', questions: 5, icon: CheckCircle2, competency: '', difficulty: 'medium' as const, is_completed: false },
    ];
  }, [interventionPlan, student.weakestTopic]);

  const handleSaveSectionAssignment = async () => {
    if (!teacherId) {
      toast.error('Unable to update section: teacher context missing');
      return;
    }

    setSavingSection(true);
    try {
      await assignStudentToClassSection(
        student.id,
        gradeDraft,
        sectionDraft,
        teacherId,
        new Date().getFullYear().toString(),
        teacherName
      );
      await updateManagedStudentSectionAssignment(student.id, gradeDraft, sectionDraft);

      const updatedStudent: StudentView = {
        ...student,
        grade: gradeDraft,
        section: sectionDraft,
        className: [gradeDraft, sectionDraft].filter(Boolean).join(' - '),
        classSectionId: buildClassSectionId(gradeDraft, sectionDraft),
      };

      onStudentUpdated(updatedStudent);
      toast.success('Student section assignment updated');
    } catch (error) {
      console.error('Failed to update student section assignment:', error);
      toast.error('Failed to update section assignment');
    } finally {
      setSavingSection(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex overflow-hidden relative"
    >
      {/* Center Scrollable Content: Insights & Tools */}
      <div className="flex-1 overflow-y-auto p-[24px] xl:p-[32px] no-scrollbar">
        <div className="max-w-[1000px] mx-auto space-y-[24px]">

          {/* Top Navigation & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-[8px]">
            <div>
              <button onClick={onBack} className="flex items-center gap-2 text-[13px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-colors bg-white/60 hover:bg-white/80 px-[18px] py-2 rounded-full backdrop-blur-[12px] mb-[16px] w-max shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50">
                <ArrowLeft className="w-4 h-4" />
                Back to Analytics
              </button>
            </div>
          </div>

          {/* AI Analysis Banner — light mint green */}
          <div className="bg-gradient-to-br from-[#ecfdf5] via-[#f0fdf4] to-[#f7fdf9] backdrop-blur-[12px] rounded-[20px] p-[24px] border border-emerald-100 shadow-[0_4px_16px_rgba(16,185,129,0.08)] relative overflow-hidden">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.06] pointer-events-none">
              <Bot className="w-48 h-48 text-emerald-600" />
            </div>

            {/* Header row */}
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#059669] to-[#10b981] flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(5,150,105,0.3)]">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-[#1e293b]">AI Analysis</h3>
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Insights Active
                </span>
              </div>
            </div>

            {analysisCurriculumContext && (
              <CurriculumSourceBadge
                sources={lessonCurriculumSources}
                className="mb-4 relative z-10"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full relative z-10">
                {/* Learning Strengths */}
                <div className="bg-white/70 backdrop-blur-sm rounded-[14px] p-4 border border-emerald-100/60 shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden">
                  <div className="absolute left-0 top-0 w-1 h-full bg-emerald-400 rounded-l-[14px]" />
                  <h4 className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pl-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Learning Strengths
                  </h4>
                  <p className="text-[13px] text-[#475569] leading-relaxed pl-2">
                    {interventionPlan?.learning_strengths || (
                      !isUrgentBarrier
                        ? <>Excels in <span className="font-semibold text-[#1e293b]">{student.weakestTopic}</span>. Demonstrates high engagement during interactive tests.</>
                        : <>Demonstrates engagement but faces challenges. Needs support with foundational topics.</>
                    )}
                  </p>
                </div>

                {/* Next Steps */}
                <div className="bg-white/70 backdrop-blur-sm rounded-[14px] p-4 border border-rose-100/60 shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden">
                  <div className="absolute left-0 top-0 w-1 h-full bg-rose-400 rounded-l-[14px]" />
                  <h4 className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pl-2">
                    <Target className="w-3.5 h-3.5" /> Next Steps
                  </h4>
                  <ul className="text-[13px] text-[#475569] leading-relaxed list-none p-0 m-0 space-y-1 pl-2">
                    {interventionPlan?.next_steps_summary ? (
                      <li>{interventionPlan.next_steps_summary}</li>
                    ) : student.struggles.length > 0 ? (
                      student.struggles.map((s, i) => (
                        <li key={i}>Must continue strengthening <span className="font-semibold text-[#1e293b]">{s}</span>.</li>
                      ))
                    ) : (
                      <li>Focus on repetitive practice modules for <span className="font-semibold text-[#1e293b]">{student.weakestTopic}</span>.</li>
                    )}
                  </ul>
                </div>
              </div>
          </div>

          {/* Learning Path Timeline */}
          <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] p-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
            <div className="flex items-center justify-between mb-6 border-b border-[#f1f5f9] pb-4">
              <h3 className="text-[15px] font-semibold text-[#1e293b]">Generated Learning Path</h3>
              <button disabled={pathLoading || interventionLoading} onClick={async () => {
                setInterventionLoading(true);
                try {
                  const plan = await generateInterventionPlan(student.id);
                  setInterventionPlan(plan);
                } catch (err) {
                  console.warn('[InterventionView] Regenerate failed:', err);
                } finally {
                  setInterventionLoading(false);
                }
                setLessonTrigger(n => n + 1);
              }} className="bg-[#f8fafc] hover:bg-white text-[#4f46e5] border border-[#e0e7ff] text-[11px] font-semibold rounded-full px-4 py-1.5 transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex items-center gap-1.5 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${interventionLoading ? 'animate-spin' : ''}`} /> {interventionLoading ? 'Analyzing...' : 'Regenerate'}
              </button>
            </div>

            <BoneSkeleton
              name="teacher-intervention-learning-path"
              loading={false}
              fixture={null}
              fallback={null}
            >
              {/* Raw markdown text removed as requested, using only visual steps below */}
              <div className="mb-8 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mr-2">Methodology:</span>
                {(interventionPlan?.learning_path?.methodology_tags || ['Interactive', 'Video', 'Practice', 'Quiz']).map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-[#f8fafc] text-[#475569] text-[11px] font-semibold rounded-full border border-[#e2e8f0]">{tag}</span>
                ))}
              </div>

              <div className="relative border-l-2 border-[#e2e8f0] ml-[20px] space-y-[28px] pb-4">
                {remedialSteps.map((step, index) => {
                  let stepIcon = <Video className="w-4 h-4" />;
                  let bgClass = "bg-[#8b5cf6] shadow-[0_4px_10px_rgba(139,92,246,0.3)]";
                  let tagClass = "text-purple-600";
                  let cardHover = "group-hover:border-purple-200";
                  let actionBg = "hover:bg-[#4f46e5]";
                  let actionIcon = <Play className="w-4 h-4 ml-0.5" />;

                  if (step.type === 'quiz') {
                    stepIcon = <PenTool className="w-4 h-4" />;
                    bgClass = "bg-sky-500 shadow-[0_4px_10px_rgba(14,165,233,0.3)]";
                    tagClass = "text-sky-600";
                    cardHover = "group-hover:border-sky-200";
                    actionBg = "hover:bg-sky-500";
                    actionIcon = <ChevronRight className="w-4 h-4" />;
                  } else if (step.type === 'assessment') {
                    stepIcon = <CheckCircle2 className="w-4 h-4" />;
                    bgClass = "bg-emerald-500 shadow-[0_4px_10px_rgba(16,185,129,0.3)]";
                    tagClass = "text-emerald-600";
                    cardHover = "group-hover:bg-emerald-50";
                  }

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative pl-[32px] group"
                    >
                      {/* Step Number Circle */}
                      <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full ${bgClass} text-white flex items-center justify-center ring-4 ring-white group-hover:scale-110 transition-transform`}>
                        {stepIcon}
                      </div>

                      {/* Step Content */}
                      <div onClick={() => {
                        if (interventionPlan?.learning_path?.steps?.[index]) {
                          setSelectedStep(interventionPlan.learning_path.steps[index]);
                        }
                      }} className={`${step.type === 'assessment' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-[#f1f5f9]'} rounded-[14px] p-[18px] border shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex justify-between items-center transition-colors cursor-pointer ${cardHover}`}>
                        <div>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider mb-1 block ${tagClass}`}>
                            Step {index + 1} • {step.type === 'video' ? 'Video Lesson' : step.type === 'quiz' ? 'Practice' : 'Assessment'}
                          </span>
                          <p className="font-semibold text-[#1e293b] text-[13px] mb-0.5">{step.title}</p>
                          <p className="text-[#64748b] text-[11px] flex items-center gap-1.5">
                            {step.type === 'video' && <><Clock className="w-3 h-3" /> {step.duration}</>}
                            {step.type === 'quiz' && <><ListChecks className="w-3 h-3" /> {step.questions ? `${step.questions} questions` : step.duration}</>}
                            {step.type === 'assessment' && <><Target className="w-3 h-3" /> {step.questions ? `${step.questions} assessment questions` : step.duration}</>}
                            {step.competency && <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-mono rounded">{step.competency}</span>}
                          </p>
                        </div>
                        {step.type === 'assessment' ? (
                          <Award className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <button className={`w-8 h-8 rounded-full bg-[#f8fafc] flex items-center justify-center text-[#64748b] ${actionBg} hover:text-white transition-colors border border-[#e2e8f0]`}>
                            {actionIcon}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </BoneSkeleton>
          </div>

          {/* Targeted Lesson Generator Settings */}
          <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] p-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-semibold text-[#1e293b]">Targeted Lesson Generation</h3>
              <Button
                onClick={() => setLessonTrigger(n => n + 1)}
                disabled={lessonLoading}
                className="bg-[#4f46e5] hover:bg-[#3730a3] text-white h-8 text-[11px] rounded-full px-4"
              >
                {lessonLoading ? 'Loading...' : 'Regenerate'}
              </Button>
            </div>
            <p className="text-[13px] text-[#64748b] mb-6">Configure inputs and requirements for AI lesson generation.</p>

            <div className="bg-[#f8fafc]/80 rounded-[14px] p-[20px] border border-[#f1f5f9] mb-6">
              <div className="flex items-start gap-3 mb-4">
                <Info className="w-4 h-4 text-[#4f46e5] shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#475569] leading-relaxed">
                  Class records alone are not enough for import-grounded lesson plans. Ensure course materials are uploaded via <span className="text-[#4f46e5] font-semibold">Data Import</span>.
                </p>
              </div>

              <div className="space-y-4 border-t border-[#e2e8f0] pt-5 mt-5">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[13px] font-medium text-[#1e293b] group-hover:text-[#4f46e5] transition-colors">Allow sources requiring manual review</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer" checked={allowReviewSources} onChange={(e) => setAllowReviewSources(e.target.checked)} />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[13px] font-medium text-[#1e293b] group-hover:text-[#4f46e5] transition-colors">Allow unverified lesson draft</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer" checked={allowUnverifiedLesson} onChange={(e) => setAllowUnverifiedLesson(e.target.checked)} />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                  </div>
                </label>
              </div>
            </div>

            <BoneSkeleton
              name="teacher-intervention-lesson-plan"
              loading={false}
              fixture={null}
              fallback={null}
            >
              {lessonError && (
                <div className="bg-[#FF8B8B]/14 border border-[#FF8B8B]/35 rounded-xl p-3 text-sm text-[#D66A6A] mb-4">
                  {lessonError}
                </div>
              )}

              {lessonPlan && (
                <div className="space-y-4">
                  <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-[14px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                    <div className="mb-3">
                      <CurriculumSourceBadge sources={lessonCurriculumSources} />
                    </div>
                    <p className="text-[14px] font-semibold text-[#1e293b]">{lessonPlan.lessonTitle}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                      <p className="text-[11px] text-[#64748b]">
                        <span className="font-semibold text-[#475569]">Imported topics:</span> {lessonPlan.usedImportedTopics ? 'Yes' : 'No'} ({lessonPlan.importedTopicCount})
                      </p>
                      <p className="text-[11px] text-[#64748b]">
                        <span className="font-semibold text-[#475569]">Subject:</span> {lessonPlan.subject || 'General Math'} (Q{lessonPlan.quarter || 1})
                      </p>
                    </div>
                    {lessonPlan.curriculumCompetency && (
                      <p className="text-[11px] text-[#4f46e5] font-semibold mt-2 bg-indigo-50/50 px-2 py-1 rounded inline-block">
                        Competency: {lessonPlan.curriculumCompetency}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-[#64748b]">
                        Publish readiness: <span className={`font-semibold ${lessonPlan.publishReady ? 'text-emerald-600' : 'text-rose-500'}`}>{lessonPlan.publishReady ? 'Ready' : 'Blocked'}</span>
                      </p>
                    </div>
                    {lessonPlan.warnings.length > 0 && (
                      <p className="text-[11px] text-amber-600 mt-2 bg-amber-50 px-2 py-1.5 rounded">{lessonPlan.warnings.join(' ')}</p>
                    )}
                  </div>

                  {lessonPlan.lessonObjective && (
                    <div className="bg-white border border-[#e2e8f0] rounded-[14px] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                      <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Lesson objective</p>
                      <p className="text-[13px] text-[#1e293b]">{lessonPlan.lessonObjective}</p>
                    </div>
                  )}

                  {lessonPlan.realWorldHook && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-[14px] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                      <p className="text-[10px] font-semibold text-[#4f46e5] uppercase tracking-wider mb-1.5">Real-life application</p>
                      <p className="text-[13px] text-[#1e293b]">{lessonPlan.realWorldHook}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {filteredLessonBlocks.map((block) => (
                      <div key={block.blockId} className="border border-[#e2e8f0] rounded-[14px] p-4 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                        <h3 className="text-[13px] font-semibold text-[#1e293b]">{block.title}</h3>
                        <p className="text-[11px] text-[#64748b] mt-1">{block.estimatedMinutes} mins {' \u2022 '} {block.strategy}</p>
                        <p className="text-[12px] text-[#475569] mt-2 bg-[#f8fafc] p-2 rounded-lg">{block.objective}</p>
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Activities</p>
                          {block.activities.slice(0, 2).map((activity, idx) => (
                            <p key={idx} className="text-[11px] text-[#475569] mb-1 flex items-start gap-1">
                              <span className="text-[#94a3b8] mt-0.5">•</span> <span>{activity}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => void saveLessonDraft()}
                      disabled={savingLessonDraft || !lessonPlan}
                      className="border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] text-[12px] h-9 rounded-full px-5"
                    >
                      {savingLessonDraft ? <Skeleton className="h-4 w-16" /> : 'Save Draft'}
                    </Button>
                    <Button
                      onClick={() => void publishCurrentLessonPlan()}
                      disabled={publishingLesson || !lessonPlan || !lessonPlan.publishReady}
                      className="bg-[#10b981] hover:bg-[#059669] text-white text-[12px] h-9 rounded-full px-5"
                    >
                      {publishingLesson ? <Skeleton className="h-4 w-24 bg-white/35" /> : 'Publish Lesson Plan'}
                    </Button>
                  </div>
                </div>
              )}
            </BoneSkeleton>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: Student Profile & Actions (Fixed) */}
      <aside className="w-[320px] 2xl:w-[340px] bg-white/70 backdrop-blur-[24px] border-l border-white shadow-[-4px_0_24px_rgba(0,0,0,0.02)] flex flex-col h-full shrink-0 overflow-y-auto z-10 no-scrollbar relative">
        <div className="p-[24px] space-y-[24px] flex flex-col items-center">

          {/* Profile Block */}
          <div className="flex flex-col items-center text-center w-full">
            <img src={student.avatar} alt={student.name} className="w-[96px] h-[96px] rounded-full object-cover shadow-[0_8px_16px_rgba(0,0,0,0.1)] mb-4 border-4 border-white z-10 relative" />
            <h2 className="text-[20px] font-semibold text-[#1e293b] mb-1">{student.name}</h2>
            <p className="text-[11px] font-semibold text-[#64748b] mb-3 uppercase tracking-wider">ID: {student.id.substring(0, 8)}</p>
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-[14px] border ${(interventionPlan?.risk_level || '').includes('Critical') ? 'text-red-700 bg-red-50 border-red-200 animate-pulse' : student.riskLevel === 'high' || (interventionPlan?.risk_level || '').includes('High') ? 'text-rose-600 bg-rose-50 border-rose-100' : student.riskLevel === 'medium' || (interventionPlan?.risk_level || '').includes('Medium') ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
              {interventionPlan?.risk_level || (student.riskLevel === 'high' ? 'High Risk' : student.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk')}
            </span>
          </div>

          {/* 4 Stats Grid */}
          <div className="w-full grid grid-cols-2 gap-[12px]">
            <div className="bg-white/80 rounded-[14px] p-4 border border-white shadow-[0_1px_4px_rgba(0,0,0,0.02)] text-left flex flex-col justify-center">
              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">Avg Score</p>
              <p className="text-[20px] font-bold text-[#4f46e5]">{interventionPlan?.avg_score ?? student.avgScore}%</p>
            </div>
            <div className="bg-white/80 rounded-[14px] p-4 border border-white shadow-[0_1px_4px_rgba(0,0,0,0.02)] text-left flex flex-col justify-center">
              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">Engagement</p>
              <p className="text-[20px] font-bold text-[#1e293b]">{interventionPlan?.engagement_level || (student.avgScore > 80 ? 'High' : student.avgScore > 50 ? 'Medium' : 'Low')}</p>
            </div>
            <div className="bg-white/80 rounded-[14px] p-4 border border-white shadow-[0_1px_4px_rgba(0,0,0,0.02)] text-left flex flex-col justify-center">
              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">Last Active</p>
              <p className="text-[13px] font-semibold text-[#1e293b] mt-1">{interventionPlan?.last_active ? new Date(interventionPlan.last_active).toLocaleDateString() : student.lastActive}</p>
            </div>
            <div className="bg-rose-50/60 rounded-[14px] p-4 border border-rose-100 text-left flex flex-col justify-center">
              <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider mb-1">Weakest Topic</p>
              <p className="text-[12px] font-semibold text-[#1e293b] mt-1 leading-snug break-words" title={interventionPlan?.weakest_topic || student.weakestTopic}>{interventionPlan?.weakest_topic || student.weakestTopic}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="w-full flex flex-col gap-[10px]">
            <button
              onClick={async () => {
                setExportModalStep('choose');
                setShowExportModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-[#f8fafc] text-[#475569] border border-[#cbd5e1] hover:border-[#94a3b8] text-[13px] font-semibold rounded-full px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-transform hover:scale-[1.02]"
            >
              <Printer className="w-4 h-4" /> Export Materials
            </button>
          </div>

          {/* Export Materials Portal Modal */}
          {showExportModal && ReactDOM.createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={() => setShowExportModal(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

              {/* Modal card */}
              <div
                className="relative bg-white rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.18)] w-full max-w-[460px] z-10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Purple top bar */}
                <div className="bg-gradient-to-r from-[#a855f7] to-[#9333ea] px-6 pt-5 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {exportModalStep === 'bank' && (
                        <button
                          onClick={() => setExportModalStep('choose')}
                          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors mr-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}
                      <div className="w-8 h-8 rounded-[8px] bg-white/20 flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-[15px] font-bold text-white leading-tight">
                          {exportModalStep === 'choose' ? 'Export Materials' : 'Choose a Quiz'}
                        </h2>
                        <p className="text-[11px] text-white/70 font-medium">
                          {exportModalStep === 'choose'
                            ? `For ${student.name}`
                            : 'Select a quiz from your bank'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowExportModal(false)}
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  {exportModalStep === 'choose' ? (
                    <>
                      <p className="text-[13px] text-[#64748b] mb-5 font-medium">How would you like to proceed?</p>

                      {/* Option 0 — PDF Report */}
                      <button
                        onClick={async () => {
                          setShowExportModal(false);
                          toast.info('Generating PDF report...');
                          try {
                            const { getExportPDFData } = await import('../services/interventionService');
                            const data = await getExportPDFData(student.id);
                            const { default: jsPDF } = await import('jspdf');
                            const doc = new jsPDF();
                            let y = 20;
                            doc.setFontSize(18);
                            doc.text('MathPulse AI - Intervention Report', 20, y); y += 12;
                            doc.setFontSize(11);
                            doc.text(`Student: ${data.student_name}`, 20, y); y += 7;
                            doc.text(`Grade: ${data.grade_level} | Section: ${data.section}`, 20, y); y += 7;
                            doc.text(`Risk Level: ${data.risk_level} | Avg Score: ${data.avg_score}%`, 20, y); y += 7;
                            doc.text(`Engagement: ${data.engagement_level} | Generated: ${new Date().toLocaleDateString()}`, 20, y); y += 12;
                            doc.setFontSize(13);
                            doc.text('AI Analysis', 20, y); y += 8;
                            doc.setFontSize(10);
                            const maxW = 170;
                            const writeWrapped = (text: string) => {
                              const lines = doc.splitTextToSize(text, maxW);
                              for (const line of lines) {
                                if (y > 270) { doc.addPage(); y = 20; }
                                doc.text(line, 20, y); y += 5;
                              }
                              y += 2;
                            };
                            writeWrapped(`Strengths: ${data.learning_strengths}`);
                            writeWrapped(`Next Steps: ${data.next_steps_summary}`);
                            y += 4;
                            if (data.learning_path?.steps?.length) {
                              doc.setFontSize(13);
                              doc.text('Learning Path', 20, y); y += 8;
                              doc.setFontSize(10);
                              for (const step of data.learning_path.steps) {
                                if (y > 270) { doc.addPage(); y = 20; }
                                writeWrapped(`${step.step_number}. [${step.type}] ${step.title} (${step.duration_minutes} min, ${step.difficulty})`);
                                if (step.competency_tag) { doc.text(`   Competency: ${step.competency_tag}`, 20, y); y += 6; }
                              }
                              y += 6;
                            }
                            if (data.teacher_recommendations?.length) {
                              if (y > 250) { doc.addPage(); y = 20; }
                              doc.setFontSize(13);
                              doc.text('Teacher Recommendations', 20, y); y += 8;
                              doc.setFontSize(10);
                              for (const rec of data.teacher_recommendations) {
                                if (y > 270) { doc.addPage(); y = 20; }
                                writeWrapped(`• ${rec}`);
                              }
                            }
                            doc.setFontSize(8);
                            doc.text('Generated by MathPulse AI | Confidential - For Teacher Use Only', 20, 285);
                            doc.save(`intervention-report-${data.student_name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
                            toast.success('PDF report downloaded!');
                          } catch (err) {
                            console.error('PDF export failed:', err);
                            toast.error('Failed to generate PDF report.');
                          }
                        }}
                        className="w-full flex items-start gap-4 p-4 rounded-[16px] border border-slate-200 hover:border-[#a855f7] hover:shadow-[0_4px_12px_rgba(168,85,247,0.08)] hover:bg-purple-50/30 transition-all group mb-3 text-left"
                      >
                        <div className="w-10 h-10 rounded-[10px] bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                          <Printer className="w-5 h-5 text-[#a855f7]" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-[#1e293b] mb-0.5">Download PDF Report</p>
                          <p className="text-[12px] text-[#64748b] font-medium">Full intervention report with AI insights and learning path.</p>
                        </div>
                      </button>

                      {/* Option 1 — Quiz Bank */}
                      <button
                        onClick={async () => {
                          setBankLoading(true);
                          setExportModalStep('bank');
                          try {
                            const quizzes = await fetchQuizzesByTeacher(teacherId);
                            setBankQuizzes(quizzes);
                          } catch {
                            setBankQuizzes([]);
                          } finally {
                            setBankLoading(false);
                          }
                        }}
                        className="w-full flex items-start gap-4 p-4 rounded-[16px] border border-slate-200 hover:border-[#a855f7] hover:shadow-[0_4px_12px_rgba(168,85,247,0.08)] hover:bg-purple-50/30 transition-all group mb-3 text-left"
                      >
                        <div className="w-10 h-10 rounded-[10px] bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                          <Library className="w-5 h-5 text-[#a855f7]" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-[#1e293b] mb-0.5">Choose from existing quizzes</p>
                          <p className="text-[12px] text-[#64748b] font-medium">Pick a quiz already in your Quiz Bank.</p>
                        </div>
                      </button>

                      {/* Option 2 — Create new */}
                      <button
                        onClick={() => {
                          setShowExportModal(false);
                          setDrawerDirty(false);
                          setShowQuizDrawer(true);
                        }}
                        className="w-full flex items-start gap-4 p-4 rounded-[16px] border border-slate-200 hover:border-[#a855f7] hover:shadow-[0_4px_12px_rgba(168,85,247,0.08)] hover:bg-purple-50/30 transition-all group text-left"
                      >
                        <div className="w-10 h-10 rounded-[10px] bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                          <Sparkles className="w-5 h-5 text-[#a855f7]" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-[#1e293b] mb-0.5">Create a new quiz</p>
                          <p className="text-[12px] text-[#64748b] font-medium">Use AI Quiz Maker. You can return here when done.</p>
                        </div>
                      </button>
                    </>
                  ) : (
                    /* Quiz Bank Step */
                    <div>
                      {bankLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                          <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
                          <p className="text-[13px] text-[#64748b] font-medium">Loading quizzes...</p>
                        </div>
                      ) : bankQuizzes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                            <Library className="w-6 h-6 text-[#a855f7]" />
                          </div>
                          <p className="text-[14px] font-semibold text-[#1e293b]">No quizzes yet</p>
                          <p className="text-[12px] text-[#64748b]">Create your first quiz using the AI Quiz Maker.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                          {bankQuizzes.map((quiz) => (
                            <div
                              key={quiz.id}
                              className="flex items-center justify-between gap-3 p-4 rounded-[14px] border border-slate-200 hover:border-[#a855f7] hover:shadow-[0_2px_8px_rgba(168,85,247,0.08)] transition-all group"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-[#1e293b] truncate">{quiz.title}</p>
                                <p className="text-[11px] text-[#64748b] font-medium mt-0.5">
                                  {quiz.questions?.length ?? 0} questions
                                  {quiz.gradeLevel ? ` · ${quiz.gradeLevel}` : ''}
                                  {quiz.metadata?.topicsCovered?.[0] ? ` · ${quiz.metadata.topicsCovered[0]}` : ''}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setShowExportModal(false);
                                  toast.success(`"${quiz.title}" selected for ${student.name}`);
                                }}
                                className="shrink-0 px-3 py-1.5 rounded-full bg-[#a855f7] text-white text-[11px] font-bold hover:bg-[#9333ea] transition-colors shadow-sm"
                              >
                                Assign
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ─── Quiz Maker Slide-Over Drawer ─── */}
          {showQuizDrawer && ReactDOM.createPortal(
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
                onClick={() => {
                  if (drawerDirty) { setShowDrawerCloseConfirm(true); } else { setShowQuizDrawer(false); }
                }}
              />

              {/* Slide-over panel — 88vw wide, full height */}
              <div
                className="fixed top-0 right-0 z-[9999] h-full w-full max-w-[88vw] xl:max-w-[1080px] bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.15)] flex flex-col"
                style={{ animation: 'slideInFromRight 0.3s cubic-bezier(0.16,1,0.3,1)' }}
              >
                {/* Drawer header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                  <button
                    onClick={() => {
                      if (drawerDirty) { setShowDrawerCloseConfirm(true); } else { setShowQuizDrawer(false); }
                    }}
                    className="flex items-center gap-2 text-[13px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-colors bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to {student.name}
                  </button>
                  <div className="h-5 w-px bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#a855f7] to-[#9333ea] flex items-center justify-center">
                      <Wand2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[14px] font-bold text-[#1e293b]">AI Quiz Maker</span>
                  </div>
                  {drawerDirty && (
                    <span className="ml-auto text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      Quiz in progress
                    </span>
                  )}
                </div>

                {/* QuizMaker fills the rest */}
                <div className="flex-1 overflow-hidden">
                  <QuizMaker
                    onBack={() => setShowQuizDrawer(false)}
                    drawerMode={true}
                    gradeLevel={student.grade}
                    onQuizGenerating={() => setDrawerDirty(true)}
                    onQuizSaved={(_id) => {
                      setDrawerDirty(false);
                      toast.success('Quiz saved! Close this panel or create another.', {
                        action: { label: 'Close Panel', onClick: () => setShowQuizDrawer(false) },
                      });
                    }}
                  />
                </div>
              </div>

              {/* Close-confirmation dialog */}
              {showDrawerCloseConfirm && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setShowDrawerCloseConfirm(false)} />
                  <div className="relative bg-white rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.2)] w-full max-w-[380px] p-7 z-10">
                    <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="text-[16px] font-bold text-[#1e293b] mb-2">Discard quiz progress?</h3>
                    <p className="text-[13px] text-[#64748b] font-medium mb-6">
                      Your current quiz session will be lost if you close this panel. This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDrawerCloseConfirm(false)}
                        className="flex-1 py-2.5 rounded-full border border-slate-200 text-[13px] font-semibold text-[#475569] hover:bg-slate-50 transition-colors"
                      >
                        Keep editing
                      </button>
                      <button
                        onClick={() => { setShowDrawerCloseConfirm(false); setShowQuizDrawer(false); setDrawerDirty(false); }}
                        className="flex-1 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[13px] font-semibold transition-colors"
                      >
                        Discard &amp; close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Slide-in keyframe */}
              <style>{`
                @keyframes slideInFromRight {
                  from { transform: translateX(100%); opacity: 0.6; }
                  to   { transform: translateX(0);    opacity: 1; }
                }
              `}</style>
            </>,
            document.body
          )}

          {/* Section Assignment */}
          <div className="w-full bg-white/80 rounded-[18px] p-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-white mt-auto">
            <h3 className="text-[13px] font-semibold text-[#1e293b] mb-4">Section Assignment</h3>
            <div className="space-y-[12px]">
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5 block ml-1">Grade Level</label>
                <div className="relative">
                  <Input
                    value={gradeDraft}
                    onChange={(e) => setGradeDraft(e.target.value)}
                    placeholder="Grade"
                    className="appearance-none w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] text-[13px] font-medium rounded-[14px] px-4 py-2.5 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] h-auto"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5 block ml-1">Section</label>
                <div className="relative">
                  <Input
                    value={sectionDraft}
                    onChange={(e) => setSectionDraft(e.target.value)}
                    placeholder="Section"
                    className="appearance-none w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] text-[13px] font-medium rounded-[14px] px-4 py-2.5 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] h-auto"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveSectionAssignment}
                disabled={savingSection || (!gradeDraft.trim() || !sectionDraft.trim())}
                className="w-full bg-white hover:bg-[#f8fafc] disabled:opacity-50 text-[#4f46e5] border border-[#e0e7ff] text-[13px] font-semibold rounded-[14px] px-4 py-2.5 transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.02)] mt-2"
              >
                {savingSection ? 'Updating...' : 'Update Assignment'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Step Guide Modal */}
      {selectedStep && (
        <InterventionStepGuide
          step={selectedStep}
          studentId={student.id}
          studentName={student.name}
          totalSteps={interventionPlan?.learning_path?.steps?.length || 3}
          onClose={() => setSelectedStep(null)}
          onStepCompleted={() => {
            setSelectedStep(null);
            // Refresh intervention plan
            getInterventionPlan(student.id).then(setInterventionPlan).catch(() => {});
          }}
        />
      )}
    </motion.div>
  );

};

// Import View
const ImportView: React.FC<{
  onEditRecords: () => void;
  classSectionId?: string;
  className?: string;
  classMetadata?: ClassSectionMetadata;
  onImportedClassRecords?: (payload: {
    students: UploadResponse['students'];
    classSectionId: string;
    className: string;
    classMetadata?: ClassSectionMetadata;
  }) => void;
  onDataChanged?: () => void;
}> = ({ onEditRecords, classSectionId, className, classMetadata, onImportedClassRecords, onDataChanged }) => {
  const [shsExcelResult, setShsExcelResult] = useState<ParseWorkbookResult | null>(null);
  const [dragOver1, setDragOver1] = useState(false);
  const [dragOver2, setDragOver2] = useState(false);
  const [uploadingClassRecords, setUploadingClassRecords] = useState(false);
  const [uploadingCourseMaterials, setUploadingCourseMaterials] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');
  const [uploadInterpretation, setUploadInterpretation] = useState<{
    datasetIntent?: 'synthetic_student_records' | 'general_analytics' | 'eval_only';
    summary?: {
      scoringColumns: number;
      displayColumns: number;
      storageOnlyColumns: number;
      lowConfidenceColumns: number;
      domainMismatchWarnings: number;
    };
    columns: Array<{
      columnName: string;
      mappedField?: string;
      usagePolicy: 'scoring' | 'display' | 'storage_only';
      confidenceBand: 'high' | 'medium' | 'low';
      domainSignals?: string[];
    }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);

  const normalizeLearnerKey = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

  const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number(String(value ?? '').replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const clampPercent = (value: number, fallback: number): number => {
    const finiteValue = Number.isFinite(value) ? value : fallback;
    return Math.max(0, Math.min(100, finiteValue));
  };

  const toCsvCell = (value: string | number): string => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const buildNormalizedWorkbookCsv = (workbookResult: ParseWorkbookResult, sourceFileName: string): File | null => {
    const scoreByLearner = new Map<string, number[]>();
    const scoreFields = ['quarterlyGrade', 'finalGrades', 'firstSemester', 'firstQuarter', 'secondQuarter', 'initialGrade'] as const;

    workbookResult.mapping.gradeEntities.forEach((gradeRow) => {
      const learnerKey = normalizeLearnerKey(gradeRow.fullName || '');
      if (!learnerKey) return;

      const values = scoreFields
        .map((field) => toFiniteNumber(gradeRow[field]))
        .filter((value): value is number => value !== null);

      if (values.length === 0) return;
      const existing = scoreByLearner.get(learnerKey) || [];
      scoreByLearner.set(learnerKey, existing.concat(values));
    });

    const students = workbookResult.mapping.studentEntities || [];
    if (students.length === 0) {
      return null;
    }

    const fallbackTerm = (workbookResult.imported.schoolContext.semester || workbookResult.imported.schoolContext.schoolYear || 'First Semester').trim();
    const fallbackAssessment = (workbookResult.imported.schoolContext.subjectName || 'Class Record Import').trim();
    const classToken = (classSectionId || className || 'import').replace(/[^a-zA-Z0-9]+/g, '').toUpperCase().slice(0, 12) || 'IMPORT';

    const header = ['name', 'lrn', 'email', 'engagementScore', 'avgQuizScore', 'attendance', 'assignmentCompletion', 'term', 'assessmentName'];
    const rows = [header.join(',')];

    students.forEach((student, index) => {
      const learnerKey = normalizeLearnerKey(student.fullName || '');
      const learnerScores = scoreByLearner.get(learnerKey) || [];
      const avgScore = learnerScores.length > 0
        ? learnerScores.reduce((sum, value) => sum + value, 0) / learnerScores.length
        : 75;

      const avgQuizScore = clampPercent(avgScore, 75);
      const attendance = clampPercent(avgQuizScore + 5, 85);
      const engagementScore = clampPercent((avgQuizScore * 0.7) + (attendance * 0.3), 80);
      const assignmentCompletion = clampPercent((attendance * 0.6) + (avgQuizScore * 0.4), 82);

      const learnerNoSeed = student.learnerNo || (index + 1);
      const lrn = `IMP-${classToken}-${String(learnerNoSeed).padStart(4, '0')}`;
      const name = student.fullName || `Learner ${index + 1}`;

      rows.push([
        toCsvCell(name),
        toCsvCell(lrn),
        toCsvCell(''),
        toCsvCell(Number(engagementScore.toFixed(1))),
        toCsvCell(Number(avgQuizScore.toFixed(1))),
        toCsvCell(Number(attendance.toFixed(1))),
        toCsvCell(Number(assignmentCompletion.toFixed(1))),
        toCsvCell(fallbackTerm),
        toCsvCell(fallbackAssessment),
      ].join(','));
    });

    if (rows.length <= 1) {
      return null;
    }

    const normalizedName = sourceFileName.replace(/\.(xlsx|xls)$/i, '');
    return new File([rows.join('\n')], `${normalizedName}-normalized.csv`, { type: 'text/csv' });
  };

  const handleFileUpload = async (file: File) => {
    setUploadingClassRecords(true);
    setUploadResult('');
    setUploadInterpretation(null);

    let uploadFile = file;

    if (/\.(xlsx|xls)$/i.test(file.name)) {
      try {
        const workbookResult = await parseShsWorkbook(file, {
          confidenceThreshold: DETECTION_CONFIDENCE_THRESHOLD,
        });
        setShsExcelResult(workbookResult);

        const normalizedFile = buildNormalizedWorkbookCsv(workbookResult, file.name);
        if (normalizedFile) {
          uploadFile = normalizedFile;
        }
      } catch {
        setShsExcelResult(null);
      }
    } else {
      setShsExcelResult(null);
    }

    try {
      const result = await apiService.uploadClassRecords(uploadFile, {
        classSectionId,
        className,
        datasetIntent: 'synthetic_student_records',
      });
      const uploadedStudentsCount = result.students.length;
      const uploadWarnings = result.warnings && result.warnings.length > 0
        ? result.warnings.slice(0, 3).join(' ')
        : '';
      const dashboardSyncText = result.dashboardSync
        ? ` Dashboard sync: ${result.dashboardSync.synced ? 'ok' : 'pending'} (created ${result.dashboardSync.createdStudents}, updated ${result.dashboardSync.updatedStudents}).`
        : '';

      const resolvedImportContext = resolveUploadedClassContext(result, classSectionId, className, classMetadata);

      if (uploadedStudentsCount > 0) {
        onImportedClassRecords?.({
          students: result.students,
          classSectionId: resolvedImportContext.classSectionId,
          className: resolvedImportContext.className,
          classMetadata: resolvedImportContext.classMetadata,
        });
      }

      if (result.success) {
        toast.success(`Successfully imported ${uploadedStudentsCount} student records. Next step: upload course materials for AI lesson-plan grounding.`);
        const riskRefreshText = result.riskRefresh?.queued
          ? ` Risk refresh queued for ${result.riskRefresh.studentsQueued} students (job ${result.riskRefresh.refreshId || 'n/a'}).`
          : ` Risk refresh not queued${result.riskRefresh?.reason ? `: ${result.riskRefresh.reason}` : ''}.`;
        const interpretation = result.interpretationSummary;
        const interpretationText = interpretation
          ? ` Interpreted columns - scoring: ${interpretation.scoringColumns}, display: ${interpretation.displayColumns}, storage-only: ${interpretation.storageOnlyColumns}, low-confidence: ${interpretation.lowConfidenceColumns}.`
          : '';
        const warningText = uploadWarnings
          ? ` Warnings: ${uploadWarnings}`
          : '';
        setUploadResult(
          `Imported ${uploadedStudentsCount} students. Next step: upload course materials to give AI lesson generation topic context.${riskRefreshText}${dashboardSyncText}${interpretationText}${warningText} Column mapping: ${JSON.stringify(result.columnMapping)}`,
        );
        setUploadInterpretation({
          datasetIntent: result.datasetIntent,
          summary: result.interpretationSummary,
          columns: result.columnInterpretations?.map((item) => ({
            columnName: item.columnName,
            mappedField: item.mappedField,
            usagePolicy: item.usagePolicy,
            confidenceBand: item.confidenceBand,
            domainSignals: item.domainSignals,
          })) || [],
        });
        onDataChanged?.();
      } else {
        const fileWarnings = (result.files || [])
          .flatMap((entry) => entry.warnings || [])
          .slice(0, 3)
          .join(' ');
        const message = fileWarnings || uploadWarnings || 'Import completed but no usable student rows were detected. Check required columns and retry.';
        setUploadResult(message);
        toast.error(message);
      }
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Upload failed';
      const normalizedMessage = message.toLowerCase();
      if (
        err instanceof ApiError
        && normalizedMessage.includes('missing required educational columns after mapping')
        && normalizedMessage.includes('assignmentcompletion')
      ) {
        message = 'Your file matches the minimal import schema, but the connected backend is running an older validator that still requires assignmentCompletion. Update/redeploy the backend or point VITE_API_URL to this updated backend.';
      }

      toast.error(message);
      setUploadResult(message);
      setUploadInterpretation(null);
    } finally {
      setUploadingClassRecords(false);
    }
  };

  const handleCourseMaterialUpload = async (file: File) => {
    setUploadingCourseMaterials(true);
    setUploadResult('');
    try {
      const result = await apiService.uploadCourseMaterials(file, {
        classSectionId,
        className,
      });

      if (result.success) {
        const topicCount = result.topics?.length ?? 0;
        toast.success(`Course material imported (${topicCount} topics extracted). Lesson generation now has material context.`);
        setUploadResult(
          `Imported course material ${result.fileName} with ${topicCount} topics and ${result.sections.length} section(s). Lesson generation is now ready with material context.`,
        );
        onDataChanged?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Course material upload failed');
      setUploadResult('Course material upload failed. Please check the file format and try again.');
    } finally {
      setUploadingCourseMaterials(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver1(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleCourseMaterialDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver2(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      void handleCourseMaterialUpload(file);
    }
  };

  const handleCourseMaterialSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleCourseMaterialUpload(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-2">
          <h2 className="text-xl font-display font-semibold text-foreground">Import Data</h2>
          <p className="text-muted-foreground">Class records drive analytics and at-risk signals. Course materials provide topic grounding for AI lesson plans.</p>
          <div className="mt-2 flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-md bg-muted border border-border">Class scope: {className || classSectionId || 'All classes'}</span>
            {[classMetadata?.gradeLevel, classMetadata?.classification, classMetadata?.strand]
              .filter(Boolean)
              .map((badge) => (
                <span key={`import-meta-${badge}`} className="px-2 py-1 rounded-md bg-[#9956DE]/12 border border-[#9956DE]/30 text-[#9956DE] font-medium">
                  {badge}
                </span>
              ))}
          </div>
        </div>

        {/* Upload Zones */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Class Records */}
          <div
            className={`bg-card border-4 border-dashed rounded-3xl p-6 transition-all ${dragOver1 ? 'border-[#9956DE] bg-[#9956DE]/12' : 'border-border'
              }`}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver1(true); }}
              onDragLeave={() => setDragOver1(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-border p-8 text-center transition-all cursor-pointer hover:border-[#9956DE]/60 hover:bg-[#9956DE]/8"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-20 h-20 bg-[#9956DE]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                {uploadingClassRecords ? (
                  <Skeleton className="h-10 w-10 rounded-2xl bg-[#9956DE]/32" />
                ) : (
                  <FileSpreadsheet size={40} className="text-[#9956DE]" />
                )}
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">Class Records</h3>
              <p className="text-muted-foreground mb-4">
                {uploadingClassRecords ? (
                  <span className="inline-flex flex-col items-center gap-2">
                    <Skeleton className="h-4 w-44 bg-[#9956DE]/32" />
                    <Skeleton className="h-4 w-36 bg-[#9956DE]/20" />
                  </span>
                ) : 'Upload student grades, attendance, and quiz scores'}
              </p>
              <p className="text-xs text-muted-foreground mb-4 flex items-center justify-center gap-2">
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.csv</span>
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.xlsx</span>
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.xls</span>
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.pdf</span>
              </p>
              <Button className="bg-card border-2 border-border text-muted-foreground hover:border-[#9956DE] hover:text-[#9956DE] font-semibold px-6 py-3 rounded-xl w-full transition-colors">
                Click or drag & drop
              </Button>
            </div>
          </div>

          {/* Course Materials */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver2(true); }}
            onDragLeave={() => setDragOver2(false)}
            onDrop={handleCourseMaterialDrop}
            onClick={() => materialInputRef.current?.click()}
            className={`bg-card border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer hover:border-[#F08386]/60 hover:bg-[#F08386]/12 ${dragOver2 ? 'border-[#F08386] bg-[#F08386]/12 scale-105' : 'border-border'
              }`}
          >
            <input
              ref={materialInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleCourseMaterialSelect}
              className="hidden"
            />
            <div className="w-20 h-20 bg-[#F08386]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              {uploadingCourseMaterials ? (
                <Skeleton className="h-10 w-10 rounded-2xl bg-rose-200" />
              ) : (
                <FileText size={40} className="text-[#F08386]" />
              )}
            </div>
            <h3 className="text-xl font-display font-semibold text-foreground mb-2">Course Materials</h3>
            <p className="text-muted-foreground mb-4">
              {uploadingCourseMaterials ? (
                <span className="inline-flex flex-col items-center gap-2">
                  <Skeleton className="h-4 w-48 bg-rose-200" />
                  <Skeleton className="h-4 w-40 bg-[#F08386]/20" />
                </span>
              ) : 'Upload syllabus, lesson plans, and curriculum documents'}
            </p>
            <p className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-2">
              <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.pdf</span>
              <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.docx</span>
              <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.txt</span>
            </p>
            <Button className="bg-card border-2 border-border text-muted-foreground hover:border-[#F08386] hover:text-[#F08386] font-semibold px-6 py-3 rounded-xl w-full transition-colors">
              Click or drag & drop
            </Button>
          </div>

        </div>

        {shsExcelResult && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-base font-display font-semibold text-foreground mb-2">Workbook Preview Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">School</p>
                <p className="font-semibold text-foreground">{shsExcelResult.imported.schoolContext.schoolName || 'N/A'}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="font-semibold text-foreground">{shsExcelResult.imported.schoolContext.subjectName || 'N/A'}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Learners</p>
                <p className="font-semibold text-foreground">{shsExcelResult.imported.learners.length}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="font-semibold text-foreground">{shsExcelResult.imported.validation.confidence.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-[#9956DE]/12 border border-[#9956DE]/30 rounded-2xl p-6">
          <h3 className="text-lg font-display font-semibold text-[#7A44B3] mb-3">How AI Uses Your Data</h3>
          <div className="space-y-2 text-[#5E3388]/80 text-sm">
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-semibold">&bull;</span>
              <span><strong className="text-[#7A44B3]">Smart Format Detection:</strong> AI understands various spreadsheet formats and column names</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-semibold">&bull;</span>
              <span>Analyzes historical performance patterns to predict at-risk students</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-semibold">&bull;</span>
              <span>Maps curriculum topics to student knowledge gaps</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-semibold">&bull;</span>
              <span>Generates personalized remedial learning paths</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-semibold">&bull;</span>
              <span>All data is processed securely and never shared</span>
            </p>
          </div>
        </div>

        {/* Upload Results */}
        {uploadResult && (
          <div className="bg-[#75D06A]/14 border border-[#75D06A]/35 rounded-2xl p-4 text-sm text-[#3E8538]">
            {uploadResult}
          </div>
        )}

        {uploadInterpretation && (
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-display font-semibold text-foreground">Import Interpretation</h3>
              <span className="text-xs px-2 py-1 rounded bg-muted text-[#334155]">
                Intent: {uploadInterpretation.datasetIntent || 'synthetic_student_records'}
              </span>
            </div>

            {uploadInterpretation.summary && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-[#f8fbff] border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Scoring</p>
                  <p className="text-lg font-semibold text-foreground">{uploadInterpretation.summary.scoringColumns}</p>
                </div>
                <div className="bg-[#f8fbff] border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Display</p>
                  <p className="text-lg font-semibold text-foreground">{uploadInterpretation.summary.displayColumns}</p>
                </div>
                <div className="bg-[#FFB356]/16 border border-[#FFB356]/38 rounded-xl p-3">
                  <p className="text-xs text-[#CC8A37]">Storage-only</p>
                  <p className="text-lg font-semibold text-[#A56D29]">{uploadInterpretation.summary.storageOnlyColumns}</p>
                </div>
                <div className="bg-[#F08386]/12 border border-[#F08386]/30 rounded-xl p-3">
                  <p className="text-xs text-[#C65E63]">Low confidence</p>
                  <p className="text-lg font-semibold text-[#A74B50]">{uploadInterpretation.summary.lowConfidenceColumns}</p>
                </div>
                <div className="bg-[#f8fbff] border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Domain warnings</p>
                  <p className="text-lg font-semibold text-foreground">{uploadInterpretation.summary.domainMismatchWarnings}</p>
                </div>
              </div>
            )}

            {uploadInterpretation.columns.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {uploadInterpretation.columns.slice(0, 40).map((column) => (
                  <div key={column.columnName} className="bg-[#f8fafc] border border-border rounded-lg px-3 py-2">
                    <p className="text-sm font-semibold text-foreground">{column.columnName}</p>
                    <p className="text-xs text-muted-foreground">
                      mapped: {column.mappedField || 'none'}
                      {' \u2022 '}usage: {column.usagePolicy}
                      {' \u2022 '}confidence: {column.confidenceBand}
                    </p>
                    {column.domainSignals && column.domainSignals.length > 0 && (
                      <p className="text-xs text-[#CC8A37] mt-1">domain signals: {column.domainSignals.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No per-column interpretation data was returned for this upload.</p>
            )}
          </div>
        )}

        {/* Manage Imported Data */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-display font-semibold text-foreground mb-4">Manage Imported Data</h3>
          <button
            onClick={onEditRecords}
            className="w-full bg-[#00a86b] hover:bg-[#008f5d] text-white rounded-xl p-5 flex items-center justify-between transition-all shadow-sm hover:shadow-md group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-card/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Edit3 size={24} className="text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-lg">Edit Class Records</h4>
                <p className="text-white/90 text-sm">Review and correct AI-analyzed student data</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-white/80 group-hover:text-[#9956DE] group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Edit Records View
const EditRecordsView: React.FC<{
  students: StudentView[];
  teacherId: string;
  teacherName: string;
  onBack: () => void;
}> = ({ students: initialStudents, teacherId, teacherName, onBack }) => {
  const [students, setStudents] = useState(initialStudents);
  const [saving, setSaving] = useState(false);

  const getSectionDraftKey = useCallback((student: StudentView) => buildStudentViewKey(student), []);

  const [sectionDrafts, setSectionDrafts] = useState<Record<string, { grade: string; section: string }>>(() =>
    Object.fromEntries(
      initialStudents.map((student) => [getSectionDraftKey(student), { grade: student.grade || 'Grade 11', section: student.section || 'Section A' }])
    )
  );

  useEffect(() => {
    setStudents(initialStudents);
    setSectionDrafts(
      Object.fromEntries(
        initialStudents.map((student) => [getSectionDraftKey(student), { grade: student.grade || 'Grade 11', section: student.section || 'Section A' }])
      )
    );
  }, [getSectionDraftKey, initialStudents]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update risk levels for all students via AI
      for (const student of students) {
        const draft = sectionDrafts[getSectionDraftKey(student)];
        const updatedGrade = draft?.grade || student.grade;
        const updatedSection = draft?.section || student.section;

        if (teacherId && (updatedGrade !== student.grade || updatedSection !== student.section)) {
          await assignStudentToClassSection(
            student.id,
            updatedGrade,
            updatedSection,
            teacherId,
            new Date().getFullYear().toString(),
            teacherName
          );
          await updateManagedStudentSectionAssignment(student.id, updatedGrade, updatedSection);
        }

        try {
          const prediction = await apiService.predictRisk({
            engagementScore: student.engagementScore,
            avgQuizScore: student.avgScore,
            attendance: student.attendance,
            assignmentCompletion: student.assignmentCompletion,
          });
          await updateStudentRisk(student.id, prediction.riskLevel, prediction.confidence);
        } catch {
          // Continue with other students if one fails
        }
      }

      setStudents((prev) =>
        prev.map((student) => {
          const draft = sectionDrafts[getSectionDraftKey(student)];
          if (!draft) return student;
          const classMetadata = resolveClassMetadata({
            metadata: student.classMetadata,
            classSectionId: student.classSectionId,
            className: [draft.grade, draft.section].filter(Boolean).join(' - '),
            grade: draft.grade,
            section: draft.section,
          });
          return {
            ...student,
            grade: draft.grade,
            section: draft.section,
            className: classMetadata.className || [draft.grade, draft.section].filter(Boolean).join(' - '),
            classSectionId: classMetadata.classSectionId || student.classSectionId,
            classMetadata,
          };
        })
      );

      toast.success('Records saved and risk levels updated');
      onBack();
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">Edit Class Records</h1>
            <p className="text-muted-foreground">Review and modify student data manually</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onBack} className="border-border">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#75D06A] hover:bg-[#5AB84E] text-white gap-2">
            {saving ? <Skeleton className="h-5 w-5 rounded-full bg-white/35" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-background flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info size={18} />
            <span className="text-sm">Click on any field to edit</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {students.length} records
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-background sticky top-0 z-10">
              <tr>
                <th className="p-4 font-semibold text-muted-foreground border-b border-border bg-background">Student Name</th>
                <th className="p-4 font-semibold text-muted-foreground border-b border-border bg-background">LRN</th>
                <th className="p-4 font-semibold text-muted-foreground border-b border-border bg-background">Grade</th>
                <th className="p-4 font-semibold text-muted-foreground border-b border-border bg-background">Section</th>
                <th className="p-4 font-semibold text-muted-foreground border-b border-border bg-background">Avg Score</th>
                <th className="p-4 font-semibold text-muted-foreground border-b border-border bg-background">Risk Level</th>
                <th className="p-4 font-semibold text-muted-foreground border-b border-border bg-background">Weakest Topic</th>
                <th className="p-4 font-semibold text-muted-foreground border-b border-border bg-background">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const rowDraftKey = getSectionDraftKey(student);

                return (
                  <tr key={rowDraftKey} className="border-b border-border hover:bg-[#9956DE]/12 group transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={student.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-medium text-foreground">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground font-mono text-sm">{student.lrn || 'Not set'}</td>
                    <td className="p-4 min-w-[140px]">
                      <Input
                        id={`edit-record-grade-${rowDraftKey}`}
                        name={`edit-record-grade-${rowDraftKey}`}
                        aria-label={`Edit grade for ${student.name}`}
                        value={sectionDrafts[rowDraftKey]?.grade || student.grade}
                        onChange={(e) =>
                          setSectionDrafts((prev) => ({
                            ...prev,
                            [rowDraftKey]: { ...prev[rowDraftKey], grade: e.target.value },
                          }))
                        }
                        className="h-9 text-sm"
                      />
                    </td>
                    <td className="p-4 min-w-[140px]">
                      <Input
                        id={`edit-record-section-${rowDraftKey}`}
                        name={`edit-record-section-${rowDraftKey}`}
                        aria-label={`Edit section for ${student.name}`}
                        value={sectionDrafts[rowDraftKey]?.section || student.section}
                        onChange={(e) =>
                          setSectionDrafts((prev) => ({
                            ...prev,
                            [rowDraftKey]: { ...prev[rowDraftKey], section: e.target.value },
                          }))
                        }
                        className="h-9 text-sm"
                      />
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${student.avgScore < 60 ? 'text-[#FF8B8B]' :
                        student.avgScore < 80 ? 'text-[#F08386]' : 'text-green-600'
                        }`}>{student.avgScore}%</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskBadge(student.riskLevel)}`}>
                        {student.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{student.weakestTopic}</td>
                    <td className="p-4">
                      <button className="p-2 hover:bg-muted rounded-lg text-slate-500 hover:text-[#9956DE] transition-colors">
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// Dashboard Right Sidebar Component
const DashboardRightSidebar: React.FC<{
  onViewCalendar?: () => void;
  onOpenProfile?: () => void;
  userProfile?: any;
  teacherName: string;
  liveActivity?: { id: string; student: string; action: string; topic: string; time: string; type: string }[];
}> = ({ onViewCalendar, onOpenProfile, userProfile, teacherName, liveActivity = [] }) => {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'pulse' | 'reminders'>('pulse');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = subscribeToUserCalendarEvents(
      currentUser.uid,
      { limitCount: 100 },
      (items) => setEvents(items),
      () => { }
    );
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthLabel = () => currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const goToPrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getDaysArray = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: (number | null)[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.unshift(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const days = getDaysArray();
  const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const hasEvent = (day: number | null) => {
    if (!day) return false;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.some(ev => {
      const evDate = new Date(ev.startTime);
      const evDateStr = `${evDate.getFullYear()}-${String(evDate.getMonth() + 1).padStart(2, '0')}-${String(evDate.getDate()).padStart(2, '0')}`;
      return evDateStr === dateStr;
    });
  };

  const getEventTooltip = (day: number | null) => {
    if (!day) return undefined;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(ev => {
      const evDate = new Date(ev.startTime);
      const evDateStr = `${evDate.getFullYear()}-${String(evDate.getMonth() + 1).padStart(2, '0')}-${String(evDate.getDate()).padStart(2, '0')}`;
      return evDateStr === dateStr;
    });
    if (dayEvents.length === 0) return undefined;
    return dayEvents.map(ev => `• ${ev.title}`).join('\n');
  };

  return (
    <aside className="w-[280px] bg-white border-l border-[#e2e8f0] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Profile Section */}
      <div className="p-[22px_16px_10px] border-b border-[#f1f5f9] flex flex-col items-center gap-[5px]">
        <div className="w-[48px] h-[48px] rounded-full bg-[#e0e7ff] flex items-center justify-center text-[22px] text-[#4f46e5] shadow-[0_0_0_3px_#c7d2fe] flex-shrink-0">
          <UserAvatar src={userProfile?.photo} name={teacherName} className="w-full h-full rounded-full" />
        </div>
        <div className="text-[13.5px] font-semibold text-[#1e293b] mt-1">{teacherName}</div>
        <div className="text-[11px] text-[#94a3b8]">Teacher</div>
        <button onClick={onOpenProfile} className="mt-[4px] py-[6px] px-[22px] bg-[#818cf8] hover:bg-[#6366f1] text-white rounded-full text-[11.5px] font-medium transition-colors">
          Profile
        </button>
      </div>

      {/* Calendar Section */}
      <div className="border-b border-[#f1f5f9]">
        {/* Calendar header row with minimize toggle */}
        <div className="p-[10px_16px_8px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevMonth(); }}
              className="w-6 h-6 flex items-center justify-center bg-white border border-[#e2e8f0] rounded-[7px] text-[#64748b] hover:bg-[#f8fafc] cursor-pointer text-[14px] z-10"
            >
              <ChevronLeft size={14} />
            </button>
            <span
              className="text-[12px] font-semibold text-[#1e293b] hover:text-[#4f46e5] transition-colors cursor-pointer"
              onClick={onViewCalendar}
            >
              {monthLabel()}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); goToNextMonth(); }}
              className="w-6 h-6 flex items-center justify-center bg-white border border-[#e2e8f0] rounded-[7px] text-[#64748b] hover:bg-[#f8fafc] cursor-pointer text-[14px] z-10"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          {/* Minimize / expand toggle */}
          <button
            onClick={() => setCalendarCollapsed(c => !c)}
            className="w-6 h-6 flex items-center justify-center rounded-[7px] text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#64748b] transition-colors"
            title={calendarCollapsed ? 'Show calendar' : 'Hide calendar'}
            aria-label={calendarCollapsed ? 'Expand calendar' : 'Collapse calendar'}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${calendarCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        {/* Collapsible calendar grid */}
        <AnimatePresence initial={false}>
          {!calendarCollapsed && (
            <motion.div
              key="cal-grid"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div
                className="px-[16px] pb-[10px] cursor-pointer hover:bg-slate-50 transition-colors group/cal"
                onClick={onViewCalendar}
              >
                <div className="grid grid-cols-7 gap-[2px] text-center mb-1">
                  {dayLabels.map((label) => (
                    <div key={label} className="text-[10px] font-semibold text-[#94a3b8] p-[2px_0_4px]">
                      {label}
                    </div>
                  ))}
                  {days.map((day, idx) => (
                    <div
                      key={`${currentDate.getMonth()}-${idx}`}
                      className="relative flex flex-col items-center justify-center h-[28px]"
                      title={getEventTooltip(day)}
                    >
                      <div
                        className={`text-[11px] leading-[22px] w-[22px] h-[22px] flex items-center justify-center rounded-full transition-all ${day === null
                          ? 'text-[#cbd5e1]'
                          : isToday(day)
                            ? 'bg-[#818cf8] text-white font-semibold'
                            : 'text-[#475569] group-hover/cal:bg-slate-100'
                          }`}
                      >
                        {day}
                      </div>
                      {day !== null && hasEvent(day) && (
                        <div className={`absolute bottom-0 w-1 h-1 rounded-full ${isToday(day) ? 'bg-white' : 'bg-[#a855f7]'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex gap-[18px] p-[12px_16px_0] border-b border-[#f1f5f9] flex-shrink-0">
        <button
          onClick={() => setActiveTab('pulse')}
          className={`text-[11.5px] font-semibold pb-[9px] border-b-[2.5px] transition-colors ${activeTab === 'pulse'
            ? 'text-[#10b981] border-[#10b981]'
            : 'text-[#94a3b8] border-transparent'
            }`}
        >
          Live pulse
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`text-[11.5px] font-semibold pb-[9px] border-b-[2.5px] transition-colors ${activeTab === 'reminders'
            ? 'text-[#10b981] border-[#10b981]'
            : 'text-[#94a3b8] border-transparent'
            }`}
        >
          Reminders
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-[14px_16px]">
        {activeTab === 'pulse' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Live Activity Stream</div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-bold text-emerald-600">LIVE</span>
              </div>
            </div>

            {liveActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <Activity size={32} className="text-slate-300 mb-2" />
                <p className="text-[11px] font-bold text-[#1e293b]">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {liveActivity.slice(0, 5).map((item) => (
                  <div key={item.id} className="relative pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-[-16px] before:w-[1px] before:bg-slate-100 last:before:hidden">
                    <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white bg-indigo-500 shadow-sm z-10"></div>
                    <div className="bg-white border border-[#f1f5f9] rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[12px] font-bold text-[#1e293b] truncate">{item.student}</span>
                        <span className="text-[9px] font-medium text-[#94a3b8] shrink-0">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-[#64748b] leading-snug">
                        {item.action} <span className="font-bold text-[#4f46e5]">{item.topic}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'reminders' && (
          <div className="space-y-3">
            {events
              .filter(ev => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const evDate = new Date(ev.startTime);
                return evDate.getTime() >= today.getTime();
              })
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 5)
              .map(ev => {
                const isToday = new Date(ev.startTime).toDateString() === new Date().toDateString();
                return (
                  <div
                    key={ev.id}
                    onClick={onViewCalendar}
                    className="flex items-start gap-3 p-3 border border-[#f1f5f9] rounded-[14px] cursor-pointer hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`p-2 rounded-xl border border-[#f1f5f9] bg-white text-[14px] flex-shrink-0 shadow-sm transition-transform group-hover:scale-105 ${isToday ? 'text-rose-500' : 'text-[#4f46e5]'}`}>
                      <Calendar size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-[#1e293b] mb-0.5 truncate">{ev.title}</div>
                      <div className={`text-[10px] font-medium ${isToday ? 'text-rose-500 font-bold' : 'text-[#94a3b8]'}`}>
                        {isToday ? 'Today, ' : ''}{new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            }
            {events.filter(ev => new Date(ev.startTime).getTime() >= new Date().setHours(0, 0, 0, 0)).length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <Bell size={32} className="text-slate-300 mb-2" />
                <p className="text-[11px] font-bold text-[#1e293b]">No upcoming tasks</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

// Helper function (moved outside component to avoid hook issues)
function getRiskBadge(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high': return 'bg-[#FF8B8B]/22 text-[#D66A6A] border-[#FF8B8B]/35';
    case 'medium': return 'bg-[#F08386]/20 text-[#C65E63] border-[#F08386]/30';
    case 'low': return 'bg-[#75D06A]/22 text-[#4D9F46] border-[#75D06A]/35';
  }
}

function getRiskColor(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high': return 'border-red-500 bg-[#FF8B8B]/14';
    case 'medium': return 'border-[#F08386] bg-[#F08386]/12';
    case 'low': return 'border-[#75D06A] bg-[#75D06A]/14';
  }
}

export default TeacherDashboard;


