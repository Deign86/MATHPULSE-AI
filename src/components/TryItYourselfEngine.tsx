/**
 * TryItYourselfEngine — Spec v15 Compliant Adaptive Quiz Engine
 * 
 * Implements:
 * - Phase-based progression (Foundation → Application → Complexity → Gauntlet)
 * - Locked-Round queue (wrong answers re-enter the queue)
 * - 3-tier Progressive Scaffolding hints (pre-generated, no real-time AI)
 * - Reveal ghost state (disabled until attempt threshold)
 * - Explain locked state (padlock until resolved)
 * - Brute Force Floor XP (never 0 for correct answers)
 * - Per-question attempt tracking
 * - Round summaries between phases
 * - Shadow retry injection between phases
 * - Server-side XP verification
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, ArrowRight, Trophy, Zap, HelpCircle, Lock,
  ChevronRight, BookOpen, Sparkles, Volume2, VolumeX, 
  Maximize, Minimize, Star, Award, Target, Flame, RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import confetti from 'canvas-confetti';
import ScientificCalculator from './ScientificCalculator';
import { resolveQuestion, useHint, completeSession, fetchShadowRetries } from '../services/tryItYourselfService';
import type { Question } from './InteractiveLesson';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'foundation' | 'application' | 'complexity' | 'gauntlet';
type QuizState = 'playing' | 'round-summary' | 'loading-next' | 'complete';

interface PhaseConfig {
  id: Phase;
  label: string;
  description: string;
  bloomLevels: string[];
  color: string;
}

interface QuestionState {
  questionIndex: number;
  attempts: number;
  hintsUsed: number;
  resolved: boolean;
  resolution: 'correct' | 'revealed' | null;
  selectedAnswer: string | null;
  failedOptions: string[];  // options user already tried (wrong)
  showExplanation: boolean;
}

interface RoundResult {
  phase: Phase;
  questionsAttempted: number;
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

const PHASES: PhaseConfig[] = [
  { id: 'foundation', label: 'Foundation', description: 'Remembering & Understanding', bloomLevels: ['remember', 'understand'], color: 'from-blue-500 to-cyan-500' },
  { id: 'application', label: 'Application', description: 'Applying concepts', bloomLevels: ['apply'], color: 'from-emerald-500 to-teal-500' },
  { id: 'complexity', label: 'Complexity', description: 'Spaced Repetition', bloomLevels: ['apply', 'analyze'], color: 'from-purple-500 to-indigo-500' },
  { id: 'gauntlet', label: 'The Gauntlet', description: 'Analyzing & Mastery', bloomLevels: ['analyze'], color: 'from-rose-500 to-orange-500' },
];

const XP_DECAY: Record<number, number> = { 0: 1.0, 1: 0.7, 2: 0.4, 3: 0.2 };
const BASE_XP = 10;
const BRUTE_FORCE_FLOOR = 2;
const REVEAL_UNLOCK_MCQ = 2;  // attempts before Reveal unlocks for MCQ
const REVEAL_UNLOCK_ID = 1;   // attempts before Reveal unlocks for identification
const STRUGGLE_THRESHOLD = 3;
