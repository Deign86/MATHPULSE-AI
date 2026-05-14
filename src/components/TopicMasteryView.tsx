import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Loader2, BarChart3, CheckCircle, AlertTriangle, EyeOff, Search, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { GRADE_LEVELS, SHS_MATH_SUBJECTS, getActiveSubjectIdsForGrade, type SubjectId } from '../data/subjects';
import { cacheKeys } from '../utils/cacheKeys';
import { useCurriculum } from '../hooks/useCurriculum';

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

type SortField = 'topicName' | 'classAverage' | 'studentsAttempted' | 'masteryStatus';
type SortDir = 'asc' | 'desc';

const SUBJECT_BADGES: Record<string, { label: string; color: string }> = {
  'gen-math': { label: 'GEN MATH', color: 'bg-sky-100 text-sky-700' },
  'stats-prob': { label: 'STAT&PROB', color: 'bg-sky-100 text-sky-700' },
  'pre-calc': { label: 'PRE-CALC', color: 'bg-orange-100 text-orange-700' },
  'basic-calc': { label: 'BASIC CALC', color: 'bg-red-100 text-red-700' },
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  mastered: { label: 'Mastered', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  on_track: { label: 'On Track', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  needs_attention: { label: 'Needs Work', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  no_data: { label: 'No Data', color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

const STATUS_ORDER: Record<string, number> = {
  needs_attention: 0,
  on_track: 1,
  no_data: 2,
  mastered: 3,
};

// ─── Component ──────────────────────────────────────────────

const TopicMasteryView: React.FC<{ 
  classSectionId?: string;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
}> = ({ classSectionId, onOpenNotifications, onOpenProfile }) => {
  const { currentUser, userProfile } = useAuth();

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
            excluded: [] as string[],
            topics: [] as TopicMasteryData[],
            summary: { totalTopicsTracked: 0, masteredCount: 0, needsAttentionCount: 0, excludedCount: 0 },
          };
        }

        const settingsRef = doc(db, 'teachers', currentUser.uid, 'settings', 'quizSettings');
        const settingsSnap = await getDoc(settingsRef);
        const excluded: string[] = settingsSnap.exists() ? settingsSnap.data()?.excludedTopics || [] : [];

        const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';
        const params = new URLSearchParams({ teacherId: currentUser.uid });
        if (classSectionId) {
          params.set('classSectionId', classSectionId);
        }

        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/analytics/topic-mastery?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          return {
            excluded,
            topics: [] as TopicMasteryData[],
            summary: { totalTopicsTracked: 0, masteredCount: 0, needsAttentionCount: 0, excludedCount: excluded.length },
          };
        }

        const data = await res.json();
        const topicsWithExclude = (data.topics || []).map((topic: TopicMasteryData) => ({
          ...topic,
          isExcluded: excluded.includes(topic.topicName),
        }));

        return {
          excluded,
          topics: topicsWithExclude,
          summary: data.summary || { totalTopicsTracked: 0, masteredCount: 0, needsAttentionCount: 0, excludedCount: excluded.length },
        };
      } catch {
        return {
          excluded: [] as string[],
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
    if (!gradeScopedSubjectIds.includes(subjectFilter as SubjectId)) {
      setSubjectFilter('all');
    }
  }, [gradeScopedSubjectIds, subjectFilter]);

  const filteredTopics = topics
    .filter(t => {
      if (subjectFilter !== 'all' && t.subjectId !== subjectFilter) return false;
      if (!gradeScopedSubjectIds.includes(t.subjectId as SubjectId)) return false;
      if (searchQuery && !t.topicName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
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

  const toggleSelectAll = () => {
    if (selectedTopics.size === filteredTopics.length) {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(new Set(filteredTopics.map(t => t.topicName)));
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-[#94a3b8]" />;
    return sortDir === 'asc'
      ? <ChevronUp size={14} className="text-[#4f46e5]" />
      : <ChevronDown size={14} className="text-[#4f46e5]" />;
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
      className="w-full p-[24px] xl:p-[32px] space-y-[24px]"
    >


      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight mb-1">Class Topic Mastery</h1>
          <p className="text-[13px] text-[#64748b] max-w-2xl">Topics where 75% or more of the class scored 85%+ are marked as mastered and can be safely excluded from future quiz generation.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenNotifications && (
            <button onClick={onOpenNotifications} className="relative w-9 h-9 flex items-center justify-center bg-white/60 hover:bg-white/80 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 text-[#64748b] hover:text-[#1e293b] transition-colors cursor-pointer hover:scale-[1.02]">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
          )}

          {onOpenProfile && (
            <div onClick={onOpenProfile} className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 cursor-pointer hover:bg-white/80 transition-colors hover:scale-[1.02]">
              <div className="w-6 h-6 rounded-full bg-indigo-100 overflow-hidden shrink-0">
                <img src={userProfile?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || currentUser?.displayName || 'Teacher')}&background=random`} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] font-semibold text-[#1e293b]">{userProfile?.name || currentUser?.displayName || 'Teacher'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {/* Total Topics */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#a855f7] to-[#9333ea] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(168,85,247,0.2)] flex flex-col justify-between h-full group text-white">
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full"></div>
          <div className="flex items-start justify-between relative z-10 mb-4">
            <span className="text-[13px] font-medium text-white/90">Total Topics Tracked</span>
            <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
              <BarChart3 size={16} className="text-white" />
            </div>
          </div>
          <div className="text-[32px] font-bold relative z-10 leading-none">{summary.totalTopicsTracked}</div>
        </div>

        {/* Mastered */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(16,185,129,0.2)] flex flex-col justify-between h-full group text-white">
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full"></div>
          <div className="flex items-start justify-between relative z-10 mb-4">
            <span className="text-[13px] font-medium text-white/90">Mastered by Class</span>
            <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
              <CheckCircle size={16} className="text-white" />
            </div>
          </div>
          <div className="text-[32px] font-bold relative z-10 leading-none">{summary.masteredCount}</div>
        </div>

        {/* Needs Work */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f43f5e] to-[#e11d48] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(244,63,94,0.2)] flex flex-col justify-between h-full group text-white">
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full"></div>
          <div className="flex items-start justify-between relative z-10 mb-4">
            <span className="text-[13px] font-medium text-white/90">Needs Work</span>
            <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
              <AlertTriangle size={16} className="text-white" />
            </div>
          </div>
          <div className="text-[32px] font-bold relative z-10 leading-none">{summary.needsAttentionCount}</div>
        </div>

        {/* Excluded */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#64748b] to-[#475569] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(100,116,139,0.2)] flex flex-col justify-between h-full group text-white">
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full"></div>
          <div className="flex items-start justify-between relative z-10 mb-4">
            <span className="text-[13px] font-medium text-white/90">Excluded Topics</span>
            <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
              <EyeOff size={16} className="text-white" />
            </div>
          </div>
          <div className="text-[32px] font-bold relative z-10 leading-none">{summary.excludedCount}</div>
        </div>
      </div>

      {/* Topic Data Container */}
      <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] p-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-white">

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex items-center bg-white px-4 py-2.5 rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-[#e2e8f0] group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full md:w-64">
            <Search size={16} className="text-[#64748b] shrink-0 group-focus-within:text-[#4f46e5] transition-colors" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none ml-2 text-[13px] w-full text-[#475569] placeholder:text-[#94a3b8]"
            />
          </div>
          <div className="relative w-full md:w-48">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="appearance-none w-full bg-white border border-[#e2e8f0] text-[#475569] text-[13px] font-medium rounded-[12px] pl-4 pr-10 py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {gradeScopedSubjectIds.map((subjectId) => (
                <option key={subjectId} value={subjectId}>{subjectNameById[subjectId] || subjectId}</option>
              ))}
            </select>
            <ChevronDown size={16} className="text-[#64748b] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative w-full md:w-48">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="appearance-none w-full bg-white border border-[#e2e8f0] text-[#475569] text-[13px] font-medium rounded-[12px] pl-4 pr-10 py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer"
            >
              <option value="all">All Grades</option>
              {GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
            <ChevronDown size={16} className="text-[#64748b] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

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
                onClick={handleBulkExclude}
                className="px-4 py-1.5 bg-[#475569] text-white text-[11px] font-bold rounded-full hover:bg-[#334155] transition-colors shadow-sm"
              >
                Exclude Selected
              </button>
              <button
                onClick={handleBulkInclude}
                className="px-4 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Include Selected
              </button>
              <button
                onClick={() => setSelectedTopics(new Set())}
                className="px-4 py-1.5 bg-white border border-[#e2e8f0] text-[#64748b] text-[11px] font-bold rounded-full hover:bg-[#f8fafc] transition-colors shadow-sm"
              >
                Clear Selection
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Grid */}
        <div className="bg-white rounded-[16px] border border-[#f1f5f9] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="bg-[#f8fafc] grid grid-cols-12 gap-4 p-4 border-b border-[#f1f5f9] items-center text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={selectedTopics.size === filteredTopics.length && filteredTopics.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-[#4f46e5] focus:ring-[#4f46e5] w-4 h-4 border-gray-300 cursor-pointer"
                  />
                </div>
                <div 
                  className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-[#1e293b] select-none"
                  onClick={() => handleSort('topicName')}
                >
                  TOPIC NAME <SortIcon field="topicName" />
                </div>
                <div className="col-span-2">UNIT</div>
                <div 
                  className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-[#1e293b] select-none"
                  onClick={() => handleSort('classAverage')}
                >
                  CLASS AVG % <SortIcon field="classAverage" />
                </div>
                <div 
                  className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-[#1e293b] select-none"
                  onClick={() => handleSort('studentsAttempted')}
                >
                  STUDENTS <SortIcon field="studentsAttempted" />
                </div>
                <div 
                  className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-[#1e293b] select-none"
                  onClick={() => handleSort('masteryStatus')}
                >
                  STATUS <SortIcon field="masteryStatus" />
                </div>
                <div className="col-span-1 text-center">EXCLUDE</div>
              </div>

              {/* Body Rows */}
              <div className="flex flex-col">
                {filteredTopics.length === 0 ? (
                  <div className="p-16 text-center border-b border-[#f1f5f9]">
                    {topics.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <BarChart3 size={32} className="text-[#cbd5e1]" />
                        <p className="text-[13px] font-semibold text-[#64748b]">No topic data available yet</p>
                        <p className="text-[11px] text-[#94a3b8]">Import student quiz data to see class topic mastery analytics.</p>
                      </div>
                    ) : (
                      <span className="text-[13px] text-[#64748b]">No topics match the current filters.</span>
                    )}
                  </div>
                ) : (
                  filteredTopics.map((topic) => {
                    const isSelected = selectedTopics.has(topic.topicName);
                    const statusInfo = STATUS_BADGES[topic.masteryStatus] || STATUS_BADGES['no_data'];
                    const subjectInfo = SUBJECT_BADGES[topic.subjectId] || { label: topic.subjectId.toUpperCase(), color: 'bg-[#f8fafc] text-[#64748b]' };
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
                        className={`grid grid-cols-12 gap-4 p-4 border-b border-[#f1f5f9] items-center hover:bg-slate-50/80 transition-colors group ${rowBg} ${topic.isExcluded ? 'line-through decoration-slate-400' : ''}`}
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
                            className="rounded text-[#4f46e5] focus:ring-[#4f46e5] w-4 h-4 border-gray-300 cursor-pointer"
                          />
                        </div>
                        <div className="col-span-3 flex flex-col sm:flex-row sm:items-center gap-1.5 pr-2 min-w-0">
                          <span className="font-semibold text-[#1e293b] text-[13px] truncate">{topic.topicName}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${subjectInfo.color}`}>
                            {subjectInfo.label}
                          </span>
                        </div>
                        <div className="col-span-2 text-[#475569] text-[13px] truncate pr-2">{topic.unit}</div>
                        <div className="col-span-2">
                          <span className="font-bold text-[#1e293b] text-[14px]">{topic.classAverage}%</span>
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
                        <div className="col-span-1 flex justify-center relative">
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
      </div>
    </motion.div>
  );
};

export default TopicMasteryView;
