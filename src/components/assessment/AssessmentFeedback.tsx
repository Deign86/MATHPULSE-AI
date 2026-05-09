import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle } from 'lucide-react';

interface AssessmentFeedbackProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  show: boolean;
}

const AssessmentFeedback: React.FC<AssessmentFeedbackProps> = ({
  isCorrect,
  correctAnswer,
  explanation,
  show,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-4 p-4 rounded-xl border-2 ${
            isCorrect
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {isCorrect ? (
              <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-semibold text-sm ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </p>
              {!isCorrect && (
                <p className="text-sm text-slate-700 mt-1">
                  <span className="font-medium">Correct answer:</span> {correctAnswer}
                </p>
              )}
              {explanation && (
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{explanation}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AssessmentFeedback;
