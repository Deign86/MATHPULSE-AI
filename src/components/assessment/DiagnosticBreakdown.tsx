import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Brain, Clock, Target, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Zap, BarChart3, Lightbulb, ChevronDown, ChevronUp,
  ArrowUpRight, Sparkles, Filter, Award, Check
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { apiFetch } from '../../services/apiService';
import {
  JevBloomBadge,
  JevConfidenceBadge,
  bloomLevelFromLabel,
  fetchJevProfile,
  type BloomLevel,
  type JevMetrics,
} from '../CompetencyRadarChart';

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

/** Per-domain score block persisted in a diagnostic result document. */
interface DomainScoreSummary {
  percentage: number;
  correct: number;
  total: number;
  mastery_level?: string;
}

/** Overall risk classification persisted in a diagnostic result document. */
interface RiskProfileSummary {
  overall_risk?: string;
}

/**
 * Bloom level where a domain's wrong answers concentrate.
 * Derived from persisted per-response bloom_level — the level the student broke down at.
 */
function weakestBloomForDomain(responses: QuestionWithText[], domain: string): BloomLevel | undefined {
  const tally = new Map<BloomLevel, number>();
  responses.forEach(r => {
    if (r.domain !== domain || r.is_correct) return;
    const level = bloomLevelFromLabel(r.bloom_level);
    if (level !== undefined) tally.set(level, (tally.get(level) ?? 0) + 1);
  });
  let best: BloomLevel | undefined;
  let bestCount = 0;
  tally.forEach((count, level) => {
    if (count > bestCount) {
      best = level;
      bestCount = count;
    }
  });
  return best;
}

