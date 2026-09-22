import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, BookOpen, Lightbulb,
  Calculator, Award, RefreshCw, AlertTriangle, NotebookPen,
  Clock, Key, ClipboardCheck, Target, Zap, PlayCircle, Ruler, Sparkles, Pin,
  ShieldCheck, FileText, ExternalLink, FileSearch, X,
  ChevronDown, Check, Lock
} from 'lucide-react';
import MathPulseLoader from './ui/MathPulseLoader';

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

/** Auto-bold: quotes and definition sentence openers only, avoiding mid-sentence teal pills */
function autoHighlightTerms(text: string): string {
  return text
    .replace(
      /(^|[\.\?!]\s+)([A-Z][a-zA-Z\s]{2,25}?)\s+(is\b|are\b|occurs when\b|refers to\b|is used to\b)/g,
      (_, prefix, term, verb) => `${prefix}**${term.trim()}** ${verb}`
    )
    .replace(/"([^"]{2,40})"/g, (_, t) => `**${t}**`);
}

function formatContent(raw: string): React.ReactNode {
  if (!raw?.trim()) return null;

  const rawLines = raw.split('\n');
  const leadingNumRegex = /^\s*(\d+)[\.\)]\s*(.*)$/;

  // Check if content is a series of numbered concepts (e.g. "1. Variables: ...")
  const numberedItems: { num: number; rawText: string }[] = [];
  let currentNumberedItem: { num: number; lines: string[] } | null = null;

  for (const line of rawLines) {
    const trimmed = line.trim();
    const match = trimmed.match(leadingNumRegex);
    if (match) {
      if (currentNumberedItem) {
        numberedItems.push({
          num: currentNumberedItem.num,
          rawText: currentNumberedItem.lines.join(' ').trim(),
        });
      }
      currentNumberedItem = {
        num: parseInt(match[1], 10),
        lines: [match[2]],
      };
    } else if (currentNumberedItem) {
      if (trimmed) {
        currentNumberedItem.lines.push(trimmed);
      }
    }
  }
  if (currentNumberedItem) {
    numberedItems.push({
      num: currentNumberedItem.num,
      rawText: currentNumberedItem.lines.join(' ').trim(),
    });
  }

  // If we have multiple numbered concepts, render them as beautiful structured cards
  if (numberedItems.length >= 2) {
    return (
      <div className="space-y-3.5">
        {numberedItems.map((item, idx) => {
          const itemNum = idx + 1; // Always strictly sequential 1, 2, 3...
          const titleMatch = item.rawText.match(/^([A-Za-z0-9\s,\/&\-\(\)'"]+?):\s*(.+)$/s);
          let title: string | undefined;
          let body = item.rawText;
          if (titleMatch && titleMatch[1].length < 80) {
            title = titleMatch[1].trim();
            body = titleMatch[2].trim();
          }

          // Extract real-world example if present
          const exampleSplit = body.match(/^(.*?)(?:\s*(?:For example,?\s*|e\.g\.,?\s*|In the [^,\.]+ scenario,?\s*|Example:\s*))(.+)$/si);
          let explanation = body;
          let exampleText: string | undefined;
          if (exampleSplit && exampleSplit[1].trim().length > 15) {
            explanation = exampleSplit[1].trim();
            exampleText = exampleSplit[2].trim();
          }

          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-800/90 p-4 sm:p-5 shadow-2xs space-y-2.5 transition-all"
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 font-mono font-black text-[11px] sm:text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
                  {itemNum}
                </span>
                {title && (
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight font-display">
                    {inlineFormat(title)}
                  </h3>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {inlineFormat(explanation)}
              </p>

              {exampleText && (
                <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/30 p-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                  <span className="text-amber-600 dark:text-amber-400 shrink-0 font-bold text-xs mt-0.5">
                    💡 Example:
                  </span>
                  <div className="flex-1 font-medium leading-relaxed">
                    {inlineFormat(exampleText)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback for general content
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

    const formattedPara = autoHighlightTerms(text);
    nodes.push(
      <div
        key={key++}
        className="rounded-2xl p-4 sm:p-5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1.5 transition-all hover:bg-white dark:hover:bg-slate-800"
      >
        <p className="lesson-body-text text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm font-body">
          {inlineFormat(formattedPara)}
        </p>
      </div>
    );
    paraBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key++} className="space-y-2 my-1 pl-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-body">
            <span className="mt-[0.45rem] w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
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
          <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-body">
            <span className="mt-0.5 min-w-[1.4rem] h-[1.4rem] rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[0.65rem] font-bold flex items-center justify-center flex-shrink-0">
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
      return { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-200', label: <Ruler aria-hidden="true" size={14} /> };
    if (/definition|concept|key/.test(p))
      return { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-200', label: <BookOpen aria-hidden="true" size={14} /> };
    if (/note|reminder|important/.test(p))
      return { bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-900 dark:text-rose-200', label: <AlertTriangle aria-hidden="true" size={14} /> };
    if (/example|step/.test(p))
      return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-200', label: <NotebookPen aria-hidden="true" size={14} /> };
    return { bg: 'bg-slate-50 dark:bg-slate-900', border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-200', label: <Lightbulb aria-hidden="true" size={14} /> };
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
          <p className={`text-[0.75rem] font-black uppercase tracking-widest mb-1.5 ${scheme.text} opacity-80 font-display flex items-center gap-1.5`}>
            {scheme.label} {prefix}
          </p>
          <p className={`text-xs sm:text-sm leading-relaxed font-semibold font-body ${scheme.text}`}>
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

    // Standalone formula line
    if (isFormula(trimmed) && !/[a-z]{5,}/.test(trimmed)) {
      flushList();
      flushNumbered();
      flushPara();
      nodes.push(
        <div key={key++} className="lesson-formula-box my-2 text-xs sm:text-sm">
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
        <p key={key++} className="lesson-section-heading text-slate-900 dark:text-white font-black text-sm sm:text-base mt-4 mb-1 border-b border-slate-200/80 dark:border-white/10 pb-1 font-display">
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
      // Clean, strong typography
      parts.push(
        <strong key={k++} className="font-bold text-slate-900 dark:text-white font-body">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(<em key={k++} className="italic text-slate-600 dark:text-slate-400 font-body">{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={k++} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[0.85em] font-mono text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-white/10 font-semibold">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      parts.push(
        <mark key={k++} className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-1 py-0.5 rounded font-bold border-b-2 border-amber-400">
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
import { useLessonContent, type UseLessonContentResult } from '../hooks/useLessonContent';
import { getFirebaseStoragePdfUrl } from '../data/curriculum/types';
import type { CurriculumQuarter } from '../data/curriculum/types';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logLessonView } from '../services/trackingService';
import type { MicroLessonCardProps, MicroLessonPhase } from './notebook/MicroLessonCard';

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
  initialContent?: UseLessonContentResult;
  onLogLessonView?: (userId: string, lessonId: string, topic: string) => Promise<void>;
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
  }

  // If no explicit bulleted/numbered objectives were parsed, extract actionable goals from sentences
  if (objectives.length === 0 && welcomeLines.length > 0) {
    const fullText = welcomeLines.join(' ');
    const sentences = fullText.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) || [fullText];
    const GOAL_KEYWORD_RE = /(will learn|focuses on|will encounter|will also|will be able to|goal is to|objective is to|learn how to|explore|examine|translate)/i;
    const goalSentences = sentences.filter(s => GOAL_KEYWORD_RE.test(s));

    if (goalSentences.length >= 2) {
      return {
        welcome: sentences[0],
        objectives: goalSentences.slice(0, 4).map(s => ({ text: s })),
      };
    }
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
    <MathPulseLoader
      title="Loading lesson from DepEd curriculum..."
      subtitle="This may take a moment while the AI retrieves curriculum content."
      fullScreen
    />
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
  isStaffView = false,
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
  isStaffView?: boolean;
}) {
  switch (section.type) {
    case 'introduction': {
      const { welcome, objectives } = parseIntroContent(section.content || '');
      const totalSectionCount = 7;
      const compMatch = (section.content || '').match(/\b([A-Z0-9]{2,6}-[A-Z0-9]{2,6}(?:-[A-Z0-9]{1,4})?)\b/);
      // SAFETY: lesson object dynamically carries competencyCode from curriculum metadata.
      const competencyBadge = compMatch ? compMatch[1] : (lesson as { competencyCode?: string }).competencyCode;

      return (
        <div className="space-y-4 sm:space-y-5">
          {/* Mission & Overview Hero Card */}
          <div className="rounded-2xl border border-[#1a85a4]/30 bg-gradient-to-br from-sky-50/90 via-white to-sky-50/40 p-4 sm:p-5 shadow-xs relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1a85a4] text-white flex items-center justify-center shadow-2xs">
                  <Target size={15} />
                </div>
                <span className="font-display text-[#1a85a4] text-xs font-black uppercase tracking-wider">
                  Lesson Mission & Overview
                </span>
              </div>
              {isStaffView && competencyBadge && (
                <span className="px-2.5 py-1 rounded-lg bg-[#1a85a4]/10 text-[#1a85a4] font-mono text-[11px] font-black border border-[#1a85a4]/20 flex items-center gap-1.5 shadow-2xs">
                  <Award size={12} />
                  DepEd {competencyBadge}
                </span>
              )}
            </div>

            <p className="font-body text-slate-700 text-xs sm:text-sm md:text-[0.95rem] leading-relaxed font-medium">
              {inlineFormat(autoHighlightTerms(welcome || section.content || ''))}
            </p>
          </div>

          {/* Callouts / Heads Up */}
          {section.callouts && section.callouts.length > 0 ? (
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
                      {callout.type === 'tip' ? 'Pro Tip' : callout.type === 'important' ? 'Heads Up' : 'Note'}
                    </p>
                    <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">{callout.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 flex items-start gap-2.5 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 mt-0.5 text-white shadow-2xs">
                <Lightbulb size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider mb-0.5 text-amber-700 font-display">
                  Heads Up
                </p>
                <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  This lesson has {totalSectionCount} sections. Grab your pen and scratch paper to follow the worked examples and complete the practice quiz!
                </p>
              </div>
            </div>
          )}

          {/* Actionable Learning Objectives / Target Goals */}
          {objectives.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-violet-600" />
                  <h3 className="font-display font-black text-xs sm:text-sm text-violet-700 uppercase tracking-wide">
                    What You'll Master Today
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {objectives.length} Core Goal{objectives.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {objectives.map((obj, i) => {
                  const color = OBJECTIVE_COLORS[i % OBJECTIVE_COLORS.length];
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border p-3 sm:p-3.5 flex items-start gap-3 shadow-2xs transition-all hover:shadow-xs",
                        color.bg, color.border
                      )}
                    >
                      <span className={cn(
                        "mt-0.5 w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shrink-0 tabular-nums shadow-2xs font-mono",
                        color.num
                      )}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-body text-xs sm:text-sm font-semibold leading-snug", color.text)}>
                          {inlineFormat(autoHighlightTerms(obj.text))}
                        </p>
                        {obj.example && (
                          <p className={cn("text-[11px] mt-1 font-mono font-medium truncate", color.ex)}>
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

          {/* Learning Journey Strip */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 sm:p-3.5 shadow-2xs">
            <p className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <ClipboardCheck size={13} className="text-slate-400" />
              Lesson Roadmap
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-center">
              {SECTION_TABS.map((t, sIdx) => {
                const isCurrent = sIdx === 0;
                return (
                  <div
                    key={t.type}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      isCurrent
                        ? `${t.tabBg} text-white shadow-xs border-transparent ring-1 ring-white/40`
                        : "bg-white text-slate-600 border-slate-200/60 opacity-75"
                    )}
                  >
                    <span className="block font-mono text-[9px] opacity-80">Part {sIdx + 1}</span>
                    <span className="truncate block">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
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

const MICRO_LESSON_SECTION_MAP: ReadonlyArray<{
  phase: MicroLessonPhase;
  sectionType: RagLessonSection['type'];
}> = [
  { phase: 'Activation', sectionType: 'introduction' },
  { phase: 'Demonstration', sectionType: 'worked_examples' },
  { phase: 'Application', sectionType: 'try_it_yourself' },
  { phase: 'Integration', sectionType: 'summary' },
];

function getMicroLessonBody(section: RagLessonSection): string {
  if (section.content?.trim()) return section.content;
  if (section.examples?.length) {
    return section.examples
      .map((example) => [example.problem, ...example.steps, `Answer: ${example.answer}`].join('\n'))
      .join('\n\n');
  }
  if (section.practiceProblems?.length) {
    return section.practiceProblems
      .map((problem) => `${problem.question}\nSolution: ${problem.solution}`)
      .join('\n\n');
  }
  if (section.bulletPoints?.length) return section.bulletPoints.map((bulletPoint) => `- ${bulletPoint}`).join('\n');
  return '';
}

function buildMicroLessonCards(sections: readonly RagLessonSection[]): MicroLessonCardProps[] {
  return MICRO_LESSON_SECTION_MAP.flatMap(({ phase, sectionType }) => {
    const section = sections.find((candidate) => candidate.type === sectionType);
    if (!section) return [];

    const body = getMicroLessonBody(section);
    return body ? [{ phase, title: section.title, body, minutes: 3 }] : [];
  });
}

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
  initialContent,
  onLogLessonView,
}) => {
  const { userProfile, userRole } = useAuth();
  // Issue #164: students see assurance copy only; teacher/admin keep full RAG telemetry.
  const isStaffView = userRole === 'teacher' || userRole === 'admin';
  const [currentSection, setCurrentSection] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showCompletion, setShowCompletion] = useState(false);
  const [expandedProblem, setExpandedProblem] = useState<number | null>(null);
  const [showTryItPage, setShowTryItPage] = useState(false);
  const [tryItQuestions, setTryItQuestions] = useState<Question[] | null>(null);
  const [tryItLoading, setTryItLoading] = useState(false);
  const [tryItSessionId] = useState(() => `tiy-${Date.now()}`);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [maxUnlockedSection, setMaxUnlockedSection] = useState<number>(() => initialSection >= 0 ? initialSection : 0);

  useEffect(() => {
    setMaxUnlockedSection(prev => Math.max(prev, currentSection));
  }, [currentSection]);

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

  const fetchedLessonContent = useLessonContent(lesson.id, request, !initialContent);
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
  } = initialContent ?? fetchedLessonContent;

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
  // SAFETY: lesson payloads from the curriculum pipeline always carry these optional metadata fields.
  const lessonCompetencyCode = (lesson as any).competencyCode || '';
  // SAFETY: lesson payloads from the curriculum pipeline always carry these optional metadata fields.
  const lessonSubjectName = (lesson as any).subject || primarySource?.subject || 'Senior High School Mathematics';
  const studentSourceLabel = lessonCompetencyCode
    ? `${lessonSubjectName} • DepEd Competency: ${lessonCompetencyCode}`
    : `${lessonSubjectName} • DepEd SHS Curriculum`;
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
      // Issue #159: analytics-only write — a failed view log must never
      // surface to the learner. Logged so ingestion outages stay visible.
      const recordView = onLogLessonView ?? logLessonView;
      recordView(userProfile.uid, lesson.id, lessonSpecificTopic || lesson.title).catch((err) => {
        console.debug('[LessonViewer] logLessonView failed (non-blocking):', err);
      });
    }
  }, [sections.length, userProfile?.uid, lesson.id, lessonSpecificTopic, lesson.title, onLogLessonView]);

  const totalSections = sections.length || SECTION_TABS.length;
  const microLessonCards = buildMicroLessonCards(sections);

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
    const portalTarget = document.getElementById('modal-root') || document.body;
    if (tryItLoading || !tryItQuestions) {
      return (
        <MathPulseLoader
          title="Generating Quiz..."
          subtitle={`AI is crafting questions for ${lesson.title}`}
          fullScreen={true}
        />
      );
    }
    return ReactDOM.createPortal(
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
      />,
      portalTarget
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
      {/* Minimal Responsive Top Header */}
      <header className="flex-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-3 sm:px-6 py-2 relative z-40">
        <div className="max-w-[96rem] mx-auto w-full flex items-center justify-between gap-3">
          {/* Left: Back Button + Clean Lesson Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer shadow-2xs active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate leading-none">
                {lessonSubject}
              </p>
              <h1 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm md:text-[15px] truncate mt-0.5 leading-snug" title={lesson.title}>
                {lesson.title}
              </h1>
            </div>
          </div>

          {/* Right: Staff Controls (if teacher/admin) + Clean Progress Meter */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isStaffView && (
              <>
                {activeModel && (
                  <span className="hidden sm:inline-block text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">
                    {activeModel.split('/').pop()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(true)}
                  aria-label="Inspect evidence"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-colors shadow-2xs cursor-pointer"
                  title="Inspect retrieved DepEd text chunks, similarity scores, and metadata"
                >
                  <FileSearch size={12} className="shrink-0" />
                  <span className="hidden sm:inline">Inspect Evidence</span>
                  {sources && sources.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-black tabular-nums">
                      {sources.length}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Slim Progress Meter */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-white/10">
              <div className="w-12 sm:w-16 md:w-20 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
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

      {/* Main Reading Container */}
      <main className="flex-1 overflow-hidden px-2.5 sm:px-6 md:px-8 py-2 sm:py-3.5 md:py-4 relative flex justify-center min-h-0">
        <section aria-label="Merrill micro-lesson" className="w-full max-w-[92rem] h-full relative flex md:pl-16 pt-8.5 md:pt-0">

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
                    'group relative flex items-center justify-start pl-4 rounded-l-[1.5rem] transition-all duration-300 shadow-sm border-r-0 flex-shrink-0 cursor-pointer select-none',
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

          {/* Main Notebook Container */}
          <div className={cn("flex-1 min-w-0 rounded-2xl sm:rounded-3xl shadow-xl border border-black/5 dark:border-white/10 flex flex-col overflow-visible relative z-10 transition-colors duration-500", currentTab.tabBg)}>
            {/* Mobile Single Tab - Directly attached to top edge of notebook container */}
            <div className="md:hidden absolute left-3 sm:left-6 -top-8.5 z-30">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(prev => !prev)}
                  aria-expanded={isMobileNavOpen}
                  aria-haspopup="true"
                  className={cn(
                    'flex items-center gap-2 px-3.5 h-8.5 rounded-t-xl transition-all duration-200 text-xs font-black shadow-none cursor-pointer select-none active:scale-95 border-b-0 translate-y-[1px]',
                    currentTab.tabBg,
                    'text-white'
                  )}
                  aria-label={`Section: Part ${currentSection + 1} ${currentTab.label}. Tap to open module section menu.`}
                >
                  <CurrentTabIcon size={14} className="shrink-0" />
                  <span className="font-black tracking-wide">
                    Part {currentSection + 1}: {currentTab.label}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      'transition-transform duration-200 shrink-0 ml-0.5',
                      isMobileNavOpen && 'rotate-180'
                    )}
                  />
                </button>

                {/* Dropdown Menu for Unlocked Sections */}
                <AnimatePresence>
                  {isMobileNavOpen && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileNavOpen(false)}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                      />

                      {/* Dropdown Menu Card */}
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-2 shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                            Module Parts
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {currentSection + 1} of {totalSections}
                          </span>
                        </div>

                        <div className="space-y-1 max-h-72 overflow-y-auto">
                          {SECTION_TABS.map((tab, idx) => {
                            const Icon = tab.icon;
                            const isCurrent = idx === currentSection;
                            const isUnlocked = idx <= maxUnlockedSection;

                            return (
                              <button
                                key={tab.type}
                                type="button"
                                disabled={!isUnlocked}
                                onClick={() => {
                                  setDirection(idx > currentSection ? 1 : -1);
                                  setCurrentSection(idx);
                                  setIsMobileNavOpen(false);
                                }}
                                className={cn(
                                  'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer',
                                  isCurrent
                                    ? `${tab.tabBg} text-white shadow-sm`
                                    : isUnlocked
                                    ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={cn(
                                      'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white',
                                      isCurrent ? 'bg-white/20' : tab.tabBg
                                    )}
                                  >
                                    <Icon size={13} />
                                  </div>
                                  <div className="truncate">
                                    <span className="text-[10px] opacity-75 font-mono block leading-none">
                                      Part {idx + 1}
                                    </span>
                                    <span className="truncate block mt-0.5">
                                      {tab.label}
                                    </span>
                                  </div>
                                </div>

                                {isCurrent ? (
                                  <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-xs" />
                                ) : isUnlocked ? (
                                  idx < currentSection ? (
                                    <Check size={13} className="text-emerald-500 shrink-0" />
                                  ) : null
                                ) : (
                                  <Lock size={12} className="text-slate-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Header inside notebook */}
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 backdrop-blur-xs border border-white/20">
                  <CurrentTabIcon size={16} className="text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider text-white/85 bg-black/20 px-2 py-0.5 rounded-md">
                      Part {currentSection + 1} of {totalSections}
                    </span>
                    <span className="text-white/80 text-[11px] font-bold hidden sm:inline">
                      {currentTab.label}
                    </span>
                  </div>
                  <h2 className="lesson-section-heading text-sm sm:text-lg md:text-xl font-black text-white truncate font-display mt-0.5 drop-shadow-xs" title={currentSectionData.title}>
                    {currentSectionData.title}
                  </h2>
                </div>
              </div>

              {/* Subject Tag on right */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-[11px] font-bold text-white shadow-2xs">
                  {lessonSubject}
                </div>
              </div>
            </div>

            {/* Inner Paper Area - Authentic Notebook Page */}
            <div className="flex-1 min-h-0 bg-[#faf9f5] dark:bg-slate-950 rounded-xl sm:rounded-2xl m-2 sm:m-3 mt-0 relative overflow-hidden shadow-inner flex flex-col border border-black/5 dark:border-white/5">
              {/* Notebook Paper Ruled Lines Pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-45 dark:opacity-20 select-none z-0"
                style={{
                  backgroundImage:
                    'linear-gradient(to bottom, transparent 31px, rgba(148, 163, 184, 0.35) 31px, rgba(148, 163, 184, 0.35) 32px)',
                  backgroundSize: '100% 32px',
                  backgroundPosition: '0 0',
                }}
              />

              {/* Notebook Red Margin Line */}
              <div className="absolute top-0 bottom-0 left-6 sm:left-10 md:left-14 w-[1.5px] bg-rose-400/35 dark:bg-rose-500/25 pointer-events-none z-0" />

              {/* Scrollable Content */}
              <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 md:px-12 py-4 sm:py-6" key={currentSection}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSection}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 font-body pb-6"
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
                      isStaffView={isStaffView}
                    />

                      {sources.length > 0 && (userProfile?.role === 'admin' || userProfile?.role === 'teacher') && (
                        <details className="mt-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 px-3 py-2 text-xs text-slate-500 shadow-2xs">
                          <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-800">
                            {sources.length} source{sources.length > 1 ? 's' : ''} used
                          </summary>
                          <div className="mt-2 space-y-1 pl-2 font-mono text-[11px]">
                            {sources.slice(0, 3).map((src, i) => (
                              <p key={i} className="truncate">
                                [{Math.round((src.score || 0) * 100)}%] {src.source_file || 'Curriculum Doc'} (p. {src.page ?? 1})
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
        </section>
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
      {isStaffView && <AnimatePresence>
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
                  {isStaffView ? (
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
                  ) : (
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Verified DepEd Curriculum
                    </span>
                  </div>
                  )}
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate text-balance">
                    Curriculum Grounding Evidence
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                    {isStaffView ? primarySourceLabel : studentSourceLabel}
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
                {isStaffView ? (
                <>
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
                </>
                ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-5 text-center">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <ShieldCheck size={24} className="text-white" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 text-balance">
                      Verified DepEd Senior High School STEM Curriculum
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      This lesson is aligned to the official DepEd curriculum.
                      Your teacher can view the full technical audit trail.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject</span>
                      <span className="text-sm font-bold text-slate-800 text-right">{lessonSubjectName}</span>
                    </div>
                    {primarySource && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Quarter</span>
                      <span className="text-sm font-bold text-slate-800 tabular-nums">Quarter {primarySource.quarter}</span>
                    </div>
                    )}
                    {lessonCompetencyCode && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">DepEd Competency</span>
                      <span className="text-sm font-bold text-slate-800 font-mono">{lessonCompetencyCode}</span>
                    </div>
                    )}
                  </div>
                  {depedPdfUrl && (
                  <a
                    href={depedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>Open official textbook lesson</span>
                  </a>
                  )}
                </div>
                )}
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
      </AnimatePresence>}
    </div>
  );

  const portalTarget = document.getElementById('modal-root') || document.body;
  return ReactDOM.createPortal(content, portalTarget);
};

export default LessonViewer;
