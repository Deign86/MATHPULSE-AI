import React from 'react';
import { ArrowLeft, BookOpen, Trophy, Clock, Play, CheckCircle, Lock, Star, Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Subject, Module } from '../data/subjects';

interface SubjectDetailViewProps {
  subject: Subject;
  onBack: () => void;
  onSelectModule: (module: Module) => void;
}

const getSubjectPalette = (id: string) => {
  switch(id) {
    case 'gen-math': 
      return { 
        primary: '#9956DE',
        light: '#F5EDFC',
        card: '#FAF5FF',
        text: '#9956DE',
        darkText: '#4A1D7A',
        border: '#E8D4F9',
        progressBg: '#E8D4F9',
        glow: 'rgba(153, 86, 222, 0.4)'
      };
    case 'pre-calc': 
      return { 
        primary: '#1FA7E1', 
        light: '#E5F5FC', 
        card: '#F2FAFE',
        text: '#1FA7E1',
        darkText: '#0A4A66',
        border: '#BFE7F8',
        progressBg: '#BFE7F8',
        glow: 'rgba(31, 167, 225, 0.4)'
      };
    case 'stats-prob': 
      return { 
        primary: '#FF8B8B', 
        light: '#FFEDED', 
        card: '#FFF5F5',
        text: '#FF8B8B',
        darkText: '#802626',
        border: '#FFD1D1',
        progressBg: '#FFD1D1',
        glow: 'rgba(255, 139, 139, 0.4)'
      };
    case 'basic-calc': 
      return { 
        primary: '#FB96BB', 
        light: '#FFEEF4', 
        card: '#FFF5F8',
        text: '#FB96BB',
        darkText: '#7A1C3F',
        border: '#FAD1DF',
        progressBg: '#FAD1DF',
        glow: 'rgba(251, 150, 187, 0.4)'
      };
    default: 
      return { 
        primary: '#75D06A', 
        light: '#EDFAEB', 
        card: '#F5FCF4',
        text: '#75D06A',
        darkText: '#26591F',
        border: '#C5F0BF',
        progressBg: '#C5F0BF',
        glow: 'rgba(117, 208, 106, 0.4)'
      };
  }
};

