import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  TrendingUp, 
  Award, 
  Target, 
  Calendar, 
  Download, 
  Filter, 
  Brain, 
  AlertCircle, 
  CheckCircle2, 
  BarChart3, 
  Sparkles, 
  ArrowUpRight, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Zap,
  BookOpen,
  GraduationCap,
  Flame,
  Check
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToGradeSummary, subscribeToAssessments, type GradeSummary, type AssessmentRecord } from '../services/gradesService';
import { type StudentProfile, type UserProgress } from '../types/models';
import { subscribeToUserProgress } from '../services/progressService';
import { SHS_MATH_SUBJECTS, getActiveSubjectIdsForGrade, subjects } from '../data/subjects';
import { useCurriculum } from '../hooks/useCurriculum';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { recordGet } from '../utils/memberOf';

const DiagnosticBreakdown = lazy(() => import('./assessment/DiagnosticBreakdown'));

interface DiagnosticSummary {
  score: number;
  riskLevel: string;
  weaknesses: string[];
  recommendation: string;
}

// Creative Radial Score Ring with smooth SVG gradient
const RadialScoreRing: React.FC<{ 
  value: number; 
  size?: number; 
  strokeWidth?: number; 
  colorClass?: string;
  trackClass?: string;
  textColorClass?: string;
}> = ({
  value,
  size = 64,
  strokeWidth = 6,
  colorClass = 'text-[#7C3AED]',
  trackClass = 'text-slate-100 dark:text-slate-800',
  textColorClass = 'text-slate-900 dark:text-white'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`text-[13px] font-black tabular-nums leading-none ${textColorClass}`}>
          {clamped}%
        </span>
      </div>
    </div>
  );
};

