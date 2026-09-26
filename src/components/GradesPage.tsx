import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
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
  Check,
  Maximize2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToGradeSummary, subscribeToAssessments, type GradeSummary, type AssessmentRecord } from '../services/gradesService';
import { type StudentProfile, type UserProgress } from '../types/models';
import { subscribeToUserProgress } from '../services/progressService';
import { SHS_MATH_SUBJECTS, getActiveSubjectIdsForGrade, subjects } from '../data/subjects';
import { useCurriculum } from '../hooks/useCurriculum';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { recordGet } from '../utils/memberOf';
import {
  JevBloomBadge,
  JevConfidenceBadge,
  isFiniteNumber,
  isBloomLevel,
  type BloomLevel,
} from './CompetencyRadarChart';

const DiagnosticBreakdown = lazy(() => import('./assessment/DiagnosticBreakdown'));

/** JEV weakness metrics attached to a topic when persisted data exists. */
interface WeaknessMetrics {
  bloomLevel?: BloomLevel;
  pCorrect?: number;
  priority?: string;
}

interface DiagnosticSummary {
  score: number;
  riskLevel: string;
  weaknesses: string[];
  recommendation: string;
  /** Topic name → persisted JEV fields (bloomLevel/pCorrect for the flagged weakness, priority from cached analysis). */
  weaknessMetrics: Record<string, WeaknessMetrics>;
}

interface ExamMilestone {
  title: string;
  subject: string;
  status: 'completed' | 'in-progress' | 'ready';
  statusLabel: string;
}

type ExportFormat = 'csv' | 'pdf';

