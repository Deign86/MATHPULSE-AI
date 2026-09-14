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
  ArrowRight,
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

interface ExamMilestone {
  title: string;
  subject: string;
  status: 'completed' | 'in-progress' | 'ready';
  statusLabel: string;
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

  // Compute exam readiness score from average & quiz proficiency
  const examReadinessScore = useMemo(() => {
    if (averageScore > 0 && proficiencyRate > 0) {
      return Math.round((averageScore * 0.6) + (proficiencyRate * 0.4));
    }
    if (averageScore > 0) return averageScore;
    if (diagnosticSummary?.score) return diagnosticSummary.score;
    return 70;
  }, [averageScore, proficiencyRate, diagnosticSummary?.score]);

  // Derive core Senior High School STEM exam milestones
  const examMilestones = useMemo<ExamMilestone[]>(() => {
    const genMathSubject = displaySubjectPerformance.find(s => s.subject.toLowerCase().includes('general'));
    const statsSubject = displaySubjectPerformance.find(s => s.subject.toLowerCase().includes('stat'));
    const genMathScore = genMathSubject?.average ?? 0;
    const statsScore = statsSubject?.average ?? 0;

    return [
      {
        title: 'Functions & Rational Relations',
        subject: 'General Mathematics',
        status: genMathScore >= 75 ? 'completed' : genMathScore > 0 ? 'in-progress' : 'ready',
        statusLabel: genMathScore >= 75 ? 'Mastered' : genMathScore > 0 ? `${genMathScore}%` : 'Up Next',
      },
      {
        title: 'Business Mathematics & Annuities',
        subject: 'General Mathematics',
        status: genMathScore >= 85 ? 'completed' : 'in-progress',
        statusLabel: genMathScore >= 85 ? 'Mastered' : 'In Review',
      },
      {
        title: 'Normal Distribution & Z-Scores',
        subject: 'Statistics & Probability',
        status: statsScore >= 75 ? 'completed' : statsScore > 0 ? 'in-progress' : 'ready',
        statusLabel: statsScore >= 75 ? 'Mastered' : statsScore > 0 ? `${statsScore}%` : 'Up Next',
      },
      {
        title: 'Sampling & Hypothesis Testing',
        subject: 'Statistics & Probability',
        status: statsScore >= 85 ? 'completed' : 'ready',
        statusLabel: statsScore >= 85 ? 'Mastered' : 'Upcoming',
      },
    ];
  }, [displaySubjectPerformance]);

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
              <h1 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">Grades & Assessment</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/50 shadow-xs">
                Grade 11 STEM
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs mt-0.5">
              Check your math grades, quiz scores, and subject progress
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
            className="flex-1 md:flex-none bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-black rounded-xl h-9.5 px-4 shadow-[0_6px_16px_-4px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 transition-all text-xs flex items-center gap-1.5 cursor-pointer" 
            onClick={handleExportReport}
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
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
                GENERAL AVERAGE
              </span>
            </div>

            {/* Solid Folder Card Body — Equal Stretch Height */}
            <div className="bg-[#5856D6] text-white rounded-[2rem] rounded-tl-none p-5 sm:p-6 shadow-[0_10px_25px_-5px_rgba(88,86,214,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(88,86,214,0.45)] transition-all duration-300 flex-1 flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-3 h-7">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white border border-white/25 shadow-xs">
                    Overall Grade
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
                      {averageScore >= 75 ? 'Passing with good standing' : averageScore > 0 ? 'Aim for 75% to reach passing grade' : 'Take a quiz to calculate grade'}
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
                <span className="text-white/80 font-bold">Passing Mark: 75%</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-white font-black border border-white/25">
                  {averageScore >= 75 ? `+${averageScore - 75}% above passing` : averageScore > 0 ? `-${75 - averageScore}% to pass` : 'Take quiz'}
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
                FOCUS TOPIC
              </span>
            </div>

