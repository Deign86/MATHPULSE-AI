/**
 * TryItYourselfEngine — Spec v15 Compliant Adaptive Quiz Engine
 * 
 * Uses the same visual UI as InteractiveLesson but with:
 * - Phase-based progression (4 phases, no Bloom labels shown)
 * - Locked-Round queue (wrong answers re-enter the queue)
 * - 3-tier Progressive Scaffolding hints (text-based)
 * - Reveal ghost state (disabled until attempt threshold)
 * - Explain locked state (padlock until resolved)
 * - Brute Force Floor XP (never 0 for correct answers)
 * - Per-question attempt tracking
 * - Full-page next-phase screen with mascot + confetti
 * - Shadow retry injection between phases
 * - Server-side XP verification
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  X, Check, ArrowRight, Trophy, Zap, HelpCircle, Lock,
  ChevronLeft, ChevronRight, BookOpen, Sparkles, Volume2, VolumeX,
  Maximize, Minimize, Star, Award, Target, Flame, RefreshCw,
  AlertTriangle, Lightbulb, Calculator, Menu,
  Sigma, Divide, Percent, Triangle, Circle, Square, Box, Ruler,
  Binary, FunctionSquare, Scaling, Braces, TrendingUp
} from 'lucide-react';
import { Button } from './ui/button';
import ScientificCalculator from './ScientificCalculator';
import { resolveQuestion, useHint, completeSession, fetchShadowRetries } from '../services/tryItYourselfService';
import type { Question } from './InteractiveLesson';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'foundation' | 'application' | 'complexity' | 'gauntlet';
type QuizState = 'playing' | 'phase-complete' | 'loading-next' | 'complete';

interface QuestionState {
  attempts: number;
  hintsUsed: number;
  resolved: boolean;
  resolution: 'correct' | 'revealed' | null;
  failedOptions: string[];
  xpAwarded: number;
}

interface RoundResult {
  phase: Phase;
  questionsCorrect: number;
  questionsRevealed: number;
  xpEarned: number;
  struggleTopics: string[];
}

interface TryItYourselfEngineProps {
  questions: Question[];
  lessonTitle: string;
  subject: string;
  sessionId: string;
  userId?: string;
  onComplete: (score: number, totalXP?: number) => void;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_IDS: Phase[] = ['foundation', 'application', 'complexity', 'gauntlet'];
const XP_DECAY: Record<number, number> = { 0: 1.0, 1: 0.7, 2: 0.4, 3: 0.2 };
const BASE_XP = 10;
const BRUTE_FORCE_FLOOR = 2;
const REVEAL_UNLOCK_MCQ = 2;
const REVEAL_UNLOCK_ID = 1;
const STRUGGLE_THRESHOLD = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateLocalXP(hintsUsed: number, resolution: 'correct' | 'revealed'): number {
  if (resolution === 'revealed') return 0;
  const multiplier = XP_DECAY[Math.min(hintsUsed, 3)] ?? 0.2;
  return Math.max(Math.round(BASE_XP * multiplier), BRUTE_FORCE_FLOOR);
}

function splitIntoPhases(questions: Question[]): Question[][] {
  const total = questions.length;
  const MIN_PER_PHASE = 4;

  // Check if questions have bloom levels tagged
  const tagged = questions.filter(q => q.bloomLevel);
  
  // If less than half are tagged, distribute dynamically
  if (tagged.length < total / 2) {
    if (total < MIN_PER_PHASE * 2) return [questions];
    // Dynamic: aim for 4 phases but ensure minimum per phase
    const numPhases = Math.min(4, Math.floor(total / MIN_PER_PHASE));
    const perPhase = Math.ceil(total / numPhases);
    const phases: Question[][] = [];
    for (let i = 0; i < numPhases; i++) {
      const slice = questions.slice(i * perPhase, (i + 1) * perPhase);
      if (slice.length > 0) phases.push(slice);
    }
    return phases;
  }

  // Group questions by Bloom's taxonomy level
  const remember = questions.filter(q => q.bloomLevel === 'remember' || q.bloomLevel === 'understand');
  const apply = questions.filter(q => q.bloomLevel === 'apply');
  const analyze = questions.filter(q => q.bloomLevel === 'analyze');
  const evaluate = questions.filter(q => q.bloomLevel === 'evaluate');
  const untagged = questions.filter(q => !q.bloomLevel);

  const phases: Question[][] = [];
  const phase1 = [...remember, ...untagged];
  if (phase1.length > 0) phases.push(phase1);
  if (apply.length > 0) phases.push(apply);
  if (analyze.length > 0) phases.push(analyze);
  if (evaluate.length > 0) phases.push(evaluate);

  // Merge tiny phases (< MIN_PER_PHASE) into adjacent ones
  const merged: Question[][] = [];
  let buffer: Question[] = [];
  for (const phase of phases) {
    buffer = [...buffer, ...phase];
    if (buffer.length >= MIN_PER_PHASE) {
      merged.push(buffer);
      buffer = [];
    }
  }
  if (buffer.length > 0) {
    if (merged.length > 0) merged[merged.length - 1] = [...merged[merged.length - 1], ...buffer];
    else merged.push(buffer);
  }

  return merged.length > 0 ? merged : [questions];
}

function getRevealThreshold(type: Question['type']): number | null {
  if (type === 'multiple-choice') return REVEAL_UNLOCK_MCQ;
  if (type === 'fill-in-blank') return REVEAL_UNLOCK_ID;
  return null; // true-false: permanently disabled
}

function getTopicIcons(title: string) {
  const t = title.toLowerCase();
  if (t.includes('geometry') || t.includes('shape')) return [Triangle, Circle, Square, Box, Ruler, Scaling];
  if (t.includes('algebra') || t.includes('equation')) return [X, Divide, Braces, FunctionSquare, Calculator, Percent];
  if (t.includes('calculus') || t.includes('derivative') || t.includes('integral')) return [Sigma, FunctionSquare, TrendingUp, Calculator, Divide, Braces];
  if (t.includes('statistics') || t.includes('probability')) return [Target, TrendingUp, Box, Circle, Triangle, Square];
  return [Calculator, Sigma, Divide, Percent, FunctionSquare, Binary];
}

// ─── SFX ──────────────────────────────────────────────────────────────────────

function playSound(type: 'correct' | 'incorrect' | 'complete' | 'streak' | 'hint', enabled: boolean) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const t = ctx.currentTime;
    const note = (freq: number, start: number, dur: number, vol = 0.1, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + dur);
    };
    switch (type) {
      case 'correct': note(880, t, 0.1); note(1108.73, t + 0.1, 0.2); break;
      case 'incorrect': note(300, t, 0.2, 0.05, 'sawtooth'); note(250, t + 0.15, 0.3, 0.05, 'sawtooth'); break;
      case 'streak': note(440, t, 0.1, 0.05, 'square'); note(554.37, t + 0.1, 0.1, 0.05, 'square'); note(659.25, t + 0.2, 0.1, 0.05, 'square'); note(880, t + 0.3, 0.4, 0.05, 'square'); break;
      case 'complete': note(523.25, t, 0.1); note(659.25, t + 0.15, 0.1); note(783.99, t + 0.3, 0.1); note(1046.5, t + 0.45, 0.5); break;
      case 'hint': note(600, t, 0.15, 0.06, 'triangle'); break;
    }
  } catch { /* Audio blocked */ }
}


