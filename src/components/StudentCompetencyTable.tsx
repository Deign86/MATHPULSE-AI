import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown, ChevronRight, ChevronUp, Loader2, Search,
  AlertTriangle, Award, TrendingUp, TrendingDown, BarChart3,
  User, BookOpen, Brain, RefreshCw,
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
import { getUserProgress, getUserProgressIfExists } from '../services/progressService';
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
          const pct = lessonProgressMap?.[lesson.id]?.progressPercent;
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
  { key: 'application', short: 'A', label: 'Application', header: 'Application' },
  { key: 'engagement', short: 'E', label: 'Engagement', header: 'Engagement' },
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
}> = ({ classSectionId, className, fallbackStudents = [] }) => {
  const { currentUser } = useAuth();

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
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`,
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
    avatar: student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`,
    classSectionId: student.classSectionId ?? null,
    riskLevel: (String(student.riskLevel).charAt(0).toUpperCase() + String(student.riskLevel).slice(1).toLowerCase()) as 'High' | 'Medium' | 'Low',
    engagementScore: student.engagementScore,
    avgQuizScore: Number(student.avgQuizScore ?? student.avgScore ?? 0),
    weakestTopic: student.weakestTopic || 'Foundational Skills',
  }), []);

  const loadCompetencyMatrices = useCallback(async (students: CompetencyStudent[], loadId: number) => {
    const results = await Promise.allSettled(
      students.map(async (student) => {
        const progress = await getUserProgressIfExists(student.id);
        return { studentId: student.id, summary: computeCompetencyMatrixSummary(progress) };
      }),
    );

    if (competencyMatrixLoadIdRef.current !== loadId) return;

    const summaryByStudentId = new Map<string, CompetencyMatrixSummary | null>();
    students.forEach((student) => summaryByStudentId.set(student.id, null));

    results.forEach((result, index) => {
      const studentId = students[index]?.id;
      if (!studentId) return;

      if (result.status === 'fulfilled') {
        summaryByStudentId.set(studentId, result.value.summary);
      } else {
        summaryByStudentId.set(studentId, null);
      }
    });

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
        avatar: student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`,
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

      // If expanding and no competency data yet, fetch it
      if (newExpanded && !r.competency && !r.loading) {
        // Start loading
        void fetchCompetency(rowKey);
        return { ...r, expanded: true, loading: true };
      }

      return { ...r, expanded: newExpanded };
    }));
  };

  const fetchCompetency = async (rowKey: string) => {
    try {
      const row = rows.find(r => r.rowKey === rowKey);
      if (!row) return;
      const studentId = row.student.id;

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
      const row = rows.find(r => r.rowKey === rowKey);
      const avg = row?.student.avgQuizScore || 50;
      const studentId = row?.student.id || '';

      const fallback: StudentCompetencyResponse = {
        studentId,
        competencies: [
          { topic: row?.student.weakestTopic || 'Unknown', efficiencyScore: Math.max(15, avg - 20), competencyLevel: avg < 50 ? 'beginner' : 'developing', perspective: `Student needs focused practice in ${row?.student.weakestTopic}.` },
          { topic: 'Functions and Relations', efficiencyScore: Math.min(95, avg + 10), competencyLevel: avg > 70 ? 'proficient' : 'developing', perspective: 'Shows solid understanding of function concepts.' },
          { topic: 'Problem Solving', efficiencyScore: avg, competencyLevel: avg > 80 ? 'advanced' : avg > 60 ? 'proficient' : 'developing', perspective: 'Applies mathematical reasoning consistently.' },
        ],
        recommendedTopics: [row?.student.weakestTopic || 'Review fundamentals'],
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
    if (sortField !== field) return <ChevronDown size={14} className="text-slate-500" />;
    return sortDir === 'asc'
      ? <ChevronUp size={14} className="text-sky-600" />
      : <ChevronDown size={14} className="text-sky-600" />;
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Students', value: totalStudents, icon: <User size={20} />, color: 'bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]' },
          { label: 'At-Risk Students', value: highRisk, icon: <AlertTriangle size={20} />, color: 'bg-[color-mix(in_srgb,var(--chart-2)_10%,transparent)] text-[var(--chart-2)]' },
          { label: 'Class Average', value: `${avgScore}%`, icon: <BarChart3 size={20} />, color: 'bg-[color-mix(in_srgb,var(--chart-3)_10%,transparent)] text-[var(--chart-3)]' },
          { label: 'Avg. Engagement', value: `${avgEngagement}%`, icon: <TrendingUp size={20} />, color: 'bg-[color-mix(in_srgb,var(--chart-1)_10%,transparent)] text-[var(--chart-1)]' },
        ].map((card, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="student-competency-search"
            name="studentCompetencySearch"
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
          />
        </div>

        {/* Risk filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {['all', 'High', 'Medium', 'Low'].map(level => (
            <button
              key={level}
              onClick={() => setRiskFilter(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                riskFilter === level
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {level === 'all' ? 'All' : `${level} Risk`}
            </button>
          ))}
        </div>

        <button
          onClick={loadStudents}
          className="sm:ml-auto w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-accent rounded-lg text-xs font-semibold text-muted-foreground transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Imported Topic Context */}
      <div className="bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] rounded-xl p-4">
        <p className="text-sm font-semibold text-[var(--primary)]">
          Imported Topic Context{className ? ` for ${className}` : ''}
        </p>
        <p className="text-xs text-[var(--primary)] mt-1 opacity-80">
          {importedTopicsLoading
            ? 'Loading class-scoped imported topics...'
            : importedTopicTitles.length > 0
            ? `${importedTopicTitles.length} imported topics loaded for competency guidance`
            : 'No imported topics found for this class context'}
        </p>
        {importedTopicsWarning && <p className="text-[11px] text-[var(--chart-4)] mt-1">{importedTopicsWarning}</p>}
        {studentsWarning && <p className="text-[11px] text-[var(--chart-4)] mt-1">{studentsWarning}</p>}
        {importedTopicTitles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {importedTopicTitles.map((topic) => (
              <span key={topic} className="text-[11px] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] px-2 py-0.5 rounded">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border">
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[1920px]">
            {/* Header */}
            <div className="grid grid-cols-[48px_280px_120px_120px_120px_120px_120px_140px_170px_170px_220px] items-center gap-6 px-6 py-4 bg-muted/60 border-b border-border text-xs font-semibold text-muted-foreground tracking-normal">
              <div></div>
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('name')}>
                Student <SortIcon field="name" />
              </button>
              {COMPETENCY_MATRIX_ITEMS.map((item) => (
                <div key={item.key} className="text-center leading-none whitespace-nowrap tracking-normal">
                  {item.header}
                </div>
              ))}
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('riskLevel')}>
                Risk Level <SortIcon field="riskLevel" />
              </button>
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('avgQuizScore')}>
                Avg. Score <SortIcon field="avgQuizScore" />
              </button>
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('engagementScore')}>
                Engagement <SortIcon field="engagementScore" />
              </button>
              <div className="flex justify-end pr-2">Weakest Topic</div>
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
                  <div key={row.rowKey} className="border-b border-border last:border-0">
                {/* Main row */}
                <button
                  onClick={() => void toggleExpand(row.rowKey)}
                  className="w-full grid grid-cols-[48px_280px_120px_120px_120px_120px_120px_140px_170px_170px_220px] gap-6 px-6 py-5 items-center hover:bg-muted transition-colors text-left"
                >
                  {/* Expand icon */}
                  <div className="flex items-center">
                    <span className="inline-flex h-4 w-4 items-center justify-center text-slate-500">
                      {row.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                  </div>

                  {/* Student info */}
                  <div className="flex items-center gap-3">
                    <img
                      src={row.student.avatar}
                      alt={row.student.name}
                      className="w-8 h-8 rounded-full bg-border object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{row.student.name}</p>
                      <p className="text-xs text-slate-500">{row.student.email}</p>
                    </div>
                  </div>

                  {/* Competency Matrix Categories */}
                  {COMPETENCY_MATRIX_ITEMS.map((item) => {
                    const value = row.competencyMatrix?.[item.key] ?? 0;
                    const tone = getMatrixScoreTone(value);
                    return (
                      <div key={item.key} className="flex items-center justify-center">
                        {row.competencyMatrixLoading ? (
                          <Loader2 size={14} className="animate-spin text-muted-foreground" />
                        ) : row.competencyMatrix ? (
                          <span
                            title={`${item.label}: ${value}%`}
                            className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
                          >
                            {value}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Risk Level */}
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ${
                      RISK_COLORS[row.student.riskLevel]?.bg
                    } ${RISK_COLORS[row.student.riskLevel]?.text} ${RISK_COLORS[row.student.riskLevel]?.ring}`}>
                      {row.student.riskLevel === 'High' && <AlertTriangle size={10} />}
                      {row.student.riskLevel}
                    </span>
                  </div>

                  {/* Avg Score as bar */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.student.avgQuizScore >= 80 ? 'bg-[var(--chart-3)]' :
                            row.student.avgQuizScore >= 60 ? 'bg-[var(--chart-4)]' :
                            'bg-[var(--chart-2)]'
                          }`}
                          style={{ width: `${row.student.avgQuizScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground w-8 text-right">{row.student.avgQuizScore}%</span>
                    </div>
                  </div>

                  {/* Engagement */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.student.engagementScore >= 75 ? 'bg-[var(--primary)]' :
                            row.student.engagementScore >= 50 ? 'bg-[var(--primary)]/60' :
                            'bg-muted-foreground'
                          }`}
                          style={{ width: `${row.student.engagementScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground w-8 text-right">{row.student.engagementScore}%</span>
                    </div>
                  </div>

                  {/* Weakest Topic */}
                  <div className="flex justify-end pr-2">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      {row.student.weakestTopic}
                    </span>
                  </div>
                </button>

                {/* Expanded competency detail */}
                <AnimatePresence>
                  {row.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-muted border-t border-border">
                        {row.loading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 size={20} className="animate-spin text-sky-500" />
                            <span className="ml-2 text-sm text-muted-foreground">Analyzing competency data...</span>
                          </div>
                        ) : row.competency ? (
                          <div className="space-y-4">
                            {/* Competency breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {row.competency.competencies.map((c, i) => (
                                <CompetencyCard key={i} competency={c} />
                              ))}
                            </div>

                            {/* Recommendations */}
                            {row.competency.recommendedTopics.length > 0 && (
                              <div className={`border rounded-lg p-3 ${recommendationTone.card}`}>
                                <h5 className={`text-xs font-bold mb-1.5 flex items-center gap-1 ${recommendationTone.title}`}>
                                  <BookOpen size={12} />
                                  Recommended Focus Areas
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {row.competency.recommendedTopics.map((topic, i) => (
                                    <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${recommendationTone.chip}`}>
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {importedTopicTitles.length > 0 && (
                              <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                                <h5 className="text-xs font-bold text-sky-800 mb-1.5 flex items-center gap-1">
                                  <Brain size={12} />
                                  Class Imported Topics
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {importedTopicTitles.slice(0, 8).map((topic, i) => (
                                    <span key={`${topic}_${i}`} className="inline-flex items-center bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-xs font-medium">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Mastered topics */}
                            {row.competency.excludeTopics.length > 0 && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                <h5 className="text-xs font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                                  <Award size={12} />
                                  Mastered Topics (can exclude from quizzes)
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {row.competency.excludeTopics.map((topic, i) => (
                                    <span key={i} className="inline-flex items-center bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-4">
                            No competency data available. Student needs to complete quizzes first.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                  </div>
                );})}
              </div>
            )}
          </div>
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

