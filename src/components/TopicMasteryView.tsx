import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2, BarChart3, CheckCircle, AlertTriangle, EyeOff, Search, Bell, BookOpen, Users } from 'lucide-react';
import StudentCompetencyTable, { type FallbackStudentInput } from './StudentCompetencyTable';
import { TeacherStatCard } from './TeacherStatCard';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { GRADE_LEVELS, SHS_MATH_SUBJECTS, getActiveSubjectIdsForGrade, type SubjectId } from '../data/subjects';
import { cacheKeys } from '../utils/cacheKeys';
import { useCurriculum } from '../hooks/useCurriculum';
import { apiUrl } from '../config/env';
import { recordGet } from '../utils/memberOf';
import { filterTopicMasteryRows } from '../utils/topicMasteryFilters';

// ─── Types ──────────────────────────────────────────────────

interface TopicMasteryData {
  topicName: string;
  subjectId: string;
  unit: string;
  classAverage: number;
  studentsAttempted: number;
  totalStudents: number;
  studentsAbove85: number;
  masteryPercentage: number;
  masteryStatus: 'mastered' | 'on_track' | 'needs_attention' | 'no_data';
  isExcluded: boolean;
}

interface MasterySummary {
  totalTopicsTracked: number;
  masteredCount: number;
  needsAttentionCount: number;
  excludedCount: number;
}

const DEFAULT_MASTERY_SUMMARY: MasterySummary = {
  totalTopicsTracked: 0,
  masteredCount: 0,
  needsAttentionCount: 0,
  excludedCount: 0,
};

type PaginationItem = { kind: 'page'; page: number } | { kind: 'ellipsis'; id: string };

function createPaginationItems(total: number, current: number): PaginationItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({ kind: 'page', page: i + 1 }));
  }

  const items: PaginationItem[] = [{ kind: 'page', page: 1 }];

  if (current > 3) {
    items.push({ kind: 'ellipsis', id: 'start-dots' });
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let p = start; p <= end; p += 1) {
    items.push({ kind: 'page', page: p });
  }

  if (current < total - 2) {
    items.push({ kind: 'ellipsis', id: 'end-dots' });
  }

  items.push({ kind: 'page', page: total });
  return items;
}

type SortField = 'topicName' | 'classAverage' | 'studentsAttempted' | 'masteryStatus';
type SortDir = 'asc' | 'desc';

const SUBJECT_BADGES = {
  'gen-math': { label: 'General Mathematics', color: 'bg-sky-100 text-sky-700' },
  'stats-prob': { label: 'Statistics & Probability', color: 'bg-sky-100 text-sky-700' },
  'business-math': { label: 'Business Mathematics', color: 'bg-emerald-100 text-emerald-700' },
  'finite-math': { label: 'Finite Mathematics', color: 'bg-cyan-100 text-cyan-700' },
};