// ─── Animated Counter Row ─────────────────────────────────────────────────

const AnimatedResultRow: React.FC<{ label: string; value: number; prefix?: string; suffix?: string; icon?: React.ReactNode; delay?: number; large?: boolean }> = ({ label, value, prefix = '', suffix = '', icon, delay = 0, large }) => {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (value <= 0) { setCount(value); return; }
    const timeout = setTimeout(() => {
      const duration = 800;
      const steps = 20;
      const stepTime = Math.floor(duration / steps);
      let current = 0;
      const timer = setInterval(() => {
        current += Math.max(1, Math.floor(value / steps));
        if (current >= value) { setCount(value); clearInterval(timer); }
        else setCount(current);
      }, stepTime);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4 }}
      className="flex items-center justify-between"
    >
      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
        {icon} {label}
      </span>
      <span className={`font-black tabular-nums ${large ? 'text-2xl text-purple-600' : 'text-lg text-slate-800'}`}>
        {prefix}{count}{suffix}
      </span>
    </motion.div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const TryItYourselfEngine: React.FC<TryItYourselfEngineProps> = ({
  questions, lessonTitle, subject, sessionId, userId, onComplete, onBack,
}) => {
  // ─── Phase & Queue State ──────────────────────────────────────────────────
  const phaseGroups = useMemo(() => splitIntoPhases(questions), [questions]);
  const totalPhases = phaseGroups.length;
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [queue, setQueue] = useState<Question[]>(() => [...phaseGroups[0]]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>('playing');

  // ─── Per-Question State ───────────────────────────────────────────────────
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});

  // ─── UI State ─────────────────────────────────────────────────────────────
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [shuffledOptions, setShuffledOptions] = useState<{ id: string; text: string }[]>([]);
  const [showHintPanel, setShowHintPanel] = useState(false);
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [phaseConfettiFired, setPhaseConfettiFired] = useState(false);

  // ─── Scoring & Streaks ────────────────────────────────────────────────────
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [heartsCount, setHeartsCount] = useState(15);
  const [keysCount, setKeysCount] = useState(5);

  // ─── Round Results ────────────────────────────────────────────────────────
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [currentRoundResult, setCurrentRoundResult] = useState<RoundResult | null>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const startTimeRef = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const currentQuestion = queue[queueIndex] || null;
  const TopicIcons = useMemo(() => getTopicIcons(lessonTitle), [lessonTitle]);
  const theme = {
    gradient: 'bg-gradient-to-br from-[#7274ED] via-[#9956DE] to-[#7274ED]',
  };

  const getOrCreateQState = useCallback((qId: number): QuestionState => {
    return questionStates[qId] || { attempts: 0, hintsUsed: 0, resolved: false, resolution: null, failedOptions: [], xpAwarded: 0 };
  }, [questionStates]);

  // ─── Shuffle options on question change ───────────────────────────────────
  useEffect(() => {
    if (!currentQuestion) return;
    if (currentQuestion.type === 'multiple-choice' && currentQuestion.options) {
      const mapped = currentQuestion.options.map((opt, i) => ({ id: `${currentQuestion.id}-${i}`, text: opt }));
      for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
      }
      setShuffledOptions(mapped);
    } else {
      setShuffledOptions([]);
    }
    setSelectedOption(null);
    setTextInput('');
    setShowHintPanel(false);
    setShowExplainPanel(false);
    setShowRoundResult(false);
    if (currentQuestion.type === 'fill-in-blank') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentQuestion?.id]);

  // ─── Fullscreen ───────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ─── HINT HANDLER ─────────────────────────────────────────────────────────
  const handleHint = useCallback(() => {
    if (!currentQuestion) return;
    const qs = getOrCreateQState(currentQuestion.id);
    if (qs.resolved || qs.hintsUsed >= (currentQuestion.hints?.length || 0)) return;
    if (keysCount <= 0) return;
    playSound('hint', isAudioEnabled);
    setShowHintPanel(true);
    setKeysCount(prev => prev - 1);
    const newHintsUsed = qs.hintsUsed + 1;
    setQuestionStates(prev => ({ ...prev, [currentQuestion.id]: { ...qs, hintsUsed: newHintsUsed } }));
    if (userId) {
      useHint({ userId, sessionId, questionId: String(currentQuestion.id), currentHintTier: qs.hintsUsed }).catch(() => {});
    }
  }, [currentQuestion, questionStates, userId, sessionId, isAudioEnabled, keysCount, getOrCreateQState]);

  // ─── REVEAL HANDLER ───────────────────────────────────────────────────────
  const handleReveal = useCallback(() => {
    if (!currentQuestion) return;
    const qs = getOrCreateQState(currentQuestion.id);
    if (qs.resolved) return;
    const threshold = getRevealThreshold(currentQuestion.type);
    if (threshold === null || qs.attempts < threshold) return;
    setQuestionStates(prev => ({ ...prev, [currentQuestion.id]: { ...qs, resolved: true, resolution: 'revealed', xpAwarded: 0 } }));
    setStreak(0);
    if (userId) {
      resolveQuestion({ userId, sessionId, questionId: String(currentQuestion.id), resolution: 'revealed', attempts: qs.attempts, hintsUsed: qs.hintsUsed }).catch(() => {});
    }
  }, [currentQuestion, questionStates, userId, sessionId, getOrCreateQState]);

  // ─── ANSWER HANDLER ───────────────────────────────────────────────────────
  const handleAnswer = useCallback((userSelection?: string) => {
    if (!currentQuestion || isSubmitting) return;
    const qs = getOrCreateQState(currentQuestion.id);
    if (qs.resolved) return;

    let userAnswer = '';
    if (currentQuestion.type === 'fill-in-blank') {
      userAnswer = textInput.trim();
      if (!userAnswer) return;
    } else {
      userAnswer = userSelection || '';
      if (!userAnswer) return;
    }

    setIsSubmitting(true);
    const newAttempts = qs.attempts + 1;

    let correct = false;
    if (currentQuestion.type === 'fill-in-blank') {
      correct = userAnswer.toLowerCase().replace(/\s+/g, '') === currentQuestion.correctAnswer.toLowerCase().replace(/\s+/g, '');
    } else {
      correct = userAnswer === currentQuestion.correctAnswer;
    }

    if (correct) {
      const xp = calculateLocalXP(qs.hintsUsed, 'correct');
      setQuestionStates(prev => ({ ...prev, [currentQuestion.id]: { ...qs, attempts: newAttempts, resolved: true, resolution: 'correct', xpAwarded: xp } }));
      setTotalXP(prev => prev + xp);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(prev => Math.max(prev, newStreak));
      playSound(newStreak >= 3 ? 'streak' : 'correct', isAudioEnabled);
      setIsCorrect(true);
      setShowRoundResult(true);
      import('canvas-confetti').then(mod => {
        mod.default({ particleCount: 30, spread: 40, colors: ['#75D06A', '#6ED1CF'], origin: { y: 0.6 } });
      }).catch(() => {});
      if (userId) {
        resolveQuestion({ userId, sessionId, questionId: String(currentQuestion.id), resolution: 'correct', attempts: newAttempts, hintsUsed: qs.hintsUsed }).catch(() => {});
      }
      setTimeout(() => { setShowRoundResult(false); setIsSubmitting(false); }, 1400);
    } else {
      const newFailedOptions = [...qs.failedOptions, userAnswer];
      const updatedState = { ...qs, attempts: newAttempts, failedOptions: newFailedOptions };
      
      // Auto-reveal: if all wrong options are now exhausted (MCQ and T/F)
      let shouldAutoReveal = false;
      if (currentQuestion.type === 'multiple-choice' && currentQuestion.options) {
        const wrongOptions = currentQuestion.options.filter(o => o !== currentQuestion.correctAnswer);
        shouldAutoReveal = wrongOptions.every(o => newFailedOptions.includes(o));
      } else if (currentQuestion.type === 'true-false') {
        // T/F only has 2 choices — 1 wrong pick means auto-reveal
        shouldAutoReveal = true;
      }

      if (shouldAutoReveal) {
        setQuestionStates(prev => ({ ...prev, [currentQuestion.id]: { ...updatedState, resolved: true, resolution: 'revealed', xpAwarded: 0 } }));
        setStreak(0);
        setHeartsCount(prev => Math.max(0, prev - 1));
        playSound('incorrect', isAudioEnabled);
        setIsSubmitting(false);
        if (userId) {
          resolveQuestion({ userId, sessionId, questionId: String(currentQuestion.id), resolution: 'revealed', attempts: newAttempts, hintsUsed: qs.hintsUsed }).catch(() => {});
        }
        return;
      }

      setQuestionStates(prev => ({ ...prev, [currentQuestion.id]: updatedState }));
      setStreak(0);
      setHeartsCount(prev => Math.max(0, prev - 1));
      playSound('incorrect', isAudioEnabled);
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 500);
      if (currentQuestion.type === 'fill-in-blank') setTextInput('');
      setIsSubmitting(false);
    }
  }, [currentQuestion, questionStates, textInput, isSubmitting, streak, userId, sessionId, isAudioEnabled, getOrCreateQState]);

  // ─── QUEUE ADVANCEMENT ────────────────────────────────────────────────────
  const advanceQueue = useCallback(() => {
    const nextIdx = queueIndex + 1;
    const unresolvedAfter = queue.slice(nextIdx).filter(q => !questionStates[q.id]?.resolved);

    if (unresolvedAfter.length === 0) {
      // Check for locked-round re-entries
      const unresolved = queue.filter(q => !questionStates[q.id]?.resolved);
      if (unresolved.length > 0) {
        setQueue(unresolved);
        setQueueIndex(0);
      } else {
        finishPhase();
      }
    } else {
      setQueueIndex(nextIdx);
    }
  }, [queueIndex, queue, questionStates]);

  // ─── FINISH PHASE ─────────────────────────────────────────────────────────
  const finishPhase = useCallback(() => {
    const phaseQuestions = phaseGroups[currentPhaseIdx] || [];
    let xpEarned = 0, correct = 0, revealed = 0;
    const struggles: string[] = [];
    phaseQuestions.forEach(q => {
      const qs = questionStates[q.id];
      if (!qs) return;
      xpEarned += qs.xpAwarded;
      if (qs.resolution === 'correct') correct++;
      if (qs.resolution === 'revealed') revealed++;
      if (qs.attempts >= STRUGGLE_THRESHOLD) struggles.push(lessonTitle);
    });
    const result: RoundResult = { phase: PHASE_IDS[currentPhaseIdx], questionsCorrect: correct, questionsRevealed: revealed, xpEarned, struggleTopics: [...new Set(struggles)] };
    setCurrentRoundResult(result);
    setRoundResults(prev => [...prev, result]);
    if (currentPhaseIdx >= totalPhases - 1) {
      setQuizState('complete');
      playSound('complete', isAudioEnabled);
    } else {
      setQuizState('phase-complete');
      setPhaseConfettiFired(false);
    }
  }, [currentPhaseIdx, totalPhases, phaseGroups, questionStates, lessonTitle, isAudioEnabled]);

  // ─── ADVANCE TO NEXT PHASE ────────────────────────────────────────────────
  const advanceToNextPhase = useCallback(async () => {
    const nextPhaseIdx = currentPhaseIdx + 1;
    if (nextPhaseIdx >= totalPhases) { setQuizState('complete'); return; }
    setQuizState('loading-next');

    // Collect retry questions from current phase (revealed = retry in next phase)
    const currentPhaseQs = phaseGroups[currentPhaseIdx] || [];
    const retryQuestions = currentPhaseQs.filter(q => {
      const qs = questionStates[q.id];
      return qs?.resolution === 'revealed';
    });

    let nextQuestions = [...phaseGroups[nextPhaseIdx], ...retryQuestions];

    // Shadow retry injection for struggle topics
    const struggles = currentRoundResult?.struggleTopics || [];
    if (struggles.length > 0 && userId) {
      try {
        const result = await fetchShadowRetries({ userId, sessionId, struggleTopics: struggles, subject, count: Math.min(2, struggles.length) });
        if (result.variants?.length) {
          nextQuestions = [...nextQuestions, ...result.variants.map(v => ({
            id: v.id, type: v.type as Question['type'], question: v.question,
            options: v.options, correctAnswer: v.correctAnswer, explanation: v.explanation || '', hints: v.hints || [],
          }))];
        }
      } catch {}
    }

    setCurrentPhaseIdx(nextPhaseIdx);
    setQueue(nextQuestions);
    setQueueIndex(0);
    // Reset question states for retry questions so they can be answered again
    const resetStates = { ...questionStates };
    retryQuestions.forEach(q => { delete resetStates[q.id]; });
    setQuestionStates(resetStates);
    setQuizState('playing');
  }, [currentPhaseIdx, totalPhases, phaseGroups, currentRoundResult, questionStates, userId, sessionId, subject]);

  // ─── COMPLETE SESSION ─────────────────────────────────────────────────────
  const handleCompleteSession = useCallback(async () => {
    const allResults = questions.map(q => {
      const qs = questionStates[q.id];
      return { questionId: String(q.id), resolution: (qs?.resolution || 'correct') as 'correct' | 'revealed', attempts: qs?.attempts || 1, hintsUsed: qs?.hintsUsed || 0, topic: lessonTitle };
    });
    let serverXP = totalXP;
    if (userId) {
      try { const r = await completeSession({ userId, sessionId, questionResults: allResults }); serverXP = r.totalXP; } catch {}
    }
    const totalCorrect = Object.values(questionStates).filter(qs => qs.resolution === 'correct').length;
    onComplete(Math.round((totalCorrect / questions.length) * 100), serverXP);
  }, [questions, questionStates, totalXP, userId, sessionId, lessonTitle, onComplete]);

  // ─── Enter key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && currentQuestion?.type === 'fill-in-blank' && textInput.trim()) handleAnswer();
    };
    window.addEventListener('keypress', handleKey);
    return () => window.removeEventListener('keypress', handleKey);
  }, [handleAnswer, currentQuestion, textInput]);

  // Fire confetti on phase-complete screen
  useEffect(() => {
    if ((quizState === 'phase-complete' || quizState === 'complete') && !phaseConfettiFired) {
      setPhaseConfettiFired(true);
      import('canvas-confetti').then(mod => {
        // First burst
        mod.default({ particleCount: 100, spread: 80, colors: ['#9956DE', '#75D06A', '#6ED1CF', '#FFD700', '#FF6B6B'], origin: { y: 0.35 } });
        // Second burst delayed
        setTimeout(() => mod.default({ particleCount: 60, spread: 100, colors: ['#9956DE', '#75D06A', '#FFD700'], origin: { y: 0.5, x: 0.3 } }), 300);
        setTimeout(() => mod.default({ particleCount: 60, spread: 100, colors: ['#6ED1CF', '#FF6B6B', '#FFD700'], origin: { y: 0.5, x: 0.7 } }), 600);
      }).catch(() => {});
    }
  }, [quizState, phaseConfettiFired]);


  // ─── RENDER: Full-Page Phase Complete Screen ──────────────────────────────
  if (quizState === 'phase-complete' && currentRoundResult) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-[#e8e0f7] via-[#f0e8ff] to-[#ddd6f3] p-6">
        {/* Floating math shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[Triangle, Circle, Square, Divide, Percent, Sigma].map((Icon, i) => (
            <motion.div
              key={i}
              className="absolute text-purple-300/30"
              style={{ top: `${10 + (i * 14) % 80}%`, left: `${5 + (i * 18) % 85}%` }}
              animate={{ y: [0, -15, 0], rotate: [0, 360] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
            >
              <Icon size={28 + (i % 3) * 12} />
            </motion.div>
          ))}
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-200 opacity-20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-200 opacity-20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="relative z-10 flex flex-col items-center text-center max-w-sm w-full"
        >
          <motion.img
            src="/mascot/modules_avatar.png"
            alt="Mascot"
            className="w-36 h-36 sm:w-44 sm:h-44 mb-6 drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)]"
            initial={{ y: -20 }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          <h1 className="text-3xl sm:text-4xl font-black text-[#5b3a9e] mb-2 drop-shadow-sm">
            Phase {currentPhaseIdx + 1} Complete!
          </h1>
          <p className="text-purple-500/70 text-sm mb-6">Great work! Keep going.</p>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 w-full mb-6 border border-purple-200/50 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Check size={14} className="text-emerald-500" /> Correct
              </span>
              <span className="text-lg font-black text-emerald-600">{currentRoundResult.questionsCorrect}</span>
            </div>
            {currentRoundResult.questionsRevealed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle size={14} className="text-amber-500" /> Revealed
                </span>
                <span className="text-lg font-black text-amber-600">{currentRoundResult.questionsRevealed}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-purple-100">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Zap size={14} className="text-purple-500" /> XP Earned
              </span>
              <span className="text-xl font-black text-purple-600">+{currentRoundResult.xpEarned}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: totalPhases }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all ${i <= currentPhaseIdx ? 'bg-purple-500 shadow-[0_0_8px_rgba(153,86,222,0.6)]' : 'bg-purple-200'}`} />
            ))}
          </div>

          <button
            onClick={advanceToNextPhase}
            className="w-full py-4 rounded-full bg-[#9956DE] hover:bg-[#8544c7] text-white font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-transform mb-3"
          >
            Continue to Next Phase <ArrowRight size={20} className="inline ml-2" />
          </button>

          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="text-purple-400 hover:text-purple-600 text-sm font-bold transition-colors"
          >
            Quit Quiz
          </button>
        </motion.div>

        {showLeaveConfirm && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-xs w-full shadow-2xl flex flex-col gap-4 text-center">
              <h2 className="text-xl font-black text-slate-800">Are you sure you want to leave?</h2>
              <p className="text-sm text-slate-500">Your progress won't be saved.</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => setShowLeaveConfirm(false)} className="w-full py-3 rounded-full bg-[#9956DE] hover:bg-[#8544c7] text-white font-bold">Stay</Button>
                <Button onClick={onBack} className="w-full py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">Leave</Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: Loading Next Phase ───────────────────────────────────────────
  if (quizState === 'loading-next') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-[#7274ED] via-[#9956DE] to-[#7274ED]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-white text-lg">Preparing next phase...</p>
        </div>
      </div>
    );
  }

  // ─── RENDER: Complete Screen ──────────────────────────────────────────────
  if (quizState === 'complete') {
    const totalCorrect = Object.values(questionStates).filter(qs => qs.resolution === 'correct').length;
    const totalRevealed = Object.values(questionStates).filter(qs => qs.resolution === 'revealed').length;
    const scorePercent = Math.round((totalCorrect / questions.length) * 100);

    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-[#e8e0f7] via-[#f0e8ff] to-[#ddd6f3] p-6">
        {/* Floating math shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[Triangle, Circle, Square, Divide, Percent, Sigma, Ruler, Target].map((Icon, i) => (
            <motion.div
              key={i}
              className="absolute text-purple-300/25"
              style={{ top: `${8 + (i * 12) % 80}%`, left: `${3 + (i * 13) % 90}%` }}
              animate={{ y: [0, -12, 0], rotate: [0, 360] }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
            >
              <Icon size={24 + (i % 4) * 10} />
            </motion.div>
          ))}
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-200 opacity-20 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-200 opacity-20 rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl" />
        </div>

        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
          <motion.img src="/mascot/modules_avatar.png" alt="Mascot" className="w-36 h-36 sm:w-44 sm:h-44 mb-6 drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)]" initial={{ y: -20 }} animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
          <h1 className="text-3xl sm:text-4xl font-black text-[#5b3a9e] mb-2">Quiz Complete!</h1>
          <p className="text-purple-500/70 text-sm mb-6">{lessonTitle}</p>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 w-full mb-6 border border-purple-200/50 shadow-lg space-y-3">
            <AnimatedResultRow label="Score" value={scorePercent} suffix="%" icon={<Star size={14} className="text-purple-500" />} delay={0} />
            <AnimatedResultRow label="Correct" value={totalCorrect} suffix={`/${questions.length}`} icon={<Check size={14} className="text-emerald-500" />} delay={200} />
            {totalRevealed > 0 && <AnimatedResultRow label="Revealed" value={totalRevealed} icon={<HelpCircle size={14} className="text-amber-500" />} delay={400} />}
            <AnimatedResultRow label="Best Streak" value={maxStreak} icon={<Flame size={14} className="text-orange-500" />} delay={600} />
            <div className="pt-2 border-t border-purple-100">
              <AnimatedResultRow label="Total XP" value={totalXP} prefix="+" icon={<Zap size={14} className="text-purple-500" />} delay={800} large />
            </div>
          </div>

          <button onClick={handleCompleteSession} className="w-full py-4 rounded-full bg-[#9956DE] hover:bg-[#8544c7] text-white font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-transform">
            FINISH
          </button>
        </motion.div>
      </div>
    );
  }


  // ─── RENDER: Playing UI (matches InteractiveLesson design) ────────────────
  const qs = currentQuestion ? getOrCreateQState(currentQuestion.id) : null;
  const revealThreshold = currentQuestion ? getRevealThreshold(currentQuestion.type) : null;
  const revealUnlocked = revealThreshold !== null && (qs?.attempts ?? 0) >= revealThreshold;
  const revealDisabled = revealThreshold === null || !revealUnlocked;
  const explainLocked = !(qs?.resolved);
  const hintsAvailable = currentQuestion?.hints?.length ?? 0;
  const hintsRemaining = hintsAvailable - (qs?.hintsUsed ?? 0);
  const phaseQuestions = phaseGroups[currentPhaseIdx] || [];
  const resolvedCount = phaseQuestions.filter(q => questionStates[q.id]?.resolved).length;

  if (!currentQuestion) return null;

  return (
    <>
      {/* Calculator Portal */}
      {showCalculator && createPortal(
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="fixed right-6 top-1/2 -translate-y-1/2 z-[9999] w-64">
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-2 px-1">
              <h4 className="text-xs font-bold text-[#0a1628] flex items-center gap-2"><Calculator size={14} className="text-purple-600" /> Calculator</h4>
              <button onClick={() => setShowCalculator(false)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"><X size={12} /></button>
            </div>
            <ScientificCalculator isOpen={true} onClose={() => setShowCalculator(false)} inline />
          </div>
        </motion.div>,
        document.getElementById('modal-root')!
      )}

      {/* Round Result Overlay */}
      <AnimatePresence>
        {showRoundResult && (
          <motion.div
            key="round-result"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none flex flex-col items-center justify-center"
          >
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.15)] flex flex-col items-center min-w-[280px] md:min-w-[320px]">
              <img src="/mascot/modules_avatar.png" alt="Mascot" className="w-24 h-24 md:w-32 md:h-32 mb-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]" />
              <h2 className={`text-3xl md:text-4xl font-black mb-4 uppercase tracking-widest ${isCorrect ? "text-emerald-500" : "text-rose-500"}`}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </h2>
              {isCorrect ? (
                <div className="flex flex-col items-center gap-3 w-full justify-center">
                  <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full font-bold border border-emerald-500/30">
                    <span>+ {qs?.xpAwarded ?? 10} XP</span>
                  </div>
                  {streak >= 3 && (
                    <div className="flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-500/30">
                      <Flame size={14} /> Streak ×{streak}!
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold px-5 py-2 rounded-xl text-center">
                  Correct: {currentQuestion.correctAnswer}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLeaveConfirm(false)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-xs w-full shadow-2xl flex flex-col gap-4 text-center">
              <h2 className="text-xl font-black text-slate-800">Are you sure you want to leave?</h2>
              <p className="text-sm text-slate-500">Your progress won't be saved.</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => setShowLeaveConfirm(false)} className="w-full py-3 rounded-full bg-[#9956DE] hover:bg-[#8544c7] text-white font-bold">Stay</Button>
                <Button onClick={() => { setShowLeaveConfirm(false); onBack(); }} className="w-full py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">Leave</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-50 h-screen w-full flex flex-col bg-slate-50 overflow-hidden">
        {/* ─── Sticky Header ─────────────────────────────────────────────── */}
        <header className={`relative shrink-0 flex flex-col items-center justify-start px-4 pt-4 sm:pt-6 pb-6 z-[60] shadow-md overflow-hidden ${theme.gradient} rounded-b-[32px] sm:rounded-b-[40px] min-h-[110px] sm:min-h-[130px]`}>
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
            {TopicIcons.map((Icon, i) => (
              <div key={i} className="absolute text-white/10" style={{ top: `${10 + (i * 15)}%`, left: `${10 + (i * 25) % 80}%`, transform: `rotate(${i * 45}deg) scale(${1 + (i % 3) * 0.2})` }}>
                <Icon size={48 + (i % 2) * 32} />
              </div>
            ))}
          </div>

          <div className="w-full max-w-7xl flex items-start justify-between relative z-10 mb-4 sm:mb-6">
            <div className="flex-1 pointer-events-none" />
            <div className="relative flex items-center justify-center bg-purple-900/40 backdrop-blur-md px-6 sm:px-8 py-3 rounded-full border border-white/10 gap-3 sm:gap-4 shadow-inner">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-400 shrink-0 shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
              <div className="flex flex-col items-start justify-center">
                <span className="text-[10px] sm:text-[11px] font-black text-purple-200 uppercase tracking-widest leading-none mb-1">Try It Yourself!</span>
                <span className="font-bold text-white tracking-wide text-base sm:text-lg leading-none truncate max-w-[200px] sm:max-w-[300px]">{lessonTitle}</span>
              </div>
            </div>
            <div className="flex-1 flex justify-end gap-2 sm:gap-3 relative pointer-events-auto">
              <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button onClick={toggleFullscreen} className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
              <button onClick={() => setShowLeaveConfirm(true)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="w-full max-w-[50rem] flex items-center justify-center px-4 z-10">
            <div className="w-full flex items-center gap-2 sm:gap-3">
              {phaseQuestions.map((q, i) => (
                <div key={q.id} className={`h-1.5 sm:h-2 rounded-full flex-1 transition-all ${questionStates[q.id]?.resolved ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>
        </header>

        {/* ─── Stats Bar ─────────────────────────────────────────────────── */}
        <div className="w-full max-w-[54rem] mx-auto shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 z-[50] relative mt-4">
          <div className="flex items-center justify-center gap-3 sm:gap-5 flex-1">
            {/* Hearts */}
            <div className="flex items-center gap-2 sm:gap-3 px-8 sm:px-10 py-2 rounded-full bg-white shadow-md border border-slate-200/60 text-rose-500 font-extrabold text-sm sm:text-base">
              <img src="/icons/quiz_heart.png" alt="Hearts" className="w-5 h-5 object-contain" />
              {heartsCount}
            </div>
            {/* Keys */}
            <div className="flex items-center gap-2 sm:gap-3 px-8 sm:px-10 py-2 rounded-full bg-white shadow-md border border-slate-200/60 text-yellow-500 font-extrabold text-sm sm:text-base">
              <img src="/icons/quiz_key.png" alt="Keys" className="w-5 h-5 object-contain" />
              {keysCount}
            </div>
            {/* Streak/Points */}
            <div className="flex items-center gap-3 sm:gap-4 px-3 py-1.5 pl-5 sm:pl-6 rounded-full bg-white shadow-md border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-orange-500 font-extrabold text-sm sm:text-base">
                <img src="/icons/quiz_streak.png" alt="Streak" className="w-5 h-5 object-contain" /> {streak}
              </div>
              <div className="bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full font-bold text-sm sm:text-base shadow-inner border border-emerald-200/50">
                + {totalXP} XP
              </div>
            </div>
          </div>
        </div>

        {/* ─── Scrollable Content ────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 pt-0 pb-6 flex flex-col items-center relative z-10">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={shakeCard ? { x: [-10, 10, -10, 10, 0], scale: [1, 1.01, 1], opacity: 1 } : { opacity: 1, x: 0 }}
            className="w-full max-w-3xl flex flex-col mt-2"
          >
            {/* Question Card */}
            <div className="bg-white rounded-3xl shadow-lg border-t-[6px] border-purple-500 p-6 sm:p-8 text-center flex flex-col items-center mb-6 w-full relative overflow-hidden">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a1628] leading-tight w-full">
                {currentQuestion.question}
              </h2>
              {/* Fill-in-blank inline input */}
              {currentQuestion.type === 'fill-in-blank' && !qs?.resolved && (
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Type your answer..."
                  disabled={qs?.resolved || isSubmitting}
                  className="mt-4 w-full max-w-xs mx-auto px-4 py-3 border-b-4 border-[#7C3AED] text-center text-lg font-bold outline-none bg-transparent focus:border-[#75D06A] transition-colors"
                />
              )}
              {currentQuestion.type === 'fill-in-blank' && qs?.resolved && (
                <div className="mt-4 px-4 py-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-700 font-bold text-lg">
                  {currentQuestion.correctAnswer}
                </div>
              )}
            </div>

            {/* Options Grid */}
            <div className="w-full flex flex-col items-center">
              {(currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                  {(currentQuestion.type === 'true-false' ? [{ id: 'tf-true', text: 'True' }, { id: 'tf-false', text: 'False' }] : shuffledOptions).map((opt) => {
                    const optionText = opt.text;
                    const isFailed = qs?.failedOptions.includes(optionText);
                    const isRevealed = qs?.resolved && qs.resolution === 'revealed';
                    const isAnsweredCorrect = qs?.resolved && qs.resolution === 'correct';
                    const isCorrectOption = optionText === currentQuestion.correctAnswer;

                    let bgColor = 'bg-white hover:bg-slate-50 border-transparent text-slate-700 hover:border-slate-200';
                    if (isRevealed || isAnsweredCorrect) {
                      if (isCorrectOption) bgColor = 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-[1.02] z-10';
                      else if (isFailed) bgColor = 'bg-rose-50 border-rose-400 text-rose-800 opacity-60';
                      else bgColor = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                    } else if (isFailed) {
                      bgColor = 'bg-rose-50 border-rose-400 text-rose-800 opacity-60';
                    } else if (selectedOption === opt.id) {
                      bgColor = 'bg-purple-50 border-[#9956DE] text-[#9956DE]';
                    }

                    return (
                      <button
                        key={opt.id}
                        disabled={qs?.resolved || isFailed || isSubmitting}
                        onClick={() => {
                          if (qs?.resolved || isSubmitting || isFailed) return;
                          setSelectedOption(opt.id);
                          handleAnswer(optionText);
                        }}
                        className={`p-4 sm:p-5 rounded-2xl shadow-sm border-[3px] font-extrabold text-base sm:text-lg text-left transition-all flex items-center justify-between ${bgColor} ${qs?.resolved ? 'cursor-default' : 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}`}
                      >
                        <span className="truncate pr-4">{optionText}</span>
                        {(isRevealed || isAnsweredCorrect) && isCorrectOption && <Check size={24} className="text-emerald-500 shrink-0" />}
                        {isFailed && <X size={24} className="text-rose-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Hint Panel */}
              {showHintPanel && currentQuestion.hints && (qs?.hintsUsed ?? 0) > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full mt-6 max-w-3xl">
                  <div className="border-2 rounded-2xl p-5 bg-amber-50 border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb size={18} className="text-amber-500" />
                      <span className="font-bold text-amber-700 text-sm">Hints ({qs?.hintsUsed}/{hintsAvailable})</span>
                    </div>
                    <div className="space-y-2">
                      {currentQuestion.hints.slice(0, qs?.hintsUsed ?? 0).map((hint, i) => (
                        <p key={i} className="text-sm text-amber-800 leading-relaxed">
                          <span className="font-bold text-amber-600">{i + 1}.</span> {hint}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Explain Panel */}
              {showExplainPanel && qs?.resolved && currentQuestion.explanation && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full mt-6 max-w-3xl">
                  <div className="border-2 rounded-2xl p-5 flex items-start gap-4 bg-sky-50 border-sky-200">
                    <img src="/mascot/modules_avatar.png" className="w-10 h-10 shrink-0" alt="AI Explain" />
                    <div>
                      <p className="font-extrabold text-lg mb-1 text-sky-700">Explanation</p>
                      <p className="text-base leading-relaxed text-sky-800">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </main>

        {/* ─── Sticky Footer ─────────────────────────────────────────────── */}
        <footer className={`shrink-0 relative z-[60] flex flex-col items-center justify-center p-4 sm:p-6 ${theme.gradient} rounded-t-[32px] sm:rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)]`}>
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
            {TopicIcons.slice(0, 3).map((Icon, i) => (
              <div key={i} className="absolute text-white" style={{ top: `${20 + (i * 20)}%`, left: `${20 + (i * 30)}%`, transform: `rotate(${i * 30}deg) scale(1.5)` }}>
                <Icon size={32} />
              </div>
            ))}
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            {(() => {
              // After resolved: show Explain + Next Question
              if (qs?.resolved) {
                if (showExplainPanel) {
                  return (
                    <button onClick={advanceQueue} className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all w-full">
                      Next Question <ArrowRight size={24} />
                    </button>
                  );
                }
                return (
                  <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                    <button onClick={() => { if (!explainLocked) setShowExplainPanel(true); }} disabled={explainLocked} className="bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                      <img src="/mascot/modules_avatar.png" className="w-5 h-5 drop-shadow-sm" alt="Explain" />
                      Explain
                    </button>
                    <button onClick={advanceQueue} className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-lg px-8 py-3 sm:py-3.5 rounded-full flex items-center justify-center gap-2 shadow-xl hover:scale-105 active:scale-95">
                      Next Question <ArrowRight size={20} />
                    </button>
                  </div>
                );
              }

              // Normal state: Hint, Reveal, Explain (locked), Calculator, Submit (for fill-in-blank)
              return (
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  <button onClick={handleHint} disabled={keysCount <= 0 || hintsRemaining <= 0} className="bg-white hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                    <img src="/icons/quiz_key.png" alt="Hint" className="w-5 h-5 object-contain" />
                    Hint
                  </button>
                  <div className="relative group">
                    <button onClick={handleReveal} disabled={revealDisabled} className="bg-white hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                      <HelpCircle size={18} className="text-purple-500" />
                      Reveal
                    </button>
                    {revealDisabled && revealThreshold !== null && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-medium">
                        Reveal locked. Give it another try!
                      </div>
                    )}
                  </div>
                  <div className="relative group">
                    <button disabled className="bg-white disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg border border-slate-200">
                      <Lock size={16} className="text-slate-400" />
                      Explain
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-medium">
                      Unlocks after you complete or reveal this question
                    </div>
                  </div>
                  <button onClick={() => setShowCalculator(prev => !prev)} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200 ${showCalculator ? 'bg-purple-100 text-purple-600 border-purple-300' : 'bg-white hover:bg-slate-50 text-slate-700'}`}>
                    <Calculator size={20} />
                  </button>
                  {currentQuestion.type === 'fill-in-blank' && (
                    <button onClick={() => handleAnswer()} disabled={!textInput.trim() || isSubmitting} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-lg px-8 py-3 sm:py-3.5 rounded-full flex items-center justify-center gap-2 shadow-xl hover:scale-105 active:scale-95">
                      Submit <ArrowRight size={20} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </footer>
      </div>
    </>
  );
};

export default TryItYourselfEngine;
