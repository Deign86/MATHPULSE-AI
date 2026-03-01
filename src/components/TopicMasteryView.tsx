import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, CheckCircle, AlertTriangle, EyeOff, Search,
  ChevronUp, ChevronDown, Loader2, Info, XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

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

type SortField = 'topicName' | 'classAverage' | 'studentsAttempted' | 'masteryStatus';
type SortDir = 'asc' | 'desc';

const SUBJECT_BADGES: Record<string, { label: string; color: string }> = {
  'gen-math': { label: 'GEN MATH', color: 'bg-sky-100 text-sky-700' },
  'stats-prob': { label: 'STAT&PROB', color: 'bg-sky-100 text-sky-700' },
  'pre-calc': { label: 'PRE-CALC', color: 'bg-orange-100 text-orange-700' },
  'basic-calc': { label: 'BASIC CALC', color: 'bg-red-100 text-red-700' },
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  mastered: { label: 'MASTERED BY CLASS', color: 'bg-green-100 text-green-700 border-green-300' },
  on_track: { label: 'ON TRACK', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  needs_attention: { label: 'NEEDS ATTENTION', color: 'bg-red-100 text-red-700 border-red-300' },
  no_data: { label: 'NO DATA YET', color: 'bg-[#edf1f7] text-[#5a6578] border-[#dde3eb]' },
};

const STATUS_ORDER: Record<string, number> = {
  needs_attention: 0,
  on_track: 1,
  no_data: 2,
  mastered: 3,
};

// ─── Component ──────────────────────────────────────────────

const TopicMasteryView: React.FC = () => {
  const { currentUser } = useAuth();

  // Data state
  const [topics, setTopics] = useState<TopicMasteryData[]>([]);
  const [summary, setSummary] = useState<MasterySummary>({ totalTopicsTracked: 0, masteredCount: 0, needsAttentionCount: 0, excludedCount: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('classAverage');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Selection for bulk actions
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  // Excluded topics from Firestore
  const [excludedTopics, setExcludedTopics] = useState<string[]>([]);

  // ─── Load topic mastery data ──────────────────────────────

  const loadMasteryData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Load excluded topics from Firestore
      const settingsRef = doc(db, 'teachers', currentUser.uid, 'settings', 'quizSettings');
      const settingsSnap = await getDoc(settingsRef);
      const excluded: string[] = settingsSnap.exists() ? settingsSnap.data()?.excludedTopics || [] : [];
      setExcludedTopics(excluded);

      // Fetch topic mastery from backend API
      const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api.hf.space';
      const res = await fetch(`${API_URL}/api/analytics/topic-mastery?teacherId=${currentUser.uid}`);

      if (res.ok) {
        const data = await res.json();
        // Merge excluded status
        const topicsWithExclude = (data.topics || []).map((t: TopicMasteryData) => ({
          ...t,
          isExcluded: excluded.includes(t.topicName),
        }));
        setTopics(topicsWithExclude);
        setSummary(data.summary || { totalTopicsTracked: 0, masteredCount: 0, needsAttentionCount: 0, excludedCount: excluded.length });
      } else {
        // Use fallback mock data if API unavailable
        generateFallbackData(excluded);
      }
    } catch {
      // Use fallback data
      generateFallbackData(excludedTopics);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const generateFallbackData = (excluded: string[]) => {
    // Generate topic mastery data from SHS subjects structure
    const subjects = [
      { id: 'gen-math', topics: ['Functions and Relations', 'Evaluating Functions', 'Operations on Functions', 'Rational Functions', 'Exponential Functions', 'Simple Interest', 'Compound Interest', 'Propositions and Connectives', 'Truth Tables'], units: ['Functions and Their Graphs', 'Functions and Their Graphs', 'Functions and Their Graphs', 'Functions and Their Graphs', 'Functions and Their Graphs', 'Business Mathematics', 'Business Mathematics', 'Logic', 'Logic'] },
      { id: 'stats-prob', topics: ['Random Variables', 'Normal Distribution', 'Z-scores', 'Sampling Distributions', 'Central Limit Theorem', 'Hypothesis Testing Concepts', 'T-test', 'Correlation and Regression'], units: ['Random Variables', 'Normal Distribution', 'Normal Distribution', 'Sampling and Estimation', 'Sampling and Estimation', 'Hypothesis Testing', 'Hypothesis Testing', 'Correlation and Regression'] },
      { id: 'pre-calc', topics: ['Conic Sections - Parabola', 'Conic Sections - Ellipse', 'Sequences and Series', 'Mathematical Induction', 'Trigonometric Functions', 'Trigonometric Identities'], units: ['Analytic Geometry', 'Analytic Geometry', 'Series and Induction', 'Series and Induction', 'Trigonometry', 'Trigonometry'] },
      { id: 'basic-calc', topics: ['Limits of Functions', 'Limit Theorems', 'Continuity of Functions', 'Definition of the Derivative', 'Differentiation Rules', 'Chain Rule', 'Optimization Problems'], units: ['Limits', 'Limits', 'Limits', 'Derivatives', 'Derivatives', 'Derivatives', 'Derivatives'] },
    ];

    const mockTopics: TopicMasteryData[] = [];
    subjects.forEach((subj) => {
      subj.topics.forEach((topic, i) => {
        const classAvg = Math.round(Math.random() * 60 + 30); // 30-90
        const attempted = Math.floor(Math.random() * 25 + 5);
        const total = 30;
        const above85 = Math.floor(attempted * (classAvg >= 85 ? 0.8 : classAvg >= 60 ? 0.3 : 0.1));
        const masteryPct = total > 0 ? (above85 / total) * 100 : 0;

        let status: TopicMasteryData['masteryStatus'] = 'no_data';
        if (attempted >= 3) {
          if (masteryPct >= 75) status = 'mastered';
          else if (classAvg >= 60) status = 'on_track';
          else status = 'needs_attention';
        }

        mockTopics.push({
          topicName: topic,
          subjectId: subj.id,
          unit: subj.units[i],
          classAverage: classAvg,
          studentsAttempted: attempted,
          totalStudents: total,
          studentsAbove85: above85,
          masteryPercentage: Math.round(masteryPct),
          masteryStatus: status,
          isExcluded: excluded.includes(topic),
        });
      });
    });

    setTopics(mockTopics);
    const masteredCount = mockTopics.filter(t => t.masteryStatus === 'mastered').length;
    const needsAttentionCount = mockTopics.filter(t => t.masteryStatus === 'needs_attention').length;
    setSummary({
      totalTopicsTracked: mockTopics.length,
      masteredCount,
      needsAttentionCount,
      excludedCount: excluded.length,
    });
  };

  useEffect(() => {
    loadMasteryData();
  }, [loadMasteryData]);

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

  const SUBJECT_FOR_GRADE: Record<string, string[]> = {
    'Grade 11': ['gen-math', 'stats-prob'],
    'Grade 12': ['pre-calc', 'basic-calc'],
  };

  const filteredTopics = topics
    .filter(t => {
      if (subjectFilter !== 'all' && t.subjectId !== subjectFilter) return false;
      if (gradeFilter !== 'all' && !SUBJECT_FOR_GRADE[gradeFilter]?.includes(t.subjectId)) return false;
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
    if (sortField !== field) return <ChevronDown size={12} className="text-slate-500" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-sky-600" />
      : <ChevronDown size={12} className="text-sky-600" />;
  };

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-sky-500" />
        <span className="ml-2 text-[#5a6578]">Loading topic mastery data...</span>
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
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0a1628]">Class Topic Mastery</h2>
        <p className="text-sm text-[#5a6578] mt-1">
          Topics where 75% or more of the class scored 85%+ are marked as mastered and can be excluded from future quiz generation.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} className="text-sky-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0a1628]">{summary.totalTopicsTracked}</p>
          <p className="text-xs text-[#5a6578]">Total Topics Tracked</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{summary.masteredCount}</p>
          <p className="text-xs text-[#5a6578]">Mastered by Class</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{summary.needsAttentionCount}</p>
          <p className="text-xs text-[#5a6578]">Needs Work</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#edf1f7] rounded-xl flex items-center justify-center">
              <EyeOff size={20} className="text-[#5a6578]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#5a6578]">{summary.excludedCount}</p>
          <p className="text-xs text-[#5a6578]">Excluded Topics</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-[#dde3eb]">
          <Search size={14} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm outline-none w-40 placeholder:text-slate-500"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="bg-white border border-[#dde3eb] rounded-xl px-3 py-2 text-sm outline-none"
        >
          <option value="all">All Subjects</option>
          <option value="gen-math">General Mathematics</option>
          <option value="stats-prob">Statistics and Probability</option>
          <option value="pre-calc">Pre-Calculus</option>
          <option value="basic-calc">Basic Calculus</option>
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="bg-white border border-[#dde3eb] rounded-xl px-3 py-2 text-sm outline-none"
        >
          <option value="all">All Grades</option>
          <option value="Grade 11">Grade 11</option>
          <option value="Grade 12">Grade 12</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedTopics.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3 flex-wrap overflow-hidden"
          >
            <span className="text-sm font-semibold text-sky-700">{selectedTopics.size} topics selected</span>
            <button
              onClick={handleBulkExclude}
              className="px-3 py-1.5 bg-[#5a6578] text-white text-xs font-bold rounded-lg hover:bg-sky-600 transition-colors"
            >
              Exclude Selected Topics
            </button>
            <button
              onClick={handleBulkInclude}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
            >
              Include Selected Topics
            </button>
            <button
              onClick={() => setSelectedTopics(new Set())}
              className="px-3 py-1.5 bg-white border border-[#dde3eb] text-[#5a6578] text-xs font-bold rounded-lg hover:bg-[#edf1f7] transition-colors"
            >
              Clear Selection
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topic Mastery Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#dde3eb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#edf1f7] border-b border-[#dde3eb]">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedTopics.size === filteredTopics.length && filteredTopics.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[#dde3eb] text-sky-600 focus:ring-sky-500"
                  />
                </th>
                <th
                  className="px-4 py-3 text-xs font-bold text-[#5a6578] uppercase tracking-wide cursor-pointer hover:text-sky-600"
                  onClick={() => handleSort('topicName')}
                >
                  <span className="flex items-center gap-1">Topic Name <SortIcon field="topicName" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-bold text-[#5a6578] uppercase tracking-wide">Unit</th>
                <th
                  className="px-4 py-3 text-xs font-bold text-[#5a6578] uppercase tracking-wide cursor-pointer hover:text-sky-600"
                  onClick={() => handleSort('classAverage')}
                >
                  <span className="flex items-center gap-1">Class Avg % <SortIcon field="classAverage" /></span>
                </th>
                <th
                  className="px-4 py-3 text-xs font-bold text-[#5a6578] uppercase tracking-wide cursor-pointer hover:text-sky-600"
                  onClick={() => handleSort('studentsAttempted')}
                >
                  <span className="flex items-center gap-1">Students <SortIcon field="studentsAttempted" /></span>
                </th>
                <th
                  className="px-4 py-3 text-xs font-bold text-[#5a6578] uppercase tracking-wide cursor-pointer hover:text-sky-600"
                  onClick={() => handleSort('masteryStatus')}
                >
                  <span className="flex items-center gap-1">Status <SortIcon field="masteryStatus" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-bold text-[#5a6578] uppercase tracking-wide">Exclude</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No topics match the current filters.
                  </td>
                </tr>
              ) : (
                filteredTopics.map((topic) => {
                  const isSelected = selectedTopics.has(topic.topicName);
                  const statusInfo = STATUS_BADGES[topic.masteryStatus];
                  const subjectInfo = SUBJECT_BADGES[topic.subjectId] || { label: topic.subjectId.toUpperCase(), color: 'bg-[#edf1f7] text-[#5a6578]' };
                  const avgColor = topic.classAverage < 60 ? 'bg-red-500' : topic.classAverage < 85 ? 'bg-amber-500' : 'bg-green-500';

                  const rowBg = topic.isExcluded
                    ? 'bg-[#edf1f7] opacity-60'
                    : topic.masteryStatus === 'needs_attention'
                    ? 'bg-red-50/30'
                    : topic.masteryStatus === 'mastered'
                    ? 'bg-green-50/30'
                    : '';

                  return (
                    <tr
                      key={topic.topicName}
                      className={`border-b border-[#dde3eb] hover:bg-[#edf1f7] transition-colors ${rowBg} ${topic.isExcluded ? 'line-through decoration-slate-400' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const next = new Set(selectedTopics);
                            if (isSelected) next.delete(topic.topicName);
                            else next.add(topic.topicName);
                            setSelectedTopics(next);
                          }}
                          className="w-4 h-4 rounded border-[#dde3eb] text-sky-600 focus:ring-sky-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#0a1628]">{topic.topicName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${subjectInfo.color}`}>
                            {subjectInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5a6578]">{topic.unit}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#edf1f7] rounded-full overflow-hidden max-w-20">
                            <div className={`h-full rounded-full ${avgColor}`} style={{ width: `${topic.classAverage}%` }} />
                          </div>
                          <span className="text-xs font-bold text-[#0a1628] w-8 text-right">{topic.classAverage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5a6578]">{topic.studentsAttempted}/{topic.totalStudents}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="group relative">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={topic.isExcluded}
                              onChange={() => toggleExclude(topic.topicName)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[#dde3eb] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-[#dde3eb] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5a6578]" />
                          </label>
                          <div className="hidden group-hover:block absolute z-20 bottom-full left-0 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap">
                            Excluded topics will not appear in AI-generated quizzes for your class
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default TopicMasteryView;