const DiagnosticBreakdown: React.FC<DiagnosticBreakdownProps> = ({ userId, mode, isOpen = true, onClose }) => {
  const [responses, setResponses] = useState<QuestionWithText[]>([]);
  const [domainScores, setDomainScores] = useState<Record<string, DomainScoreSummary>>({});
  const [riskProfile, setRiskProfile] = useState<RiskProfileSummary>({});
  const [analysis, setAnalysis] = useState<DiagnosticAnalysis | null>(null);
  const [jevMetrics, setJevMetrics] = useState<JevMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'insights' | 'domains' | 'questions'>('insights');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || !isOpen) return;
    loadData();
  }, [userId, isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadData = async () => {
    setLoading(true);
    try {
      const resultsSnap = await getDoc(doc(db, 'diagnosticResults', userId));
      if (!resultsSnap.exists()) { 
        setLoading(false); 
        return; 
      }

      const data = resultsSnap.data();
      const rawResponses: DiagnosticResponse[] = data.responses || [];
      setDomainScores(data.domainScores || {});
      setRiskProfile(data.riskProfile || {});

      // Fetch question texts from session
      const testId = data.testId;
      const questionTexts: Record<string, string> = {};
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

      // Persisted Jev mastery metrics for this student (bloomLevel + pCorrect)
      void fetchJevProfile(userId).then(setJevMetrics);

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

  const handleStartPractice = (topicName?: string) => {
    if (topicName) {
      sessionStorage.setItem('mathpulse_practice_topic', topicName);
    }
    sessionStorage.setItem('mathpulse_modules_tab', 'practice');
    window.dispatchEvent(new CustomEvent('mathpulse:navigate', { detail: { tab: 'Modules' } }));
    onClose();
  };

  const totalCorrect = responses.filter(r => r.is_correct).length;
  const totalItems = responses.length;
  const totalTime = responses.reduce((sum, r) => sum + r.time_spent_seconds, 0);
  const avgTime = totalItems > 0 ? Math.round(totalTime / totalItems) : 0;
  const scorePercent = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

  const filteredResponses = responses.filter(r => {
    if (questionFilter === 'correct') return r.is_correct;
    if (questionFilter === 'incorrect') return !r.is_correct;
    return true;
  });

  /** Domain → Bloom level where its wrong answers concentrate (undefined when untagged). */
  const bloomByDomain = useMemo(() => {
    const domains = new Set<string>();
    (analysis?.weakness_areas ?? []).forEach(w => domains.add(w.domain));
    Object.keys(domainScores).forEach(d => domains.add(d));
    const map = new Map<string, BloomLevel | undefined>();
    domains.forEach(domain => map.set(domain, weakestBloomForDomain(responses, domain)));
    return map;
  }, [analysis, domainScores, responses]);

  if (!isOpen) return null;

  const content = (
    <div className={`${mode === 'fullscreen' ? 'min-h-dvh bg-slate-50 dark:bg-slate-950' : 'bg-white dark:bg-slate-900'} flex flex-col`}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 sm:px-8 py-3.5 sm:py-4 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-[#9956DE] to-[#7274ED] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md shadow-purple-500/20 text-white shrink-0">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Diagnostic Assessment Breakdown
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-black border border-purple-200/60 dark:border-purple-800/40">
                  <Sparkles className="w-2.5 h-2.5" /> AI Evaluated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Personalized performance analysis and focused math study guidance
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" 
            title="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">
        {loading ? (
          <div className="space-y-4 py-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
            </div>
            <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* 1. Compact Bento KPI Overview Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
              
              {/* Score Hero Card (Spans full width on mobile, 1 col on desktop) */}
              <div className="rounded-2xl p-4 bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED] text-white shadow-md shadow-purple-500/20 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-md pointer-events-none" />
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/80 font-bold uppercase tracking-wider text-[10px]">Overall Score</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9px] font-black border border-white/20">
                    {scorePercent >= 75 ? 'Passing' : 'Needs Work'}
                  </span>
                </div>
                <div className="my-1">
                  <div className="text-3xl sm:text-4xl font-display font-black tracking-tight leading-none drop-shadow-xs">
                    {scorePercent}%
                  </div>
                  <p className="text-white/85 text-xs font-semibold mt-1">
                    {totalCorrect} of {totalItems} correct answers
                  </p>
                </div>
              </div>

              {/* 3 Metric Cards: 3 columns on mobile, 3 columns on desktop */}
              <div className="sm:col-span-3 grid grid-cols-3 gap-1.5 sm:gap-4 items-stretch">
                {/* Average Pace Card */}
                <div className="rounded-2xl p-2.5 sm:p-4 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Avg Pace</span>
                  </div>
                  <div className="text-base sm:text-2xl font-display font-black text-slate-800 dark:text-white">
                    {avgTime}s
                  </div>
                  <p className="text-[9px] sm:text-[11px] text-slate-400 font-medium truncate">
                    {avgTime <= 30 ? '⚡ Fast pace' : '⏱ Thoughtful'}
                  </p>
                </div>

                {/* Total Duration Card */}
                <div className="rounded-2xl p-2.5 sm:p-4 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Duration</span>
                  </div>
                  <div className="text-base sm:text-2xl font-display font-black text-slate-800 dark:text-white">
                    {Math.floor(totalTime / 60)}m {totalTime % 60}s
                  </div>
                  <p className="text-[9px] sm:text-[11px] text-slate-400 font-medium truncate">
                    Total assessment
                  </p>
                </div>

                {/* Risk Level Card */}
                <div className="rounded-2xl p-2.5 sm:p-4 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#FF8B8B] shrink-0" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Risk Level</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base sm:text-2xl font-display font-black ${
                      riskProfile.overall_risk === 'high' || riskProfile.overall_risk === 'critical' 
                        ? 'text-[#FF8B8B]' 
                        : riskProfile.overall_risk === 'moderate' 
                          ? 'text-[#FFB356]' 
                          : 'text-[#75D06A]'
                    }`}>
                      {(riskProfile.overall_risk || 'unknown').charAt(0).toUpperCase() + (riskProfile.overall_risk || 'unknown').slice(1)}
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[11px] text-slate-400 font-medium truncate">
                    Intervention status
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Progressive Disclosure Segmented Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-1">
              <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 w-full sm:w-auto overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('insights')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'insights'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>AI Insights</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('domains')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'domains'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Domain Mastery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('questions')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'questions'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Questions ({responses.length})</span>
                </button>
              </div>
            </div>

            {/* TAB 1: AI INSIGHTS & ACTIONS */}
            {activeTab === 'insights' && (
              <div className="space-y-4 sm:space-y-5 animate-in fade-in-50 duration-200">
                {/* Executive Summary Card */}
                <div className="bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 border border-purple-100/80 dark:border-purple-900/40 rounded-2xl p-4 sm:p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-display font-black text-sm sm:text-base text-slate-900 dark:text-white">
                      AI Diagnostic Summary
                    </h3>
                  </div>
                  {analysisLoading ? (
                    <div className="space-y-2 py-2">
                      <div className="h-3.5 bg-slate-200/60 dark:bg-slate-800 rounded animate-pulse w-4/5" />
                      <div className="h-3.5 bg-slate-200/60 dark:bg-slate-800 rounded animate-pulse w-3/5" />
                    </div>
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                      {analysis?.overall_summary || 'Your diagnostic assessment provides baseline benchmarks across Grade 11 STEM competencies. Continue practicing weak areas to build proficiency.'}
                    </p>
                  )}

                  {/* Timing Insight Pill */}
                  {analysis?.time_analysis?.insight && (
                    <div className="mt-3.5 pt-3 border-t border-purple-100/80 dark:border-purple-900/40 flex items-start gap-2 text-xs text-purple-900 dark:text-purple-200">
                      <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <span className="font-bold">Pacing Insight: </span>
                        <span>{analysis.time_analysis.insight}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Strengths & Weak Areas (2-Column Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Strengths Card */}
                  <div className="border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-4.5">
                    <div className="flex items-center gap-2 mb-3 text-emerald-800 dark:text-emerald-300">
                      <TrendingUp className="w-4 h-4" />
                      <h4 className="font-display font-black text-xs sm:text-sm uppercase tracking-wider">
                        Key Strengths
                      </h4>
                    </div>
                    {analysis?.strength_areas && analysis.strength_areas.length > 0 ? (
                      <ul className="space-y-2.5">
                        {analysis.strength_areas.map((s, i) => (
                          <li key={i} className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span><strong className="font-black text-emerald-950 dark:text-emerald-100">{s.domain}:</strong> {s.detail}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Continue completing drills to highlight consistent strengths.
                      </p>
                    )}
                  </div>

                  {/* Weak Areas / Priority Focus Card */}
                  <div className="border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl p-4.5">
                    <div className="flex items-center gap-2 mb-3 text-amber-800 dark:text-amber-300">
                      <Target className="w-4 h-4" />
                      <h4 className="font-display font-black text-xs sm:text-sm uppercase tracking-wider">
                        Focus Areas For Improvement
                      </h4>
                    </div>
                    {analysis?.weakness_areas && analysis.weakness_areas.length > 0 ? (
                      <ul className="space-y-2.5">
                        {analysis.weakness_areas.map((w, i) => (
                          <li key={i} className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span><strong className="font-black text-amber-950 dark:text-amber-100">{w.domain}:</strong> {w.detail}</span>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[9px] font-black uppercase tracking-wider">
                              {w.priority || 'Priority'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        No critical weak areas detected. You are on track!
                      </p>
                    )}
                  </div>

                </div>

                {/* Actionable Recommendations */}
                {analysis?.recommendations && analysis.recommendations.length > 0 && (
                  <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl p-4.5 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-2 mb-3 text-purple-700 dark:text-purple-300">
                      <Lightbulb className="w-4 h-4" />
                      <h4 className="font-display font-black text-xs sm:text-sm uppercase tracking-wider">
                        Recommended Next Steps
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {analysis.recommendations.map((r, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700 flex flex-col justify-between gap-2.5">
                          <div>
                            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 text-xs font-black mb-1">
                              <span>Step {i + 1}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-800 dark:text-white font-bold">{r.action}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                              {r.reason}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartPractice(r.action)}
                            className="self-start inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black transition-colors cursor-pointer"
                          >
                            <span>Practice Drill</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Difficulty Performance Breakdown */}
                {analysis?.difficulty_analysis && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Performance by Question Difficulty
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Easy</span>
                        <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                          {analysis.difficulty_analysis.easy_performance || '—'}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Medium</span>
                        <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                          {analysis.difficulty_analysis.medium_performance || '—'}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Hard</span>
                        <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                          {analysis.difficulty_analysis.hard_performance || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DOMAIN MASTERY */}
            {activeTab === 'domains' && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {Object.entries(domainScores).map(([domain, scores]) => {
                    const isMastered = scores.percentage >= 80;
                    const isDeveloping = scores.percentage >= 60 && scores.percentage < 80;

                    return (
                      <div key={domain} className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white line-clamp-2">
                              {domain}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              isMastered 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                : isDeveloping 
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            }`}>
                              {scores.mastery_level || (isMastered ? 'Mastered' : isDeveloping ? 'Developing' : 'Needs Work')}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline justify-between text-xs text-slate-500 mb-1.5">
                            <span className="text-2xl font-display font-black text-slate-800 dark:text-white">
                              {scores.percentage}%
                            </span>
                            <span className="font-semibold">
                              {scores.correct} / {scores.total} correct
                            </span>
                          </div>

                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isMastered ? 'bg-[#75D06A]' : isDeveloping ? 'bg-[#FFB356]' : 'bg-[#FF8B8B]'
                              }`}
                              style={{ width: `${scores.percentage}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartPractice(domain)}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-purple-50 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Practice Topic</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: QUESTION-BY-QUESTION REVIEW */}
            {activeTab === 'questions' && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Filter Chips */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('all')}
                    className={`px-3 py-1 rounded-xl font-black transition-all cursor-pointer ${
                      questionFilter === 'all'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All ({responses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('correct')}
                    className={`px-3 py-1 rounded-xl font-black transition-all cursor-pointer ${
                      questionFilter === 'correct'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Correct ({totalCorrect})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('incorrect')}
                    className={`px-3 py-1 rounded-xl font-black transition-all cursor-pointer ${
                      questionFilter === 'incorrect'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Needs Work ({responses.length - totalCorrect})
                  </button>
                </div>

                {/* Questions List */}
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
                  {filteredResponses.length > 0 ? (
                    filteredResponses.map((r, i) => {
                      const isExpanded = expandedQuestion === i;

                      return (
                        <div key={i} className="p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <button
                            type="button"
                            onClick={() => setExpandedQuestion(isExpanded ? null : i)}
                            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                r.is_correct 
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400'
                              }`}>
                                {r.is_correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                  Q{i + 1}. {r.question_text || `${r.topic} (${r.domain})`}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  <span className="capitalize">{r.difficulty}</span>
                                  <span>•</span>
                                  <span>{r.time_spent_seconds}s</span>
                                  <span>•</span>
                                  <span className="truncate">{r.domain}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-slate-400 shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="ml-10 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2.5 animate-in fade-in-50 duration-150">
                              {r.question_text && (
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl">
                                  {r.question_text}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                                <span className={`px-2.5 py-1 rounded-lg font-bold ${
                                  r.is_correct 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60' 
                                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/60'
                                }`}>
                                  Your Answer: <strong className="font-black">{r.student_answer || '—'}</strong>
                                </span>
                                {!r.is_correct && (
                                  <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                                    Correct Answer: <strong className="font-black">{r.correct_answer}</strong>
                                  </span>
                                )}
                                <span className="text-slate-400 font-medium">
                                  Bloom's Taxonomy: <strong className="text-slate-600 dark:text-slate-300">{r.bloom_level}</strong>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No questions match the selected filter.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-2 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400 text-center sm:text-left">
                DepEd SHS diagnostic benchmark • Grade 11 STEM
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close Analysis
                </button>
                <button
                  type="button"
                  onClick={() => handleStartPractice()}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Practice Weak Areas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (mode === 'modal') {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              className="relative my-auto bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90dvh] overflow-y-auto border border-slate-100 dark:border-slate-800 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
              onClick={e => e.stopPropagation()}
            >
              {content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  // Fullscreen mode
  if (typeof document === 'undefined') return null;
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50 dark:bg-slate-950"
    >
      {content}
    </motion.div>,
    document.body
  );
};

export default DiagnosticBreakdown;

