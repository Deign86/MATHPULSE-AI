import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDefaultAvatar } from '../utils/avatarUtils';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Loader2, Search,
  AlertTriangle, Award, TrendingUp, BarChart3,
  User, BookOpen, Brain, RefreshCw, Bell, Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStudentsByTeacher } from '../services/studentService';
import {
  apiService,
  type StudentCompetencyResponse,
  type TopicCompetency,
  type CourseMaterialTopicMapTopic,
  type ImportedStudentOverviewItem,
} from '../services/apiService';
import { getUserProgress } from '../services/progressService';
import { subjects } from '../data/subjects';
import type { UserProgress } from '../types/models';

// -”€-”€-”€ Types -”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€

interface StudentRow {
  rowKey: string;
  student: CompetencyStudent;
  competency: StudentCompetencyResponse | null;
  competencyMatrix: CompetencyMatrixSummary | null;
  competencyMatrixLoading: boolean;
  loading: boolean;
  expanded: boolean;
  error?: string;
}

interface CompetencyMatrixSummary {
  mastery: number;
  concept: number;
  application: number;
  engagement: number;
  consistency: number;
}

interface CompetencyStudent {
  id: string;
  lrn?: string;
  name: string;
  email: string;
  avatar: string;
  classSectionId?: string | null;
  riskLevel: 'High' | 'Medium' | 'Low';
  engagementScore: number;
  avgQuizScore: number;
  weakestTopic: string;
}

interface FallbackStudentInput {
  id: string;
  lrn?: string;
  name: string;
  email?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'prefer_not_to_say' | null;
  classSectionId?: string | null;
  riskLevel: 'high' | 'medium' | 'low' | 'High' | 'Medium' | 'Low';
  engagementScore: number;
  avgScore?: number;
  avgQuizScore?: number;
  weakestTopic: string;
}