const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({ subject, onBack, onSelectModule }) => {
  const Icon = subject.icon;
  const palette = getSubjectPalette(subject.id);
  
  // Dynamic Widget Data
  const nextModule = subject.modules.find(m => m.progress < 100);
  const nextModuleTitle = nextModule ? nextModule.title : "Course Complete!";
  const masteryText = subject.completedModules > 0 ? `${subject.completedModules} Mastered` : "Start Journey";

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 hover:opacity-80 font-bold mb-6 transition-all group text-[#5a6578] hover:text-[#0a1628]"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Modules
        </button>

        {/* Subject Hero Banner */}
            <div className={`rounded-[2rem] p-8 border relative overflow-hidden subject-card`} style={{ ['--bg' as any]: palette.primary, ['--border' as any]: palette.primary, ['--glow' as any]: palette.glow }}>
          <div className="absolute right-[-5%] top-[-10%] opacity-10 text-white transform rotate-12">
            <Icon size={320} />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
            
            {/* Left Content (Text & Stats) */}
            <div className="flex-1 w-full relative z-10">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4 backdrop-blur-sm border border-white/20 shadow-sm bg-white-20`}>
                    <Icon size={20} className="text-white" />
                    <span className={`text-sm font-bold text-white tracking-wide`}>{subject.title}</span>
                  </div>
                  <p className="text-white/95 max-w-2xl text-[17px] leading-relaxed font-medium drop-shadow-sm">
                    {subject.description}
                  </p>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                <div className="backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-sm bg-white-15">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={18} className="text-white/90" />
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Total Modules</span>
                  </div>
                  <p className="text-3xl font-black text-white">{subject.totalModules}</p>
                </div>
                
                <div className="backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-sm bg-white-15">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={18} className="text-white/90" />
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Completed</span>
                  </div>
                  <p className="text-3xl font-black text-white">{subject.completedModules}</p>
                </div>
                
                <div className="backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-sm bg-white-15">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={18} className="text-amber-300 fill-amber-300" />
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Progress</span>
                  </div>
                  <p className="text-3xl font-black text-white">{subject.progress}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-white/90 uppercase tracking-widest">Overall Progress</span>
                  <span className="text-sm font-black text-white bg-white/20 px-3 py-1 rounded-full">{subject.progress}%</span>
                </div>
                <div className="h-4 rounded-full overflow-hidden shadow-inner p-1 bg-black-15">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${subject.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    className="h-full bg-white rounded-full relative overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right Graphic Module (Floating Island) */}
            <div className="hidden md:flex flex-col items-center justify-center min-w-[280px] p-6 lg:ml-10 relative">
              <motion.div 
                 animate={{ y: [0, -10, 0] }}
                 transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                 className="relative z-10"
              >
                {/* Floating Central Icon */}
                <div style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} className="w-48 h-48 rounded-[2.5rem] flex items-center justify-center backdrop-blur-md border border-white/30 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                  <Icon size={80} className="text-white drop-shadow-xl transform group-hover:scale-110 transition-transform duration-500" />
                  
                  {/* Glowing core behind icon */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/20 blur-2xl rounded-full" />
                </div>

                {/* Satellite Tags */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-4 -right-4 bg-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 border border-slate-100"
                >
                  <TrendingUp size={16} className="text-emerald-500" />
                  <span className="text-sm font-bold text-slate-800">{masteryText}</span>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="absolute -bottom-6 -left-6 bg-[#0a1628] px-5 py-3 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-3 border border-slate-700 max-w-[200px]"
                >
                  <Star size={18} className="text-amber-400 fill-amber-400 shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Up Next</span>
                    <span className="text-sm font-bold text-white leading-none truncate" title={nextModuleTitle}>{nextModuleTitle}</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto pr-2 pb-8 scrollbar-hide">
        <h2 className="font-bold text-xl text-[#0a1628] mb-6">Modules ({subject.modules.length})</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
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
                className="group cursor-pointer flex flex-col h-full"
              >
                {/* Folder Tab */}
                <div className="flex relative z-0">
                  <div 
                    style={{ backgroundColor: palette.primary }}
                    className="px-5 py-2.5 rounded-t-2xl text-white font-bold text-sm tracking-wide flex items-center gap-2 transform translate-y-1"
                  >
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    Module {index + 1}
                  </div>
                </div>

                {/* Folder Body */}
                <div 
                  className="flex-1 bg-white rounded-2xl rounded-tl-none p-6 shadow-sm border border-slate-200 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 relative z-10 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3">
                        {module.progress === 100 && (
                          <div style={{ backgroundColor: palette.light, color: palette.text, borderColor: palette.border }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border">
                            <CheckCircle size={12} />
                            Completed
                          </div>
                        )}
                        {module.progress > 0 && module.progress < 100 && (
                          <div style={{ backgroundColor: palette.light, color: palette.text, borderColor: palette.border }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border">
                            <Play size={12} />
                            In Progress
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-bold text-[#0a1628] text-lg mb-2 line-clamp-2 leading-tight group-hover:text-[var(--hover-color)]" style={{ '--hover-color': palette.primary } as React.CSSProperties}>{module.title}</h3>
                      <p className="text-sm text-[#5a6578] mb-4 line-clamp-2 leading-relaxed">{module.description}</p>
                    </div>

                    {/* Progress Circle (Shrunk Slightly) */}
                    <div className="relative shrink-0 mt-1">
                      <svg width="60" height="60" className="transform -rotate-90">
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          stroke="#F1F5F9"
                          strokeWidth="5"
                          fill="none"
                        />
                        <motion.circle
                          cx="30"
                          cy="30"
                          r="24"
                          stroke={palette.primary}
                          strokeWidth="5"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - module.progress / 100) }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-extrabold text-[#0a1628]">{module.progress}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Stats & CTA */}
                  <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-semibold text-[#5a6578]">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <BookOpen size={14} style={{ color: palette.primary }} />
                        <span>{completedLessons}/{totalLessons} <span className="hidden sm:inline">Lessons</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <Award size={14} style={{ color: palette.primary }} />
                        <span>{completedQuizzes}/{totalQuizzes} <span className="hidden sm:inline">Quizzes</span></span>
                      </div>
                    </div>
                    
                    <div 
                      className="text-sm font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0"
                      style={{ color: palette.primary }}
                    >
                      Start
                      <Play size={14} className="fill-current" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubjectDetailView;