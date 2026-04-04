import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { subjects, getActiveSubjectIdsForGrade, type SubjectId } from '../data/subjects';
import { UserProgress, type StudentProfile } from '../types/models';
import ModuleFolderCard from './ModuleFolderCard';

interface LearningPathProps {
  onNavigateToModules?: (moduleId?: string) => void;
  atRiskSubjects?: string[];
}

const LearningPath: React.FC<LearningPathProps> = ({ onNavigateToModules, atRiskSubjects = [] }) => {
  const { userProfile } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  
  const studentGrade = (userProfile as StudentProfile | null)?.grade;
  const allowedSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const gradeScopedSubjects = subjects.filter((subject) => allowedSubjectIds.includes(subject.id as SubjectId));
  
  const generalMathSubject = gradeScopedSubjects.find((s) => s.id === 'gen-math') ?? gradeScopedSubjects[0];
  const modulePool = generalMathSubject?.modules ?? [];

  useEffect(() => {
    if (!userProfile?.uid) return;
    getUserProgress(userProfile.uid).then(setProgress).catch(console.error);
  }, [userProfile?.uid]);

  // Combine static module with progress data
  const modulesWithProgress = modulePool.slice(0, 3).map(mod => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {modulesWithProgress.map((module, idx) => (
          <ModuleFolderCard 
            key={module.id} 
            module={module} 
            index={idx}
            onClick={() => onNavigateToModules?.(module.id)} 
            isAtRisk={atRiskSubjects.includes(generalMathSubject.id)}
            badgeLabel={module.status !== 'Not Started' ? module.status : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default LearningPath;