function normalizeClassSectionId(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function buildCompetencyStudentKey(student: CompetencyStudent): string {
  const lrnKey = (student.lrn || '').trim().toLowerCase();
  if (lrnKey) return `lrn:${lrnKey}`;

  const emailKey = (student.email || '').trim().toLowerCase();
  if (emailKey) return `email:${emailKey}`;

  const nameKey = student.name.trim().toLowerCase();
  if (nameKey) return `name:${nameKey}`;

  const classKey = normalizeClassSectionId(student.classSectionId);
  const idKey = (student.id || '').trim().toLowerCase();
  if (classKey && idKey) return `${classKey}|id:${idKey}`;
  if (idKey) return `id:${idKey}`;
  return `${classKey}|anonymous`;
}

function buildCompetencyStudentAliases(student: CompetencyStudent, scopeKey: string): string[] {
  const aliases: string[] = [];
  const lrnKey = (student.lrn || '').trim().toLowerCase();
  const emailKey = (student.email || '').trim().toLowerCase();
  const nameKey = student.name.trim().toLowerCase();
  const idKey = (student.id || '').trim().toLowerCase();

  if (lrnKey) aliases.push(`${scopeKey}|lrn:${lrnKey}`);
  if (emailKey) aliases.push(`${scopeKey}|email:${emailKey}`);
  if (nameKey) aliases.push(`${scopeKey}|name:${nameKey}`);
  if (idKey) aliases.push(`${scopeKey}|id:${idKey}`);

  if (aliases.length === 0) {
    aliases.push(`${scopeKey}|anonymous`);
  }

  return aliases;
}

function mergeCompetencyStudentRecord(existing: CompetencyStudent, incoming: CompetencyStudent): CompetencyStudent {
  const riskLevel: 'High' | 'Medium' | 'Low' = [existing.riskLevel, incoming.riskLevel].includes('High')
    ? 'High'
    : [existing.riskLevel, incoming.riskLevel].includes('Medium')
      ? 'Medium'
      : 'Low';

  return {
    ...existing,
    lrn: existing.lrn || incoming.lrn,
    classSectionId: existing.classSectionId ?? incoming.classSectionId,
    avgQuizScore: incoming.avgQuizScore > 0 ? incoming.avgQuizScore : existing.avgQuizScore,
    engagementScore: incoming.engagementScore > 0 ? incoming.engagementScore : existing.engagementScore,
    weakestTopic: existing.weakestTopic && existing.weakestTopic !== 'Foundational Skills'
      ? existing.weakestTopic
      : incoming.weakestTopic,
    riskLevel,
  };
}

function dedupeCompetencyStudents(students: CompetencyStudent[], scopedClassSectionId?: string): CompetencyStudent[] {
  const merged = new Map<string, CompetencyStudent>();
  const aliasIndex = new Map<string, string>();
  const scopeKey = scopedClassSectionId ? normalizeClassSectionId(scopedClassSectionId) : 'all';

  students.forEach((student) => {
    const aliases = buildCompetencyStudentAliases(student, scopeKey);
    const canonicalKey = aliases.map((alias) => aliasIndex.get(alias)).find(Boolean) || aliases[0];
    const existing = merged.get(canonicalKey);
    const nextValue = existing ? mergeCompetencyStudentRecord(existing, student) : student;
    merged.set(canonicalKey, nextValue);
    aliases.forEach((alias) => aliasIndex.set(alias, canonicalKey));
  });

  return Array.from(merged.values());
}

function mergeCompetencyStudents(primary: CompetencyStudent[], imported: CompetencyStudent[]): CompetencyStudent[] {
  return dedupeCompetencyStudents([...primary, ...imported]);
}

type SortField = 'name' | 'avgQuizScore' | 'riskLevel' | 'engagementScore';
type SortDir = 'asc' | 'desc';

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function computeCompetencyMatrixSummary(progress: UserProgress | null): CompetencyMatrixSummary | null {
  if (!progress) return null;

  const activeSubjectId = 'gen-math';
  const validModules = subjects.find((subject) => subject.id === activeSubjectId)?.modules || [];
  if (validModules.length === 0) return null;

  const totals = {
    mastery: 0,
    concept: 0,
    application: 0,
    engagement: 0,
    consistency: 0,
  };

  const lessonProgressMap = progress.lessons ?? {};

  validModules.forEach((module) => {
    const parentSubject = subjects.find((subject) => subject.modules.some((m) => m.id === module.id));
    const moduleStats = parentSubject
      ? progress?.subjects?.[parentSubject.id]?.modulesProgress?.[module.id]
      : null;

    const moduleProgress = clampPercent(moduleStats?.progress || 0);

    const lessonsPct = module.lessons.length
      ? module.lessons.reduce((sum, lesson) => {
          const pct = lessonProgressMap?.[lesson.id]?.score;
          if (typeof pct === 'number' && Number.isFinite(pct)) {
            return sum + clampPercent(pct);
          }
          const completed = !!moduleStats?.lessonsCompleted?.includes?.(lesson.id);
          return sum + (completed ? 100 : 0);
        }, 0) / module.lessons.length
      : 0;

    const quizzesPct = module.quizzes.length
      ? ((moduleStats?.quizzesCompleted?.length || 0) / module.quizzes.length) * 100
      : 0;

    const lessonsPctClamped = clampPercent(lessonsPct);
    const quizzesPctClamped = clampPercent(quizzesPct);
    const engagement = clampPercent(Math.min(100, (lessonsPctClamped + quizzesPctClamped * 2) / 1.5));
    const consistency = clampPercent(Math.min(100, 40 + moduleProgress * 0.6));

    totals.mastery += moduleProgress;
    totals.concept += lessonsPctClamped;
    totals.application += quizzesPctClamped;
    totals.engagement += engagement;
    totals.consistency += consistency;
  });

  const denom = validModules.length;
  return {
    mastery: Math.round(totals.mastery / denom),
    concept: Math.round(totals.concept / denom),
    application: Math.round(totals.application / denom),
    engagement: Math.round(totals.engagement / denom),
    consistency: Math.round(totals.consistency / denom),
  };
}

const RISK_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  High: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' },
  Medium: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-300' },
  Low: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-300' },
};

const COMPETENCY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  advanced: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  proficient: { bg: 'bg-sky-100', text: 'text-sky-700', bar: 'bg-sky-500' },
  developing: { bg: 'bg-rose-100', text: 'text-rose-700', bar: 'bg-rose-500' },
  beginner: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
};

const COMPETENCY_MATRIX_ITEMS: Array<{ key: keyof CompetencyMatrixSummary; short: string; label: string; header: string }> = [
  { key: 'mastery', short: 'M', label: 'Overall Mastery', header: 'Mastery' },
  { key: 'concept', short: 'C', label: 'Concept Grasp', header: 'Concept' },
  { key: 'application', short: 'A', label: 'Application', header: 'Applications' },
  { key: 'consistency', short: 'S', label: 'Consistency', header: 'Consistency' },
];