            {/* Solid Folder Card Body — Equal Stretch Height */}
            <div className="bg-[#D96B43] text-white rounded-[2rem] rounded-tl-none p-5 sm:p-6 shadow-[0_10px_25px_-5px_rgba(217,107,67,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(217,107,67,0.45)] transition-all duration-300 flex-1 flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-3 h-7">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white border border-white/25 shadow-xs">
                    Needs Practice
                  </span>
                  <span className="text-[10px] font-black bg-white/25 backdrop-blur-sm text-white border border-white/30 px-2.5 py-0.5 rounded-full">
                    Priority Topic
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 min-h-[72px]">
                  <div className="min-w-0 pr-2 flex-1">
                    <h3 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight truncate leading-none" title={diagnosticSummary?.weaknesses?.[0] || 'Finite Mathematics'}>
                      {diagnosticSummary?.weaknesses?.[0] || 'Finite Mathematics'}
                    </h3>
                    <p className="text-white/80 font-semibold text-xs mt-1.5">
                      Practice this topic to boost your overall score
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
                <span className="text-white/80 font-bold">Recommended Drill</span>
                <button
                  type="button"
                  onClick={() => handleStartPractice(diagnosticSummary?.weaknesses?.[0])}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#D96B43] bg-white hover:bg-white/90 px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
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
                QUIZ LOG
              </span>
            </div>

