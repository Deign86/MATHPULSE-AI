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
        className="bg-white rounded-2xl shadow-2xl max-w-[44rem] w-full flex flex-col overflow-hidden p-0 gap-0"
      >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[#dde3eb] flex items-center justify-between bg-[#edf1f7] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <Brain size={18} />
            </div>
            <div>
              <DialogTitle id="iar-title" className="text-base font-bold text-[#0a1628] leading-tight">
                Initial Assessment
              </DialogTitle>
              <DialogDescription id="iar-description" className="text-[11px] text-[#5a6578]">
                Analyze your strengths & weaknesses
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 text-center space-y-3">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-9 h-9 text-purple-600"
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

            <h3 className="text-lg font-bold text-[#0a1628]">
              Welcome to MathPulse AI!
            </h3>
            <p className="text-[13px] text-[#5a6578] max-w-[24rem] mx-auto leading-relaxed">
              To personalize your learning path, complete a DepEd competency-based
              SHS diagnostic (15 items, around 11.6 minutes).
            </p>

            <div className="grid grid-cols-2 gap-2.5 max-w-[28rem] mx-auto text-left mt-4">
              <div className="bg-[#edf1f7] p-2.5 rounded-lg border border-[#dde3eb]">
                <div className="flex items-center gap-1.5 font-bold text-[13px] text-[#0a1628] mb-1">
                  <CheckCircle size={14} className="text-teal-500" />
                  Personalized Path
                </div>
                <p className="text-[10px] text-[#5a6578] pl-[18px]">
                  Get recommendations based on your level.
                </p>
              </div>
              <div className="bg-[#edf1f7] p-2.5 rounded-lg border border-[#dde3eb]">
                <div className="flex items-center gap-1.5 font-bold text-[13px] text-[#0a1628] mb-1">
                  <AlertTriangle size={14} className="text-rose-500" />
                  Identify Risks
                </div>
                <p className="text-[10px] text-[#5a6578] pl-[18px]">
                  Spot areas that need more attention early.
                </p>
              </div>
            </div>

            {error && (
              <div role="alert" className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="pt-3 space-y-2.5">
              <Button
                onClick={handleStart}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 w-full max-w-[380px] mx-auto"
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
                <p className="text-[10px] text-slate-400 max-w-[24rem] mx-auto text-center leading-relaxed">
                  This may take up to 90 seconds while AI generates your personalized test.
                </p>
              )}
              <button
                onClick={handlePersistDismiss}
                className="block mx-auto text-xs text-slate-500 hover:text-[#5a6578] transition-colors font-medium"
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
