import { motion } from 'motion/react';

interface AssessmentProgressBarProps {
  current: number;
  total: number;
}

const AssessmentProgressBar: React.FC<AssessmentProgressBarProps> = ({ current, total }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-600 font-medium">
          Question {current} of {total}
        </span>
        <span className="text-sky-600 font-semibold">{percentage}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default AssessmentProgressBar;
