import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, Award, Target, Brain, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import AssessmentHistoryChart from './AssessmentHistoryChart';
import { getAssessmentHistory, getLatestAssessmentResult } from '../../services/assessmentResultsService';
import type { AssessmentResult, AssessmentHistoryEntry } from '../../types/models';

interface AssessmentResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  latestResult?: AssessmentResult | null;
}

const proficiencyColors: Record<string, string> = {
  Beginner: 'bg-amber-100 text-amber-700 border-amber-300',
  Developing: 'bg-blue-100 text-blue-700 border-blue-300',
  Proficient: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Advanced: 'bg-violet-100 text-violet-700 border-violet-300',
};

type TabKey = 'latest' | 'history';

const AssessmentResultsModal: React.FC<AssessmentResultsModalProps> = ({
  isOpen,
  onClose,
  studentId,
  latestResult: initialResult,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('latest');
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(initialResult || null);
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      Promise.all([
        initialResult ? Promise.resolve(initialResult) : getLatestAssessmentResult(studentId),
        getAssessmentHistory(studentId),
      ])
        .then(([result, hist]) => {
          setLatestResult(result);
          setHistory(hist);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, studentId, initialResult]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'latest', label: 'Last Results', icon: <Award className="w-4 h-4" /> },
    { key: 'history', label: 'History & Trends', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 bg-white rounded-2xl shadow-2xl border-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 rounded-t-2xl px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-slate-800">Assessment Results</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-sky-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {activeTab === 'latest' && latestResult && (
              <motion.div
                key="latest"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Score Card */}
                <div className="bg-gradient-to-br from-sky-500 to-teal-600 rounded-xl p-6 text-white mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sky-200 text-sm font-medium">Total Score</p>
                      <p className="text-4xl font-bold">{latestResult.score}/{latestResult.totalQuestions}</p>
                      <p className="text-sky-200 text-sm mt-1">{latestResult.percentage}% Correct</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sky-200 text-sm font-medium">Proficiency</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold border ${proficiencyColors[latestResult.proficiencyLevel]}`}>
                        {latestResult.proficiencyLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Competency Breakdown */}
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-sky-500" />
                  Competency Breakdown
                </h3>
                <div className="space-y-2 mb-6">
                  {latestResult.competencyBreakdown.map((comp, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{comp.topic}</p>
                        <p className="text-xs text-slate-500">{comp.correctAnswers}/{comp.totalQuestions} correct</p>
                      </div>
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${comp.accuracyPercent >= 70 ? 'bg-emerald-500' : 'bg-red-400'}`}
                          style={{ width: `${comp.accuracyPercent}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-600 w-10 text-right">{comp.accuracyPercent}%</span>
                    </div>
                  ))}
                </div>

                {/* AI Narrative */}
                {latestResult.aiNarrative && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800 leading-relaxed">{latestResult.aiNarrative}</p>
                    </div>
                  </div>
                )}

                {/* Question Breakdown */}
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-500" />
                  Question Breakdown
                </h3>
                <div className="space-y-3">
                  {latestResult.answers.map((ans, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border-2 ${ans.isCorrect ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}`}
                    >
                      <p className="text-sm font-medium text-slate-800 mb-2">
                        Q{i + 1}. {ans.questionText}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">Your answer: <span className={ans.isCorrect ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>{ans.userAnswer || '\u2014'}</span></span>
                        {!ans.isCorrect && (
                          <span className="text-slate-500">Correct: <span className="text-emerald-600 font-medium">{ans.correctAnswer}</span></span>
                        )}
                      </div>
                      {ans.explanation && (
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{ans.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AssessmentHistoryChart history={history} />

                {history.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-semibold text-slate-800 mb-3">All Attempts</h3>
                    {history.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Attempt {history.length - i}</p>
                          <p className="text-xs text-slate-500">{new Date(entry.completedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-sky-600">{entry.percentage}%</p>
                          <p className="text-xs text-slate-500">{entry.proficiencyLevel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentResultsModal;
