import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Brain, BookOpen, Zap, BarChart2, ExternalLink, GraduationCap } from 'lucide-react';

interface BloomsTaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BLOOM_CARDS = [
  {
    level: 'Remember',
    icon: Brain,
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/40',
    textColor: 'text-sky-400',
    description: 'Recall facts, formulas, definitions, and basic procedures.',
    mathExample: 'State the quadratic formula.',
    mapsTo: 'Identification, Enumeration',
    defaultWeight: 'Included by default',
  },
  {
    level: 'Understand',
    icon: BookOpen,
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/40',
    textColor: 'text-sky-400',
    description: 'Explain concepts, interpret graphs, classify mathematical objects.',
    mathExample: 'Explain why the discriminant determines the number of roots.',
    mapsTo: 'Multiple Choice, Identification',
    defaultWeight: 'Included by default',
  },
  {
    level: 'Apply',
    icon: Zap,
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/40',
    textColor: 'text-green-400',
    description: 'Use formulas and procedures to solve routine problems.',
    mathExample: 'Solve: 2x² + 5x - 3 = 0 using the quadratic formula.',
    mapsTo: 'Equation-Based, Word Problem',
    defaultWeight: 'Included by default',
  },
  {
    level: 'Analyze',
    icon: BarChart2,
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    textColor: 'text-orange-400',
    description: 'Break down problems, compare solution methods, identify patterns.',
    mathExample: 'Given f(x) = x³ - 3x, find and classify all critical points.',
    mapsTo: 'Word Problem, Equation-Based',
    defaultWeight: 'Included by default',
  },
];

const BloomsTaxonomyModal: React.FC<BloomsTaxonomyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <GraduationCap size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bloom's Taxonomy in MathPulse</h2>
                  <p className="text-cyan-200 text-xs">Understanding cognitive levels in assessments</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1 - What is Bloom's Taxonomy? */}
              <div>
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide mb-2">
                  What is Bloom's Taxonomy?
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Bloom's Taxonomy is an educational framework developed by Benjamin Bloom in 1956
                  and revised in 2001. It classifies learning objectives into six cognitive levels,
                  from basic recall of facts up to complex evaluation and creation. MathPulse uses
                  the first four levels most relevant to Senior High School mathematics.
                </p>
              </div>

              {/* Section 2 - Why MathPulse Uses It */}
              <div>
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide mb-2">
                  Why MathPulse Uses It
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Using Bloom's Taxonomy ensures that assessments do not only test memorization.
                  A well-balanced math quiz should challenge students at multiple cognitive levels:
                  remembering formulas, understanding concepts, applying procedures, and analyzing
                  relationships. This mirrors the DepEd K-12 competency framework which requires
                  higher-order thinking skills (HOTS) alongside foundational knowledge.
                </p>
              </div>

              {/* Section 3 - Level-by-Level Breakdown */}
              <div>
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide mb-3">
                  Level-by-Level Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BLOOM_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.level}
                        className={`${card.bgColor} border ${card.borderColor} rounded-xl p-4 space-y-2`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={18} className={card.textColor} />
                          <span className={`font-bold text-sm ${card.textColor}`}>{card.level}</span>
                        </div>
                        <p className="text-xs text-slate-500">{card.description}</p>
                        <div className="bg-black/20 rounded-lg p-2">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                            Math Example
                          </p>
                          <p className="text-xs text-[#dde3eb] italic">{card.mathExample}</p>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">
                            Maps to: <span className="text-slate-500 font-medium">{card.mapsTo}</span>
                          </span>
                          <span className="text-green-400 font-medium">{card.defaultWeight}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 4 - Note */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <span className="font-semibold text-slate-600">Note:</span>{' '}
                  All four levels are selected by default to produce a balanced, HOTS-aligned
                  assessment. Deselecting a level will remove questions of that cognitive depth
                  from the generated quiz.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0 bg-slate-50">
              <a
                href="https://cft.vanderbilt.edu/guides-sub-pages/blooms-taxonomy/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
              >
                <ExternalLink size={12} />
                Learn More
              </a>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-sky-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BloomsTaxonomyModal;
