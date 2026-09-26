import React from 'react';

export type KPICardTheme = 'emerald' | 'indigo' | 'purple' | 'sky' | 'rose' | 'amber';

interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  badge?: string;
  theme?: KPICardTheme;
  progressPercent?: number;
  trend?: string;
  gradient?: string; // Keep for backward compatibility if passed
}

const THEME_STYLES: Record<KPICardTheme, {
  gradient: string;
  shadow: string;
}> = {
  emerald: {
    gradient: 'bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(16,185,129,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(16,185,129,0.48)]',
  },
  indigo: {
    gradient: 'bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#4338CA]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(99,102,241,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(99,102,241,0.48)]',
  },
  purple: {
    gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.48)]',
  },
  sky: {
    gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(2,132,199,0.48)]',
  },
  rose: {
    gradient: 'bg-gradient-to-br from-[#FB7185] via-[#F43F5E] to-[#E11D48]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(244,63,94,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.48)]',
  },
  amber: {
    gradient: 'bg-gradient-to-br from-[#FFB356] via-[#F29424] to-[#D97706]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(242,148,36,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(242,148,36,0.48)]',
  },
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subValue,
  icon,
  badge,
  theme = 'purple',
  progressPercent,
  trend,
}) => {
  const styles = THEME_STYLES[theme] || THEME_STYLES.purple;

  return (
    <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 ${styles.gradient} ${styles.shadow} border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out flex flex-col justify-between group min-w-0 text-white select-none`}>
      {/* Ambient Glow */}
      <div className="absolute -bottom-6 -right-6 w-24 sm:w-36 h-24 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500 ease-out" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between gap-2 mb-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white/95 truncate">
              {title}
            </span>
            {badge && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
                {badge}
              </span>
            )}
          </div>
          <div className="mt-1">
            <p className="text-2xl sm:text-3xl font-display font-black text-white tabular-nums tracking-tight leading-none drop-shadow-xs">
              {value}
            </p>
          </div>
        </div>

        <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs text-white">
          {icon}
        </div>
      </div>

      {/* Subtext and Progress Bar */}
      <div className="relative z-10 space-y-2 mt-2 pt-2.5 border-t border-white/20">
        <div className="flex items-center justify-between text-[11px] gap-2">
          {subValue && (
            <span className="text-white/90 font-medium truncate drop-shadow-xs">
              {subValue}
            </span>
          )}
          {trend && (
            <span className="inline-flex items-center gap-0.5 font-black text-white text-[10px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/25 shadow-2xs shrink-0">
              {trend}
            </span>
          )}
        </div>

        {progressPercent !== undefined && (
          <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-500 shadow-xs"
              style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
