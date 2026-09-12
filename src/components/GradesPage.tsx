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
  Zap,
  BookOpen,
  GraduationCap,
  ChevronRight,
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
const RadialScoreRing: React.FC<{ value: number; size?: number; strokeWidth?: number; colorClass?: string }> = ({
  value,
  size = 64,
  strokeWidth = 6,
  colorClass = 'text-[#7C3AED]',
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
          className="text-slate-100/80"
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
        <span className="text-[13px] font-black text-slate-900 tracking-tight leading-none">
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
          const d = summarySnap.data();
          if (d.status === 'ready') {
            score = d.latestScorePercent || 0;
            riskLevel = d.latestRiskLevel || 'Unknown';
            weaknesses = d.weaknesses || [];
            recommendation = d.recommendation || '';
          }
        } else {
          const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userSnap.exists()) {
            const u = userSnap.data();
            if (u.initialAssessmentCompleted || u.hasCompletedInitialAssessment) {
              riskLevel = (u.atRiskSubjects?.length > 0) ? 'Moderate' : 'Low';
              weaknesses = u.atRiskSubjects || [];
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
    .map(([subjectId, subjectData]: [string, any]) => {
      const info = subjectMap[subjectId] || { label: subjectId, color: 'slate' };
      
      const subjectQuizAttempts = (userProgress?.quizAttempts || []).filter(q => {
        const modules = subjectData?.modulesProgress || {};
        return Object.values(modules).some((m: any) => m.quizzesCompleted?.includes(q.quizId));
      });
      const avg = subjectQuizAttempts.length > 0
        ? Math.round(subjectQuizAttempts.reduce((sum: number, q) => sum + q.score, 0) / subjectQuizAttempts.length)
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

  // Ranked subjects for the Leaderboard / Competency Pods (Screen 3 inspired)
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
        mod.quizzes.forEach((q) => {
          quizLookup.set(q.id, { title: q.title, subject: subjectName });
        });
      });
    });
    return userProgress.quizAttempts.map((attempt, i) => {
      const lookup = quizLookup.get(attempt.quizId);
      const completedDate = new Date(attempt.completedAt);
      return {
        id: 10000 + i,
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
      .map((record, i) => ({
        id: i + 1,
        title: record.title || `Assessment ${i + 1}`,
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
      .slice(0, 20)
      .filter((quiz) => allowedSubjectLabels.includes(quiz.subject));
  }, [assessments, progressQuizEntries, allowedSubjectLabels]);

  // Filter quizzes based on active selections + interactive subject chart tab
  const filteredQuizzes = recentQuizzes.filter(quiz => {
    if (!allowedSubjectLabels.includes(quiz.subject)) return false;
    
    const activeChartSubjectMatch = !activeSubjectTab || quiz.subject === activeSubjectTab;
    const subjectMatch = filterSubject === 'all' || quiz.subject === filterSubject;
    const typeMatch = filterType === 'all' || quiz.type === filterType;
    const quarterMatch = filterQuarter === 'all' || 
      quiz.title.toLowerCase().includes(filterQuarter.toLowerCase()) || 
      quiz.subject.toLowerCase().includes(filterQuarter.toLowerCase());

    return activeChartSubjectMatch && subjectMatch && typeMatch && quarterMatch;
  });

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
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-7 max-w-7xl mx-auto">
      
      {/* 1. Header Bar with Greeting, Strand Badge, and Time/Report Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/95 backdrop-blur-md p-5 sm:p-7 rounded-[2rem] border border-purple-100/70 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.06)]">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#8B5CF6] to-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 tracking-tight">Assessment</h1>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200/70 shadow-xs">
                Grade 11 STEM
              </span>
            </div>
            <p className="text-slate-500 font-semibold mt-0.5 text-xs sm:text-[13px]">
              Review your performance across subjects & competency analytics
            </p>
          </div>
        </div>

        {/* Controls: Quarter Filter & Export CSV */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <select
              value={filterQuarter}
              onChange={(e) => setFilterQuarter(e.target.value)}
              className="appearance-none w-full md:w-auto pl-9 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer shadow-xs"
            >
              <option value="all">This Quarter</option>
              <option value="Q1">Quarter 1</option>
              <option value="Q2">Quarter 2</option>
              <option value="Q3">Quarter 3</option>
              <option value="Q4">Quarter 4</option>
            </select>
            <Calendar className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <Button 
            className="flex-1 md:flex-none bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-black rounded-2xl h-11 px-5 shadow-[0_8px_20px_-6px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 transition-all text-xs sm:text-sm flex items-center gap-2" 
            onClick={handleExportReport}
          >
            <Download className="w-4 h-4" />
            Report
          </Button>
        </div>
      </div>

      {/* 2. Bento Grid Tier 1: Modern 3-Column Visual Metrics (Reference Screen 1, 2, 4 Inspired) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Tile 1: General Average Hero Metric (Soft Lavender `#FAF8FF`) */}
        <div className="bg-[#FAF8FF] hover:bg-[#F6F2FF] border-2 border-purple-100/90 rounded-[2.25rem] p-6 shadow-sm transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-purple-800 border border-purple-200/80 shadow-xs">
                <Award className="w-3.5 h-3.5 text-purple-600" /> General Average
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                averageScore >= 75 ? 'bg-emerald-100 text-emerald-800' : averageScore > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {averageScore >= 75 ? 'Passing' : averageScore > 0 ? 'Needs Boost' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div>
                <h3 className="text-4xl sm:text-5xl font-display font-black text-slate-900 tracking-tight">
                  {generalAverage}{averageScore > 0 ? '%' : ''}
                </h3>
                <p className="text-slate-500 font-semibold text-xs mt-1">
                  {averageScore >= 75 ? 'Proficient overall average' : averageScore > 0 ? 'Below 75% passing threshold' : 'No evaluations logged'}
                </p>
              </div>
              <RadialScoreRing 
                value={averageScore} 
                size={64} 
                colorClass={averageScore >= 75 ? 'text-emerald-500' : 'text-[#7C3AED]'} 
              />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-purple-200/60 flex items-center justify-between text-xs font-black">
            <span className="text-slate-500">DepEd Standard: 75%</span>
            <span className={averageScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>
              {averageScore >= 75 ? `+${averageScore - 75}% margin` : averageScore > 0 ? `-${75 - averageScore}% to pass` : 'Take diagnostic'}
            </span>
          </div>
        </div>

        {/* Tile 2: Weakest Subject & Immediate Action (Warm Peach `#FFF8F5`) */}
        <div className="bg-[#FFF8F5] hover:bg-[#FFF2EC] border-2 border-orange-100/90 rounded-[2.25rem] p-6 shadow-sm transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-orange-800 border border-orange-200/80 shadow-xs">
                <Target className="w-3.5 h-3.5 text-orange-600" /> Weakest Subject
              </span>
              <span className="text-[10px] font-black text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full">
                Priority
              </span>
            </div>

            <div className="mt-2">
              <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-900 tracking-tight truncate" title={diagnosticSummary?.weaknesses?.[0] || 'Finite Mathematics'}>
                {diagnosticSummary?.weaknesses?.[0] || 'Finite Mathematics'}
              </h3>
              <p className="text-slate-500 font-semibold text-xs mt-1">
                Identified as lowest relative score
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-orange-200/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Personalized Practice</span>
            <button
              onClick={() => handleStartPractice(diagnosticSummary?.weaknesses?.[0])}
              className="inline-flex items-center gap-1.5 text-xs font-black text-orange-800 hover:text-orange-950 bg-white hover:bg-orange-50 px-3.5 py-1.5 rounded-xl border border-orange-200 shadow-xs transition-all"
            >
              Practice Topic <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tile 3: Quizzes Completed & Evaluation Record (Soft Mint `#F3FAF6`) */}
        <div className="bg-[#F3FAF6] hover:bg-[#EDF7F1] border-2 border-emerald-100/90 rounded-[2.25rem] p-6 shadow-sm transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-emerald-800 border border-emerald-200/80 shadow-xs">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Quizzes Completed
              </span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3 text-emerald-600" /> Active Pace
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-4xl sm:text-5xl font-display font-black text-slate-900 tracking-tight">
                {totalQuizzes}
              </h3>
              <span className="text-slate-500 text-xs font-black uppercase tracking-wider">Evaluations</span>
            </div>
            <p className="text-slate-500 font-semibold text-xs mt-1">
              {recentQuizzes.length} activities logged in learning record
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs font-black text-slate-500">
            <span>Evaluation Velocity</span>
            <span className="text-emerald-700 font-black">Consistent Learning</span>
          </div>
        </div>

      </div>

      {/* 3. AI Diagnostic Intelligence Showcase Banner (Screen 4 "Olympiad" Inspiration) */}
      {diagnosticSummary && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#FAF8FF] via-white to-[#F3EFFF] border-2 border-purple-100/90 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_12px_35px_-12px_rgba(124,58,237,0.08)]">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-200/25 rounded-full blur-3xl -mt-24 -mr-24 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
                <Brain className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight">
                    Diagnostic Assessment Results
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                    <Sparkles className="w-3 h-3 text-purple-600" /> AI Evaluated
                  </span>
                </div>
                <p className="text-slate-500 font-semibold text-xs sm:text-[13px] mt-0.5">
                  Your initial competency evaluation and personalized learning recommendation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 border shadow-xs ${
                diagnosticSummary.riskLevel === 'Low' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : diagnosticSummary.riskLevel === 'High' || diagnosticSummary.riskLevel === 'At Risk' 
                    ? 'bg-rose-50 text-rose-800 border-rose-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {diagnosticSummary.riskLevel === 'Low' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {diagnosticSummary.riskLevel} Risk
              </span>

              <button
                onClick={() => setShowBreakdownModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-black text-purple-800 hover:text-purple-950 bg-white hover:bg-purple-50 border border-purple-200 px-4 py-2 rounded-2xl transition-all shadow-xs"
              >
                In-Depth Breakdown
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3 Balanced Pods Inside Diagnostic Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Pod 1: Score */}
            <div className="bg-white/95 rounded-[1.75rem] p-5 border border-purple-100/80 shadow-xs flex items-center gap-4">
              <RadialScoreRing 
                value={diagnosticSummary.score} 
                size={64} 
                colorClass={diagnosticSummary.score >= 75 ? 'text-emerald-500' : 'text-[#7C3AED]'} 
              />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Baseline Score</p>
                <h4 className="text-2xl sm:text-3xl font-display font-black text-slate-900">{diagnosticSummary.score}%</h4>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Foundational evaluation</p>
              </div>
            </div>

            {/* Pod 2: Focus Areas */}
            <div className="bg-white/95 rounded-[1.75rem] p-5 border border-amber-100/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-600" /> Focus Areas
                  </p>
                  <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {diagnosticSummary.weaknesses.length} topics
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {diagnosticSummary.weaknesses.slice(0, 3).map((w, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {w}
                    </span>
                  ))}
                  {diagnosticSummary.weaknesses.length === 0 && (
                    <p className="text-xs font-medium text-slate-400 italic">No specific weak areas detected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pod 3: Recommendation */}
            <div className="bg-white/95 rounded-[1.75rem] p-5 border border-indigo-100/80 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-black text-indigo-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Recommendation
                </p>
                <p className="text-xs font-medium text-slate-700 leading-relaxed line-clamp-3">
                  {diagnosticSummary.recommendation}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">Personalized Tutor Guidance</span>
                <button
                  onClick={() => setShowBreakdownModal(true)}
                  className="text-xs font-black text-indigo-700 hover:text-indigo-900 hover:underline"
                >
                  View Analysis →
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. Bento Grid Tier 2: Interactive Performance Chart & Tactile Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left 2 Columns: Visual Subject Capsule Chart & Activity Feed */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          
          {/* Card A: Two-Tone Capsule Bar Chart (Reference Screen 6 Inspiration) */}
          <div className="bg-white rounded-[2.25rem] border border-slate-100 p-5 sm:p-8 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">
                  Subject Performance & Benchmark
                </h3>
                <p className="text-slate-400 font-bold text-xs mt-0.5">
                  Visual mastery comparison against DepEd 75% Passing Standard
                </p>
              </div>

              {activeSubjectTab && (
                <button
                  onClick={() => setActiveSubjectTab(null)}
                  className="self-start sm:self-auto text-xs font-black text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-xl border border-purple-200 transition-all"
                >
                  Filter: {activeSubjectTab} (Clear ✕)
                </button>
              )}
            </div>

            {/* The Creative Two-Tone Capsule Columns */}
            <div className="relative pt-8 pb-4">
              {/* Benchmark Reference Line across the chart */}
              <div 
                className="absolute left-0 right-0 border-t-2 border-dashed border-purple-400/60 z-10 pointer-events-none flex items-center justify-end"
                style={{ bottom: '38%' }}
              >
                <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full -translate-y-1/2 mr-2 border border-purple-300/80 shadow-xs">
                  75% Passing Benchmark
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 relative z-0">
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
                          ? 'bg-purple-50/90 border-2 border-purple-500 shadow-md scale-[1.02]' 
                          : 'bg-slate-50/60 hover:bg-slate-100/80 border border-slate-100'
                      }`}
                    >
                      {/* Subject Icon & Title */}
                      <span className="text-2xl mb-1">{colorClasses.icon}</span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 line-clamp-1">
                        {subject.subject}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-bold mb-4">{subject.quizzes} activities</p>

                      {/* The Tall Rounded Two-Tone Capsule Bar */}
                      <div className="w-10 sm:w-12 h-36 bg-slate-200/70 rounded-full p-1 flex flex-col justify-end overflow-hidden relative shadow-inner">
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
                          <div className="w-full h-2 rounded-full bg-white/40" />
                          <span className="text-[10px] sm:text-xs font-black text-white text-center drop-shadow-xs">
                            {subject.average}%
                          </span>
                        </div>
                      </div>

                      {/* Status Tag Below */}
                      <span className={`mt-3 text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        isMastered 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : isPassing 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isMastered ? 'Mastered' : isPassing ? 'Proficient' : 'Needs Boost'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card B: Tactile Assessment Activity Feed (No Clunky Horizontal Scroll Tables!) */}
          <div className="bg-white rounded-[2.25rem] border border-slate-100 p-5 sm:p-8 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">
                  Assessment Activity Feed
                </h3>
                <p className="text-slate-400 font-bold text-xs mt-0.5">
                  Chronological record of evaluated quiz and practice sessions
                </p>
              </div>

              {/* Feed Filters */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 sm:flex-none">
                  <select 
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="appearance-none w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer min-w-[120px]"
                  >
                    <option value="all">All Subjects</option>
                    {allowedSubjectLabels.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative flex-1 sm:flex-none">
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="appearance-none w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer min-w-[100px]"
                  >
                    <option value="all">All Types</option>
                    <option value="quiz">Quiz</option>
                    <option value="practice">Practice</option>
                  </select>
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Feed Cards (Gracefully Collapsing on Mobile without Horizontal Overflow) */}
            <div className="mt-4 space-y-3">
              {filteredQuizzes.length > 0 ? (
                filteredQuizzes.map((quiz) => (
                  <div 
                    key={quiz.id}
                    className="bg-slate-50/70 hover:bg-purple-50/50 border border-slate-200/70 hover:border-purple-200 rounded-2xl p-4 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Left: Avatar Icon + Title + Metadata */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-purple-600 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {quiz.type === 'practice' ? <Zap className="w-5 h-5 text-emerald-600" /> : <Award className="w-5 h-5 text-purple-600" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 tracking-tight truncate">
                          {quiz.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-bold text-slate-500">{quiz.subject}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] font-bold text-slate-400">{quiz.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Type Badge + Score Pill */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        quiz.type === 'practice' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70' 
                          : 'bg-purple-50 text-purple-800 border-purple-200/70'
                      }`}>
                        {quiz.type === 'practice' ? 'Practice' : 'Quiz'}
                      </span>

                      <span className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border shadow-xs ${
                        quiz.score >= 80 
                          ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300' 
                          : quiz.score >= 60 
                            ? 'bg-amber-100/90 text-amber-900 border-amber-300' 
                            : 'bg-rose-100/90 text-rose-900 border-rose-300'
                      }`}>
                        {quiz.score}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <h4 className="text-slate-800 font-black text-sm">No assessments match filters</h4>
                  <p className="text-slate-400 font-bold text-xs mt-1">Try switching filters or start a new practice session</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Leaderboard Pods & Momentum Action */}
        <div className="space-y-6 lg:space-y-8 flex flex-col">
          
          {/* Card C: Subject Mastery Leaderboard (Reference Screen 3 Inspiration) */}
          <div className="bg-white rounded-[2.25rem] border border-slate-100 p-5 sm:p-7 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display font-black text-slate-900">
                  Subject Ranking
                </h3>
                <p className="text-slate-400 font-bold text-xs">Top performing subjects</p>
              </div>
              <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                Ranked
              </span>
            </div>

            {/* Ranked Pods */}
            <div className="space-y-3">
              {rankedSubjects.map((subject, rankIdx) => {
                const isFirst = rankIdx === 0;
                const isLast = rankIdx === rankedSubjects.length - 1 && rankedSubjects.length > 1;

                return (
                  <div 
                    key={rankIdx}
                    className={`rounded-2xl p-4 border transition-all duration-200 flex items-center justify-between gap-3 ${
                      isFirst 
                        ? 'bg-gradient-to-r from-emerald-50/80 to-white border-emerald-200/80 shadow-xs' 
                        : isLast 
                          ? 'bg-gradient-to-r from-orange-50/80 to-white border-orange-200/80' 
                          : 'bg-slate-50/60 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isFirst ? 'bg-emerald-500 text-white' : isLast ? 'bg-orange-500 text-white' : 'bg-purple-600 text-white'
                      }`}>
                        #{rankIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {subject.subject}
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400">{subject.quizzes} activities</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 block">{subject.average}%</span>
                      <button
                        onClick={() => handleStartPractice(subject.subject)}
                        className="text-[10px] font-black text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-0.5 justify-end mt-0.5"
                      >
                        Practice <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card D: Playful Learning Momentum Card (Reference Screen 1 & 5 Inspiration) */}
          <div className="relative bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#4F46E5] rounded-[2.25rem] p-6 sm:p-8 shadow-[0_14px_35px_-10px_rgba(124,58,237,0.45)] text-white overflow-hidden group">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/15 rounded-full blur-3xl -mt-10 -mr-10 group-hover:bg-white/25 transition-all duration-700 ease-in-out" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/30 rounded-full blur-2xl -mb-10 -ml-10" />

            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/30 shadow-xs group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-black tracking-tight mb-2 leading-tight">
                Empower Your Mathematical Mastery!
              </h3>
              <p className="text-white/85 text-xs sm:text-[13px] font-medium leading-relaxed mb-6">
                Reinforce your identified focus areas with adaptive practice modules aligned with DepEd Strengthened Senior High School competencies.
              </p>
              <Button
                onClick={() => handleStartPractice()}
                className="w-full bg-white text-purple-800 hover:bg-slate-50 border-0 font-black h-12 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                Launch Practice Center
                <ArrowUpRight className="w-4 h-4" />
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
