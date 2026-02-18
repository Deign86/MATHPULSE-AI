import React from 'react';
import { Calculator, Sigma, Shapes, BarChart3, ArrowRight, Play, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface LearningPathProps {
  onNavigateToModules?: () => void;
  atRiskSubjects?: string[];
}

const LearningPath: React.FC<LearningPathProps> = ({ onNavigateToModules, atRiskSubjects = [] }) => {
  const modules = [
    {
      id: 1,
      subjectId: 'general-math',
      title: 'General Mathematics',
      subtitle: 'Number Systems & Algebra',
      duration: '45 mins',
      icon: Calculator,
      color: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      accentColor: 'bg-indigo-500',
      status: 'In Progress',
      progress: 60
    },
    {
      id: 2,
      subjectId: 'pre-calculus',
      title: 'Pre-Calculus',
      subtitle: 'Functions & Polynomials',
      duration: '60 mins',
      icon: Sigma,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      accentColor: 'bg-purple-500',
      status: 'Due Tomorrow',
      progress: 15
    },
    {
      id: 3,
      subjectId: 'basic-calculus',
      title: 'Basic Calculus',
      subtitle: 'Limits & Derivatives',
      duration: '30 mins',
      icon: Shapes,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
      accentColor: 'bg-orange-500',
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
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-500">
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
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Your Learning Path</h2>
        <button 
          onClick={onNavigateToModules}
          className="text-indigo-600 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((module) => (
          <div 
            key={module.id}
            onClick={() => handleModuleClick(module)}
            className={`${module.color} p-6 rounded-3xl transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1 group ${
              module.status === 'Locked' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            } border ${
               atRiskSubjects.includes(module.subjectId) && module.status !== 'Locked' ? 'border-red-200 ring-1 ring-red-100' : 'border-white/50'
            } flex flex-col`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 ${module.color} brightness-95 rounded-2xl flex items-center justify-center ${module.iconColor}`}>
                <module.icon size={24} />
              </div>
              {getStatusBadge(module)}
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-1">{module.title}</h3>
              <p className="text-slate-500 text-sm mb-3">{module.subtitle}</p>
              
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Clock size={14} />
                <span>{module.duration} lesson</span>
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex justify-between items-end mb-2">
                 <span className="text-xs font-bold text-slate-500">Progress</span>
                 <span className="text-xs font-bold text-slate-800">{module.progress}%</span>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${module.accentColor} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${module.progress}%` }}
                    ></div>
                  </div>
                </div>
                <button className={`w-10 h-10 ${module.accentColor} rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/5 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100`}>
                  <Play size={16} fill="currentColor" />
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