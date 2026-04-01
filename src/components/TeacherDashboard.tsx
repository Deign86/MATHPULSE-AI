import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Users, BookOpen, TrendingUp, AlertTriangle, Calendar, MessageCircle, 
  CheckCircle, BarChart3, Clock, AlertCircle, ChevronRight, Menu, X,
  Play, FileText, Target, Zap, Award, Upload, FileSpreadsheet, 
  Video, ClipboardCheck, Info, Bell, Search, LayoutDashboard, Database,
  ChevronLeft, Eye, Download, Send, Edit3, Trash2, Save, Loader2, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  addManagedStudentsBatch,
  deleteManagedStudent,
  type Classroom,
  type ManagedStudent,
  type ClassActivity,
} from '../services/studentService';
import {
  apiService,
  ApiError,
  type ImportedClassOverviewResponse,
  type LessonPlanResponse,
  type UploadResponse,
} from '../services/apiService';
import { publishLessonPlan, saveGeneratedLessonPlan } from '../services/lessonPlanService';
import { toast } from 'sonner';
import QuizMaker from './QuizMaker';
import TopicMasteryView from './TopicMasteryView';
import StudentCompetencyTable from './StudentCompetencyTable';
import ChatMarkdown from './ChatMarkdown';

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
  section: string;
  classSectionId?: string;
  lastActive: string;
  struggles: string[];
  engagementScore: number;
  attendance: number;
  assignmentCompletion: number;
}

