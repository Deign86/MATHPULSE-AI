import React, { useEffect, useState } from 'react';
import { ArrowRight, Play, Clock, AlertTriangle, CheckCircle, BookOpen, Target, Calculator, Compass, PieChart, Box, Percent, Infinity as InfinityIcon, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { subjects } from '../data/subjects';
import { UserProgress, SubjectStats } from '../types/models';
import { getAllSubjectStats } from '../services/reviewService';

interface LearningPathProps {
  onNavigateToModules?: () => void;
  atRiskSubjects?: string[];
}

const LearningPath: React.FC<LearningPathProps> = ({ onNavigateToModules, atRiskSubjects = [] }) => {
  const { userProfile } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [subjectStats, setSubjectStats] = useState<Record<string, SubjectStats>>({});

  useEffect(() => {
    if (!userProfile?.uid) return;
    getUserProgress(userProfile.uid).then(setProgress).catch(console.error);
    getAllSubjectStats().then(setSubjectStats).catch(console.error);
  }, [userProfile?.uid]);

  // Derive learning path modules from subjects data + real Firebase progress
  const modules = subjects.map((subject) => {
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-display font-bold text-[#0a1628]">Your Learning Path</h2>
        <button 
          onClick={onNavigateToModules}
          className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          const isAtRisk = atRiskSubjects.includes(module.subjectId);
          const cardGradient = module.subjectId === 'gen-math' ? 'bg-gradient-to-br from-pink-400 to-pink-500' :
                               module.subjectId === 'pre-calc' ? 'bg-gradient-to-br from-indigo-500 to-violet-600' :
                               module.subjectId === 'stats-prob' ? 'bg-gradient-to-br from-amber-200 to-yellow-400' :
                               'bg-gradient-to-br from-sky-400 to-blue-500';
                               
          const textColor = module.subjectId === 'stats-prob' ? 'text-[#0a1628]' : 'text-white';
          const mutedText = module.subjectId === 'stats-prob' ? 'text-[#0a1628]/70' : 'text-white/80';
          const bubbleColor = module.subjectId === 'stats-prob' ? 'bg-white/40' : 'bg-white/20';

          return (
            <div
              key={module.id}
              onClick={() => handleModuleClick(module)}
              className={`${cardGradient} rounded-[2rem] p-6 h-56 relative overflow-hidden card-elevated shadow-sm hover:card-elevated-lg transition-all cursor-pointer flex flex-col justify-between group ${
                module.status === 'Locked' ? 'opacity-70 cursor-not-allowed grayscale-[30%]' : ''
              }`}
            >
              {/* Scattered Graphics Elements */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                 {/* Background bubbles */}
                 <div className={`absolute top-6 right-24 w-4 h-4 rounded-full ${bubbleColor} animate-pulse`} />
                 <div className={`absolute bottom-12 right-1/2 w-8 h-8 rounded-full ${bubbleColor}`} />
                 <div className={`absolute top-1/3 right-8 w-6 h-6 rounded-full ${bubbleColor}`} />
                 
                 {/* Main huge graphic */}
                 <div className={`absolute -bottom-8 -right-6 w-40 h-40 ${bubbleColor} rounded-full mix-blend-overlay opacity-50`}></div>
                 <div className={`absolute -bottom-4 -right-2 transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500 ${textColor}`}>
                   <Icon size={120} className="opacity-90 drop-shadow-xl" />
                 </div>
                 
                 {/* Scattered small icons depending on subject */}
                 <div className={`absolute top-8 right-8 ${textColor} opacity-60 animate-bounce`} style={{ animationDuration: '3s' }}>
                    {module.subjectId === 'gen-math' ? <Calculator size={24} /> : 
                     module.subjectId === 'pre-calc' ? <Compass size={24} /> : 
                     module.subjectId === 'stats-prob' ? <PieChart size={24} /> : <Box size={24} />}
                 </div>
                 <div className={`absolute top-1/2 right-28 ${textColor} opacity-50 animate-bounce`} style={{ animationDuration: '4s', animationDelay: '1s' }}>
                    {module.subjectId === 'gen-math' ? <Percent size={32} /> : 
                     module.subjectId === 'pre-calc' ? <InfinityIcon size={32} /> : 
                     module.subjectId === 'stats-prob' ? <Target size={32} /> : <Layers size={32} />}
                 </div>
              </div>
              
              {/* Front Content */}
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    {/* Star Rating and Duration */}
                    <div className="flex items-center gap-1 text-orange-400 mb-1.5">
                      {'★'.repeat(Math.round(module.rating))}
                      <span className={`text-xs ml-1 ${mutedText}`}>({module.reviewCount})</span>
                    </div>
                    
                    <div className={`text-xs font-semibold tracking-wide flex items-center gap-1.5 mb-3 ${mutedText}`}>
                       <Clock size={14} /> {module.duration} total
                    </div>
                    
                    <div className={`text-xs font-semibold tracking-wide ${mutedText}`}>
                       {module.totalLessons} / {module.totalTasks + module.totalLessons} tasks • {module.progress}%
                    </div>
                  </div>
                  
                  {/* At Risk Badge or Locked Icon */}
                  {module.status === 'Locked' ? (
                     <div className="bg-slate-800/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md z-20 border border-white/10">
                       Locked
                     </div>
                  ) : isAtRisk && (
                    <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md z-20">
                      <AlertTriangle size={12} />
                      At Risk
                    </div>
                  )}
                </div>
                
                <div>
                   <h3 className={`text-[1.7rem] font-display font-bold ${textColor} leading-tight drop-shadow-sm pr-16 line-clamp-2`}>{module.title}</h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LearningPath;