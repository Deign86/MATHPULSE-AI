import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, BookOpen, Lightbulb,
  Calculator, Award, RefreshCw, AlertTriangle, NotebookPen,
  Clock, Key, ClipboardCheck, Target, Zap, PlayCircle
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Rich text formatter — breaks plain paragraphs into formatted JSX.
//
// Handles explicit markdown:
//   **bold**, *italic*, `code`, ==highlight==
//   - / • / * bullet lines, 1. / 1) numbered lists
//   Formula lines containing math symbols
//   Heading-like lines (short, ends with colon)
//
// Also auto-detects plain-text patterns common in AI-generated lesson content:
//   • "Definition:" / "Formula:" / "Note:" / "Example:" prefixes → callout cards
//   • Standalone formula-only lines (e.g. "A = P(1 + rt)") → formula box
//   • Long paragraphs (>200 chars) → split at sentence boundaries for readability
//   • Key term auto-bolding: first occurrence of terms followed by "is", "are",
//     "refers to", "defined as", or wrapped in quotes
// ---------------------------------------------------------------------------

/** Math symbols that signal a formula line */
const MATH_RE = /[=×÷±√∑∫π²³%]/;

/** Callout prefix patterns — "Definition:", "Formula:", "Note:", etc. */
const CALLOUT_PREFIX_RE = /^(Definition|Formula|Note|Reminder|Important|Example|Key Concept|Concept|Rule|Theorem|Property|Step)s?\s*:/i;

/** Auto-bold: term followed by "is/are/refers to/defined as" or in quotes */
function autoHighlightTerms(text: string): string {
  // "X is ..." → **X** is ...  (only first word-group before "is/are")
  return text
    .replace(/\b([A-Z][a-zA-Z\s]{2,30}?)\s+(is|are|refers to|defined as|means)\b/g, (_, term, verb) =>
      `**${term.trim()}** ${verb}`
    )
    // "term" in quotes → **term**
    .replace(/"([^"]{3,40})"/g, (_, t) => `**${t}**`);
}

function formatContent(raw: string): React.ReactNode {
  if (!raw?.trim()) return null;

  const lines = raw.split('\n');
  const nodes: React.ReactNode[] = [];
  let paraBuffer: string[] = [];
  let listBuffer: string[] = [];
  let numberedBuffer: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (paraBuffer.length === 0) return;
    const text = paraBuffer.join(' ').trim();
    if (!text) { paraBuffer = []; return; }

    // Split very long paragraphs at sentence boundaries for readability
    const sentences = text.match(/[^.!?]+[.!?]+["']?/g) || [text];
    const chunks: string[][] = [];
    let current: string[] = [];
    let len = 0;
    for (const s of sentences) {
      current.push(s);
      len += s.length;
      if (len > 220) { chunks.push(current); current = []; len = 0; }
    }
    if (current.length) chunks.push(current);

    for (const chunk of chunks) {
      const chunkText = autoHighlightTerms(chunk.join(' ').trim());
      nodes.push(
        <p key={key++} className="lesson-body-text text-slate-700 leading-[1.8] text-[1rem] font-body">
          {inlineFormat(chunkText)}
        </p>
      );
    }
    paraBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key++} className="space-y-2.5 my-1 pl-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-slate-700 text-[0.95rem] leading-[1.75] font-body">
            <span className="mt-[0.5rem] w-2 h-2 rounded-full bg-[#1a85a4] flex-shrink-0" />
            <span>{inlineFormat(autoHighlightTerms(item))}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const flushNumbered = () => {
    if (numberedBuffer.length === 0) return;
    nodes.push(
      <ol key={key++} className="space-y-2.5 my-1 list-none pl-1">
        {numberedBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-slate-700 text-[0.95rem] leading-[1.75] font-body">
            <span className="mt-0.5 min-w-[1.5rem] h-[1.5rem] rounded-full bg-[#1a85a4] text-white text-[0.7rem] font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <span>{inlineFormat(autoHighlightTerms(item))}</span>
          </li>
        ))}
      </ol>
    );
    numberedBuffer = [];
  };

  const isBullet   = (l: string) => /^[\-•\*]\s+/.test(l.trim());
  const isNumbered = (l: string) => /^\d+[\.\)]\s+/.test(l.trim());
  const isFormula  = (l: string) => MATH_RE.test(l) && l.trim().length < 120;

  // Callout type → color scheme
  const calloutScheme = (prefix: string): { bg: string; border: string; text: string; label: string } => {
    const p = prefix.toLowerCase();
    if (/formula|theorem|property|rule/.test(p))
      return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', label: '📐' };
    if (/definition|concept|key/.test(p))
      return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', label: '📖' };
    if (/note|reminder|important/.test(p))
      return { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-900', label: '⚠️' };
    if (/example|step/.test(p))
      return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', label: '✏️' };
    return { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-800', label: '💡' };
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList();
      flushNumbered();
      flushPara();
      continue;
    }

    // Callout card: "Definition: ..." or "Formula: ..."
    const calloutMatch = trimmed.match(CALLOUT_PREFIX_RE);
    if (calloutMatch) {
      flushList();
      flushNumbered();
      flushPara();
      const prefix = calloutMatch[1];
      const body = trimmed.slice(calloutMatch[0].length).trim();
      const scheme = calloutScheme(prefix);
      nodes.push(
        <div key={key++} className={`rounded-xl px-4 py-3.5 border-l-4 ${scheme.bg} ${scheme.border} my-1`}>
          <p className={`text-[0.75rem] font-black uppercase tracking-widest mb-1.5 ${scheme.text} opacity-80 font-display`}>
            {scheme.label} {prefix}
          </p>
          <p className={`text-[0.95rem] leading-[1.75] font-semibold font-body ${scheme.text}`}>
            {inlineFormat(body)}
          </p>
        </div>
      );
      continue;
    }

    if (isBullet(trimmed)) {
      flushPara();
      flushNumbered();
      listBuffer.push(trimmed.replace(/^[\-•\*]\s+/, ''));
      continue;
    }

    if (isNumbered(trimmed)) {
      flushPara();
      flushList();
      numberedBuffer.push(trimmed.replace(/^\d+[\.\)]\s+/, ''));
      continue;
    }

    // Standalone formula line (short, math-heavy, no sentence structure)
    if (isFormula(trimmed) && !/[a-z]{5,}/.test(trimmed)) {
      flushList();
      flushNumbered();
      flushPara();
      nodes.push(
        <div key={key++} className="lesson-formula-box my-3">
          {trimmed}
        </div>
      );
      continue;
    }

    // Heading-like line: short, ends with colon, not a sentence
    if (trimmed.endsWith(':') && trimmed.length < 80 && !trimmed.startsWith(' ')) {
      flushList();
      flushNumbered();
      flushPara();
      nodes.push(
        <p key={key++} className="lesson-section-heading text-[#1a85a4] text-[1.05rem] mt-5 mb-1 border-b-2 border-[#1a85a4]/20 pb-1.5">
          {inlineFormat(trimmed)}
        </p>
      );
      continue;
    }

    flushList();
    flushNumbered();
    paraBuffer.push(line);
  }

  flushList();
  flushNumbered();
  flushPara();

  return <div className="space-y-3">{nodes}</div>;
}

