import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { subjects, getActiveSubjectIdsForGrade, type SubjectId } from '../data/subjects';
import { UserProgress, type StudentProfile } from '../types/models';
import ModuleFolderCard from './ModuleFolderCard';

type DiagnosticTopicKey = 'Functions' | 'BusinessMath' | 'Logic';

const TOPIC_TO_MODULE_ID: Record<DiagnosticTopicKey, string> = {
  Functions: 'gm-1',
  BusinessMath: 'gm-2',
  Logic: 'gm-3',
};

const normalizeDiagnosticTopic = (value: string): DiagnosticTopicKey | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'functions' || normalized.includes('function')) return 'Functions';
  if (normalized === 'businessmath' || normalized.includes('business')) return 'BusinessMath';
  if (normalized === 'logic' || normalized.includes('reason')) return 'Logic';
  return null;
};

interface LearningPathProps {
  onNavigateToModules?: (moduleId?: string) => void;
  atRiskSubjects?: string[];
  priorityTopics?: DiagnosticTopicKey[];
}

const LearningPath: React.FC<LearningPathProps> = ({
  onNavigateToModules,
  atRiskSubjects = [],
  priorityTopics = [],
}) => {
  const { userProfile } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  
  const studentGrade = (userProfile as StudentProfile | null)?.grade;
  const allowedSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const gradeScopedSubjects = subjects.filter((subject) => allowedSubjectIds.includes(subject.id as SubjectId));
  
  const generalMathSubject = gradeScopedSubjects.find((s) => s.id === 'gen-math') ?? gradeScopedSubjects[0];

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

  useEffect(() => {
    if (!userProfile?.uid) return;
    getUserProgress(userProfile.uid).then(setProgress).catch(console.error);
  }, [userProfile?.uid]);

  // Combine static module with progress data
  const modulesWithProgress = modulePool.slice(0, 4).map(mod => {
    const subjectProgress = progress?.subjects?.[generalMathSubject.id];
    const modProgress = subjectProgress?.modulesProgress?.[mod.id];
    const completedLessonsCount = modProgress?.lessonsCompleted?.length || 0;
    const progressPct = mod.lessons.length > 0 
       ? Math.round((completedLessonsCount / mod.lessons.length) * 100) 
       : 0;

    return {
      ...mod,
      progress: progressPct,
      status: progressPct === 100 ? 'Completed' : progressPct > 0 ? 'In Progress' : 'Not Started'
    };
  });

  const hasStartedLearning = modulesWithProgress.some((module) => module.progress > 0);
  const learningPathHeading = hasStartedLearning ? 'Continue Learning' : 'Start Learning';

  return (
    <div>
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-inner">
            <BookOpen size={20} strokeWidth={2.5} />
          </div>
          <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">{learningPathHeading}</h2>
        </div>
        <button 
          onClick={() => onNavigateToModules?.()}
          className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
        {modulesWithProgress.map((module, idx) => (
          <ModuleFolderCard 
            key={module.id} 
            module={module} 
            index={idx}
            onClick={() => onNavigateToModules?.(module.id)} 
            isAtRisk={normalizedRiskTopics.length > 0}
            badgeLabel={module.status !== 'Not Started' ? module.status : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default LearningPath;