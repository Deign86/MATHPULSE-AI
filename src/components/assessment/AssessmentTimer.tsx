import { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../ui/utils';

interface AssessmentTimerProps {
  secondsRemaining: number;
  onTimeUp: () => void;
  totalSeconds: number;
}

const AssessmentTimer: React.FC<AssessmentTimerProps> = ({ secondsRemaining, onTimeUp, totalSeconds }) => {
  const warnedRef = useRef(false);
  const urgencyPercent = totalSeconds > 0 ? (secondsRemaining / totalSeconds) * 100 : 0;
  const isUrgent = secondsRemaining <= 60;

  useEffect(() => {
    if (secondsRemaining <= 0 && !warnedRef.current) {
      warnedRef.current = true;
      onTimeUp();
    }
  }, [secondsRemaining, onTimeUp]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      <Clock className={cn('w-4 h-4', isUrgent ? 'text-red-500 animate-pulse' : 'text-slate-400')} />
      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            urgencyPercent > 30 ? 'bg-emerald-500' : urgencyPercent > 10 ? 'bg-amber-500' : 'bg-red-500',
          )}
          style={{ width: `${urgencyPercent}%` }}
        />
      </div>
      <span className={cn('text-sm font-mono font-semibold', isUrgent ? 'text-red-600' : 'text-slate-600')}>
        {timeStr}
      </span>
    </div>
  );
};

export default AssessmentTimer;