// ---------------------------------------------------------------------------
// Inline formatter: **bold**, *italic*, `code`, ==highlight==
// ---------------------------------------------------------------------------
function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Order matters: bold before italic
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|==(.+?)==)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<React.Fragment key={k++}>{text.slice(last, match.index)}</React.Fragment>);
    }
    if (match[2]) {
      // **bold** — vibrant teal highlight pill for key terms
      parts.push(
        <strong key={k++} className="font-extrabold text-[#1a85a4] bg-[#e0f4fa] px-1 py-0.5 rounded-md font-body">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(<em key={k++} className="italic text-slate-500 font-body">{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={k++} className="px-1.5 py-0.5 bg-slate-100 rounded text-[0.85em] font-mono text-[#e66a5e] border border-slate-200 font-semibold">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      parts.push(
        <mark key={k++} className="bg-[#fff3cd] text-[#92400e] px-1 py-0.5 rounded-md font-bold border-b-2 border-[#fbbf24]">
          {match[5]}
        </mark>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(<React.Fragment key={k++}>{text.slice(last)}</React.Fragment>);
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
import { VideoLessonSection } from './notebook/VideoLessonSection';
import TryItYourselfPage from './TryItYourselfPage';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { Lesson, Quiz } from '../data/subjects';
import type { RagLessonSection } from '../services/lessonService';
import { useLessonContent } from '../hooks/useLessonContent';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logLessonView } from '../services/trackingService';

interface LessonViewerProps {
  lesson: Lesson & { subjectId?: string; lessonId?: string; competencyCode?: string };
  lessonCompletionXP?: number;
  practiceQuiz?: Quiz | null;
  practiceQuizCompleted?: boolean;
  practiceQuizScore?: number;
  initialSection?: number;
  onStartPractice?: () => void;
  onBack: () => void;
  onComplete: (score?: number, totalXP?: number, goToNext?: boolean) => void;
  onProgressUpdate?: (percent: number) => void;
  /** Fires when the inline Try It Yourself quiz is completed — use to persist to Firestore and award XP */
  onTryItQuizComplete?: (scorePercent: number) => void;
  /** Fires when user clicks Continue Learning in the Try It Yourself quiz overlay — advances to next lesson */
  onContinueLearning?: () => void;
}

// ---------------------------------------------------------------------------
// parseIntroContent — splits intro content into:
//   { welcome: string, objectives: { text: string; example?: string }[] }
//
// Objectives are detected as:
//   • Numbered lines: "1. Identify and use variables..."
//   • Bullet lines:   "- Write equations..."
//   • Lines starting with a verb (Identify, Write, Set, Use, Apply, Solve…)
// An "example" sub-line is a short line immediately after an objective that
// starts with "Example:" or "e.g." or is wrapped in parentheses.
// ---------------------------------------------------------------------------
function parseIntroContent(raw: string): {
  welcome: string;
  objectives: { text: string; example?: string }[];
} {
  if (!raw?.trim()) return { welcome: '', objectives: [] };

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const OBJECTIVE_RE = /^(\d+[\.\)]\s+|[-•*]\s+|(Identify|Write|Set|Use|Apply|Solve|Compute|Calculate|Determine|Understand|Describe|Explain|Analyze|Evaluate|Create|Define|Distinguish|Compare|Illustrate|Demonstrate|Perform|Simplify|Represent|Model|Interpret|Recognize|Classify|Construct|Derive|Formulate|Graph|Sketch|Verify|Prove|Estimate|Approximate|Convert|Translate|Predict|Justify|Generalize|Extend|Develop|Explore|Investigate|Discover|Observe|Measure|Record|Report|Present|Communicate|Collaborate|Reflect|Review|Summarize|Conclude|Infer|Hypothesize|Test|Experiment|Design|Plan|Implement|Evaluate|Assess|Monitor|Adjust|Improve|Optimize|Innovate|Create|Produce|Publish|Share|Teach|Learn|Practice|Apply|Transfer|Connect|Integrate|Synthesize|Analyze|Evaluate|Create)\b)/i;
  const EXAMPLE_RE = /^(Example:|e\.g\.|For example:|Sample:|\()/i;

  const welcomeLines: string[] = [];
  const objectives: { text: string; example?: string }[] = [];
  let inObjectives = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (OBJECTIVE_RE.test(line)) {
      inObjectives = true;
      const text = line.replace(/^(\d+[\.\)]\s+|[-•*]\s+)/, '').trim();
      // Check next line for an example sub-line
      const next = lines[i + 1];
      if (next && EXAMPLE_RE.test(next)) {
        objectives.push({ text, example: next });
        i++; // skip the example line
      } else {
        objectives.push({ text });
      }
    } else if (!inObjectives) {
      welcomeLines.push(line);
    }
    // Lines after objectives that aren't objectives themselves are ignored
    // (they're usually trailing filler)
  }

  return {
    welcome: welcomeLines.join(' ').trim(),
    objectives,
  };
}

/** Objective card accent colors — cycles through a palette */
const OBJECTIVE_COLORS = [
  { bg: 'bg-purple-50',  border: 'border-purple-200', num: 'bg-purple-500',  text: 'text-purple-700',  ex: 'text-purple-500'  },
  { bg: 'bg-sky-50',     border: 'border-sky-200',    num: 'bg-sky-500',     text: 'text-sky-700',     ex: 'text-sky-500'     },
  { bg: 'bg-emerald-50', border: 'border-emerald-200',num: 'bg-emerald-500', text: 'text-emerald-700', ex: 'text-emerald-500' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',  num: 'bg-amber-500',   text: 'text-amber-700',   ex: 'text-amber-500'   },
  { bg: 'bg-rose-50',    border: 'border-rose-200',   num: 'bg-rose-500',    text: 'text-rose-700',    ex: 'text-rose-500'    },
];

function LoadingSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 gap-5">
      <div className="w-12 h-12 rounded-full border-4 border-rose-400 border-t-transparent animate-spin" />
      <div className="space-y-2 text-center">
        <p className="text-slate-700 font-semibold text-base">Loading lesson from DepEd curriculum...</p>
        <p className="text-slate-400 text-xs max-w-xs">This may take a moment while the AI retrieves curriculum content.</p>
      </div>
      <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-rose-300 rounded-full"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '50%' }}
        />
      </div>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
  isOffline,
}: {
  message: string;
  onRetry: () => void;
  isOffline: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 text-center"
      >
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="text-red-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {isOffline ? 'Lesson Source Unavailable' : 'Failed to Load Lesson'}
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">{message}</p>
        <Button
          onClick={onRetry}
          className="w-full py-3 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} />
          Try Again
        </Button>
        <button onClick={onRetry} className="mt-3 text-slate-400 text-xs hover:text-slate-600 underline">
          Retry
        </button>
      </motion.div>
    </div>
  );
}

function SectionRenderer({
  section,
  sectionIndex,
  onShowSolution,
  expandedIndex,
  lesson,
  practiceQuiz,
  practiceQuizCompleted,
  practiceQuizScore,
  onStartPractice,
  lessonSpecificTopic,
  onStartTryItQuiz,
}: {
  section: RagLessonSection;
  sectionIndex: number;
  onShowSolution: (idx: number) => void;
  expandedIndex: number | null;
  lesson: LessonViewerProps['lesson'];
  practiceQuiz?: Quiz | null;
  practiceQuizCompleted?: boolean;
  practiceQuizScore?: number;
  onStartPractice?: () => void;
  lessonSpecificTopic?: string | null;
  onStartTryItQuiz?: () => void;
}) {
  switch (section.type) {
    case 'introduction': {
      const { welcome, objectives } = parseIntroContent(section.content || '');
      // Count total sections for the "Heads Up" banner
      const totalSectionCount = 7; // standard RAG lesson always has 7 sections

      return (
        <div className="space-y-5">
          {/* Welcome paragraph — large hook card with math pattern bg */}
          {welcome ? (
            <div className="lesson-welcome-card rounded-2xl border-2 border-[#1a85a4]/30 bg-gradient-to-br from-[#e8f7fc] to-[#f0fbff] px-6 py-5 shadow-md">
              {/* Decorative label */}
              <p className="lesson-section-heading text-[#1a85a4] text-[0.7rem] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 bg-[#1a85a4] rounded-full" />
                Welcome to the Lesson
              </p>
              <p className="font-body text-slate-700 text-[1.05rem] leading-[1.85] font-medium">
                {inlineFormat(autoHighlightTerms(welcome))}
              </p>
            </div>
          ) : !section.content?.trim() ? (
            <p className="text-slate-400 text-sm italic">Introduction content is being prepared. Please proceed to the next section or try refreshing the lesson.</p>
          ) : (
            <div className="lesson-welcome-card rounded-2xl border-2 border-[#1a85a4]/30 bg-gradient-to-br from-[#e8f7fc] to-[#f0fbff] px-6 py-5 shadow-md">
              {formatContent(section.content)}
            </div>
          )}

          {/* Callouts — "Heads Up" style banners */}
          {section.callouts && section.callouts.length > 0 && section.callouts.map((callout, i) => (
            <div
              key={i}
              className={`lesson-callout-headsup flex items-start gap-3.5 ${
                callout.type === 'tip'
                  ? '!bg-gradient-to-r !from-emerald-50 !to-teal-50 !border-emerald-400'
                  : ''
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm ${
                callout.type === 'tip' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}>
                <Lightbulb size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`lesson-section-heading text-[0.65rem] uppercase tracking-[0.2em] mb-1 ${
                  callout.type === 'tip' ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {callout.type === 'tip' ? '✨ Tip' : callout.type === 'important' ? '⚠️ Heads Up' : '📌 Note'}
                </p>
                <p className="font-body text-[0.95rem] text-slate-700 leading-[1.75] font-medium">{callout.text}</p>
              </div>
            </div>
          ))}

          {/* Auto "Heads Up" banner if no callouts */}
          {(!section.callouts || section.callouts.length === 0) && (
            <div className="lesson-callout-headsup flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Lightbulb size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="lesson-section-heading text-[0.65rem] uppercase tracking-[0.2em] mb-1 text-amber-600">
                  ⚠️ Heads Up
                </p>
                <p className="font-body text-[0.95rem] text-slate-700 leading-[1.75] font-medium">
                  This lesson has {totalSectionCount} sections and takes about 20 minutes to complete. Grab a pen — you might want to take notes along the way!
                </p>
              </div>
            </div>
          )}

          {/* "What you'll learn" objectives */}
          {objectives.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={20} className="text-violet-500" />
                <h3 className="lesson-section-heading text-[1.05rem]" style={{ color: '#7c3aed' }}>What you'll learn</h3>
              </div>
              <div className="space-y-2.5">
                {objectives.map((obj, i) => {
                  const color = OBJECTIVE_COLORS[i % OBJECTIVE_COLORS.length];
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border-2 px-4 py-3.5 flex items-start gap-3.5 ${color.bg} ${color.border} shadow-sm`}
                    >
                      <span className={`mt-0.5 min-w-[1.75rem] h-7 rounded-full ${color.num} text-white text-[0.7rem] font-black flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className={`font-body text-[0.95rem] font-semibold leading-snug ${color.text}`}>
                          {inlineFormat(autoHighlightTerms(obj.text))}
                        </p>
                        {obj.example && (
                          <p className={`text-xs mt-1 ${color.ex} font-mono font-semibold`}>
                            {obj.example}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'key_concepts':
      return (
        <div className="space-y-4">
          {section.content?.trim() ? (
            <div className="mb-4">{formatContent(section.content)}</div>
          ) : (
            <p className="text-slate-400 text-sm italic mb-4">Key concepts are being compiled. Review the curriculum sources below for reference material.</p>
          )}
          {section.callouts && section.callouts.length > 0 && (
            <div className="space-y-3">
              {section.callouts.map((callout, i) => (
                <div
                  key={i}
                  className={`rounded-xl border-2 px-5 py-4 flex items-start gap-3.5 shadow-sm ${
                    callout.type === 'important'
                      ? 'bg-rose-50 border-rose-300'
                      : callout.type === 'tip'
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-amber-50 border-amber-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm ${
                    callout.type === 'important' ? 'bg-rose-500' : callout.type === 'tip' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}>
                    <Lightbulb size={16} className="text-white" />
                  </div>
                  <div>
                    <p className={`lesson-section-heading text-[0.65rem] uppercase tracking-[0.2em] mb-1 ${
                      callout.type === 'important' ? 'text-rose-500' : callout.type === 'tip' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {callout.type === 'important' ? '🔑 Important' : callout.type === 'tip' ? '✨ Tip' : '📌 Note'}
                    </p>
                    <p className="font-body text-[0.95rem] text-slate-700 leading-[1.75] font-medium">{inlineFormat(callout.text)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'video':
      return (
        <div className="space-y-4">
          {section.content?.trim() ? (
            <p className="text-slate-600 text-sm">{section.content}</p>
          ) : (
            <p className="text-slate-400 text-sm italic">Video explanation loading...</p>
          )}
          <VideoLessonSection
            videos={section.videos || []}
            topic={lesson.title}
          />
        </div>
      );

    case 'worked_examples':
      return (
        <div className="space-y-5">
          {section.examples && section.examples.length > 0 ? (
            section.examples.map((example, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-rose-200 shadow-md"
              >
                {/* Problem header */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Calculator size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="lesson-section-heading text-[0.65rem] uppercase tracking-[0.2em] text-rose-400 mb-1">
                      Example {i + 1}
                    </p>
                    <p className="font-body font-bold text-slate-800 text-[1rem] leading-snug">{example.problem}</p>
                  </div>
                </div>

                {/* Solution steps */}
                {example.steps.length > 0 && (
                  <div className="ml-14 space-y-2.5 mb-3">
                    <p className="lesson-section-heading text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 mb-1.5">Solution</p>
                    {example.steps.map((step, si) => {
                      const isFormulaStep = MATH_RE.test(step) && step.length < 100 && !/[a-z]{6,}/.test(step);
                      return isFormulaStep ? (
                        <div key={si} className="lesson-formula-box">
                          {step}
                        </div>
                      ) : (
                        <div key={si} className="flex items-start gap-3">
                          <span className="mt-0.5 min-w-[1.5rem] h-[1.5rem] rounded-full bg-white border-2 border-rose-300 text-rose-500 text-[0.65rem] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
                            {si + 1}
                          </span>
                          <p className="font-body text-slate-700 text-[0.95rem] leading-[1.75]">{inlineFormat(step)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Answer box */}
                {example.answer && (
                  <div className="ml-14 flex items-center gap-3 mt-3 pt-3 border-t-2 border-rose-200">
                    <div className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-lg text-white text-[0.65rem] font-black uppercase tracking-widest flex-shrink-0 shadow-sm">
                      Answer
                    </div>
                    <p className="font-body text-slate-800 text-[0.95rem] font-bold">{example.answer}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm italic">No worked examples available for this lesson.</p>
          )}
        </div>
      );

    case 'important_notes':
      return (
        <div className="space-y-3">
          {section.bulletPoints && section.bulletPoints.length > 0 ? (
            section.bulletPoints.map((point, i) => {
              const calloutMatch = point.match(/^(Note|Important|Remember|Warning|Tip|Key|Formula|Rule)\s*:/i);
              if (calloutMatch) {
                const label = calloutMatch[1];
                const body = point.slice(calloutMatch[0].length).trim();
                const isWarning = /note|important|warning|remember/i.test(label);
                return (
                  <div key={i} className={`rounded-xl px-5 py-4 border-l-4 flex items-start gap-3.5 shadow-sm ${isWarning ? 'bg-rose-50 border-rose-400' : 'bg-amber-50 border-amber-400'}`}>
                    <Lightbulb size={18} className={`mt-0.5 flex-shrink-0 ${isWarning ? 'text-rose-500' : 'text-amber-500'}`} />
                    <div>
                      <p className={`lesson-section-heading text-[0.65rem] uppercase tracking-[0.2em] mb-1 ${isWarning ? 'text-rose-500' : 'text-amber-600'}`}>{label}</p>
                      <p className="font-body text-[0.95rem] text-slate-700 leading-[1.75] font-medium">{inlineFormat(autoHighlightTerms(body))}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border-2 border-slate-200 hover:border-[#1a85a4]/40 hover:bg-[#f0fbff] transition-colors">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-[#1a85a4] flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white text-[0.65rem] font-black">{i + 1}</span>
                  </div>
                  <p className="font-body text-slate-700 text-[0.95rem] leading-[1.75] font-medium">{inlineFormat(autoHighlightTerms(point))}</p>
                </div>
              );
            })
          ) : (
            <p className="text-slate-400 text-sm italic">No notes available for this lesson.</p>
          )}
        </div>
      );

    case 'try_it_yourself':
      return (
        <div className="space-y-5">
          {/* Hero icon + heading */}
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#9956DE' }}>
              <CheckCircle size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-black" style={{ color: '#9956DE' }}>Try It Yourself</h3>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              Now it's your turn! Try applying what you've learned. You can practice with the exercises at the end of this module.
            </p>
          </div>

          {/* Tip callout */}
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 border" style={{ background: '#f5eeff', borderColor: '#d4aaff' }}>
            <Lightbulb size={16} className="mt-0.5 shrink-0" style={{ color: '#9956DE' }} />
            <p className="text-sm" style={{ color: '#7a3db8' }}>
              <span className="font-bold">Tip:</span> Complete the practice quizzes after this lesson to reinforce your learning!
            </p>
          </div>

          {/* Practice Quiz CTA card */}
          {practiceQuiz && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              {practiceQuizCompleted ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-700">
                      Quiz Complete
                      {typeof practiceQuizScore === 'number' && (
                        <span className="ml-2 text-emerald-600">{practiceQuizScore}%</span>
                      )}
                    </p>
                    <p className="text-xs text-emerald-600/80">Great job! You can now complete this lesson.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9956DE' }}>Practice Quiz</p>
                    <p className="font-bold text-slate-800 text-sm">{practiceQuiz.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {practiceQuiz.questions} questions · {practiceQuiz.duration}
                    </p>
                  </div>
                  <button
                    onClick={onStartPractice}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1a85a4] text-white text-sm font-black hover:bg-[#126b84] transition-colors shadow-md uppercase tracking-wide"
                  >
                    Start Practice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Try It Yourself Quiz CTA */}
          <button
            onClick={onStartTryItQuiz}
            className="w-full flex items-center justify-between gap-4 text-white rounded-2xl px-6 py-4 shadow-lg transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] group"
            style={{ background: '#9956DE' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#8744cc')}
            onMouseLeave={e => (e.currentTarget.style.background = '#9956DE')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <PlayCircle size={22} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm uppercase tracking-wide">Start Practice Quiz</p>
                <p className="text-white/80 text-xs mt-0.5">10 questions · AI-generated</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-white/80 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      );

    case 'summary':
      return (
        <div className="space-y-3">
          {section.content?.trim() ? (
            formatContent(section.content)
          ) : (
            <p className="text-slate-400 text-sm italic">Summary is being prepared. Review the lesson sections above to reinforce your understanding.</p>
          )}
        </div>
      );

    default:
      return (
        <p className="text-slate-500 text-sm italic">Section content not available.</p>
      );
  }
}

const SECTION_SYMBOLS: Record<string, string> = {
  introduction: 'Introduction',
  key_concepts: 'Key Concepts',
  video: 'Video Lesson',
  worked_examples: 'Worked Examples',
  important_notes: 'Important Notes',
  try_it_yourself: 'Try It Yourself',
  summary: 'Summary',
};

type LessonTab = {
  type: RagLessonSection['type'];
  label: string;
  helper: string;
  icon: LucideIcon;
  accent: string;
  tint: string;
  tabBg: string;
};

const SECTION_TABS: LessonTab[] = [
  {
    type: 'introduction',
    label: 'Intro',
    helper: 'Welcome note',
    icon: Clock,
    accent: 'from-[#1a85a4] to-[#126b84]',
    tint: 'bg-[#1a85a4] text-white border-transparent',
    tabBg: 'bg-[#1a85a4]',
  },
  {
    type: 'key_concepts',
    label: 'Concepts',
    helper: 'Core ideas',
    icon: Key,
    accent: 'from-[#fbab41] to-[#e0983a]',
    tint: 'bg-[#fbab41] text-white border-transparent',
    tabBg: 'bg-[#fbab41]',
  },
  {
    type: 'video',
    label: 'Video',
    helper: 'Watch and learn',
    icon: Lightbulb,
    accent: 'from-[#e66a5e] to-[#ce5e53]',
    tint: 'bg-[#e66a5e] text-white border-transparent',
    tabBg: 'bg-[#e66a5e]',
  },
  {
    type: 'worked_examples',
    label: 'Examples',
    helper: 'Guided solving',
    icon: ClipboardCheck,
    accent: 'from-[#7ec16d] to-[#71ad62]',
    tint: 'bg-[#7ec16d] text-white border-transparent',
    tabBg: 'bg-[#7ec16d]',
  },
  {
    type: 'important_notes',
    label: 'Notes',
    helper: 'Key reminders',
    icon: NotebookPen,
    accent: 'from-[#9a67d0] to-[#8a5cc0]',
    tint: 'bg-[#9a67d0] text-white border-transparent',
    tabBg: 'bg-[#9a67d0]',
  },
  {
    type: 'try_it_yourself',
    label: 'Practice',
    helper: 'Try it yourself',
    icon: Target,
    accent: 'from-[#eb74a6] to-[#d46895]',
    tint: 'bg-[#eb74a6] text-white border-transparent',
    tabBg: 'bg-[#eb74a6]',
  },
  {
    type: 'summary',
    label: 'Summary',
    helper: 'Wrap-up',
    icon: Award,
    accent: 'from-[#48bca6] to-[#40a794]',
    tint: 'bg-[#48bca6] text-white border-transparent',
    tabBg: 'bg-[#48bca6]',
  },
];

const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  lessonCompletionXP = 10,
  practiceQuiz,
  practiceQuizCompleted = false,
  practiceQuizScore,
  initialSection = 0,
  onStartPractice,
  onBack,
  onComplete,
  onProgressUpdate,
  onTryItQuizComplete,
  onContinueLearning,
}) => {
  const { userProfile } = useAuth();
  const [currentSection, setCurrentSection] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showCompletion, setShowCompletion] = useState(false);
  const [expandedProblem, setExpandedProblem] = useState<number | null>(null);
  const [showTryItPage, setShowTryItPage] = useState(false);
  const [tryItQuizCompleted, setTryItQuizCompleted] = useState(false);

  const request = {
    topic: lesson.title,
    subject: (lesson as any).subject || 'General Mathematics',
    quarter: (lesson as any).quarter || 1,
    lessonTitle: lesson.title,
    moduleId: (lesson as any).subjectId,
    lessonId: lesson.id,
    competencyCode: (lesson as any).competencyCode,
    learnerLevel: 'Grade 11-12',
    storagePath: (lesson as any).storagePath,
  };

  const {
    sections,
    isLoading,
    error,
    retry,
    sources,
    retrievalBand,
    needsReview,
    activeModel,
    isOffline,
  } = useLessonContent(lesson.id, request, true);

  // Extract specific lesson topic from RAG sections (e.g., "Simple Interest" from "Introduction to Simple Interest")
  // This fixes the quiz topic bug where the generic competency name was used instead
  const [lessonSpecificTopic, setLessonSpecificTopic] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length > 0) {
      const introSection = sections.find(s => s.type === 'introduction');
      if (introSection?.title) {
        const title = introSection.title;
        // Strip common prefixes: "Introduction to X", "Introduction - X", "X: Introduction", "X Introduction"
        const stripped = title
          .replace(/^Introduction\s+(to|-|:|—)\s+/i, '')
          .replace(/\s*[-:—]\s*Introduction$/i, '')
          .replace(/\s+Introduction$/i, '')
          .trim();
        if (stripped && stripped.toLowerCase() !== 'introduction') {
          setLessonSpecificTopic(stripped);
        }
      }
    }
  }, [sections]);

  // Track lesson view activity when lesson loads
  useEffect(() => {
    if (sections.length > 0 && userProfile?.uid && lesson.id) {
      logLessonView(userProfile.uid, lesson.id, lessonSpecificTopic || lesson.title).catch(() => { });
    }
  }, [sections.length, userProfile?.uid, lesson.id, lessonSpecificTopic, lesson.title]);

  const totalSections = sections.length || SECTION_TABS.length;

  useEffect(() => {
    if (initialSection >= 0 && initialSection < totalSections) {
      setCurrentSection(initialSection);
    }
  }, [lesson.id]);

  useEffect(() => {
    const practiceIdx = sections.findIndex((s) => s.type === 'try_it_yourself');
    if (initialSection === -1 && practiceIdx >= 0) {
      setCurrentSection(practiceIdx);
    }
  }, [sections, initialSection]);

  useEffect(() => {
    const progress = totalSections > 0 ? ((currentSection + 1) / totalSections) * 100 : 0;
    onProgressUpdate?.(progress);
  }, [currentSection, totalSections, onProgressUpdate]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error && sections.length === 0) {
    return <ErrorPanel message={error} onRetry={retry} isOffline={isOffline} />;
  }

  // Derive lesson number from lessonId for the TryItYourselfPage title
  const lessonNumMatch = String(lesson.id || '').match(/\d+/);
  const lessonNumber = lessonNumMatch ? lessonNumMatch[0] : '1';

  if (showTryItPage) {
    return (
      <TryItYourselfPage
        lessonId={lesson.id?.toString() || 'unknown'}
        lessonTitle={lesson.title}
        lessonNumber={lessonNumber}
        topic={lessonSpecificTopic || lesson.title}
        subjectId={lesson.subjectId}
        competencyCode={lesson.competencyCode}
        onClose={() => setShowTryItPage(false)}
        onComplete={(scorePercent) => {
          onTryItQuizComplete?.(scorePercent);
          setTryItQuizCompleted(true);
          setShowTryItPage(false);
        }}
      />
    );
  }  const currentSectionData = sections[currentSection] || {
    type: 'introduction',
    title: 'Loading...',
    content: 'Lesson content is loading. Please wait a moment.',
  };

  const handleNext = () => {
    if (currentSection < totalSections - 1) {
      setDirection(1);
      setCurrentSection((p) => p + 1);
    } else if (!practiceQuiz || practiceQuizCompleted) {
      setShowCompletion(true);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setDirection(-1);
      setCurrentSection((p) => p - 1);
    }
  };

  const handleComplete = (goToNext: boolean) => {
    onComplete(undefined, undefined, goToNext);
  };

  // Block completion if either the external practice quiz OR the Try It Yourself quiz is unfinished
  const isPracticeRequired = Boolean(
    (practiceQuiz && !practiceQuizCompleted) || !tryItQuizCompleted
  );
  const currentTab = SECTION_TABS[currentSection] || SECTION_TABS[0];
  const CurrentTabIcon = currentTab.icon;

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden font-sans">
      <header className="flex-none bg-transparent px-3 sm:px-6 pt-2 sm:pt-3 md:pt-4 pb-2 sm:pb-3 sm:py-4 relative z-40">
        <div className="max-w-[90rem] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors flex-shrink-0 shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0 flex flex-col justify-center flex-1">
              {/* Badges row — hidden on mobile, visible sm+ */}
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                <BookOpen size={10} />
                <span>NOTEBOOK</span>
                {activeModel && (
                  <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                    {activeModel.split('/').pop()}
                  </span>
                )}
                {retrievalBand === 'high' && (
                  <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                    DepEd Source
                  </span>
                )}
              </div>
              {/* Mobile: compact single-line label */}
              <div className="flex sm:hidden items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                <BookOpen size={9} />
                <span>Notebook</span>
                {retrievalBand === 'high' && (
                  <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded text-[8px] font-semibold border border-emerald-200 leading-none">
                    DepEd
                  </span>
                )}
              </div>
              <h1 className="font-bold text-slate-800 text-xs sm:text-sm truncate">{lesson.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</p>
              <p className="text-sm font-bold text-slate-800">
                {Math.round(((currentSection + 1) / totalSections) * 100)}%
              </p>
            </div>
            <div className="w-12 sm:w-24 md:w-32 h-1.5 sm:h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#7ec16d] rounded-full"
                animate={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-2 sm:px-5 pb-2 relative flex justify-center min-h-0">
        <div className="w-full max-w-[90rem] h-full relative flex md:pl-16 pt-10 sm:pt-10 md:pt-0">

          {/* Tabs - Stick out on left */}
          <div className="hidden md:flex absolute left-0 top-8 bottom-8 w-20 flex-col justify-between z-0 py-2">
            {SECTION_TABS.map((tab, idx) => {
              const active = idx === currentSection;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.type}
                  onClick={() => {
                    setDirection(idx > currentSection ? 1 : -1);
                    setCurrentSection(idx);
                  }}
                  className={cn(
                    'group relative flex items-center justify-start pl-4 rounded-l-[1.5rem] transition-all duration-300 shadow-sm border-r-0 flex-shrink-0',
                    tab.tabBg,
                    active
                      ? 'w-24 h-20 -translate-x-4 shadow-xl z-20 brightness-105'
                      : 'w-16 h-16 hover:w-24 hover:h-20 hover:-translate-x-4 hover:brightness-110 opacity-90 hover:opacity-100 z-10'
                  )}
                  aria-label={`Go to ${tab.label} section`}
                >
                  <div className={cn("transition-all duration-300 rounded-xl", active ? "bg-white/30 p-2.5" : "bg-white/20 p-2 group-hover:bg-white/30 group-hover:p-2.5")}>
                    <Icon size={active ? 24 : 20} className="text-white transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  {/* Tooltip */}
                  <div className="absolute right-full mr-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl border border-slate-700/50">
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-r border-t border-slate-700/50"></div>
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile Folder Tabs - OUTSIDE colored section */}
          <div className="md:hidden absolute left-0 right-0 top-0 z-30 bg-slate-100/95 backdrop-blur-sm">
            <div className="flex gap-0.8 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1">
              {SECTION_TABS.map((tab, idx) => {
                const active = idx === currentSection;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.type}
                    onClick={() => {
                      setDirection(idx > currentSection ? 1 : -1);
                      setCurrentSection(idx);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all duration-200 shrink-0 text-[11px] font-bold touch-manipulation min-h-[2.5rem]',
                      active
                        ? `${tab.tabBg} text-white shadow-md`
                        : 'bg-slate-200/80 text-slate-500'
                    )}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Notebook Container */}
          <div className={cn("flex-1 min-w-0 rounded-none sm:rounded-lg shadow-2xl flex flex-col overflow-visible relative z-10 transition-colors duration-500", currentTab.tabBg)}>
            {/* Header inside notebook */}
            <div className="px-3 sm:px-6 py-2 sm:py-3.5 flex items-center gap-2 sm:gap-4 text-white">
              <div className="bg-white/20 p-1 sm:p-2 rounded-lg sm:rounded-xl shrink-0">
                <CurrentTabIcon size={16} className="text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="lesson-section-heading text-sm sm:text-xl md:text-2xl truncate" title={currentSectionData.title}>
                  {currentSectionData.title}
                </h2>
                <p className="text-white/90 text-[10px] sm:text-xs font-medium truncate mt-0.5 font-body" title={lesson.title}>
                  {lesson.title}
                </p>
              </div>
            </div>

            {/* Inner Paper Area */}
            <div className="flex-1 min-h-0 bg-[#fdfdfd] rounded-lg sm:rounded-[1.5rem] m-1 mt-0 relative overflow-hidden shadow-inner flex flex-col">
              {/* Notebook lines background */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage: 'linear-gradient(transparent 95%, #cbd5e1 95%)',
                  backgroundSize: '100% 40px',
                  backgroundPosition: '0 0'
                }}
              />
              {/* Red margin line */}
              <div className="absolute top-0 bottom-0 left-8 sm:left-12 md:left-16 w-[2px] bg-rose-300/60 pointer-events-none z-0" />

              {/* Scrollable Content */}
              <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 md:pl-20 md:pr-10 py-2 sm:py-6" key={currentSection}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSection}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 sm:space-y-6"
                  >
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-[1.5rem] p-4 sm:p-6 md:p-8 shadow-sm border border-slate-100/50 font-body">
                      <SectionRenderer
                        section={currentSectionData}
                        sectionIndex={currentSection}
                        onShowSolution={(idx) =>
                          setExpandedProblem(expandedProblem === idx ? null : idx)
                        }
                        expandedIndex={expandedProblem}
                        lesson={lesson}
                        practiceQuiz={practiceQuiz}
                        practiceQuizCompleted={practiceQuizCompleted}
                        practiceQuizScore={practiceQuizScore}
                        onStartPractice={onStartPractice}
                        lessonSpecificTopic={lessonSpecificTopic}
                        onStartTryItQuiz={() => setShowTryItPage(true)}
                      />
                    </div>

                    {sources.length > 0 && (userProfile?.role === 'admin' || userProfile?.role === 'teacher') && (
                      <details className="rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-3 text-xs text-slate-500 shadow-sm">
                        <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-800">
                          {sources.length} source{sources.length > 1 ? 's' : ''} used
                        </summary>
                        <div className="mt-2 space-y-1 pl-2">
                          {sources.slice(0, 3).map((src, i) => (
                            <p key={i} className="font-mono truncate">
                              {src.source_file} p.{src.page} ({Math.round((src.score || 0) * 100)}%)
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-50 border-t border-slate-100 px-3 sm:px-6 flex-shrink-0 relative z-50 w-full flex justify-center items-center py-1.5 sm:py-3">
        <div className="w-full max-w-[90rem] flex flex-col items-center">
          <div className="flex items-center justify-center gap-4 sm:gap-8 w-full md:ml-16">
            <Button
              onClick={handlePrevious}
              disabled={currentSection === 0}
              variant="outline"
              className="px-4 sm:px-5 py-2 sm:py-2 rounded-full font-bold text-xs sm:text-sm bg-white border-slate-200 text-slate-600 shadow-sm disabled:opacity-40 hover:bg-slate-50 transition-colors flex items-center gap-1 sm:gap-2 min-w-[2.5rem] min-h-[2.5rem] touch-manipulation"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <p className="text-xs sm:text-sm text-slate-500 font-bold tabular-nums">
              {currentSection + 1} / {totalSections}
            </p>

            <Button
              onClick={handleNext}
              disabled={currentSection === totalSections - 1 && isPracticeRequired}
              className="px-5 sm:px-7 py-2 sm:py-2 rounded-full font-bold text-xs sm:text-sm bg-[#7ec16d] text-white hover:bg-[#6ab359] shadow-md transition-colors disabled:opacity-40 flex items-center gap-1 sm:gap-2 min-w-[2.5rem] min-h-[2.5rem] touch-manipulation"
            >
              {currentSection === totalSections - 1 ? (
                <>
                  <span className="hidden sm:inline">Complete</span>
                  <CheckCircle size={14} />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight size={14} />
                </>
              )}
            </Button>
          </div>
          {currentSection === totalSections - 1 && isPracticeRequired && (
            <p className="text-center text-[10px] sm:text-xs font-semibold text-amber-600 mt-2 sm:mt-3 md:ml-16">
              {!tryItQuizCompleted
                ? 'Complete the Try It Yourself quiz first to unlock lesson completion.'
                : 'Complete the practice quiz first to unlock lesson completion.'}
            </p>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-[#7ec16d] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                <CheckCircle size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Lesson Complete!</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Great job finishing <strong className="text-slate-700">{lesson.title}</strong>.
              </p>
              <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-100">
                <div className="flex items-center justify-center mb-1">
                  <Award className="text-[#7ec16d]" size={22} />
                </div>
                <p className="text-xs text-[#7ec16d] font-bold uppercase tracking-wider mb-0.5">XP Earned</p>
                <p className="text-3xl font-black text-[#7ec16d]">+{lessonCompletionXP}</p>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => handleComplete(true)}
                  disabled={isPracticeRequired}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-[#1a85a4] text-white hover:bg-[#126b84] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to Next Lesson
                </button>
                <button
                  onClick={() => handleComplete(false)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Back to Modules
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const portalTarget = document.getElementById('modal-root') || document.body;
  return ReactDOM.createPortal(content, portalTarget);
};

export default LessonViewer;