import React from 'react';
import {
  ShieldCheck,
  Eye,
  AlertTriangle,
  AlertCircle,
  Skull,
  HelpCircle,
} from 'lucide-react';
import type { StudentRiskProfile } from '../../types/models';

type RiskStatus = StudentRiskProfile['riskStatus'];
type BadgeSize = 'sm' | 'md' | 'lg';

interface RiskBadgeProps {
  status?: RiskStatus | null;
  wri?: number | null;
  size?: BadgeSize;
  showScore?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  NonNullable<RiskStatus> | 'null',
  {
    label: string;
    color: string;
    dotColor: string;
    icon: React.ElementType;
    description: string;
  }
> = {
  safe: {
    label: 'On Track',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: ShieldCheck,
    description: 'Performing well — no intervention needed',
  },
  watch: {
    label: 'Watch',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: Eye,
    description: 'Slight decline detected — system is adjusting',
  },
  intervene: {
    label: 'Intervene',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
    description: 'Approaching DepEd threshold — teacher notified',
  },
  critical: {
    label: 'Critical',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
    icon: AlertCircle,
    description: 'Urgent — structured intervention required',
  },
  at_risk: {
    label: 'At Risk',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-900',
    icon: Skull,
    description: 'Near or below DepEd failing mark',
  },
  null: {
    label: 'Pending',
    color: 'bg-slate-50 text-slate-500 border-slate-200',
    dotColor: 'bg-slate-400',
    icon: HelpCircle,
    description: 'Assessment not yet completed',
  },
};

const SIZE_CONFIG = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
} as const;

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  status,
  wri,
  size = 'md',
  showScore = false,
  className = '',
}) => {
  const config = STATUS_CONFIG[status ?? 'null'];
  const Icon = config.icon;

  const label = showScore && wri !== null && wri !== undefined
    ? `${config.label} ${wri}`
    : config.label;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium transition-colors ${config.color} ${SIZE_CONFIG[size]} ${className}`}
      title={`WRI: ${wri ?? 'N/A'} — ${config.description}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dotColor}`} />
      <Icon className="flex-shrink-0" size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} />
      {label}
    </span>
  );
};