// Creative Radial Score Ring with smooth SVG gradient
const RadialScoreRing: React.FC<{ 
  value: number; 
  size?: number; 
  strokeWidth?: number; 
  colorClass?: string;
  trackClass?: string;
  textColorClass?: string;
  fontSizeClass?: string;
}> = ({
  value,
  size = 64,
  strokeWidth = 5,
  colorClass = 'text-[#7C3AED]',
  trackClass = 'text-slate-100 dark:text-slate-800',
  textColorClass = 'text-slate-900 dark:text-white',
  fontSizeClass
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const textClass = fontSizeClass || (size < 46 ? 'text-[10px]' : size < 58 ? 'text-[12px]' : 'text-[14px]');

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
        <span className={`${textClass} font-black tabular-nums leading-none ${textColorClass}`}>
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
  const [showFullGraphModal, setShowFullGraphModal] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);

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
        const weaknessMetrics: Record<string, WeaknessMetrics> = {};

        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));

        const summarySnap = await getDoc(doc(db, 'users', currentUser.uid, 'dashboardSummary', 'heroBannerModal'));
        if (summarySnap.exists()) {
          const bannerData = summarySnap.data();
          if (bannerData.status === 'ready') {
            score = bannerData.latestScorePercent || 0;
            riskLevel = bannerData.latestRiskLevel || 'Unknown';
            weaknesses = bannerData.weaknesses || [];
            recommendation = bannerData.recommendation || '';
          }
        } else if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.initialAssessmentCompleted || userData.hasCompletedInitialAssessment) {
            riskLevel = (userData.atRiskSubjects?.length > 0) ? 'Moderate' : 'Low';
            weaknesses = userData.atRiskSubjects || [];
          }
        }

        // Persisted JEV mastery fields live on the user doc (mirrored from competencyProfiles)
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const primaryTopic = weaknesses[0];
          if (primaryTopic) {
            if (isBloomLevel(userData.bloomLevel)) {
              weaknessMetrics[primaryTopic] = { ...weaknessMetrics[primaryTopic], bloomLevel: userData.bloomLevel };
            }
            if (isFiniteNumber(userData.pCorrect)) {
              weaknessMetrics[primaryTopic] = {
                ...weaknessMetrics[primaryTopic],
                pCorrect: Math.max(0, Math.min(1, userData.pCorrect)),
              };
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
            weakAreas.forEach((w: { domain?: string; priority?: string }) => {
              if (w.domain && w.priority) {
                weaknessMetrics[w.domain] = { ...weaknessMetrics[w.domain], priority: String(w.priority) };
              }
            });
          }
        }

        if (score > 0 || riskLevel !== 'Unknown' || weaknesses.length > 0) {
          setDiagnosticSummary({ 
            score, 
            riskLevel, 
            weaknesses, 
            weaknessMetrics,
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

  const handleExportReport = async (format: ExportFormat): Promise<void> => {
    if (isExporting) return;
    setIsExporting(true);

    try {
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
      const safeStudentName = studentName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'student';
      const subjectRows = displaySubjectPerformance.map((subject) => ({
        subject: subject.subject,
        average: subject.average,
      }));
      const quizRows = filteredQuizzes.map((quiz) => ({
        title: quiz.title,
        subject: quiz.subject,
        score: quiz.score,
        date: quiz.date,
        type: quiz.type,
        status: quiz.status,
      }));

      reportRows.push('Grade Report');
      reportRows.push(`Student,${escapeCsvValue(studentName)}`);
      reportRows.push(`Export Date,${escapeCsvValue(exportDate)}`);
      reportRows.push(`Subject Filter,${escapeCsvValue(filterSubject)}`);
      reportRows.push(`Type Filter,${escapeCsvValue(filterType)}`);
      reportRows.push('');

      reportRows.push('Subject Performance');
      reportRows.push('Subject,Average Score');
      subjectRows.forEach((subject) => {
        reportRows.push([
          escapeCsvValue(subject.subject),
          escapeCsvValue(subject.average)
        ].join(','));
      });

      reportRows.push('');
      reportRows.push('Recent Quizzes');
      reportRows.push('Title,Subject,Score,Date,Type,Status');

      if (quizRows.length === 0) {
        reportRows.push('No quiz data available for the selected filters');
      } else {
        quizRows.forEach((quiz) => {
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

      const downloadReport = (blob: Blob, extension: ExportFormat): void => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `grade-report-${safeStudentName}-${exportDate}.${extension}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      };

      if (format === 'pdf') {
        const { createGradesPdf } = await import('@/utils/pdfExport');
        const pdfBlob = await createGradesPdf({
          studentName,
          exportDate,
          subjectFilter: filterSubject,
          typeFilter: filterType,
          subjectRows,
          quizRows,
        });
        downloadReport(pdfBlob, 'pdf');
        return;
      }

      const csvContent = reportRows.join('\n');
      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadReport(csvBlob, 'csv');
    } catch {
      toast.error('Failed to download grade report. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
    <div className="px-3.5 sm:px-6 lg:px-8 pt-0 sm:pt-0.5 pb-28 sm:pb-12 space-y-4 sm:space-y-5 max-w-[1540px] mx-auto">
      
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

        <ToggleGroup
          type="single"
          value={exportFormat}
          onValueChange={(value) => {
            if (value === 'csv' || value === 'pdf') {
              setExportFormat(value);
            }
          }}
          variant="outline"
          size="sm"
          aria-label="Export format"
          className="shrink-0"
        >
          <ToggleGroupItem value="csv" aria-label="CSV">CSV</ToggleGroupItem>
          <ToggleGroupItem value="pdf" aria-label="PDF">PDF</ToggleGroupItem>
        </ToggleGroup>

        <Button
          disabled={isExporting}
          className="flex-1 md:flex-none bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-black rounded-xl h-9.5 px-4 shadow-[0_6px_16px_-4px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
          onClick={() => {
            void handleExportReport(exportFormat);
          }}
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Exporting…' : 'Export Report'}
        </Button>
      </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. TOP KPI METRIC TILES (Responsive: 3 Compact Tiles in 1 Row)     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-3 gap-2 xs:gap-2.5 sm:gap-4 md:gap-5 items-stretch pt-1 sm:pt-2">
        
        {/* CARD 1: General Average (System Amethyst #9956DE & Slate Blue #7274ED) */}
        <div 
          onClick={() => setShowFullGraphModal(true)}
          className="relative rounded-2xl sm:rounded-3xl p-2.5 xs:p-3 sm:p-5 bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED] shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.48)] hover:-translate-y-1 sm:hover:-translate-y-1.5 border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out overflow-hidden flex flex-col justify-between flex-1 text-white min-h-[145px] xs:min-h-[155px] sm:min-h-[185px] group cursor-pointer"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -bottom-6 -right-6 w-28 sm:w-40 h-28 sm:h-40 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 group-hover:bg-white/15 transition-all duration-500 ease-out" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* CARD HEADER */}
          <div className="relative z-10 flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-1 sm:mb-2">
            <div className="flex items-center gap-1 sm:gap-1.5 text-white/95">
              <Award className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="text-[9.5px] xs:text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
                Average
              </span>
            </div>
            <span className="self-start xs:self-auto px-1.5 xs:px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[8px] xs:text-[9px] sm:text-[10.5px] font-bold uppercase tracking-wider border border-white/25 shadow-2xs whitespace-nowrap">
              {averageScore >= 75 ? 'Passing' : averageScore > 0 ? 'Needs Boost' : 'Pending'}
            </span>
          </div>

          {/* CARD BODY */}
          <div className="relative z-10 my-auto py-1 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-3">
            {/* Desktop / Tablet Left Column */}
            <div className="hidden sm:block min-w-0 flex-1">
              <div className="text-2xl md:text-3xl font-display font-black text-white tracking-tight leading-none mb-1 drop-shadow-xs">
                {generalAverage}{averageScore > 0 ? '%' : ''}
              </div>
              <p className="text-white/90 text-xs font-medium leading-snug drop-shadow-xs">
                {averageScore >= 75 ? 'Above 75% passing mark' : averageScore > 0 ? 'Aim for 75% passing mark' : 'Complete quizzes to calculate'}
              </p>
            </div>

            {/* Circular Ring (Mobile + Desktop) */}
            <div className="flex flex-col items-center shrink-0">
              <div className="block sm:hidden">
                <RadialScoreRing 
                  value={averageScore} 
                  size={46} 
                  strokeWidth={4.5} 
                  colorClass="text-white" 
                  trackClass="text-white/20" 
                  textColorClass="text-white font-black"
                  fontSizeClass="text-[11.5px]"
                />
              </div>
              <div className="hidden sm:block">
                <RadialScoreRing 
                  value={averageScore} 
                  size={54} 
                  strokeWidth={5} 
                  colorClass="text-white" 
                  trackClass="text-white/20" 
                  textColorClass="text-white font-black"
                  fontSizeClass="text-[13px]"
                />
              </div>
            </div>

            {/* Mobile Descriptive Context */}
            <div className="block sm:hidden text-center w-full mt-0.5">
              <p className="text-white/90 text-[9.5px] xs:text-[10px] font-semibold leading-tight line-clamp-1">
                {averageScore >= 75 ? 'Above 75% target' : averageScore > 0 ? 'Aim for 75% target' : 'No quiz data yet'}
              </p>
            </div>
          </div>

          {/* CARD FOOTER */}
          <div className="relative z-10 pt-1.5 sm:pt-2 border-t border-white/20 flex items-center justify-center sm:justify-between text-[8px] xs:text-[9px] sm:text-xs gap-1">
            <span className="text-white/80 font-bold hidden sm:inline">Passing Mark: 75%</span>
            <span className="inline-flex items-center px-1.5 xs:px-2 py-0.5 rounded-md sm:rounded-lg bg-white/20 backdrop-blur-md text-white font-black border border-white/25 whitespace-nowrap text-[8px] xs:text-[9px] sm:text-[10.5px]">
              {averageScore >= 75 ? `+${averageScore - 75}% pass` : averageScore > 0 ? `-${75 - averageScore}% to target` : '0%'}
            </span>
          </div>
        </div>

        {/* CARD 2: Focus Topic (System Texas Rose #FFB356 / Amber) */}
        <div 
          onClick={() => handleStartPractice(diagnosticSummary?.weaknesses?.[0])}
          className="relative rounded-2xl sm:rounded-3xl p-2.5 xs:p-3 sm:p-5 bg-gradient-to-br from-[#FFB356] via-[#F29424] to-[#D97706] shadow-[0_8px_24px_-6px_rgba(242,148,36,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(242,148,36,0.48)] hover:-translate-y-1 sm:hover:-translate-y-1.5 border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out overflow-hidden flex flex-col justify-between flex-1 text-white min-h-[145px] xs:min-h-[155px] sm:min-h-[185px] group cursor-pointer"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -bottom-6 -right-6 w-28 sm:w-40 h-28 sm:h-40 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 group-hover:bg-white/15 transition-all duration-500 ease-out" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* CARD HEADER */}
          <div className="relative z-10 flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-1 sm:mb-2">
            <div className="flex items-center gap-1 sm:gap-1.5 text-white/95">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="text-[9.5px] xs:text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
                Focus
              </span>
            </div>
            <span className="self-start xs:self-auto px-1.5 xs:px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[8px] xs:text-[9px] sm:text-[10.5px] font-bold uppercase tracking-wider border border-white/25 shadow-2xs whitespace-nowrap">
              Priority
            </span>
          </div>

          {/* CARD BODY */}
          <div className="relative z-10 my-auto py-1 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-3">
            {/* Desktop / Tablet Left Column */}
            <div className="hidden sm:block min-w-0 flex-1">
              <h3 
                className="text-base md:text-lg font-display font-black text-white leading-tight mb-1 line-clamp-2 drop-shadow-xs"
                title={diagnosticSummary?.weaknesses?.[0] || 'Finite Mathematics'}
              >
                {diagnosticSummary?.weaknesses?.[0] || 'Finite Mathematics'}
              </h3>
              <p className="text-white/90 text-xs font-medium leading-snug drop-shadow-xs">
                Practice topic to boost score
              </p>
            </div>

            {/* Mobile Topic Title */}
            <div className="block sm:hidden text-center w-full">
              <span 
                className="text-[10px] xs:text-[11px] font-black text-white leading-tight line-clamp-1 block mb-0.5"
                title={diagnosticSummary?.weaknesses?.[0] || 'Finite Math'}
              >
                {diagnosticSummary?.weaknesses?.[0] || 'Finite Math'}
              </span>
            </div>

            {/* Circular Ring (Mobile + Desktop) */}
            <div className="flex flex-col items-center shrink-0">
              <div className="block sm:hidden">
                <RadialScoreRing 
                  value={proficiencyRate} 
                  size={46} 
                  strokeWidth={4.5} 
                  colorClass="text-white" 
                  trackClass="text-white/20" 
                  textColorClass="text-white font-black"
                  fontSizeClass="text-[11.5px]"
                />
              </div>
              <div className="hidden sm:block">
                <RadialScoreRing 
                  value={proficiencyRate} 
                  size={54} 
                  strokeWidth={5} 
                  colorClass="text-white" 
                  trackClass="text-white/20" 
                  textColorClass="text-white font-black"
                  fontSizeClass="text-[13px]"
                />
              </div>
            </div>

            {/* Mobile Descriptive Context */}
            <div className="block sm:hidden text-center w-full mt-0.5">
              <p className="text-white/90 text-[9.5px] xs:text-[10px] font-semibold leading-tight line-clamp-1">
                Practice to boost
              </p>
            </div>
          </div>

          {/* CARD FOOTER */}
          <div className="relative z-10 pt-1.5 sm:pt-2 border-t border-white/20 flex items-center justify-center sm:justify-between text-[8px] xs:text-[9px] sm:text-xs gap-1">
            <span className="text-white/80 font-bold hidden sm:inline">Recommended Drill</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartPractice(diagnosticSummary?.weaknesses?.[0]);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 text-[8.5px] xs:text-[9.5px] sm:text-xs font-black text-[#D97706] bg-white hover:bg-slate-50 px-2 sm:px-3 py-1 rounded-lg shadow-xs hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Practice</span>
              <ArrowUpRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </div>

        {/* CARD 3: Quiz Record (System Pastel Green #75D06A) */}
        <div 
          onClick={() => {
            const el = document.getElementById('recent-quizzes-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="relative rounded-2xl sm:rounded-3xl p-2.5 xs:p-3 sm:p-5 bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C] shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.48)] hover:-translate-y-1 sm:hover:-translate-y-1.5 border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out overflow-hidden flex flex-col justify-between flex-1 text-white min-h-[145px] xs:min-h-[155px] sm:min-h-[185px] group cursor-pointer"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -bottom-6 -right-6 w-28 sm:w-40 h-28 sm:h-40 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 group-hover:bg-white/15 transition-all duration-500 ease-out" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* CARD HEADER */}
          <div className="relative z-10 flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-1 sm:mb-2">
            <div className="flex items-center gap-1 sm:gap-1.5 text-white/95">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="text-[9.5px] xs:text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
                Quizzes
              </span>
            </div>
            <span className="self-start xs:self-auto px-1.5 xs:px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[8px] xs:text-[9px] sm:text-[10.5px] font-bold uppercase tracking-wider border border-white/25 shadow-2xs whitespace-nowrap">
              Active
            </span>
          </div>

          {/* CARD BODY */}
          <div className="relative z-10 my-auto py-1 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-3">
            {/* Desktop / Tablet Left Column */}
            <div className="hidden sm:block min-w-0 flex-1">
              <div className="text-2xl md:text-3xl font-display font-black text-white tracking-tight leading-none mb-1 drop-shadow-xs">
                {totalQuizzes}
              </div>
              <p className="text-white/90 text-xs font-medium leading-snug drop-shadow-xs">
                {recentQuizzes.length} drills completed
              </p>
            </div>

            {/* Circular Ring (Mobile + Desktop) */}
            <div className="flex flex-col items-center shrink-0">
              <div className="block sm:hidden">
                <RadialScoreRing 
                  value={proficiencyRate} 
                  size={46} 
                  strokeWidth={4.5} 
                  colorClass="text-white" 
                  trackClass="text-white/20" 
                  textColorClass="text-white font-black"
                  fontSizeClass="text-[11.5px]"
                />
              </div>
              <div className="hidden sm:block">
                <RadialScoreRing 
                  value={proficiencyRate} 
                  size={54} 
                  strokeWidth={5} 
                  colorClass="text-white" 
                  trackClass="text-white/20" 
                  textColorClass="text-white font-black"
                  fontSizeClass="text-[13px]"
                />
              </div>
            </div>

            {/* Mobile Descriptive Context */}
            <div className="block sm:hidden text-center w-full mt-0.5">
              <p className="text-white/90 text-[9.5px] xs:text-[10px] font-semibold leading-tight line-clamp-1">
                {recentQuizzes.length} completed
              </p>
            </div>
          </div>

          {/* CARD FOOTER */}
          <div className="relative z-10 pt-1.5 sm:pt-2 border-t border-white/20 flex items-center justify-center sm:justify-between text-[8px] xs:text-[9px] sm:text-xs gap-1">
            <span className="text-white/80 font-bold hidden sm:inline">Accuracy</span>
            <span className="inline-flex items-center px-1.5 xs:px-2 py-0.5 rounded-md sm:rounded-lg bg-white/20 backdrop-blur-md text-white font-black border border-white/25 whitespace-nowrap text-[8px] xs:text-[9px] sm:text-[10.5px]">
              {proficiencyRate}% pass
            </span>
          </div>
        </div>

      </div>

      {/* 3. AI Diagnostic Results Banner */}
      {diagnosticSummary && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#FAF8FF] via-white to-[#F3EFFF] dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 border-2 border-purple-200/90 dark:border-purple-800/60 rounded-[2.25rem] p-4 sm:p-7 shadow-[0_8px_25px_-10px_rgba(124,58,237,0.06)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-200/25 dark:bg-purple-600/10 rounded-full blur-3xl -mt-24 -mr-24 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] flex items-center justify-center text-white shadow-md shadow-purple-500/25 shrink-0">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    Initial Diagnostic Results
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap shrink-0">
                    <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" /> AI Checked
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs mt-0.5">
                  See your starting math strengths and where your AI tutor recommends focusing next
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-xs whitespace-nowrap shrink-0 ${
                diagnosticSummary.riskLevel === 'Low' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                  : diagnosticSummary.riskLevel === 'High' || diagnosticSummary.riskLevel === 'At Risk' 
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {diagnosticSummary.riskLevel === 'Low' ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertCircle size={13} className="shrink-0" />}
                <span>{diagnosticSummary.riskLevel} Risk</span>
              </span>

              <button
                type="button"
                onClick={() => setShowBreakdownModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3.5 sm:px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-500/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>View Full Analysis</span>
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white">{diagnosticSummary.score}%</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap shrink-0 ${
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
                    <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Topics to Practice
                  </p>
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                    {diagnosticSummary.weaknesses.length} {diagnosticSummary.weaknesses.length === 1 ? 'topic' : 'topics'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-1.5 gap-y-2 mt-1">
                  {diagnosticSummary.weaknesses.slice(0, 3).map((weakness, i) => {
                    const metrics = recordGet(diagnosticSummary.weaknessMetrics, weakness);
                    const hasJevFields = metrics?.bloomLevel !== undefined || metrics?.pCorrect !== undefined;
                    return (
                      <div key={i} className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartPractice(weakness)}
                          title={
                            metrics?.priority
                              ? `Practice ${weakness} — ${metrics.priority} priority`
                              : `Practice ${weakness}`
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="whitespace-nowrap">{weakness}</span>
                          <ArrowUpRight className="w-3 h-3 text-amber-600 shrink-0 opacity-70 group-hover:opacity-100" />
                        </button>
                        {hasJevFields && (
                          <div className="inline-flex items-center gap-1">
                            <JevBloomBadge bloomLevel={metrics?.bloomLevel} size="xs" />
                            <JevConfidenceBadge pCorrect={metrics?.pCorrect} size="xs" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {diagnosticSummary.weaknesses.length === 0 && (
                    <p className="text-xs font-medium text-slate-400 italic">All foundational topics look solid!</p>
                  )}
                </div>
              </div>
              {diagnosticSummary.weaknesses.length > 0 && (
                <p className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 mt-2">
                  💡 Tap any topic to start practice questions
                  {!diagnosticSummary.weaknesses.some((w) => recordGet(diagnosticSummary.weaknessMetrics, w)?.bloomLevel !== undefined)
                    && ' — badges appear once a Jev mastery check is available'}
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
                  <span className="text-[11px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse shrink-0" /> AI Study Advice
                  </span>
                  <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 shadow-2xs whitespace-nowrap shrink-0">
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
                  className="w-full py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-black text-xs shadow-md shadow-purple-500/25 flex items-center justify-center gap-1.5 transition-all group-hover:scale-[1.01] active:scale-[0.99] cursor-pointer whitespace-nowrap"
                >
                  <span>Open Full AI Study Plan</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. TWO-COLUMN ROW: LEFT = SUBJECT GRADES | RIGHT = SUBJECT STANDINGS */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
        
        {/* Left Column: Subject Grades & Passing Line with Modal Trigger */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    Subject Grades & Passing Line
                  </h3>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 hidden sm:inline-block whitespace-nowrap shrink-0">
                    Interactive
                  </span>
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-0.5">
                  Compare your subject averages against the DepEd 75% passing mark
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                {activeSubjectTab && (
                  <button
                    type="button"
                    onClick={() => setActiveSubjectTab(null)}
                    className="text-xs font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    Clear Filter (✕)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFullGraphModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-2xs hover:shadow-xs whitespace-nowrap"
                  title="Open Full Graph Modal"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Graph</span>
                </button>
              </div>
            </div>

            {/* Two-Tone Capsule Columns */}
            <div className="relative pt-6 pb-2">
              {/* Benchmark Reference Line across the chart */}
              <div 
                className="absolute left-0 right-0 border-t-2 border-dashed border-purple-400/60 z-10 pointer-events-none flex items-center justify-end"
                style={{ bottom: '38%' }}
              >
                <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full -translate-y-1/2 mr-2 border border-purple-300/80 dark:border-purple-800 shadow-xs whitespace-nowrap shrink-0">
                  75% Passing Mark (DepEd)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 relative z-0">
                {displaySubjectPerformance.map((subject, idx) => {
                  const colorClasses = recordGet(colorClassBySubject, subject.color) || colorClassBySubject.slate;
                  const isPassing = subject.average >= 75;
                  const isMastered = subject.average >= 85;
                  const isSelected = activeSubjectTab === subject.subject;

                  return (
                    <div 
                      key={idx}
                      onClick={() => setActiveSubjectTab(isSelected ? null : subject.subject)}
                      className={`cursor-pointer rounded-2xl p-3 sm:p-4 transition-all duration-300 flex flex-col items-center text-center ${
                        isSelected 
                          ? 'bg-purple-50/90 dark:bg-purple-950/40 border-2 border-purple-500 shadow-md scale-[1.02]' 
                          : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      {/* Subject Icon & Title */}
                      <span className="text-xl sm:text-2xl mb-1">{colorClasses.icon}</span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 line-clamp-1">
                        {subject.subject}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-bold mb-3">{subject.quizzes} activities</p>

                      {/* The Tall Rounded Two-Tone Capsule Bar */}
                      <div className="w-9 sm:w-11 h-28 sm:h-32 bg-slate-200/70 dark:bg-slate-800 rounded-full p-1 flex flex-col justify-end overflow-hidden relative shadow-inner">
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
                      <span className={`mt-2.5 text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
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

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>👆 Tap subject bar to filter records</span>
            <button 
              type="button" 
              onClick={() => setShowFullGraphModal(true)} 
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
            >
              Expand view ↗
            </button>
          </div>
        </div>

        {/* Right Column: Subject Standings */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white">
                  Subject Standings
                </h3>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-0.5">Ranked by your highest average</p>
              </div>
              <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 whitespace-nowrap shrink-0">
                Ranked
              </span>
            </div>

            {/* Ranked Pods - Bounded Scrollable Container */}
            <div className="space-y-2.5 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
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
                        className={`text-[11px] font-black hover:text-white border px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 justify-end mt-1 cursor-pointer shadow-2xs hover:shadow-xs whitespace-nowrap ${
                          isGenMath
                            ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 border-indigo-200 dark:border-indigo-800'
                            : 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-600 border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        Practice <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Standings update automatically per quiz</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">DepEd STEM Standards</span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. RECENT QUIZZES & PRACTICE (FULL WIDTH)                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)] w-full">
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
                className="appearance-none w-full pl-3 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer min-w-[120px]"
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
                className="appearance-none w-full pl-3 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer min-w-[105px]"
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
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
                      quiz.type === 'practice' 
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800' 
                        : isGenMath 
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800'
                          : 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200/70 dark:border-purple-800'
                    }`}>
                      {quiz.type === 'practice' ? 'Practice' : 'Quiz'}
                    </span>

                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border shadow-xs tabular-nums whitespace-nowrap ${
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
                      className={`px-2.5 py-1 rounded-xl border text-xs font-black transition-all flex items-center gap-1 shadow-2xs hover:shadow-xs cursor-pointer whitespace-nowrap ${
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

        {/* Pagination Controls */}
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

      {/* ------------------------------------------------------------------ */}
      {/* 6 & 7. EXAM READINESS & BOOST GRADES CTA (Side by Side on Desktop) */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch w-full">
        {/* Left: Exam Readiness & Milestones */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 sm:p-6 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.05)] w-full flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white leading-tight">
                    Exam Readiness
                  </h3>
                  <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-0.5">Senior High School Core Milestones</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border self-start sm:self-auto whitespace-nowrap shrink-0 ${
                examReadinessScore >= 75 
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800' 
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800'
              }`}>
                {examReadinessScore >= 75 ? 'On Track 🚀' : 'Prep Needed ⚡'}
              </span>
            </div>

            {/* Readiness Target Gauge Progress Bar */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-600 dark:text-slate-300">Quarter Exam Target Progress</span>
                <span className="font-black text-slate-900 dark:text-white tabular-nums text-sm">{examReadinessScore}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200/70 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-700" 
                  style={{ width: `${Math.min(100, Math.max(12, examReadinessScore))}%` }} 
                />
              </div>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2">
                Calculated from your passing accuracy and completed SHS math competency drills.
              </p>
            </div>

            {/* Milestones Header */}
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between px-1">
              <span>Core STEM Competencies</span>
              <span>Status</span>
            </div>

            {/* Milestones List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              {examMilestones.map((milestone, milestoneIdx) => {
                const isGenMath = milestone.subject.toLowerCase().includes('general');
                const isStats = milestone.subject.toLowerCase().includes('stat');

                return (
                  <button
                    key={milestoneIdx}
                    type="button"
                    onClick={() => handleStartPractice(milestone.subject)}
                    className="w-full text-left p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 bg-slate-50/50 dark:bg-slate-850 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all flex items-center justify-between gap-2.5 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        milestone.status === 'completed' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                          : isGenMath
                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                      }`}>
                        {milestone.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="text-[10px] font-black">{milestoneIdx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          {milestone.title}
                        </p>
                        <p className={`text-[10px] font-bold ${
                          isGenMath ? 'text-indigo-600 dark:text-indigo-400' : isStats ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'
                        }`}>
                          {isGenMath ? '📐 General Math' : isStats ? '🎲 Statistics & Prob' : milestone.subject}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 border whitespace-nowrap ${
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
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => handleStartPractice()}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-purple-700 dark:hover:bg-purple-100 text-white dark:text-slate-900 hover:text-white dark:hover:text-purple-900 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs mt-2"
          >
            <span>Practice Next Exam Milestone</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Ready to Boost Your Grades CTA */}
        <div className="relative bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#4F46E5] rounded-[2rem] p-6 sm:p-8 shadow-[0_12px_30px_-10px_rgba(124,58,237,0.45)] text-white overflow-hidden group w-full flex flex-col justify-between min-h-[320px]">
          {/* Ambient Blurs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/15 rounded-full blur-3xl -mt-16 -mr-16 group-hover:bg-white/25 transition-all duration-700 ease-in-out pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-purple-400/30 rounded-full blur-2xl -mb-16 -ml-16 pointer-events-none" />

          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3.5 backdrop-blur-md border border-white/30 shadow-xs group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-black tracking-tight mb-2 leading-tight">
              Ready to Boost Your Grades?
            </h3>
            <p className="text-white/85 text-xs sm:text-sm font-medium leading-relaxed mb-6">
              Practice personalized math drills tailored to your weak areas, unlock concept explanations, and accelerate your exam readiness.
            </p>
          </div>

          <div className="relative z-10 pt-2">
            <Button
              onClick={() => handleStartPractice()}
              className="w-full px-6 bg-white text-purple-800 hover:bg-slate-50 border-0 font-black h-11 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Start Math Practice ⚡</span>
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 8. POPUP MODALS                                                    */}
      {/* ------------------------------------------------------------------ */}

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

      {/* Full Subject Grades Graph Modal */}
      {showFullGraphModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setShowFullGraphModal(false)}
        >
          <div 
            className="relative bg-white dark:bg-slate-900 rounded-[2rem] border border-purple-200/80 dark:border-purple-800/80 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    Subject Grades & Benchmark Analysis
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Comprehensive senior high school STEM performance against DepEd passing benchmarks
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFullGraphModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Expanded High-Fidelity Chart */}
            <div className="p-5 sm:p-7 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 relative">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400">Quarter Subject Comparison</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Mastery (≥85%)
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Passing (≥75%)
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Needs Review (&lt;75%)
                  </span>
                </div>
              </div>

              {/* Expanded Chart Bars with 75% Passing Line */}
              <div className="relative pt-6 pb-2 min-h-[220px]">
                {/* 75% Reference Line */}
                <div 
                  className="absolute left-0 right-0 border-t-2 border-dashed border-purple-500/70 z-10 pointer-events-none flex items-center justify-end"
                  style={{ bottom: '40%' }}
                >
                  <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full -translate-y-1/2 mr-2 border border-purple-300/80 dark:border-purple-800 shadow-xs">
                    75% DepEd Passing Line
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 relative z-0">
                  {displaySubjectPerformance.map((subject, idx) => {
                    const isPassing = subject.average >= 75;
                    const isMastered = subject.average >= 85;
                    return (
                      <div key={idx} className="flex flex-col items-center text-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs">
                        <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 mb-1">{subject.subject}</h4>
                        <span className="text-[11px] text-slate-400 font-bold mb-3">{subject.quizzes} activities</span>

                        <div className="w-12 sm:w-16 h-40 bg-slate-100 dark:bg-slate-800 rounded-full p-1.5 flex flex-col justify-end overflow-hidden shadow-inner relative">
                          <div 
                            className={`w-full rounded-full transition-all duration-1000 flex flex-col justify-between p-1.5 ${
                              isMastered 
                                ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400' 
                                : isPassing 
                                  ? 'bg-gradient-to-t from-indigo-700 via-indigo-600 to-sky-400' 
                                  : 'bg-gradient-to-t from-orange-500 via-amber-500 to-yellow-400'
                            }`}
                            style={{ height: `${Math.max(subject.average, 15)}%` }}
                          >
                            <div className="w-full h-2 rounded-full bg-white/40" />
                            <span className="text-xs font-black text-white text-center drop-shadow-xs">
                              {subject.average}%
                            </span>
                          </div>
                        </div>

                        <span className={`mt-3 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          isMastered 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : isPassing 
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200' 
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {isMastered ? 'Mastered' : isPassing ? 'Passing' : 'Needs Work'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Subject Details & Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displaySubjectPerformance.map((subject, idx) => {
                const isPassing = subject.average >= 75;
                return (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{subject.subject}</h4>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">{subject.quizzes} activities recorded</p>
                      <span className={`inline-block mt-2 text-xs font-black ${isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {isPassing ? `+${subject.average - 75}% above passing` : `-${75 - subject.average}% to passing`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowFullGraphModal(false);
                        handleStartPractice(subject.subject);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      Practice <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* DepEd Reference Callout */}
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
              <Brain className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">
                <strong>DepEd SHS Assessment Standard:</strong> DepEd Order No. 8, s. 2015 establishes 75% as the minimum passing grade for Senior High School STEM subjects. Scores at or above 85% reflect mastery and honor-roll performance.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setShowFullGraphModal(false)}
                className="rounded-xl text-xs font-bold"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowFullGraphModal(false);
                  handleStartPractice();
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Start Math Practice ⚡
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default GradesPage;
