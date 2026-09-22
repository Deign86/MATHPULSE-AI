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
  Video,
  PenTool,
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  Flame,
  FileText,
  Info,
  ChevronDown,
  Clock,
  Play,
  Lightbulb,
  ChevronRight,
  Award,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type TeacherUploadedModule } from '../data/curriculumModules';
import { motion, AnimatePresence } from 'motion/react';
import ModuleFolderCard from './ModuleFolderCard';
import ModuleDetailView from './ModuleDetailView';
import PracticeCenter from './PracticeCenter';
import ModuleStepGuide from './ModuleStepGuide';

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
  type CurriculumSubjectId,
  type SubjectMeta,
  type CurriculumQuarter,
  getCurriculumModulesForLearner,
  resolveLearnerGradeLevel,
} from '../data/curriculumModules';
import { getFirebaseStoragePdfUrl, getLessonsByModule } from '../data/curriculum/types';
import { getRagAnalysisContext } from '../services/apiService';
import { recordGet } from '../utils/memberOf';
import { useSubjectAvailability } from '../hooks/useSubjectAvailability';
import { getStudentCompetencyProfile } from '../services/assessmentService';
import type { CompetencyProfileDoc } from '../types/assessment';
import { useCurriculum } from '../hooks/useCurriculum';
import { submitPracticeSession } from '../services/practiceService';
import { subscribeToUserProgress } from '../services/progressService';
import { watchModule } from '../services/moduleWatchService';
import type { ModuleProgress, UserProgress } from '../types/models';

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

/** Discriminated union for the current rendered view within ModulesPage. */
type ModulesPageView =
  | { kind: 'library' }
  | { kind: 'module_detail'; module: CurriculumModuleRuntime }
  | { kind: 'quiz'; quiz: QuizExperienceQuiz }
  | { kind: 'teacher_module'; module: TeacherUploadedModule };

const QUARTER_FILTERS: Array<'all' | CurriculumQuarter> = ['all', 'Q1', 'Q2', 'Q3', 'Q4'];

/**
 * RAG learning-path context for the recommended view. Modelled as one union so
 * "loading" and "has context" cannot both be true, which the previous
 * `context: string | null` + `loading: boolean` pair allowed.
 */
type LearningPathState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; context: string };

