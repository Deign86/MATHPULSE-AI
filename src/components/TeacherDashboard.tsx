import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Users, BookOpen, TrendingUp, AlertTriangle, Calendar, MessageCircle, 
  CheckCircle, BarChart3, Clock, AlertCircle, ChevronRight, Menu, X,
  Play, FileText, Target, Zap, Award, Upload, FileSpreadsheet, 
  Video, ClipboardCheck, Info, Bell, Search, LayoutDashboard, Database,
  ChevronLeft, Eye, Download, Send, Edit3, Trash2, Save, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton as BoneSkeleton } from 'boneyard-js/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import ConfirmModal from './ConfirmModal';
import LogoutActionButton from './LogoutActionButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import {
  getClassroomsByTeacher,
  getStudentsByClassroom,
  getStudentsByTeacher,
  subscribeToActivityFeed,
  updateStudentRisk,
  assignStudentToClassSection,
  updateManagedStudentSectionAssignment,
  assignClassSectionManager,
  getClassSectionOwnershipByTeacher,
  getTeacherDirectoryOptions,
  addManagedStudentsBatch,
  deleteManagedStudent,
  buildClassSectionId,
  normalizeGradeLevel,
  inferClassification,
  inferStrand,
  parseClassName,
  resolveClassMetadata,
  type Classroom,
  type ManagedStudent,
  type ClassActivity,
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
import type { CurriculumSource } from '../types/curriculum';
import CurriculumSourceBadge from './CurriculumSourceBadge';
import { toast } from 'sonner';
import QuizMaker from './QuizMaker';
import TopicMasteryView from './TopicMasteryView';
import StudentCompetencyTable from './StudentCompetencyTable';
import ChatMarkdown from './ChatMarkdown';
import TeacherNotificationsView from './TeacherNotificationsView';
import TeacherCalendarView from './TeacherCalendarView';
import { Skeleton } from './ui/skeleton';
import type { ClassSectionMetadata } from '../types/models';
import type { ParseWorkbookResult } from '../features/import/services/shsExcel/parser/types';
import { DETECTION_CONFIDENCE_THRESHOLD } from '../features/import/services/shsExcel/parser/constants';
import { parseShsWorkbook } from '../features/import/services/shsExcel/parser';

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
  | 'quiz_maker';

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

interface StudentView {
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
  const [selectedClass, setSelectedClass] = useState<ClassView | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentView | null>(null);

  // Data from Firebase
  const [classes, setClasses] = useState<ClassView[]>([]);
  const [students, setStudents] = useState<StudentView[]>([]);
  const [liveActivity, setLiveActivity] = useState<{ id: string; student: string; action: string; topic: string; time: string; type: string }[]>([]);
  const [dailyInsight, setDailyInsight] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [dataRefreshNonce, setDataRefreshNonce] = useState(0);
  const [teacherDirectory, setTeacherDirectory] = useState<TeacherDirectoryOption[]>([]);
  const [managerUpdating, setManagerUpdating] = useState(false);

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

        const allStudents = await getStudentsByTeacher(teacherId);
        let studentViews = allStudents.map((s) => {
          const sectionLookupKey = normalizeClassSectionId(s.classSectionId || s.classroomId);
          const resolvedClassName =
            classNameLookup.get(s.classroomId)
            || (sectionLookupKey ? classNameLookup.get(sectionLookupKey) : undefined)
            || s.className
            || 'Unknown';
          const mapped = toStudentView(s, resolvedClassName);
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
        });

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
            setStudents((prev) => mergeStudentViews(prev, imported.students.map(toImportedStudentView)));
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

  const teacherName = userProfile?.name || 'Teacher';
  const selectedClassSectionId = useMemo(() => {
    if (!selectedClass) return undefined;
    if (selectedClass.classMetadata?.classSectionId) return selectedClass.classMetadata.classSectionId || undefined;
    if (selectedClass.classSectionId) return selectedClass.classSectionId;
    const parsed = parseClassName(selectedClass.classMetadata?.className || selectedClass.name);
    const computed = buildClassSectionId(parsed.grade, parsed.section);
    return computed || undefined;
  }, [selectedClass]);

