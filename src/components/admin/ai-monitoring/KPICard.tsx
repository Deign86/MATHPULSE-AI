import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  badge?: string;
  gradient?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subValue,
  icon,
  badge,
  gradient = 'from-slate-800 to-slate-900',
}) => (
  <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} p-4 sm:p-5 text-white shadow-sm overflow-hidden flex flex-col justify-between border border-white/10 group`}>
    <div className="flex items-start justify-between gap-2">
      <div className="space-y-1 min-w-0">
        <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wider truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-display font-bold tabular-nums tracking-tight">{value}</p>
        {subValue && <p className="text-xs text-white/60 line-clamp-1">{subValue}</p>}
      </div>
      <div className="rounded-xl bg-white/15 p-2 sm:p-2.5 backdrop-blur-sm shrink-0 border border-white/10">{icon}</div>
    </div>
    {badge && (
      <div className="mt-3">
        <span className="inline-flex items-center rounded-full bg-amber-400/90 dark:bg-amber-400/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-950 uppercase tracking-wider">
          {badge}
        </span>
      </div>
    )}
  </div>
);

