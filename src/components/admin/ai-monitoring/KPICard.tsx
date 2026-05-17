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
  <div className={`relative rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg overflow-hidden`}>
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-white/60 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subValue && <p className="text-xs text-white/50">{subValue}</p>}
      </div>
      <div className="rounded-lg bg-white/10 p-2">{icon}</div>
    </div>
    {badge && (
      <span className="absolute top-2 right-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
        {badge}
      </span>
    )}
  </div>
);
