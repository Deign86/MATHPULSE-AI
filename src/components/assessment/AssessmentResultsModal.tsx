import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  Award,
  Target,
  Brain,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Check,
  X,
  Compass,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import AssessmentHistoryChart from './AssessmentHistoryChart';
import MathText from '../MathText';
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
  /** Optional callback for "Continue to Learning Path" — called alongside onClose. */
  onContinueToLearningPath?: () => void;
}

type ProficiencyKey = 'Beginner' | 'Developing' | 'Proficient' | 'Advanced';

const proficiencyStyles: Record<ProficiencyKey, { bg: string; text: string; border: string }> = {
  Beginner: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
  },
  Developing: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800/60',
  },
  Proficient: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
  },
  Advanced: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800/60',
  },
};

type TabKey = 'latest' | 'history';

const AssessmentResultView: React.FC<{ result: AssessmentResult }> = ({ result }) => {
  const proficiency = proficiencyStyles[result.proficiencyLevel] || proficiencyStyles.Developing;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sleek Hero Score Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-white/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center font-black text-xl sm:text-2xl text-white shadow-inner shrink-0">
              <span>{Math.round(result.percentage)}%</span>
            </div>
            <div>
              <p className="text-purple-200 text-xs font-bold uppercase tracking-wider">Diagnostic Score</p>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mt-0.5">
                {result.score} / {result.totalQuestions} Correct
              </h3>
            </div>
          </div>
          <div className="self-end sm:self-center">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black border backdrop-blur-md shadow-xs ${proficiency.bg} ${proficiency.text} ${proficiency.border}`}>
              <Sparkles className="w-3.5 h-3.5" />
              {result.proficiencyLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Competency Breakdown */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5">
        <h4 className="font-bold text-slate-800 dark:text-white mb-3.5 flex items-center gap-2 text-sm sm:text-base">
          <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Competency Breakdown
        </h4>
        <div className="space-y-2.5">
          {result.competencyBreakdown.map((comp, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-2xs">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{comp.topic}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{comp.correctAnswers} of {comp.totalQuestions} items correct</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-24 sm:w-28 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      comp.accuracyPercent >= 70 ? 'bg-emerald-500' : comp.accuracyPercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${comp.accuracyPercent}%` }}
                  />
                </div>
                <span className="text-xs sm:text-sm font-mono font-black text-slate-700 dark:text-slate-300 w-10 text-right">
                  {Math.round(comp.accuracyPercent)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Narrative */}
      {result.aiNarrative && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">AI Assessment Insight</h5>
              <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed mt-1 font-medium">{result.aiNarrative}</p>
            </div>
          </div>
        </div>
      )}

      {/* Question Breakdown */}
      <div>
        <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Question Review
        </h4>
        <div className="space-y-3">
          {result.answers.map((ans, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border transition-all ${
                ans.isCorrect
                  ? 'border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white ${ans.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {ans.isCorrect ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    <span className="text-xs font-mono font-black text-slate-400 mr-1.5">Q{i + 1}.</span>
                    <MathText>{ans.questionText}</MathText>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Your answer:</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold ${ans.isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'}`}>
                      {ans.userAnswer || '—'}
                    </span>
                    {!ans.isCorrect && (
                      <>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-slate-500 dark:text-slate-400">Correct:</span>
                        <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          {ans.correctAnswer}
                        </span>
                      </>
                    )}
                  </div>
                  {ans.explanation && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 p-2.5 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/40 leading-relaxed">
                      <MathText>{ans.explanation}</MathText>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HeroBannerSummaryView: React.FC<{ summary: HeroBannerModalSummary }> = ({ summary }) => {
  const isHighRisk = summary.latestRiskLevel === 'At Risk' || summary.latestRiskLevel === 'High';
  const isModerate = summary.latestRiskLevel === 'Needs Attention' || summary.latestRiskLevel === 'Moderate';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Hero Score & Status Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-lg border border-white/20">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center font-black text-xl sm:text-2xl text-white shadow-inner shrink-0">
              <span className="leading-none">{Math.round(summary.latestScorePercent)}%</span>
            </div>
            <div className="min-w-0">
              <p className="text-purple-200 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Latest Score</p>
              <h3 className="text-lg sm:text-xl font-black text-white leading-snug truncate drop-shadow-xs">
                {summary.headline}
              </h3>
            </div>
          </div>

          {summary.latestRiskLevel && (
            <div className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-xs border ${
              isHighRisk
                ? 'bg-rose-500/20 text-rose-100 border-rose-400/40'
                : isModerate
                ? 'bg-amber-500/20 text-amber-100 border-amber-400/40'
                : 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40'
            }`}>
              {isHighRisk ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : isModerate ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{summary.latestRiskLevel} Risk</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Narrative */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Diagnostic Insights</span>
        </div>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
          {summary.summary}
        </p>
      </div>

      {/* Strengths & Focus Areas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {summary.strengths?.length > 0 && (
          <div className="border border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-2.5 flex items-center gap-2 text-xs sm:text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Strengths & Mastery
              </h4>
              <ul className="space-y-2">
                {summary.strengths.map((s, i) => (
                  <li key={i} className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-2 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {summary.weaknesses?.length > 0 && (
          <div className="border border-amber-500/25 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-2.5 flex items-center gap-2 text-xs sm:text-sm">
                <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Priority Focus Areas
              </h4>
              <ul className="space-y-2">
                {summary.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Recommended Next Step */}
      {summary.recommendation && (
        <div className="bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-sky-500/10 dark:from-violet-950/40 dark:via-indigo-950/40 dark:to-sky-950/40 rounded-2xl p-4 sm:p-5 border border-indigo-500/30 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-2 text-xs sm:text-sm font-bold">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <span>Recommended Next Step</span>
          </div>
          <p className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-100 leading-relaxed font-medium">
            {summary.recommendation.replace(/Kaya mo yan!/g, "You've got this!")}
          </p>
        </div>
      )}
    </div>
  );
};

const HeroBannerModalContent: React.FC<{
  heroBannerSummary: HeroBannerModalSummary | null | undefined;
  latestResult: AssessmentResult | null;
  loading: boolean;
}> = ({ heroBannerSummary, latestResult, loading }) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4 py-2">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!heroBannerSummary && !latestResult) {
    return (
      <div className="text-center py-10 px-4">
        <div className="w-16 h-16 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Brain className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Personalize Your Learning Path</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Complete your initial diagnostic assessment to unlock customized math modules, targeted practice, and AI tutoring.
        </p>
      </div>
    );
  }

  if (heroBannerSummary?.status === 'ready') {
    return <HeroBannerSummaryView summary={heroBannerSummary} />;
  }

  if (latestResult) {
    return <AssessmentResultView result={latestResult} />;
  }

  return (
    <div className="text-center py-10 px-4">
      <div className="w-16 h-16 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Preparing Learning Summary</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        Your diagnostic results are being processed. Check back in a moment for your personalized breakdown.
      </p>
    </div>
  );
};

/** Check all possible Firestore locations for assessment data and build a summary */
async function buildFallbackSummary(studentId: string): Promise<HeroBannerModalSummary | null> {
  const nullOnFailure = (source: string) => (err: Error): null => {
    console.debug(`[AssessmentResultsModal] fallback source ${source} unavailable:`, err);
    return null;
  };

  // 1. competencyProfiles/{uid}
  const cpSnap = await getDoc(doc(db, 'competencyProfiles', studentId)).catch(nullOnFailure('competencyProfiles'));
  if (cpSnap?.exists()) {
    const cp = cpSnap.data();
    const strengths: string[] = cp.primaryStrength ? [cp.primaryStrength] : [];
    const weaknesses: string[] = cp.primaryWeakness ? [cp.primaryWeakness] : [];
    return {
      status: 'ready',
      headline: cp.overallScore >= 70 ? 'Good job — keep it up!' : "Let's build your foundation",
      summary: weaknesses.length > 0
        ? `Focus on strengthening ${weaknesses[0]} to improve your overall performance.`
        : 'Keep practicing to maintain and expand your skills.',
      strengths,
      weaknesses,
      recommendation: cp.suggestedModule ? `Start with the ${cp.suggestedModule} module.` : 'Continue with your personalized learning path.',
      latestAssessmentId: '',
      latestScorePercent: cp.overallScore || 0,
      latestRiskLevel: cp.overallScore >= 70 ? 'Low' : cp.overallScore >= 50 ? 'Moderate' : 'High',
      updatedAt: cp.updatedAt?.toDate?.() || new Date(),
    };
  }

  // 2. assessments/{uid}/attempts
  const assessSnap = await getDocs(
    query(collection(db, 'assessments', studentId, 'attempts'), orderBy('completedAt', 'desc'), limit(1))
  ).catch(nullOnFailure('assessments/attempts'));
  if (assessSnap && !assessSnap.empty) {
    const d = assessSnap.docs[0].data();
    const score = d.rawScore || d.overallScorePercent || 0;
    const profile = d.proficiencyProfile;
    return {
      status: 'ready',
      headline: score >= 70 ? 'Good job — keep it up!' : "Let's build your foundation",
      summary: profile?.weaknesses?.length > 0
        ? `Focus on strengthening ${profile.weaknesses[0]} to improve.`
        : score >= 70 ? 'You have a solid foundation!' : "With consistent practice, you'll build confidence.",
      strengths: profile?.strengths || [],
      weaknesses: profile?.weaknesses || [],
      recommendation: profile?.suggestedStartingModule ? `Start with ${profile.suggestedStartingModule}.` : 'Follow your personalized learning path.',
      latestAssessmentId: d.assessmentId || '',
      latestScorePercent: score,
      latestRiskLevel: score >= 70 ? 'Low' : score >= 50 ? 'Moderate' : 'High',
      updatedAt: d.completedAt?.toDate?.() || new Date(),
    };
  }

  // 3. diagnosticResults/{uid}
  const diagSnap = await getDoc(doc(db, 'diagnosticResults', studentId)).catch(nullOnFailure('diagnosticResults'));
  if (diagSnap?.exists()) {
    const d = diagSnap.data();
    const score = d.overallScorePercent || d.overall_score_percent || 0;
    const weakDomains: string[] = d.riskProfile?.weak_domains || [];
    return {
      status: 'ready',
      headline: score >= 70 ? 'Good job — keep it up!' : "Let's build your foundation",
      summary: weakDomains.length > 0
        ? `Areas to focus on: ${weakDomains.join(', ')}.`
        : 'Assessment completed. Follow your learning path.',
      strengths: [],
      weaknesses: weakDomains,
      recommendation: d.recommended_intervention || 'Continue with your personalized learning path.',
      latestAssessmentId: '',
      latestScorePercent: score,
      latestRiskLevel: d.overall_risk || (score >= 70 ? 'Low' : 'Moderate'),
      updatedAt: d.completedAt?.toDate?.() || new Date(),
    };
  }

  // 4. users/{uid}/assessments
  const gradesSnap = await getDocs(
    query(collection(db, 'users', studentId, 'assessments'), orderBy('completedAt', 'desc'), limit(5))
  ).catch(nullOnFailure('users/assessments'));
  if (gradesSnap && !gradesSnap.empty) {
    const entries = gradesSnap.docs.map(d => d.data());
    const latest = entries[0];
    const score = latest.score || latest.scorePercent || 0;
    const totalAttempts = entries.length;
    const avgScore = Math.round(entries.reduce((sum, e) => sum + (e.score || e.scorePercent || 0), 0) / totalAttempts);
    return {
      status: 'ready',
      headline: score >= 70 ? 'Good job — keep it up!' : "Let's build your foundation",
      summary: `You've completed ${totalAttempts} diagnostic assessment${totalAttempts > 1 ? 's' : ''}. Your latest score is ${score}% (average: ${avgScore}%).`,
      strengths: [],
      weaknesses: latest.risk === 'At Risk' || latest.risk === 'High' ? [latest.subject || 'General Mathematics'] : [],
      recommendation: 'Continue with your personalized learning path to strengthen weak areas.',
      latestAssessmentId: latest.testId || '',
      latestScorePercent: score,
      latestRiskLevel: latest.risk || (score >= 70 ? 'Low' : score >= 50 ? 'Moderate' : 'High'),
      updatedAt: latest.completedAt?.toDate?.() || new Date(),
    };
  }

  // 5. User profile fallback
  const userSnap = await getDoc(doc(db, 'users', studentId)).catch(nullOnFailure('users/profile'));
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
        latestAssessmentId: '',
        latestScorePercent: 0,
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
  onContinueToLearningPath,
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

          if (!heroBannerSummary && !internalHeroBannerSummary) {
            const directSummary = await getHeroBannerModalSummary(studentId);
            if (directSummary) {
              setInternalHeroBannerSummary(directSummary);
            } else {
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
      <DialogContent className="w-[calc(100%-1.25rem)] sm:w-full max-w-xl md:max-w-2xl max-h-[90dvh] sm:max-h-[85dvh] flex flex-col p-0 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 mb-3 pr-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Assessment Results
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your diagnostic score, competency profile, and learning progress.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Segmented Pill Tabs */}
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 flex-1 px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          <AnimatePresence mode="wait">
            {activeTab === 'latest' && (
              <motion.div
                key="latest"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                  <h4 className="font-bold text-slate-800 dark:text-white mb-3 text-xs sm:text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Performance Over Time
                  </h4>
                  <AssessmentHistoryChart history={history} />
                </div>

                {history.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">Previous Attempts</h4>
                    <div className="space-y-2">
                      {history.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 rounded-xl">
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Attempt {history.length - i}</p>
                            <p className="text-[11px] text-slate-400">{new Date(entry.completedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm font-mono font-black text-purple-600 dark:text-purple-400">{entry.percentage}%</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{entry.proficiencyLevel}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Frosted Action Footer */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onContinueToLearningPath?.();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue to Learning Path</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentResultsModal;
