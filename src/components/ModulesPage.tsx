import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Search,
  Target,
  TrendingUp,
  Layers,
  AlertTriangle,
  Play,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ModuleFolderCard from './ModuleFolderCard';
import ModuleDetailView from './ModuleDetailView';
import PracticeCenter from './PracticeCenter';
import QuizExperience from './QuizExperience';
import { Quiz as QuizExperienceQuiz } from './QuizExperience';
import { subjects, getActiveSubjectIdsForGrade, type Module, type SubjectId } from '../data/subjects';
import { useAuth } from '../contexts/AuthContext';
import { type StudentProfile } from '../types/models';

interface ModulesPageProps {
  onEarnXP?: (xp: number, message: string) => void;
  atRiskSubjects?: string[];
  priorityTopics?: Array<'Functions' | 'BusinessMath' | 'Logic'>;
  initialModuleId?: string | null;
}

type ModulesTab = 'modules' | 'recommended' | 'practice';

type DiagnosticTopicKey = 'Functions' | 'BusinessMath' | 'Logic';

const TOPIC_TO_MODULE_ID: Record<DiagnosticTopicKey, string> = {
  Functions: 'gm-1',
  BusinessMath: 'gm-2',
  Logic: 'gm-3',
};

const DIAGNOSTIC_TOPIC_LABELS: Record<DiagnosticTopicKey, string> = {
  Functions: 'Functions and Graphs',
  BusinessMath: 'Business and Financial Mathematics',
  Logic: 'Logic and Reasoning',
};

const normalizeDiagnosticTopic = (value: string): DiagnosticTopicKey | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'functions' || normalized.includes('function')) return 'Functions';
  if (normalized === 'businessmath' || normalized.includes('business')) return 'BusinessMath';
  if (normalized === 'logic' || normalized.includes('reason')) return 'Logic';
  return null;
};

