import React from 'react';
import { ArrowLeft, BookOpen, Trophy, Clock, Play, CheckCircle, Lock, Star, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Subject, Module } from '../data/subjects';

interface SubjectDetailViewProps {
  subject: Subject;
  onBack: () => void;
  onSelectModule: (module: Module) => void;
}

const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({ subject, onBack, onSelectModule }) => {
  const Icon = subject.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold mb-4 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Subjects
        </button>

        {/* Subject Hero Banner */}
        <div className={`${subject.color} rounded-3xl p-8 border border-white/50 shadow-lg relative overflow-hidden`}>
          <div className="absolute right-8 top-8 opacity-10">
            <Icon size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 ${subject.color} brightness-95 rounded-xl mb-4`}>
                  <Icon size={20} className={subject.iconColor} />
                  <span className={`text-sm font-bold ${subject.iconColor}`}>{subject.title}</span>
                </div>
                <p className="text-slate-600 max-w-2xl leading-relaxed">
                  {subject.description}
                </p>
              </div>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className={subject.iconColor} />
                  <span className="text-xs font-bold text-slate-500">Total Modules</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{subject.totalModules}</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={18} className="text-teal-600" />
                  <span className="text-xs font-bold text-slate-500">Completed</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{subject.completedModules}</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={18} className="text-amber-600" />
                  <span className="text-xs font-bold text-slate-500">Progress</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{subject.progress}%</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-600">Overall Progress</span>
                <span className="text-xs font-bold text-slate-800">{subject.progress}%</span>
              </div>
              <div className="h-3 bg-white/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${subject.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full ${subject.accentColor} rounded-full`}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-4 scrollbar-hide">
        <h2 className="font-bold text-lg text-slate-800 mb-4">Modules ({subject.modules.length})</h2>
        
        {subject.modules.map((module, index) => {
          const completedLessons = module.lessons.filter(l => l.completed).length;
          const totalLessons = module.lessons.length;
          const completedQuizzes = module.quizzes.filter(q => q.completed).length;
          const totalQuizzes = module.quizzes.length;

          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelectModule(module)}
              className={`${module.color} rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01] group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-sm font-bold ${module.iconColor}`}>Module {index + 1}</span>
                    {module.progress === 100 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-bold">
                        <CheckCircle size={12} />
                        Completed
                      </div>
                    )}
                    {module.progress > 0 && module.progress < 100 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                        <Play size={12} />
                        In Progress
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2">{module.title}</h3>
                  <p className="text-sm text-slate-600 mb-4">{module.description}</p>

                  {/* Module Stats */}
                  <div className="flex items-center gap-6 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={14} />
                      <span className="font-medium">
                        {completedLessons}/{totalLessons} Lessons
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award size={14} />
                      <span className="font-medium">
                        {completedQuizzes}/{totalQuizzes} Quizzes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Circle */}
                <div className="relative">
                  <svg width="80" height="80" className="transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#E2E8F0"
                      strokeWidth="6"
                      fill="none"
                    />
                    <motion.circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke={module.accentColor.replace('bg-', '#')}
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - module.progress / 100) }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-800">{module.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${module.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                  className={`h-full ${module.accentColor} rounded-full`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectDetailView;