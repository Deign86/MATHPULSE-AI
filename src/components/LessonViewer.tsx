import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, BookOpen, Lightbulb,
  Calculator, Award, RefreshCw, AlertTriangle, NotebookPen,
  Clock, Key, ClipboardCheck, Target, Zap, PlayCircle, Ruler, Sparkles, Pin,
  ShieldCheck, FileText, ExternalLink, FileSearch, X
} from 'lucide-react';


export function isNum<T>(value: T): value is T & number {
  return typeof value === "number";
}

/** Quarter as carried by lessons: numeric 1-4 or CurriculumQuarter string. */
type LessonQuarterInput = number | CurriculumQuarter | string;

const QUARTER_TO_INT = new Map([
  ['Q1', 1], ['Q2', 2], ['Q3', 3], ['Q4', 4],
  ['1', 1], ['2', 2], ['3', 3], ['4', 4],
]);

/** Coerce lesson quarter to RAG API int 1-4; defaults 1. */
function parseQuarterToInt(value: LessonQuarterInput): number {
  const key = String(value ?? '').trim().toUpperCase();
  return QUARTER_TO_INT.get(key) ?? 1;
}

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
  interface CalloutScheme { bg: string; border: string; text: string; label: React.ReactNode }
  const calloutScheme = (prefix: string): CalloutScheme => {
    const p = prefix.toLowerCase();
    if (/formula|theorem|property|rule/.test(p))
      return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', label: <Ruler aria-hidden="true" size={14} /> };
    if (/definition|concept|key/.test(p))
      return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', label: <BookOpen aria-hidden="true" size={14} /> };
    if (/note|reminder|important/.test(p))
      return { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-900', label: <AlertTriangle aria-hidden="true" size={14} /> };
    if (/example|step/.test(p))
      return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', label: <NotebookPen aria-hidden="true" size={14} /> };
    return { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-800', label: <Lightbulb aria-hidden="true" size={14} /> };
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
import type { Question } from '@/types/curriculum';
import TryItYourselfEngine from './TryItYourselfEngine';
import { generateLessonQuiz } from '../services/lessonQuizService';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { Lesson, Quiz } from '../data/subjects';
import type { RagLessonSection } from '../services/lessonService';
import { useLessonContent } from '../hooks/useLessonContent';
import { getFirebaseStoragePdfUrl } from '../data/curriculum/types';
import type { CurriculumQuarter } from '../data/curriculum/types';
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
  /** Label for the "Continue" button in the completion modal (e.g. "Continue to Next Lesson", "Take Mid-Module Checkpoint") */
  nextContentLabel?: string;
  onStartPractice?: () => void;
  onBack: () => void;
  onComplete: (score?: number, totalXP?: number, goToNext?: boolean) => void;
  onProgressUpdate?: (percent: number) => void;
  /** Fires when the inline Try It Yourself quiz is completed — use to persist to Firestore and award XP */
  onTryItQuizComplete?: (scorePercent: number) => void;
  /** Fires when user clicks Continue Learning in the Try It Yourself quiz overlay — advances to next lesson */
  onContinueLearning?: () => void;
  /** Controls floating AI tutor visibility during Try It Yourself quiz */
  setIsInQuizMode?: (value: boolean) => void;
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
interface LessonObjective { text: string; example?: string }
interface LessonIntroContent { welcome: string; objectives: LessonObjective[] }
function parseIntroContent(raw: string): LessonIntroContent {
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

function PdfFallbackPanel({
  lessonTitle,
  competencyCode,
  subject,
  sourceLabel,
  pdfUrl,
  reason,
  onRetry,
}: {
  lessonTitle: string;
  competencyCode?: string;
  subject?: string;
  sourceLabel: string;
  pdfUrl: string;
  reason?: string;
  onRetry: () => void;
}) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [showCardFallback, setShowCardFallback] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
          <FileText className="text-blue-600" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800 text-sm truncate">{lessonTitle}</p>
          <p className="text-slate-500 text-xs truncate">
            {[competencyCode, subject, sourceLabel].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className="text-[0.65rem] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded-lg shrink-0">
          DepEd PDF
        </span>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          aria-label="Open PDF in new tab"
        >
          <ExternalLink size={16} />
        </a>
        <button
          onClick={onRetry}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          aria-label="Retry AI lesson"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="px-4 py-2.5 text-xs text-amber-800 bg-amber-50 border-b border-amber-200/70 flex items-center gap-2">
        <AlertTriangle className="text-amber-600 shrink-0" size={14} />
        <p className="leading-relaxed">
          <span className="font-semibold">AI lesson unavailable</span>
          {reason ? ` (${reason})` : ''} — showing the DepEd source PDF this lesson derives from.
        </p>
      </div>

      {iframeError || showCardFallback ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 overflow-y-auto">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen size={28} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2">
              Read DepEd Curriculum Material
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              {reason
                ? `The AI lesson is currently unavailable (${reason}). You can read the official DepEd source module directly in a new window or retry.`
                : 'If the embedded PDF document does not render properly in your browser, you can read the official DepEd source module directly in a new window.'}
            </p>
            <div className="w-full flex flex-col gap-3">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>Open PDF in New Window / Tab</span>
                <ExternalLink size={16} />
              </a>
              <button
                onClick={onRetry}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={15} />
                <span>Retry Generating AI Lesson</span>
              </button>
              {!iframeError && (
                <button
                  onClick={() => setShowCardFallback(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline mt-1"
                >
                  Back to PDF preview
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 w-full bg-slate-100 flex flex-col overflow-hidden">
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-sm p-4 text-center">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-700">Loading DepEd PDF document...</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                If the document does not display in your browser, you can open it directly.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <ExternalLink size={13} />
                  Open in New Window
                </a>
                <button
                  onClick={() => setShowCardFallback(true)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-200/70 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  View Options
                </button>
              </div>
            </div>
          )}
          <iframe
            src={pdfUrl}
            title={lessonTitle}
            loading="lazy"
            onLoad={() => setIframeLoading(false)}
            onError={() => {
              setIframeLoading(false);
              setIframeError(true);
            }}
            className="flex-1 w-full border-0"
          />
          <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Can't view the embedded PDF?</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCardFallback(true)}
                className="font-medium text-indigo-600 hover:text-indigo-800 underline"
              >
                Show options
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 underline"
              >
                <span>Open in new window</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
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
      const totalSectionCount = 7;

      return (
        <div className="space-y-4">
          {/* Welcome paragraph — clean overview card */}
          {welcome ? (
            <div className="rounded-xl border border-[#1a85a4]/30 bg-gradient-to-br from-sky-50/80 via-white to-sky-50/40 p-3.5 sm:p-4 shadow-2xs">
              <p className="font-display text-[#1a85a4] text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 bg-[#1a85a4] rounded-full" />
                Lesson Overview
              </p>
              <p className="font-body text-slate-700 text-xs sm:text-sm leading-relaxed font-medium">
                {inlineFormat(autoHighlightTerms(welcome))}
              </p>
            </div>
          ) : !section.content?.trim() ? (
            <p className="text-slate-400 text-xs italic">Introduction content is being prepared.</p>
          ) : (
            <div className="rounded-xl border border-[#1a85a4]/30 bg-gradient-to-br from-sky-50/80 via-white to-sky-50/40 p-3.5 sm:p-4 shadow-2xs">
              {formatContent(section.content)}
            </div>
          )}

          {/* Callouts — Compact alert strips */}
          {section.callouts && section.callouts.length > 0 && (
            <div className="space-y-2">
              {section.callouts.map((callout, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5 flex items-start gap-2.5 shadow-2xs transition-colors",
                    callout.type === 'tip'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white shadow-2xs",
                    callout.type === 'tip' ? 'bg-emerald-500' : 'bg-amber-500'
                  )}>
                    {callout.type === 'tip' ? <Sparkles size={13} /> : <Lightbulb size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[9px] font-black uppercase tracking-wider mb-0.5 font-display",
                      callout.type === 'tip' ? 'text-emerald-700' : 'text-amber-700'
                    )}>
                      {callout.type === 'tip' ? 'Tip' : callout.type === 'important' ? 'Heads Up' : 'Note'}
                    </p>
                    <p className="font-body text-xs text-slate-700 leading-relaxed font-medium">{callout.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Auto Heads Up banner if no callouts */}
          {(!section.callouts || section.callouts.length === 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 flex items-start gap-2.5 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 mt-0.5 text-white shadow-2xs">
                <Lightbulb size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider mb-0.5 text-amber-700 font-display">
                  Heads Up
                </p>
                <p className="font-body text-xs text-slate-700 leading-relaxed font-medium">
                  This lesson has {totalSectionCount} sections. Grab paper and pen for notes and worked examples along the way!
                </p>
              </div>
            </div>
          )}

          {/* "What you'll learn" objectives — responsive 2-column on sm+ */}
          {objectives.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-violet-600" />
                <h3 className="font-display font-black text-xs sm:text-sm text-violet-700 uppercase tracking-wide">What you'll learn</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {objectives.map((obj, i) => {
                  const color = OBJECTIVE_COLORS[i % OBJECTIVE_COLORS.length];
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 flex items-start gap-2.5 shadow-2xs transition-all",
                        color.bg, color.border
                      )}
                    >
                      <span className={cn(
                        "mt-0.5 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 tabular-nums shadow-2xs",
                        color.num
                      )}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-body text-xs font-semibold leading-snug", color.text)}>
                          {inlineFormat(autoHighlightTerms(obj.text))}
                        </p>
                        {obj.example && (
                          <p className={cn("text-[11px] mt-0.5 font-mono font-medium truncate", color.ex)}>
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
        <div className="space-y-3.5">
          {section.content?.trim() ? (
            <div className="space-y-2">{formatContent(section.content)}</div>
          ) : (
            <p className="text-slate-400 text-xs italic mb-2">Key concepts are being compiled.</p>
          )}
          {section.callouts && section.callouts.filter((c) => Boolean(c.text?.trim())).length > 0 && (
            <div className="space-y-2 pt-1">
              {section.callouts
                .filter((callout) => Boolean(callout.text?.trim()))
                .map((callout, i) => {
                  const calloutText = callout.text?.includes('Review the curriculum PDF for detailed explanations of each concept')
                    ? 'Define variables explicitly and verify constraints when formulating mathematical and financial relations.'
                    : callout.text;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border px-3.5 py-2.5 flex items-start gap-2.5 shadow-2xs transition-colors",
                        callout.type === 'important'
                          ? 'bg-rose-50/80 border-rose-200'
                          : callout.type === 'tip'
                          ? 'bg-emerald-50/80 border-emerald-200'
                          : 'bg-amber-50/80 border-amber-200'
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white shadow-2xs",
                        callout.type === 'important' ? 'bg-rose-500' : callout.type === 'tip' ? 'bg-emerald-500' : 'bg-amber-500'
                      )}>
                        {callout.type === 'important' ? <AlertTriangle size={13} /> : callout.type === 'tip' ? <Sparkles size={13} /> : <Pin size={13} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[9px] font-black uppercase tracking-wider mb-0.5 font-display",
                          callout.type === 'important' ? 'text-rose-700' : callout.type === 'tip' ? 'text-emerald-700' : 'text-amber-700'
                        )}>
                          {callout.type === 'important' ? 'Important Rule' : callout.type === 'tip' ? 'Pro Tip' : 'Key Note'}
                        </p>
                        <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">{calloutText}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      );

    case 'video':
      return (
        <div className="space-y-3.5">
          {section.content?.trim() ? (
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{section.content}</p>
          ) : (
            <p className="text-slate-400 text-xs italic">Video explanation loading...</p>
          )}
          <VideoLessonSection
            videos={section.videos || []}
            topic={lesson.title}
          />
        </div>
      );

    case 'worked_examples':
      return (
        <div className="space-y-3.5">
          {section.examples && section.examples.length > 0 ? (
            section.examples.map((example, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-3.5 sm:p-4 border border-rose-200/80 shadow-2xs space-y-2.5"
              >
                {/* Problem header */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center shrink-0 shadow-2xs text-white">
                    <Calculator size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-rose-500 font-display">
                      Example {i + 1}
                    </p>
                    <p className="font-body font-bold text-slate-800 text-xs sm:text-sm leading-snug">{example.problem}</p>
                  </div>
                </div>

                {/* Solution steps */}
                {example.steps.length > 0 && (
                  <div className="pl-3 sm:pl-4 border-l-2 border-rose-200 space-y-1.5 ml-3.5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-display">Solution</p>
                    {example.steps.map((step, si) => {
                      const isFormulaStep = MATH_RE.test(step) && step.length < 100 && !/[a-z]{6,}/.test(step);
                      return isFormulaStep ? (
                        <div key={si} className="lesson-formula-box my-1">
                          {step}
                        </div>
                      ) : (
                        <div key={si} className="flex items-start gap-2">
                          <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[9px] font-black flex items-center justify-center shrink-0 tabular-nums">
                            {si + 1}
                          </span>
                          <p className="font-body text-slate-700 text-xs sm:text-sm leading-relaxed">{inlineFormat(step)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Answer box */}
                {example.answer && (
                  <div className="flex items-center gap-2 pt-2 border-t border-rose-100 ml-3.5">
                    <span className="px-2 py-0.5 bg-rose-600 rounded-md text-white text-[9px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                      Answer
                    </span>
                    <p className="font-body text-slate-800 text-xs sm:text-sm font-bold">{example.answer}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-xs italic">No worked examples available for this lesson.</p>
          )}
        </div>
      );

    case 'important_notes':
      return (
        <div className="space-y-2.5">
          {section.bulletPoints && section.bulletPoints.length > 0 ? (
            section.bulletPoints.map((point, i) => {
              const calloutMatch = point.match(/^(Note|Important|Remember|Warning|Tip|Key|Formula|Rule)\s*:/i);
              if (calloutMatch) {
                const label = calloutMatch[1];
                const body = point.slice(calloutMatch[0].length).trim();
                const isWarning = /note|important|warning|remember/i.test(label);
                return (
                  <div key={i} className={cn(
                    "rounded-xl px-3.5 py-2.5 border-l-3 flex items-start gap-2.5 shadow-2xs",
                    isWarning ? 'bg-rose-50/70 border-rose-400' : 'bg-amber-50/70 border-amber-400'
                  )}>
                    <Lightbulb size={15} className={cn("mt-0.5 shrink-0", isWarning ? 'text-rose-500' : 'text-amber-500')} />
                    <div>
                      <p className={cn("text-[9px] font-black uppercase tracking-wider mb-0.5 font-display", isWarning ? 'text-rose-600' : 'text-amber-600')}>{label}</p>
                      <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">{inlineFormat(autoHighlightTerms(body))}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 transition-colors">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-[9px] font-black">{i + 1}</span>
                  </div>
                  <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">{inlineFormat(autoHighlightTerms(point))}</p>
                </div>
              );
            })
          ) : (
            <p className="text-slate-400 text-xs italic">No notes available for this lesson.</p>
          )}
        </div>
      );

    case 'try_it_yourself':
      return (
        <div className="space-y-4 max-w-lg mx-auto py-2">
          {/* Hero icon + heading */}
          <div className="flex flex-col items-center text-center gap-1.5 py-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-purple-600 text-white">
              <CheckCircle size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-purple-700 font-display">Try It Yourself</h3>
            <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
              Apply what you've learned through practice questions to reinforce your mastery.
            </p>
          </div>

          {/* Practice Quiz CTA card */}
          {practiceQuiz && (
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
              {practiceQuizCompleted ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-emerald-700">
                      Quiz Complete
                      {isNum(practiceQuizScore) && (
                        <span className="ml-2 text-emerald-600">{practiceQuizScore}%</span>
                      )}
                    </p>
                    <p className="text-[11px] text-emerald-600/80">Great job! You can now complete this lesson.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider mb-0.5 text-purple-600">Practice Quiz</p>
                    <p className="font-bold text-slate-800 text-xs sm:text-sm">{practiceQuiz.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {practiceQuiz.questions} questions · {practiceQuiz.duration}
                    </p>
                  </div>
                  <button
                    onClick={onStartPractice}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 transition-colors shadow-sm uppercase tracking-wide cursor-pointer"
                  >
                    Start Practice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Try It Yourself Quiz CTA - only show if no separate practice quiz */}
          {!practiceQuiz && (
            <button
              onClick={onStartTryItQuiz}
              className="w-full flex items-center justify-between gap-3 text-white rounded-xl px-4 py-3 shadow-md transition-all hover:bg-purple-700 active:scale-[0.99] group bg-purple-600 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  <PlayCircle size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-xs sm:text-sm uppercase tracking-wide">Start Practice Quiz</p>
                  <p className="text-white/80 text-[11px]">10 questions · AI-generated</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-white/80 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
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

const SECTION_SYMBOLS = {
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
  nextContentLabel,
  onStartPractice,
  onBack,
  onComplete,
  onProgressUpdate,
  onTryItQuizComplete,
  onContinueLearning,
  setIsInQuizMode,
}) => {
  const { userProfile } = useAuth();
  const [currentSection, setCurrentSection] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showCompletion, setShowCompletion] = useState(false);
  const [expandedProblem, setExpandedProblem] = useState<number | null>(null);
  const [showTryItPage, setShowTryItPage] = useState(false);
  const [tryItQuestions, setTryItQuestions] = useState<Question[] | null>(null);
  const [tryItLoading, setTryItLoading] = useState(false);
  const [tryItSessionId] = useState(() => `tiy-${Date.now()}`);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentSection]);

  // Hide floating AI tutor during Try It Yourself quiz
  useEffect(() => {
    setIsInQuizMode?.(showTryItPage);
    return () => { setIsInQuizMode?.(false); };
  }, [showTryItPage]);
  // Generate questions when Try It Yourself is opened
  useEffect(() => {
    if (!showTryItPage || tryItQuestions) return;
    setTryItLoading(true);
    generateLessonQuiz({ lessonId: lesson.id?.toString() || 'unknown', lessonTitle: lesson.title, topic: lesson.title, subjectId: lesson.subjectId, competencyCode: lesson.competencyCode, questionCount: 15 })
      .then(qs => setTryItQuestions(qs))
      .catch(err => { console.error('[LessonViewer] Quiz generation failed:', err); setShowTryItPage(false); })
      .finally(() => setTryItLoading(false));
  }, [showTryItPage, tryItQuestions, lesson]);

  const [tryItQuizCompleted, setTryItQuizCompleted] = useState(false);

  const request = {
    topic: lesson.title,
    // SAFETY: trusted internal value already conforms to the asserted type.
    subject: (lesson as any).subject || 'General Mathematics',
    // SAFETY: lessons may carry quarter as "Q1" string or number; RAG API requires int 1-4.
    quarter: parseQuarterToInt((lesson as any).quarter),
    lessonTitle: lesson.title,
    // SAFETY: trusted internal value already conforms to the asserted type.
    moduleId: (lesson as any).subjectId,
    lessonId: lesson.id,
    // SAFETY: trusted internal value already conforms to the asserted type.
    competencyCode: (lesson as any).competencyCode,
    learnerLevel: 'Grade 11',
    // SAFETY: trusted internal value already conforms to the asserted type.
    storagePath: (lesson as any).storagePath,
  };

  const {
    sections,
    isLoading,
    error,
    retry,
    sources,
    retrievalBand,
    retrievalConfidence,
    needsReview,
    activeModel,
    isOffline,
  } = useLessonContent(lesson.id, request, true);

  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // DepEd curriculum grounding metadata
  const primarySource = sources && sources.length > 0 ? sources[0] : null;
  // SAFETY: lesson may contain dynamic storagePath from curriculum metadata.
  const primaryStoragePath =
    (lesson as any).storagePath ||
    primarySource?.storage_path ||
    (primarySource as any)?.storagePath ||
    '';
  // SAFETY: lesson may contain dynamic sourceFile from curriculum metadata.
  const primarySourceFile =
    primarySource?.source_file ||
    (lesson as any).sourceFile ||
    (primaryStoragePath ? primaryStoragePath.split('/').pop() : '') ||
    'DepEd SHS Curriculum';
  const primaryPageText = primarySource?.page ? `Page ${primarySource.page}` : null;
  const primarySourceLabel = primaryPageText
    ? `${primarySourceFile} • ${primaryPageText}`
    : primarySourceFile;
  const depedPdfUrl = getFirebaseStoragePdfUrl(primaryStoragePath);

  const confidenceBadgeConfig = {
    high: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'DepEd Aligned • High Confidence',
    },
    medium: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      label: 'DepEd Aligned • Medium Confidence',
    },
    low: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      label: 'DepEd Aligned • Standard',
    },
  }[retrievalBand] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    label: 'DepEd Aligned',
  };


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
    if (depedPdfUrl) {
      return (
        <PdfFallbackPanel
          lessonTitle={lesson.title}
          // SAFETY: lesson payloads from the curriculum pipeline always carry these optional metadata fields.
          competencyCode={(lesson as any).competencyCode}
          // SAFETY: lesson payloads from the curriculum pipeline always carry these optional metadata fields.
          subject={(lesson as any).subject}
          sourceLabel={primarySourceLabel}
          pdfUrl={depedPdfUrl}
          reason={error}
          onRetry={retry}
        />
      );
    }
    return <ErrorPanel message={error} onRetry={retry} isOffline={isOffline} />;
  }

  // Derive lesson number from lessonId for the TryItYourselfEngine
  const lessonNumMatch = String(lesson.id || '').match(/\d+/);
  const lessonNumber = lessonNumMatch ? lessonNumMatch[0] : '1';


  if (showTryItPage) {
    if (tryItLoading || !tryItQuestions) {
      return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"><div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /><p className="font-bold text-slate-700">Generating Quiz...</p></div></div>);
    }
    return (
      <TryItYourselfEngine
        questions={tryItQuestions}
        lessonTitle={lesson.title}
        // SAFETY: trusted internal value already conforms to the asserted type.
        subject={(lesson as any).subject || 'General Mathematics'}
        sessionId={tryItSessionId}
        userId={userProfile?.uid}
        onBack={() => { setShowTryItPage(false); setTryItQuestions(null); }}
        onComplete={(scorePercent) => {
          onTryItQuizComplete?.(scorePercent);
          setTryItQuizCompleted(true);
          setShowTryItPage(false);
          setTryItQuestions(null);
        }}
      />
    );
  }

  const currentSectionData = sections[currentSection] || { type: 'introduction', title: 'Loading...', content: 'Lesson content is loading. Please wait a moment.' };

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
    setShowCompletion(false);
    onComplete(undefined, undefined, goToNext);
  };

  // Block completion if either the external practice quiz OR the Try It Yourself quiz is unfinished
  const isPracticeRequired = Boolean(
    (practiceQuiz && !practiceQuizCompleted) || !tryItQuizCompleted
  );
  const currentTab = SECTION_TABS[currentSection] || SECTION_TABS[0];
  const CurrentTabIcon = currentTab.icon;
  // SAFETY: lesson objects from curriculum metadata dynamically carry the optional subject name.
  const lessonSubject = (lesson as { subject?: string }).subject || 'Mathematics';

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Unified Slim Responsive Top Bar */}
      <header className="flex-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-3 sm:px-6 py-2 relative z-40">
        <div className="max-w-[96rem] mx-auto w-full flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Back Button + Lesson Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer shadow-2xs active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
                <BookOpen size={10} className="text-purple-500 shrink-0" />
                <span>Notebook</span>
                <span>•</span>
                <span className="truncate">{lessonSubject}</span>
              </div>
              <h1 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate mt-0.5" title={lesson.title}>
                {lesson.title}
              </h1>
            </div>
          </div>

          {/* Right: DepEd Grounding Evidence Pill + Progress */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* DepEd Evidence Trigger */}
            <button
              type="button"
              onClick={() => setShowEvidenceModal(true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer shadow-2xs active:scale-95",
                confidenceBadgeConfig.badge
              )}
              title="Inspect DepEd curriculum grounding and evidence"
            >
              <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', confidenceBadgeConfig.dot)} />
              <ShieldCheck size={12} className="shrink-0" />
              <span className="hidden sm:inline">DepEd Aligned</span>
              {retrievalConfidence > 0 && (
                <span className="opacity-80 font-mono text-[9px] tabular-nums">
                  {Math.round(retrievalConfidence * 100)}%
                </span>
              )}
              {sources && sources.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 text-[9px] font-black tabular-nums">
                  {sources.length}
                </span>
              )}
            </button>

            {/* Source PDF Link (sm+) */}
            {depedPdfUrl && (
              <a
                href={depedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors shadow-2xs"
                title="Open official DepEd source PDF in new tab"
              >
                <ExternalLink size={11} />
                <span>PDF</span>
              </a>
            )}

            {/* Slim Progress Meter */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="w-10 sm:w-16 md:w-20 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  animate={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                {Math.round(((currentSection + 1) / totalSections) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Reading Container with Integrated Left Spine Tabs & Expanded Canvas */}
      <main className="flex-1 min-h-0 flex flex-col items-center px-2 sm:px-4 md:px-6 py-2 sm:py-3 overflow-hidden w-full">
        <div className="w-full max-w-[96rem] h-full flex flex-col md:flex-row min-h-0 gap-0 md:gap-3">
          
          {/* Mobile: Horizontal Segmented Pill Rail (< md) */}
          <div
            ref={tabsContainerRef}
            className="flex md:hidden flex-none items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 mb-2 px-0.5"
          >
            {SECTION_TABS.map((tab, idx) => {
              const active = idx === currentSection;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.type}
                  ref={active ? activeTabRef : undefined}
                  onClick={() => {
                    setDirection(idx > currentSection ? 1 : -1);
                    setCurrentSection(idx);
                  }}
                  aria-label={`Go to ${tab.label} section`}
                  className={cn(
                    'flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer select-none active:scale-95',
                    active
                      ? `${tab.tabBg} text-white shadow-sm font-black`
                      : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-white/10'
                  )}
                >
                  <Icon size={13} className={active ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tablet & Desktop: Left-Side Notebook Spine Tabs (md:+) */}
          <aside aria-label="Lesson sections" className="hidden md:flex flex-col gap-1.5 shrink-0 w-44 lg:w-52 py-1 overflow-y-auto [scrollbar-width:none]">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 py-1 flex items-center justify-between">
              <span>Sections</span>
              <span className="text-[9px] font-mono">{currentSection + 1}/{totalSections}</span>
            </div>
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
                  aria-label={`Go to ${tab.label} section`}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer select-none',
                    active
                      ? `${tab.tabBg} text-white shadow-sm font-black ring-1 ring-white/20`
                      : 'bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-white/10 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-2xs",
                      active ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700"
                    )}>
                      <Icon size={12} />
                    </div>
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {idx < currentSection && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </aside>

          {/* Flattened Reading Canvas Card */}
          <div className="flex-1 min-w-0 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col overflow-hidden relative">
            
            {/* Top Section Accent Strip */}
            <div className={cn("h-1 w-full shrink-0 transition-colors duration-300", currentTab.tabBg)} />

            {/* Section Header Bar */}
            <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs", currentTab.tabBg)}>
                  <CurrentTabIcon size={14} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate font-display">
                    {currentSectionData.title}
                  </h2>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                {currentSection + 1} of {totalSections}
              </span>
            </div>

            {/* Scrollable Content Body */}
            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 md:px-8 py-3.5 sm:py-5" key={currentSection}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4 max-w-3xl mx-auto pb-6"
                >
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

                  {sources.length > 0 && (userProfile?.role === 'admin' || userProfile?.role === 'teacher') && (
                    <details className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 px-3 py-2 text-xs text-slate-500 shadow-2xs">
                      <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-800">
                        {sources.length} source{sources.length > 1 ? 's' : ''} used
                      </summary>
                      <div className="mt-2 space-y-1 pl-2 font-mono text-[11px]">
                        {sources.slice(0, 3).map((src, i) => (
                          <p key={i} className="truncate">
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
      </main>

      {/* Docked Slim Navigation Footer */}
      <footer className="flex-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 px-3 sm:px-6 py-2 relative z-40">
        <div className="max-w-[96rem] mx-auto w-full flex items-center justify-between gap-3">
          <Button
            onClick={handlePrevious}
            disabled={currentSection === 0}
            variant="outline"
            aria-label="Previous section"
            className="px-3.5 sm:px-5 h-9 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs disabled:opacity-40 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex items-center gap-1.5">
            {SECTION_TABS.map((tab, idx) => (
              <span
                key={tab.type}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  idx === currentSection
                    ? cn("w-4 sm:w-5", tab.tabBg)
                    : idx < currentSection
                    ? "bg-slate-400 dark:bg-slate-600"
                    : "bg-slate-200 dark:bg-slate-800"
                )}
              />
            ))}
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono font-bold ml-1">
              {currentSection + 1}/{totalSections}
            </span>
          </div>

          <Button
            onClick={handleNext}
            disabled={currentSection === totalSections - 1 && isPracticeRequired}
            aria-label={currentSection === totalSections - 1 ? "Complete lesson" : "Next section"}
            className={cn(
              "px-4 sm:px-6 h-9 rounded-xl font-bold text-xs text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95",
              currentSection === totalSections - 1
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                : "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20"
            )}
          >
            {currentSection === totalSections - 1 ? (
              <>
                <span>Complete</span>
                <CheckCircle size={13} />
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight size={13} />
              </>
            )}
          </Button>
        </div>
      </footer>

      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-[#7ec16d] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                <CheckCircle size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2 text-balance">Lesson Complete!</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Great job finishing <strong className="text-slate-700">{lesson.title}</strong>.
              </p>
              <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-100">
                <div className="flex items-center justify-center mb-1">
                  <Award className="text-[#7ec16d]" size={22} />
                </div>
                <p className="text-xs text-[#7ec16d] font-bold uppercase tracking-wider mb-0.5">XP Earned</p>
                <p className="text-3xl font-black text-[#7ec16d] tabular-nums">+{lessonCompletionXP}</p>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => handleComplete(true)}
                  disabled={isPracticeRequired}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-[#1a85a4] text-white hover:bg-[#126b84] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {nextContentLabel || 'Continue to Next Lesson'}
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

      {/* DepEd Evidence Inspection Modal */}
      <AnimatePresence>
        {showEvidenceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6"
            onClick={() => setShowEvidenceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[88dvh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/90">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      DepEd RAG Grounding
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        confidenceBadgeConfig.badge
                      )}
                    >
                      {confidenceBadgeConfig.label}
                    </span>
                    {needsReview && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Flagged for Review
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate text-balance">
                    Curriculum Grounding Evidence
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                    {primarySourceLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                  aria-label="Close evidence modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Meta summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confidence Band</p>
                    <p className="text-sm font-black text-slate-800 capitalize mt-0.5">{retrievalBand}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Retrieval Score</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5 font-mono tabular-nums">
                      {retrievalConfidence > 0 ? `${(retrievalConfidence * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Retrieved Chunks</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5 tabular-nums">{sources?.length || 0}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Model</p>
                    <p className="text-sm font-black text-slate-800 truncate mt-0.5 font-mono">
                      {activeModel ? activeModel.split('/').pop() : 'deepseek'}
                    </p>
                  </div>
                </div>

                {/* Chunks List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-balance">
                      Retrieved PDF Text Chunks ({sources?.length || 0})
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      SSHS Curriculum Chunks
                    </span>
                  </div>

                  {!sources || sources.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
                      <p className="text-sm font-semibold">No direct text chunks recorded in cache for this view.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Content was generated with base curriculum syllabus alignment.
                      </p>
                    </div>
                  ) : (
                    sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-colors"
                      >
                        {/* Chunk header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md tabular-nums">
                              Chunk #{idx + 1}
                            </span>
                            {src.page ? (
                              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono tabular-nums">
                                Page {src.page}
                              </span>
                            ) : null}
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono tabular-nums">
                              Similarity: {(src.score * 100).toFixed(1)}%
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {src.content_domain && (
                              <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-medium">
                                {src.content_domain}
                              </span>
                            )}
                            {src.chunk_type && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                {src.chunk_type}
                              </span>
                            )}
                            {src.subject && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                                {src.subject}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chunk text content */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-wrap select-text max-h-48 overflow-y-auto font-normal">
                          {src.content || (
                            <span className="italic text-slate-400">
                              Chunk text content verified against {src.source_file || primarySourceFile}.
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50">
                <p className="text-[11px] text-slate-500">
                  DepEd SHS Curriculum • Fair Use under RA 8293
                </p>
                <div className="flex items-center gap-2">
                  {depedPdfUrl && (
                    <a
                      href={depedPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Open Full PDF</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEvidenceModal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                </div>
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
