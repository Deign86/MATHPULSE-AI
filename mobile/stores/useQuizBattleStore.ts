import { create } from 'zustand';
import type {
  GeneratedQuestion,
  MatchFoundResult,
  BattleSubmitResult,
} from '../services/quizBattleService';
import {
  findMatch,
  cancelMatch as cancelMatchInQueue,
  submitResult,
} from '../services/quizBattleService';

export type MatchState = 'idle' | 'searching' | 'matched' | 'in-battle' | 'complete';
export type Topic = 'Algebra' | 'Geometry' | 'Calculus' | 'Statistics';

const TOPICS: Topic[] = ['Algebra', 'Geometry', 'Calculus', 'Statistics'];

export interface Opponent {
  userId: string;
  userName: string;
}

interface SubmittedAnswer {
  questionId: number;
  selectedOptionIndex: number | null;
}

interface BattleResult {
  playerScore: number;
  opponentScore: number;
  outcome: 'win' | 'loss' | 'draw';
}

interface QuizBattleState {
  matchState: MatchState;
  sessionId: string | null;
  opponent: Opponent | null;
  questions: GeneratedQuestion[];
  currentQuestionIndex: number;
  selectedTopic: Topic;
  selectedGradeLevel: number;
  answers: SubmittedAnswer[];
  result: BattleResult | null;
  error: string | null;
}

interface QuizBattleActions {
  setTopic: (topic: Topic) => void;
  setGradeLevel: (grade: number) => void;
  startMatch: (userId: string, userName: string) => void;
  cancelMatch: (userId: string) => void;
  selectAnswer: (optionIndex: number) => void;
  submitAnswer: (playerId: string) => void;
  endBattle: (playerId: string) => void;
  reset: () => void;
}

export {
  TOPICS,
};

const initialState: QuizBattleState = {
  matchState: 'idle',
  sessionId: null,
  opponent: null,
  questions: [],
  currentQuestionIndex: 0,
  selectedTopic: 'Algebra',
  selectedGradeLevel: 11,
  answers: [],
  result: null,
  error: null,
};

export const useQuizBattleStore = create<QuizBattleState & QuizBattleActions>()((set, get) => ({
  ...initialState,

  setTopic: (topic: Topic) => set({ selectedTopic: topic }),

  setGradeLevel: (grade: number) => set({ selectedGradeLevel: grade }),

  startMatch: async (userId: string, userName: string) => {
    const { selectedTopic, selectedGradeLevel } = get();

    set({ matchState: 'searching', error: null, sessionId: null, opponent: null, questions: [] });

    try {
      const result: MatchFoundResult = await findMatch(
        userId,
        userName,
        selectedGradeLevel,
        selectedTopic,
      );

      set({
        matchState: 'matched',
        sessionId: result.sessionId,
        opponent: result.opponent,
        questions: result.questions,
        currentQuestionIndex: 0,
        answers: [],
        result: null,
      });

      // Short pause then start battle
      setTimeout(() => {
        set({ matchState: 'in-battle' });
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find a match';
      set({ matchState: 'idle', error: message });
    }
  },

  cancelMatch: async (userId: string) => {
    try {
      await cancelMatchInQueue(userId);
    } catch {
      // Ignore cleanup errors
    }
    set({ matchState: 'idle', error: null });
  },

  selectAnswer: (optionIndex: number) => {
    const { currentQuestionIndex, answers } = get();

    const existing = answers.findIndex((a) => a.questionId === currentQuestionIndex);
    const newAnswer: SubmittedAnswer = {
      questionId: currentQuestionIndex,
      selectedOptionIndex: optionIndex,
    };

    if (existing >= 0) {
      const updated = [...answers];
      updated[existing] = newAnswer;
      set({ answers: updated });
    } else {
      set({ answers: [...answers, newAnswer] });
    }
  },

  submitAnswer: async (playerId: string) => {
    const { currentQuestionIndex, questions, answers, sessionId } = get();

    if (!sessionId) return;

    const currentAnswer = answers.find((a) => a.questionId === currentQuestionIndex);

    if (currentAnswer) {
      // Calculate running score so far
      const correctCount = answers.filter((a) => {
        const question = questions.find((q) => q.id === a.questionId + 1);
        if (!question || !question.options) return false;
        return question.options[a.selectedOptionIndex ?? -1] === question.correctAnswer;
      }).length;

      // Submit after each answer so RTDB stays updated
      await submitResult(
        sessionId,
        playerId,
        correctCount,
        answers.map((a) => {
          const q = questions.find((q) => q.id === a.questionId + 1);
          const selected = a.selectedOptionIndex !== null && q?.options
            ? q.options[a.selectedOptionIndex]
            : '';
          const correctAnswer = q?.correctAnswer ?? '';
          return {
            questionId: a.questionId,
            selectedAnswer: selected,
            isCorrect: selected === correctAnswer,
          };
        }),
      );
    }

    // Advance to next question or end
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      // All questions done — finalize
      const finalCorrectCount = answers.filter((a) => {
        const question = questions.find((q) => q.id === a.questionId + 1);
        if (!question) return false;
        const selected = a.selectedOptionIndex !== null && question.options
          ? question.options[a.selectedOptionIndex]
          : '';
        return selected === (question.correctAnswer ?? '');
      }).length;

      // Final submission
      await submitResult(
        sessionId,
        playerId,
        finalCorrectCount,
        answers.map((a) => {
          const q = questions.find((q) => q.id === a.questionId + 1);
          const selected = a.selectedOptionIndex !== null && q?.options
            ? q.options[a.selectedOptionIndex]
            : '';
          return {
            questionId: a.questionId,
            selectedAnswer: selected,
            isCorrect: selected === (q?.correctAnswer ?? ''),
          };
        }),
      );

      set({
        matchState: 'complete',
        result: {
          playerScore: finalCorrectCount,
          opponentScore: 0,
          outcome: 'win',
        },
      });
    } else {
      set({ currentQuestionIndex: nextIndex });
    }
  },

  endBattle: async (playerId: string) => {
    const { sessionId, questions, answers } = get();

    if (sessionId) {
      const correctCount = answers.filter((a) => {
        const question = questions.find((q) => q.id === a.questionId + 1);
        if (!question) return false;
        const selected = a.selectedOptionIndex !== null && question.options
          ? question.options[a.selectedOptionIndex]
          : '';
        return selected === (question.correctAnswer ?? '');
      }).length;

      await submitResult(
        sessionId,
        playerId,
        correctCount,
        answers.map((a) => {
          const q = questions.find((q) => q.id === a.questionId + 1);
          const selected = a.selectedOptionIndex !== null && q?.options
            ? q.options[a.selectedOptionIndex]
            : '';
          return {
            questionId: a.questionId,
            selectedAnswer: selected,
            isCorrect: selected === (q?.correctAnswer ?? ''),
          };
        }),
      );
    }

    set({
      matchState: 'complete',
      result: {
        playerScore: answers.length,
        opponentScore: 0,
        outcome: 'win',
      },
    });
  },

  reset: () => set({ ...initialState }),
}));
