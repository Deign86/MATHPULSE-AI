import React from 'react';
import { BookOpen, Clock, AlertTriangle, Link2 } from 'lucide-react';
import { motion } from 'motion/react';

export const THEMES = [
  { bg: 'bg-[#9956DE]', tab: 'bg-[#8544c7]', shadow: 'shadow-[#9956DE]/30' },
  { bg: 'bg-[#1FA7E1]', tab: 'bg-[#158abf]', shadow: 'shadow-[#1FA7E1]/30' },
  { bg: 'bg-[#FFB356]', tab: 'bg-[#e69940]', shadow: 'shadow-[#FFB356]/30' },
  { bg: 'bg-[#FB96BB]', tab: 'bg-[#df7b9e]', shadow: 'shadow-[#FB96BB]/30' },
  { bg: 'bg-[#75D06A]', tab: 'bg-[#62b658]', shadow: 'shadow-[#75D06A]/30' },
  { bg: 'bg-[#FF8B8B]', tab: 'bg-[#e67070]', shadow: 'shadow-[#FF8B8B]/30' }
];

interface ModuleFolderCardProps {
  module: any;
  index: number;
  onClick: () => void;
  onPreviewSources?: () => void;
  isAtRisk?: boolean;
  badgeLabel?: string;
}

const ModuleFolderCard: React.FC<ModuleFolderCardProps> = ({ module, index, onClick, onPreviewSources, isAtRisk, badgeLabel }) => {
  const theme = THEMES[index % THEMES.length];
  const curriculumBadge = `${module.active_grade_level ?? ''} · ${module.subject ?? 'Module'} ${module.quarter ?? ''}`.trim();

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
          <div className="flex items-start justify-end">
            {(badgeLabel || module.status === 'Locked') && (
              <span className="px-2.5 py-1 rounded-full bg-black/30 text-white/90 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                {badgeLabel || 'Locked'}
              </span>
            )}
          </div>

          <h3 className="text-2xl md:text-[22px] font-display font-black text-white leading-[1.1] mb-2 drop-shadow-sm pr-4 line-clamp-2">
            {module.title}
          </h3>

          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/20 bg-black/15 px-2.5 py-1 text-[10px] font-bold text-white/95">
              {curriculumBadge}
            </span>
            {module.content_domain && (
              <span className="rounded-full border border-white/20 bg-black/15 px-2.5 py-1 text-[10px] font-bold text-white/95">
                {module.content_domain}
              </span>
            )}
          </div>

          <p className="text-white/85 text-[13px] line-clamp-2 mb-4 font-medium leading-relaxed pr-2">
            {module.subtitle || module.description || 'Master this module to unlock the next level of your mathematical journey.'}
          </p>
          
          <div className="mt-auto space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-white font-bold text-[12px] mb-1.5 drop-shadow-sm">
                 <span className="opacity-90 uppercase tracking-wider">Progress</span>
                 <span>{module.progress > 0 ? module.progress : 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden shadow-inner">
                 <div 
                   className="h-full bg-white rounded-full transition-all duration-1000 ease-out" 
                   style={{ width: `${module.progress > 0 ? module.progress : 0}%` }} 
                 />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* Lessons & Quizzes Pills - Bottom Left */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-white font-bold text-[11px] backdrop-blur-sm shadow-sm border border-white/10">
                  <BookOpen size={12} className="opacity-90" /> {module.totalLessons || module.lessons?.length || 0} lessons
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-white font-bold text-[11px] backdrop-blur-sm shadow-sm border border-white/10">
                  <Clock size={12} className="opacity-90" /> {module.totalQuizzes || module.quizzes?.length || 0} quizzes
                </div>
              </div>

              {onPreviewSources && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewSources();
                  }}
                  style={{ fontSize: '8px' }}
                  className="flex items-center gap-1 rounded-lg bg-black/20 hover:bg-black/40 px-2 py-1 font-bold uppercase tracking-wider text-white transition-all shadow-sm border border-white/10 leading-none"
                >
                  <Link2 size={10} />
                  SOURCE
                </button>
              )}
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