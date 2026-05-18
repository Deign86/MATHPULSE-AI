import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize, Minimize,
  Menu, Key, HelpCircle, Bot, Trophy, X, Star, CheckCircle, XCircle,
  Heart, Flame,
} from 'lucide-react';
import { generateLessonQuiz } from '../services/lessonQuizService';
import type { Question } from './InteractiveLesson';
import ScientificCalculator from './ScientificCalculator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TryItYourselfPageProps {
  lessonId: string;
  lessonTitle: string;
  lessonNumber?: number | string;
  topic: string;
  subjectId?: string;
  competencyCode?: string;
  onClose: () => void;
  onComplete?: (scorePercent: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
  return { isFullscreen, toggle };
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50">
      {/* Purple header skeleton */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-400 rounded-b-[32px] px-4 pt-4 pb-6 flex flex-col items-center gap-4 min-h-[110px]">
        <div className="w-full flex items-center justify-between">
          <div className="w-20 h-8 bg-white/20 rounded-full animate-pulse" />
          <div className="w-40 h-10 bg-white/20 rounded-full animate-pulse" />
          <div className="flex gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full animate-pulse" />
            <div className="w-10 h-10 bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="w-full max-w-lg h-2 bg-white/20 rounded-full animate-pulse" />
      </div>
      {/* Content skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-12 h-12 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="text-slate-700 font-semibold">Generating your practice quiz...</p>
          <p className="text-slate-400 text-sm mt-1">Creating 10 unique questions</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

interface StatsBarProps {
  hearts: number;
  keys: number;
  streak: number;
  points: number;
  viewIndex: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

function StatsBar({ hearts, keys, streak, points, viewIndex, currentIndex, onPrev, onNext }: StatsBarProps) {
  return (
    <div className="w-full max-w-[54rem] mx-auto shrink-0 flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 mt-4 sm:mt-6">
      <button
        onClick={onPrev}
        disabled={viewIndex === 0}
        className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center shadow-md border-2 transition-all
          ${viewIndex === 0
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50 hover:scale-105 active:scale-95'}`}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-1 mx-2">
        {/* Hearts */}
        <div className="flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white shadow-md border border-slate-200/60 text-rose-500 font-extrabold text-xs sm:text-sm">
          <span className="text-base"><Heart size={16} className="fill-current" /></span> {hearts}
        </div>
        {/* Keys */}
        <div className="flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white shadow-md border border-slate-200/60 text-yellow-500 font-extrabold text-xs sm:text-sm">
          <span className="text-base"><Key size={16} /></span> {keys}
        </div>
        {/* Streak + Points */}
        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 sm:py-1.5 pl-3 sm:pl-4 rounded-full bg-white shadow-md border border-slate-200/60">
          <div className="flex items-center gap-1 text-orange-500 font-extrabold text-xs sm:text-sm">
            <span className="text-base"><Flame size={16} /></span> {streak}
          </div>
          <div className="bg-emerald-100 text-emerald-800 px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm shadow-inner border border-emerald-200/50 whitespace-nowrap">
            + {points} pts
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={viewIndex >= currentIndex}
        className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center shadow-md border-2 transition-all
          ${viewIndex >= currentIndex
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50 hover:scale-105 active:scale-95'}`}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

// ─── Completion Overlay ───────────────────────────────────────────────────────

interface CompletionOverlayProps {
  score: number;
  total: number;
  onClose: () => void;
}

function CompletionOverlay({ score, total, onClose }: CompletionOverlayProps) {
  const pct = Math.round((score / total) * 100);
  const passed = pct >= 60;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg
          ${passed ? 'bg-gradient-to-br from-purple-500 to-indigo-500' : 'bg-gradient-to-br from-rose-400 to-orange-400'}`}>
          <Trophy className="text-white" size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-1">Quiz Complete!</h2>
        <p className="text-slate-500 text-sm mb-5">
          You got <span className="font-bold text-purple-600">{score}</span> out of <span className="font-bold">{total}</span> correct
        </p>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
          <motion.div
            className={`h-full rounded-full ${passed ? 'bg-gradient-to-r from-purple-500 to-indigo-400' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
        <p className={`text-2xl font-black mb-6 ${passed ? 'text-purple-600' : 'text-rose-500'}`}>{pct}%</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-500 text-white hover:opacity-90 transition-opacity shadow-md"
        >
          Continue Learning
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TryItYourselfPage: React.FC<TryItYourselfPageProps> = ({
  lessonId,
  lessonTitle,
  lessonNumber = 1,
  topic,
  subjectId,
  competencyCode,
  onClose,
  onComplete,
}) => {
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);

  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [answerRecords, setAnswerRecords] = useState<Record<number, { answer: string; correct: boolean }>>({});

  // Gamification
  const [hearts, setHearts] = useState(15);
  const [keys, setKeys] = useState(5);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [eliminatedByHint, setEliminatedByHint] = useState<Record<number, string[]>>({});

  // UI state
  const [showExplanation, setShowExplanation] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);

  // ── Load questions ──────────────────────────────────────────────────────────
  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = await generateLessonQuiz({
        lessonId,
        lessonTitle,
        topic,
        subjectId,
        competencyCode,
        questionCount: 10,
      });
      if (qs.length === 0) { setError('No questions available for this topic.'); return; }
      setQuestions(qs);
    } catch {
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lessonId, lessonTitle, topic, subjectId, competencyCode]);

  useEffect(() => { void loadQuiz(); }, [loadQuiz]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalQ = questions.length || 10;
  const score = Object.values(answerRecords).filter(r => r.correct).length;
  const viewedQ = questions[viewIndex];
  const currentQ = questions[currentIndex];
  const isViewingCurrent = viewIndex === currentIndex;
  const isViewedAnswered = answerRecords[viewIndex] !== undefined;
  const isCurrentAnswered = answerRecords[currentIndex] !== undefined;

  // ── Answer handler ──────────────────────────────────────────────────────────
  const handleAnswerSelect = useCallback((idx: number) => {
    if (isCurrentAnswered) return;
    setSelectedAnswer(idx);
  }, [isCurrentAnswered]);

  const handleSubmitAnswer = useCallback((answerOverride?: string) => {
    if (!currentQ || isCurrentAnswered) return;
    const q = currentQ;
    let userAnswerStr: string;
    let correct = false;

    if (q.type === 'multiple-choice' || !q.type) {
      if (selectedAnswer === null) return;
      userAnswerStr = String(selectedAnswer);
      correct = selectedAnswer === (q.options?.findIndex(o => o === q.correctAnswer) ?? -1)
        || (q.options?.[selectedAnswer] ?? '').toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
    } else {
      const raw = answerOverride ?? textAnswer;
      if (!raw.trim()) return;
      userAnswerStr = raw.trim();
      correct = userAnswerStr.toLowerCase() === q.correctAnswer.toLowerCase().trim();
    }

    setIsAnswered(true);
    setLastCorrect(correct);
    setAnswerRecords(prev => ({ ...prev, [currentIndex]: { answer: userAnswerStr, correct } }));

    if (correct) {
      setStreak(s => s + 1);
      setPoints(p => p + 10 + streak * 2);
    } else {
      setStreak(0);
      setHearts(h => Math.max(0, h - 1));
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 600);
    }
  }, [currentQ, isCurrentAnswered, selectedAnswer, textAnswer, currentIndex, streak]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNextQuestion = useCallback(() => {
    if (currentIndex < totalQ - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setViewIndex(next);
      setSelectedAnswer(null);
      setTextAnswer('');
      setIsAnswered(false);
      setLastCorrect(false);
      setShowExplanation(false);
    } else {
      const finalPct = Math.round((score / totalQ) * 100);
      onComplete?.(finalPct);
      setShowCompletion(true);
    }
  }, [currentIndex, totalQ, score, onComplete]);

  const handleHint = useCallback(() => {
    if (!currentQ || keys <= 0 || isCurrentAnswered) return;
    const opts = currentQ.options || [];
    const correctOpt = currentQ.correctAnswer;
    const wrongOpts = opts.filter(o => o !== correctOpt);
    const alreadyElim = eliminatedByHint[currentIndex] || [];
    const remaining = wrongOpts.filter(o => !alreadyElim.includes(o));
    if (remaining.length === 0) return;
    const toElim = remaining[Math.floor(Math.random() * remaining.length)];
    setEliminatedByHint(prev => ({ ...prev, [currentIndex]: [...alreadyElim, toElim] }));
    setKeys(k => Math.max(0, k - 1));
  }, [currentQ, keys, isCurrentAnswered, eliminatedByHint, currentIndex]);

  // ── Early returns ────────────────────────────────────────────────────────────
  if (loading) return <LoadingState />;

  if (error || !viewedQ) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="text-rose-500" size={28} />
          </div>
          <p className="text-slate-700 font-semibold mb-4">{error || 'Something went wrong.'}</p>
          <button onClick={loadQuiz} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const eliminatedOpts = eliminatedByHint[currentIndex] || [];
  const wrongCount = (currentQ?.options?.length ?? 0) - 1;
  const allWrongElim = wrongCount > 0 && eliminatedOpts.length >= wrongCount;
  const showNextBtn = allWrongElim || (isCurrentAnswered && !lastCorrect);
  const isLastQ = currentIndex === totalQ - 1;

  return (
    <>
      {/* Calculator overlay */}
      {showCalculator && (
        <div className="fixed bottom-28 right-4 z-[250]">
          <ScientificCalculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
        </div>
      )}

      {/* Completion overlay */}
      <AnimatePresence>
        {showCompletion && (
          <CompletionOverlay score={score} total={totalQ} onClose={onClose} />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden">

        {/* ── Purple Header ─────────────────────────────────────────────────── */}
        <header className="relative shrink-0 flex flex-col items-center justify-start px-4 pt-4 pb-6 z-[60] shadow-md overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-400 rounded-b-[32px] sm:rounded-b-[40px] min-h-[110px] sm:min-h-[130px]">
          {/* Decorative blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
          </div>

          {/* Top row: timer-area | title pill | utility icons */}
          <div className="w-full max-w-7xl flex items-center justify-between relative z-10 mb-3 sm:mb-4">
            {/* Left spacer (matches QuizExperience layout) */}
            <div className="flex-1" />

            {/* Center title pill */}
            <div className="relative flex items-center justify-center bg-purple-900/40 backdrop-blur-md px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-white/10 gap-2 sm:gap-3 shadow-inner">
              <div className="w-3 h-3 rounded-full bg-yellow-400 shrink-0 shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
              <div className="flex flex-col items-start">
                <span className="text-[9px] sm:text-[11px] font-black text-purple-200 uppercase tracking-widest leading-none mb-0.5">
                  Try It Yourself!
                </span>
                <span className="font-bold text-white tracking-wide text-xs sm:text-sm md:text-base leading-none truncate max-w-[120px] sm:max-w-[220px] md:max-w-[320px]">
                  Lesson {lessonNumber}
                </span>
              </div>
            </div>

            {/* Right utility icons */}
            <div className="flex-1 flex justify-end gap-1 sm:gap-2">
              <button
                onClick={() => setIsAudioEnabled(a => !a)}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors border border-white/10"
              >
                {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="hidden sm:flex w-11 h-11 rounded-full bg-purple-900/20 text-white items-center justify-center hover:bg-purple-900/40 transition-colors border border-white/10"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors border border-white/10"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Progress stepper bar */}
          <div className="w-full max-w-[50rem] flex items-center gap-1.5 sm:gap-2 px-4 z-10">
            {Array.from({ length: totalQ }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 sm:h-2 rounded-full flex-1 transition-all duration-300
                  ${i < currentIndex
                    ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]'
                    : i === currentIndex
                    ? 'bg-white/80'
                    : 'bg-white/20'}`}
              />
            ))}
          </div>
        </header>

        {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
        <StatsBar
          hearts={hearts}
          keys={keys}
          streak={streak}
          points={points}
          viewIndex={viewIndex}
          currentIndex={currentIndex}
          onPrev={() => setViewIndex(v => Math.max(0, v - 1))}
          onNext={() => setViewIndex(v => Math.min(currentIndex, v + 1))}
        />

        {/* ── Scrollable Content ────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 pb-6 flex flex-col items-center">
          <motion.div
            key={viewIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={shakeCard && isViewingCurrent
              ? { x: [-10, 10, -10, 10, 0], opacity: 1 }
              : { opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-3xl flex flex-col mt-2"
          >
            {/* Question card */}
            <div className="bg-white rounded-3xl shadow-lg border-t-[6px] border-purple-500 p-5 sm:p-7 text-center flex flex-col items-center mb-4 sm:mb-5 w-full">
              {/* NEW badge */}
              <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3 shadow-sm">
                <Star size={11} className="text-yellow-500 fill-yellow-400" />
                NEW
              </div>
              <h2 className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-800 leading-tight w-full">
                {viewedQ.question}
              </h2>
            </div>

            {/* Answer options — 2×2 grid for MC, stacked for T/F */}
            <div className="w-full">
              {viewedQ.type === 'true-false' ? (
                <div className="flex gap-3">
                  {['True', 'False'].map(opt => {
                    const rec = answerRecords[viewIndex];
                    const isSelected = isViewingCurrent
                      ? selectedAnswer !== null && (viewedQ.options?.[selectedAnswer] === opt || opt === (selectedAnswer === 0 ? 'True' : 'False'))
                      : rec?.answer === opt;
                    const isCorrect = viewedQ.correctAnswer === opt;
                    let cls = 'bg-white border-transparent text-slate-700 hover:bg-purple-50 hover:border-purple-200';
                    if (isViewedAnswered) {
                      if (isCorrect) cls = 'bg-emerald-50 border-emerald-400 text-emerald-800';
                      else if (isSelected) cls = 'bg-rose-50 border-rose-400 text-rose-800';
                      else cls = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                    }
                    return (
                      <button
                        key={opt}
                        disabled={isViewedAnswered || !isViewingCurrent}
                        onClick={() => { if (!isViewedAnswered && isViewingCurrent) handleSubmitAnswer(opt); }}
                        className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-sm border-[3px] transition-all ${cls} ${!isViewedAnswered && isViewingCurrent ? 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : 'cursor-default'}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : viewedQ.options ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {viewedQ.options.map((opt, idx) => {
                    const rec = answerRecords[viewIndex];
                    const isElim = eliminatedByHint[currentIndex]?.includes(opt) && isViewingCurrent;
                    const isCorrectOpt = opt === viewedQ.correctAnswer;
                    const wasSelected = isViewingCurrent
                      ? selectedAnswer === idx
                      : rec?.answer === String(idx);
                    let cls = 'bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200';
                    if (isElim) cls = 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 line-through cursor-not-allowed';
                    else if (isViewedAnswered) {
                      if (isCorrectOpt) cls = 'bg-emerald-50 border-emerald-400 text-emerald-800 scale-[1.01]';
                      else if (wasSelected) cls = 'bg-rose-50 border-rose-400 text-rose-800 opacity-80';
                      else cls = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                    } else if (isViewingCurrent && selectedAnswer === idx) {
                      cls = 'bg-purple-50 border-purple-400 text-purple-800';
                    }
                    return (
                      <button
                        key={idx}
                        disabled={isViewedAnswered || isElim || !isViewingCurrent}
                        onClick={() => { if (!isViewedAnswered && !isElim && isViewingCurrent) handleAnswerSelect(idx); }}
                        className={`p-4 sm:p-5 rounded-2xl shadow-sm border-[3px] font-extrabold text-sm sm:text-base text-left transition-all flex items-center justify-between ${cls} ${!isViewedAnswered && !isElim && isViewingCurrent ? 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer' : 'cursor-default'}`}
                      >
                        <span className="truncate pr-3">{opt}</span>
                        {isViewedAnswered && isCorrectOpt && <CheckCircle size={20} className="text-emerald-500 shrink-0" />}
                        {isViewedAnswered && wasSelected && !isCorrectOpt && <XCircle size={20} className="text-rose-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Fill-in-blank */
                <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full">
                  <input
                    type="text"
                    disabled={isCurrentAnswered}
                    value={isViewingCurrent ? textAnswer : (answerRecords[viewIndex]?.answer ?? '')}
                    onChange={e => !isCurrentAnswered && setTextAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !isCurrentAnswered) handleSubmitAnswer(); }}
                    placeholder="Type your answer and press Enter..."
                    className={`w-full p-4 rounded-2xl border-[3px] font-extrabold text-base text-center outline-none transition-colors
                      ${isCurrentAnswered
                        ? lastCorrect ? 'border-emerald-400 text-emerald-700 bg-emerald-50' : 'border-rose-400 text-rose-700 bg-rose-50'
                        : 'border-slate-200 focus:border-purple-400 bg-white text-slate-800'}`}
                  />
                  {!isCurrentAnswered && (
                    <button
                      onClick={() => handleSubmitAnswer()}
                      disabled={!textAnswer.trim()}
                      className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors disabled:opacity-40"
                    >
                      Submit Answer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Explanation panel */}
            <AnimatePresence>
              {isViewedAnswered && showExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={`mt-4 p-4 rounded-2xl border-2 flex items-start gap-3
                    ${(isViewingCurrent ? lastCorrect : answerRecords[viewIndex]?.correct)
                      ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}
                >
                  {(isViewingCurrent ? lastCorrect : answerRecords[viewIndex]?.correct)
                    ? <CheckCircle size={22} className="text-emerald-500 shrink-0 mt-0.5" />
                    : <XCircle size={22} className="text-rose-500 shrink-0 mt-0.5" />}
                  <div>
                    <p className={`font-bold text-sm mb-1 ${(isViewingCurrent ? lastCorrect : answerRecords[viewIndex]?.correct) ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {(isViewingCurrent ? lastCorrect : answerRecords[viewIndex]?.correct) ? 'Correct!' : 'Incorrect'}
                    </p>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {viewedQ.explanation || `Correct answer: ${viewedQ.correctAnswer}`}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>

        {/* ── Purple Footer ─────────────────────────────────────────────────── */}
        <footer className="shrink-0 relative z-[60] flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-r from-purple-600 to-indigo-400 rounded-t-[32px] sm:rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
          {showNextBtn ? (
            /* Next / Finish CTA */
            <button
              onClick={handleNextQuestion}
              className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm sm:text-base px-8 py-3 sm:py-4 rounded-full flex items-center gap-2 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all w-full max-w-md mx-auto justify-center"
            >
              {isLastQ ? 'View Results' : 'Next Question'}
              <ChevronRight size={22} />
            </button>
          ) : isViewingCurrent && !showExplanation ? (
            /* Action buttons: Hint | Reveal | Explain | Calculator */
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {/* Hint */}
              <button
                onClick={handleHint}
                disabled={keys <= 0 || isCurrentAnswered}
                className="bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 font-bold px-5 sm:px-7 py-2.5 sm:py-3 rounded-full flex items-center gap-2 text-sm shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200"
              >
                <Key size={16} className="text-yellow-500" /> Hint
              </button>

              {/* Reveal — submit current MC selection */}
              {!isCurrentAnswered && (viewedQ.type === 'multiple-choice' || !viewedQ.type) && selectedAnswer !== null && (
                <button
                  onClick={() => handleSubmitAnswer()}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 sm:px-7 py-2.5 sm:py-3 rounded-full flex items-center gap-2 text-sm shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200"
                >
                  <HelpCircle size={16} className="text-purple-500" /> Reveal
                </button>
              )}

              {/* Explain — only after answering */}
              {isCurrentAnswered && (
                <button
                  onClick={() => setShowExplanation(e => !e)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 sm:px-7 py-2.5 sm:py-3 rounded-full flex items-center gap-2 text-sm shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200"
                >
                  <Bot size={16} className="text-indigo-500" /> Explain
                </button>
              )}

              {/* Calculator */}
              <button
                onClick={() => setShowCalculator(c => !c)}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200
                  ${showCalculator ? 'bg-purple-100 text-purple-600 border-purple-300' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" x2="16" y1="6" y2="6" />
                  <path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" />
                  <path d="M12 14h.01" /><path d="M8 14h.01" />
                  <path d="M12 18h.01" /><path d="M8 18h.01" />
                  <line x1="16" x2="16" y1="14" y2="18" />
                </svg>
              </button>

              {/* Submit for MC when answer selected */}
              {!isCurrentAnswered && (viewedQ.type === 'multiple-choice' || !viewedQ.type) && selectedAnswer !== null && (
                <button
                  onClick={() => handleSubmitAnswer()}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-2 text-sm shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  Submit <ChevronRight size={18} />
                </button>
              )}

              {/* Next when answered correctly */}
              {isCurrentAnswered && lastCorrect && (
                <button
                  onClick={handleNextQuestion}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-2 text-sm shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  {isLastQ ? 'View Results' : 'Next'} <ChevronRight size={18} />
                </button>
              )}
            </div>
          ) : viewIndex < currentIndex ? (
            /* Reviewing past question */
            <button
              onClick={() => setViewIndex(currentIndex)}
              className="bg-white text-slate-700 font-extrabold text-sm px-6 py-3 rounded-full flex items-center gap-2 shadow-lg hover:bg-slate-50 transition-transform hover:scale-105 active:scale-95 border border-slate-200"
            >
              <ChevronRight size={18} /> Back to Current Question
            </button>
          ) : null}
        </footer>

      </div>
    </>
  );
};

export default TryItYourselfPage;