            {/* Solid Folder Card Body — Equal Stretch Height */}
            <div className="bg-[#1E8A70] text-white rounded-[2rem] rounded-tl-none p-5 sm:p-6 shadow-[0_10px_25px_-5px_rgba(30,138,112,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(30,138,112,0.45)] transition-all duration-300 flex-1 flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-3 h-7">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white border border-white/25 shadow-xs">
                    Quizzes Completed
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
                      {recentQuizzes.length} quizzes and drills completed
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
                <span className="text-white/80 font-bold">Passing Accuracy</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-white font-black border border-white/25">
                  {proficiencyRate}% passed
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. AI Diagnostic Results Banner */}
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
                    Initial Diagnostic Results
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" /> AI Checked
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs mt-0.5">
                  See your starting math strengths and where your AI tutor recommends focusing next
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-xs ${
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
                className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-500/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                View Full Analysis
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
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Diagnostic Score</p>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white">{diagnosticSummary.score}%</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    diagnosticSummary.score >= 75 
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' 
                      : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                  }`}>
                    {diagnosticSummary.score >= 75 ? 'Passing' : 'Needs Work'}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Starting math assessment</p>
              </div>
            </div>

            {/* Pod 2: Focus Areas / Topics to Practice */}
            <div className="bg-white/95 dark:bg-slate-800/90 rounded-[1.5rem] p-4 border border-amber-100/80 dark:border-amber-800/50 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-600" /> Topics to Practice
                  </p>
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                    {diagnosticSummary.weaknesses.length} {diagnosticSummary.weaknesses.length === 1 ? 'topic' : 'topics'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {diagnosticSummary.weaknesses.slice(0, 3).map((weakness, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleStartPractice(weakness)}
                      title={`Practice ${weakness}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{weakness}</span>
                      <ArrowUpRight className="w-3 h-3 text-amber-600 shrink-0 opacity-70 group-hover:opacity-100" />
                    </button>
                  ))}
                  {diagnosticSummary.weaknesses.length === 0 && (
                    <p className="text-xs font-medium text-slate-400 italic">All foundational topics look solid!</p>
                  )}
                </div>
              </div>
              {diagnosticSummary.weaknesses.length > 0 && (
                <p className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 mt-2">
                  💡 Tap any topic to start practice questions
                </p>
              )}
            </div>

            {/* Pod 3: AI Recommendation with high affordance and unmistakable CTA */}
            <div 
              onClick={() => setShowBreakdownModal(true)}
              className="bg-gradient-to-br from-purple-50/90 via-white to-indigo-50/80 dark:from-purple-950/40 dark:via-slate-800 dark:to-indigo-950/40 rounded-[1.5rem] p-4 border-2 border-purple-200/90 dark:border-purple-800/80 hover:border-purple-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Subtle ambient spotlight */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" /> AI Study Advice
                  </span>
                  <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 shadow-2xs">
                    Tap to open ↗
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-2 mt-1">
                  "{diagnosticSummary.recommendation}"
                </p>
              </div>

              {/* Unmistakable CTA Button */}
              <div className="relative z-10 mt-3 pt-2 border-t border-purple-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBreakdownModal(true);
                  }}
                  className="w-full py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-black text-xs shadow-md shadow-purple-500/25 flex items-center justify-center gap-1.5 transition-all group-hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <span>Open Full AI Study Plan</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    Subject Grades & Passing Line
                  </h3>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 hidden sm:inline-block">
                    Interactive
                  </span>
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-0.5">
                  Compare your subject averages against the DepEd 75% passing mark
                </p>
              </div>

              {activeSubjectTab ? (
                <button
                  type="button"
                  onClick={() => setActiveSubjectTab(null)}
                  className="self-start sm:self-auto text-xs font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-2xs"
                >
                  Filtered: {activeSubjectTab} (Clear ✕)
                </button>
              ) : (
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 self-start sm:self-auto">
                  <span>👆 Click any subject bar to filter</span>
                </span>
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
                  75% Passing Mark (DepEd)
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
                                ? subject.subject.toLowerCase().includes('general')
                                  ? 'bg-gradient-to-t from-indigo-700 via-indigo-600 to-sky-400'
                                  : 'bg-gradient-to-t from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6]' 
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
                      <span className={`mt-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        isMastered 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                          : isPassing 
                            ? subject.subject.toLowerCase().includes('general')
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800' 
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}>
                        {isMastered ? 'Honors (≥85%)' : isPassing ? 'Passing (≥75%)' : 'Needs Practice'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card B: Recent Quizzes & Practice Activity Table */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                  Recent Quizzes & Practice
                </h3>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-0.5">
                  Your latest quiz scores and practice session records
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

            {/* Scrollable Container with Fixed Bounds to Prevent Vertical Blowout */}
            <div className="mt-3.5 space-y-2 max-h-[320px] sm:max-h-[350px] overflow-y-auto pr-1 sm:pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {paginatedQuizzes.length > 0 ? (
                paginatedQuizzes.map((quiz) => {
                  const isGenMath = quiz.subject.toLowerCase().includes('general');
                  const isStats = quiz.subject.toLowerCase().includes('stat');

                  return (
                    <div 
                      key={quiz.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 group ${
                        isGenMath 
                          ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-100/60 dark:border-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700' 
                          : isStats 
                            ? 'bg-purple-50/20 dark:bg-purple-950/10 border-purple-100/60 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      {/* Left: Avatar Icon + Title + Metadata */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          quiz.score >= 75 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                            : quiz.score >= 60 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}>
                          {quiz.type === 'practice' ? <Zap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                            {quiz.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold">
                            <span className={isGenMath ? 'text-indigo-600 dark:text-indigo-400' : isStats ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}>
                              {isGenMath ? '📐 General Math' : isStats ? '🎲 Statistics & Prob' : quiz.subject}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-slate-400 dark:text-slate-500">{quiz.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Type Badge + Score Pill + Action */}
                      <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          quiz.type === 'practice' 
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800' 
                            : isGenMath 
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800'
                              : 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200/70 dark:border-purple-800'
                        }`}>
                          {quiz.type === 'practice' ? 'Practice' : 'Quiz'}
                        </span>

                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black border shadow-xs tabular-nums ${
                          quiz.score >= 75 
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
                          title={`Practice ${quiz.subject}`}
                          className={`px-2.5 py-1 rounded-xl border text-xs font-black transition-all flex items-center gap-1 shadow-2xs hover:shadow-xs cursor-pointer ${
                            isGenMath
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                              : 'bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-600 hover:text-white border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          Practice <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
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
          
          {/* Card C: Subject Standings */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white">
                  Subject Standings
                </h3>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs">Ranked by your highest average</p>
              </div>
              <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                Ranked
              </span>
            </div>

            {/* Ranked Pods - Bounded Scrollable Container */}
            <div className="space-y-2.5 max-h-[200px] sm:max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {rankedSubjects.map((subject, rankIdx) => {
                const isFirst = rankIdx === 0;
                const isGenMath = subject.subject.toLowerCase().includes('general');
                const isStats = subject.subject.toLowerCase().includes('stat');
                const isPassing = subject.average >= 75;

                return (
                  <div 
                    key={rankIdx}
                    className={`rounded-2xl p-3.5 border transition-all duration-200 flex items-center justify-between gap-3 ${
                      isFirst 
                        ? 'bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-white dark:from-emerald-950/40 dark:to-slate-900 border-emerald-200/80 dark:border-emerald-800/60 shadow-xs' 
                        : isGenMath
                          ? 'bg-gradient-to-r from-indigo-50/60 via-indigo-50/30 to-white dark:from-indigo-950/40 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/60'
                          : 'bg-gradient-to-r from-violet-50/60 via-violet-50/30 to-white dark:from-violet-950/40 dark:to-slate-900 border-violet-100 dark:border-violet-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        isFirst 
                          ? 'bg-emerald-500 text-white shadow-xs' 
                          : isGenMath 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-purple-600 text-white shadow-xs'
                      }`}>
                        #{rankIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {isGenMath ? '📐 ' : isStats ? '🎲 ' : ''}{subject.subject}
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{subject.quizzes} activities</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs sm:text-sm font-black block tabular-nums ${
                        isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}>{subject.average}%</span>
                      <button
                        type="button"
                        onClick={() => handleStartPractice(subject.subject)}
                        className={`text-[11px] font-black hover:text-white border px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 justify-end mt-1 cursor-pointer shadow-2xs hover:shadow-xs ${
                          isGenMath
                            ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 border-indigo-200 dark:border-indigo-800'
                            : 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-600 border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        Practice <ArrowUpRight className="w-3 h-3" />
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
                Ready to Boost Your Grades?
              </h3>
              <p className="text-white/85 text-xs font-medium leading-relaxed mb-4">
                Practice math questions tailored to what you need to review, with helpful hints to get you exam-ready.
              </p>
              <Button
                onClick={() => handleStartPractice()}
                className="w-full bg-white text-purple-800 hover:bg-slate-50 border-0 font-black h-10 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Start Math Practice ⚡
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Card E: Quarter Exam Readiness & Key Milestones */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white leading-tight">
                    Exam Readiness
                  </h3>
                  <p className="text-slate-400 dark:text-slate-500 font-bold text-xs">Senior High School Milestones</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                examReadinessScore >= 75 
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800' 
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800'
              }`}>
                {examReadinessScore >= 75 ? 'On Track 🚀' : 'Prep Needed ⚡'}
              </span>
            </div>

            {/* Readiness Gauge / Progress Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-600 dark:text-slate-300">Quarter Exam Target</span>
                <span className="font-black text-slate-900 dark:text-white tabular-nums text-sm">{examReadinessScore}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200/70 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-700" 
                  style={{ width: `${Math.min(100, Math.max(12, examReadinessScore))}%` }} 
                />
              </div>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2">
                Calculated from quiz passing rate and completed practice modules.
              </p>
            </div>

            {/* Milestones Header */}
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between px-1">
              <span>Core SHS Competencies</span>
              <span>Status</span>
            </div>

            {/* Milestones List - Bounded Scrollable Container */}
            <div className="space-y-2 mb-4 max-h-[190px] sm:max-h-[210px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {examMilestones.map((milestone, milestoneIdx) => {
                const isGenMath = milestone.subject.toLowerCase().includes('general');
                const isStats = milestone.subject.toLowerCase().includes('stat');

                return (
                  <button
                    key={milestoneIdx}
                    type="button"
                    onClick={() => handleStartPractice(milestone.subject)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 bg-white dark:bg-slate-900 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                        milestone.status === 'completed' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                          : isGenMath
                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                      }`}>
                        {milestone.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-[10px] font-black">{milestoneIdx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          {milestone.title}
                        </p>
                        <p className={`text-[10px] font-bold ${
                          isGenMath ? 'text-indigo-600 dark:text-indigo-400' : isStats ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'
                        }`}>
                          {isGenMath ? '📐 General Math' : isStats ? '🎲 Statistics & Prob' : milestone.subject}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 border ${
                      milestone.status === 'completed'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : milestone.status === 'in-progress'
                          ? isGenMath
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}>
                      {milestone.statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => handleStartPractice()}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-purple-700 dark:hover:bg-purple-100 text-white dark:text-slate-900 hover:text-white dark:hover:text-purple-900 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Practice Next Exam Milestone</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
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
