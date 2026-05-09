import { motion } from 'motion/react';

interface AssessmentQuestionCardProps {
  questionNumber: number;
  questionText: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  children: React.ReactNode;
}

const difficultyColors: Record<string, string> = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-700',
};

const AssessmentQuestionCard: React.FC<AssessmentQuestionCardProps> = ({
  questionNumber,
  questionText,
  topic,
  difficulty,
  children,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-sky-50 to-teal-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {questionNumber}
          </span>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{topic}</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyColors[difficulty]}`}>
          {difficulty}
        </span>
      </div>

      {/* Question */}
      <div className="px-6 py-5">
        <p className="text-slate-800 text-lg leading-relaxed font-medium">{questionText}</p>
      </div>

      {/* Answers (children) */}
      <div className="px-6 pb-6">
        {children}
      </div>
    </motion.div>
  );
};

export default AssessmentQuestionCard;
