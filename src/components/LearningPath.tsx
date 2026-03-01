import React from 'react';
import { Calculator, Sigma, TrendingUp, BarChart3, ArrowRight, Play, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface LearningPathProps {
  onNavigateToModules?: () => void;
  atRiskSubjects?: string[];
}

const LearningPath: React.FC<LearningPathProps> = ({ onNavigateToModules, atRiskSubjects = [] }) => {
  const modules = [
    {
      id: 1,
      subjectId: 'gen-math',
      title: 'General Mathematics',
      subtitle: 'Functions, Business Math & Logic',
      duration: '45 mins',
      icon: Calculator,
      color: 'bg-sky-50',
      iconColor: 'text-sky-600',
      accentColor: 'bg-sky-500',
      status: 'Not Started',
      progress: 0
    },
    {
      id: 2,
      subjectId: 'stats-prob',
      title: 'Statistics & Probability',
      subtitle: 'Random Variables & Distributions',
      duration: '50 mins',
      icon: BarChart3,
      color: 'bg-rose-50',
      iconColor: 'text-rose-600',
      accentColor: 'bg-rose-500',
      status: 'Not Started',
      progress: 0
    },
    {
      id: 3,
      subjectId: 'pre-calc',
      title: 'Pre-Calculus',
      subtitle: 'Analytic Geometry & Trigonometry',
      duration: '60 mins',
      icon: TrendingUp,
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accentColor: 'bg-emerald-500',
      status: 'Not Started',
      progress: 0
    },
    {
      id: 4,
      subjectId: 'basic-calc',
      title: 'Basic Calculus',
      subtitle: 'Limits, Derivatives & Integrals',
      duration: '30 mins',
      icon: Sigma,
      color: 'bg-rose-50',
      iconColor: 'text-rose-600',
      accentColor: 'bg-rose-500',
      status: 'Not Started',
      progress: 0
    }
  ];

  const handleModuleClick = (module: typeof modules[0]) => {
    if (module.status !== 'Locked') {
      onNavigateToModules?.();
    }
  };

  const getStatusBadge = (module: typeof modules[0]) => {
    // If locked, keep locked status
    if (module.status === 'Locked') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#dde3eb] text-[#5a6578]">
          Locked
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
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-display font-bold text-[#0a1628]">Your Learning Path</h2>
        <button 
          onClick={onNavigateToModules}
          className="text-sky-600 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {modules.map((module) => (
          <div 
            key={module.id}
            onClick={() => handleModuleClick(module)}
            className={`${module.color} p-3 rounded-xl transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1 group ${
              module.status === 'Locked' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            } border ${
               atRiskSubjects.includes(module.subjectId) && module.status !== 'Locked' ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-300'
            } flex flex-col`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`w-9 h-9 ${module.color} brightness-95 rounded-lg flex items-center justify-center ${module.iconColor}`}>
                <module.icon size={18} />
              </div>
              {getStatusBadge(module)}
            </div>

            <div className="mb-2">
              <h3 className="text-base font-display font-bold text-[#0a1628] mb-0.5">{module.title}</h3>
              <p className="text-[#5a6578] text-xs mb-1.5">{module.subtitle}</p>
              
              <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                <Clock size={12} />
                <span>{module.duration} lesson</span>
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex justify-between items-end mb-2">
                 <span className="text-xs font-bold text-[#5a6578]">Progress</span>
                 <span className="text-xs font-bold text-[#0a1628]">{module.progress}%</span>
              </div>
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="h-1.5 bg-white rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${module.accentColor} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${module.progress}%` }}
                    ></div>
                  </div>
                </div>
                <button className={`w-8 h-8 ${module.accentColor} rounded-lg flex items-center justify-center text-white shadow-lg shadow-black/5 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100`}>
                  <Play size={14} fill="currentColor" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningPath;