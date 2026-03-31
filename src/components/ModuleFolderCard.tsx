import React from 'react';
import { BookOpen, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export const THEMES = [
  { bg: 'bg-[#9956DE]', tab: 'bg-[#8248c2]', shadow: 'shadow-[#9956DE]/30' },
  { bg: 'bg-[#1FA7E1]', tab: 'bg-[#198abf]', shadow: 'shadow-[#1FA7E1]/30' },
  { bg: 'bg-[#FFB356]', tab: 'bg-[#e09841]', shadow: 'shadow-[#FFB356]/30' },
  { bg: 'bg-[#FB96BB]', tab: 'bg-[#de7b9f]', shadow: 'shadow-[#FB96BB]/30' }
];

interface ModuleFolderCardProps {
  module: any;
  index: number;
  onClick: () => void;
  isAtRisk?: boolean;
  badgeLabel?: string;
}

const ModuleFolderCard: React.FC<ModuleFolderCardProps> = ({ module, index, onClick, isAtRisk, badgeLabel }) => {
  const theme = THEMES[index % THEMES.length];

  return (
    <motion.button
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="relative text-left rounded-[1.4rem] overflow-visible min-h-[290px] bg-transparent group w-full"
    >
      {/* FOLDER TAB */}
      <div 
        className={`absolute top-0 left-4 h-7 w-32 rounded-t-xl shadow-sm transition-colors duration-300 ${theme.tab}`}
      />

      {/* FOLDER BODY */}
      <div 
        className={`relative mt-6 rounded-[1.4rem] p-6 transition-all duration-300 overflow-hidden flex flex-col h-[calc(100%-24px)] ${theme.bg} shadow-[0_18px_30px_-20px_rgba(0,0,0,0.45)] group-hover:shadow-[0_24px_40px_-15px_rgba(0,0,0,0.5)]`}
      >
        {/* SPINE / TOP HIGHLIGHT */}
        <div className="absolute top-0 left-0 right-0 h-1.5 mix-blend-overlay bg-white/40" />

        {/* BACKGROUND CIRCLES */}
        <div className="absolute -bottom-8 right-[-20%] w-48 h-48 bg-white opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute bottom-4 right-12 w-32 h-32 bg-white opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110 delay-75" />

        {/* CONTENT */}
        <div className="relative z-10 flex-1 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <span className="px-3 py-1.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-sm shadow-sm border border-white/10">
              General Mathematics
            </span>
            {(badgeLabel || module.status === 'Locked') && (
              <span className="px-2.5 py-1 rounded-full bg-black/30 text-white/90 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                {badgeLabel || 'Locked'}
              </span>
            )}
          </div>

          <h3 className="text-2xl md:text-[22px] font-display font-black text-white leading-[1.1] mb-2 drop-shadow-sm pr-4 line-clamp-2">
            {module.title}
          </h3>
          <p className="text-white/85 text-sm line-clamp-2 mb-6 font-medium leading-relaxed pr-2">
            {module.subtitle || module.description || 'Master this module to unlock the next level of your mathematical journey.'}
          </p>
          
          <div className="mt-auto">
            {/* Lessons & Quizzes Pills */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-xl text-white font-bold text-[13px] backdrop-blur-sm shadow-sm border border-white/10">
                <BookOpen size={14} className="opacity-90" /> {module.totalLessons || module.lessons?.length || 0} lessons
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-xl text-white font-bold text-[13px] backdrop-blur-sm shadow-sm border border-white/10">
                <Clock size={14} className="opacity-90" /> {module.totalQuizzes || module.quizzes?.length || 0} quizzes
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between text-white font-bold text-[13px] mb-1.5 drop-shadow-sm">
               <span>Progress</span>
               <span>{module.progress > 0 ? module.progress : 0}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden shadow-inner flex-shrink-0">
               <div 
                 className="h-full bg-white rounded-full transition-all duration-1000 ease-out" 
                 style={{ width: `${module.progress > 0 ? module.progress : 0}%` }} 
               />
            </div>
          </div>

          {isAtRisk && (
            <div className="absolute -top-3 -right-2 bg-rose-500 text-white px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-rose-400 animate-pulse">
              <AlertTriangle size={12} strokeWidth={3} /> Review
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
};

export default ModuleFolderCard;