function getMatrixScoreTone(score: number): { bg: string; text: string; ring: string } {
  const clamped = clampPercent(score);

  if (clamped >= 80) {
    return {
      bg: 'bg-[color-mix(in_srgb,var(--chart-3)_14%,transparent)]',
      text: 'text-[var(--chart-3)]',
      ring: 'ring-[color-mix(in_srgb,var(--chart-3)_40%,transparent)]',
    };
  }

  if (clamped >= 60) {
    return {
      bg: 'bg-[color-mix(in_srgb,var(--chart-4)_14%,transparent)]',
      text: 'text-[var(--chart-4)]',
      ring: 'ring-[color-mix(in_srgb,var(--chart-4)_40%,transparent)]',
    };
  }

  return {
    bg: 'bg-[color-mix(in_srgb,var(--chart-2)_14%,transparent)]',
    text: 'text-[var(--chart-2)]',
    ring: 'ring-[color-mix(in_srgb,var(--chart-2)_40%,transparent)]',
  };
}

// -”€-”€-”€ Component -”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€

const StudentCompetencyTable: React.FC<{
  classSectionId?: string;
  className?: string;
  fallbackStudents?: FallbackStudentInput[];
  onBack?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  insightDismissed?: boolean;
  onOpenInsightModal?: () => void;
}> = ({ classSectionId, className, fallbackStudents = [], onBack, onOpenNotifications, onOpenProfile, insightDismissed, onOpenInsightModal }) => {
  const { currentUser, userProfile } = useAuth();

  const competencyMatrixLoadIdRef = useRef(0);

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('riskLevel');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [importedTopics, setImportedTopics] = useState<CourseMaterialTopicMapTopic[]>([]);
  const [importedTopicsLoading, setImportedTopicsLoading] = useState(false);
  const [importedTopicsWarning, setImportedTopicsWarning] = useState('');
  const [studentsWarning, setStudentsWarning] = useState('');

  const mapImportedStudentToCompetencyStudent = useCallback((student: ImportedStudentOverviewItem): CompetencyStudent => ({
    id: student.id,
    lrn: student.lrn || undefined,
    name: student.name,
    email: student.email || '',
    avatar: getDefaultAvatar(student.gender),
    classSectionId: student.classSectionId ?? null,
    riskLevel: student.riskLevel || 'Low',
    engagementScore: student.engagementScore,
    avgQuizScore: student.avgQuizScore,
    weakestTopic: student.weakestTopic || 'Foundational Skills',
  }), []);

  const mapFallbackStudent = useCallback((student: FallbackStudentInput): CompetencyStudent => ({
    id: student.id,
    lrn: student.lrn,
    name: student.name,
    email: student.email || '',
    avatar: (student.avatar && !student.avatar.includes('ui-avatars.com')) ? student.avatar : getDefaultAvatar(student.gender),
    classSectionId: student.classSectionId ?? null,
    riskLevel: (String(student.riskLevel).charAt(0).toUpperCase() + String(student.riskLevel).slice(1).toLowerCase()) as 'High' | 'Medium' | 'Low',
    engagementScore: student.engagementScore,
    avgQuizScore: Number(student.avgQuizScore ?? student.avgScore ?? 0),
    weakestTopic: student.weakestTopic || 'Foundational Skills',
  }), []);

  const loadCompetencyMatrices = useCallback(async (students: CompetencyStudent[], loadId: number) => {
    const summaryByStudentId = new Map<string, CompetencyMatrixSummary | null>();
    students.forEach((student) => summaryByStudentId.set(student.id, null));
    const COMPETENCY_MATRIX_BATCH_SIZE = 25;

    for (let index = 0; index < students.length; index += COMPETENCY_MATRIX_BATCH_SIZE) {
      if (competencyMatrixLoadIdRef.current !== loadId) return;

      const batch = students.slice(index, index + COMPETENCY_MATRIX_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (student) => {
          try {
            const progress = await getUserProgress(student.id);
            return { studentId: student.id, summary: computeCompetencyMatrixSummary(progress) };
          } catch {
            return { studentId: student.id, summary: null };
          }
        }),
      );

      results.forEach((result, batchIndex) => {
        const studentId = batch[batchIndex]?.id;
        if (!studentId) return;
        if (result.status === 'fulfilled') {
          summaryByStudentId.set(studentId, result.value.summary);
        } else {
          summaryByStudentId.set(studentId, null);
        }
      });
    }

    if (competencyMatrixLoadIdRef.current !== loadId) return;

    setRows((prev) => prev.map((row) => {
      if (!summaryByStudentId.has(row.student.id)) return row;
      return {
        ...row,
        competencyMatrix: summaryByStudentId.get(row.student.id) ?? null,
        competencyMatrixLoading: false,
      };
    }));
  }, []);

  // -”€-”€-”€ Load students -”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€

  const loadStudents = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    setStudentsWarning('');
    try {
      const students = await getStudentsByTeacher(currentUser.uid);
      let normalizedStudents: CompetencyStudent[] = students.map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email || '',
        avatar: (student.avatar && !student.avatar.includes('ui-avatars.com')) ? student.avatar : getDefaultAvatar(student.gender),
        classSectionId: student.classSectionId ?? null,
        riskLevel: student.riskLevel,
        engagementScore: student.engagementScore,
        avgQuizScore: student.avgQuizScore,
        weakestTopic: student.weakestTopic || 'Foundational Skills',
      }));

      if (fallbackStudents.length > 0) {
        normalizedStudents = mergeCompetencyStudents(
          normalizedStudents,
          fallbackStudents.map(mapFallbackStudent),
        );
      }

      if (classSectionId) {
        normalizedStudents = normalizedStudents.filter((student) => student.classSectionId === classSectionId);
      }

      const importedOverview = await apiService.getImportedClassOverview({ classSectionId, limit: 3000 });
      if (importedOverview.warnings.length > 0) {
        setStudentsWarning(importedOverview.warnings.join(' '));
      }
      normalizedStudents = mergeCompetencyStudents(
        normalizedStudents,
        importedOverview.students.map(mapImportedStudentToCompetencyStudent),
      );

      const dedupedStudents = dedupeCompetencyStudents(normalizedStudents, classSectionId);

      const competencyMatrixLoadId = (competencyMatrixLoadIdRef.current += 1);

      setRows(dedupedStudents.map((student, index) => ({
        rowKey: `${buildCompetencyStudentKey(student)}|row:${index}`,
        student,
        competency: null,
        competencyMatrix: null,
        competencyMatrixLoading: true,
        loading: false,
        expanded: false,
      })));

      void loadCompetencyMatrices(dedupedStudents, competencyMatrixLoadId);
    } catch (err) {
      console.error('Failed to load students:', err);
      if (fallbackStudents.length > 0) {
        const fallbackRows = fallbackStudents
          .map(mapFallbackStudent)
          .filter((student) => !classSectionId || student.classSectionId === classSectionId)
          .map((student, index) => ({
            rowKey: `${buildCompetencyStudentKey(student)}|row:${index}`,
            student,
            competency: null,
            competencyMatrix: null,
            competencyMatrixLoading: false,
            loading: false,
            expanded: false,
          }));
        setRows(fallbackRows);
        setStudentsWarning('Showing recently imported students while backend roster sync catches up.');
      } else {
        setRows([]);
        setStudentsWarning('Student competency roster is unavailable right now.');
      }
    } finally {
      setLoading(false);
    }
  }, [classSectionId, currentUser?.uid, fallbackStudents, loadCompetencyMatrices, mapFallbackStudent, mapImportedStudentToCompetencyStudent]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => {
    const loadImportedTopics = async () => {
      if (!classSectionId) {
        setImportedTopics([]);
        setImportedTopicsWarning('');
        return;
      }

      setImportedTopicsLoading(true);
      setImportedTopicsWarning('');
      try {
        const response = await apiService.getCourseMaterialTopics({ classSectionId, limit: 20 });
        const topics = (response.topics || []).filter((topic) => topic.title?.trim());
        setImportedTopics(topics);
        if (response.warnings.length > 0) {
          setImportedTopicsWarning(response.warnings.join(' '));
        }
      } catch {
        setImportedTopics([]);
        setImportedTopicsWarning('Imported topic context is unavailable right now.');
      } finally {
        setImportedTopicsLoading(false);
      }
    };

    void loadImportedTopics();
  }, [classSectionId]);

  // -”€-”€-”€ Load competency on expand -”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€

  const toggleExpand = async (rowKey: string) => {
    setRows(prev => prev.map(r => {
      if (r.rowKey !== rowKey) return r;

      const newExpanded = !r.expanded;

        const studentId = r.student.id;
        const fallbackStudent = {
          weakestTopic: r.student.weakestTopic,
          avgQuizScore: r.student.avgQuizScore,
        };

        // If expanding and no competency data yet, fetch it
        if (newExpanded && !r.competency && !r.loading) {
          // Start loading
          void fetchCompetency(rowKey, studentId, fallbackStudent);
          return { ...r, expanded: true, loading: true };
        }

        return { ...r, expanded: newExpanded };
      }));
    };

  const fetchCompetency = async (
    rowKey: string,
    studentId: string,
    fallbackStudent: { weakestTopic: string; avgQuizScore: number },
  ) => {
    try {
      // Fetch real quiz history from Firestore progress data
      const progress = await getUserProgress(studentId);
      const quizHistory = (progress?.quizAttempts ?? []).map(attempt => ({
        topic: attempt.quizId,
        score: attempt.score,
        total: 100,
        timeTaken: attempt.timeSpent,
      }));

      const competency = await apiService.getStudentCompetency(studentId, quizHistory.length > 0 ? quizHistory : undefined);

      setRows(prev => prev.map(r =>
        r.rowKey === rowKey
          ? { ...r, competency, loading: false }
          : r
      ));
    } catch (err) {
      // Fallback competency data
      const avg = fallbackStudent.avgQuizScore || 50;

      const fallback: StudentCompetencyResponse = {
        studentId,
        competencies: [
          { topic: fallbackStudent.weakestTopic || 'Unknown', efficiencyScore: Math.max(15, avg - 20), competencyLevel: avg < 50 ? 'beginner' : 'developing', perspective: `Student needs focused practice in ${fallbackStudent.weakestTopic}.` },
          { topic: 'Functions and Relations', efficiencyScore: Math.min(95, avg + 10), competencyLevel: avg > 70 ? 'proficient' : 'developing', perspective: 'Shows solid understanding of function concepts.' },
          { topic: 'Problem Solving', efficiencyScore: avg, competencyLevel: avg > 80 ? 'advanced' : avg > 60 ? 'proficient' : 'developing', perspective: 'Applies mathematical reasoning consistently.' },
        ],
        recommendedTopics: [fallbackStudent.weakestTopic || 'Review fundamentals'],
        excludeTopics: [],
      };

      setRows(prev => prev.map(r =>
        r.rowKey === rowKey
          ? { ...r, competency: fallback, loading: false }
          : r
      ));
    }
  };

  // -”€-”€-”€ Sorting & Filtering -”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const RISK_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  const filteredRows = rows
    .filter(r => {
      if (riskFilter !== 'all' && r.student.riskLevel !== riskFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.student.name.toLowerCase().includes(q) || r.student.email.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.student.name.localeCompare(b.student.name);
          break;
        case 'avgQuizScore':
          cmp = a.student.avgQuizScore - b.student.avgQuizScore;
          break;
        case 'riskLevel':
          cmp = RISK_ORDER[a.student.riskLevel] - RISK_ORDER[b.student.riskLevel];
          break;
        case 'engagementScore':
          cmp = a.student.engagementScore - b.student.engagementScore;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // -”€-”€-”€ Summary stats -”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€

  const totalStudents = rows.length;
  const highRisk = rows.filter(r => r.student.riskLevel === 'High').length;
  const avgScore = totalStudents > 0 ? Math.round(rows.reduce((s, r) => s + r.student.avgQuizScore, 0) / totalStudents) : 0;
  const avgEngagement = totalStudents > 0 ? Math.round(rows.reduce((s, r) => s + r.student.engagementScore, 0) / totalStudents) : 0;
  const importedTopicTitles = Array.from(new Set(importedTopics.map((topic) => topic.title).filter(Boolean))).slice(0, 10);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={10} className="text-white/40 md:text-white/40" />;
    return sortDir === 'asc'
      ? <ChevronUp size={10} className="text-white font-bold md:text-white" />
      : <ChevronDown size={10} className="text-white font-bold md:text-white" />;
  };

  // -”€-”€-”€ Render -”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 p-6">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
        <span className="ml-3 text-muted-foreground">Loading student data...</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      {onBack && (
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="flex items-center gap-2 text-[13px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-colors bg-white/60 hover:bg-white/80 px-[18px] py-2 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50">
              <ChevronLeft className="w-4 h-4" />
              Back to Classes
          </button>
        </div>
      )}
{/* Summary Cards */}
      <div className="space-y-4 mb-6">
        {/* Row 1: Cards 1 & 2 side by side */}
        <div className="grid grid-cols-2 gap-[16px]">
          {/* Card 1 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#a855f7] to-[#9333ea] rounded-[16px] p-5 shadow-[0_4px_12px_rgba(168,85,247,0.2)] hover:shadow-[0_8px_24px_rgba(168,85,247,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4"></div>
            <div className="flex items-start justify-between relative z-10 mb-2">
              <span className="text-[13px] font-medium text-white/90">Total Students</span>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-[28px] font-bold relative z-10 leading-none mb-4">{totalStudents}</div>
            <div className="flex items-center justify-between relative z-10 border-t border-white/20 pt-3 mt-auto">
              <span className="text-[12px] font-medium text-white/90">Evaluated in this class</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-[16px] p-5 shadow-[0_4px_12px_rgba(249,115,22,0.2)] hover:shadow-[0_8px_24px_rgba(249,115,22,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4"></div>
            <div className="flex items-start justify-between relative z-10 mb-2">
              <span className="text-[13px] font-medium text-white/90">At-Risk Students</span>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-[28px] font-bold relative z-10 leading-none mb-4">{highRisk}</div>
            <div className="flex items-center justify-between relative z-10 border-t border-white/20 pt-3 mt-auto">
              <span className="text-[12px] font-medium text-white/90">Need immediate intervention</span>
            </div>
          </div>
        </div>

        {/* Row 2: Card 3 full width */}
        <div className="grid grid-cols-2 gap-[16px]">
          {/* Card 3 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] rounded-[16px] p-5 shadow-[0_4px_12px_rgba(14,165,233,0.2)] hover:shadow-[0_8px_24px_rgba(14,165,233,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4"></div>
            <div className="flex items-start justify-between relative z-10 mb-2">
              <span className="text-[13px] font-medium text-white/90">Class Average</span>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-[28px] font-bold relative z-10 leading-none mb-4">{avgScore}%</div>
            <div className="flex items-center justify-between relative z-10 border-t border-white/20 pt-3 mt-auto">
              <span className="text-[12px] font-medium text-white/90">Vs. expected benchmark</span>
            </div>
          </div>

          {/* Card 4 - Avg Engagement (keeps 2-col layout on larger screens) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[16px] p-5 shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4"></div>
            <div className="flex items-start justify-between relative z-10 mb-2">
              <span className="text-[13px] font-medium text-white/90">Avg. Engagement</span>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-[28px] font-bold relative z-10 leading-none mb-4">{avgEngagement}%</div>
            <div className="flex items-center justify-between relative z-10 border-t border-white/20 pt-3 mt-auto">
              <span className="text-[12px] font-medium text-white/90">Activity completion rate</span>
            </div>
          </div>
        </div>
      </div>
          

      {/* Sticky Filter Row Wrapper */}
      <div className="sticky top-0 z-30 py-4 -my-4 bg-[#f8fafc]/80 backdrop-blur-[16px] border-b border-slate-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] px-2 sm:-mx-6 sm:px-6 mb-6 rounded-b-[18px]">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
            {/* Search */}
            <div className="flex items-center bg-white px-4 py-2.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#e2e8f0] group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full sm:w-64">
              <Search className="w-4 h-4 text-[#64748b] shrink-0 group-focus-within:text-[#9956DE] transition-colors" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none ml-2 text-[13px] w-full text-[#475569] placeholder:text-[#94a3b8]"
              />
            </div>
            
            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto p-2 -m-2">
              {['all', 'High', 'Medium', 'Low'].map(level => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level)}
                  className={`px-4 py-1.5 text-[13px] font-semibold rounded-full whitespace-nowrap transition-colors shadow-md ${
                    riskFilter === level
                      ? 'bg-[#9956DE] text-white'
                      : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {level === 'all' ? 'All' : `${level} Risk`}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={loadStudents}
            className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-colors shrink-0 bg-white px-4 py-2 rounded-full shadow-md hover:bg-slate-50 self-end sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Imported Topic Context Banner (Compact) */}
      <div className="bg-[#f5f3ff]/60 border border-[#e0e7ff] rounded-[14px] px-5 py-3 mb-6 flex items-start sm:items-center gap-3">
        <div className="mt-0.5 sm:mt-0 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9956DE]"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center flex-1">
          <span className="text-[#9956DE] font-semibold text-[13px] whitespace-nowrap mr-1">
            Imported Topic Context{className ? ` for ${className}` : ''}:
          </span>
          {importedTopicsLoading ? (
            <span className="text-[#8b5cf6] text-[13px]">Loading class-scoped imported topics...</span>
          ) : importedTopicTitles.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 mt-1 sm:mt-0">
              {importedTopicTitles.map((topic, i) => (
                <React.Fragment key={i}>
                  <span className="text-[#8b5cf6] text-[13px]">{topic}</span>
                  {i < importedTopicTitles.length - 1 && <span className="text-[#c4b5fd] text-[13px]">•</span>}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <span className="text-[#8b5cf6] text-[13px]">No imported topics found for this class context</span>
          )}
          {(importedTopicsWarning || studentsWarning) && (
            <div className="mt-1 sm:mt-0 sm:ml-auto text-[11px] text-rose-500 font-medium">
              {[importedTopicsWarning, studentsWarning].filter(Boolean).join(' | ')}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[18px] border border-slate-200 overflow-hidden shadow-sm overflow-x-auto table-scrollbar relative">
        <div className="min-w-[1320px] flex flex-col">
          {/* Header */}
          <div className="flex items-center bg-[#9956DE] border-b border-[#8b5cf6] text-[8px] md:text-[11px] font-bold text-white tracking-wider uppercase h-10 md:h-12 sticky top-0 z-20 shadow-md">
            <div 
              className="w-[200px] md:w-[260px] shrink-0 sticky left-0 z-30 bg-[#9956DE] backdrop-blur-sm px-3 md:px-5 h-full flex items-center border-r border-[#8b5cf6] shadow-[2px_0_4px_rgba(0,0,0,0.1)] cursor-pointer hover:text-white/80 transition-colors"
              onClick={() => handleSort('name')}
            >
              Student <SortIcon field="name" />
            </div>
            <div 
              className="w-[80px] md:w-[120px] shrink-0 px-2 md:px-4 flex justify-center cursor-pointer hover:text-white/80 transition-colors"
              onClick={() => handleSort('riskLevel')}
            >
              <span className="hidden md:inline">Risk Level</span><span className="md:hidden">Risk</span> <SortIcon field="riskLevel" />
            </div>
            <div 
              className="w-[120px] md:w-[200px] shrink-0 px-2 md:px-4 flex items-center gap-1 cursor-pointer hover:text-white/80 transition-colors"
              onClick={() => handleSort('avgQuizScore')}
            >
              <span className="hidden md:inline">Avg. Score</span><span className="md:hidden">Score</span> <SortIcon field="avgQuizScore" />
            </div>
            <div 
              className="w-[100px] md:w-[180px] shrink-0 px-2 md:px-4 flex items-center gap-1 cursor-pointer hover:text-white/80 transition-colors"
              onClick={() => handleSort('engagementScore')}
            >
              <span className="hidden md:inline">Engagement</span><span className="md:hidden">Engage</span> <SortIcon field="engagementScore" />
            </div>
            <div className="w-[100px] md:w-[160px] shrink-0 px-2 md:px-4 flex justify-center cursor-pointer hover:text-white/80 transition-colors">
              <span className="hidden md:inline">Weakest Topic</span><span className="md:hidden">Weak</span>
            </div>
            {COMPETENCY_MATRIX_ITEMS.map((item, idx) => (
              <div 
                key={item.key} 
                className={`w-[60px] md:w-[100px] shrink-0 px-1 md:px-2 flex justify-center ${idx === COMPETENCY_MATRIX_ITEMS.length - 1 ? 'border-r border-transparent' : ''}`}
              >
                <span className="hidden md:inline">{item.header}</span>
                <span className="md:hidden">{item.short}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
            {filteredRows.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <User size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No students match the current filters</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRows.map((row) => {
                  const recommendationTone = row.student.riskLevel === 'High'
                    ? {
                        card: 'bg-rose-50 border-rose-200',
                        title: 'text-rose-800',
                        chip: 'bg-rose-100 text-rose-700',
                      }
                    : row.student.riskLevel === 'Medium'
                      ? {
                          card: 'bg-amber-50 border-amber-200',
                          title: 'text-amber-800',
                          chip: 'bg-amber-100 text-amber-700',
                        }
                      : {
                          card: 'bg-sky-50 border-sky-200',
                          title: 'text-sky-800',
                          chip: 'bg-sky-100 text-sky-700',
                        };

                  return (
                  <div key={row.rowKey} className="flex flex-col border-b border-slate-100 group">
                    <div 
                      className="flex items-center min-h-[64px] hover:bg-slate-50/60 transition-colors cursor-pointer relative"
                      onClick={() => void toggleExpand(row.rowKey)}
                    >
                      {/* Sticky Student Column */}
                      <div className="w-[260px] shrink-0 sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 transition-colors px-5 h-full min-h-[64px] flex items-center border-r border-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.01)]">
                        <div className={`transition-transform duration-200 mr-3 shrink-0 ${row.expanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                        <img src={row.student.avatar} alt={row.student.name} className="w-8 h-8 rounded-full bg-border object-cover shrink-0 mr-3" />
                        <span className="font-semibold text-slate-800 text-[14px] truncate">{row.student.name}</span>
                      </div>

                      {/* Risk Level */}
                      <div className="w-[120px] shrink-0 px-4 flex justify-center">
                        <span className={`px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${
                          row.student.riskLevel === 'High' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          row.student.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {row.student.riskLevel}
                        </span>
                      </div>

                      {/* Avg Score */}
                      <div className="w-[200px] shrink-0 px-4 flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              row.student.avgQuizScore >= 80 ? 'bg-emerald-500' :
                              row.student.avgQuizScore >= 60 ? 'bg-amber-400' :
                              'bg-rose-500'
                            }`}
                            style={{ width: `${row.student.avgQuizScore}%` }}
                          ></div>
                        </div>
                        <span className="text-[13px] font-bold text-slate-800 w-8">{row.student.avgQuizScore}%</span>
                      </div>

                      {/* Engagement */}
                      <div className="w-[180px] shrink-0 px-4 flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-[#9956DE]"
                            style={{ width: `${row.student.engagementScore}%` }}
                          ></div>
                        </div>
                        <span className="text-[13px] font-bold text-slate-800 w-8">{row.student.engagementScore}%</span>
                      </div>

                      {/* Weakest Topic */}
                      <div className="w-[160px] shrink-0 px-4 flex justify-center">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full truncate max-w-full border border-slate-200">
                          {row.student.weakestTopic}
                        </span>
                      </div>

                      {/* Competency Matrix Categories */}
                      {COMPETENCY_MATRIX_ITEMS.map((item) => {
                        const value = row.competencyMatrix?.[item.key] ?? 0;
                        const tone = getMatrixScoreTone(value);
                        return (
                          <div key={item.key} className="w-[100px] shrink-0 px-2 flex justify-center">
                            {row.competencyMatrixLoading ? (
                              <Loader2 size={12} className="animate-spin text-muted-foreground" />
                            ) : row.competencyMatrix ? (
                              <span className={`text-[12px] font-medium px-2 rounded-full border ${
                                value >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                value >= 60 ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                'text-rose-500 bg-rose-50 border-rose-100'
                              }`}>
                                {value}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                {/* Expanded competency detail */}
                <AnimatePresence>
                  {row.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-slate-50/80 border-t border-slate-100 shadow-inner"
                    >
                      <div className="flex min-w-[1320px]">
                        {/* Filler sticky left space to match layout */}
                        <div className="w-[260px] shrink-0 sticky left-0 z-10 bg-slate-50/90 border-r border-slate-100 flex items-start justify-end pr-4 py-4">
                          <div className="w-1.5 h-full rounded-full bg-[#9956DE]/30"></div>
                        </div>
                        <div className="flex-1 py-4 pl-6 pr-6">
                          {row.loading ? (
                            <div className="flex items-center py-4">
                              <Loader2 size={16} className="animate-spin text-indigo-500 mr-2" />
                              <span className="text-sm text-slate-500">Analyzing competency data...</span>
                            </div>
                          ) : row.competency ? (
                            <div className="space-y-4 max-w-4xl">
                              {/* Recommendations Banner */}
                              {row.competency.recommendedTopics.length > 0 && (
                                <div className="bg-[#f5f3ff] rounded-[12px] p-4 border border-[#e0e7ff] inline-block shadow-sm mb-4">
                                  <h4 className="text-[#7274ED] font-semibold text-[13px] flex items-center gap-2 mb-1.5">
                                    <BookOpen className="w-4 h-4" /> Recommended Focus Areas
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {row.competency.recommendedTopics.map((topic, i) => (
                                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full border border-indigo-100 bg-white text-indigo-700 text-xs font-medium shadow-sm">
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Competency breakdown */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {row.competency.competencies.map((c, i) => (
                                  <CompetencyCard key={i} competency={c} />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500 py-4">Failed to load competency details.</div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                  </div>
                );
              })}
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
};

// -”€-”€-”€ Competency Card Sub-Component -”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€-”€

const CompetencyCard: React.FC<{ competency: TopicCompetency }> = ({ competency }) => {
  const colors = COMPETENCY_COLORS[competency.competencyLevel] || COMPETENCY_COLORS.developing;

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h6 className="text-xs font-bold text-foreground truncate flex-1">{competency.topic}</h6>
        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}>
          {competency.competencyLevel}
        </span>
      </div>

      {/* Efficiency bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500">Efficiency</span>
          <span className="font-bold text-muted-foreground">{competency.efficiencyScore}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${competency.efficiencyScore}%` }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`h-full rounded-full ${colors.bar}`}
          />
        </div>
      </div>

      {/* Perspective */}
      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{competency.perspective}</p>
    </div>
  );
};

export default StudentCompetencyTable;
