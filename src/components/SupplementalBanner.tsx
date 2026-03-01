import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, ChevronRight, X, AlertTriangle, TrendingUp, Brain } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface SupplementalBannerProps {
  /** At-risk subjects from diagnostic assessment */
  atRiskSubjects?: string[];
  /** Compact inline variant for quiz screens */
  variant?: 'full' | 'compact' | 'results';
  /** Quiz subject (for compact/results variant) */
  quizSubject?: string;
  /** Quiz score percentage (for results variant) */
  quizScore?: number;
  /** Callback when user clicks "Review Topics" or similar CTA */
  onAction?: () => void;
  /** Dismiss handler */
  onDismiss?: () => void;
}

// ─── Supplemental material links by subject ─────────────────

const SUPPLEMENTAL_RESOURCES: Record<string, { label: string; description: string; icon: React.ReactNode }[]> = {
  'General Mathematics': [
    { label: 'Functions Deep Dive', description: 'Interactive review of function types and graphs', icon: <TrendingUp size={14} /> },
    { label: 'Business Math Basics', description: 'Simple & compound interest practice', icon: <BookOpen size={14} /> },
  ],
  'Statistics and Probability': [
    { label: 'Distribution Visualizer', description: 'Explore normal distribution curves', icon: <TrendingUp size={14} /> },
    { label: 'Hypothesis Practice', description: 'Step-by-step hypothesis testing', icon: <Brain size={14} /> },
  ],
  'Pre-Calculus': [
    { label: 'Conic Sections Explorer', description: 'Visual parabola, ellipse, hyperbola tool', icon: <TrendingUp size={14} /> },
    { label: 'Trig Identity Practice', description: 'Identity verification drill set', icon: <Brain size={14} /> },
  ],
  'Basic Calculus': [
    { label: 'Limits Visualizer', description: 'Graphical approach to limits', icon: <TrendingUp size={14} /> },
    { label: 'Derivative Rules Drill', description: 'Practice chain rule & implicit diff', icon: <Brain size={14} /> },
  ],
};

function getSubjectKey(subject: string): string | null {
  const lower = subject.toLowerCase();
  if (lower.includes('general') || lower.includes('gen-math') || lower.includes('gen math')) return 'General Mathematics';
  if (lower.includes('stat') || lower.includes('prob')) return 'Statistics and Probability';
  if (lower.includes('pre-calc') || lower.includes('pre calc') || lower.includes('precalc')) return 'Pre-Calculus';
  if (lower.includes('basic') || lower.includes('calc')) return 'Basic Calculus';
  return null;
}

// ─── Full Banner (Dashboard) ────────────────────────────────

const FullBanner: React.FC<SupplementalBannerProps> = ({ atRiskSubjects = [], onAction, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || atRiskSubjects.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="overflow-hidden"
        >
          <div className="relative bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 rounded-2xl p-5 text-white shadow-lg shadow-sky-500/20">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={24} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg mb-1">Supplemental Materials Available</h3>
                <p className="text-sky-100 text-sm mb-3">
                  Based on your diagnostic assessment, we've identified topics that could use extra practice.
                  Strengthening these areas will improve your overall performance.
                </p>

                {/* At-risk subject pills */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {atRiskSubjects.map((subject) => (
                    <span
                      key={subject}
                      className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold"
                    >
                      <AlertTriangle size={12} />
                      {subject}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={onAction}
                  className="inline-flex items-center gap-2 bg-white text-sky-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-sky-50 transition-colors"
                >
                  Review Topics
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Compact Banner (Quiz Start / In-Quiz) ──────────────────

const CompactBanner: React.FC<SupplementalBannerProps> = ({ quizSubject, atRiskSubjects = [] }) => {
  const subjectKey = quizSubject ? getSubjectKey(quizSubject) : null;
  const isAtRisk = atRiskSubjects.some(s => {
    const sk = getSubjectKey(s);
    return sk && sk === subjectKey;
  });

  if (!isAtRisk || !subjectKey) return null;

  const resources = SUPPLEMENTAL_RESOURCES[subjectKey] || [];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mb-4 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle size={14} className="text-amber-600" />
          <span className="text-xs font-bold text-amber-800">
            Supplemental Focus Area — {subjectKey}
          </span>
        </div>
        <p className="text-xs text-amber-700 mb-2">
          This topic was flagged in your diagnostic. Take your time and review the explanations carefully.
        </p>
        {resources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resources.slice(0, 2).map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-xs font-medium">
                {r.icon}
                {r.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Results Banner (Post-Quiz) ─────────────────────────────

const ResultsBanner: React.FC<SupplementalBannerProps> = ({ quizSubject, quizScore = 0, atRiskSubjects = [], onAction }) => {
  const subjectKey = quizSubject ? getSubjectKey(quizSubject) : null;
  const isAtRisk = atRiskSubjects.some(s => {
    const sk = getSubjectKey(s);
    return sk && sk === subjectKey;
  });

  // Show banner if score < 70% OR if subject is at-risk
  if (quizScore >= 70 && !isAtRisk) return null;

  const resources = subjectKey ? (SUPPLEMENTAL_RESOURCES[subjectKey] || []) : [];
  const isLowScore = quizScore < 70;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-4"
    >
      <div className={`rounded-2xl p-4 border-2 ${
        isLowScore ? 'bg-orange-50 border-orange-200' : 'bg-sky-50 border-sky-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isLowScore ? 'bg-orange-500' : 'bg-sky-500'
          }`}>
            <BookOpen size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-display font-bold text-[#0a1628] text-sm mb-1">
              {isLowScore ? 'Review Recommended' : 'Supplemental Materials'}
            </h4>
            <p className="text-xs text-[#5a6578] mb-2">
              {isLowScore
                ? `You scored ${quizScore}% on this quiz. We recommend reviewing the following resources to strengthen your understanding.`
                : 'This topic was identified as an area for growth. Check out these additional resources.'}
            </p>
            {resources.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {resources.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-5 h-5 rounded flex items-center justify-center ${
                      isLowScore ? 'bg-orange-100 text-orange-600' : 'bg-sky-100 text-sky-600'
                    }`}>
                      {r.icon}
                    </span>
                    <span className="font-medium text-[#0a1628]">{r.label}</span>
                    <span className="text-slate-500">— {r.description}</span>
                  </div>
                ))}
              </div>
            )}
            {onAction && (
              <button
                onClick={onAction}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  isLowScore
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-sky-500 hover:bg-sky-600 text-white'
                }`}
              >
                Open Practice Center
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Export ─────────────────────────────────────────────

const SupplementalBanner: React.FC<SupplementalBannerProps> = (props) => {
  switch (props.variant) {
    case 'compact':
      return <CompactBanner {...props} />;
    case 'results':
      return <ResultsBanner {...props} />;
    case 'full':
    default:
      return <FullBanner {...props} />;
  }
};

export default SupplementalBanner;
