import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { UserProgress, type StudentProfile } from '../types/models';
import ModuleFolderCard from './ModuleFolderCard';
import { type DiagnosticTopicKey, TOPIC_TO_MODULE_ID, normalizeDiagnosticTopic } from '../lib/diagnosticTopics';
import { type CurriculumModuleRuntime } from '../data/curriculumModules';

interface LearningPathProps {
  onNavigateToModules?: (moduleId?: string) => void;
  atRiskSubjects?: string[];
  priorityTopics?: DiagnosticTopicKey[];
  modules: CurriculumModuleRuntime[];
}

const LearningPath: React.FC<LearningPathProps> = ({
  onNavigateToModules,
  atRiskSubjects = [],
  priorityTopics = [],
  modules,
}) => {
  const { userProfile } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const normalizedRiskTopics = React.useMemo<DiagnosticTopicKey[]>(() => {
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

  const modulePool = React.useMemo(() => {
    if (normalizedRiskTopics.length === 0) return modules.slice(0, 3);

    const ranking = new Map<string, number>(
      normalizedRiskTopics.map((topic, index) => [TOPIC_TO_MODULE_ID[topic], index]),
    );

    return [...modules].sort((left, right) => {
      const leftRank = ranking.get(left.id) ?? Number.POSITIVE_INFINITY;
      const rightRank = ranking.get(right.id) ?? Number.POSITIVE_INFINITY;
      return leftRank - rightRank;
    }).slice(0, 3);
  }, [modules, normalizedRiskTopics]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    getUserProgress(userProfile.uid).then(setProgress).catch(console.error);
  }, [userProfile?.uid]);

  // Combine static module with progress data
  const modulesWithProgress = modulePool.slice(0, 3).map((mod) => {
    const moduleProgress = progress?.subjects?.[mod.subject]?.modulesProgress?.[mod.id];
    const totalLessons = mod.lessons.length;
    const progressPct = moduleProgress?.progress ??
      (totalLessons > 0
        ? Math.round(((moduleProgress?.lessonsCompleted?.length || 0) / totalLessons) * 100)
        : 0);

    return {
      ...mod,
      progress: progressPct,
      status: progressPct === 100 ? 'Completed' : progressPct > 0 ? 'In Progress' : 'Not Started',
    };
  });

  const hasStartedLearning = modulesWithProgress.some((module) => module.progress > 0);
  const learningPathHeading = hasStartedLearning ? 'Continue Learning' : 'Start Learning';

  return (
    <div className="pt-1 sm:pt-2 md:pt-3">
      <div className="flex justify-between items-center mb-3.5 sm:mb-4.5 md:mb-6 px-0">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl md:rounded-[14px] bg-gradient-to-b from-violet-500 to-indigo-600 border-t border-white/40 flex items-center justify-center text-white shadow-[0_2.5px_0_#4338ca,0_5px_12px_rgba(99,102,241,0.25)]">
            <BookOpen className="w-4 h-4 md:w-5 md:h-5 stroke-[2.3] drop-shadow-sm" />
          </div>
          <h2 className="font-display font-black text-lg md:text-[24px] text-slate-800 dark:text-white tracking-tight whitespace-nowrap">{learningPathHeading}</h2>
        </div>
        <button
          onClick={() => onNavigateToModules?.()}
          className="text-primary font-bold text-xs md:text-sm flex shrink-0 items-center gap-1 hover:gap-2 transition-all backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border border-purple-200/70 hover:border-purple-300 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl hover:bg-white shadow-sm whitespace-nowrap cursor-pointer active:scale-95"
        >
          View All <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
      </div>

      {/* Single-row horizontal side scroll on mobile and tablet, grid on desktop with generous headroom to prevent hover cropping */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 sm:gap-4.5 pt-3.5 sm:pt-4 pb-4 px-0 scrollbar-none lg:grid lg:grid-cols-3 lg:overflow-visible lg:gap-6 lg:pt-2 lg:pb-0">
        {modulesWithProgress.map((module, idx) => (
          <div key={module.id} className="w-[235px] sm:w-[265px] shrink-0 snap-start lg:w-full lg:shrink">
            <ModuleFolderCard
              module={module}
              index={idx}
              compact
              onClick={() => onNavigateToModules?.(module.id)}
              isAtRisk={normalizedRiskTopics.length > 0}
              badgeLabel={module.status !== 'Not Started' ? module.status : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningPath;