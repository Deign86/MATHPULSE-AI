import React, { useEffect, useState } from 'react';
import { ArrowRight, Play, Clock, AlertTriangle, CheckCircle, BookOpen, Target, Calculator, Compass, PieChart, Box, Percent, Infinity as InfinityIcon, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { subjects, getActiveSubjectIdsForGrade, type SubjectId } from '../data/subjects';
import { UserProgress, SubjectStats, type StudentProfile } from '../types/models';
import { getAllSubjectStats } from '../services/reviewService';

interface LearningPathProps {
  onNavigateToModules?: () => void;
  atRiskSubjects?: string[];
}

const LearningPath: React.FC<LearningPathProps> = ({ onNavigateToModules, atRiskSubjects = [] }) => {
  const { userProfile } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [subjectStats, setSubjectStats] = useState<Record<string, SubjectStats>>({});
  const studentGrade = (userProfile as StudentProfile | null)?.grade;
  const allowedSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const filteredSubjects = subjects.filter((subject) => allowedSubjectIds.includes(subject.id as SubjectId));

  useEffect(() => {
    if (!userProfile?.uid) return;
    getUserProgress(userProfile.uid).then(setProgress).catch(console.error);
    getAllSubjectStats().then(setSubjectStats).catch(console.error);
  }, [userProfile?.uid]);

  // Derive learning path modules from subjects data + real Firebase progress
  const modules = filteredSubjects.map((subject) => {
    const subjectProgress = progress?.subjects?.[subject.id];

    // Count total lessons across all modules in this subject
    const totalLessons = subject.modules.reduce((sum, m) => sum + m.lessons.length, 0);

    // Count completed lessons from Firebase
    const completedLessons = subjectProgress
      ? Object.values(subjectProgress.modulesProgress || {}).reduce(
          (sum, mp) => sum + (mp.lessonsCompleted?.length || 0),
          0
        )
      : 0;

    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Estimate total duration from lesson data
    const totalMinutes = subject.modules.reduce(
      (sum, m) => sum + m.lessons.reduce((ls, l) => {
        const mins = parseInt(l.duration) || 0;
        return ls + mins;
      }, 0),
      0
    );

    const status = progressPct === 100 ? 'Completed' : progressPct > 0 ? 'In Progress' : 'Not Started';

    return {
      id: subject.id,
      subjectId: subject.id,
      title: subject.title,
      subtitle: subject.description.split('.')[0], // First sentence
      duration: `${totalMinutes} mins`,
      icon: subject.icon,
      color: subject.color,
      iconColor: subject.iconColor,
      accentColor: subject.accentColor,
      status,
      progress: progressPct,
      totalLessons: totalLessons || 5, // fallback for styling
      totalTasks: subject.modules.reduce((sum, m) => sum + m.lessons.length * 2, 0) || 8,
      totalQuizzes: subject.modules.reduce((sum, m) => sum + m.quizzes.length, 0) || 2,
      rating: subjectStats[subject.id]?.averageRating || subject.rating || 5,
      reviewCount: subjectStats[subject.id]?.totalReviews || subject.reviewCount || 100,
    };
  });

  const getGridColsClass = (count: number): string => {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
  };

  const handleModuleClick = (module: typeof modules[0]) => {
    if (module.status !== 'Locked') {
      onNavigateToModules?.();
    }
  };

  const getStatusBadge = (module: typeof modules[0]) => {
    if (module.status === 'Locked') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#dde3eb] text-[#5a6578]">
          Locked
        </span>
      );
    }

    if (module.status === 'Completed') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 flex items-center gap-1">
          <CheckCircle size={12} />
          Completed
        </span>
      );
    }

    const isAtRisk = atRiskSubjects.includes(module.subjectId);

    if (isAtRisk) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
          <AlertTriangle size={12} />
          At Risk
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
        <CheckCircle size={12} />
        On Track
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-2xl lg:text-[28px] font-display font-semibold text-slate-800 tracking-tight">Your Learning Path</h2>
        <button 
          onClick={onNavigateToModules}
          className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      <div className={`grid ${getGridColsClass(modules.length)} gap-6`}>
        {modules.map((module) => {
          const Icon = module.icon;
          const isAtRisk = atRiskSubjects.includes(module.subjectId);
          
          const getCardStyle = (id: string) => {
            switch(id) {
              case 'gen-math': return { bg: 'bg-[#9956DE]', tags: ['Functions', 'Business Math', 'Logic'], level: 1 };
              case 'pre-calc': return { bg: 'bg-[#1FA7E1]', tags: ['Functions', 'Limits', 'Graphs'], level: 2 };
              case 'stats-prob': return { bg: 'bg-[#FFB356]', tags: ['Probability', 'Mean/Median', 'Charts'], level: 2 };
              case 'basic-calc': return { bg: 'bg-[#FB96BB]', tags: ['Derivatives', 'Integrals', 'Continuity'], level: 3 };
              default: return { bg: 'bg-[#7274ED]', tags: ['Math', 'Logic', 'Problem Solving'], level: 1 };
            }
          };
          const { bg, tags, level } = getCardStyle(module.subjectId);

          return (
            <div
              key={module.id}
              onClick={() => handleModuleClick(module)}
              className={`${bg} rounded-[2rem] p-5 min-h-[290px] h-full relative overflow-hidden transition-all duration-300 ease-out cursor-pointer flex flex-col group hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] ${
                module.status === 'Locked' ? 'opacity-70 cursor-not-allowed grayscale-[30%]' : ''
              }`}
            >
              {/* Background Circles */}
              <div className="absolute -bottom-8 right-[-20%] w-48 h-48 bg-white opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute bottom-4 right-12 w-32 h-32 bg-white opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110 delay-75" />
              
              {/* Top Row: Icon & Level */}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 rounded-[1rem] bg-white/20 flex flex-shrink-0 items-center justify-center text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                  <Icon size={24} className="opacity-90" />
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/20 text-white/90 text-sm font-bold backdrop-blur-sm">
                  Lv {level}
                </div>
              </div>
              
              {/* Title & Tags */}
              <div className="relative z-10 flex-1">
                 <h3 className="text-2xl font-display font-black text-white leading-[1.1] mb-3 drop-shadow-sm pr-4 line-clamp-3">
                   {module.title}
                 </h3>
                 <div className="flex flex-wrap gap-2 pb-6">
                   {tags.map(tag => (
                     <span key={tag} className="px-3 py-1 rounded-full bg-white/20 text-white text-[13px] font-bold shadow-sm backdrop-blur-sm">
                       {tag}
                     </span>
                   ))}
                 </div>
              </div>

              {/* Bottom Section: Progress & Stats */}
              <div className="relative z-10 mt-auto pt-4 flex flex-col gap-2.5">
                 <div className="flex justify-between text-white/90 text-[13px] font-bold">
                    <div className="flex items-center gap-1.5">
                       <Clock size={14} /> {module.duration} total
                    </div>
                    <div className="flex items-center gap-1 tracking-widest text-[#fff]">
                       {'★'.repeat(Math.floor(module.rating))}
                       <span className="opacity-50">{'★'.repeat(5 - Math.floor(module.rating))}</span> 
                       <span className="tracking-normal ml-0.5">{module.rating.toFixed(1)}</span>
                    </div>
                 </div>
                 
                 <div className="flex justify-between text-white font-black text-sm tracking-wide mt-1">
                    <span>Progress</span>
                    <span>{module.progress > 0 ? module.progress : 17} / {module.totalTasks + module.totalLessons} tasks</span>
                 </div>
                 
                 <div className="w-full h-2 rounded-full bg-white/30 overflow-hidden shadow-inner mt-1">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-1000 ease-out" 
                      style={{width: `${module.progress > 0 ? module.progress : 33}%`}} 
                    />
                 </div>
                 
                 {isAtRisk && (
                    <div className="absolute -top-12 right-0 bg-red-500 text-white px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-lg animate-pulse">
                      <AlertTriangle size={12} /> At Risk
                    </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LearningPath;