const ModulesPage: React.FC<ModulesPageProps> = ({
  onEarnXP,
  atRiskSubjects = [],
  priorityTopics = [],
  initialModuleId = null,
}) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ModulesTab>('modules');
  
  const studentGrade = (userProfile as StudentProfile | null)?.grade;
  const allowedSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const gradeScopedSubjects = subjects.filter((subject) => allowedSubjectIds.includes(subject.id as SubjectId));
  
  const initialModule = initialModuleId 
    ? gradeScopedSubjects.flatMap(s => s.modules).find(m => m.id === initialModuleId) || null
    : null;

  const [selectedModule, setSelectedModule] = useState<Module | null>(initialModule);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizExperienceQuiz | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle navigation from initialModuleId when component is already mounted
  useEffect(() => {
    if (initialModuleId) {
      const foundMod = gradeScopedSubjects.flatMap(s => s.modules).find(m => m.id === initialModuleId);
      if (foundMod) setSelectedModule(foundMod);
    }
  }, [initialModuleId]);

  // Module-first UX: we always anchor to General Mathematics when present.
  const generalMathSubject = gradeScopedSubjects.find((subject) => subject.id === 'gen-math') ?? gradeScopedSubjects[0] ?? null;

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

  const modulePool = useMemo(() => {
    const base = generalMathSubject?.modules ?? [];
    if (normalizedRiskTopics.length === 0) return base;

    const ranking = new Map<string, number>(
      normalizedRiskTopics.map((topic, index) => [TOPIC_TO_MODULE_ID[topic], index]),
    );

    return [...base].sort((left, right) => {
      const leftRank = ranking.get(left.id) ?? Number.POSITIVE_INFINITY;
      const rightRank = ranking.get(right.id) ?? Number.POSITIVE_INFINITY;
      return leftRank - rightRank;
    });
  }, [generalMathSubject?.modules, normalizedRiskTopics]);

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return modulePool;

    return modulePool.filter((module) => {
      const titleMatch = module.title.toLowerCase().includes(query);
      const descMatch = module.description.toLowerCase().includes(query);
      const lessonMatch = module.lessons.some((lesson) => lesson.title.toLowerCase().includes(query));
      const quizMatch = module.quizzes.some((quiz) => quiz.title.toLowerCase().includes(query));
      return titleMatch || descMatch || lessonMatch || quizMatch;
    });
  }, [modulePool, searchQuery]);

  const handleQuizComplete = (score: number, xpEarned: number) => {
    if (onEarnXP) {
      onEarnXP(xpEarned, `Quiz Completed! +${xpEarned} XP`);
    }
    setSelectedQuiz(null);
  };

  if (selectedQuiz) {
    return (
      <QuizExperience
        quiz={selectedQuiz}
        onClose={() => setSelectedQuiz(null)}
        onComplete={handleQuizComplete}
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
      />
    );
  }

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div className="flex-1 max-w-3xl">
            <h1 className="text-[36px] md:text-[44px] font-display font-black text-[#202124] tracking-tight leading-[1.1] mb-4">
              Explore Modules
            </h1>
            <p className="text-[#3c4043] text-[16px] md:text-[17px] leading-[1.7] md:pr-10">
              Welcome to your personalized learning hub for <span className="font-bold text-indigo-700">General Mathematics</span>. These modules are organized directly under the subject so you can jump straight into lessons and assessments without extra steps. MathPulse AI adapts challenge level and quiz support as you progress, helping you master each module with focus and momentum.
            </p>
          </div>

            <div className="hidden md:flex flex-shrink-0 items-center justify-end w-[350px]">
              <svg viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm">
                {/* Character Base */}
                <circle cx="210" cy="90" r="45" fill="#202124" />
                <path d="M165 90 C165 65.1472 185.147 45 210 45 C234.853 45 255 65.1472 255 90 C255 114.853 234.853 135 210 135 C185.147 135 165 114.853 165 90 Z" fill="#202124"/>

                {/* Hair/Body */}
                <path d="M150 140 C140 120 160 80 200 70 C240 60 260 80 270 120 C275 140 260 180 210 180 C160 180 155 160 150 140 Z" fill="#202124"/>

                {/* Face */}
                <path d="M210 125 C195 125 185 110 185 95 C185 80 200 72 215 72 C230 72 245 80 245 95 C245 115 225 125 210 125 Z" fill="#e8eaed"/>
                <circle cx="202" cy="92" r="2" fill="#202124"/>
                <circle cx="225" cy="92" r="2" fill="#202124"/>
                <path d="M210 105 Q 215 110 220 105" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <path d="M198 86 Q 202 84 206 86" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <path d="M220 86 Q 225 84 230 86" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

                {/* Earrings */}
                <circle cx="180" cy="100" r="6" stroke="#202124" strokeWidth="2" fill="none"/>
                <circle cx="248" cy="100" r="6" stroke="#202124" strokeWidth="2" fill="none"/>

                {/* Shirt */}
                <path d="M175 180 L 180 135 C185 125 235 125 240 135 L 245 180 Z" fill="#f8f9fa"/>
                <path d="M175 180 L 180 135 C185 125 235 125 240 135 L 245 180 Z" stroke="#202124" strokeWidth="2" fill="none"/>

                {/* Laptop */}
                <path d="M170 178 L 220 178 L 230 130 L 180 130 Z" fill="white" stroke="#202124" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M160 178 L 250 178" stroke="#202124" strokeWidth="2" strokeLinecap="round"/>
                <path d="M195 130 C195 130 190 155 180 170" stroke="#202124" strokeWidth="2" strokeLinecap="round" fill="none"/>

                {/* Floating Elements (Left) */}
                <circle cx="120" cy="50" r="14" fill="white" stroke="#202124" strokeWidth="1.5"/>
                <path d="M112 50 L 128 50 M 120 42 L 120 58 M 115 45 L 125 55 M 115 55 L 125 45" stroke="#202124" strokeWidth="1"/>
                <rect x="135" cy="55" width="16" height="12" rx="2" fill="white" stroke="#202124" strokeWidth="1.5" y="45"/>
                <path d="M140 50 h6 M140 53 h4" stroke="#202124" strokeWidth="1" strokeLinecap="round"/>

                {/* Floating Graph (Right) */}
                <circle cx="50" cy="110" r="4" fill="#202124"/>
                <circle cx="80" cy="70" r="3" fill="#1FA7E1"/>
                <circle cx="30" cy="80" r="3" fill="#1FA7E1"/>
                <circle cx="85" cy="140" r="3" fill="#1FA7E1"/>
                <circle cx="100" cy="100" r="3" fill="#1FA7E1"/>
                <circle cx="20" cy="130" r="3" fill="#1FA7E1"/>
                <path d="M50 110 L80 70 M50 110 L30 80 M50 110 L85 140 M50 110 L100 100 M50 110 L20 130" stroke="#1FA7E1" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <path d="M100 35 L 105 25 L 110 35 L 100 35 Z" fill="white" stroke="#202124" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M40 40 L 45 40 L 42.5 35 Z" fill="#202124"/>
              </svg>
            </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#5f6368]">
            <Search size={22} strokeWidth={2.5} />
          </div>
          <input
            id="modules-search"
            name="modules-search"
            aria-label="Search modules"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules, lessons, or assessments..."
            className="w-full pl-16 pr-6 py-4 rounded-full border border-[#dadce0] bg-white text-[#202124] text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center bg-slate-100/80 p-1.5 rounded-full border border-slate-200/60 shadow-inner gap-1 w-max overflow-x-auto max-w-full no-scrollbar">
          {[
            { id: 'modules', label: 'Modules', icon: BookOpen, color: 'text-[#1FA7E1]' },
            { id: 'recommended', label: 'Recommended', icon: TrendingUp, color: 'text-[#75D06A]' },
            { id: 'practice', label: 'Practice', icon: Target, color: 'text-[#FFB356]' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ModulesTab)}
                className={`relative flex items-center gap-2.5 px-6 py-3 rounded-full text-[15px] font-bold transition-all duration-300 flex-shrink-0 ${
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
                <span className={`relative z-10 flex items-center gap-2 ${isActive ? tab.color : ''}`}>
                  <tab.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {normalizedRiskTopics.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
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
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto"
        >
          {activeTab === 'practice' ? (
            <PracticeCenter onStartQuiz={setSelectedQuiz} searchQuery={searchQuery} allowedSubjectIds={allowedSubjectIds} />
          ) : activeTab === 'modules' ? (
            <ModulesLibraryView modules={filteredModules} onSelectModule={setSelectedModule} isAtRisk={normalizedRiskTopics.length > 0} />
          ) : (
            <RecommendedModulesView modules={filteredModules} fullPool={modulePool} onSelectModule={setSelectedModule} isAtRisk={normalizedRiskTopics.length > 0} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const ModulesLibraryView: React.FC<{
  modules: Module[];
  onSelectModule: (module: Module) => void;
  isAtRisk?: boolean;
}> = ({ modules, onSelectModule, isAtRisk = false }) => {
  return (
    <div className="h-full overflow-y-auto pr-2 pb-8 scrollbar-hide space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-inner">
            <Layers size={20} strokeWidth={2.5} />
          </div>
          <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">General Mathematics Modules</h2>
        </div>

        {modules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#dde3eb] p-8 text-center">
            <p className="text-slate-700 font-semibold">No matching modules found.</p>
            <p className="mt-2 text-sm text-slate-500">
              If modules are not yet available for your selected view, this area will unlock after assessment sync and content rollout.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
            {modules.map((module, index) => (
              <ModuleFolderCard
                key={module.id}
                module={module}
                index={index}
                onClick={() => onSelectModule(module)}
                isAtRisk={isAtRisk}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RecommendedModulesView: React.FC<{
  modules: Module[];
  fullPool: Module[];
  onSelectModule: (module: Module) => void;
  isAtRisk?: boolean;
}> = ({ modules, fullPool, onSelectModule, isAtRisk = false }) => {
  const inProgress = modules.filter((module) => module.progress > 0 && module.progress < 100);
  const suggested = (modules.length > 0 ? modules : fullPool).filter((module) => module.progress === 0).slice(0, 6);

  return (
    <div className="h-full overflow-y-auto pr-2 pb-8 space-y-10 scrollbar-hide">
      {inProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[14px] bg-[#FF8B8B]/10 flex items-center justify-center text-[20px] shadow-inner">🔥</div>
            <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">Continue This Module</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
            {inProgress.slice(0, 4).map((module, index) => (
              <ModuleFolderCard
                key={module.id}
                module={module}
                index={index}
                onClick={() => onSelectModule(module)}
                isAtRisk={isAtRisk}
                badgeLabel="In Progress"
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[14px] bg-[#75D06A]/10 flex items-center justify-center text-[20px] shadow-inner">
            <Sparkles size={19} className="text-[#75D06A]" />
          </div>
          <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">Suggested Next</h2>
        </div>
        {suggested.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#dde3eb] p-8 text-center text-slate-500 font-medium">
            You are all caught up. Practice more quizzes to unlock additional recommendations.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
            {suggested.map((module, index) => (
              <ModuleFolderCard
                key={module.id}
                module={module}
                index={index}
                onClick={() => onSelectModule(module)}
                isAtRisk={isAtRisk}
                badgeLabel="Start"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModulesPage;
