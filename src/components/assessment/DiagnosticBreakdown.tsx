import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Brain, Clock, Target, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Zap, BarChart3, Lightbulb, ChevronDown, ChevronUp,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { apiFetch } from '../../services/apiService';

interface DiagnosticResponse {
  question_id: string;
  domain: string;
  topic: string;
  difficulty: string;
  bloom_level: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
}

interface DiagnosticAnalysis {
  overall_summary: string;
  time_analysis: {
    pattern: string;
    fast_questions: string[];
    slow_questions: string[];
    insight: string;
  };
  strength_areas: Array<{ domain: string; detail: string }>;
  weakness_areas: Array<{ domain: string; detail: string; priority: string }>;
  answer_patterns: {
    description: string;
    common_mistakes: string[];
    positive_patterns: string[];
  };
  recommendations: Array<{ action: string; reason: string; priority: number }>;
  difficulty_analysis: {
    easy_performance: string;
    medium_performance: string;
    hard_performance: string;
  };
}

interface DiagnosticBreakdownProps {
  userId: string;
  mode: 'fullscreen' | 'modal';
  isOpen?: boolean;
  onClose: () => void;
}

interface QuestionWithText extends DiagnosticResponse {
  question_text?: string;
}

const DiagnosticBreakdown: React.FC<DiagnosticBreakdownProps> = ({ userId, mode, isOpen = true, onClose }) => {
  const [responses, setResponses] = useState<QuestionWithText[]>([]);
  const [domainScores, setDomainScores] = useState<Record<string, any>>({});
  const [riskProfile, setRiskProfile] = useState<Record<string, any>>({});
  const [analysis, setAnalysis] = useState<DiagnosticAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || !isOpen) return;
    loadData();
  }, [userId, isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const resultsSnap = await getDoc(doc(db, 'diagnosticResults', userId));
      if (!resultsSnap.exists()) { setLoading(false); return; }

      const data = resultsSnap.data();
      const rawResponses: DiagnosticResponse[] = data.responses || [];
      setDomainScores(data.domainScores || {});
      setRiskProfile(data.riskProfile || {});

      // Fetch question texts from session
      const testId = data.testId;
      let questionTexts: Record<string, string> = {};
      if (testId) {
        const sessionSnap = await getDoc(doc(db, 'diagnosticSessions', testId));
        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data();
          for (const q of (sessionData.questions || [])) {
            questionTexts[q.question_id] = q.question_text;
          }
        }
      }

      setResponses(rawResponses.map(r => ({ ...r, question_text: questionTexts[r.question_id] })));
      setLoading(false);

      // Fetch AI analysis (backend caches after first generation)
      setAnalysisLoading(true);
      try {
        const result = await apiFetch<{ success: boolean; analysis: DiagnosticAnalysis }>(
          '/api/diagnostic/analyze',
          { method: 'POST', body: JSON.stringify({ user_id: userId }) },
        );
        if (result.success) setAnalysis(result.analysis);
      } catch (err) {
        console.error('[DiagnosticBreakdown] AI analysis failed:', err);
      } finally {
        setAnalysisLoading(false);
      }
    } catch (err) {
      console.error('[DiagnosticBreakdown] Failed to load data:', err);
      setLoading(false);
      setAnalysisLoading(false);
    }
  };

  const totalCorrect = responses.filter(r => r.is_correct).length;
  const totalItems = responses.length;
  const totalTime = responses.reduce((sum, r) => sum + r.time_spent_seconds, 0);
  const avgTime = totalItems > 0 ? Math.round(totalTime / totalItems) : 0;
  const scorePercent = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

  if (!isOpen) return null;

  const content = (
    <div className={`${mode === 'fullscreen' ? 'min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30' : ''} flex flex-col`}>
      {/* Header */}
      <div className="top-0 z-10 bg-white border-b border-slate-200/60 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Diagnostic Assessment Breakdown</h1>
              <p className="text-xs text-slate-500">AI-powered analysis of your performance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" title="Close">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50">
                <p className="text-indigo-200 text-xs font-medium uppercase">Score</p>
                <p className="text-3xl font-black mt-1">{scorePercent}%</p>
                <p className="text-indigo-200 text-sm">{totalCorrect}/{totalItems} correct</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Clock className="w-4 h-4" /> <span className="text-xs font-medium uppercase">Avg Time</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{avgTime}s</p>
                <p className="text-xs text-slate-400">per question</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Zap className="w-4 h-4" /> <span className="text-xs font-medium uppercase">Total Time</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{Math.floor(totalTime / 60)}m {totalTime % 60}s</p>
                <p className="text-xs text-slate-400">assessment duration</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <AlertTriangle className="w-4 h-4" /> <span className="text-xs font-medium uppercase">Risk</span>
                </div>
                <p className={`text-2xl font-bold ${riskProfile.overall_risk === 'high' || riskProfile.overall_risk === 'critical' ? 'text-red-600' : riskProfile.overall_risk === 'moderate' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(riskProfile.overall_risk || 'unknown').charAt(0).toUpperCase() + (riskProfile.overall_risk || 'unknown').slice(1)}
                </p>
                <p className="text-xs text-slate-400">risk level</p>
              </div>
            </div>

            {/* AI Analysis Section */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-slate-800">AI Analysis</h2>
                </div>
              </div>
              <div className="p-6">
                {analysisLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-5/6" />
                  </div>
                ) : analysis ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <p className="text-slate-700 leading-relaxed">{analysis.overall_summary}</p>

                    {/* Time Analysis */}
                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                      <h3 className="font-semibold text-sky-800 text-sm mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Timing Patterns
                      </h3>
                      <p className="text-sm text-sky-700">{analysis.time_analysis.insight}</p>
                      {analysis.time_analysis.slow_questions.length > 0 && (
                        <p className="text-xs text-sky-600 mt-2">
                          <span className="font-medium">Took longest on:</span> {analysis.time_analysis.slow_questions.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.strength_areas.length > 0 && (
                        <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-4">
                          <h3 className="font-semibold text-emerald-800 text-sm mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Strengths
                          </h3>
                          <ul className="space-y-2">
                            {analysis.strength_areas.map((s, i) => (
                              <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>{s.domain}:</strong> {s.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.weakness_areas.length > 0 && (
                        <div className="border border-red-100 bg-red-50/50 rounded-xl p-4">
                          <h3 className="font-semibold text-red-800 text-sm mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" /> Weak Areas
                          </h3>
                          <ul className="space-y-2">
                            {analysis.weakness_areas.map((w, i) => (
                              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>{w.domain}:</strong> {w.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Answer Patterns */}
                    {analysis.answer_patterns.common_mistakes.length > 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <h3 className="font-semibold text-amber-800 text-sm mb-2">Answer Patterns</h3>
                        <p className="text-sm text-amber-700 mb-2">{analysis.answer_patterns.description}</p>
                        <ul className="space-y-1">
                          {analysis.answer_patterns.common_mistakes.map((m, i) => (
                            <li key={i} className="text-xs text-amber-600">• {m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {analysis.recommendations.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <h3 className="font-semibold text-indigo-800 text-sm mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" /> Recommendations
                        </h3>
                        <ol className="space-y-2">
                          {analysis.recommendations.map((r, i) => (
                            <li key={i} className="text-sm text-indigo-700">
                              <span className="font-medium">{i + 1}. {r.action}</span>
                              <span className="text-indigo-500 text-xs ml-2">— {r.reason}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Difficulty Breakdown */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Performance by Difficulty
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase font-medium">Easy</p>
                          <p className="text-sm font-bold text-slate-700 mt-1">{analysis.difficulty_analysis.easy_performance}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase font-medium">Medium</p>
                          <p className="text-sm font-bold text-slate-700 mt-1">{analysis.difficulty_analysis.medium_performance}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase font-medium">Hard</p>
                          <p className="text-sm font-bold text-slate-700 mt-1">{analysis.difficulty_analysis.hard_performance}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Analysis unavailable.</p>
                )}
              </div>
            </div>

            {/* Domain Scores */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" /> Domain Scores
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(domainScores).map(([domain, scores]: [string, any]) => (
                  <div key={domain} className="border border-slate-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">{domain}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-black text-slate-800">{scores.percentage}%</span>
                      <span className="text-xs text-slate-400 mb-1">{scores.correct}/{scores.total}</span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${scores.percentage >= 80 ? 'bg-emerald-500' : scores.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${scores.percentage}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 font-medium ${scores.mastery_level === 'mastered' ? 'text-emerald-600' : scores.mastery_level === 'developing' ? 'text-amber-600' : 'text-red-600'}`}>
                      {scores.mastery_level}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-Question Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" /> Question-by-Question Breakdown
                </h2>
              </div>
              <div className="divide-y divide-slate-50">
                {responses.map((r, i) => (
                  <div key={i} className="px-6 py-3 hover:bg-slate-50/50 transition-colors">
                    <button
                      onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${r.is_correct ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {r.is_correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          Q{i + 1}. {r.question_text || `${r.topic} (${r.domain})`}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-400">{r.difficulty}</span>
                          <span className="text-xs text-slate-400">{r.time_spent_seconds}s</span>
                          <span className="text-xs text-slate-400">{r.domain}</span>
                        </div>
                      </div>
                      {expandedQuestion === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {expandedQuestion === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-10 mt-2 pb-2 space-y-2"
                      >
                        {r.question_text && (
                          <p className="text-sm text-slate-600">{r.question_text}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs">
                          <span className={r.is_correct ? 'text-emerald-600' : 'text-red-600'}>
                            Your answer: <strong>{r.student_answer || '—'}</strong>
                          </span>
                          {!r.is_correct && (
                            <span className="text-emerald-600">Correct: <strong>{r.correct_answer}</strong></span>
                          )}
                          <span className="text-slate-500">Time: {r.time_spent_seconds}s</span>
                          <span className="text-slate-500">Bloom: {r.bloom_level}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Close button at bottom */}
            <div className="flex justify-center pb-8">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all"
              >
                {mode === 'fullscreen' ? 'Continue to Dashboard' : 'Close'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto will-change-transform"
              onClick={e => e.stopPropagation()}
            >
              {content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Fullscreen mode
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-indigo-50/30"
    >
      {content}
    </motion.div>
  );
};

export default DiagnosticBreakdown;
