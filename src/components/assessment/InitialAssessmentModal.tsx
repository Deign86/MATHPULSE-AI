import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Brain, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { generateDiagnostic, type DiagnosticQuestion } from '../../services/diagnosticService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface InitialAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void; // Sets assessmentDismissed=true in App + closes modal — used by "Skip for Now"
  userId: string;
  strand: string;
  gradeLevel: string;
  onAssessmentStart: (testId: string, questions: DiagnosticQuestion[]) => void;
  onAssessmentComplete?: (result: {
    overallRisk: string;
    overallScorePercent: number;
    intervention: string;
    xpEarned: number;
    badgeUnlocked: string;
    competencyScores?: Record<string, { score: number; correct: number; attempted: number }>;
    proficiencyProfile?: {
      strengths: string[];
      weaknesses: string[];
      borderline: string[];
      suggestedStartingModule: string;
      recommendedPace: 'support_intensive' | 'normal' | 'accelerated';
    };
  }) => void;
}

const InitialAssessmentModal: React.FC<InitialAssessmentModalProps> = ({
  isOpen,
  onClose,
  onDismiss,
  userId,
  strand,
  gradeLevel,
  onAssessmentStart,
  onAssessmentComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateDiagnostic(strand, gradeLevel);
      sessionStorage.setItem(
        'mathpulse_diagnostic',
        JSON.stringify({
          testId: result.test_id,
          questions: result.questions,
          totalItems: result.total_items,
          estimatedMinutes: result.estimated_minutes,
        }),
      );
      onAssessmentStart(result.test_id, result.questions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load assessment';
      setError(message);
      setLoading(false);
    }
  };

  const handleXClose = () => {
    // X button: session-only close via sessionStorage, does NOT persist to Firestore
    // Modal will reappear on next page refresh / new session
    // User will be reminded again on next session
    sessionStorage.setItem('mathpulse_iar_session_dismissed', 'true');
    onClose();
  };

  const handlePersistDismiss = async () => {
    // "Skip for now": persist to Firestore + update App.tsx state so modal/tooltip are gone for good.
    // Can only be re-accessed via hero banner chat bubble.
    try {
      await updateDoc(doc(db, 'users', userId), {
        assessmentDismissed: true,
        assessmentDismissedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[diagnostic] Failed to save dismiss state:', err);
    }
    onDismiss();
  };

  // Radix Dialog owns focus trap, Escape, backdrop dismiss (all route to the
  // session-only close), and aria-modal semantics. X/Escape/backdrop must stay
  // session-only (handleXClose), never the persisted dismiss (handlePersistDismiss).
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleXClose(); }}>
      <DialogContent
        aria-labelledby="iar-title"
        aria-describedby="iar-description"
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-[calc(100%-1.5rem)] sm:w-full max-w-lg md:max-w-xl max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto flex flex-col p-0 gap-0 border border-slate-200/80 dark:border-slate-800"
      >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#dde3eb] dark:border-slate-800 flex items-center justify-between bg-[#edf1f7] dark:bg-slate-800/80 flex-shrink-0 pr-12 sm:pr-14">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-100 dark:bg-purple-950/60 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-xs">
              <Brain size={18} />
            </div>
            <div className="min-w-0">
              <DialogTitle id="iar-title" className="text-sm sm:text-base font-bold text-[#0a1628] dark:text-white leading-tight truncate">
                Initial Assessment
              </DialogTitle>
              <DialogDescription id="iar-description" className="text-[11px] sm:text-xs text-[#5a6578] dark:text-slate-400 truncate">
                Analyze your strengths & weaknesses
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8 text-center space-y-3.5 sm:space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-purple-50 dark:bg-purple-950/40 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 text-purple-600 dark:text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>

            <h3 className="text-base sm:text-xl md:text-2xl font-bold text-[#0a1628] dark:text-white">
              Welcome to MathPulse AI!
            </h3>
            <p className="text-xs sm:text-[13px] text-[#5a6578] dark:text-slate-300 max-w-[26rem] mx-auto leading-relaxed mt-1">
              To personalize your learning path, complete a DepEd competency-based
              SHS diagnostic (15 items, around 11.6 minutes).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-w-[30rem] mx-auto text-left mt-3.5 sm:mt-4">
              <div className="bg-[#edf1f7] dark:bg-slate-800/70 p-3 sm:p-3.5 rounded-xl border border-[#dde3eb] dark:border-slate-700/70 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#0a1628] dark:text-white mb-1">
                  <CheckCircle size={15} className="text-teal-500 shrink-0" />
                  <span>Personalized Path</span>
                </div>
                <p className="text-[11px] text-[#5a6578] dark:text-slate-400 pl-5 leading-normal">
                  Get recommendations based on your level.
                </p>
              </div>
              <div className="bg-[#edf1f7] dark:bg-slate-800/70 p-3 sm:p-3.5 rounded-xl border border-[#dde3eb] dark:border-slate-700/70 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#0a1628] dark:text-white mb-1">
                  <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                  <span>Identify Risks</span>
                </div>
                <p className="text-[11px] text-[#5a6578] dark:text-slate-400 pl-5 leading-normal">
                  Spot areas that need more attention early.
                </p>
              </div>
            </div>

            {error && (
              <div role="alert" className="mt-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-left">
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="pt-3 sm:pt-4 space-y-2.5">
              <Button
                onClick={handleStart}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm md:text-base font-bold shadow-lg shadow-purple-500/25 w-full max-w-[360px] mx-auto active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Crafting your assessment...
                  </>
                ) : (
                  'Start Assessment'
                )}
              </Button>
              {loading && (
                <p className="text-[10px] sm:text-[11px] text-slate-400 max-w-[24rem] mx-auto text-center leading-relaxed">
                  This may take up to 90 seconds while AI generates your personalized test.
                </p>
              )}
              <button
                onClick={handlePersistDismiss}
                className="block mx-auto text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-semibold py-1 cursor-pointer"
              >
                {loading ? 'Cancel generation' : 'Skip for now'}
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default InitialAssessmentModal;
export type { DiagnosticQuestion };