const GradesPage = () => {
  const { currentUser, userProfile } = useAuth();
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterQuarter, setFilterQuarter] = useState('all');
  const [activeSubjectTab, setActiveSubjectTab] = useState<string | null>(null);
  const [assessmentPage, setAssessmentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;
  const [loading, setLoading] = useState(true);
  const [gradeSummary, setGradeSummary] = useState<GradeSummary | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [diagnosticSummary, setDiagnosticSummary] = useState<DiagnosticSummary | null>(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  // Safely cast userProfile to StudentProfile to access grade
  // SAFETY: trusted internal value already conforms to the asserted type.
  const studentGrade = (userProfile as StudentProfile | null)?.grade;

  // Get active subjects for the user's grade
  const allowedSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const allowedSubjectSet: Set<string> = new Set(allowedSubjectIds);

  const { isLoading: curriculumLoading } = useCurriculum(studentGrade);

  useEffect(() => {
    if (!curriculumLoading) {
      // Curriculum ready
    }
  }, [curriculumLoading]);

  const formatDateOnly = (value: Date | string | number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';

    return parsed.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const unsubSummary = subscribeToGradeSummary(currentUser.uid, (summary) => {
      setGradeSummary(summary);
      setLoading(false);
    });

    const unsubAssessments = subscribeToAssessments(currentUser.uid, (records) => {
      setAssessments(records);
      setLoading(false);
    });

    const unsubProgress = subscribeToUserProgress(currentUser.uid, (progress) => {
      setUserProgress(progress);
    });

    return () => {
      unsubSummary();
      unsubAssessments();
      unsubProgress();
    };
  }, [currentUser]);

  // Fetch diagnostic assessment results
  useEffect(() => {
    if (!currentUser?.uid) return;
    (async () => {
      try {
        let score = 0;
        let riskLevel = 'Unknown';
        let weaknesses: string[] = [];
        let recommendation = '';

        const summarySnap = await getDoc(doc(db, 'users', currentUser.uid, 'dashboardSummary', 'heroBannerModal'));
        if (summarySnap.exists()) {
          const bannerData = summarySnap.data();
          if (bannerData.status === 'ready') {
            score = bannerData.latestScorePercent || 0;
            riskLevel = bannerData.latestRiskLevel || 'Unknown';
            weaknesses = bannerData.weaknesses || [];
            recommendation = bannerData.recommendation || '';
          }
        } else {
          const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.initialAssessmentCompleted || userData.hasCompletedInitialAssessment) {
              riskLevel = (userData.atRiskSubjects?.length > 0) ? 'Moderate' : 'Low';
              weaknesses = userData.atRiskSubjects || [];
            }
          }
        }

        const cacheSnap = await getDoc(doc(db, 'diagnosticResults', currentUser.uid, 'cache', 'analysis'));
        if (cacheSnap.exists()) {
          const analysis = cacheSnap.data();
          const recs = analysis.recommendations || [];
          if (recs.length > 0) {
            recommendation = recs.map((r: { action?: string }) => r.action).filter(Boolean).join('. ') + '.';
          }
          const weakAreas = analysis.weakness_areas || [];
          if (weakAreas.length > 0) {
            weaknesses = weakAreas.map((w: { domain?: string }) => w.domain).filter(Boolean);
          }
        }

        if (score > 0 || riskLevel !== 'Unknown' || weaknesses.length > 0) {
          setDiagnosticSummary({ 
            score, 
            riskLevel, 
            weaknesses, 
            recommendation: recommendation || 'Continue with your personalized learning path.' 
          });
        }
      } catch {
        // Non-fatal fallback
      }
    })();
  }, [currentUser?.uid]);

  // Compute stats safely
  const averageScore = gradeSummary?.averageScore 
    ? Math.round(gradeSummary.averageScore)
    : userProgress?.averageScore 
      ? Math.round(userProgress.averageScore) 
      : 0;

  const totalQuizzes = Math.max(gradeSummary?.quizzesCompleted ?? 0, userProgress?.quizAttempts?.length ?? 0);
  const generalAverage = averageScore > 0 ? averageScore.toString() : '—';

  const colorBySubjectId = {
    'gen-math': 'indigo',
    'stats-prob': 'violet',
  };
  const colorClassBySubject = {
    indigo: { dot: 'bg-indigo-500', bar: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: '📐' },
    violet: { dot: 'bg-violet-500', bar: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-50 text-violet-700 border-violet-100', icon: '🎲' },
    fuchsia: { dot: 'bg-fuchsia-500', bar: 'bg-fuchsia-500', text: 'text-fuchsia-600', light: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100', icon: '📊' },
    purple: { dot: 'bg-purple-500', bar: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50 text-purple-700 border-purple-100', icon: '🧮' },
    slate: { dot: 'bg-slate-500', bar: 'bg-slate-500', text: 'text-slate-600', light: 'bg-slate-50 text-slate-700 border-slate-100', icon: '📝' },
  };

  const subjectMap = SHS_MATH_SUBJECTS.reduce<Record<string, { label: string; color: string }>>((acc, subject) => {
    acc[subject.id] = {
      label: subject.name,
      color: recordGet(colorBySubjectId, subject.id) || 'slate'
    };
    return acc;
  }, {});

  const allowedSubjectLabels: string[] = SHS_MATH_SUBJECTS
    .filter((subject) => allowedSubjectSet.has(subject.id))
    .map((subject) => subject.name);

  // Compute subject metrics
  const subjectPerformance = Object.entries(userProgress?.subjects ?? {})
    .filter(([subjectId]) => allowedSubjectSet.has(subjectId))
    .map(([subjectId, subjectData]: [string, { modulesProgress?: Record<string, { quizzesCompleted?: string[] }>; progress?: number; completedModules?: number }]) => {
      const info = subjectMap[subjectId] || { label: subjectId, color: 'slate' };
      
      const subjectQuizAttempts = (userProgress?.quizAttempts || []).filter(quizAttempt => {
        const modules = subjectData?.modulesProgress || {};
        return Object.values(modules).some((moduleRecord) => moduleRecord.quizzesCompleted?.includes(quizAttempt.quizId));
      });
      const avg = subjectQuizAttempts.length > 0
        ? Math.round(subjectQuizAttempts.reduce((sum: number, attempt) => sum + attempt.score, 0) / subjectQuizAttempts.length)
        : Math.round(subjectData?.progress ?? 0);
      
      return {
        subject: info.label,
        average: avg,
        quizzes: subjectQuizAttempts.length || subjectData?.completedModules || 0,
        color: info.color
      };
    });

  const defaultSubjectPerformance = allowedSubjectIds.map((subjectId) => {
    const info = subjectMap[subjectId] || { label: subjectId, color: 'slate' };
    const gradeSummarySubject = gradeSummary?.subjectPerformance?.[info.label];
    const avg = gradeSummarySubject?.avgScore ? Math.round(gradeSummarySubject.avgScore) : 0;
    return {
      subject: info.label,
      average: avg,
      quizzes: gradeSummarySubject?.count || 0,
      color: info.color
    };
  });

  const displaySubjectPerformance = subjectPerformance.length > 0 ? subjectPerformance : defaultSubjectPerformance;

  // Ranked subjects for the Leaderboard / Competency Pods
  const rankedSubjects = useMemo(() => {
    return [...displaySubjectPerformance].sort((a, b) => b.average - a.average);
  }, [displaySubjectPerformance]);

  // Recent Quizzes mapping — merge assessments subcollection + progress.quizAttempts
  const progressQuizEntries = useMemo(() => {
    if (!userProgress?.quizAttempts?.length) return [];
    const quizLookup = new Map<string, { title: string; subject: string }>();
    subjects.forEach((subj) => {
      const shsMatch = SHS_MATH_SUBJECTS.find((s) => s.id === subj.id);
      const subjectName = shsMatch?.name || subj.title;
      subj.modules.forEach((mod) => {
        mod.quizzes.forEach((quiz) => {
          quizLookup.set(quiz.id, { title: quiz.title, subject: subjectName });
        });
      });
    });
    return userProgress.quizAttempts.map((attempt, index) => {
      const lookup = quizLookup.get(attempt.quizId);
      const completedDate = new Date(attempt.completedAt);
      return {
        id: 10000 + index,
        title: lookup?.title || attempt.quizId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        subject: lookup?.subject || 'General Mathematics',
        score: Math.round(attempt.score),
        date: formatDateOnly(completedDate),
        type: 'quiz' as const,
        status: attempt.score >= 80 ? 'Excellent' : attempt.score >= 60 ? 'Passing' : 'Needs Review',
        _timestamp: completedDate.getTime(),
      };
    });
  }, [userProgress?.quizAttempts]);

  const recentQuizzes = useMemo(() => {
    const fromAssessments = assessments
      .slice()
      .map((record, index) => ({
        id: index + 1,
        title: record.title || `Assessment ${index + 1}`,
        subject: record.subject || 'General',
        score: record.score,
        date: record.completedAt ? formatDateOnly(record.completedAt.toDate()) : 'N/A',
        // SAFETY: trusted internal value already conforms to the asserted type.
        type: (record.type === 'practice' ? 'practice' : record.type === 'diagnostic' ? 'quiz' : 'quiz') as 'quiz' | 'practice',
        status: record.score >= 80 ? 'Excellent' : record.score >= 60 ? 'Passing' : 'Needs Review',
        _timestamp: record.completedAt?.toDate?.()?.getTime() ?? 0,
      }));

    const assessmentTitles = new Set(fromAssessments.map(a => a.title.toLowerCase()));
    const uniqueProgress = progressQuizEntries.filter(p => !assessmentTitles.has(p.title.toLowerCase()));

    return [...fromAssessments, ...uniqueProgress]
      .sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0))
      .slice(0, 30)
      .filter((quiz) => allowedSubjectLabels.includes(quiz.subject));
  }, [assessments, progressQuizEntries, allowedSubjectLabels]);

  // Compute proficiency rate: percentage of quizzes >= 75
  const proficiencyRate = useMemo(() => {
    if (recentQuizzes.length === 0) return averageScore >= 75 ? averageScore : 0;
    const passedCount = recentQuizzes.filter(q => q.score >= 75).length;
    return Math.round((passedCount / recentQuizzes.length) * 100);
  }, [recentQuizzes, averageScore]);

  // Filter quizzes based on active selections + interactive subject chart tab
  const filteredQuizzes = useMemo(() => {
    return recentQuizzes.filter(quiz => {
      if (!allowedSubjectLabels.includes(quiz.subject)) return false;
      
      const activeChartSubjectMatch = !activeSubjectTab || quiz.subject === activeSubjectTab;
      const subjectMatch = filterSubject === 'all' || quiz.subject === filterSubject;
      const typeMatch = filterType === 'all' || quiz.type === filterType;
      const quarterMatch = filterQuarter === 'all' || 
        quiz.title.toLowerCase().includes(filterQuarter.toLowerCase()) || 
        quiz.subject.toLowerCase().includes(filterQuarter.toLowerCase());

      return activeChartSubjectMatch && subjectMatch && typeMatch && quarterMatch;
    });
  }, [recentQuizzes, allowedSubjectLabels, activeSubjectTab, filterSubject, filterType, filterQuarter]);

  // Reset pagination when filters change
  useEffect(() => {
    setAssessmentPage(1);
  }, [filterSubject, filterType, filterQuarter, activeSubjectTab]);

  const totalAssessmentPages = Math.max(1, Math.ceil(filteredQuizzes.length / ITEMS_PER_PAGE));
  const paginatedQuizzes = useMemo(() => {
    const startIndex = (assessmentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuizzes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredQuizzes, assessmentPage, ITEMS_PER_PAGE]);

  useEffect(() => {
    if (filterSubject === 'all') return;
    if (!allowedSubjectLabels.includes(filterSubject)) {
      setFilterSubject('all');
    }
  }, [allowedSubjectLabels, filterSubject]);

  const handleExportReport = () => {
    const escapeCsvValue = (value: string | number) => {
      const stringValue = String(value ?? '');
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const reportRows: string[] = [];
    // SAFETY: trusted internal value already conforms to the asserted type.
    const studentName = (userProfile as StudentProfile | null)?.name || currentUser?.displayName || currentUser?.email || 'Student';
    const exportDate = new Date().toISOString().split('T')[0];

    reportRows.push('Grade Report');
    reportRows.push(`Student,${escapeCsvValue(studentName)}`);
    reportRows.push(`Export Date,${escapeCsvValue(exportDate)}`);
    reportRows.push(`Subject Filter,${escapeCsvValue(filterSubject)}`);
    reportRows.push(`Type Filter,${escapeCsvValue(filterType)}`);
    reportRows.push('');

    reportRows.push('Subject Performance');
    reportRows.push('Subject,Average Score');
    displaySubjectPerformance.forEach((subject) => {
      reportRows.push([
        escapeCsvValue(subject.subject),
        escapeCsvValue(subject.average)
      ].join(','));
    });

    reportRows.push('');
    reportRows.push('Recent Quizzes');
    reportRows.push('Title,Subject,Score,Date,Type,Status');

    if (filteredQuizzes.length === 0) {
      reportRows.push('No quiz data available for the selected filters');
    } else {
      filteredQuizzes.forEach((quiz) => {
        reportRows.push([
          escapeCsvValue(quiz.title),
          escapeCsvValue(quiz.subject),
          escapeCsvValue(quiz.score),
          escapeCsvValue(quiz.date),
          escapeCsvValue(quiz.type),
          escapeCsvValue(quiz.status)
        ].join(','));
      });
    }

    const csvContent = reportRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeStudentName = studentName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'student';

    link.href = url;
    link.setAttribute('download', `grade-report-${safeStudentName}-${exportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleStartPractice = (preferredSubject?: string) => {
    if (preferredSubject) {
      sessionStorage.setItem('mathpulse_practice_subject', preferredSubject);
    }
    sessionStorage.setItem('mathpulse_modules_tab', 'practice');
    window.dispatchEvent(new CustomEvent('mathpulse:navigate', { detail: { tab: 'Modules' } }));
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col justify-center items-center h-full min-h-[400px]">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Analytics...</p>
      </div>
    );
  }

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 pt-0 sm:pt-0.5 pb-8 space-y-4 sm:space-y-5 max-w-[1540px] mx-auto">
      
      {/* 1. Header Bar with Compact Spacing & Clear Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-[1.75rem] border border-purple-100/80 dark:border-purple-900/40 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.06)]">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#8B5CF6] to-[#6366F1] flex items-center justify-center text-white shadow-md shadow-purple-500/25 shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">Assessment</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/50 shadow-xs">
                Grade 11 STEM
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs mt-0.5">
              Review your performance across subjects & competency analytics
            </p>
          </div>
        </div>

        {/* Controls: Quarter Filter & Export CSV */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <select
              value={filterQuarter}
              onChange={(e) => setFilterQuarter(e.target.value)}
              className="appearance-none w-full md:w-auto pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer shadow-xs"
            >
              <option value="all">This Quarter</option>
              <option value="Q1">Quarter 1</option>
              <option value="Q2">Quarter 2</option>
              <option value="Q3">Quarter 3</option>
              <option value="Q4">Quarter 4</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <Button 
            className="flex-1 md:flex-none bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-black rounded-xl h-9.5 px-4 shadow-[0_6px_16px_-4px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 transition-all text-xs flex items-center gap-1.5" 
            onClick={handleExportReport}
          >
            <Download className="w-3.5 h-3.5" />
            Report
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. SOLID COLOR TACTILE FOLDER TEMPLATES (Equal Uniform Size & Breathable Tabs) */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch pt-2">
        
        {/* FOLDER 1: General Average (Solid Royal Indigo/Violet #5856D6) */}
        <div className="group text-left select-none transition-all duration-300 flex flex-col h-full">
          <div className="relative pt-10 sm:pt-11 flex-1 flex flex-col h-full">
            {/* Seamless Solid Folder Tab — Spacious & Breathable */}
            <div className="absolute top-0 left-0 h-10 sm:h-11 w-52 sm:w-56 rounded-t-2xl bg-[#5856D6] flex items-center px-5 sm:px-6 gap-2.5 border-t border-x border-white/25 shadow-xs">
              <Award className="w-4 h-4 text-white shrink-0" />
              <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-white leading-none">
                BENCHMARK
              </span>
            </div>

            {/* Solid Folder Card Body — Equal Stretch Height */}
            <div className="bg-[#5856D6] text-white rounded-[2rem] rounded-tl-none p-5 sm:p-6 shadow-[0_10px_25px_-5px_rgba(88,86,214,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(88,86,214,0.45)] transition-all duration-300 flex-1 flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-3 h-7">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white border border-white/25 shadow-xs">
                    General Average
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/25 backdrop-blur-sm text-white border border-white/30">
                    {averageScore >= 75 ? 'Passing' : averageScore > 0 ? 'Needs Boost' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 min-h-[72px]">
                  <div>
                    <h3 className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight leading-none">
                      {generalAverage}{averageScore > 0 ? '%' : ''}
                    </h3>
                    <p className="text-white/80 font-semibold text-xs mt-1.5">
                      {averageScore >= 75 ? 'Proficient overall mastery' : averageScore > 0 ? 'Below 75% passing threshold' : 'No evaluations logged'}
                    </p>
                  </div>
                  <RadialScoreRing 
                    value={averageScore} 
                    size={64} 
                    colorClass="text-white" 
                    trackClass="text-white/20"
                    textColorClass="text-white"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/20 flex items-center justify-between h-9 text-xs">
                <span className="text-white/80 font-bold">DepEd Standard: 75%</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-white font-black border border-white/25">
                  {averageScore >= 75 ? `+${averageScore - 75}% margin` : averageScore > 0 ? `-${75 - averageScore}% to pass` : 'Take diagnostic'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOLDER 2: Proficiency Rate & Focus Area (Solid Warm Terracotta/Apricot #D96B43) */}
        <div className="group text-left select-none transition-all duration-300 flex flex-col h-full">
          <div className="relative pt-10 sm:pt-11 flex-1 flex flex-col h-full">
            {/* Seamless Solid Folder Tab — Spacious & Breathable */}
            <div className="absolute top-0 left-0 h-10 sm:h-11 w-52 sm:w-56 rounded-t-2xl bg-[#D96B43] flex items-center px-5 sm:px-6 gap-2.5 border-t border-x border-white/25 shadow-xs">
              <Target className="w-4 h-4 text-white shrink-0" />
              <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-white leading-none">
                FOCUS AREA
              </span>
            </div>

            {/* Solid Folder Card Body — Equal Stretch Height */}
            <div className="bg-[#D96B43] text-white rounded-[2rem] rounded-tl-none p-5 sm:p-6 shadow-[0_10px_25px_-5px_rgba(217,107,67,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(217,107,67,0.45)] transition-all duration-300 flex-1 flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-3 h-7">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white border border-white/25 shadow-xs">
                    Weakest Subject
                  </span>
                  <span className="text-[10px] font-black bg-white/25 backdrop-blur-sm text-white border border-white/30 px-2.5 py-0.5 rounded-full">
                    Priority
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 min-h-[72px]">
                  <div className="min-w-0 pr-2 flex-1">
                    <h3 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight truncate leading-none" title={diagnosticSummary?.weaknesses?.[0] || 'Finite Mathematics'}>
                      {diagnosticSummary?.weaknesses?.[0] || 'Finite Mathematics'}
                    </h3>
                    <p className="text-white/80 font-semibold text-xs mt-1.5">
                      Identified as lowest relative score
                    </p>
                  </div>
                  <RadialScoreRing 
                    value={proficiencyRate} 
                    size={64} 
                    colorClass="text-white" 
                    trackClass="text-white/20"
                    textColorClass="text-white"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/20 flex items-center justify-between h-9 text-xs">
                <span className="text-white/80 font-bold">Personalized Practice</span>
                <button
                  type="button"
                  onClick={() => handleStartPractice(diagnosticSummary?.weaknesses?.[0])}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#D96B43] bg-white hover:bg-white/95 px-3 py-1 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  Practice Topic <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOLDER 3: Evaluations Logged & Velocity (Solid Deep Pine/Emerald #1E8A70) */}
        <div className="group text-left select-none transition-all duration-300 flex flex-col h-full">
          <div className="relative pt-10 sm:pt-11 flex-1 flex flex-col h-full">
            {/* Seamless Solid Folder Tab — Spacious & Breathable */}
            <div className="absolute top-0 left-0 h-10 sm:h-11 w-52 sm:w-56 rounded-t-2xl bg-[#1E8A70] flex items-center px-5 sm:px-6 gap-2.5 border-t border-x border-white/25 shadow-xs">
              <TrendingUp className="w-4 h-4 text-white shrink-0" />
              <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-white leading-none">
                RECORD
              </span>
            </div>

            {/* Solid Folder Card Body — Equal Stretch Height */}
            <div className="bg-[#1E8A70] text-white rounded-[2rem] rounded-tl-none p-5 sm:p-6 shadow-[0_10px_25px_-5px_rgba(30,138,112,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(30,138,112,0.45)] transition-all duration-300 flex-1 flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-3 h-7">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white border border-white/25 shadow-xs">
                    Evaluations Logged
                  </span>
                  <span className="text-[10px] font-black bg-white/25 backdrop-blur-sm text-white border border-white/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-200" /> Active Pace
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 min-h-[72px]">
                  <div>
                    <h3 className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight leading-none">
                      {totalQuizzes}
                    </h3>
                    <p className="text-white/80 font-semibold text-xs mt-1.5">
                      {recentQuizzes.length} activities logged in learning record
                    </p>
                  </div>
                  <RadialScoreRing 
                    value={proficiencyRate} 
                    size={64} 
                    colorClass="text-white" 
                    trackClass="text-white/20"
                    textColorClass="text-white"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/20 flex items-center justify-between h-9 text-xs">
                <span className="text-white/80 font-bold">Evaluation Velocity</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-white font-black border border-white/25">
                  {proficiencyRate}% passing
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. AI Diagnostic Intelligence Showcase Banner */}
      {diagnosticSummary && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#FAF8FF] via-white to-[#F3EFFF] dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 border-2 border-purple-200/90 dark:border-purple-800/60 rounded-[2.25rem] p-5 sm:p-7 shadow-[0_8px_25px_-10px_rgba(124,58,237,0.06)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-200/25 dark:bg-purple-600/10 rounded-full blur-3xl -mt-24 -mr-24 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] flex items-center justify-center text-white shadow-md shadow-purple-500/25 shrink-0">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    Diagnostic Assessment Results
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" /> AI Evaluated
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs mt-0.5">
                  Your foundational competency evaluation and personalized learning recommendation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-xs ${
                diagnosticSummary.riskLevel === 'Low' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                  : diagnosticSummary.riskLevel === 'High' || diagnosticSummary.riskLevel === 'At Risk' 
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {diagnosticSummary.riskLevel === 'Low' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {diagnosticSummary.riskLevel} Risk
              </span>

              <button
                type="button"
                onClick={() => setShowBreakdownModal(true)}
                className="inline-flex items-center gap-1 text-xs font-black text-purple-800 dark:text-purple-200 hover:text-purple-950 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 border border-purple-200 dark:border-purple-700 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                In-Depth Breakdown
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3 Balanced Pods Inside Diagnostic Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Pod 1: Score */}
            <div className="bg-white/95 dark:bg-slate-800/90 rounded-[1.5rem] p-4 border border-purple-100/80 dark:border-purple-800/50 shadow-xs flex items-center gap-3.5">
              <RadialScoreRing 
                value={diagnosticSummary.score} 
                size={56} 
                colorClass={diagnosticSummary.score >= 75 ? 'text-emerald-500' : 'text-[#7C3AED]'} 
              />
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Baseline Score</p>
                <h4 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white">{diagnosticSummary.score}%</h4>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Foundational evaluation</p>
              </div>
            </div>

            {/* Pod 2: Focus Areas */}
            <div className="bg-white/95 dark:bg-slate-800/90 rounded-[1.5rem] p-4 border border-amber-100/80 dark:border-amber-800/50 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-600" /> Focus Areas
                  </p>
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                    {diagnosticSummary.weaknesses.length} topics
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {diagnosticSummary.weaknesses.slice(0, 3).map((weakness, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {weakness}
                    </span>
                  ))}
                  {diagnosticSummary.weaknesses.length === 0 && (
                    <p className="text-xs font-medium text-slate-400 italic">No specific weak areas detected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pod 3: Recommendation */}
            <div className="bg-white/95 dark:bg-slate-800/90 rounded-[1.5rem] p-4 border border-indigo-100/80 dark:border-indigo-800/50 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Recommendation
                </p>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {diagnosticSummary.recommendation}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Personalized Guidance</span>
                <button
                  type="button"
                  onClick={() => setShowBreakdownModal(true)}
                  className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 hover:underline"
                >
                  View Analysis →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. TWO-COLUMN INTERACTIVE CONTENT (MAIN CONTENT + SIDEBAR)        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        
        {/* LEFT 2 COLUMNS: Subject Capsule Benchmark Chart & Activity Feed */}
        <div className="lg:col-span-2 space-y-5 lg:space-y-6">
          
          {/* Card A: Two-Tone Capsule Bar Chart with Passing Benchmark Line */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                  Subject Performance & Benchmark
                </h3>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-0.5">
                  Visual mastery comparison against DepEd 75% Passing Standard
                </p>
              </div>

              {activeSubjectTab && (
                <button
                  type="button"
                  onClick={() => setActiveSubjectTab(null)}
                  className="self-start sm:self-auto text-xs font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800 transition-all"
                >
                  Filter: {activeSubjectTab} (Clear ✕)
                </button>
              )}
            </div>

            {/* Two-Tone Capsule Columns */}
            <div className="relative pt-6 pb-2">
              {/* Benchmark Reference Line across the chart */}
              <div 
                className="absolute left-0 right-0 border-t-2 border-dashed border-purple-400/60 z-10 pointer-events-none flex items-center justify-end"
                style={{ bottom: '38%' }}
              >
                <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full -translate-y-1/2 mr-2 border border-purple-300/80 dark:border-purple-800 shadow-xs">
                  75% Passing Benchmark
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 relative z-0">
                {displaySubjectPerformance.map((subject, idx) => {
                  const colorClasses = recordGet(colorClassBySubject, subject.color) || colorClassBySubject.slate;
                  const isPassing = subject.average >= 75;
                  const isMastered = subject.average >= 85;
                  const isSelected = activeSubjectTab === subject.subject;

                  return (
                    <div 
                      key={idx}
                      onClick={() => setActiveSubjectTab(isSelected ? null : subject.subject)}
                      className={`cursor-pointer rounded-2xl p-4 transition-all duration-300 flex flex-col items-center text-center ${
                        isSelected 
                          ? 'bg-purple-50/90 dark:bg-purple-950/40 border-2 border-purple-500 shadow-md scale-[1.02]' 
                          : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      {/* Subject Icon & Title */}
                      <span className="text-2xl mb-1">{colorClasses.icon}</span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 line-clamp-1">
                        {subject.subject}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mb-3">{subject.quizzes} activities</p>

                      {/* The Tall Rounded Two-Tone Capsule Bar */}
                      <div className="w-9 sm:w-11 h-32 bg-slate-200/70 dark:bg-slate-800 rounded-full p-1 flex flex-col justify-end overflow-hidden relative shadow-inner">
                        <div 
                          className={`w-full rounded-full transition-all duration-1000 flex flex-col justify-between p-1 relative overflow-hidden ${
                            isMastered 
                              ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400' 
                              : isPassing 
                                ? 'bg-gradient-to-t from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6]' 
                                : 'bg-gradient-to-t from-orange-500 via-amber-500 to-yellow-400'
                          }`}
                          style={{ height: `${Math.max(subject.average, 15)}%` }}
                        >
                          <div className="w-full h-1.5 rounded-full bg-white/40" />
                          <span className="text-[10px] font-black text-white text-center drop-shadow-xs">
                            {subject.average}%
                          </span>
                        </div>
                      </div>

                      {/* Status Tag Below */}
                      <span className={`mt-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        isMastered 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' 
                          : isPassing 
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' 
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      }`}>
                        {isMastered ? 'Mastered' : isPassing ? 'Proficient' : 'Needs Boost'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card B: Recent Assessments Activity Table (Solution: Paged 4 items to eliminate vertical bloat!) */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                  Recent Assessments
                </h3>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-0.5">
                  Chronological record of evaluated quiz and practice sessions
                </p>
              </div>

              {/* Feed Filters */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 sm:flex-none">
                  <select 
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="appearance-none w-full pl-3 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer min-w-[110px]"
                  >
                    <option value="all">All Subjects</option>
                    {allowedSubjectLabels.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative flex-1 sm:flex-none">
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="appearance-none w-full pl-3 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer min-w-[95px]"
                  >
                    <option value="all">All Types</option>
                    <option value="quiz">Quiz</option>
                    <option value="practice">Practice</option>
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Compact Table Rows with Rich Contextual Colors (Limited to 4 per page!) */}
            <div className="mt-3.5 space-y-2">
              {paginatedQuizzes.length > 0 ? (
                paginatedQuizzes.map((quiz) => (
                  <div 
                    key={quiz.id}
                    className="bg-slate-50/75 dark:bg-slate-800/40 hover:bg-purple-50/60 dark:hover:bg-purple-950/30 border border-slate-200/70 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 rounded-2xl p-3 sm:p-3.5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group shadow-2xs"
                  >
                    {/* Left: Avatar Icon + Title + Metadata */}
                    <div className="flex items-center gap-3 min-w-0 sm:w-6/12">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform border ${
                        quiz.type === 'practice' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400'
                      }`}>
                        {quiz.type === 'practice' ? <Zap className="w-4 h-4 text-emerald-600" /> : <Award className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                          {quiz.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{quiz.subject}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">{quiz.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Type Badge + Score Pill + Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-800 shrink-0">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        quiz.type === 'practice' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800' 
                          : 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200/70 dark:border-purple-800'
                      }`}>
                        {quiz.type === 'practice' ? 'Practice' : 'Quiz'}
                      </span>

                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black border shadow-xs tabular-nums ${
                        quiz.score >= 80 
                          ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' 
                          : quiz.score >= 60 
                            ? 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' 
                            : 'bg-rose-100/90 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                      }`}>
                        {quiz.score}%
                      </span>

                      <button
                        type="button"
                        onClick={() => handleStartPractice(quiz.subject)}
                        title="Practice topic again"
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:text-purple-700 dark:hover:text-purple-300 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 bg-purple-50 dark:bg-slate-800 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-2">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h4 className="text-slate-800 dark:text-slate-200 font-black text-xs">No assessments match filters</h4>
                  <p className="text-slate-400 font-bold text-[11px] mt-0.5">Try switching filters or start a new practice session</p>
                </div>
              )}
            </div>

            {/* Pagination Controls — Keeps Recent Assessments compact & tidy! */}
            {filteredQuizzes.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span className="text-[11px]">
                  Showing {(assessmentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(assessmentPage * ITEMS_PER_PAGE, filteredQuizzes.length)} of {filteredQuizzes.length}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={assessmentPage === 1}
                    onClick={() => setAssessmentPage(p => Math.max(p - 1, 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs flex items-center gap-0.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black text-[11px] tabular-nums">
                    {assessmentPage} / {totalAssessmentPages}
                  </span>
                  <button
                    type="button"
                    disabled={assessmentPage === totalAssessmentPages}
                    onClick={() => setAssessmentPage(p => Math.min(p + 1, totalAssessmentPages))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs flex items-center gap-0.5 cursor-pointer"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: Subject Ranking & Momentum Action */}
        <div className="space-y-5 lg:space-y-6 flex flex-col">
          
          {/* Card C: Subject Mastery Leaderboard */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white">
                  Subject Ranking
                </h3>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs">Top performing subjects</p>
              </div>
              <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                Ranked
              </span>
            </div>

            {/* Ranked Pods */}
            <div className="space-y-2.5">
              {rankedSubjects.map((subject, rankIdx) => {
                const isFirst = rankIdx === 0;
                const isLast = rankIdx === rankedSubjects.length - 1 && rankedSubjects.length > 1;

                return (
                  <div 
                    key={rankIdx}
                    className={`rounded-2xl p-3.5 border transition-all duration-200 flex items-center justify-between gap-3 ${
                      isFirst 
                        ? 'bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-white dark:from-emerald-950/40 dark:to-slate-900 border-emerald-200/80 dark:border-emerald-800/60 shadow-xs' 
                        : isLast 
                          ? 'bg-gradient-to-r from-orange-50/80 via-orange-50/40 to-white dark:from-orange-950/40 dark:to-slate-900 border-orange-200/80 dark:border-orange-800/60' 
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        isFirst 
                          ? 'bg-emerald-500 text-white shadow-xs' 
                          : isLast 
                            ? 'bg-orange-500 text-white shadow-xs' 
                            : 'bg-purple-600 text-white shadow-xs'
                      }`}>
                        #{rankIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {subject.subject}
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{subject.quizzes} activities</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block tabular-nums">{subject.average}%</span>
                      <button
                        type="button"
                        onClick={() => handleStartPractice(subject.subject)}
                        className="text-[10px] font-black text-purple-700 dark:text-purple-400 hover:text-purple-900 hover:underline flex items-center gap-0.5 justify-end mt-0.5 cursor-pointer"
                      >
                        Practice <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card D: Learning Momentum Card */}
          <div className="relative bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#4F46E5] rounded-[2rem] p-5 sm:p-6 shadow-[0_12px_30px_-10px_rgba(124,58,237,0.45)] text-white overflow-hidden group">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/15 rounded-full blur-3xl -mt-10 -mr-10 group-hover:bg-white/25 transition-all duration-700 ease-in-out" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/30 rounded-full blur-2xl -mb-10 -ml-10" />

            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3.5 backdrop-blur-md border border-white/30 shadow-xs group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-display font-black tracking-tight mb-1.5 leading-tight">
                Empower Your Mathematical Mastery!
              </h3>
              <p className="text-white/85 text-xs font-medium leading-relaxed mb-4">
                Reinforce your identified focus areas with adaptive practice modules aligned with DepEd Strengthened Senior High School competencies.
              </p>
              <Button
                onClick={() => handleStartPractice()}
                className="w-full bg-white text-purple-800 hover:bg-slate-50 border-0 font-black h-10 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs flex items-center justify-center gap-1.5"
              >
                Launch Practice Center
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

        </div>

      </div>

      {/* Diagnostic Breakdown Modal */}
      {showBreakdownModal && currentUser?.uid && (
        <Suspense fallback={null}>
          <DiagnosticBreakdown
            userId={currentUser.uid}
            mode="modal"
            isOpen={showBreakdownModal}
            onClose={() => setShowBreakdownModal(false)}
          />
        </Suspense>
      )}

    </div>
  );
};

export default GradesPage;
