import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  Search,
  Target,
  TrendingUp,
  Layers,
  AlertTriangle,
  Filter,
  X,
  ExternalLink,
  Sparkles,
  RotateCcw,
  GraduationCap,
  BookUser,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type TeacherUploadedModule } from '../data/curriculumModules';
import { motion, AnimatePresence } from 'motion/react';
import ModuleFolderCard from './ModuleFolderCard';
import ModuleDetailView from './ModuleDetailView';
import PracticeCenter from './PracticeCenter';

import ModulesMascot from './ModulesMascot';
import QuizExperience from './QuizExperience';
import DailyCheckInModal from './DailyCheckInModal';
import { Quiz as QuizExperienceQuiz, QuizAnswerRecord } from './QuizExperience';
import { type Module } from '../data/subjects';
import { useAuth } from '../contexts/AuthContext';
import { type StudentProfile } from '../types/models';
import { useModuleDifficulty, filterModulesByDifficulty } from '../hooks/useModuleDifficulty';
import { toast } from 'sonner';
import { unlockAvatarItem } from '../services/gamificationService';
import { useDailyReward } from '../hooks/useDailyReward';
import { getDayOfWeek } from '../data/rewardCatalog';
import { notify } from '@/features/notifications';
import { type DiagnosticTopicKey, DIAGNOSTIC_TOPIC_LABELS, TOPIC_TO_MODULE_ID, normalizeDiagnosticTopic } from '../lib/diagnosticTopics';
import { cacheKeys } from '../utils/cacheKeys';
import {
  CURRICULUM_SUBJECT_META,
  type CurriculumModuleRuntime,
  type CurriculumQuarter,
  getCurriculumModulesForLearner,
  resolveLearnerGradeLevel,
} from '../data/curriculumModules';
import { getRagAnalysisContext } from '../services/apiService';
import { useSubjectAvailability } from '../hooks/useSubjectAvailability';
import { getStudentCompetencyProfile } from '../services/assessmentService';
import type { CompetencyProfileDoc } from '../types/assessment';
import { useCurriculum } from '../hooks/useCurriculum';
import { submitPracticeSession } from '../services/practiceService';

interface ModulesPageProps {
  onEarnXP?: (xp: number, message: string) => void;
  atRiskSubjects?: string[];
  priorityTopics?: DiagnosticTopicKey[];
  initialModuleId?: string | null;
  isInQuizMode?: boolean;
  setIsInQuizMode?: (value: boolean) => void;
  /** Whether the initial assessment has been completed — REVIEW badge suppressed until true */
  hasCompletedDiagnostic?: boolean;
}

type ModulesTab = 'modules' | 'recommended' | 'practice' | 'teacher_uploaded';

const QUARTER_FILTERS: Array<'all' | CurriculumQuarter> = ['all', 'Q1', 'Q2', 'Q3', 'Q4'];