function toClassView(c: Classroom): ClassView {
  const riskLevel = c.atRiskCount >= 5 ? 'high' : c.atRiskCount >= 2 ? 'medium' : 'low';
  return {
    id: c.id,
    name: c.name,
    classSectionId: c.classSectionId,
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
  const [derivedGrade = '', derivedSection = ''] = className.split(' - ');
  const grade = s.grade || derivedGrade || 'Grade 11';
  const section = s.section || derivedSection || 'Section A';
  return {
    id: s.id,
    lrn: s.lrn,
    name: s.name,
    avatar: s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
    avgScore: s.avgQuizScore,
    riskLevel,
    weakestTopic: s.weakestTopic || 'N/A',
    classroomId: s.classroomId,
    className: [grade, section].filter(Boolean).join(' - ') || className,
    grade,
    section,
    classSectionId: s.classSectionId,
    lastActive: lastActiveStr,
    struggles: s.struggles || [],
    engagementScore: s.engagementScore,
    attendance: s.attendance,
    assignmentCompletion: s.assignmentCompletion,
  };
}

function toImportedClassView(c: ImportedClassOverviewResponse['classrooms'][number]): ClassView {
  const riskLevel = c.atRiskCount >= 5 ? 'high' : c.atRiskCount >= 2 ? 'medium' : 'low';
  return {
    id: c.id,
    name: c.name,
    classSectionId: c.classSectionId || undefined,
    schedule: c.schedule || 'Mon-Fri',
    studentCount: c.studentCount,
    avgScore: c.avgScore,
    atRiskCount: c.atRiskCount,
    riskLevel,
  };
}

function toImportedStudentView(s: ImportedClassOverviewResponse['students'][number]): StudentView {
  const riskLevel = (s.riskLevel || 'Low').toLowerCase() as 'high' | 'medium' | 'low';
  const className = s.className || [s.grade, s.section].filter(Boolean).join(' - ') || 'Imported Class';
  return {
    id: s.id,
    lrn: s.lrn || undefined,
    name: s.name,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
    avgScore: s.avgQuizScore,
    riskLevel,
    weakestTopic: s.weakestTopic || 'Foundational Skills',
    classroomId: s.classSectionId || className,
    className,
    grade: s.grade || className.split(' - ')[0] || 'Grade 11',
    section: s.section || className.split(' - ')[1] || 'Section A',
    classSectionId: s.classSectionId || undefined,
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
): StudentView {
  const resolvedClassName = className || 'Imported Class';
  const [derivedGrade = '', derivedSection = ''] = resolvedClassName.split(' - ');
  const resolvedClassSectionId = classSectionId || buildClassSectionId(derivedGrade, derivedSection) || 'imported_class';
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
    grade: derivedGrade || 'Grade 11',
    section: derivedSection || 'Section A',
    classSectionId: resolvedClassSectionId,
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
): { classSectionId: string; className: string } {
  const responseClassSectionId = result.dashboardSync?.classSectionId || fallbackClassSectionId || '';
  const responseClassName = fallbackClassName || 'Imported Class';

  if (responseClassSectionId) {
    return {
      classSectionId: responseClassSectionId,
      className: responseClassName,
    };
  }

  const [grade = 'Grade 11', section = 'Section A'] = responseClassName.split(' - ');
  const computedSectionId = buildClassSectionId(grade, section) || 'imported_class';
  return {
    classSectionId: computedSectionId,
    className: responseClassName,
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

function buildClassSectionId(grade: string, section: string): string {
  return [grade, section]
    .filter(Boolean)
    .join('_')
    .replace(/\s+/g, '_')
    .toLowerCase();
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

    merged.set(key, {
      ...existing,
      classSectionId: existing.classSectionId || item.classSectionId,
      name: existing.name || item.name,
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

    merged.set(key, {
      ...existing,
      lrn: existing.lrn || item.lrn,
      classSectionId: existing.classSectionId || item.classSectionId,
      classroomId: existing.classroomId || item.classroomId,
      className: existing.className || item.className,
      grade: existing.grade || item.grade,
      section: existing.section || item.section,
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

        // Build a map of classroomId -> name
        const classNameMap: Record<string, string> = {};
        classrooms.forEach((c) => { classNameMap[c.id] = c.name; });

        const allStudents = await getStudentsByTeacher(teacherId);
        let studentViews = allStudents.map((s) => toStudentView(s, classNameMap[s.classroomId] || 'Unknown'));

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
    { name: 'High Risk', value: students.filter((s) => s.riskLevel === 'high').length, color: '#ef4444' },
    { name: 'Medium Risk', value: students.filter((s) => s.riskLevel === 'medium').length, color: '#f43f5e' },
    { name: 'Low Risk', value: students.filter((s) => s.riskLevel === 'low').length, color: '#10b981' },
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
    if (selectedClass.classSectionId) return selectedClass.classSectionId;
    const [grade = '', section = ''] = selectedClass.name.split(' - ');
    const computed = buildClassSectionId(grade, section);
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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-sky-600" />
          <p className="text-muted-foreground font-medium">Loading dashboard...</p>
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
            <div className="w-12 h-12 bg-gradient-to-r from-sky-600 to-sky-500 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
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
                  className="mt-1 p-2 rounded-lg border border-border text-muted-foreground hover:text-sky-700 hover:border-sky-200 hover:bg-sky-50 transition-colors"
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
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-200/60 rounded-lg">
                    <Users size={13} className="text-sky-600" />
                    <span className="text-xs font-display font-bold text-sky-700">{totalStudents} students</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200/60 rounded-lg">
                    <AlertTriangle size={13} className="text-rose-600" />
                    <span className="text-xs font-display font-bold text-rose-700">{totalAtRisk} at risk</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-lg">
                    <TrendingUp size={13} className="text-emerald-600" />
                    <span className="text-xs font-display font-bold text-emerald-700">{avgPerformance}% avg</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 bg-muted p-1.5 pr-3 rounded-lg cursor-pointer hover:bg-accent transition-all group max-w-[220px]"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-sky-200/70 bg-card flex items-center justify-center">
                  <img
                    src={userProfile?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=random`}
                    alt={teacherName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:block min-w-0 text-left">
                  <p className="text-sm font-semibold text-foreground leading-none group-hover:text-sky-600 transition-colors truncate">{teacherName}</p>
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
                  setSelectedStudent(updatedStudent);
                  setStudents((prev) => prev.map((item) => (item.id === updatedStudent.id ? updatedStudent : item)));
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
                onImportedClassRecords={(payload) => {
                  const uploadedStudents = payload.students.map((item) =>
                    toUploadedStudentView(item, payload.classSectionId, payload.className),
                  );

                  const classSection = payload.classSectionId
                    || (payload.className
                      ? buildClassSectionId(payload.className.split(' - ')[0] || '', payload.className.split(' - ')[1] || '')
                      : 'imported_class');
                  const resolvedClassName = payload.className || 'Imported Class';
                  const atRiskCount = uploadedStudents.filter((item) => item.riskLevel === 'high').length;
                  const avgScore = uploadedStudents.length > 0
                    ? Math.round(uploadedStudents.reduce((sum, item) => sum + item.avgScore, 0) / uploadedStudents.length)
                    : 0;

                  const uploadedClass: ClassView = {
                    id: classSection,
                    name: resolvedClassName,
                    classSectionId: classSection,
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
              <ToolsPlaceholderView
                icon={Bell}
                title="Notifications"
                description="Teacher alerts and classroom updates will appear here."
              />
            )}
            {activeView === 'calendar' && (
              <ToolsPlaceholderView
                icon={Calendar}
                title="Calendar"
                description="Your class schedule and upcoming events will appear here."
              />
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
        ? 'bg-sky-50 border-sky-200 shadow-sm text-sky-700'
        : 'bg-transparent border-transparent text-[#5a6578] hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628]'
    }`}
  >
    <Icon size={18} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
    {(!collapsed || forceExpanded) && <span className="font-body font-bold text-xs">{label}</span>}
    {active && !collapsed && (
      <motion.div
        layoutId="sidebar-active-indicator"
        className="ml-auto w-2 h-2 rounded-full bg-sky-500"
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
      <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
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
      <div className="bg-gradient-to-r from-sky-600 to-sky-500 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-card/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-display font-bold mb-1">AI Insight</h2>
            {insightLoading ? (
              <p className="text-sky-100 text-sm leading-relaxed">
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Generating AI insight...
                </span>
              </p>
            ) : (
              <div className="text-sky-100 text-sm leading-relaxed [&_p]:m-0 [&_strong]:font-semibold">
                <ChatMarkdown>
                  {dailyInsight || `${totalAtRisk} students (${riskPercentage}%) are at high risk of falling behind`}
                </ChatMarkdown>
              </div>
            )}
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
          <p className="text-2xl font-display font-bold text-sky-600">{avgPerformance}%</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-body mb-1">Engagement Rate</p>
          <p className="text-2xl font-display font-bold text-emerald-600">{engagementRate}%</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-red-200/60 shadow-sm">
          <p className="text-xs text-muted-foreground font-body mb-1">At Risk</p>
          <p className="text-2xl font-display font-bold text-red-600">{totalAtRisk}</p>
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
              className="text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 group"
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
                  </div>
                  <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 py-2 rounded-xl">
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
                    <p className="text-xl font-bold text-red-600">{classItem.atRiskCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
                    <p className="text-xl font-bold text-sky-600">{classItem.avgScore}%</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Classroom Pulse - 1 column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-rose-600" />
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
                  activity.type === 'success' ? 'bg-green-50 border-green-500' :
                  activity.type === 'warning' ? 'bg-rose-50 border-rose-500' :
                  'bg-sky-50 border-sky-500'
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
}> = ({ selectedClass, students, riskDistribution, topicPerformance, onViewStudent, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');

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
        className="flex items-center gap-2 text-muted-foreground hover:text-sky-600 font-bold mb-6 transition-colors group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      {/* Split View */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Column - Student List */}
        <div className="xl:col-span-2 bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-bold text-foreground">Students ({visibleStudents.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
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
                key={student.id}
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
                        student.riskLevel === 'high' ? 'bg-red-500' :
                        student.riskLevel === 'medium' ? 'bg-rose-500' :
                        'bg-green-500'
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
                <Bar dataKey="score" fill="#0284c7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Action Items */}
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-sky-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">Validate AI Links</h3>
                  <p className="text-sm text-muted-foreground">Review AI-generated interventions</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                Pending
              </span>
            </div>
            <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl">
              Review Now
            </Button>
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
        card: 'bg-red-50 border-red-200',
        icon: 'bg-red-600',
        bullet: 'text-red-600',
      }
    : {
        card: 'bg-sky-50 border-sky-200',
        icon: 'bg-sky-600',
        bullet: 'text-sky-600',
      };
  const rolloutFlags = useMemo(() => apiService.getImportGroundedRolloutFlags(), []);
  const [learningPath, setLearningPath] = useState<string>('');
  const [pathLoading, setPathLoading] = useState(true);
  const [gradeDraft, setGradeDraft] = useState(student.grade || 'Grade 11');
  const [sectionDraft, setSectionDraft] = useState(student.section || 'Section A');
  const [savingSection, setSavingSection] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlanResponse | null>(null);
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
        const response = await apiService.getLearningPath({
          weaknesses: student.struggles.length > 0 ? student.struggles : [student.weakestTopic],
          gradeLevel: 'High School',
        });
        setLearningPath(response.learningPath);
      } catch {
        setLearningPath('Unable to generate learning path. Please try again later.');
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
      const response = await apiService.generateLessonPlan({
        gradeLevel: gradeDraft || student.grade || 'Grade 11',
        classSectionId,
        className: [gradeDraft, sectionDraft].filter(Boolean).join(' - ') || student.className,
        focusTopics: student.struggles.length > 0 ? student.struggles : [student.weakestTopic],
        topicCount: 5,
        preferImportedTopics: rolloutFlags.lessonEnabled,
        allowReviewSources,
        allowUnverifiedLesson,
      });
      setLessonPlan(response);
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
        className="flex items-center gap-2 text-muted-foreground hover:text-sky-600 font-bold mb-6 transition-colors group"
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
                  <p className="text-sm font-bold text-red-600">{student.weakestTopic}</p>
                </div>
              </div>

              <div className="mt-5 p-4 bg-sky-50 border border-sky-200 rounded-xl">
                <p className="text-xs font-semibold text-sky-700 mb-3 uppercase tracking-wider">Section Assignment</p>
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
                    className="bg-sky-600 hover:bg-sky-700 text-white h-10"
                  >
                    {savingSection ? <Loader2 size={16} className="animate-spin" /> : 'Save Section'}
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
              {pathLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                  <span>Generating AI analysis...</span>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>

        {/* AI-Generated Learning Path */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <h2 className="text-xl font-display font-bold text-foreground mb-6">AI-Generated Learning Path</h2>
          
          {pathLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
              <span>Generating personalized learning path...</span>
            </div>
          ) : learningPath ? (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 mb-6 text-sm text-foreground">
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
                  <div className="absolute left-0 w-12 h-12 bg-gradient-to-br from-sky-600 to-sky-500 rounded-xl flex items-center justify-center shadow-md">
                    <Icon size={24} className="text-white" />
                  </div>

                  {/* Step Content */}
                  <div className="bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200 rounded-2xl p-5 hover:shadow-md transition-all">
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
                        step.type === 'video' ? 'bg-rose-100 text-rose-700' :
                        step.type === 'quiz' ? 'bg-sky-100 text-sky-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {step.type === 'video' ? 'Video' : step.type === 'quiz' ? 'Quiz' : 'Assessment'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Import-grounded Lesson Plan */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Targeted Lesson Plan</h2>
              <p className="text-sm text-muted-foreground">Grounded on imported class topics and student risk signals</p>
            </div>
            <Button
              onClick={() => void generateTargetedLessonPlan()}
              disabled={lessonLoading}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              {lessonLoading ? <Loader2 size={16} className="animate-spin" /> : 'Regenerate'}
            </Button>
          </div>

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

          {lessonLoading && (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 size={18} className="animate-spin" />
              <span>Generating class-scoped lesson plan...</span>
            </div>
          )}

          {!lessonLoading && lessonError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {lessonError}
            </div>
          )}

          {!lessonLoading && lessonPlan && (
            <div className="space-y-4">
              <div className="bg-secondary border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground">{lessonPlan.lessonTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Imported topics used: {lessonPlan.usedImportedTopics ? 'Yes' : 'No'}
                  {' -€¢ '}Imported topic count: {lessonPlan.importedTopicCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Publish readiness: {lessonPlan.publishReady ? 'Ready' : 'Blocked'}
                </p>
                {lessonPlan.warnings.length > 0 && (
                  <p className="text-xs text-amber-700 mt-1">{lessonPlan.warnings.join(' ')}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Source Legitimacy</p>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {lessonPlan.sourceLegitimacy.status} ({Math.round(lessonPlan.sourceLegitimacy.score * 100)}%)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verified: {lessonPlan.sourceLegitimacy.verifiedMaterials} -€¢ Review: {lessonPlan.sourceLegitimacy.reviewMaterials} -€¢ Rejected: {lessonPlan.sourceLegitimacy.rejectedMaterials}
                  </p>
                  {lessonPlan.sourceLegitimacy.issues.length > 0 && (
                    <p className="text-xs text-amber-700 mt-1">{lessonPlan.sourceLegitimacy.issues.slice(0, 2).join(' ')}</p>
                  )}
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Self Validation</p>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {lessonPlan.selfValidation.passed ? 'Passed' : 'Failed'} ({Math.round(lessonPlan.selfValidation.score * 100)}%)
                  </p>
                  {lessonPlan.selfValidation.issues.length > 0 && (
                    <p className="text-xs text-amber-700 mt-1">{lessonPlan.selfValidation.issues.slice(0, 2).join(' ')}</p>
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
                    <p className="text-xs text-muted-foreground mt-1">{block.estimatedMinutes} mins -€¢ {block.strategy}</p>
                    <p className="text-sm text-foreground mt-2">{block.objective}</p>
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Activities</p>
                      {block.activities.slice(0, 2).map((activity, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">-€¢ {activity}</p>
                      ))}
                    </div>
                    {block.provenance && (
                      <div className="mt-3 bg-sky-50 border border-sky-200 rounded-lg p-2">
                        <p className="text-[11px] font-semibold text-sky-700">Provenance</p>
                        {block.provenance.sourceFile && <p className="text-[11px] text-sky-900">Source: {block.provenance.sourceFile}</p>}
                        {block.provenance.materialId && <p className="text-[11px] text-sky-900">Material: {block.provenance.materialId}</p>}
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
                  className="border-sky-300 text-sky-700"
                >
                  {savingLessonDraft ? <Loader2 size={14} className="animate-spin" /> : 'Save Draft'}
                </Button>
                <Button
                  onClick={() => void publishCurrentLessonPlan()}
                  disabled={publishingLesson || !lessonPlan || !lessonPlan.publishReady}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {publishingLesson ? <Loader2 size={14} className="animate-spin" /> : 'Publish Lesson Plan'}
                </Button>
                {savedLessonPlanId && (
                  <p className="text-xs text-muted-foreground self-center">Draft ID: {savedLessonPlanId}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            <Send size={20} />
            Schedule One-on-One Session
          </Button>
          <Button
            variant="outline"
            className="border-2 border-sky-600 text-sky-600 hover:bg-sky-50 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Export Printed Materials
          </Button>
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
  onImportedClassRecords?: (payload: {
    students: UploadResponse['students'];
    classSectionId: string;
    className: string;
  }) => void;
  onDataChanged?: () => void;
}> = ({ onEditRecords, classSectionId, className, onImportedClassRecords, onDataChanged }) => {
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

  const handleFileUpload = async (file: File) => {
    setUploadingClassRecords(true);
    setUploadResult('');
    setUploadInterpretation(null);
    try {
      const result = await apiService.uploadClassRecords(file, {
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

      const resolvedImportContext = resolveUploadedClassContext(result, classSectionId, className);

      if (uploadedStudentsCount > 0) {
        onImportedClassRecords?.({
          students: result.students,
          classSectionId: resolvedImportContext.classSectionId,
          className: resolvedImportContext.className,
        });
      }

      if (result.success) {
        toast.success(`Successfully imported ${uploadedStudentsCount} student records`);
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
          `Imported ${uploadedStudentsCount} students.${riskRefreshText}${dashboardSyncText}${interpretationText}${warningText} Column mapping: ${JSON.stringify(result.columnMapping)}`,
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
        toast.success(`Course material imported (${topicCount} topics extracted)`);
        setUploadResult(
          `Imported course material ${result.fileName} with ${topicCount} topics and ${result.sections.length} section(s).`,
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
          <p className="text-muted-foreground">Upload class records and course materials to enhance AI predictions</p>
          <p className="text-xs text-muted-foreground mt-1">
            Class scope: {className || classSectionId || 'All classes'}
          </p>
        </div>

        {/* Upload Zones */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Class Records */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver1(true); }}
            onDragLeave={() => setDragOver1(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-card border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer hover:border-sky-400 hover:bg-sky-50 ${
              dragOver1 ? 'border-sky-600 bg-sky-50 scale-105' : 'border-border'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              {uploadingClassRecords ? (
                <Loader2 size={40} className="text-sky-600 animate-spin" />
              ) : (
                <FileSpreadsheet size={40} className="text-sky-600" />
              )}
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">Class Records</h3>
            <p className="text-muted-foreground mb-4">
              {uploadingClassRecords ? 'Uploading and analyzing...' : 'Upload student grades, attendance, and quiz scores'}
            </p>
            <p className="text-xs text-muted-foreground mb-4 flex items-center justify-center gap-2">
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.csv</span>
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.xlsx</span>
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.pdf</span>
            </p>
            <Button className="bg-card border-2 border-border text-muted-foreground hover:border-sky-500 hover:text-sky-600 font-bold px-6 py-3 rounded-xl w-full transition-colors">
              Click or drag & drop
            </Button>
          </div>

          {/* Course Materials */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver2(true); }}
            onDragLeave={() => setDragOver2(false)}
            onDrop={handleCourseMaterialDrop}
            onClick={() => materialInputRef.current?.click()}
            className={`bg-card border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer hover:border-rose-400 hover:bg-rose-50 ${
              dragOver2 ? 'border-rose-600 bg-rose-50 scale-105' : 'border-border'
            }`}
          >
            <input
              ref={materialInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleCourseMaterialSelect}
              className="hidden"
            />
            <div className="w-20 h-20 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              {uploadingCourseMaterials ? (
                <Loader2 size={40} className="text-rose-600 animate-spin" />
              ) : (
                <FileText size={40} className="text-rose-600" />
              )}
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">Course Materials</h3>
            <p className="text-muted-foreground mb-4">
              {uploadingCourseMaterials ? 'Uploading and extracting topics...' : 'Upload syllabus, lesson plans, and curriculum documents'}
            </p>
            <p className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-2">
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.pdf</span>
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.docx</span>
                <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">.txt</span>
            </p>
            <Button className="bg-card border-2 border-border text-muted-foreground hover:border-rose-500 hover:text-rose-600 font-bold px-6 py-3 rounded-xl w-full transition-colors">
              Click or drag & drop
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6">
          <h3 className="text-lg font-display font-bold text-sky-800 mb-3">How AI Uses Your Data</h3>
          <div className="space-y-2 text-sky-900/80 text-sm">
            <p className="flex items-start gap-2">
              <span className="text-sky-600 font-bold">-€¢</span>
              <span><strong className="text-sky-800">Smart Format Detection:</strong> AI understands various spreadsheet formats and column names</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-sky-600 font-bold">-€¢</span>
              <span>Analyzes historical performance patterns to predict at-risk students</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-sky-600 font-bold">-€¢</span>
              <span>Maps curriculum topics to student knowledge gaps</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-sky-600 font-bold">-€¢</span>
              <span>Generates personalized remedial learning paths</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-sky-600 font-bold">-€¢</span>
              <span>All data is processed securely and never shared</span>
            </p>
          </div>
        </div>

        {/* Upload Results */}
        {uploadResult && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
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
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700">Storage-only</p>
                  <p className="text-lg font-bold text-amber-800">{uploadInterpretation.summary.storageOnlyColumns}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-xs text-rose-700">Low confidence</p>
                  <p className="text-lg font-bold text-rose-800">{uploadInterpretation.summary.lowConfidenceColumns}</p>
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
                      {' -€¢ '}usage: {column.usagePolicy}
                      {' -€¢ '}confidence: {column.confidenceBand}
                    </p>
                    {column.domainSignals && column.domainSignals.length > 0 && (
                      <p className="text-xs text-amber-700 mt-1">domain signals: {column.domainSignals.join(', ')}</p>
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
            <ChevronRight size={24} className="text-white/80 group-hover:text-sky-700 group-hover:translate-x-1 transition-all" />
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
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, { grade: string; section: string }>>(() =>
    Object.fromEntries(
      initialStudents.map((student) => [student.id, { grade: student.grade || 'Grade 11', section: student.section || 'Section A' }])
    )
  );

  useEffect(() => {
    setStudents(initialStudents);
    setSectionDrafts(
      Object.fromEntries(
        initialStudents.map((student) => [student.id, { grade: student.grade || 'Grade 11', section: student.section || 'Section A' }])
      )
    );
  }, [initialStudents]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update risk levels for all students via AI
      for (const student of students) {
        const draft = sectionDrafts[student.id];
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
          const draft = sectionDrafts[student.id];
          if (!draft) return student;
          return {
            ...student,
            grade: draft.grade,
            section: draft.section,
            className: [draft.grade, draft.section].filter(Boolean).join(' - '),
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
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
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
              {students.map((student) => (
                <tr key={student.id} className="border-b border-border hover:bg-sky-50/30 group transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={student.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-medium text-foreground">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-sm">{student.lrn || 'Not set'}</td>
                  <td className="p-4 min-w-[140px]">
                    <Input
                      value={sectionDrafts[student.id]?.grade || student.grade}
                      onChange={(e) =>
                        setSectionDrafts((prev) => ({
                          ...prev,
                          [student.id]: { ...prev[student.id], grade: e.target.value },
                        }))
                      }
                      className="h-9 text-sm"
                    />
                  </td>
                  <td className="p-4 min-w-[140px]">
                    <Input
                      value={sectionDrafts[student.id]?.section || student.section}
                      onChange={(e) =>
                        setSectionDrafts((prev) => ({
                          ...prev,
                          [student.id]: { ...prev[student.id], section: e.target.value },
                        }))
                      }
                      className="h-9 text-sm"
                    />
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${
                      student.avgScore < 60 ? 'text-red-600' : 
                      student.avgScore < 80 ? 'text-rose-600' : 'text-green-600'
                    }`}>{student.avgScore}%</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskBadge(student.riskLevel)}`}>
                      {student.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{student.weakestTopic}</td>
                  <td className="p-4">
                    <button className="p-2 hover:bg-muted rounded-lg text-slate-500 hover:text-sky-600 transition-colors">
                      <Edit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
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
    case 'high': return 'bg-red-100 text-red-700 border-red-200';
    case 'medium': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'low': return 'bg-green-100 text-green-700 border-green-200';
  }
}

function getRiskColor(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high': return 'border-red-500 bg-red-50';
    case 'medium': return 'border-rose-500 bg-rose-50';
    case 'low': return 'border-green-500 bg-green-50';
  }
}

export default TeacherDashboard;

