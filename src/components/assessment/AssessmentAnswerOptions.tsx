import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../ui/utils';

interface AssessmentAnswerOptionsProps {
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string | null;
  onSelect: (answer: string) => void;
  disabled: boolean;
  showResult: boolean;
}

const optionLabels = ['A', 'B', 'C', 'D'];

const AssessmentAnswerOptions: React.FC<AssessmentAnswerOptionsProps> = ({
  options,
  selectedAnswer,
  correctAnswer,
  onSelect,
  disabled,
  showResult,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 w-full">
      <AnimatePresence mode="sync">
        {options.map((option, index) => {
          const label = optionLabels[index] || String(index);
          const isSelected = selectedAnswer === option;
          const isCorrect = correctAnswer === option;
          const showCorrect = showResult && isCorrect;
          const showIncorrect = showResult && isSelected && !isCorrect;

          return (
            <motion.button
              key={`${label}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              onClick={() => !disabled && onSelect(option)}
              disabled={disabled}
              className={cn(
                'relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200',
                'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400',
                !showResult && isSelected && 'border-sky-500 bg-sky-50 shadow-md',
                !showResult && !isSelected && !disabled && 'border-slate-200 bg-white hover:border-sky-300',
                showCorrect && 'border-emerald-500 bg-emerald-50',
                showIncorrect && 'border-red-400 bg-red-50',
                disabled && !showResult && 'opacity-60 cursor-not-allowed',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                    !showResult && isSelected && 'bg-sky-500 text-white',
                    !showResult && !isSelected && 'bg-slate-100 text-slate-600',
                    showCorrect && 'bg-emerald-500 text-white',
                    showIncorrect && 'bg-red-500 text-white',
                  )}
                >
                  {label}
                </span>
                <span className="text-slate-800 font-medium">{option}</span>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AssessmentAnswerOptions;
