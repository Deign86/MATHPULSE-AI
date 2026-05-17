import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, Award, Target, Brain, Sparkles, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import AssessmentHistoryChart from './AssessmentHistoryChart';
import { getAssessmentHistory, getLatestAssessmentResult } from '../../services/assessmentResultsService';
import { getHeroBannerModalSummary, subscribeToHeroBannerModalSummary } from '../../services/heroBannerSummaryService';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AssessmentResult, AssessmentHistoryEntry, HeroBannerModalSummary } from '../../types/models';

interface AssessmentResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  latestResult?: AssessmentResult | null;
  heroBannerSummary?: HeroBannerModalSummary | null;
}

const proficiencyColors: Record<string, string> = {
  Beginner: 'bg-amber-100 text-amber-700 border-amber-300',
  Developing: 'bg-blue-100 text-blue-700 border-blue-300',
  Proficient: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Advanced: 'bg-violet-100 text-violet-700 border-violet-300',
};

type TabKey = 'latest' | 'history';

const AssessmentResultView: React.FC<{ result: AssessmentResult }> = ({ result }) => (
  <div className="space-y-6">
    {/* Score Card */}
    <div className="bg-gradient-to-br from-sky-500 to-teal-600 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sky-200 text-sm font-medium">Total Score</p>
          <p className="text-4xl font-bold">{result.score}/{result.totalQuestions}</p>
          <p className="text-sky-200 text-sm mt-1">{result.percentage}% Correct</p>
        </div>
        <div className="text-right">
          <p className="text-sky-200 text-sm font-medium">Proficiency</p>
          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold border ${proficiencyColors[result.proficiencyLevel]}`}>
            {result.proficiencyLevel}
          </span>
        </div>
      </div>
    </div>

    {/* Competency Breakdown */}
    <div>
      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Brain className="w-4 h-4 text-sky-500" />
        Competency Breakdown
      </h3>
      <div className="space-y-2">
        {result.competencyBreakdown.map((comp, i) => (
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
    </div>

    {/* AI Narrative */}
    {result.aiNarrative && (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 leading-relaxed">{result.aiNarrative}</p>
        </div>
      </div>
    )}

    {/* Question Breakdown */}
    <div>
      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Target className="w-4 h-4 text-sky-500" />
        Question Breakdown
      </h3>
      <div className="space-y-3">
        {result.answers.map((ans, i) => (
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
    </div>
  </div>
);

const HeroBannerSummaryView: React.FC<{ summary: HeroBannerModalSummary }> = ({ summary }) => (
  <div className="space-y-6">
    {/* Score and Risk Level */}
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center gap-4 flex-1">
        <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
          {summary.latestScorePercent}%
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-500">Latest Score</h4>
          <p className="text-slate-800 font-bold">{summary.headline}</p>
        </div>
      </div>
      
      {summary.latestRiskLevel && (
        <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2
          ${summary.latestRiskLevel === 'At Risk' ? 'bg-red-100 text-red-700' : 
            summary.latestRiskLevel === 'Needs Attention' ? 'bg-amber-100 text-amber-700' : 
            'bg-emerald-100 text-emerald-700'}`}
        >
          {summary.latestRiskLevel === 'At Risk' ? <ShieldAlert className="w-4 h-4" /> : 
           summary.latestRiskLevel === 'Needs Attention' ? <AlertCircle className="w-4 h-4" /> : 
           <CheckCircle2 className="w-4 h-4" />}
          {summary.latestRiskLevel}
        </div>
      )}
    </div>

    {/* Summary Text */}
    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
      <p className="text-slate-700 leading-relaxed">{summary.summary}</p>
    </div>

    {/* Strengths & Weaknesses */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {summary.strengths?.length > 0 && (
        <div className="border border-emerald-100 bg-emerald-50/30 rounded-xl p-4">
          <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Strengths
          </h4>
          <ul className="space-y-2">
            {summary.strengths.map((s, i) => (
              <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.weaknesses?.length > 0 && (
        <div className="border border-amber-100 bg-amber-50/30 rounded-xl p-4">
          <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Focus Areas
          </h4>
          <ul className="space-y-2">
            {summary.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>

    {/* Recommendation */}
    {summary.recommendation && (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
        <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" />
          Recommended Next Step
        </h4>
        <p className="text-sm text-indigo-800 leading-relaxed">{summary.recommendation}</p>
      </div>
    )}
  </div>
);

const HeroBannerModalContent: React.FC<{
  heroBannerSummary: HeroBannerModalSummary | null | undefined;
  latestResult: AssessmentResult | null;
  loading: boolean;
}> = ({ heroBannerSummary, latestResult, loading }) => {
  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-slate-200 rounded-xl" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-4 bg-slate-200 rounded w-5/6" />
      </div>
    </div>
  );

  if (!heroBannerSummary && !latestResult) return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Brain className="w-8 h-8 text-sky-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">Let&apos;s personalize your learning</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        Complete your diagnostic assessment so I can understand your strengths, weak areas, and the best next lessons for you.
      </p>
    </div>
  );

  if (heroBannerSummary?.status === 'ready') return <HeroBannerSummaryView summary={heroBannerSummary} />;
  
  if (latestResult) return <AssessmentResultView result={latestResult} />;

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">Your learning summary is being prepared</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        Please try opening this again in a moment.
      </p>
    </div>
  );
};

/** Check all possible Firestore locations for assessment data and build a summary */
async function buildFallbackSummary(studentId: string): Promise<HeroBannerModalSummary | null> {
  // 1. competencyProfiles/{uid}
  const cpSnap = await getDoc(doc(db, 'competencyProfiles', studentId)).catch(() => null);
  if (cpSnap?.exists()) {
    const cp = cpSnap.data();
    const strengths: string[] = cp.primaryStrength ? [cp.primaryStrength] : [];
    const weaknesses: string[] = cp.primaryWeakness ? [cp.primaryWeakness] : [];
    return {
      status: 'ready',
      headline: cp.overallScore >= 70 ? 'Good job — keep it up!' : 'Let\'s build your foundation',
      summary: weaknesses.length > 0
        ? `Focus on strengthening ${weaknesses[0]} to improve your overall performance.`
        : 'Keep practicing to maintain and expand your skills.',
      strengths, weaknesses,
      recommendation: cp.suggestedModule ? `Start with the ${cp.suggestedModule} module.` : 'Continue with your personalized learning path.',
      latestAssessmentId: '', latestScorePercent: cp.overallScore || 0,
      latestRiskLevel: cp.overallScore >= 70 ? 'Low' : cp.overallScore >= 50 ? 'Moderate' : 'High',
      updatedAt: cp.updatedAt?.toDate?.() || new Date(),
    };
  }

  // 2. assessments/{uid}/attempts (from completeInitialAssessment)
  const assessSnap = await getDocs(
    query(collection(db, 'assessments', studentId, 'attempts'), orderBy('completedAt', 'desc'), limit(1))
  ).catch(() => null);
  if (assessSnap && !assessSnap.empty) {
    const d = assessSnap.docs[0].data();
    const score = d.rawScore || d.overallScorePercent || 0;
    const profile = d.proficiencyProfile;
    return {
      status: 'ready',
      headline: score >= 70 ? 'Good job — keep it up!' : 'Let\'s build your foundation',
      summary: profile?.weaknesses?.length > 0
        ? `Focus on strengthening ${profile.weaknesses[0]} to improve.`
        : score >= 70 ? 'You have a solid foundation!' : 'With practice, you\'ll build confidence.',
      strengths: profile?.strengths || [],
      weaknesses: profile?.weaknesses || [],
      recommendation: profile?.suggestedStartingModule ? `Start with ${profile.suggestedStartingModule}.` : 'Follow your personalized learning path.',
      latestAssessmentId: d.assessmentId || '', latestScorePercent: score,
      latestRiskLevel: score >= 70 ? 'Low' : score >= 50 ? 'Moderate' : 'High',
      updatedAt: d.completedAt?.toDate?.() || new Date(),
    };
  }

  // 3. diagnosticResults/{uid}
  const diagSnap = await getDoc(doc(db, 'diagnosticResults', studentId)).catch(() => null);
  if (diagSnap?.exists()) {
    const d = diagSnap.data();
    const score = d.overallScorePercent || d.overall_score_percent || 0;
    const weakDomains: string[] = d.riskProfile?.weak_domains || [];
    return {
      status: 'ready',
      headline: score >= 70 ? 'Good job — keep it up!' : 'Let\'s build your foundation',
      summary: weakDomains.length > 0
        ? `Areas to focus on: ${weakDomains.join(', ')}.`
        : 'Assessment completed. Follow your learning path.',
      strengths: [], weaknesses: weakDomains,
      recommendation: d.recommended_intervention || 'Continue with your personalized learning path.',
      latestAssessmentId: '', latestScorePercent: score,
      latestRiskLevel: d.overall_risk || (score >= 70 ? 'Low' : 'Moderate'),
      updatedAt: d.completedAt?.toDate?.() || new Date(),
    };
  }

  // 4. Last resort: user profile has initialAssessmentCompleted but no detailed data
  const userSnap = await getDoc(doc(db, 'users', studentId)).catch(() => null);
  if (userSnap?.exists()) {
    const u = userSnap.data();
    if (u.initialAssessmentCompleted || u.hasCompletedInitialAssessment) {
      const atRisk: string[] = u.atRiskSubjects || [];
      return {
        status: 'ready',
        headline: 'Assessment Complete! ✓',
        summary: atRisk.length > 0
          ? `Areas to focus on: ${atRisk.join(', ')}. Follow your personalized learning path to improve.`
          : 'Your diagnostic assessment is complete. Your personalized learning path is ready.',
        strengths: [],
        weaknesses: atRisk,
        recommendation: 'Continue with your recommended lessons to strengthen your skills.',
        latestAssessmentId: '', latestScorePercent: 0,
        latestRiskLevel: atRisk.length > 0 ? 'Moderate' : 'Low',
        updatedAt: u.assessmentCompletedAt?.toDate?.() || new Date(),
      };
    }
  }

  return null;
}

const AssessmentResultsModal: React.FC<AssessmentResultsModalProps> = ({
  isOpen,
  onClose,
  studentId,
  latestResult: initialResult,
  heroBannerSummary,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('latest');
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(initialResult || null);
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [internalHeroBannerSummary, setInternalHeroBannerSummary] = useState<HeroBannerModalSummary | null>(null);

  useEffect(() => {
    if (isOpen && studentId && !heroBannerSummary) {
      const unsubscribe = subscribeToHeroBannerModalSummary(studentId, (summary: HeroBannerModalSummary | null) => {
        setInternalHeroBannerSummary(summary);
      });
      return () => unsubscribe();
    }
  }, [isOpen, studentId, heroBannerSummary]);

  const activeSummary = heroBannerSummary || internalHeroBannerSummary;


  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);

      const fetchData = async () => {
        try {
          const [result, hist] = await Promise.all([
            initialResult ? Promise.resolve(initialResult) : getLatestAssessmentResult(studentId),
            getAssessmentHistory(studentId),
          ]);
          setLatestResult(result);
          setHistory(hist);

          // If no heroBannerSummary from subscription yet, do a one-time read
          if (!heroBannerSummary && !internalHeroBannerSummary) {
            const directSummary = await getHeroBannerModalSummary(studentId);
            if (directSummary) {
              setInternalHeroBannerSummary(directSummary);
            } else {
              // Fallback chain: try multiple data sources
              const summary = await buildFallbackSummary(studentId);
              if (summary) setInternalHeroBannerSummary(summary);
            }
          }
        } catch (err) {
          console.error('[AssessmentResultsModal] fetch error:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
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
            {activeTab === 'latest' && (
              <motion.div
                key="latest"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <HeroBannerModalContent
                  heroBannerSummary={activeSummary}
                  latestResult={latestResult}
                  loading={loading}
                />
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