const STATUS_BADGES = {
  mastered: { label: 'Mastered', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  on_track: { label: 'On Track', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  needs_attention: { label: 'Needs Work', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  no_data: { label: 'No Data', color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

const STATUS_ORDER = {
  needs_attention: 0,
  on_track: 1,
  no_data: 2,
  mastered: 3,
};

// ─── Component ──────────────────────────────────────────────

export interface TopicMasteryViewProps {
  classSectionId?: string;
  className?: string;
  classOptions?: Array<{ sectionId: string; name: string }>;
  onClassSectionChange?: (sectionId: string) => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  activeTab?: 'mastery' | 'competency';
  onTabChange?: (tab: 'mastery' | 'competency') => void;
  teacherId?: string;
  fallbackStudents?: FallbackStudentInput[];
  insightDismissed?: boolean;
  onOpenInsightModal?: () => void;
}

const TopicMasteryView: React.FC<TopicMasteryViewProps> = ({
  classSectionId,
  className,
  classOptions = [],
  onClassSectionChange,
  onOpenNotifications,
  onOpenProfile,
  activeTab,
  onTabChange,
  teacherId,
  fallbackStudents = [],
  insightDismissed,
  onOpenInsightModal,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [localTab, setLocalTab] = useState<'mastery' | 'competency'>(activeTab || 'mastery');
  const currentTab = activeTab || localTab;

  useEffect(() => {
    if (activeTab && activeTab !== localTab) {
      setLocalTab(activeTab);
    }
  }, [activeTab, localTab]);

  const handleTabSwitch = (tab: 'mastery' | 'competency') => {
    setLocalTab(tab);
    onTabChange?.(tab);
  };

  // Data state
  const [topics, setTopics] = useState<TopicMasteryData[]>([]);
  const [summary, setSummary] = useState<MasterySummary>(DEFAULT_MASTERY_SUMMARY);
  const [loading, setLoading] = useState(true);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('classAverage');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // SAFETY: trusted internal value already conforms to the asserted type.
  const allSubjectIds = SHS_MATH_SUBJECTS.map((subject) => subject.id as SubjectId);
  const subjectNameById = SHS_MATH_SUBJECTS.reduce<Record<string, string>>((acc, subject) => {
    acc[subject.id] = subject.name;
    return acc;
  }, {});

  // Load curriculum (logs source - Firestore vs static)
  const { isLoading: curriculumLoading, refetch: refetchCurriculum } = useCurriculum();

  // Log curriculum source on load
  useEffect(() => {
    if (!curriculumLoading) {
      console.log('[TopicMasteryView] Curriculum ready');
      refetchCurriculum();
    }
  }, [curriculumLoading, refetchCurriculum]);

  // Selection for bulk actions
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  // Excluded topics from Firestore
  const [excludedTopics, setExcludedTopics] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ─── Load topic mastery data ──────────────────────────────

  const masteryQuery = useQuery({
    queryKey: cacheKeys.topicMastery(currentUser?.uid || 'anonymous', classSectionId),
    enabled: Boolean(currentUser),
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      try {
        if (!currentUser) {
          return {
            // SAFETY: trusted internal value already conforms to the asserted type.
            excluded: [] as string[],
            // SAFETY: trusted internal value already conforms to the asserted type.
            topics: [] as TopicMasteryData[],
            summary: { totalTopicsTracked: 0, masteredCount: 0, needsAttentionCount: 0, excludedCount: 0 },
          };
        }

        const settingsRef = doc(db, 'teachers', currentUser.uid, 'settings', 'quizSettings');
        const settingsSnap = await getDoc(settingsRef);
        const excluded: string[] = settingsSnap.exists() ? settingsSnap.data()?.excludedTopics || [] : [];

        const params = new URLSearchParams({ teacherId: currentUser.uid });
        if (classSectionId) {
          params.set('classSectionId', classSectionId);
        }

        const token = await currentUser.getIdToken();
        const res = await fetch(apiUrl(`/api/analytics/topic-mastery?${params.toString()}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          return {
            excluded,
            // SAFETY: trusted internal value already conforms to the asserted type.
            topics: [] as TopicMasteryData[],
            summary: { totalTopicsTracked: 0, masteredCount: 0, needsAttentionCount: 0, excludedCount: excluded.length },
          };
        }

        const data = await res.json();
        const topicsWithExclude = (data.topics || []).map((topic: TopicMasteryData) => ({
          ...topic,
          isExcluded: excluded.includes(topic.topicName),
        }));
        const derivedSummary = {
          totalTopicsTracked: topicsWithExclude.length,
          masteredCount: topicsWithExclude.filter((topic: TopicMasteryData) => topic.masteryStatus === 'mastered').length,
          needsAttentionCount: topicsWithExclude.filter((topic: TopicMasteryData) => topic.masteryStatus === 'needs_attention').length,
          excludedCount: topicsWithExclude.filter((topic: TopicMasteryData) => topic.isExcluded).length,
        };

        return {
          excluded,
          topics: topicsWithExclude,
          summary: topicsWithExclude.length > 0 ? derivedSummary : (data.summary || derivedSummary),
        };
      } catch {
        return {
          // SAFETY: trusted internal value already conforms to the asserted type.
          excluded: [] as string[],
          // SAFETY: trusted internal value already conforms to the asserted type.
          topics: [] as TopicMasteryData[],
          summary: { totalTopicsTracked: 0, masteredCount: 0, needsAttentionCount: 0, excludedCount: 0 },
        };
      }
    },
  });

  useEffect(() => {
    setLoading(masteryQuery.isLoading || masteryQuery.isFetching);
    if (!masteryQuery.data) {
      setExcludedTopics([]);
      setTopics([]);
      setSummary(DEFAULT_MASTERY_SUMMARY);
      setSelectedTopics(new Set());
      return;
    }

    setExcludedTopics(masteryQuery.data.excluded);
    setTopics(masteryQuery.data.topics);
    setSummary(masteryQuery.data.summary);
  }, [masteryQuery.data, masteryQuery.isFetching, masteryQuery.isLoading]);

  // ─── Toggle exclude ───────────────────────────────────────

  const toggleExclude = async (topicName: string) => {
    if (!currentUser) return;
    const newExcluded = excludedTopics.includes(topicName)
      ? excludedTopics.filter(t => t !== topicName)
      : [...excludedTopics, topicName];

    setExcludedTopics(newExcluded);
    setTopics(prev => prev.map(t => t.topicName === topicName ? { ...t, isExcluded: !t.isExcluded } : t));
    setSummary(prev => ({ ...prev, excludedCount: newExcluded.length }));

    try {
      const settingsRef = doc(db, 'teachers', currentUser.uid, 'settings', 'quizSettings');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        await updateDoc(settingsRef, { excludedTopics: newExcluded });
      } else {
        await setDoc(settingsRef, { excludedTopics: newExcluded });
      }
    } catch {
      toast.error('Failed to update excluded topics');
    }
  };

  // ─── Bulk actions ─────────────────────────────────────────

  const handleBulkExclude = async () => {
    if (!currentUser) return;
    const newExcluded = [...new Set([...excludedTopics, ...selectedTopics])];
    setExcludedTopics(newExcluded);
    setTopics(prev => prev.map(t => selectedTopics.has(t.topicName) ? { ...t, isExcluded: true } : t));
    setSummary(prev => ({ ...prev, excludedCount: newExcluded.length }));
    setSelectedTopics(new Set());

    try {
      const settingsRef = doc(db, 'teachers', currentUser.uid, 'settings', 'quizSettings');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        await updateDoc(settingsRef, { excludedTopics: newExcluded });
      } else {
        await setDoc(settingsRef, { excludedTopics: newExcluded });
      }
      toast.success(`${selectedTopics.size} topics excluded from quizzes`);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleBulkInclude = async () => {
    if (!currentUser) return;
    const newExcluded = excludedTopics.filter(t => !selectedTopics.has(t));
    setExcludedTopics(newExcluded);
    setTopics(prev => prev.map(t => selectedTopics.has(t.topicName) ? { ...t, isExcluded: false } : t));
    setSummary(prev => ({ ...prev, excludedCount: newExcluded.length }));
    setSelectedTopics(new Set());

    try {
      const settingsRef = doc(db, 'teachers', currentUser.uid, 'settings', 'quizSettings');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        await updateDoc(settingsRef, { excludedTopics: newExcluded });
      } else {
        await setDoc(settingsRef, { excludedTopics: newExcluded });
      }
      toast.success(`${selectedTopics.size} topics re-included in quizzes`);
    } catch {
      toast.error('Failed to update');
    }
  };

  // ─── Sorting ──────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ─── Filter and sort ─────────────────────────────────────
  const gradeScopedSubjectIds = gradeFilter === 'all'
    ? allSubjectIds
    : getActiveSubjectIdsForGrade(gradeFilter);

  useEffect(() => {
    if (subjectFilter === 'all') return;
    // SAFETY: trusted internal value already conforms to the asserted type.
    if (!gradeScopedSubjectIds.includes(subjectFilter as SubjectId)) {
      setSubjectFilter('all');
    }
  }, [gradeScopedSubjectIds, subjectFilter]);

  // Normalize backend subject names to canonical IDs before filtering, so the
  // ID-only filter helper does not discard rows carrying subject names.
  const normalizedTopics = topics.map((t) => {
    const matchedSubject = SHS_MATH_SUBJECTS.find((subject) =>
      subject.id === t.subjectId || subject.name.toLowerCase() === t.subjectId.trim().toLowerCase()
    );
    return matchedSubject ? { ...t, subjectId: matchedSubject.id } : t;
  });
  const filteredTopics = filterTopicMasteryRows(normalizedTopics, subjectFilter, gradeScopedSubjectIds, searchQuery)
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'topicName': return dir * a.topicName.localeCompare(b.topicName);
        case 'classAverage': return dir * (a.classAverage - b.classAverage);
        case 'studentsAttempted': return dir * (a.studentsAttempted - b.studentsAttempted);
        case 'masteryStatus': return dir * ((STATUS_ORDER[a.masteryStatus] || 0) - (STATUS_ORDER[b.masteryStatus] || 0));
        default: return 0;
      }
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [subjectFilter, gradeFilter, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredTopics.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTopics = filteredTopics.slice((validCurrentPage - 1) * pageSize, validCurrentPage * pageSize);
  const visibleRangeStart = filteredTopics.length === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const visibleRangeEnd = Math.min(validCurrentPage * pageSize, filteredTopics.length);

  const toggleSelectCurrentPage = () => {
    const pageTopicNames = paginatedTopics.map((t) => t.topicName);
    const allSelected = pageTopicNames.length > 0 && pageTopicNames.every((name) => selectedTopics.has(name));
    const next = new Set(selectedTopics);
    if (allSelected) {
      pageTopicNames.forEach((name) => next.delete(name));
    } else {
      pageTopicNames.forEach((name) => next.add(name));
    }
    setSelectedTopics(next);
  };

  const toggleSelectAll = () => {
    if (selectedTopics.size === filteredTopics.length) {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(new Set(filteredTopics.map(t => t.topicName)));
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-white/40" />;
    return sortDir === 'asc'
      ? <ChevronUp size={14} className="text-white font-bold" />
      : <ChevronDown size={14} className="text-white font-bold" />;
  };

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
        <span className="ml-2 text-[#64748b]">Loading topic mastery data...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full p-3.5 sm:p-6 xl:p-8 space-y-4 sm:space-y-6 pb-28 sm:pb-32 lg:pb-8"
    >
      {/* Tab Switcher: Student Mastery Matrix vs Competency Matrix (Unified Segmented Control Pill) */}
      <div className="inline-flex items-center p-1 sm:p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200/90 dark:border-slate-800 rounded-full shadow-2xs gap-1 max-w-full overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleTabSwitch('mastery')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-display font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            currentTab === 'mastery'
              ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-sm shadow-purple-500/25 ring-1 ring-white/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/70'
          }`}
        >
          <BarChart3 size={15} className="shrink-0" />
          <span className="sm:hidden">Mastery Matrix</span>
          <span className="hidden sm:inline">Student Mastery Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('competency')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-display font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            currentTab === 'competency'
              ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-sm shadow-purple-500/25 ring-1 ring-white/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/70'
          }`}
        >
          <Users size={15} className="shrink-0" />
          <span className="sm:hidden">Competency Matrix</span>
          <span className="hidden sm:inline">Competency Matrix</span>
        </button>
      </div>

      {currentTab === 'competency' ? (
        <StudentCompetencyTable
          classSectionId={classSectionId}
          className={className}
          fallbackStudents={fallbackStudents}
          classOptions={classOptions}
          onClassSectionChange={onClassSectionChange}
          onBack={classSectionId ? () => onClassSectionChange?.('') : undefined}
          onOpenNotifications={onOpenNotifications}
          onOpenProfile={onOpenProfile}
          insightDismissed={insightDismissed}
          onOpenInsightModal={onOpenInsightModal}
          embedded
        />
      ) : (
        <>
          {/* Search & Filters Row */}
          <div className="flex flex-col md:flex-row gap-2.5 sm:gap-4">
            {classOptions.length > 0 && (
              <label className="sr-only" htmlFor="topic-mastery-class">Class section</label>
            )}
            {classOptions.length > 0 && (
              <select
                id="topic-mastery-class"
                aria-label="Class section"
                value={classSectionId || ''}
                onChange={(event) => onClassSectionChange?.(event.target.value)}
                className="bg-white border border-[#e2e8f0] text-[#475569] text-xs sm:text-[13px] rounded-[12px] px-3 py-2.5"
              >
                <option value="">All Classes</option>
                {classOptions.map((classOption) => (
                  <option key={classOption.sectionId} value={classOption.sectionId}>{classOption.name}</option>
                ))}
              </select>
            )}
            <div className="flex items-center bg-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-[#e2e8f0] group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full md:w-64">
              <Search size={15} className="text-[#64748b] shrink-0 group-focus-within:text-[#4f46e5] transition-colors" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none ml-2 text-xs sm:text-[13px] w-full text-[#475569] placeholder:text-[#94a3b8]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full md:w-auto md:flex md:items-center">
              <div className="relative w-full md:w-48">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="appearance-none w-full bg-white border border-[#e2e8f0] text-[#475569] text-xs sm:text-[13px] font-medium rounded-[12px] pl-3 pr-8 sm:pl-4 sm:pr-10 py-2 sm:py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer truncate"
                >
                  <option value="all">All Subjects</option>
                  {gradeScopedSubjectIds.map((subjectId) => (
                    <option key={subjectId} value={subjectId}>{subjectNameById[subjectId] || subjectId}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-[#64748b] absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative w-full md:w-48">
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="appearance-none w-full bg-white border border-[#e2e8f0] text-[#475569] text-xs sm:text-[13px] font-medium rounded-[12px] pl-3 pr-8 sm:pl-4 sm:pr-10 py-2 sm:py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer truncate"
                >
                  <option value="all">All Grades</option>
                  {GRADE_LEVELS.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-[#64748b] absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <TeacherStatCard
              color="purple"
              title="Total Topics"
              badgeText="Curriculum"
              icon={BarChart3}
              value={summary.totalTopicsTracked}
              subtitle="Tracked in System"
            />

            <TeacherStatCard
              color="green"
              title="Mastered"
              badgeText={summary.totalTopicsTracked > 0 ? `${Math.round((summary.masteredCount / summary.totalTopicsTracked) * 100)}%` : '0%'}
              icon={CheckCircle}
              value={summary.masteredCount}
              subtitle="Mastered by Class"
              scorePercent={summary.totalTopicsTracked > 0 ? Math.round((summary.masteredCount / summary.totalTopicsTracked) * 100) : 0}
              footerLabel="Class Mastery Rate"
              footerBadge={summary.totalTopicsTracked > 0 ? `${Math.round((summary.masteredCount / summary.totalTopicsTracked) * 100)}%` : '0%'}
            />

            <TeacherStatCard
              color="rose"
              title="Needs Work"
              badgeText={summary.needsAttentionCount > 0 ? 'Priority' : 'Clear'}
              icon={AlertTriangle}
              value={summary.needsAttentionCount}
              subtitle="Requires Intervention"
              scorePercent={summary.totalTopicsTracked > 0 ? Math.round((summary.needsAttentionCount / summary.totalTopicsTracked) * 100) : 0}
              footerLabel="At-Risk Rate"
              footerBadge={summary.totalTopicsTracked > 0 ? `${Math.round((summary.needsAttentionCount / summary.totalTopicsTracked) * 100)}%` : '0%'}
            />

            <TeacherStatCard
              color="cyan"
              title="Excluded"
              badgeText="Settings"
              icon={EyeOff}
              value={summary.excludedCount}
              subtitle="Excluded from Quizzes"
              footerLabel="Active Topics"
              footerBadge={`${summary.totalTopicsTracked - summary.excludedCount}`}
            />
          </div>

      {/* Topic Data Container */}
      <div className="bg-white/80 backdrop-blur-[12px] rounded-[16px] sm:rounded-[24px] p-2.5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-white">

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedTopics.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-indigo-50 border border-indigo-200 rounded-[12px] p-3 flex items-center gap-3 flex-wrap overflow-hidden"
            >
              <span className="text-[13px] font-semibold text-indigo-700">{selectedTopics.size} topics selected</span>
              <button
                type="button"
                onClick={handleBulkExclude}
                className="px-4 py-1.5 bg-[#475569] text-white text-[11px] font-bold rounded-full hover:bg-[#334155] transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs"
              >
                Exclude Selected
              </button>
              <button
                type="button"
                onClick={handleBulkInclude}
                className="px-4 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full hover:bg-emerald-700 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs"
              >
                Include Selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedTopics(new Set())}
                className="px-4 py-1.5 bg-white border border-[#e2e8f0] text-[#64748b] text-[11px] font-bold rounded-full hover:bg-[#f8fafc] hover:border-slate-300 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs"
              >
                Clear Selection
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection & Pagination Sub-Header Bar (Card Style) */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 mb-3 text-xs shadow-2xs">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 uppercase tracking-wider text-[11px] select-none">
            <input
              type="checkbox"
              checked={filteredTopics.length > 0 && paginatedTopics.length > 0 && paginatedTopics.every(t => selectedTopics.has(t.topicName))}
              onChange={toggleSelectCurrentPage}
              className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 border-slate-300 cursor-pointer"
            />
            <span>
              SELECT ({visibleRangeStart}–{visibleRangeEnd} OF {filteredTopics.length})
            </span>
          </label>

          {/* Compact Page Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
                aria-label="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-violet-700 px-1 tabular-nums">
                {validCurrentPage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
                aria-label="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile View: Clean Interactive Cards (No Horizontal Scrolling) */}
        <div className="md:hidden space-y-3">
          {paginatedTopics.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <BarChart3 size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No topic data available</p>
              <p className="text-xs text-slate-400 mt-1">Import student quiz data or adjust filters to view topic mastery.</p>
            </div>
          ) : (
            paginatedTopics.map((topic) => {
              const isSelected = selectedTopics.has(topic.topicName);
              const statusInfo = STATUS_BADGES[topic.masteryStatus] || STATUS_BADGES['no_data'];
              const subjectInfo = recordGet(SUBJECT_BADGES, topic.subjectId) ?? { label: topic.subjectId.toUpperCase(), color: 'bg-[#f8fafc] text-[#64748b]' };
              const avgColor = topic.classAverage < 60 ? 'bg-rose-500' : topic.classAverage < 85 ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div
                  key={topic.topicName}
                  className={`relative overflow-hidden rounded-2xl border bg-white p-3.5 sm:p-4 shadow-sm transition-all ${
                    isSelected ? 'ring-2 ring-violet-500/40 bg-violet-50/20 border-violet-300' : 'border-slate-200/90'
                  }`}
                >
                  {/* Left accent color bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      topic.isExcluded
                        ? 'bg-slate-400'
                        : topic.masteryStatus === 'mastered'
                        ? 'bg-emerald-500'
                        : topic.masteryStatus === 'needs_attention'
                        ? 'bg-rose-500'
                        : 'bg-violet-500'
                    }`}
                  />

                  {/* Card Header: Checkbox + Icon + Title */}
                  <div className="flex items-start gap-3 pl-1.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const next = new Set(selectedTopics);
                        if (isSelected) next.delete(topic.topicName);
                        else next.add(topic.topicName);
                        setSelectedTopics(next);
                      }}
                      className="mt-1 rounded text-violet-600 focus:ring-violet-500 w-4 h-4 border-slate-300 cursor-pointer shrink-0"
                    />

                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
                        <BookOpen size={18} />
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          topic.isExcluded ? 'bg-slate-400' : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[14px] font-bold text-slate-800 leading-snug line-clamp-2 ${topic.isExcluded ? 'line-through text-slate-400' : ''}`}>
                        {topic.topicName}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                        {topic.unit || 'Standard Unit'}
                      </p>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pl-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${subjectInfo.color}`}>
                      {subjectInfo.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {topic.isExcluded && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Excluded from AI
                      </span>
                    )}
                  </div>

                  {/* Class Average & Students Row */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 pl-1.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Class Average</span>
                      <span className="font-bold text-slate-800">{topic.classAverage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${avgColor}`} style={{ width: `${topic.classAverage}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Students Attempted</span>
                      <span className="text-slate-600 font-semibold">{topic.studentsAttempted} / {topic.totalStudents}</span>
                    </div>
                  </div>

                  {/* Actions Row at Bottom of Card (Immediately Accessible!) */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 pl-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExclude(topic.topicName)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-colors shadow-2xs active:scale-[0.98] cursor-pointer ${
                        topic.isExcluded
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200'
                      }`}
                    >
                      {topic.isExcluded ? (
                        <>
                          <CheckCircle size={14} />
                          <span>Include in AI</span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} />
                          <span>Exclude from AI</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(selectedTopics);
                        if (isSelected) next.delete(topic.topicName);
                        else next.add(topic.topicName);
                        setSelectedTopics(next);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-colors shadow-2xs active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isSelected ? 'Deselect' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Data Grid with Sticky Action Column */}
        <div className="hidden md:block bg-white rounded-xl sm:rounded-[16px] border border-[#f1f5f9] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto touch-pan-x overscroll-x-contain">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="bg-[#9956DE] grid grid-cols-12 gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[#8b5cf6] items-center text-[10px] sm:text-[11px] font-bold text-white tracking-wider uppercase shadow-xs relative z-10 min-h-[38px] sm:h-11">
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={filteredTopics.length > 0 && paginatedTopics.length > 0 && paginatedTopics.every(t => selectedTopics.has(t.topicName))}
                    onChange={toggleSelectCurrentPage}
                    className="rounded text-[#4f46e5] focus:ring-[#4f46e5] w-3.5 h-3.5 sm:w-4 sm:h-4 border-white/30 bg-white/10 cursor-pointer"
                  />
                </div>
                <div 
                  className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-white/80 select-none"
                  onClick={() => handleSort('topicName')}
                >
                  TOPIC NAME <SortIcon field="topicName" />
                </div>
                <div className="col-span-2">UNIT</div>
                <div 
                  className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-white/80 select-none"
                  onClick={() => handleSort('classAverage')}
                >
                  CLASS AVG % <SortIcon field="classAverage" />
                </div>
                <div 
                  className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-white/80 select-none"
                  onClick={() => handleSort('studentsAttempted')}
                >
                  STUDENTS <SortIcon field="studentsAttempted" />
                </div>
                <div 
                  className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-white/80 select-none"
                  onClick={() => handleSort('masteryStatus')}
                >
                  STATUS <SortIcon field="masteryStatus" />
                </div>
                <div className="col-span-1 text-center sticky right-0 z-20 bg-[#9956DE] border-l border-[#8b5cf6] shadow-[-2px_0_4px_rgba(0,0,0,0.1)] py-2 sm:py-2.5 flex items-center justify-center">
                  EXCLUDE
                </div>
              </div>

              {/* Body Rows */}
              <div className="flex flex-col">
                {paginatedTopics.length === 0 ? (
                  <div className="py-8 sm:py-12 px-4 text-center border-b border-[#f1f5f9]">
                    {topics.length === 0 ? (
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                        <BarChart3 size={24} className="text-[#cbd5e1] sm:w-7 sm:h-7" />
                        <p className="text-xs sm:text-[13px] font-semibold text-[#64748b]">No topic data available yet</p>
                        <p className="text-[10px] sm:text-[11px] text-[#94a3b8]">Import student quiz data to see class topic mastery analytics.</p>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-[13px] text-[#64748b]">No topics match the current filters.</span>
                    )}
                  </div>
                ) : (
                  paginatedTopics.map((topic) => {
                    const isSelected = selectedTopics.has(topic.topicName);
                    const statusInfo = STATUS_BADGES[topic.masteryStatus] || STATUS_BADGES['no_data'];
                    const subjectInfo = recordGet(SUBJECT_BADGES, topic.subjectId) ?? { label: topic.subjectId.toUpperCase(), color: 'bg-[#f8fafc] text-[#64748b]' };
                    const avgColor = topic.classAverage < 60 ? 'bg-rose-500' : topic.classAverage < 85 ? 'bg-amber-500' : 'bg-emerald-500';

                    const rowBg = topic.isExcluded
                      ? 'bg-slate-50/60 opacity-70'
                      : topic.masteryStatus === 'needs_attention'
                      ? 'bg-rose-50/30'
                      : topic.masteryStatus === 'mastered'
                      ? 'bg-emerald-50/20'
                      : '';

                    return (
                      <div
                        key={topic.topicName}
                        className={`grid grid-cols-12 gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 border-b border-[#f1f5f9] items-center hover:bg-slate-50/80 transition-colors group ${rowBg} ${topic.isExcluded ? 'line-through decoration-slate-400' : ''}`}
                      >
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const next = new Set(selectedTopics);
                              if (isSelected) next.delete(topic.topicName);
                              else next.add(topic.topicName);
                              setSelectedTopics(next);
                            }}
                            className="rounded text-[#4f46e5] focus:ring-[#4f46e5] w-3.5 h-3.5 sm:w-4 sm:h-4 border-gray-300 cursor-pointer"
                          />
                        </div>
                        <div className="col-span-3 flex flex-col sm:flex-row sm:items-center gap-1.5 pr-2 min-w-0">
                          <span className="font-semibold text-[#1e293b] text-xs sm:text-[13px] truncate">{topic.topicName}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${subjectInfo.color}`}>
                            {subjectInfo.label}
                          </span>
                        </div>
                        <div className="col-span-2 text-[#475569] text-xs sm:text-[13px] truncate pr-2">{topic.unit}</div>
                        <div className="col-span-2">
                          <span className="font-bold text-[#1e293b] text-xs sm:text-[14px]">{topic.classAverage}%</span>
                        </div>
                        <div className="col-span-2 pr-4">
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="font-semibold text-[#1e293b]">{topic.studentsAttempted} / {topic.totalStudents}</span>
                          </div>
                          <div className="w-full bg-[#f1f5f9] h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${avgColor}`} style={{ width: `${topic.classAverage}%` }} />
                          </div>
                        </div>
                        <div className="col-span-1">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="col-span-1 flex justify-center relative sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-l border-slate-100 shadow-[-2px_0_4px_rgba(0,0,0,0.02)] py-2 sm:py-3 h-full">
                          <label className="relative inline-flex items-center cursor-pointer group/toggle">
                            <input
                              type="checkbox"
                              checked={topic.isExcluded}
                              onChange={() => toggleExclude(topic.topicName)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                          </label>
                          <div className="hidden group-hover/toggle:block absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap shadow-lg">
                            {topic.isExcluded ? 'Include in generation' : 'Exclude from generation'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Pagination Bar */}
        {filteredTopics.length > 0 && (
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-2xs">
            <div className="flex items-center gap-2">
              <span>
                Showing <span className="font-semibold text-slate-800">{visibleRangeStart}</span> to{' '}
                <span className="font-semibold text-slate-800">{visibleRangeEnd}</span> of{' '}
                <span className="font-semibold text-slate-800">{filteredTopics.length}</span> topics
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-400 text-xs">Rows:</span>
                <select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 text-slate-700 font-medium cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={validCurrentPage === 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <div className="flex items-center gap-1 px-1">
                {createPaginationItems(totalPages, validCurrentPage).map((item) =>
                  item.kind === 'ellipsis' ? (
                    <span key={item.id} className="px-1 text-xs text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => setCurrentPage(item.page)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        validCurrentPage === item.page
                          ? 'bg-[#9956DE] text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.page}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={validCurrentPage === totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </motion.div>
  );
};

export default TopicMasteryView;
