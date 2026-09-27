import React from 'react';

export interface RadialScoreRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  trackClass?: string;
  textColorClass?: string;
  fontSizeClass?: string;
}

export const RadialScoreRing: React.FC<RadialScoreRingProps> = ({
  value,
  size = 44,
  strokeWidth = 4.5,
  colorClass = 'text-white',
  trackClass = 'text-white/20',
  textColorClass = 'text-white font-black',
  fontSizeClass = 'text-[10.5px]',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`${fontSizeClass} font-black tabular-nums leading-none ${textColorClass}`}>
          {clamped}%
        </span>
      </div>
    </div>
  );
};

export type TeacherCardColor = 'green' | 'purple' | 'cyan' | 'amber' | 'rose' | 'pink' | 'slate';

const COLOR_STYLES: Record<TeacherCardColor, { gradient: string; shadow: string }> = {
  green: {
    gradient: 'bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.48)]',
  },
  purple: {
    gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.48)]',
  },
  cyan: {
    gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(2,132,199,0.48)]',
  },
  amber: {
    gradient: 'bg-gradient-to-br from-[#FFB356] via-[#F29424] to-[#D97706]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(242,148,36,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(242,148,36,0.48)]',
  },
  rose: {
    gradient: 'bg-gradient-to-br from-[#FB7185] via-[#F43F5E] to-[#E11D48]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(244,63,94,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.48)]',
  },
  pink: {
    gradient: 'bg-gradient-to-br from-[#F472B6] via-[#EC4899] to-[#DB2777]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(236,72,153,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(236,72,153,0.48)]',
  },
  slate: {
    gradient: 'bg-gradient-to-br from-[#64748b] via-[#475569] to-[#334155]',
    shadow: 'shadow-[0_8px_24px_-6px_rgba(71,85,105,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(71,85,105,0.48)]',
  },
};

export interface TeacherStatCardProps {
  title: string;
  badgeText?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  value: string | number;
  subtitle?: string;
  scorePercent?: number;
  footerLabel?: string;
  footerBadge?: string;
  color?: TeacherCardColor;
  onClick?: () => void;
  className?: string;
  customRightContent?: React.ReactNode;
}

export const TeacherStatCard: React.FC<TeacherStatCardProps> = ({
  title,
  badgeText,
  icon,
  value,
  subtitle,
  scorePercent,
  footerLabel,
  footerBadge,
  color = 'purple',
  onClick,
  className = '',
  customRightContent,
}) => {
  const styles = COLOR_STYLES[color] ?? COLOR_STYLES.purple;
  const isClickable = Boolean(onClick);

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    // SAFETY: icon is a component constructor when not a pre-instantiated React element
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />;
  };

  const renderRightContent = () => {
    if (customRightContent) return customRightContent;
    if (scorePercent !== undefined) {
      return (
        <div className="shrink-0">
          <div className="hidden sm:block">
            <RadialScoreRing value={scorePercent} size={44} />
          </div>
          <div className="sm:hidden">
            <RadialScoreRing value={scorePercent} size={36} strokeWidth={3.5} fontSizeClass="text-[9px]" />
          </div>
        </div>
      );
    }
    if (icon) {
      return (
        <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          {React.isValidElement(icon) ? (
            icon
          ) : (
            (() => {
              // SAFETY: icon is a component constructor when not a pre-instantiated React element
              const IconComp = icon as React.ComponentType<{ className?: string }>;
              return <IconComp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />;
            })()
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl sm:rounded-3xl p-2.5 xs:p-3 sm:p-4.5 ${styles.gradient} ${styles.shadow} ${
        isClickable ? 'hover:-translate-y-1 sm:hover:-translate-y-1.5 cursor-pointer' : 'cursor-default'
      } border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out overflow-hidden flex flex-col justify-between text-white min-h-[135px] xs:min-h-[145px] sm:min-h-[165px] group select-none ${className}`}
    >
      {/* Subtle Ambient Glow */}
      <div className="absolute -bottom-6 -right-6 w-24 sm:w-36 h-24 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 group-hover:bg-white/15 transition-all duration-500 ease-out" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* CARD HEADER */}
      <div className="relative z-10 flex items-start justify-between gap-1 mb-1 sm:mb-2">
        <div className="flex items-center gap-1.5 text-white/95 min-w-0 flex-1">
          {renderIcon()}
          <span className="text-[9px] xs:text-[10px] sm:text-xs font-black uppercase tracking-wider text-white leading-tight break-words line-clamp-2 sm:line-clamp-none">
            {title}
          </span>
        </div>
        {badgeText && (
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[7.5px] xs:text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider border border-white/25 shadow-2xs whitespace-nowrap shrink-0">
            {badgeText}
          </span>
        )}
      </div>

      {/* CARD BODY */}
      <div className="relative z-10 my-auto py-0.5 sm:py-1 flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight tabular-nums leading-none mb-1 drop-shadow-xs">
            {value}
          </div>
          {subtitle && (
            <p className="text-white/90 text-[10px] xs:text-[11px] sm:text-xs font-medium leading-tight sm:leading-snug drop-shadow-xs break-words line-clamp-2 sm:line-clamp-none">
              {subtitle}
            </p>
          )}
        </div>
        {renderRightContent()}
      </div>

      {/* CARD FOOTER */}
      {(footerLabel || footerBadge) && (
        <div className="relative z-10 pt-1.5 sm:pt-2 border-t border-white/20 flex items-center justify-between text-[8.5px] xs:text-[9.5px] sm:text-[11px] gap-1">
          <span className="text-white/85 font-medium leading-tight break-words line-clamp-1">{footerLabel}</span>
          {footerBadge && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-white/20 backdrop-blur-md text-white font-black border border-white/25 whitespace-nowrap text-[8px] xs:text-[8.5px] sm:text-[10px] shrink-0">
              {footerBadge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