const IDLE_LEARNING_PATH: LearningPathState = { status: 'idle' };

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
  const [activeTab, setActiveTab] = useState<ModulesTab>(() => {
    const stored = sessionStorage.getItem('mathpulse_modules_tab');
    if (stored === 'practice' || stored === 'recommended' || stored === 'teacher_uploaded') {
      sessionStorage.removeItem('mathpulse_modules_tab');
      return stored;
    }
    return 'modules';
  });

  // SAFETY: trusted internal value already conforms to the asserted type.
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
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showCurriculumInfo, setShowCurriculumInfo] = useState(false);
  const [sourcePreviewModule, setSourcePreviewModule] = useState<CurriculumModuleRuntime | null>(null);
  const [selectedTeacherModule, setSelectedTeacherModule] = useState<TeacherUploadedModule | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({});
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  // Hide floating AI chatbot while in dedicated module step study guide
  useEffect(() => {
    if (activeStepIndex !== null) {
      setIsInQuizMode?.(true);
      return () => {
        setIsInQuizMode?.(false);
      };
    }
  }, [activeStepIndex, setIsInQuizMode]);

  // Subscribe to user progress for module card progress bars
  useEffect(() => {
    if (!userProfile?.uid) return;
    return subscribeToUserProgress(userProfile.uid, setUserProgress);
  }, [userProfile?.uid]);

  const assignedSubjects = useMemo(() => {
    // SAFETY: trusted internal value already conforms to the asserted type.
    const rawAssignments = (studentProfile as (StudentProfile & {
      learnerCurriculumAssignments?: { subjects?: string[] };
      assignedSubjects?: string[];
      curriculumAssignedSubjects?: string[];
    }) | null)?.learnerCurriculumAssignments?.subjects
      // SAFETY: trusted internal value already conforms to the asserted type.
      ?? (studentProfile as any)?.assignedSubjects
      // SAFETY: trusted internal value already conforms to the asserted type.
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
  const [learningPath, setLearningPath] = useState<LearningPathState>(IDLE_LEARNING_PATH);

  const currentView: ModulesPageView = selectedQuiz
    ? { kind: 'quiz', quiz: selectedQuiz }
    : selectedTeacherModule
    ? { kind: 'teacher_module', module: selectedTeacherModule }
    : selectedModule
    ? { kind: 'module_detail', module: selectedModule }
    : { kind: 'library' };

  // Competency profile state for personalized module filtering
  const [competencyProfile, setCompetencyProfile] = useState<CompetencyProfileDoc | null>(null);

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
          // SAFETY: trusted internal value already conforms to the asserted type.
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

  const filteredTeacherModules = useMemo(() => {
    const queryStr = searchQuery.trim().toLowerCase();
    return teacherModules.filter((mod) => {
      const matchesSearch = !queryStr ||
        mod.title.toLowerCase().includes(queryStr) ||
        mod.subject.toLowerCase().includes(queryStr) ||
        (mod.summary && mod.summary.toLowerCase().includes(queryStr)) ||
        (mod.competencyTags && mod.competencyTags.some((tag) => tag.toLowerCase().includes(queryStr)));
      const matchesSubject = subjectFilter === 'all' ||
        mod.subject.toLowerCase().replace(/\s+/g, '-').includes(subjectFilter.toLowerCase()) ||
        mod.subject.toLowerCase().includes(subjectFilter.toLowerCase());
      const matchesQuarter = quarterFilter === 'all' ||
        mod.quarter?.toUpperCase() === quarterFilter.toUpperCase();
      return matchesSearch && matchesSubject && matchesQuarter;
    });
  }, [teacherModules, searchQuery, subjectFilter, quarterFilter]);


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
      // SAFETY: trusted internal value already conforms to the asserted type.
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
      const result = await claim();

      // Fire notification
      if (result?.success) {
        notify({
          userId: userProfile.uid,
          type: 'daily_checkin',
          title: 'Daily Reward Claimed!',
          message: `You earned ${result.reward.label} and kept your streak alive!`,
          metadata: { rewardId: result.reward.id, streakDay: result.dayIndex + 1 },
        }).catch(console.error);

        // Avatar unlock for epic rewards
        if (result.reward.rarity === 'epic') {
          unlockAvatarItem(userProfile.uid, 'acc_crown')
            .then(() => toast.success("Epic reward unlocked!"))
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
    getStudentCompetencyProfile(userProfile.uid)
      .then((profile) => {
        setCompetencyProfile(profile);
      })
      .catch((err) => {
        console.error('Failed to load competency profile:', err);
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
      const isYearLongFiniteMath = module.subjectId === 'finite-math';
      const quarterMatch = quarterFilter === 'all' || isYearLongFiniteMath || module.quarter === quarterFilter;
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

  /**
   * Progress is stored at subjects.{subjectId}.modulesProgress.{moduleId}, so
   * index it by that pair. The previous per-module scan over every subject was
   * O(modules x subjects) and silently matched the first subject holding the
   * same module id, which is wrong when an id appears in two subjects.
   */
  const progressBySubjectModule = useMemo(() => {
    const index = new Map<string, ModuleProgress>();
    if (!userProgress) return index;
    for (const [subjectId, subjectProgress] of Object.entries(userProgress.subjects || {})) {
      if (!subjectProgress?.modulesProgress) continue;
      for (const [moduleId, moduleProgress] of Object.entries(subjectProgress.modulesProgress)) {
        index.set(`${subjectId}::${moduleId}`, moduleProgress);
      }
    }
    return index;
  }, [userProgress]);

  // Enrich modules with real progress from Firestore
  const modulesWithProgress = useMemo(() => {
    if (!userProgress) return filteredModules;
    return filteredModules.map(module => {
      const mp = progressBySubjectModule.get(`${module.subjectId}::${module.id}`);
      if (!mp) return module;
      const totalItems = module.lessons.length + module.quizzes.length;
      const completedItems = (mp.lessonsCompleted?.length || 0) + (mp.quizzesCompleted?.length || 0);
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      return { ...module, progress };
    });
  }, [filteredModules, userProgress, progressBySubjectModule]);

  const curriculumContextLabel = useMemo(() => {
    const visibleQuarter = quarterFilter === 'all' ? 'All Quarters' : quarterFilter;
    const subjectMeta = recordGet<CurriculumSubjectId, SubjectMeta>(CURRICULUM_SUBJECT_META, subjectFilter);
    const visibleSubject =
      subjectFilter === 'all'
        ? 'All Subjects'
        : subjectMeta?.label ?? 'Subject';
    return `${activeGradeLevel} · ${visibleSubject} · ${visibleQuarter}`;
  }, [activeGradeLevel, subjectFilter, quarterFilter]);

  const curriculumSubjects = useMemo(() => {
    const unique = new Set(modulePool.map((module) => module.subjectId));
    return Array.from(unique);
  }, [modulePool]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (subjectFilter !== 'all') count += 1;
    if (quarterFilter !== 'all') count += 1;
    if (competencyFilter !== 'all') count += 1;
    return count;
  }, [subjectFilter, quarterFilter, competencyFilter]);

  const clearFilters = () => {
    setSubjectFilter('all');
    setQuarterFilter('all');
    setCompetencyFilter('all');
    setSearchQuery('');
  };

  useEffect(() => {
    if (activeTab !== 'recommended' || normalizedRiskTopics.length === 0) return;
    setLearningPath({ status: 'loading' });

    getRagAnalysisContext({
      weakTopics: normalizedRiskTopics.map(t => DIAGNOSTIC_TOPIC_LABELS[t]),
      subject: subjectFilter !== 'all' ? subjectFilter : 'General Mathematics',
      userId: userProfile?.uid,
    })
      .then((res) => {
        setLearningPath({ status: 'ready', context: res.curriculumContext });
      })
      .catch((err) => {
        // Issue #159: visible fallback already handled — the panel renders the
        // idle state below. Warn so RAG outages stay visible in telemetry.
        console.warn('[ModulesPage] learning-path context failed, showing idle:', err);
        setLearningPath(IDLE_LEARNING_PATH);
      });
  }, [activeTab, normalizedRiskTopics]);

  const handleQuizComplete = (score: number, xpEarned: number) => {
    if (onEarnXP) {
      onEarnXP(xpEarned, `Quiz Completed! +${xpEarned} XP`);
    }
    // Don't unmount here - let user see results modal first
  };

  const handleNotifyMe = async (moduleId: string) => {
    if (!currentUser?.uid) return;
    try {
      await watchModule(currentUser.uid, moduleId);
      toast.success("You'll be notified when this module becomes available.");
    } catch { /* non-critical notification subscription */ }
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
    const totalDuration = selectedTeacherModule.sections?.reduce((acc, s) => acc + (s.durationMinutes || 10), 0) || 30;
    const completedCount = selectedTeacherModule.sections?.filter((s) => s.isCompleted).length || 0;
    const totalSections = selectedTeacherModule.sections?.length || 0;
    const progressPct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
    const nextUnfinishedStep = selectedTeacherModule.sections?.findIndex((s) => !s.isCompleted);
    const resumeIndex = nextUnfinishedStep !== -1 && nextUnfinishedStep !== undefined ? nextUnfinishedStep : 0;
    const ctaText = completedCount === 0 ? 'Start Interactive Module' : completedCount === totalSections ? 'Review Module from Step 1' : `Resume at Step ${resumeIndex + 1}`;

    // When a step is active, show the dedicated step page (not a modal overlay)
    if (activeStepIndex !== null && selectedTeacherModule.sections[activeStepIndex]) {
      const hasNext = activeStepIndex < selectedTeacherModule.sections.length - 1;
      const hasPrev = activeStepIndex > 0;
      return (
        <AnimatePresence mode="wait">
          <ModuleStepGuide
            key={selectedTeacherModule.moduleId || selectedTeacherModule.title}
            moduleId={selectedTeacherModule.moduleId || selectedTeacherModule.title}
            section={selectedTeacherModule.sections[activeStepIndex]}
            sectionIndex={activeStepIndex}
            totalSections={selectedTeacherModule.sections.length}
            moduleTitle={selectedTeacherModule.title}
            studentName={studentProfile?.name || 'Student'}
            practice={selectedTeacherModule.practice}
            onClose={() => setActiveStepIndex(null)}
            onNext={hasNext ? () => setActiveStepIndex(activeStepIndex + 1) : undefined}
            onPrev={hasPrev ? () => setActiveStepIndex(activeStepIndex - 1) : undefined}
          />
        </AnimatePresence>
      );
    }

    return (
      <div className="h-full overflow-y-auto px-4 sm:px-8 xl:px-12 pt-3 pb-16 scrollbar-hide scroll-smooth relative font-sans">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <button
            type="button"
            onClick={() => {
              setSelectedTeacherModule(null);
              setPracticeAnswers({});
              setRevealedExplanations({});
            }}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800/60 shadow-2xs transition-all cursor-pointer hover:shadow-xs whitespace-nowrap shrink-0"
          >
            <ArrowRight className="rotate-180 transition-transform group-hover:-translate-x-1 shrink-0" size={16} />
            <span className="whitespace-nowrap">Back to Modules</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500/10 to-purple-500/10 dark:from-rose-500/20 dark:to-purple-500/20 text-rose-600 dark:text-rose-300 text-[11px] sm:text-xs font-black border border-rose-200/80 dark:border-rose-800/60 shadow-2xs whitespace-nowrap shrink-0">
              <GraduationCap size={13} className="text-rose-500 shrink-0" />
              <span className="whitespace-nowrap">Teacher-Curated Intervention</span>
            </span>
            {selectedTeacherModule.quarter && (
              <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs font-bold border border-slate-200/80 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
                {selectedTeacherModule.quarter}
              </span>
            )}
          </div>
        </div>

        {/* Hero Card - High-Impact AAA Design */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 md:p-10 shadow-xl mb-8 relative overflow-hidden border border-white/10">
          {/* Ambient Glows & Grid Mesh */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-500/25 via-purple-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />

          {/* Floating animated decorative math symbols */}
          <motion.div
            animate={{ y: [-4, 4, -4], rotate: [-4, 4, -4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-6 right-8 hidden lg:flex w-24 h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md items-center justify-center pointer-events-none text-white/20 text-4xl font-display font-black select-none shadow-2xl"
          >
            ∫dx
          </motion.div>
          <motion.div
            animate={{ y: [5, -5, 5], rotate: [5, -5, 5] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-8 right-32 hidden xl:flex w-16 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md items-center justify-center pointer-events-none text-amber-300/30 text-2xl font-display font-bold select-none"
          >
            ∑
          </motion.div>

          <div className="relative z-10 max-w-4xl">
            {/* Meta Tags Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/25 border border-rose-400/40 text-rose-200 text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0">
                {selectedTeacherModule.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-slate-200 text-xs font-bold whitespace-nowrap shrink-0">
                {selectedTeacherModule.gradeLevel.startsWith('Grade') ? selectedTeacherModule.gradeLevel : `Grade ${selectedTeacherModule.gradeLevel}`}
              </span>
              {selectedTeacherModule.strandOrTrack && (
                <span className="px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-slate-200 text-xs font-bold whitespace-nowrap shrink-0">
                  {selectedTeacherModule.strandOrTrack}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold whitespace-nowrap shrink-0">
                <CheckCircle2 size={12} className="shrink-0" />
                <span className="whitespace-nowrap">SHS STEM Verified</span>
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black text-white tracking-tight leading-tight mb-4">
              {selectedTeacherModule.title}
            </h1>

            {/* Summary */}
            {selectedTeacherModule.summary && (
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-medium max-w-3xl">
                {selectedTeacherModule.summary}
              </p>
            )}

            {/* Primary Action Button + Progress Banner */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveStepIndex(resumeIndex)}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-600 hover:via-purple-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-rose-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group whitespace-nowrap shrink-0"
              >
                <Play size={18} className="fill-white group-hover:translate-x-0.5 transition-transform shrink-0" />
                <span className="whitespace-nowrap">{ctaText}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Linear Progress Card */}
              <div className="flex-1 max-w-md bg-black/30 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col justify-center">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5 whitespace-nowrap">
                  <span className="text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
                    <Award size={14} className="text-amber-400 shrink-0" />
                    <span className="whitespace-nowrap">Module Progress</span>
                  </span>
                  <span className="text-white font-black whitespace-nowrap">{progressPct}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 via-purple-400 to-indigo-400"
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium whitespace-nowrap">
                  {completedCount} of {totalSections} steps finished
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Stat Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-rose-300 dark:hover:border-rose-700/60 transition-all group min-w-0">
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">Lesson Steps</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Layers size={16} />
              </div>
            </div>
            <div className="text-2xl font-display font-black text-slate-900 dark:text-white whitespace-nowrap">
              {totalSections}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium whitespace-nowrap truncate">
              {completedCount} completed
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-700/60 transition-all group min-w-0">
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">Estimated Time</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-2xl font-display font-black text-slate-900 dark:text-white whitespace-nowrap">
              {totalDuration} mins
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium whitespace-nowrap truncate">
              Self-paced with AI
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-700/60 transition-all group min-w-0">
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">Self-Check</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Target size={16} />
              </div>
            </div>
            <div className="text-2xl font-display font-black text-slate-900 dark:text-white whitespace-nowrap">
              {selectedTeacherModule.practice?.length || 0} items
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium whitespace-nowrap truncate">
              Interactive practice
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all group min-w-0">
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">Curriculum</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="text-2xl font-display font-black text-slate-900 dark:text-white whitespace-nowrap">
              SHS STEM
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium whitespace-nowrap truncate">
              Teacher intervention
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="space-y-8">
          {/* Learning Objectives */}
          {selectedTeacherModule.learningObjectives && selectedTeacherModule.learningObjectives.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white">
                    Learning Objectives & Competencies
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Key competencies to master in this module</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedTeacherModule.learningObjectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Sections Timeline */}
          {selectedTeacherModule.sections && selectedTeacherModule.sections.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white leading-tight">
                      Interactive Study Roadmap ({totalSections})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Guided step-by-step learning with side-by-side video and AI tutoring
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {completedCount}/{totalSections} Steps Done
                  </span>
                </div>
              </div>

              {/* Connected Vertical Timeline */}
              <div className="relative space-y-4 before:absolute before:inset-0 before:left-5 sm:before:left-6 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-indigo-400 before:to-slate-200 dark:before:to-slate-800 before:-z-0">
                {selectedTeacherModule.sections.map((section, i) => {
                  const detectedType = section.stepType
                    || (section.content.includes('video lesson') ? 'video_lesson'
                      : section.content.includes('practice') ? 'practice'
                      : section.content.includes('assessment') ? 'assessment'
                      : section.content.includes('chat') ? 'chat_session'
                      : section.content.includes('review') ? 'review' : undefined);
                  const StepIcon = detectedType === 'video_lesson' ? Video
                    : detectedType === 'practice' ? PenTool
                    : detectedType === 'assessment' ? CheckCircle2
                    : detectedType === 'chat_session' ? MessageCircle
                    : detectedType === 'review' ? RefreshCw : Layers;

                  const typeLabel = detectedType === 'video_lesson' ? 'Video Lesson'
                    : detectedType === 'practice' ? 'Guided Practice'
                    : detectedType === 'assessment' ? 'Assessment'
                    : detectedType === 'chat_session' ? 'AI Tutor Chat'
                    : detectedType === 'review' ? 'Topic Review' : 'Lesson Step';

                  const isCurrent = i === resumeIndex && !section.isCompleted;

                  return (
                    <div key={i} className="relative z-10 pl-12 sm:pl-14">
                      {/* Timeline Node Badge */}
                      <div className={`absolute left-0 top-4 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-display font-black text-sm shadow-sm transition-transform duration-200 shrink-0 ${
                        section.isCompleted
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-950'
                          : isCurrent
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white ring-4 ring-purple-100 dark:ring-purple-950 scale-105 shadow-md'
                          : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {section.isCompleted ? <CheckCircle2 size={20} /> : String(i + 1).padStart(2, '0')}
                      </div>

                      {/* Step Card */}
                      <button
                        type="button"
                        onClick={() => setActiveStepIndex(i)}
                        className={`w-full text-left rounded-2xl p-5 sm:p-6 transition-all border cursor-pointer group bg-white dark:bg-slate-800/60 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                          isCurrent
                            ? 'border-purple-300 dark:border-purple-600 ring-2 ring-purple-100 dark:ring-purple-950/50'
                            : section.isCompleted
                            ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                <StepIcon size={13} className="text-purple-500 shrink-0" />
                                <span>{typeLabel}</span>
                              </span>
                              {section.durationMinutes && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 whitespace-nowrap shrink-0">
                                  <Clock size={12} className="shrink-0" />
                                  <span>{section.durationMinutes} mins</span>
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap shrink-0">
                                  Current Step
                                </span>
                              )}
                            </div>

                            <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {section.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                              {section.content}
                            </p>
                          </div>

                          <div className="shrink-0 self-start sm:self-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-2xs group-hover:shadow-sm group-hover:scale-105 transition-all whitespace-nowrap shrink-0">
                              <span className="whitespace-nowrap">{section.isCompleted ? 'Review Step' : 'Launch Step'}</span>
                              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Self-Check Practice Items (Interactive) */}
          {selectedTeacherModule.practice && selectedTeacherModule.practice.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Target size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white leading-tight">
                      Interactive Self-Check Practice ({selectedTeacherModule.practice.length})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Test your understanding with instant evaluation before your teacher quiz
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto whitespace-nowrap shrink-0">
                  {Object.keys(practiceAnswers).length} of {selectedTeacherModule.practice.length} Attempted
                </div>
              </div>

              <div className="space-y-6">
                {selectedTeacherModule.practice.map((q, i) => {
                  const selectedAns = practiceAnswers[i];
                  const isAnswered = !!selectedAns;
                  const isCorrect = selectedAns === q.answer;
                  const isExplanationOpen = revealedExplanations[i] ?? isAnswered;

                  return (
                    <div
                      key={i}
                      className={`rounded-2xl p-5 sm:p-6 border transition-all ${
                        isAnswered
                          ? isCorrect
                            ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                            : 'border-rose-200 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/20'
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <span className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          Q{i + 1}
                        </span>
                        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* Interactive Option Pills */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4 pl-0 sm:pl-10">
                        {q.options.map((opt, j) => {
                          const isOptionSelected = selectedAns === opt.label;
                          const isThisCorrect = opt.label === q.answer;
                          let optionStyle = 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/30';

                          if (isAnswered) {
                            if (isThisCorrect) {
                              optionStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold';
                            } else if (isOptionSelected && !isThisCorrect) {
                              optionStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 font-bold';
                            } else {
                              optionStyle = 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800 text-slate-400 opacity-60';
                            }
                          }

                          return (
                            <button
                              key={j}
                              type="button"
                              onClick={() => {
                                setPracticeAnswers((prev) => ({ ...prev, [i]: opt.label }));
                                setRevealedExplanations((prev) => ({ ...prev, [i]: true }));
                              }}
                              className={`w-full text-left rounded-xl p-3.5 text-xs sm:text-sm font-medium border flex items-center justify-between transition-all cursor-pointer shadow-2xs ${optionStyle}`}
                            >
                              <span className="flex items-center gap-2.5 min-w-0">
                                <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700 text-[11px] font-black flex items-center justify-center shrink-0">
                                  {opt.label}
                                </span>
                                <span className="break-words leading-snug">{opt.text}</span>
                              </span>
                              {isAnswered && isThisCorrect && (
                                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                              )}
                              {isAnswered && isOptionSelected && !isThisCorrect && (
                                <X size={16} className="text-rose-600 dark:text-rose-400 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation toggle & card */}
                      {q.explanation && (
                        <div className="pl-0 sm:pl-10">
                          <button
                            type="button"
                            onClick={() => setRevealedExplanations((prev) => ({ ...prev, [i]: !isExplanationOpen }))}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer mb-2 whitespace-nowrap"
                          >
                            <Lightbulb size={13} className="shrink-0" />
                            <span className="whitespace-nowrap">{isExplanationOpen ? 'Hide Explanation' : 'View Teacher Explanation'}</span>
                            <ChevronDown size={13} className={`shrink-0 transition-transform duration-200 ${isExplanationOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isExplanationOpen && (
                            <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              <span className="font-bold text-purple-700 dark:text-purple-300">Teacher's Note:</span> {q.explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full overflow-y-auto pt-3.5 px-5 sm:pt-4 sm:px-8 md:pt-2.5 md:px-8 lg:pt-0 lg:px-8 xl:px-12 pb-8 scrollbar-hide scroll-smooth relative"
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

      {/* DepEd Curriculum Info Modal */}
      <AnimatePresence>
        {showCurriculumInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-900 leading-tight">
                      Curriculum Modules
                    </h3>
                    <p className="text-xs text-slate-500">DepEd Strengthened SHS</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCurriculumInfo(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close curriculum info"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  MathPulse AI loads modules directly from DepEd Strengthened Senior High School curriculum guides with AI-powered RAG lesson generation.
                </p>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Available Now</div>
                  <ul className="text-xs space-y-1 text-slate-700 list-disc list-inside">
                    <li>General Mathematics</li>
                    <li>Business Mathematics</li>
                    <li>Statistics & Probability</li>
                  </ul>
                </div>
                <p className="text-xs text-slate-500">
                  Pre-Calculus and Basic Calculus modules are coming soon once teaching module PDFs are sourced.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCurriculumInfo(false)}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Filter Drawer / Sheet */}
      <AnimatePresence>
        {showFilterDrawer && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-sky-600" />
                  <h3 className="font-display font-bold text-lg text-slate-900">
                    Filter Modules
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilterDrawer(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close filter drawer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Subject Selector */}
                <div>
                  <label htmlFor="mobile-filter-subject" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Subject
                  </label>
                  <select
                    id="mobile-filter-subject"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-sky-400 focus:outline-none shadow-sm"
                  >
                    <option value="all">All Subjects</option>
                    {curriculumSubjects.map((subjectId) => (
                      <option key={subjectId} value={subjectId}>
                        {CURRICULUM_SUBJECT_META[subjectId].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quarter Selector */}
                <div>
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Quarter
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {QUARTER_FILTERS.map((quarter) => {
                      const isSelected = quarterFilter === quarter;
                      return (
                        <button
                          key={quarter}
                          type="button"
                          onClick={() => setQuarterFilter(quarter)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-sky-50 border-sky-400 text-sky-700 ring-1 ring-sky-400'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {quarter === 'all' ? 'All Quarters' : quarter}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Competency Group */}
                <div>
                  <label htmlFor="mobile-filter-competency" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Competency Group
                  </label>
                  <select
                    id="mobile-filter-competency"
                    value={competencyFilter}
                    onChange={(e) => setCompetencyFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-sky-400 focus:outline-none shadow-sm"
                  >
                    <option value="all">All Competencies</option>
                    {availableCompetencyGroups.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterDrawer(false)}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-3 md:py-6 gap-2 md:gap-6">
        <div className="flex-1 max-w-3xl">
          <div className="flex items-center justify-between gap-3 mb-1.5 md:mb-3">
            <h1 className="text-[24px] sm:text-[28px] md:text-[44px] font-display font-black text-[#202124] tracking-tight leading-[1.1]">
              Curriculum Modules
            </h1>
            {/* Mobile About / Info button */}
            <button
              type="button"
              onClick={() => setShowCurriculumInfo(true)}
              className="inline-flex lg:hidden items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors shadow-sm shrink-0"
              title="About DepEd Curriculum"
            >
              <Info size={14} className="text-sky-600" />
              <span>About</span>
            </button>
          </div>
          <p className="hidden lg:block text-[#3c4043] text-[13px] md:text-[17px] leading-relaxed md:leading-[1.7] md:pr-10">
            MathPulse AI loads modules directly from DepEd Strengthened SHS curriculum guides with AI-powered RAG lesson generation. Available now for Grade 11: General Mathematics, Business Mathematics, Statistics & Probability, and Finite Mathematics — every module fully unlocked.
          </p>
          <div className="mt-2 md:mt-4 flex items-center gap-2 md:gap-3">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm font-bold text-sky-900">
              {curriculumContextLabel}
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-shrink-0 items-center justify-end w-[350px]">
          <ModulesMascot 
            // SAFETY: trusted internal value already conforms to the asserted type.
            assessmentDismissed={(userProfile as StudentProfile)?.assessmentDismissed}
            // SAFETY: trusted internal value already conforms to the asserted type.
            initialAssessmentCompleted={(userProfile as StudentProfile)?.initialAssessmentCompleted}
          />
        </div>
      </div>

      {/* ── Sticky filter + tab bar ── */}
      <div className={`sticky top-0 z-30 -mx-5 px-5 sm:-mx-8 sm:px-8 xl:-mx-12 xl:px-12 pt-3 pb-3 space-y-3 transition-colors duration-300 ${isScrolled ? 'bg-[#f8faff] border-b border-[#dde3eb] shadow-sm' : 'bg-transparent'}`}>
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

          {/* Mobile Filters: Single Quarter Dropdown Pill + Filters Drawer Trigger */}
          <div className="flex lg:hidden items-center gap-2 w-full pb-1">
            {/* Single Quarter Pill Dropdown */}
            <div className="relative inline-block shrink-0">
              <select
                id="mobile-quarter-select"
                value={quarterFilter}
                // SAFETY: trusted internal value already conforms to the asserted type.
                onChange={(e) => setQuarterFilter(e.target.value as 'all' | CurriculumQuarter)}
                className={`appearance-none pl-3.5 pr-8 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  quarterFilter !== 'all'
                    ? 'bg-sky-50 text-sky-800 border-sky-300 ring-1 ring-sky-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                aria-label="Select Quarter"
              >
                {QUARTER_FILTERS.map((quarter) => (
                  <option key={quarter} value={quarter}>
                    {quarter === 'all' ? 'All Quarters' : quarter}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Filter Drawer Button */}
            <button
              type="button"
              onClick={() => setShowFilterDrawer(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all shadow-sm ${
                activeFilterCount > 0
                  ? 'bg-sky-50 text-sky-800 border-sky-300 ring-1 ring-sky-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter size={13} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Reset Filters Button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0 ml-auto"
                title="Reset all filters"
                aria-label="Reset all filters"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Desktop Filters: Preserved inline dropdowns */}
          <div className="hidden lg:flex flex-row overflow-x-auto no-scrollbar items-center gap-2 shrink-0">
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
              // SAFETY: trusted internal value already conforms to the asserted type.
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
                  // SAFETY: trusted internal value already conforms to the asserted type.
                  onClick={() => setActiveTab(tab.id as ModulesTab)}
                  className={`relative flex items-center justify-center gap-1.5 rounded-full text-[13px] font-bold transition-all duration-300 flex-shrink-0 ${
                    isActive
                      ? 'px-3.5 sm:px-4 py-1.5 shadow-sm'
                      : 'px-2.5 sm:px-4 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  {isActive && (
                    <motion.div
                      layoutId="modulesTabBackground"
                      className="absolute inset-0 bg-white rounded-full shadow-[0_2px_15px_-3px_rgba(0,0,0,0.1)] border border-slate-100"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${isActive ? tab.color : ''}`}>
                    <tab.icon size={15} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                    <span className={`${isActive ? 'inline' : 'hidden sm:inline'} whitespace-nowrap`}>
                      {tab.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section heading — changes with active tab */}
          <div className="flex items-center gap-2 ml-1 min-w-0">
            {activeTab === 'modules' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
                  <Layers size={15} strokeWidth={2.5} className="shrink-0" />
                </div>
                <span className="font-display font-black text-[15px] text-slate-700 tracking-tight whitespace-nowrap truncate">DepEd Strengthened SHS Modules</span>
              </>
            )}
            {activeTab === 'recommended' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-[#75D06A]/10 flex items-center justify-center shrink-0">
                  <Sparkles size={15} className="text-[#75D06A] shrink-0" />
                </div>
                <span className="font-display font-black text-[15px] text-slate-700 tracking-tight whitespace-nowrap truncate">Suggested Next</span>
              </>
            )}
            {activeTab === 'practice' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-[#FFB356]/10 flex items-center justify-center shrink-0">
                  <Target size={15} className="text-[#FFB356] shrink-0" />
                </div>
                <span className="font-display font-black text-[15px] text-slate-700 tracking-tight whitespace-nowrap truncate">Practice Center</span>
              </>
            )}
            {activeTab === 'teacher_uploaded' && (
              <>
                <div className="w-7 h-7 rounded-lg bg-[#F08386]/15 border border-[#F08386]/30 flex items-center justify-center text-[#F08386] shrink-0">
                  <BookUser size={15} strokeWidth={2.5} className="shrink-0" />
                </div>
                <span className="font-display font-black text-[15px] text-slate-700 tracking-tight whitespace-nowrap truncate">Teacher Uploaded Modules</span>
              </>
            )}

          </div>
        </div>
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
                  if (!userProfile?.uid) return;

                  // Always record completion locally (regardless of backend success)
                  const topicName = q.title?.replace(/^Practice Quiz:\s*/i, '').replace(/\s*\(AI\)\s*$/i, '') || '';
                  const scorePercent = Math.round((answers.filter(a => a.correct).length / Math.max(answers.length, 1)) * 100);
                  if (topicName) {
                    const storageKey = `mathpulse_practice_completed_${userProfile.uid}`;
                    try {
                      const stored = localStorage.getItem(storageKey);
                      const map: [string, any][] = stored ? JSON.parse(stored) : [];
                      const mapObj = new Map(map);
                      const key = topicName.toLowerCase();
                      // SAFETY: trusted internal value already conforms to the asserted type.
                      const existing = (mapObj.get(key) as any) || { bestScore: 0, attempts: 0, history: [] };
                      existing.bestScore = Math.max(existing.bestScore, scorePercent);
                      existing.attempts += 1;
                      existing.history.unshift({ date: new Date().toISOString(), score: scorePercent, difficulty: q.difficulty || 'Medium' });
                      mapObj.set(key, existing);
                      localStorage.setItem(storageKey, JSON.stringify(Array.from(mapObj.entries())));
                    } catch { /* localStorage write failure is non-critical */ }
                  }

                  // Submit to backend (fire-and-forget)
                  if (q.generatedQuizId) {
                    try {
                      const questionMap = new Map(
                        (q.loadedQuestions || []).map((lq) => [lq.id, lq])
                      );
                      const submitAnswers = answers.map((a) => {
                        const currentQuestion = questionMap.get(a.questionId);
                        const selected_index = a.selectedOptionIndex ?? (currentQuestion?.options && currentQuestion.options.findIndex((opt) => opt === a.answer) !== -1 ? currentQuestion.options.findIndex((opt) => opt === a.answer) : 0);
                        return { question_id: a.questionId, selected_index };
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
                      toast.success(`Score: ${scorePercent}%`);
                    }
                  }
                };
                setSelectedQuiz(quiz);
              }}
              searchQuery={searchQuery}
              atRiskTopics={normalizedRiskTopics}
            />
          ) : activeTab === 'teacher_uploaded' ? (
            <div className="space-y-6">
              {/* Teacher Materials Hero Banner */}
              <div className="rounded-3xl bg-gradient-to-r from-[#F08386]/12 via-[#9956DE]/10 to-transparent border border-[#F08386]/25 dark:border-[#F08386]/20 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F08386] to-[#D96B43] flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
                    <BookUser size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                        Teacher-Assigned Modules & Interventions
                      </h2>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black border border-rose-200 dark:border-rose-800/40">
                        <Sparkles size={11} /> Custom Learning
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                      Tailored lesson units, remedial study guides, and alternative learning materials uploaded directly by your teachers.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
                  <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs whitespace-nowrap shrink-0">
                    {filteredTeacherModules.length} {filteredTeacherModules.length === 1 ? 'Module' : 'Modules'} Available
                  </span>
                </div>
              </div>

              {teacherModulesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mt-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse space-y-4">
                      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
                      <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : teacherModules.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/30">
                    <BookUser size={32} className="text-rose-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-black text-slate-800 dark:text-white mb-2">
                    No Teacher-Uploaded Modules Yet
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                    Your teachers haven't uploaded any custom modules for your section yet. As soon as your teacher creates an intervention or supplemental PDF, it will appear right here.
                  </p>
                </div>
              ) : filteredTeacherModules.length === 0 ? (
                <div className="text-center py-14 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-6">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Search size={22} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                    No matching teacher modules
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
                    Try adjusting your search query or subject filters to find what you're looking for.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSubjectFilter('all');
                      setQuarterFilter('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mt-4">
                  {filteredTeacherModules.map((mod) => (
                    <div
                      key={mod.moduleId}
                      onClick={() => setSelectedTeacherModule(mod)}
                      className="group relative cursor-pointer select-none transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* FOLDER TAB */}
                      <div className="absolute top-0 left-3 md:left-4 h-5 md:h-6 w-24 md:w-28 rounded-t-xl bg-gradient-to-r from-[#D96B43] to-[#E25C60] text-white font-black text-[9px] md:text-[10px] uppercase tracking-wider flex items-center justify-center shadow-xs border-t border-x border-white/20 whitespace-nowrap shrink-0">
                        {mod.quarter || 'MODULE'}
                      </div>

                      {/* FOLDER BODY */}
                      <div className="relative mt-4 md:mt-5 p-4 md:p-6 rounded-2xl md:rounded-[1.4rem] bg-gradient-to-br from-[#E25C60] via-[#D96B43] to-[#C94D3B] text-white shadow-[0_12px_28px_-8px_rgba(217,107,67,0.35)] hover:shadow-[0_18px_36px_-6px_rgba(217,107,67,0.45)] transition-all overflow-hidden flex flex-col justify-between min-h-[220px]">
                        {/* SPINE / TOP HIGHLIGHT */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 mix-blend-overlay bg-white/40" />

                        {/* BACKGROUND CIRCLES */}
                        <div className="absolute -bottom-8 right-[-20%] w-48 h-48 bg-white opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110 pointer-events-none" />
                        <div className="absolute bottom-4 right-12 w-32 h-32 bg-white opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110 delay-75 pointer-events-none" />

                        <div className="relative z-10 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="rounded-full border border-white/30 bg-black/20 backdrop-blur-md px-2.5 py-0.5 text-[9px] md:text-[10px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] whitespace-nowrap shrink-0 truncate max-w-[130px]">
                                {mod.subject}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9px] font-black border border-white/20 flex items-center gap-1 whitespace-nowrap shrink-0">
                                <GraduationCap size={10} className="shrink-0" />
                                <span className="whitespace-nowrap">Teacher Upload</span>
                              </span>
                            </div>

                            <h3 className="text-base md:text-lg font-display font-black leading-snug text-white drop-shadow-xs line-clamp-2 mb-1.5">
                              {mod.title}
                            </h3>

                            <p className="text-white/85 text-xs font-medium line-clamp-2 leading-relaxed mb-3 pr-2">
                              {mod.summary || `Specialized teacher intervention for ${mod.gradeLevel.startsWith('Grade') ? mod.gradeLevel : `Grade ${mod.gradeLevel}`}.`}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2 mt-auto">
                            <div className="flex items-center gap-1.5 text-white/90 text-[10px] md:text-[11px] font-bold shrink-0">
                              <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs whitespace-nowrap shrink-0">
                                {mod.sections?.length || 0} sections
                              </span>
                              {mod.practice?.length > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs whitespace-nowrap shrink-0">
                                  {mod.practice.length} items
                                </span>
                              )}
                            </div>
                            <span className="flex items-center gap-1 text-[11px] md:text-xs font-black text-white bg-white/25 hover:bg-white/35 px-3 py-1.5 rounded-xl backdrop-blur-xs transition-all border border-white/30 shadow-xs whitespace-nowrap shrink-0">
                              <span className="whitespace-nowrap">Open</span>
                              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5 shrink-0" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'modules' ? (
            <ModulesLibraryView
              modules={modulesWithProgress}
              onSelectModule={setSelectedModule}
              onPreviewSources={setSourcePreviewModule}
              isAtRisk={normalizedRiskTopics.length > 0 && hasCompletedDiagnostic}
              weakTopics={studentProfile?.assessmentResults?.weakTopics || []}
              onNotifyMe={handleNotifyMe}
            />
          ) : (
            <RecommendedModulesView
              modules={modulesWithProgress}
              fullPool={modulePool}
              onSelectModule={setSelectedModule}
              onPreviewSources={setSourcePreviewModule}
              isAtRisk={normalizedRiskTopics.length > 0 && hasCompletedDiagnostic}
              learningPath={learningPath}
              weakTopics={studentProfile?.assessmentResults?.weakTopics || []}
              onNotifyMe={handleNotifyMe}
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

              {/* DepEd SSHS Primary PDF Sources */}
              {(() => {
                const pdfList: Array<{ filename: string; storagePath: string; lessonTitle?: string }> = [];
                const seenPaths = new Set<string>();

                // 1. Module's own lesson list
                for (const l of sourcePreviewModule.lessons || []) {
                  // SAFETY: module lessons may contain dynamic storagePath and sourceFile metadata.
                  const sp = (l as any).storagePath;
                  // SAFETY: module lessons may contain dynamic sourceFile metadata.
                  const sf = (l as any).sourceFile || (sp ? sp.split('/').pop() : '');
                  if (sp && !seenPaths.has(sp)) {
                    seenPaths.add(sp);
                    pdfList.push({ filename: sf || sp.split('/').pop() || 'DepEd Module PDF', storagePath: sp, lessonTitle: l.title });
                  }
                }

                // 2. Canonical curriculum lessons mapped by module ID
                const canonicalLessons = getLessonsByModule(sourcePreviewModule.id);
                for (const l of canonicalLessons) {
                  const sp = l.storagePath;
                  const sf = l.sourceFile || (sp ? sp.split('/').pop() : '');
                  if (sp && !seenPaths.has(sp)) {
                    seenPaths.add(sp);
                    pdfList.push({ filename: sf || sp.split('/').pop() || 'DepEd Module PDF', storagePath: sp, lessonTitle: l.lessonTitle });
                  }
                }

                // 3. Fallback primary curriculum PDFs for the subject
                if (pdfList.length === 0) {
                  const subjectFallbackMap = {
                    'gen-math': {
                      filename: 'General Mathematics_LE.pdf',
                      storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Complete Course (Term 1)/PDF/General Mathematics_LE.pdf',
                    },
                    'business-math': {
                      filename: 'General Mathematics_LE.pdf',
                      storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Complete Course (Term 1)/PDF/General Mathematics_LE.pdf',
                    },
                    'stats-prob': {
                      filename: 'Full.pdf',
                      storagePath: 'curriculum/stat_prob/Full.pdf',
                    },
                  } as const;
                  // SAFETY: subjectId is constrained to known curriculum subject keys.
                  const fallback = subjectFallbackMap[sourcePreviewModule.subjectId as keyof typeof subjectFallbackMap];
                  if (fallback) {
                    pdfList.push(fallback);
                  }
                }

                return (
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        DepEd SSHS Curriculum Sources
                      </p>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Primary Source PDFs
                      </span>
                    </div>

                    <div className="space-y-2">
                      {pdfList.map((item, idx) => {
                        const fileUrl = getFirebaseStoragePdfUrl(item.storagePath);
                        return (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 hover:border-slate-300 transition-colors shadow-2xs"
                          >
                            <div className="min-w-0 flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/70 flex items-center justify-center shrink-0 mt-0.5 text-rose-600">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate font-mono" title={item.filename}>
                                  {item.filename}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                                  {item.storagePath}
                                </p>
                              </div>
                            </div>

                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shrink-0"
                            >
                              <span>Open PDF</span>
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sources & Attribution</p>
                <div className="mt-3 space-y-2">
                  {sourcePreviewModule.module_sources?.map((source) => (
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
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                    The learning materials and reference documents utilized within A Web-based AI-Driven Supplemental System in Learning Mathematics for Grade 11 General Mathematics are sourced from publicly accessible repositories of the Department of Education (DepEd), specifically the Schools Division Office (SDO) of Navotas.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    These materials are used strictly for non-commercial, academic research, and system testing purposes under the Fair Use Doctrine of the Intellectual Property Code of the Philippines (Republic Act No. 8293).
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    This platform is an independent academic capstone project. It is not officially affiliated with or endorsed by DepEd. Upon full implementation, the system's knowledge base will be updated to utilize the localized modules explicitly authorized by the partner institution.
                  </p>
                </div>
              </div>
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
  onNotifyMe?: (moduleId: string) => void;
}> = ({ modules, onSelectModule, onPreviewSources, isAtRisk = false, weakTopics = [], onNotifyMe }) => {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                onNotifyMe={onNotifyMe}
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
  learningPath?: LearningPathState;
  weakTopics?: string[];
  onNotifyMe?: (moduleId: string) => void;
}> = ({ modules, fullPool, onSelectModule, onPreviewSources, isAtRisk = false, learningPath = IDLE_LEARNING_PATH, weakTopics = [], onNotifyMe }) => {
  const inProgress = modules.filter((module) => module.progress > 0 && module.progress < 100);
  const suggested = (modules.length > 0 ? modules : fullPool).filter((module) => module.progress === 0).slice(0, 6);

  return (
    <div className="pr-2 space-y-10">
      {learningPath.status === 'loading' && (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin flex-shrink-0" />
          <p className="text-sm font-semibold text-sky-800">
            Building your personalized learning path from DepEd curriculum...
          </p>
        </div>
      )}

      {learningPath.status === 'ready' && (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 px-5 py-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-indigo-700 mb-2">
            Your Personalized Learning Path
          </p>
          <pre className="whitespace-pre-wrap text-sm text-indigo-900 font-medium leading-relaxed font-sans">
            {learningPath.status === 'ready' ? learningPath.context : null}
          </pre>
        </div>
      )}

      {inProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[14px] bg-[#FF8B8B]/10 flex items-center justify-center text-[20px] shadow-inner"><Flame size={20} className="text-orange-500" /></div>
            <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">Continue This Module</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                onNotifyMe={onNotifyMe}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                onNotifyMe={onNotifyMe}
              />
            )})}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModulesPage;
