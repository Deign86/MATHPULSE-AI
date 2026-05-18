import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, AlertTriangle, Link2, Lock, Hourglass, Info, GraduationCap, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { useSubjectAvailability } from '../hooks/useSubjectAvailability';
import type { ModuleStatus } from '../data/curriculumModules';
import { fetchModulePreview } from '../services/deepseekRagService';

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
  /** Optional pre-computed availability - avoids N Firestore listeners when passed from parent */
  precomputedAvailable?: boolean;
  isRecommended?: boolean;
  /** Callback for "Notify Me" on coming_soon modules */
  onNotifyMe?: (moduleId: string) => void;
}

const ModuleFolderCard: React.FC<ModuleFolderCardProps> = ({ module, index, onClick, onPreviewSources, isAtRisk, badgeLabel, precomputedAvailable, isRecommended, onNotifyMe }) => {
  const theme = THEMES[index % THEMES.length];
  const curriculumBadge = `${module.active_grade_level ?? ''} · ${module.subject ?? 'Module'} ${module.quarter ?? ''}`.trim();
  
  // Only subscribe if parent didn't provide precomputed value (perf optimization)
  const shouldSubscribe = precomputedAvailable === undefined;
  const { isSubjectAvailable } = useSubjectAvailability();
  const subjectAvailable = precomputedAvailable !== undefined 
    ? precomputedAvailable 
    : (shouldSubscribe ? isSubjectAvailable(module.subjectId) : true);
    
  // teacher_uploaded modules are accessible even if isAvailable is false
  const status: ModuleStatus = module.moduleStatus || (module.isAvailable !== false ? 'available' : 'coming_soon');
  const isAvailable = ((module.isAvailable !== false) && subjectAvailable) || status === 'teacher_uploaded';

  return (
    // PERF: motion.div with whileHover — rendered inside modules.map() in ModulesPage.tsx.
    // whileHover creates dynamic animation handlers on every mount; component is NOT React.memo'd.
    <motion.div
      role={isAvailable ? 'button' : 'img'}
      tabIndex={isAvailable ? 0 : -1}
      whileHover={isAvailable ? { y: -8 } : undefined}
      onClick={isAvailable ? onClick : undefined}
      onKeyDown={isAvailable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`relative text-left rounded-2xl md:rounded-[1.4rem] overflow-visible h-full min-h-[185px] md:min-h-[290px] bg-transparent group w-full flex flex-col ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* FOLDER TAB */}
      <div 
        className={`absolute top-0 left-3 md:left-4 h-5 md:h-7 w-20 md:w-32 rounded-t-lg md:rounded-t-xl shadow-sm transition-colors duration-300 ${theme.tab}`}
      />

      {/* FOLDER BODY */}
      <div 
        className={`relative mt-4 md:mt-6 rounded-2xl md:rounded-[1.4rem] p-3.5 md:p-6 transition-all duration-300 overflow-hidden flex flex-col h-[calc(100%-16px)] md:h-[calc(100%-24px)] flex-1 ${theme.bg} shadow-[0_18px_30px_-20px_rgba(0,0,0,0.45)] group-hover:shadow-[0_24px_40px_-15px_rgba(0,0,0,0.5)]`}
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

          <h3 className="text-base md:text-[22px] font-display font-black text-white leading-[1.15] md:leading-[1.1] mb-1.5 md:mb-2 drop-shadow-sm pr-4 line-clamp-2">
            {module.title}
          </h3>

          <div className="mb-2 md:mb-3 flex flex-wrap gap-1 md:gap-1.5">
            <span className="rounded-full border border-white/20 bg-black/15 px-2 md:px-2.5 py-0.5 md:py-1 text-[9px] md:text-[10px] font-bold text-white/95 leading-none">
              {curriculumBadge}
            </span>
            {module.content_domain && (
              <span className="rounded-full border border-white/20 bg-black/15 px-2 md:px-2.5 py-0.5 md:py-1 text-[9px] md:text-[10px] font-bold text-white/95 leading-none">
                {module.content_domain}
              </span>
            )}
            {isRecommended && (
              <span className="rounded-full border border-purple-200 bg-purple-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[9px] md:text-[10px] font-bold text-purple-700 shadow-sm animate-pulse leading-none">
                Recommended
              </span>
            )}
          </div>

          <p className="text-white/85 text-[10px] md:text-[13px] line-clamp-1 md:line-clamp-2 mb-2 md:mb-4 font-medium leading-snug md:leading-relaxed pr-2">
            {module.subtitle || module.description || 'Master this module to unlock the next level of your mathematical journey.'}
          </p>
          
          <div className="mt-auto space-y-2 md:space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-white font-bold text-[10px] md:text-[12px] mb-1 md:mb-1.5 drop-shadow-sm">
                 <span className="opacity-90 uppercase tracking-wider">Progress</span>
                 <span>{module.progress > 0 ? module.progress : 0}%</span>
              </div>
              <div className="w-full h-1.5 md:h-2 rounded-full bg-black/20 overflow-hidden shadow-inner">
                 <div
                   className="h-full bg-white rounded-full transition-all duration-1000 ease-out e-w"
                   style={{ ['--w' as any]: `${module.progress > 0 ? module.progress : 0}%` }}
                 />
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 md:gap-2">
              {/* Lessons & Quizzes Pills - Bottom Left */}
              <div className="flex flex-wrap md:flex-nowrap items-center gap-1 md:gap-1.5">
                <div className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-white/20 rounded-md md:rounded-lg text-white font-bold text-[9px] md:text-[11px] backdrop-blur-sm shadow-sm border border-white/10">
                  <BookOpen size={10} className="md:w-3 md:h-3 opacity-90" /> {module.totalLessons || module.lessons?.length || 0} lessons
                </div>
                <div className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-white/20 rounded-md md:rounded-lg text-white font-bold text-[9px] md:text-[11px] backdrop-blur-sm shadow-sm border border-white/10">
                  <Clock size={10} className="md:w-3 md:h-3 opacity-90" /> {module.totalQuizzes || module.quizzes?.length || 0} quizzes
                </div>
              </div>

              {onPreviewSources && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewSources();
                  }}
                  className="flex shrink-0 items-center gap-0.5 md:gap-1 rounded-md md:rounded-lg bg-black/20 hover:bg-black/40 px-1.5 md:px-2 py-1 font-bold uppercase tracking-wider text-white transition-all shadow-sm border border-white/10 leading-none text-[7px] md:text-[8px]"
                >
                  <Link2 size={8} className="md:w-[10px] md:h-[10px]" />
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

          {status === 'teacher_uploaded' && isAvailable && (
            <div className="absolute -top-3 -right-2 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg border border-emerald-400">
              <GraduationCap size={11} strokeWidth={3} /> Teacher Material
            </div>
          )}

          {!isAvailable && (
            <ModuleStatusOverlay
              moduleStatus={status}
              onNotifyMe={onNotifyMe}
              moduleId={module.id}
              moduleTitle={module.title}
              moduleSubject={module.subject}
              moduleQuarter={module.quarter ? parseInt(String(module.quarter).replace('Q', '')) : 1}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Status-aware overlay for unavailable modules ─────────────

interface ModuleStatusOverlayProps {
  moduleStatus: ModuleStatus;
  moduleId?: string;
  moduleTitle?: string;
  moduleSubject?: string;
  moduleQuarter?: number;
  onNotifyMe?: (moduleId: string) => void;
}

const ModuleStatusOverlay: React.FC<ModuleStatusOverlayProps> = ({ moduleStatus, moduleId, moduleTitle, moduleSubject, moduleQuarter, onNotifyMe }) => {
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  useEffect(() => {
    if (moduleStatus !== 'coming_soon' || !moduleId || !moduleTitle) return;
    let cancelled = false;
    fetchModulePreview(moduleId, moduleTitle, moduleSubject || 'General Mathematics', moduleQuarter || 1)
      .then((r) => { if (!cancelled && r.generated) setAiPreview(r.ai_overview); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [moduleStatus, moduleId, moduleTitle, moduleSubject, moduleQuarter]);

  if (moduleStatus === 'coming_soon') {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[1.4rem] bg-black/40 backdrop-blur-[1px]">
        <div className="flex flex-col items-center gap-2 md:gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-amber-500/20 border border-amber-300/40 flex items-center justify-center backdrop-blur-md">
            <Hourglass className="w-5 h-5 md:w-6 md:h-6 text-amber-200" />
          </div>
          <div className="text-center px-2">
            <p className="text-white font-black text-xs md:text-sm tracking-wide">Coming Soon</p>
            {aiPreview ? (
              <div className="mt-1 max-w-[180px] md:max-w-[220px] mx-auto">
                <p className="text-amber-100/90 text-[8px] md:text-[10px] font-semibold leading-tight line-clamp-3">{aiPreview}</p>
                <p className="text-white/50 text-[7px] md:text-[8px] mt-1 italic">AI Preview · Based on DepEd curriculum</p>
              </div>
            ) : (
              <p className="text-white/70 text-[9px] md:text-[11px] font-semibold mt-0.5 md:mt-1 max-w-[160px] md:max-w-[200px] mx-auto leading-tight">
                DepEd has not yet released this module. We'll notify you when it's available.
              </p>
            )}
          </div>
          {onNotifyMe && moduleId && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNotifyMe(moduleId); }}
              className="mt-1 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-[10px] md:text-xs font-bold transition-colors shadow-md flex items-center gap-1"
            >
              <Bell size={12} /> Notify Me
            </button>
          )}
        </div>
      </div>
    );
  }

  // unavailable — dimmed ghost card with info icon (NOT a prominent lock)
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[1.4rem] bg-black/30 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
          <Info className="w-4 h-4 md:w-5 md:h-5 text-white/60" />
        </div>
        <p className="text-white/60 font-semibold text-[10px] md:text-xs">Not Yet Available</p>
      </div>
    </div>
  );
};

export default ModuleFolderCard;