  const effectiveAnalyticsClass = useMemo(() => {
    return selectedClass || classes[0] || null;
  }, [selectedClass, classes]);

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
    return (
      <div className="flex h-screen w-full bg-background p-6">
        <div className="hidden lg:flex w-[280px] shrink-0 rounded-3xl border border-border bg-card p-5">
          <div className="w-full space-y-4">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex-1 space-y-4 lg:pl-6">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </div>
      </div>
    );
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
                <h1 className="text-base font-bold font-display text-[#0a1628] whitespace-nowrap">MathPulse AI</h1>
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
              <p className="px-4 mb-2 text-[10px] font-bold text-[#5a6578] uppercase tracking-widest">Overview</p>
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
                active={activeView === 'analytics'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => setActiveView('analytics')}
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
              <p className="px-4 mb-2 text-[10px] font-bold text-[#5a6578] uppercase tracking-widest">Students</p>
            )}
            <div className="space-y-1">
              <NavItem
                icon={Target}
                label="Topic Mastery"
                active={activeView === 'topic_mastery'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => setActiveView('topic_mastery')}
                forceExpanded={isMobileViewport}
              />
              <NavItem
                icon={Users}
                label="Competency"
                active={activeView === 'competency'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => setActiveView('competency')}
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
              <p className="px-4 mb-2 text-[10px] font-bold text-[#5a6578] uppercase tracking-widest">Tools</p>
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
                icon={Bell}
                label="Notifications"
                active={activeView === 'notifications'}
                collapsed={sidebarCollapsed && !sidebarHovered}
                onClick={() => setActiveView('notifications')}
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[#5a6578] font-bold border border-transparent hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628] transition-all duration-200 whitespace-nowrap ${
              sidebarCollapsed && !sidebarHovered ? 'justify-center' : ''
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border px-6 py-3 sticky top-0 z-30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
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
                <h1 className="text-xl font-display font-bold text-foreground leading-tight">
                  {activeView === 'dashboard' && 'Teacher Dashboard'}
                  {activeView === 'analytics' && (selectedClass ? selectedClass.name : 'Class Analytics')}
                  {activeView === 'intervention' && 'Student Intervention'}
                  {activeView === 'topic_mastery' && 'Topic Mastery'}
                  {activeView === 'competency' && 'Student Competency'}
                  {activeView === 'import' && 'Data Import'}
                  {activeView === 'notifications' && 'Notifications'}
                  {activeView === 'calendar' && 'Calendar'}
                  {activeView === 'quiz_maker' && 'AI Quiz Maker'}
                </h1>
                <p className="text-xs text-muted-foreground font-body">
                  {activeView === 'dashboard' && `Welcome back, ${teacherName}`}
                  {activeView === 'analytics' && 'Deep dive into class performance'}
                  {activeView === 'intervention' && selectedStudent?.name}
                  {activeView === 'topic_mastery' && 'Monitor class-wide topic mastery'}
                  {activeView === 'competency' && 'Per-student topic-level breakdown'}
                  {activeView === 'import' && 'Upload class records and materials'}
                  {activeView === 'quiz_maker' && 'Create and manage AI-powered quizzes'}
                  {activeView === 'notifications' && 'View classroom alerts and updates'}
                  {activeView === 'calendar' && 'Check upcoming class events and schedule'}
                </p>
              </div>
              {/* Quick teacher stats */}
              {activeView === 'dashboard' && (
                <div className="hidden xl:flex items-center gap-2 ml-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9956DE]/12 border border-[#9956DE]/30 rounded-lg">
                    <Users size={13} className="text-[#9956DE]" />
                    <span className="text-xs font-display font-bold text-[#9956DE]">{totalStudents} students</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F08386]/12 border border-[#F08386]/30 rounded-lg">
                    <AlertTriangle size={13} className="text-[#F08386]" />
                    <span className="text-xs font-display font-bold text-[#C65E63]">{totalAtRisk} at risk</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#75D06A]/14 border border-[#75D06A]/35 rounded-lg">
                    <TrendingUp size={13} className="text-[#75D06A]" />
                    <span className="text-xs font-display font-bold text-[#4D9F46]">{avgPerformance}% avg</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 bg-muted p-1.5 pr-3 rounded-lg cursor-pointer hover:bg-accent transition-all group max-w-[220px]"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-[#9956DE]/45 bg-card flex items-center justify-center">
                  <img
                    src={userProfile?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=random`}
                    alt={teacherName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:block min-w-0 text-left">
                  <p className="text-sm font-semibold text-foreground leading-none group-hover:text-[#9956DE] transition-colors truncate">{teacherName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-none">Teacher</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <DashboardView
                classes={classes}
                liveActivity={liveActivity}
                onViewClass={handleViewClass}
                onViewAllClasses={() => setActiveView('analytics')}
                dailyInsight={dailyInsight}
                insightLoading={insightLoading}
                totalStudents={totalStudents}
                totalAtRisk={totalAtRisk}
                avgPerformance={avgPerformance}
              />
            )}
            {activeView === 'analytics' && effectiveAnalyticsClass && (
              <AnalyticsView
                selectedClass={effectiveAnalyticsClass}
                students={filteredStudentsForAnalytics}
                riskDistribution={riskDistribution}
                topicPerformance={topicPerformance}
                onViewStudent={handleViewStudent}
                onBack={handleBackToDashboard}
                teacherOptions={teacherDirectory}
                managerUpdating={managerUpdating}
                onAssignManager={(manager) => handleAssignClassManager(effectiveAnalyticsClass, manager)}
              />
            )}
            {activeView === 'analytics' && !effectiveAnalyticsClass && (
              <ToolsPlaceholderView
                icon={BarChart3}
                title="Class Analytics"
                description="No classes available yet. Import class records to unlock analytics views."
              />
            )}
            {activeView === 'intervention' && selectedStudent && (
              <InterventionView
                student={selectedStudent}
                teacherId={currentUser?.uid || ''}
                teacherName={teacherName}
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
              />
            )}
            {activeView === 'topic_mastery' && <TopicMasteryView classSectionId={selectedClassSectionId} />}
            {activeView === 'competency' && (
              <StudentCompetencyTable
                classSectionId={selectedClassSectionId}
                className={selectedClass?.name}
                fallbackStudents={students}
              />
            )}
            {activeView === 'import' && (
              <ImportView
                onEditRecords={() => setActiveView('edit_records')}
                classSectionId={selectedClassSectionId}
                className={selectedClass?.name}
                classMetadata={selectedClass?.classMetadata}
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
            )}
            {activeView === 'notifications' && (
              <TeacherNotificationsView userId={currentUser?.uid || ''} />
            )}
            {activeView === 'calendar' && (
              <TeacherCalendarView />
            )}
            {activeView === 'edit_records' && (
              <EditRecordsView
                students={students}
                teacherId={currentUser?.uid || ''}
                teacherName={teacherName}
                onBack={() => setActiveView('import')}
              />
            )}
            {activeView === 'quiz_maker' && (
              <QuizMaker onBack={() => setActiveView('dashboard')} />
            )}
          </AnimatePresence>
        </main>
      </div>

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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 border whitespace-nowrap ${
      collapsed && !forceExpanded ? 'justify-center' : ''
    } ${
      active
        ? 'bg-[#9956DE]/12 border-[#9956DE]/30 shadow-sm text-[#9956DE]'
        : 'bg-transparent border-transparent text-[#5a6578] hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628]'
    }`}
  >
    <Icon size={18} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
    {(!collapsed || forceExpanded) && <span className="font-body font-bold text-xs">{label}</span>}
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
      <h2 className="text-2xl font-display font-bold text-foreground mb-2">{title}</h2>
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
  dailyInsight: string;
  insightLoading: boolean;
  totalStudents: number;
  totalAtRisk: number;
  avgPerformance: number;
}> = ({ classes, liveActivity, onViewClass, onViewAllClasses, dailyInsight, insightLoading, totalStudents, totalAtRisk, avgPerformance }) => {
  const riskPercentage = totalStudents > 0 ? Math.round((totalAtRisk / totalStudents) * 100) : 0;
  const engagementRate = totalStudents > 0 ? Math.round(((totalStudents - totalAtRisk) / totalStudents) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      {/* Daily AI Insight Banner -€” compact, not dominating */}
      <div className="bg-gradient-to-r from-[#7274ED] to-[#9956DE] rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-card/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-display font-bold mb-1">AI Insight</h2>
            <BoneSkeleton
              name="teacher-dashboard-ai-insight"
              loading={insightLoading}
              fixture={
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-3.5 w-11/12 bg-white/25" />
                  <Skeleton className="h-3.5 w-10/12 bg-white/20" />
                  <Skeleton className="h-3.5 w-8/12 bg-white/15" />
                </div>
              }
              fallback={
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-3.5 w-11/12 bg-white/25" />
                  <Skeleton className="h-3.5 w-10/12 bg-white/20" />
                  <Skeleton className="h-3.5 w-8/12 bg-white/15" />
                </div>
              }
            >
              <div className="text-[#F1E4FF] text-sm leading-relaxed [&_p]:m-0 [&_strong]:font-semibold">
                <ChatMarkdown>
                  {dailyInsight || `${totalAtRisk} students (${riskPercentage}%) are at high risk of falling behind`}
                </ChatMarkdown>
              </div>
            </BoneSkeleton>
          </div>
        </div>
      </div>

      {/* Quick Stats Row -€” moved from inside the banner for better visibility */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-body mb-1">Total Students</p>
          <p className="text-2xl font-display font-bold text-foreground">{totalStudents}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-body mb-1">Class Average</p>
          <p className="text-2xl font-display font-bold text-[#9956DE]">{avgPerformance}%</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-body mb-1">Engagement Rate</p>
          <p className="text-2xl font-display font-bold text-[#75D06A]">{engagementRate}%</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-[#FF8B8B]/35 shadow-sm">
          <p className="text-xs text-muted-foreground font-body mb-1">At Risk</p>
          <p className="text-2xl font-display font-bold text-[#FF8B8B]">{totalAtRisk}</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* My Classes - 2 columns */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-foreground">My Classes</h2>
            <button
              onClick={onViewAllClasses}
              className="text-sm font-bold text-[#9956DE] hover:text-[#9956DE] flex items-center gap-1 group"
            >
              View All
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="space-y-4">
            {classes.map((classItem) => (
              <motion.div
                key={classItem.id}
                whileHover={{ scale: 1.01 }}
                className={`bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer`}
                onClick={() => onViewClass(classItem)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-display font-bold text-foreground">{classItem.name}</h3>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getRiskBadge(classItem.riskLevel)}`}>
                        {classItem.riskLevel === 'high' ? 'High Risk' : classItem.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock size={14} />
                      <span>{classItem.schedule}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[classItem.gradeLevel, classItem.classification, classItem.strand]
                        .filter(Boolean)
                        .map((badge) => (
                          <span key={`${classItem.id}-${badge}`} className="px-2 py-0.5 rounded-md bg-[#9956DE]/12 border border-[#9956DE]/30 text-[#9956DE] text-[11px] font-semibold">
                            {badge}
                          </span>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Manager: {classItem.managerName || classItem.classMetadata?.managerName || 'Not assigned'}
                    </p>
                  </div>
                  <Button className="bg-[#9956DE] hover:bg-[#7A44B3] text-white font-bold px-6 py-2 rounded-xl">
                    View Class
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Students</p>
                    <p className="text-xl font-bold text-foreground">{classItem.studentCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">At Risk</p>
                    <p className="text-xl font-bold text-[#FF8B8B]">{classItem.atRiskCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
                    <p className="text-xl font-bold text-[#9956DE]">{classItem.avgScore}%</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Classroom Pulse - 1 column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#F08386]/20 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-[#F08386]" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">Live Classroom Pulse</h2>
          </div>

          <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-3 max-h-[600px] overflow-y-auto">
            {liveActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No live classroom events yet. Activity appears here in real time.</p>
            )}
            {liveActivity.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 rounded-xl border-l-4 ${
                  activity.type === 'success' ? 'bg-[#75D06A]/14 border-[#75D06A]' :
                  activity.type === 'warning' ? 'bg-[#F08386]/12 border-[#F08386]' :
                  'bg-[#9956DE]/12 border-[#9956DE]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-foreground text-sm">{activity.student}</p>
                  <span className="text-xs text-slate-500">{activity.time}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.action} <span className="font-bold text-foreground">{activity.topic}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Analytics View
const AnalyticsView: React.FC<{
  selectedClass: ClassView;
  students: StudentView[];
  riskDistribution: { name: string; value: number; color: string }[];
  topicPerformance: { topic: string; score: number }[];
  onViewStudent: (student: StudentView) => void;
  onBack: () => void;
  teacherOptions: TeacherDirectoryOption[];
  managerUpdating: boolean;
  onAssignManager: (manager: TeacherDirectoryOption) => void | Promise<void>;
}> = ({
  selectedClass,
  students,
  riskDistribution,
  topicPerformance,
  onViewStudent,
  onBack,
  teacherOptions,
  managerUpdating,
  onAssignManager,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');

  useEffect(() => {
    setSelectedManagerId(selectedClass.classMetadata?.managerId || selectedClass.managerId || '');
  }, [selectedClass]);

  const visibleStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(query)
        || (student.lrn || '').toLowerCase().includes(query)
        || (student.weakestTopic || '').toLowerCase().includes(query)
      );
    });
  }, [searchTerm, students]);

  const averageCompletion = useMemo(() => {
    if (students.length === 0) return 0;
    const total = students.reduce((sum, student) => sum + (student.assignmentCompletion || 0), 0);
    return Math.round(total / students.length);
  }, [students]);

  const participationRate = useMemo(() => {
    if (students.length === 0) return 0;
    const attendanceAverage = students.reduce((sum, student) => sum + (student.attendance || 0), 0) / students.length;
    const engagementAverage = students.reduce((sum, student) => sum + (student.engagementScore || 0), 0) / students.length;
    return Math.round((attendanceAverage * 0.6) + (engagementAverage * 0.4));
  }, [students]);

  const topPerformers = useMemo(() => {
    return [...students]
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);
  }, [students]);

  const attentionStudents = useMemo(() => {
    return [...students]
      .filter((student) => student.riskLevel === 'high' || student.avgScore < 70 || student.assignmentCompletion < 65)
      .sort((a, b) => {
        if (a.riskLevel !== b.riskLevel) {
          const rank = { high: 3, medium: 2, low: 1 };
          return rank[b.riskLevel] - rank[a.riskLevel];
        }
        return a.avgScore - b.avgScore;
      })
      .slice(0, 6);
  }, [students]);

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
      className="p-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-[#9956DE] font-bold mb-6 transition-colors group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-foreground">{selectedClass.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getRiskBadge(selectedClass.riskLevel)}`}>
                {selectedClass.riskLevel === 'high' ? 'High Risk Cohort' : selectedClass.riskLevel === 'medium' ? 'Medium Risk Cohort' : 'Low Risk Cohort'}
              </span>
              {classBadges.map((badge) => (
                <span key={badge} className="px-3 py-1 rounded-lg text-xs font-semibold border bg-[#9956DE]/12 border-[#9956DE]/30 text-[#9956DE]">
                  {badge}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Manager: {selectedClass.classMetadata?.managerName || selectedClass.managerName || 'Not assigned'}
            </p>
          </div>

          <div className="min-w-[260px] bg-muted rounded-xl p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Section Manager</p>
            <div className="flex gap-2">
              <select
                id="analytics-section-manager-select"
                name="analytics-section-manager-select"
                aria-label="Select section manager"
                value={selectedManagerId || ''}
                onChange={(event) => setSelectedManagerId(event.target.value)}
                className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <option value="">Select teacher</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher.uid} value={teacher.uid}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
              <Button
                onClick={handleAssignManager}
                disabled={!selectedManagerId || managerUpdating}
                className="bg-[#9956DE] hover:bg-[#7A44B3] text-white"
              >
                {managerUpdating ? <Skeleton className="h-4 w-12 bg-white/35" /> : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Class Average</p>
          <p className="text-2xl font-display font-bold text-[#9956DE]">{selectedClass.avgScore}%</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Completion Rate</p>
          <p className="text-2xl font-display font-bold text-[#75D06A]">{averageCompletion}%</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Participation</p>
          <p className="text-2xl font-display font-bold text-[#9956DE]">{participationRate}%</p>
        </div>
        <div className="bg-card border border-[#FF8B8B]/35 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Needs Attention</p>
          <p className="text-2xl font-display font-bold text-[#FF8B8B]">{attentionStudents.length}</p>
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Column - Student List */}
        <div className="xl:col-span-2 bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-bold text-foreground">Students ({visibleStudents.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                id="analytics-student-search"
                name="analytics-student-search"
                aria-label="Search students"
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-40 pl-9 pr-4 py-2 rounded-xl border-border text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto">
            {visibleStudents.map((student) => (
              <motion.div
                key={buildStudentViewKey(student)}
                whileHover={{ scale: 1.02 }}
                onClick={() => onViewStudent(student)}
                className={`p-4 rounded-2xl border-2 cursor-pointer hover:shadow-md transition-all ${getRiskColor(student.riskLevel)}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-current"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground">{student.name}</h4>
                    <p className="text-xs text-muted-foreground">{student.lastActive}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">Avg Score</span>
                    <span className="text-xs font-bold text-foreground">{student.avgScore}%</span>
                  </div>
                  <div className="h-2 bg-card rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        student.riskLevel === 'high' ? 'bg-[#FF8B8B]' :
                        student.riskLevel === 'medium' ? 'bg-[#F08386]' :
                        'bg-[#75D06A]'
                      }`}
                      style={{ width: `${student.avgScore}%` }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            ))}
            {visibleStudents.length === 0 && (
              <div className="border border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground">
                No students match your search.
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Charts */}
        <div className="xl:col-span-3 space-y-6">
          {/* Risk Distribution */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <h2 className="text-lg font-display font-bold text-foreground mb-5">Risk Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Topic Performance */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <h2 className="text-lg font-display font-bold text-foreground mb-5">Topic Performance</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#9956DE" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-display font-bold text-foreground mb-3">Top Performers</h3>
              <div className="space-y-2">
                {topPerformers.slice(0, 4).map((student) => (
                  <button
                    key={`top-${buildStudentViewKey(student)}`}
                    onClick={() => onViewStudent(student)}
                    className="w-full flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-[#9956DE]/12 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">{student.name}</span>
                    <span className="text-xs font-bold text-[#75D06A]">{student.avgScore}%</span>
                  </button>
                ))}
                {topPerformers.length === 0 && (
                  <p className="text-xs text-muted-foreground">No students available yet.</p>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-display font-bold text-foreground mb-3">Students Needing Attention</h3>
              <div className="space-y-2">
                {attentionStudents.slice(0, 4).map((student) => (
                  <button
                    key={`attention-${buildStudentViewKey(student)}`}
                    onClick={() => onViewStudent(student)}
                    className="w-full flex items-center justify-between rounded-lg border border-[#FF8B8B]/35 bg-[#FF8B8B]/14 px-3 py-2 hover:bg-[#FF8B8B]/20 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">{student.name}</span>
                    <span className="text-xs font-bold text-[#FF8B8B]">{student.riskLevel.toUpperCase()}</span>
                  </button>
                ))}
                {attentionStudents.length === 0 && (
                  <p className="text-xs text-muted-foreground">No urgent students in this class right now.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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
}> = ({ student, teacherId, teacherName, onStudentUpdated, onBack }) => {
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
  const [learningPath, setLearningPath] = useState<string>('');
  const [pathLoading, setPathLoading] = useState(true);
  const [gradeDraft, setGradeDraft] = useState(student.grade || 'Grade 11');
  const [sectionDraft, setSectionDraft] = useState(student.section || 'Section A');
  const [savingSection, setSavingSection] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlanResponse | null>(null);
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

  useEffect(() => {
    setGradeDraft(student.grade || 'Grade 11');
    setSectionDraft(student.section || 'Section A');
  }, [student.grade, student.section]);

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
  }, [generateTargetedLessonPlan]);

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

  const remedialSteps = [
    { id: 1, type: 'video', title: `${student.weakestTopic} Fundamentals`, duration: '8 mins', icon: Video },
    { id: 2, type: 'quiz', title: `${student.weakestTopic} Practice`, questions: 10, icon: ClipboardCheck },
    { id: 3, type: 'assessment', title: 'Final Check', questions: 5, icon: CheckCircle }
  ];

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-[#9956DE] font-bold mb-6 transition-colors group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Analytics
      </button>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Student Header */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <div className="flex items-start gap-6">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-24 h-24 rounded-2xl object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-display font-bold text-foreground">{student.name}</h1>
                <span className={`px-4 py-1.5 rounded-xl text-sm font-bold border-2 ${getRiskBadge(student.riskLevel)}`}>
                  {student.riskLevel === 'high' ? 'High Risk' : student.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                </span>
              </div>
              <p className="text-muted-foreground mb-4">{student.className}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
                  <p className="text-2xl font-bold text-foreground">{student.avgScore}%</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Last Active</p>
                  <p className="text-sm font-bold text-foreground">{student.lastActive}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Weakest Topic</p>
                  <p className="text-sm font-bold text-[#FF8B8B]">{student.weakestTopic}</p>
                </div>
              </div>

              <div className="mt-5 p-4 bg-[#9956DE]/12 border border-[#9956DE]/30 rounded-xl">
                <p className="text-xs font-semibold text-[#9956DE] mb-3 uppercase tracking-wider">Section Assignment</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    value={gradeDraft}
                    onChange={(e) => setGradeDraft(e.target.value)}
                    placeholder="Grade"
                    className="h-10"
                  />
                  <Input
                    value={sectionDraft}
                    onChange={(e) => setSectionDraft(e.target.value)}
                    placeholder="Section"
                    className="h-10"
                  />
                  <Button
                    onClick={handleSaveSectionAssignment}
                    disabled={savingSection || (!gradeDraft.trim() || !sectionDraft.trim())}
                    className="bg-[#9956DE] hover:bg-[#7A44B3] text-white h-10"
                  >
                    {savingSection ? <Skeleton className="h-4 w-20 bg-white/35" /> : 'Save Section'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className={`${analysisTone.card} border-2 rounded-2xl p-6`}>
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 ${analysisTone.icon} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <AlertCircle size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground mb-2">
                {isUrgentBarrier ? 'AI Analysis - Learning Barriers' : 'AI Analysis - Learning Strengths & Next Steps'}
              </h2>
              {analysisCurriculumContext && (
                <CurriculumSourceBadge
                  sources={lessonCurriculumSources}
                  className="mt-1"
                />
              )}
              <BoneSkeleton
                name="teacher-intervention-analysis"
                loading={pathLoading}
                fixture={
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-3.5 w-64" />
                    <Skeleton className="h-3.5 w-56" />
                    <Skeleton className="h-3.5 w-44" />
                  </div>
                }
                fallback={
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-3.5 w-64" />
                    <Skeleton className="h-3.5 w-56" />
                    <Skeleton className="h-3.5 w-44" />
                  </div>
                }
              >
                <ul className="space-y-2 text-foreground">
                  {student.struggles.length > 0 ? (
                    student.struggles.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`${analysisTone.bullet} inline-flex h-5 items-center`}>&bull;</span>
                        <span>
                          {isUrgentBarrier ? 'Struggles with ' : 'Continue strengthening '}
                          <strong>{s}</strong>
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="flex items-start gap-2">
                      <span className={`${analysisTone.bullet} inline-flex h-5 items-center`}>&bull;</span>
                      <span>
                        {isUrgentBarrier ? 'Needs support in ' : 'Maintain momentum in '}
                        <strong>{student.weakestTopic}</strong>
                      </span>
                    </li>
                  )}
                </ul>
              </BoneSkeleton>
            </div>
          </div>
        </div>

        {/* AI-Generated Learning Path */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <h2 className="text-xl font-display font-bold text-foreground mb-6">AI-Generated Learning Path</h2>

          <BoneSkeleton
            name="teacher-intervention-learning-path"
            loading={pathLoading}
            fixture={
              <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            }
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            }
          >
            {learningPath ? (
              <div className="bg-[#9956DE]/12 border border-[#9956DE]/30 rounded-xl p-5 mb-6 text-sm text-foreground">
                <ChatMarkdown>{learningPath}</ChatMarkdown>
              </div>
            ) : null}

            <div className="space-y-4 relative">
              {/* Vertical Timeline Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border"></div>

              {remedialSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-16"
                  >
                    {/* Step Number Circle */}
                    <div className="absolute left-0 w-12 h-12 bg-gradient-to-br from-[#7274ED] to-[#9956DE] rounded-xl flex items-center justify-center shadow-md">
                      <Icon size={24} className="text-white" />
                    </div>

                    {/* Step Content */}
                    <div className="bg-gradient-to-br from-[#9956DE]/12 to-[#6ED1CF]/18 border border-[#9956DE]/30 rounded-2xl p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-display font-bold text-foreground mb-1">{step.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {step.type === 'video' && `${(step as { duration?: string }).duration} video lesson`}
                            {step.type === 'quiz' && `${(step as { questions?: number }).questions} practice questions`}
                            {step.type === 'assessment' && `${(step as { questions?: number }).questions} assessment questions`}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          step.type === 'video' ? 'bg-[#F08386]/20 text-[#C65E63]' :
                          step.type === 'quiz' ? 'bg-[#9956DE]/20 text-[#9956DE]' :
                          'bg-[#75D06A]/22 text-[#4D9F46]'
                        }`}>
                          {step.type === 'video' ? 'Video' : step.type === 'quiz' ? 'Quiz' : 'Assessment'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </BoneSkeleton>
        </div>

        {/* Import-grounded Lesson Plan */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Targeted Lesson Plan</h2>
              <p className="text-sm text-muted-foreground">Class records drive risk signals. Import-grounded lesson generation needs uploaded course materials for topic context.</p>
            </div>
            <Button
              onClick={() => void generateTargetedLessonPlan()}
              disabled={lessonLoading}
              className="bg-[#9956DE] hover:bg-[#7A44B3] text-white"
            >
              {lessonLoading ? <Skeleton className="h-4 w-20 bg-white/35" /> : 'Regenerate'}
            </Button>
          </div>

          <p className="mb-4 text-xs text-muted-foreground bg-[#9956DE]/12 border border-[#9956DE]/30 rounded-lg px-3 py-2">
            Class records alone are not enough for import-grounded lesson plans. Upload course materials in Data Import to provide lesson topic grounding.
          </p>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground bg-[#f8fafc] border border-border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={allowReviewSources}
                onChange={(event) => setAllowReviewSources(event.target.checked)}
              />
              Allow sources requiring manual review
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground bg-[#f8fafc] border border-border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={allowUnverifiedLesson}
                onChange={(event) => setAllowUnverifiedLesson(event.target.checked)}
              />
              Allow unverified lesson draft (publish remains blocked)
            </label>
          </div>

          <BoneSkeleton
            name="teacher-intervention-lesson-plan"
            loading={lessonLoading}
            fixture={
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            }
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            }
          >
            {lessonError && (
              <div className="bg-[#FF8B8B]/14 border border-[#FF8B8B]/35 rounded-xl p-3 text-sm text-[#D66A6A]">
                {lessonError}
              </div>
            )}

            {lessonPlan && (
              <div className="space-y-4">
                <div className="bg-secondary border border-border rounded-xl p-4">
                  <div className="mb-2">
                    <CurriculumSourceBadge sources={lessonCurriculumSources} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{lessonPlan.lessonTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imported topics used: {lessonPlan.usedImportedTopics ? 'Yes' : 'No'}
                    {' \u2022 '}Imported topic count: {lessonPlan.importedTopicCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Subject: {lessonPlan.subject || 'general_math'} {' \u2022 '}Quarter: Q{lessonPlan.quarter || 1}
                  </p>
                  {lessonPlan.curriculumCompetency && (
                    <p className="text-xs text-[#9956DE] font-semibold mt-1">
                      Competency: {lessonPlan.curriculumCompetency}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Publish readiness: {lessonPlan.publishReady ? 'Ready' : 'Blocked'}
                  </p>
                  {lessonPlan.warnings.length > 0 && (
                    <p className="text-xs text-[#CC8A37] mt-1">{lessonPlan.warnings.join(' ')}</p>
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Curriculum Grounding</p>
                      <p className="text-sm font-bold text-foreground mt-1">Source-backed lesson basis</p>
                    </div>
                    {lessonPlan.curriculumGrounding && (
                      <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${lessonPlan.curriculumGrounding.confidenceBand === 'high' ? 'bg-[#75D06A]/15 text-[#2E7D32] border-[#75D06A]/40' : lessonPlan.curriculumGrounding.confidenceBand === 'medium' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-[#FF8B8B]/14 text-[#C65E63] border-[#FF8B8B]/35'}`}>
                        {lessonPlan.curriculumGrounding.confidenceBand.toUpperCase()} confidence
                      </span>
                    )}
                  </div>

                  {lessonPlan.lessonObjective && (
                    <div className="bg-muted/60 rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lesson objective</p>
                      <p className="text-sm text-foreground mt-1">{lessonPlan.lessonObjective}</p>
                    </div>
                  )}

                  {lessonPlan.realWorldHook && (
                    <div className="bg-[#9956DE]/10 border border-[#9956DE]/20 rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-[#9956DE] uppercase tracking-wider">Real-life application</p>
                      <p className="text-sm text-foreground mt-1">{lessonPlan.realWorldHook}</p>
                    </div>
                  )}

                  {lessonPlan.curriculumGrounding && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-muted-foreground font-semibold">Retrieval confidence</p>
                        <p className="text-sm font-bold text-foreground mt-1">{Math.round((lessonPlan.curriculumGrounding.confidence || 0) * 100)}%</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-muted-foreground font-semibold">Retrieved chunks</p>
                        <p className="text-sm font-bold text-foreground mt-1">{lessonPlan.curriculumGrounding.retrievedChunks}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-muted-foreground font-semibold">Review state</p>
                        <p className="text-sm font-bold text-foreground mt-1">{lessonPlan.needsReview ? 'Needs review' : 'Ready for review'}</p>
                      </div>
                    </div>
                  )}

                  {lessonPlan.explanation && (
                    <div className="bg-card border border-border rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Explanation</p>
                      <p className="text-sm text-foreground leading-relaxed">{lessonPlan.explanation}</p>
                    </div>
                  )}

                  <details className="group rounded-xl border border-border bg-card p-3">
                    <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between gap-2">
                      Retrieved source snippets
                      <span className="text-[11px] text-[#9956DE] group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <div className="mt-3 space-y-2">
                      {(lessonPlan.retrievedEvidence?.length || 0) > 0 ? (
                        lessonPlan.retrievedEvidence?.map((source, index) => (
                          <div key={`${source.sourceFile || 'source'}-${source.page || index}`} className="rounded-xl bg-muted/60 border border-border p-3">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">{source.sourceFile || 'Curriculum source'}</span>
                              <span>p.{source.page || '?'}</span>
                              <span>{source.contentDomain || 'n/a'}</span>
                              <span>score {(source.score * 100).toFixed(1)}%</span>
                            </div>
                            <p className="text-sm text-foreground mt-2 leading-relaxed">{source.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No retrieved snippets were returned.</p>
                      )}
                    </div>
                  </details>

                  {lessonPlan.sourceCitations && lessonPlan.sourceCitations.length > 0 && (
                    <div className="rounded-xl bg-muted/50 border border-border p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Source citations</p>
                      <div className="flex flex-wrap gap-2">
                        {lessonPlan.sourceCitations.slice(0, 6).map((citation) => (
                          <span key={citation} className="px-2 py-1 rounded-full bg-card border border-border text-[11px] text-foreground">
                            {citation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-xl p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Source Legitimacy</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {lessonPlan.sourceLegitimacy.status} ({Math.round(lessonPlan.sourceLegitimacy.score * 100)}%)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verified: {lessonPlan.sourceLegitimacy.verifiedMaterials} {' \u2022 '}Review: {lessonPlan.sourceLegitimacy.reviewMaterials} {' \u2022 '}Rejected: {lessonPlan.sourceLegitimacy.rejectedMaterials}
                    </p>
                    {lessonPlan.sourceLegitimacy.issues.length > 0 && (
                      <p className="text-xs text-[#CC8A37] mt-1">{lessonPlan.sourceLegitimacy.issues.slice(0, 2).join(' ')}</p>
                    )}
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Self Validation</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {lessonPlan.selfValidation.passed ? 'Passed' : 'Failed'} ({Math.round(lessonPlan.selfValidation.score * 100)}%)
                    </p>
                    {lessonPlan.selfValidation.issues.length > 0 && (
                      <p className="text-xs text-[#CC8A37] mt-1">{lessonPlan.selfValidation.issues.slice(0, 2).join(' ')}</p>
                    )}
                  </div>
                </div>

                {(lessonProvenanceSources.length > 0 || lessonProvenanceMaterials.length > 0) && (
                  <div className="bg-card border border-border rounded-xl p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Provenance Filters</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label className="text-xs text-muted-foreground flex flex-col gap-1">
                        <span className="font-semibold">Source File</span>
                        <select
                          value={lessonSourceFilter}
                          onChange={(event) => setLessonSourceFilter(event.target.value)}
                          className="bg-card border border-border rounded-md px-2 py-1.5 text-xs"
                        >
                          <option value="all">All sources</option>
                          {lessonProvenanceSources.map((source) => (
                            <option key={source} value={source}>{source}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground flex flex-col gap-1">
                        <span className="font-semibold">Material ID</span>
                        <select
                          value={lessonMaterialFilter}
                          onChange={(event) => setLessonMaterialFilter(event.target.value)}
                          className="bg-card border border-border rounded-md px-2 py-1.5 text-xs"
                        >
                          <option value="all">All materials</option>
                          {lessonProvenanceMaterials.map((material) => (
                            <option key={material} value={material}>{material}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Showing {filteredLessonBlocks.length} of {lessonPlan.blocks.length} lesson blocks after provenance filters.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredLessonBlocks.map((block) => (
                    <div key={block.blockId} className="border border-border rounded-xl p-4 bg-[#fcfdff]">
                      <h3 className="text-sm font-bold text-foreground">{block.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{block.estimatedMinutes} mins {' \u2022 '} {block.strategy}</p>
                      <p className="text-sm text-foreground mt-2">{block.objective}</p>
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Activities</p>
                        {block.activities.slice(0, 2).map((activity, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">{'\u2022'} {activity}</p>
                        ))}
                      </div>
                      {block.provenance && (
                        <div className="mt-3 bg-[#9956DE]/12 border border-[#9956DE]/30 rounded-lg p-2">
                          <p className="text-[11px] font-semibold text-[#9956DE]">Provenance</p>
                          {block.provenance.sourceFile && <p className="text-[11px] text-[#5E3388]">Source: {block.provenance.sourceFile}</p>}
                          {block.provenance.materialId && <p className="text-[11px] text-[#5E3388]">Material: {block.provenance.materialId}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {filteredLessonBlocks.length === 0 && (
                  <div className="border border-border rounded-xl p-4 bg-card text-sm text-muted-foreground">
                    No lesson blocks match the selected provenance filters. Clear one or both filters to view all blocks.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void saveLessonDraft()}
                    disabled={savingLessonDraft || !lessonPlan}
                    className="border-[#9956DE]/45 text-[#9956DE]"
                  >
                    {savingLessonDraft ? <Skeleton className="h-4 w-16" /> : 'Save Draft'}
                  </Button>
                  <Button
                    onClick={() => void publishCurrentLessonPlan()}
                    disabled={publishingLesson || !lessonPlan || !lessonPlan.publishReady}
                    className="bg-[#75D06A] hover:bg-[#5AB84E] text-white"
                  >
                    {publishingLesson ? <Skeleton className="h-4 w-24 bg-white/35" /> : 'Publish Lesson Plan'}
                  </Button>
                  {savedLessonPlanId && (
                    <p className="text-xs text-muted-foreground self-center">Draft ID: {savedLessonPlanId}</p>
                  )}
                </div>
              </div>
            )}
          </BoneSkeleton>

          <div className="grid grid-cols-2 gap-4">
            <Button className="bg-[#9956DE] hover:bg-[#7A44B3] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
              <Send size={20} />
              Schedule One-on-One Session
            </Button>
            <Button
              variant="outline"
              className="border-2 border-[#9956DE] text-[#9956DE] hover:bg-[#9956DE]/12 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Export Printed Materials
            </Button>
          </div>
        </div>
      </div>
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
          <h2 className="text-xl font-display font-bold text-foreground">Import Data</h2>
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
            className={`bg-card border-4 border-dashed rounded-3xl p-6 transition-all ${
              dragOver1 ? 'border-[#9956DE] bg-[#9956DE]/12' : 'border-border'
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
              <h3 className="text-xl font-display font-bold text-foreground mb-2">Class Records</h3>
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
              <Button className="bg-card border-2 border-border text-muted-foreground hover:border-[#9956DE] hover:text-[#9956DE] font-bold px-6 py-3 rounded-xl w-full transition-colors">
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
            className={`bg-card border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer hover:border-[#F08386]/60 hover:bg-[#F08386]/12 ${
              dragOver2 ? 'border-[#F08386] bg-[#F08386]/12 scale-105' : 'border-border'
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
            <h3 className="text-xl font-display font-bold text-foreground mb-2">Course Materials</h3>
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
            <Button className="bg-card border-2 border-border text-muted-foreground hover:border-[#F08386] hover:text-[#F08386] font-bold px-6 py-3 rounded-xl w-full transition-colors">
              Click or drag & drop
            </Button>
          </div>

        </div>

        {shsExcelResult && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-base font-display font-bold text-foreground mb-2">Workbook Preview Summary</h3>
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
          <h3 className="text-lg font-display font-bold text-[#7A44B3] mb-3">How AI Uses Your Data</h3>
          <div className="space-y-2 text-[#5E3388]/80 text-sm">
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-bold">&bull;</span>
              <span><strong className="text-[#7A44B3]">Smart Format Detection:</strong> AI understands various spreadsheet formats and column names</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-bold">&bull;</span>
              <span>Analyzes historical performance patterns to predict at-risk students</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-bold">&bull;</span>
              <span>Maps curriculum topics to student knowledge gaps</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-bold">&bull;</span>
              <span>Generates personalized remedial learning paths</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#9956DE] font-bold">&bull;</span>
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
              <h3 className="text-lg font-display font-bold text-foreground">Import Interpretation</h3>
              <span className="text-xs px-2 py-1 rounded bg-muted text-[#334155]">
                Intent: {uploadInterpretation.datasetIntent || 'synthetic_student_records'}
              </span>
            </div>

            {uploadInterpretation.summary && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-[#f8fbff] border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Scoring</p>
                  <p className="text-lg font-bold text-foreground">{uploadInterpretation.summary.scoringColumns}</p>
                </div>
                <div className="bg-[#f8fbff] border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Display</p>
                  <p className="text-lg font-bold text-foreground">{uploadInterpretation.summary.displayColumns}</p>
                </div>
                <div className="bg-[#FFB356]/16 border border-[#FFB356]/38 rounded-xl p-3">
                  <p className="text-xs text-[#CC8A37]">Storage-only</p>
                  <p className="text-lg font-bold text-[#A56D29]">{uploadInterpretation.summary.storageOnlyColumns}</p>
                </div>
                <div className="bg-[#F08386]/12 border border-[#F08386]/30 rounded-xl p-3">
                  <p className="text-xs text-[#C65E63]">Low confidence</p>
                  <p className="text-lg font-bold text-[#A74B50]">{uploadInterpretation.summary.lowConfidenceColumns}</p>
                </div>
                <div className="bg-[#f8fbff] border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Domain warnings</p>
                  <p className="text-lg font-bold text-foreground">{uploadInterpretation.summary.domainMismatchWarnings}</p>
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
          <h3 className="text-lg font-display font-bold text-foreground mb-4">Manage Imported Data</h3>
          <button 
            onClick={onEditRecords}
            className="w-full bg-[#00a86b] hover:bg-[#008f5d] text-white rounded-xl p-5 flex items-center justify-between transition-all shadow-sm hover:shadow-md group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-card/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Edit3 size={24} className="text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-lg">Edit Class Records</h4>
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
            <h1 className="text-2xl font-display font-bold text-foreground">Edit Class Records</h1>
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
                <th className="p-4 font-bold text-muted-foreground border-b border-border bg-background">Student Name</th>
                <th className="p-4 font-bold text-muted-foreground border-b border-border bg-background">LRN</th>
                <th className="p-4 font-bold text-muted-foreground border-b border-border bg-background">Grade</th>
                <th className="p-4 font-bold text-muted-foreground border-b border-border bg-background">Section</th>
                <th className="p-4 font-bold text-muted-foreground border-b border-border bg-background">Avg Score</th>
                <th className="p-4 font-bold text-muted-foreground border-b border-border bg-background">Risk Level</th>
                <th className="p-4 font-bold text-muted-foreground border-b border-border bg-background">Weakest Topic</th>
                <th className="p-4 font-bold text-muted-foreground border-b border-border bg-background">Actions</th>
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
                      <span className={`font-bold ${
                        student.avgScore < 60 ? 'text-[#FF8B8B]' :
                        student.avgScore < 80 ? 'text-[#F08386]' : 'text-green-600'
                      }`}>{student.avgScore}%</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskBadge(student.riskLevel)}`}>
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