const ModulesPage: React.FC<ModulesPageProps> = ({
  onEarnXP,
  atRiskSubjects = [],
  priorityTopics = [],
  initialModuleId = null,
  isInQuizMode = false,
  setIsInQuizMode,
  hasCompletedDiagnostic = false,
}) => {
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ModulesTab>('modules');

  const studentProfile = userProfile as StudentProfile | null;
  const studentGrade = studentProfile?.grade;
  const activeGradeLevel = resolveLearnerGradeLevel(studentGrade);

  // Load curriculum (logs source - Firestore vs static)
  const { isLoading: curriculumLoading } = useCurriculum(activeGradeLevel);

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState<'all' | CurriculumQuarter>('all');
  const [competencyFilter, setCompetencyFilter] = useState('all');
  const [isScrolled, setIsScrolled] = useState(false);
  const [sourcePreviewModule, setSourcePreviewModule] = useState<CurriculumModuleRuntime | null>(null);
  const [selectedTeacherModule, setSelectedTeacherModule] = useState<TeacherUploadedModule | null>(null);

  const assignedSubjects = useMemo(() => {
    const rawAssignments = (studentProfile as (StudentProfile & {
      learnerCurriculumAssignments?: { subjects?: string[] };
      assignedSubjects?: string[];
      curriculumAssignedSubjects?: string[];
    }) | null)?.learnerCurriculumAssignments?.subjects
      ?? (studentProfile as any)?.assignedSubjects
      ?? (studentProfile as any)?.curriculumAssignedSubjects
      ?? [];

    return Array.isArray(rawAssignments) ? rawAssignments : [];
  }, [studentProfile]);

  const { difficulty: moduleDifficulty } = useModuleDifficulty(currentUser?.uid || null);

  const curriculumRuntimeModules = useMemo(
    () => {
      const modules = getCurriculumModulesForLearner(activeGradeLevel, assignedSubjects);
      return filterModulesByDifficulty(modules, moduleDifficulty);
    },
    [activeGradeLevel, assignedSubjects, moduleDifficulty],
  );
  
  const initialModule = initialModuleId 
    ? curriculumRuntimeModules.find(m => m.id === initialModuleId) || null
    : null;

  const [selectedModule, setSelectedModule] = useState<CurriculumModuleRuntime | null>(initialModule);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizExperienceQuiz | null>(null);
  const practiceQuizEndRef = React.useRef<((quiz: QuizExperienceQuiz, answers: QuizAnswerRecord[]) => void) | null>(null);
  const [learningPathContext, setLearningPathContext] = useState<string | null>(null);
  const [learningPathLoading, setLearningPathLoading] = useState(false);

  // Competency profile state for personalized module filtering
  const [competencyProfile, setCompetencyProfile] = useState<CompetencyProfileDoc | null>(null);
  const [competencyProfileLoading, setCompetencyProfileLoading] = useState(false);

  // Teacher uploaded modules state
  const [teacherModules, setTeacherModules] = useState<TeacherUploadedModule[]>([]);
  const [teacherModulesLoading, setTeacherModulesLoading] = useState(false);

  // Fetch teacher-uploaded modules from Firestore
  useEffect(() => {
    if (activeTab !== 'teacher_uploaded') return;
    
    if (!db) return;
    
    setTeacherModulesLoading(true);
    const unsubscribe = onSnapshot(
      query(collection(db, 'modules'), where('moduleType', '==', 'teacher_uploaded')),
      (snapshot) => {
        const modules = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            moduleId: doc.id,
          } as TeacherUploadedModule;
        });
        setTeacherModules(modules);
        setTeacherModulesLoading(false);
      },
      (error) => {
        console.error('Error fetching teacher modules:', error);
        setTeacherModulesLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [activeTab]);


  // Daily Rewards (new weekly shuffle system)
  const [showDailyCheckIn, setShowDailyCheckIn] = useState(false);

  const {
    weekRewards,
    todayReward,
    canClaim,
    isClaiming,
    claimedDays,
    timeUntilReset,
    claim,
    lastClaimResult,
  } = useDailyReward(userProfile?.uid ?? null);

  // Show modal on mount if user can claim
  useEffect(() => {
    if (!userProfile?.uid) return;

    let cancelled = false;
    const loadState = async (forceShow?: boolean) => {
      if (cancelled) return;
      if (canClaim || forceShow) {
        setShowDailyCheckIn(true);
      }
    };

    const handleNotificationNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab === 'Modules') {
        loadState(true);
      }
    };

    // Small delay to let hook initialise
    const timer = setTimeout(() => loadState(), 500);
    window.addEventListener('mathpulse:navigate', handleNotificationNav);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('mathpulse:navigate', handleNotificationNav);
    };
  }, [userProfile?.uid, canClaim]);

  const handleClaimDailyReward = async () => {
    if (!userProfile?.uid) return;

    try {
      await claim();

      // Fire notification
      if (lastClaimResult?.success) {
        notify({
          userId: userProfile.uid,
          type: 'daily_checkin',
          title: 'Daily Reward Claimed!',
          message: `You earned ${lastClaimResult.reward.label} and kept your streak alive!`,
          metadata: { rewardId: lastClaimResult.reward.id, streakDay: lastClaimResult.dayIndex + 1 },
        }).catch(console.error);

        // Avatar unlock for epic rewards
        if (lastClaimResult.reward.rarity === 'epic') {
          unlockAvatarItem(userProfile.uid, 'acc_crown')
            .then(() => toast.success("👑 Epic reward unlocked!"))
            .catch(console.error);
        }
      }

      // Auto-close
      setTimeout(() => setShowDailyCheckIn(false), 1000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      console.error('Failed to claim daily reward:', error);
      if (msg.includes('Already claimed')) {
        toast.info('You already claimed your reward today!');
      } else {
        toast.error('Failed to claim daily reward. Please try again.');
      }
    }
  };

  // Handle navigation from initialModuleId when component is already mounted
  useEffect(() => {
    if (initialModuleId) {
      const foundMod = curriculumRuntimeModules.find(m => m.id === initialModuleId);
      if (foundMod) setSelectedModule(foundMod);
    }
  }, [initialModuleId, curriculumRuntimeModules]);

  // Load competency profile for personalized module filtering
  useEffect(() => {
    if (!userProfile?.uid) return;
    setCompetencyProfileLoading(true);
    getStudentCompetencyProfile(userProfile.uid)
      .then((profile) => {
        setCompetencyProfile(profile);
      })
      .catch((err) => {
        console.error('Failed to load competency profile:', err);
      })
      .finally(() => {
        setCompetencyProfileLoading(false);
      });
  }, [userProfile?.uid]);

  const normalizedRiskTopics = useMemo<DiagnosticTopicKey[]>(() => {
    const primary =
      priorityTopics.length > 0
        ? priorityTopics
        : atRiskSubjects
            .map((entry) => normalizeDiagnosticTopic(entry))
            .filter((entry): entry is DiagnosticTopicKey => entry !== null);

    const seen = new Set<DiagnosticTopicKey>();
    return primary.filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
  }, [priorityTopics, atRiskSubjects]);

  const { data: modulePool = [] } = useQuery({
    queryKey: cacheKeys.modules(activeGradeLevel, normalizedRiskTopics),
    enabled: true,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const base = curriculumRuntimeModules;
      if (normalizedRiskTopics.length === 0) return base;

      const ranking = new Map<string, number>(
        normalizedRiskTopics.map((topic, index) => [TOPIC_TO_MODULE_ID[topic], index]),
      );

      return [...base].sort((left, right) => {
        const leftRank = ranking.get(left.id) ?? Number.POSITIVE_INFINITY;
        const rightRank = ranking.get(right.id) ?? Number.POSITIVE_INFINITY;
        return leftRank - rightRank;
      });
    },
  });

  const availableCompetencyGroups = useMemo(() => {
    const groups = new Set<string>();
    modulePool.forEach((module) => groups.add(module.competency_group));
    return Array.from(groups);
  }, [modulePool]);

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = modulePool.filter((module) => {
      const titleMatch = !query || module.title.toLowerCase().includes(query);
      const descMatch = !query || module.description.toLowerCase().includes(query);
      const lessonMatch = !query || module.lessons.some((lesson) => lesson.title.toLowerCase().includes(query));
      const quizMatch = !query || module.quizzes.some((quiz) => quiz.title.toLowerCase().includes(query));
      const competencyMatch =
        !query
          ? true
          : module.competencies.some(
              (competency) =>
                competency.outcome.toLowerCase().includes(query) ||
                competency.code.toLowerCase().includes(query),
            );

      const subjectMatch = subjectFilter === 'all' || module.subjectId === subjectFilter;
      const quarterMatch = quarterFilter === 'all' || module.quarter === quarterFilter;
      const competencyGroupMatch = competencyFilter === 'all' || module.competency_group === competencyFilter;

      return (titleMatch || descMatch || lessonMatch || quizMatch || competencyMatch) && subjectMatch && quarterMatch && competencyGroupMatch;
    });

    // Sort by competency profile if available
    if (competencyProfile?.competencies) {
      const weaknesses = new Set(
        Object.entries(competencyProfile.competencies)
          .filter(([, score]: [string, { score: number }]) => score.score < 50)
          .map(([compId]) => compId)
      );
      const strengths = new Set(
        Object.entries(competencyProfile.competencies)
          .filter(([, score]: [string, { score: number }]) => score.score >= 80)
          .map(([compId]) => compId)
      );

      return filtered.sort((a, b) => {
        const aCompetencyIds = a.competencies.map(c => c.code);
        const bCompetencyIds = b.competencies.map(c => c.code);

        const aWeaknessMatch = aCompetencyIds.some(id => weaknesses.has(id)) ? 1 : 0;
        const bWeaknessMatch = bCompetencyIds.some(id => weaknesses.has(id)) ? 1 : 0;
        const aStrengthMatch = aCompetencyIds.some(id => strengths.has(id)) ? 1 : 0;
        const bStrengthMatch = bCompetencyIds.some(id => strengths.has(id)) ? 1 : 0;

        // Priority: weakness-targeted > strength (reinforcement) > general
        const aScore = aWeaknessMatch * 2 + aStrengthMatch;
        const bScore = bWeaknessMatch * 2 + bStrengthMatch;

        return bScore - aScore;
      });
    }

    return filtered;
  }, [modulePool, searchQuery, subjectFilter, quarterFilter, competencyFilter, competencyProfile]);

  const curriculumContextLabel = useMemo(() => {
    const visibleQuarter = quarterFilter === 'all' ? 'All Quarters' : quarterFilter;
    const visibleSubject =
      subjectFilter === 'all'
        ? 'All Subjects'
        : CURRICULUM_SUBJECT_META[subjectFilter as keyof typeof CURRICULUM_SUBJECT_META]?.label ?? 'Subject';
    return `${activeGradeLevel} · ${visibleSubject} · ${visibleQuarter}`;
  }, [activeGradeLevel, subjectFilter, quarterFilter]);

  const curriculumSubjects = useMemo(() => {
    const unique = new Set(modulePool.map((module) => module.subjectId));
    return Array.from(unique);
  }, [modulePool]);

  const clearFilters = () => {
    setSubjectFilter('all');
    setQuarterFilter('all');
    setCompetencyFilter('all');
    setSearchQuery('');
  };

  useEffect(() => {
    if (activeTab !== 'recommended' || normalizedRiskTopics.length === 0) return;
    setLearningPathLoading(true);

    getRagAnalysisContext({
      weakTopics: normalizedRiskTopics.map(t => DIAGNOSTIC_TOPIC_LABELS[t]),
      subject: subjectFilter !== 'all' ? subjectFilter : 'General Mathematics',
      userId: userProfile?.uid,
    })
      .then((res) => {
        setLearningPathContext(res.curriculumContext);
        setLearningPathLoading(false);
      })
      .catch(() => setLearningPathLoading(false));
  }, [activeTab, normalizedRiskTopics]);

  const handleQuizComplete = (score: number, xpEarned: number) => {
    if (onEarnXP) {
      onEarnXP(xpEarned, `Quiz Completed! +${xpEarned} XP`);
    }
    setSelectedQuiz(null);
  };

  // Sync quiz mode state with parent
  useEffect(() => {
    if (setIsInQuizMode) setIsInQuizMode(!!selectedQuiz);
  }, [selectedQuiz, setIsInQuizMode]);

  if (selectedQuiz) {
    return (
      <QuizExperience
        quiz={selectedQuiz}
        onClose={() => { practiceQuizEndRef.current = null; setSelectedQuiz(null); }}
        onComplete={handleQuizComplete}
        onQuizEnd={practiceQuizEndRef.current ?? undefined}
        studentId={userProfile?.uid}
      />
    );
  }

  if (selectedModule) {
    return (
      <ModuleDetailView
        module={selectedModule}
        onBack={() => setSelectedModule(null)}
        onEarnXP={onEarnXP}
        isInQuizMode={isInQuizMode}
        setIsInQuizMode={setIsInQuizMode}
      />
    );
  }

  if (selectedTeacherModule) {
    return (
      <div className="h-full overflow-y-auto px-4 sm:px-6 xl:px-10 pb-8 scrollbar-hide scroll-smooth relative">
        <button
          onClick={() => setSelectedTeacherModule(null)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowRight className="rotate-180" size={16} />
          Back to Modules
        </button>
        <div className="bg-white rounded-2xl border border-[#F08386]/30 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 rounded-md bg-[#F08386]/12 border border-[#F08386]/30 text-[#F08386] text-xs font-bold">
              Teacher Upload
            </span>
            {selectedTeacherModule.quarter && (
              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs">
                {selectedTeacherModule.quarter}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 mb-2">
            {selectedTeacherModule.title}
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            {selectedTeacherModule.subject} · {selectedTeacherModule.gradeLevel}
          </p>
          {selectedTeacherModule.summary && (
            <p className="text-slate-700 text-base leading-relaxed mb-6">
              {selectedTeacherModule.summary}
            </p>
          )}
          {selectedTeacherModule.learningObjectives?.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Learning Objectives</h2>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {selectedTeacherModule.learningObjectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          )}
          {selectedTeacherModule.sections?.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Sections</h2>
              <div className="space-y-3">
                {selectedTeacherModule.sections.map((section, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-slate-800 mb-1">{section.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedTeacherModule.practice?.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Practice Questions</h2>
              <div className="space-y-3">
                {selectedTeacherModule.practice.map((q, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-slate-800 mb-2">{q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      {q.options.map((opt, j) => (
                        <div key={j} className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                          {opt.label}. {opt.text}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-emerald-700 font-semibold">Answer: {q.answer}</p>
                    <p className="text-xs text-slate-500 mt-1">{q.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full overflow-y-auto px-4 sm:px-6 xl:px-10 pb-8 scrollbar-hide scroll-smooth relative"
      onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 100)}
    >
      <DailyCheckInModal
        isOpen={showDailyCheckIn}
        onClose={() => setShowDailyCheckIn(false)}
        onClaim={handleClaimDailyReward}
        weekRewards={weekRewards}
        todayReward={todayReward}
        canClaim={canClaim}
        isClaiming={isClaiming}
        claimedDays={claimedDays}
        currentDayIndex={getDayOfWeek()}
        timeUntilReset={timeUntilReset}
      />

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-4 md:py-6 gap-4 md:gap-6">
        <div className="flex-1 max-w-3xl">
          <h1 className="text-[28px] md:text-[44px] font-display font-black text-[#202124] tracking-tight leading-[1.1] mb-3 md:mb-4">
            Curriculum Modules
          </h1>
          <p className="text-[#3c4043] text-[13px] md:text-[17px] leading-relaxed md:leading-[1.7] md:pr-10">
            MathPulse AI loads modules directly from DepEd Strengthened SHS curriculum guides with AI-powered RAG lesson generation. Currently available: General Mathematics, Business Mathematics, and Statistics & Probability. Pre-Calculus and Basic Calculus modules are coming soon once teaching module PDFs are sourced.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-900">
              {curriculumContextLabel}
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-shrink-0 items-center justify-end w-[350px]">
          <ModulesMascot 
            assessmentDismissed={(userProfile as StudentProfile)?.assessmentDismissed}
            initialAssessmentCompleted={(userProfile as StudentProfile)?.initialAssessmentCompleted}
          />
        </div>
      </div>

      {/* ── Sticky filter + tab bar ── */}
      <div className={`sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 xl:-mx-10 xl:px-10 pt-3 pb-3 space-y-3 transition-colors duration-300 ${isScrolled ? 'bg-[#f8faff] border-b border-[#dde3eb] shadow-sm' : 'bg-transparent'}`}>
        {/* Search + filters row */}
        <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
          <div className="relative flex-1 w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5f6368]">
              <Search size={16} strokeWidth={2.5} />
            </div>
            <input
              id="modules-search"
              name="modules-search"
              aria-label="Search modules"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules, lessons, or assessments..."
              className="w-full pl-10 pr-10 py-2 rounded-xl border border-[#dadce0] bg-white text-[#202124] text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
            {import.meta.env.DEV && (
              <button
                onClick={async () => {
                  if (!userProfile?.uid) return;
                  const { doc, setDoc } = await import('firebase/firestore');
                  const { db } = await import('../lib/firebase');
                  try {
                    const docRef = doc(db, 'users', userProfile.uid, 'dailyRewards', userProfile.uid);
                    await setDoc(docRef, {
                      lastClaimedDate: '',
                      lastClaimedWeekSeed: 0,
                      claimedDays: [0, 1],
                      currentStreak: 2,
                      longestStreak: 2,
                      totalClaimed: 2,
                      hintTokens: 0,
                      streakShields: 0,
                      activeMultiplier: null,
                    });
                    setShowDailyCheckIn(true);
                    toast.success('Dev: Daily rewards reset (days 1-2 claimed)');
                  } catch (e) {
                    console.error(e);
                    toast.error('Dev reset failed');
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors p-1.5 rounded-lg hover:bg-amber-50"
                title="Reset Daily Rewards (Dev Only)"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-row overflow-x-auto no-scrollbar items-center gap-2 w-full lg:w-auto shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 focus:border-sky-400 focus:outline-none shadow-sm"
              aria-label="Subject"
            >
              <option value="all">All Subjects</option>
              {curriculumSubjects.map((subjectId) => (
                <option key={subjectId} value={subjectId}>
                  {CURRICULUM_SUBJECT_META[subjectId].label}
                </option>
              ))}
            </select>

            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value as 'all' | CurriculumQuarter)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 focus:border-sky-400 focus:outline-none shadow-sm"
              aria-label="Quarter"
            >
              {QUARTER_FILTERS.map((quarter) => (
                <option key={quarter} value={quarter}>{quarter === 'all' ? 'All Quarters' : quarter}</option>
              ))}
            </select>

            <select
              value={competencyFilter}
              onChange={(e) => setCompetencyFilter(e.target.value)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 focus:border-sky-400 focus:outline-none shadow-sm"
              aria-label="Competency Group"
            >
              <option value="all">All Competencies</option>
              {availableCompetencyGroups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 shadow-sm"
            >
              <Filter size={14} />
              Reset
            </button>
          </div>
        </div>

        {/* Tabs + section heading row */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mt-2">
          <div className="flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/60 shadow-inner gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
            {[
              { id: 'modules', label: 'Modules', icon: BookOpen, color: 'text-[#1FA7E1]' },
              { id: 'recommended', label: 'Recommended', icon: TrendingUp, color: 'text-[#75D06A]' },
              { id: 'practice', label: 'Practice', icon: Target, color: 'text-[#FFB356]' },
              { id: 'teacher_uploaded', label: 'Teacher Uploaded', icon: GraduationCap, color: 'text-[#F08386]' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ModulesTab)}
                  className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 flex-shrink-0 ${
                    isActive ? 'shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="modulesTabBackground"
                      className="absolute inset-0 bg-white rounded-full shadow-[0_2px_15px_-3px_rgba(0,0,0,0.1)] border border-slate-100"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />

                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? tab.color : ''}`}>
                    <tab.icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section heading — changes with active tab */}
          <div className="flex items-center gap-2 ml-1">
            {activeTab === 'modules' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                  <Layers size={15} strokeWidth={2.5} />
                </div>
                <span className="font-display font-black text-[15px] text-slate-700 tracking-tight whitespace-nowrap">DepEd Strengthened SHS Modules</span>
              </>
            )}
            {activeTab === 'recommended' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-[#75D06A]/10 flex items-center justify-center">
                  <Sparkles size={15} className="text-[#75D06A]" />
                </div>
                <span className="font-display font-black text-[15px] text-slate-700 tracking-tight whitespace-nowrap">Suggested Next</span>
              </>
            )}
            {activeTab === 'practice' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-[#FFB356]/10 flex items-center justify-center">
                  <Target size={15} className="text-[#FFB356]" />
                </div>
                <span className="font-display font-black text-[15px] text-slate-700 tracking-tight whitespace-nowrap">Practice Center</span>
              </>
            )}
            {activeTab === 'teacher_uploaded' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-[#F08386]/15 border border-[#F08386]/30 flex items-center justify-center text-[#F08386]">
                  <BookUser size={15} strokeWidth={2.5} />
                </div>
                <span className="font-display font-black text-[15px] text-slate-700 tracking-tight whitespace-nowrap">Teacher Uploaded Modules</span>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Mobile Mascot - rendered below the sticky filter bar */}
      <div className="flex lg:hidden items-center justify-center w-full mt-2 mb-2">
        <ModulesMascot 
          assessmentDismissed={(userProfile as StudentProfile)?.assessmentDismissed}
          initialAssessmentCompleted={(userProfile as StudentProfile)?.initialAssessmentCompleted}
        />
      </div>

      <div className="pt-4">
        {normalizedRiskTopics.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-black text-amber-900">
                  <AlertTriangle size={15} />
                  Assessment Focus Areas
                </p>
                <p className="mt-1 text-sm text-amber-900/80">
                  Modules are currently prioritized by your latest diagnostic needs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('recommended')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700"
              >
                View Recommended
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {normalizedRiskTopics.map((topic, index) => (
                <span
                  key={topic}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm"
                >
                  {index + 1}. {DIAGNOSTIC_TOPIC_LABELS[topic]}
                </span>
              ))}
            </div>
          </div>
        )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="pb-8 mt-4"
        >
          {activeTab === 'practice' ? (
            <PracticeCenter
              userId={userProfile?.uid ?? ''}
              onStartQuiz={(quiz) => {
                practiceQuizEndRef.current = async (q, answers) => {
                  if (!userProfile?.uid || !q.generatedQuizId) return;
                  try {
                    const questionMap = new Map(
                      (q.loadedQuestions || []).map((lq) => [lq.id, lq])
                    );
                    const submitAnswers = answers.map((a) => {
                      const lq = questionMap.get(a.questionId);
                      const selectedIndex = lq?.options?.findIndex(
                        (opt) => opt.trim().toLowerCase() === a.answer.trim().toLowerCase()
                      ) ?? 0;
                      return { question_id: a.questionId, selected_index: selectedIndex };
                    });

                    const result = await submitPracticeSession({
                      session_id: q.generatedQuizId!,
                      userId: userProfile.uid,
                      answers: submitAnswers,
                    });

                    toast.success(
                      `Score: ${result.score_percent}% | Correct: ${result.correct_count}/${result.total} | +${result.xp_earned} XP`
                    );
                  } catch (e) {
                    console.error(e);
                    toast.error('Failed to submit quiz results');
                  }
                };
                setSelectedQuiz(quiz);
              }}
              searchQuery={searchQuery}
            />
          ) : activeTab === 'teacher_uploaded' ? (
            teacherModulesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : teacherModules.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-[#F08386]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookUser size={32} className="text-[#F08386]" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No Teacher-Uploaded Modules Yet</h3>
                <p className="text-slate-500 text-sm">Your teachers haven't uploaded any custom modules yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-6">
                {teacherModules.map((mod) => (
                  <div
                    key={mod.moduleId}
                    className="bg-white rounded-2xl border border-[#F08386]/30 p-6 hover:border-[#F08386]/60 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedTeacherModule(mod)}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 rounded-md bg-[#F08386]/12 border border-[#F08386]/30 text-[#F08386] text-xs font-bold">
                        Teacher Upload
                      </span>
                      {mod.quarter && (
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs">
                          {mod.quarter}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{mod.title}</h3>
                    <p className="text-sm text-slate-600 mb-3">{mod.subject} · {mod.gradeLevel}</p>
                    {mod.summary && (
                      <p className="text-xs text-slate-500 line-clamp-3">{mod.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'modules' ? (
            <ModulesLibraryView
              modules={filteredModules}
              onSelectModule={setSelectedModule}
              onPreviewSources={setSourcePreviewModule}
              isAtRisk={normalizedRiskTopics.length > 0 && hasCompletedDiagnostic}
              weakTopics={studentProfile?.assessmentResults?.weakTopics || []}
            />
          ) : (
            <RecommendedModulesView
              modules={filteredModules}
              fullPool={modulePool}
              onSelectModule={setSelectedModule}
              onPreviewSources={setSourcePreviewModule}
              isAtRisk={normalizedRiskTopics.length > 0 && hasCompletedDiagnostic}
              learningPathContext={learningPathContext}
              learningPathLoading={learningPathLoading}
              weakTopics={studentProfile?.assessmentResults?.weakTopics || []}
            />
          )}
        </motion.div>
      </AnimatePresence>
      </div>

      <AnimatePresence>
        {sourcePreviewModule && (
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-y-0 right-0 z-[80] w-full max-w-xl border-l border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-sky-700">Curriculum Preview</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{sourcePreviewModule.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {sourcePreviewModule.active_grade_level} · {sourcePreviewModule.subject} · {sourcePreviewModule.quarter}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSourcePreviewModule(null)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Competency Group</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{sourcePreviewModule.competency_group}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Performance Standard</p>
                <p className="mt-1 text-sm text-slate-700">{sourcePreviewModule.performance_standard}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Competencies</p>
                <div className="mt-2 space-y-2">
                  {sourcePreviewModule.competencies.map((competency) => (
                    <div key={competency.code} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-black text-slate-600">{competency.code}</p>
                      <p className="mt-1 text-sm text-slate-700">{competency.outcome}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources hidden from students - uncomment below to show for debugging */}
              {/* <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sources</p>
                <div className="mt-2 space-y-2">
                  {sourcePreviewModule.module_sources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span>{source.title}</span>
                      <ExternalLink size={14} className="text-slate-400" />
                    </a>
                  ))}
                </div>
              </div> */}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

const ModulesLibraryView: React.FC<{
  modules: CurriculumModuleRuntime[];
  onSelectModule: (module: CurriculumModuleRuntime) => void;
  onPreviewSources: (module: CurriculumModuleRuntime) => void;
  isAtRisk?: boolean;
  weakTopics?: string[];
}> = ({ modules, onSelectModule, onPreviewSources, isAtRisk = false, weakTopics = [] }) => {
  return (
    <div className="pr-2 space-y-8">
      <div>

        {modules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#dde3eb] p-8 text-center">
            <p className="text-slate-700 font-semibold">No matching modules found.</p>
            <p className="mt-2 text-sm text-slate-500">
              If modules are not yet available for your selected view, this area will unlock after assessment sync and content rollout.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-6">
            {modules.map((module, index) => {
              const isRecommended = weakTopics.some(wt => 
                (module.content_domain && module.content_domain.toLowerCase().includes(wt.toLowerCase())) ||
                (module.title && module.title.toLowerCase().includes(wt.toLowerCase())) ||
                (module.competency_group && module.competency_group.toLowerCase().includes(wt.toLowerCase())) ||
                (module.subject && module.subject.toLowerCase().includes(wt.toLowerCase()))
              );
              return (
              <ModuleFolderCard
                key={module.id}
                module={module}
                index={index}
                onClick={() => onSelectModule(module)}
                onPreviewSources={() => onPreviewSources(module)}
                isAtRisk={isAtRisk}
                isRecommended={isRecommended}
              />
            )})}
          </div>
        )}
      </div>
    </div>
  );
};

const RecommendedModulesView: React.FC<{
  modules: CurriculumModuleRuntime[];
  fullPool: CurriculumModuleRuntime[];
  onSelectModule: (module: CurriculumModuleRuntime) => void;
  onPreviewSources: (module: CurriculumModuleRuntime) => void;
  isAtRisk?: boolean;
  learningPathContext?: string | null;
  learningPathLoading?: boolean;
  weakTopics?: string[];
}> = ({ modules, fullPool, onSelectModule, onPreviewSources, isAtRisk = false, learningPathContext = null, learningPathLoading = false, weakTopics = [] }) => {
  const inProgress = modules.filter((module) => module.progress > 0 && module.progress < 100);
  const suggested = (modules.length > 0 ? modules : fullPool).filter((module) => module.progress === 0).slice(0, 6);

  return (
    <div className="pr-2 space-y-10">
      {learningPathLoading && (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin flex-shrink-0" />
          <p className="text-sm font-semibold text-sky-800">
            Building your personalized learning path from DepEd curriculum...
          </p>
        </div>
      )}

      {learningPathContext && !learningPathLoading && (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 px-5 py-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-indigo-700 mb-2">
            📚 Your Personalized Learning Path
          </p>
          <pre className="whitespace-pre-wrap text-sm text-indigo-900 font-medium leading-relaxed font-sans">
            {learningPathContext}
          </pre>
        </div>
      )}

      {inProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[14px] bg-[#FF8B8B]/10 flex items-center justify-center text-[20px] shadow-inner">🔥</div>
            <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">Continue This Module</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-6">
            {inProgress.slice(0, 4).map((module, index) => {
              const isRecommended = weakTopics.some(wt => 
                (module.content_domain && module.content_domain.toLowerCase().includes(wt.toLowerCase())) ||
                (module.title && module.title.toLowerCase().includes(wt.toLowerCase())) ||
                (module.competency_group && module.competency_group.toLowerCase().includes(wt.toLowerCase())) ||
                (module.subject && module.subject.toLowerCase().includes(wt.toLowerCase()))
              );
              return (
              <ModuleFolderCard
                key={module.id}
                module={module}
                index={index}
                onClick={() => onSelectModule(module)}
                onPreviewSources={() => onPreviewSources(module)}
                isAtRisk={isAtRisk}
                badgeLabel="In Progress"
                isRecommended={isRecommended}
              />
            )})}
          </div>
        </div>
      )}

      <div>
        {suggested.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#dde3eb] p-8 text-center text-slate-500 font-medium">
            You are all caught up. Practice more quizzes to unlock additional recommendations.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-6">
            {suggested.map((module, index) => {
              const isRecommended = weakTopics.some(wt => 
                (module.content_domain && module.content_domain.toLowerCase().includes(wt.toLowerCase())) ||
                (module.title && module.title.toLowerCase().includes(wt.toLowerCase())) ||
                (module.competency_group && module.competency_group.toLowerCase().includes(wt.toLowerCase())) ||
                (module.subject && module.subject.toLowerCase().includes(wt.toLowerCase()))
              );
              return (
              <ModuleFolderCard
                key={module.id}
                module={module}
                index={index}
                onClick={() => onSelectModule(module)}
                onPreviewSources={() => onPreviewSources(module)}
                isAtRisk={isAtRisk}
                badgeLabel="Start"
                isRecommended={isRecommended}
              />
            )})}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModulesPage;
