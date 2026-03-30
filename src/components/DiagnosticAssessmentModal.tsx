import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Brain, CheckCircle, ChevronRight, AlertTriangle, Calculator, BarChart3, TrendingUp, X } from 'lucide-react';
import { triggerDiagnosticCompleted, DiagnosticResult, IARWorkflowMode } from '../services/automationService';
import {
  IAR_BLUEPRINT_VERSION,
  IAR_QUESTION_BLUEPRINT,
  IARTopicArea,
  IARQuestionBlueprint,
  classifyTopicScore,
  getDepEdIARQuestionBlueprint,
  estimateIarDurationMinutes,
} from '../data/iarBlueprint';

interface DiagnosticAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (payload: DiagnosticCompletionPayload) => void;
  lrn?: string;
  gradeLevel?: string;
  workflowMode?: IARWorkflowMode;
  assessmentType?: 'initial_assessment' | 'followup_diagnostic';
}

type AnswerValue = number | string | null;

interface TopicScoreSummary {
  correct: number;
  total: number;
  scorePercent: number;
  classification: 'Mastered' | 'NeedsReview' | 'HighRisk';
}

interface G12ReadinessIndicators {
  readyForFiniteMath: boolean;
  readyForAdvancedStats: boolean;
  readyForCalcIntro: boolean;
  needsStrongerFunctions: boolean;
  needsStrongerBusinessMath: boolean;
}

export interface DiagnosticCompletionPayload {
  status: 'completed' | 'skipped';
  atRiskSubjectIds: string[];
  topicScores?: Record<IARTopicArea, number>;
  topicClassifications?: Record<IARTopicArea, TopicScoreSummary['classification']>;
  priorityTopics?: IARTopicArea[];
  g12ReadinessIndicators?: G12ReadinessIndicators;
  questionSetVersion: string;
}

const TOPIC_LABELS: Record<IARTopicArea, string> = {
  Functions: 'Functions and Graphs',
  BusinessMath: 'Business and Financial Mathematics',
  Logic: 'Logic and Reasoning',
};

const BASE_COMPLETION_PAYLOAD: Omit<DiagnosticCompletionPayload, 'status'> = {
  atRiskSubjectIds: [],
  questionSetVersion: IAR_BLUEPRINT_VERSION,
};

const QUESTIONS = getDepEdIARQuestionBlueprint();

const normalizeText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const isCorrectAnswer = (question: IARQuestionBlueprint, answer: AnswerValue): boolean => {
  if (!question.scorable) return false;

  if (question.answerType === 'MCQ') {
    return typeof answer === 'number' && answer === question.correctOptionIndex;
  }

  if (question.answerType === 'shortAnswerNumeric') {
    if (typeof answer !== 'string') return false;
    const parsed = Number(answer);
    if (Number.isNaN(parsed)) return false;

    const tolerance = question.numericTolerance ?? 0;
    return (question.acceptableNumericAnswers || []).some((expected) =>
      Math.abs(parsed - expected) <= tolerance,
    );
  }

  if (question.answerType === 'shortAnswerText') {
    if (typeof answer !== 'string') return false;
    const normalized = normalizeText(answer);
    return (question.acceptableTextAnswers || []).some(
      (candidate) => normalizeText(candidate) === normalized,
    );
  }

  return false;
};

const classifyBadgeClass = (classification: TopicScoreSummary['classification']): string => {
  if (classification === 'Mastered') return 'text-teal-600 bg-teal-50';
  if (classification === 'NeedsReview') return 'text-amber-700 bg-amber-50';
  return 'text-red-600 bg-red-50';
};

const formatClassificationLabel = (classification: TopicScoreSummary['classification']): string => {
  if (classification === 'NeedsReview') return 'Needs Review';
  if (classification === 'HighRisk') return 'High Risk';
  return 'Mastered';
};

const DiagnosticAssessmentModal: React.FC<DiagnosticAssessmentModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  lrn,
  gradeLevel = 'Grade 11',
  workflowMode = 'iar_only',
  assessmentType = 'initial_assessment',
}) => {
  const [step, setStep] = useState<'intro' | 'test' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerValue[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [topicSummaries, setTopicSummaries] = useState<Record<IARTopicArea, TopicScoreSummary> | null>(null);
  const [g12Readiness, setG12Readiness] = useState<G12ReadinessIndicators | null>(null);
  const [atRiskSubjects, setAtRiskSubjects] = useState<string[]>([]);
  const [automationProcessing, setAutomationProcessing] = useState(false);

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setCurrentInput('');
      setTopicSummaries(null);
      setG12Readiness(null);
      setAtRiskSubjects([]);
    }
  }, [isOpen]);

  const handleSkip = () => {
    onComplete({
      status: 'skipped',
      ...BASE_COMPLETION_PAYLOAD,
    });
    onClose();
  };

  const handleDismiss = () => {
    onClose();
  };

  // Escape key handler
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleStart = () => {
    setStep('test');
  };

  const moveToNext = (newAnswers: AnswerValue[]) => {
    setAnswers(newAnswers);
    setCurrentInput('');

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 300);
    } else {
      calculateResults(newAnswers);
    }
  };

  const handleAnswer = (answerValue: AnswerValue) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerValue;
    moveToNext(newAnswers);
  };

  const handleShortAnswerSubmit = () => {
    if (!currentInput.trim()) return;
    handleAnswer(currentInput.trim());
  };

  const calculateResults = async (finalAnswers: AnswerValue[]) => {
    const riskList: string[] = [];
    const topicStats: Record<IARTopicArea, { correct: number; total: number }> = {
      Functions: { correct: 0, total: 0 },
      BusinessMath: { correct: 0, total: 0 },
      Logic: { correct: 0, total: 0 },
    };
    const confidenceByTopic: Record<IARTopicArea, number[]> = {
      Functions: [],
      BusinessMath: [],
      Logic: [],
    };

    const questionBreakdown: Record<string, Array<{
      correct: boolean;
      questionId: string;
      difficulty: string;
      gradeLevelTag: string;
      quarter: number;
      answerType: string;
    }>> = {};

    QUESTIONS.forEach((question, index) => {
      const answer = finalAnswers[index];

      if (question.answerType === 'confidenceLikert' && typeof answer === 'number') {
        confidenceByTopic[question.topicArea].push(answer + 1);
      }

      if (!question.scorable) return;

      const correct = isCorrectAnswer(question, answer);
      topicStats[question.topicArea].total += 1;
      if (correct) topicStats[question.topicArea].correct += 1;

      if (!questionBreakdown[question.topicArea]) {
        questionBreakdown[question.topicArea] = [];
      }
      questionBreakdown[question.topicArea].push({
        correct,
        questionId: question.id,
        difficulty: question.difficulty,
        gradeLevelTag: question.gradeLevel,
        quarter: question.quarter,
        answerType: question.answerType,
      });
    });

    const topicSummariesComputed = (Object.keys(topicStats) as IARTopicArea[]).reduce(
      (acc, topicArea) => {
        const { correct, total } = topicStats[topicArea];
        const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
        const classification = classifyTopicScore(scorePercent);

        if (classification !== 'Mastered') {
          riskList.push(topicArea);
        }

        acc[topicArea] = {
          correct,
          total,
          scorePercent,
          classification,
        };
        return acc;
      },
      {} as Record<IARTopicArea, TopicScoreSummary>,
    );

    const g12CandidateQuestions = QUESTIONS.filter(
      (q) => q.scorable && q.gradeLevel === 'G12Candidate',
    );
    const g12CandidateCorrect = g12CandidateQuestions.reduce((sum, question) => {
      const index = QUESTIONS.findIndex((item) => item.id === question.id);
      return sum + (isCorrectAnswer(question, finalAnswers[index]) ? 1 : 0);
    }, 0);
    const challengeRatio =
      g12CandidateQuestions.length > 0
        ? g12CandidateCorrect / g12CandidateQuestions.length
        : 1;

    const masteredCount = (Object.values(topicSummariesComputed).filter(
      (summary) => summary.classification === 'Mastered',
    ).length);
    const overallG11MasteryRatio = masteredCount / 3;

    const g12ReadinessIndicators: G12ReadinessIndicators = {
      readyForFiniteMath:
        overallG11MasteryRatio >= 0.67 &&
        topicSummariesComputed.Functions.classification !== 'HighRisk' &&
        topicSummariesComputed.BusinessMath.classification !== 'HighRisk' &&
        challengeRatio >= 0.5,
      readyForAdvancedStats:
        topicSummariesComputed.Logic.classification === 'Mastered' &&
        challengeRatio >= 0.67,
      readyForCalcIntro:
        topicSummariesComputed.Functions.classification === 'Mastered' &&
        challengeRatio >= 0.67,
      needsStrongerFunctions: topicSummariesComputed.Functions.classification !== 'Mastered',
      needsStrongerBusinessMath: topicSummariesComputed.BusinessMath.classification !== 'Mastered',
    };

    const priorityTopics = (Object.keys(topicSummariesComputed) as IARTopicArea[])
      .sort((left, right) => {
        const leftSummary = topicSummariesComputed[left];
        const rightSummary = topicSummariesComputed[right];

        const rank = (classification: TopicScoreSummary['classification']): number => {
          if (classification === 'HighRisk') return 0;
          if (classification === 'NeedsReview') return 1;
          return 2;
        };

        const classDelta = rank(leftSummary.classification) - rank(rightSummary.classification);
        if (classDelta !== 0) return classDelta;
        return leftSummary.scorePercent - rightSummary.scorePercent;
      });

    setAtRiskSubjects(riskList);
    setTopicSummaries(topicSummariesComputed);
    setG12Readiness(g12ReadinessIndicators);
    setStep('results');

    // Fire automation pipeline if LRN is available
    if (lrn) {
      setAutomationProcessing(true);
      try {
        const diagnosticResults: DiagnosticResult[] = (Object.keys(topicSummariesComputed) as IARTopicArea[]).map(
          (subject) => ({
            subject,
            score: topicSummariesComputed[subject].scorePercent,
          })
        );

        await triggerDiagnosticCompleted(
          lrn,
          diagnosticResults,
          gradeLevel,
          questionBreakdown,
          workflowMode,
          assessmentType,
        );
        console.log('[OK] Automation: diagnostic pipeline completed');
      } catch (err) {
        console.error('[WARN] Automation: diagnostic pipeline failed:', err);
      } finally {
        setAutomationProcessing(false);
      }
    }
  };

  const handleComplete = () => {
    if (!topicSummaries || !g12Readiness) {
      onComplete({
        status: 'completed',
        atRiskSubjectIds: atRiskSubjects,
        questionSetVersion: IAR_BLUEPRINT_VERSION,
      });
      onClose();
      return;
    }

    onComplete({
      status: 'completed',
      atRiskSubjectIds: atRiskSubjects,
      topicScores: {
        Functions: topicSummaries.Functions.scorePercent,
        BusinessMath: topicSummaries.BusinessMath.scorePercent,
        Logic: topicSummaries.Logic.scorePercent,
      },
      topicClassifications: {
        Functions: topicSummaries.Functions.classification,
        BusinessMath: topicSummaries.BusinessMath.classification,
        Logic: topicSummaries.Logic.classification,
      },
      priorityTopics: (Object.keys(topicSummaries) as IARTopicArea[])
        .sort((left, right) => topicSummaries[left].scorePercent - topicSummaries[right].scorePercent),
      g12ReadinessIndicators: g12Readiness,
      questionSetVersion: IAR_BLUEPRINT_VERSION,
    });
    onClose();
  };

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const completionPercent = Math.round((currentQuestionIndex / QUESTIONS.length) * 100);
  const estimatedMinutes = estimateIarDurationMinutes(QUESTIONS);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => {
        handleDismiss();
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#dde3eb] flex items-center justify-between bg-[#edf1f7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600">
              <Brain size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0a1628]">
                {assessmentType === 'followup_diagnostic' ? 'Deep Diagnostic' : 'Initial Assessment'}
              </h2>
              <p className="text-sm text-[#5a6578]">Analyze your strengths & weaknesses</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleDismiss();
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#5a6578] hover:bg-[#dde3eb] transition-colors"
            title="Close assessment"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                <div className="w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calculator size={64} className="text-sky-600" />
                </div>
                
                <h3 className="text-2xl font-bold text-[#0a1628]">
                  {assessmentType === 'followup_diagnostic' ? 'Let\'s close the gaps' : 'Welcome to MathPulse!'}
                </h3>
                <p className="text-[#5a6578] max-w-md mx-auto leading-relaxed">
                  {assessmentType === 'followup_diagnostic'
                    ? 'You have pending weak-area checks from your initial assessment. Complete this deep diagnostic to unlock regular modules and practice.'
                    : `To personalize your learning path, complete a DepEd competency-based SHS diagnostic (${QUESTIONS.length} items, around ${estimatedMinutes} minutes).`}
                </p>

                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                  <div className="bg-[#edf1f7] p-4 rounded-xl border border-[#dde3eb]">
                    <div className="flex items-center gap-2 font-bold text-[#0a1628] mb-1">
                      <CheckCircle size={16} className="text-teal-500" />
                      Personalized Path
                    </div>
                    <p className="text-xs text-[#5a6578] pl-6">Get recommendations based on your level.</p>
                  </div>
                  <div className="bg-[#edf1f7] p-4 rounded-xl border border-[#dde3eb]">
                    <div className="flex items-center gap-2 font-bold text-[#0a1628] mb-1">
                      <AlertTriangle size={16} className="text-rose-500" />
                      Identify Risks
                    </div>
                    <p className="text-xs text-[#5a6578] pl-6">Spot areas that need more attention early.</p>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    onClick={handleStart}
                    className="bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white px-8 py-6 rounded-xl text-lg font-bold shadow-lg shadow-sky-200 w-full max-w-xs mx-auto"
                  >
                    {assessmentType === 'followup_diagnostic' ? 'Start Deep Diagnostic' : 'Start Assessment'}
                  </Button>
                  <button
                    onClick={() => {
                      handleSkip();
                    }}
                    className="block mx-auto text-sm text-slate-500 hover:text-[#5a6578] transition-colors font-medium"
                  >
                    Skip for now →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'test' && (
              <motion.div
                key="test"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between text-sm font-bold text-[#5a6578] mb-2">
                  <span>Question {currentQuestionIndex + 1} of {QUESTIONS.length}</span>
                  <span>{completionPercent}% Completed</span>
                </div>
                <div className="h-2 bg-[#edf1f7] rounded-full overflow-hidden mb-8">
                  <motion.div 
                    className="h-full bg-sky-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                  />
                </div>

                <div className="bg-[#edf1f7] p-6 rounded-2xl border border-[#dde3eb] mb-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                    {TOPIC_LABELS[currentQuestion.topicArea]} • {currentQuestion.difficulty}
                  </p>
                  <h3 className="text-xl font-bold text-[#0a1628] leading-relaxed">
                    {currentQuestion.prompt}
                  </h3>
                </div>

                {(currentQuestion.answerType === 'MCQ' || currentQuestion.answerType === 'confidenceLikert') && (
                  <div className="grid grid-cols-1 gap-3">
                    {(currentQuestion.options || []).map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        className="w-full text-left p-4 rounded-xl border-2 border-[#dde3eb] hover:border-indigo-600 hover:bg-sky-50 transition-all font-medium text-[#0a1628] group flex items-center justify-between"
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-white border border-[#dde3eb] flex items-center justify-center text-sm font-bold text-[#5a6578] group-hover:border-sky-300 group-hover:text-sky-600">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {option}
                        </span>
                        <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 text-sky-600 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                {(currentQuestion.answerType === 'shortAnswerNumeric' || currentQuestion.answerType === 'shortAnswerText') && (
                  <div className="space-y-3">
                    <input
                      value={currentInput}
                      onChange={(event) => setCurrentInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleShortAnswerSubmit();
                        }
                      }}
                      className="w-full p-4 rounded-xl border-2 border-[#dde3eb] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                      placeholder={
                        currentQuestion.answerType === 'shortAnswerNumeric'
                          ? 'Type numeric answer'
                          : 'Type short answer'
                      }
                    />
                    <Button
                      onClick={handleShortAnswerSubmit}
                      disabled={!currentInput.trim()}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-bold"
                    >
                      Submit Answer
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle size={48} className="text-teal-600" />
                </div>
                
                <h3 className="text-2xl font-bold text-[#0a1628]">Assessment Completed!</h3>
                <p className="text-[#5a6578]">
                  We computed topic-level placement from your IAR responses.
                </p>

                <div className="bg-[#edf1f7] rounded-2xl p-6 border border-[#dde3eb] text-left space-y-4">
                  <h4 className="font-bold text-[#0a1628] flex items-center gap-2">
                    <BarChart3 size={18} className="text-sky-600" />
                    Topic Analysis
                  </h4>
                  
                  <div className="space-y-3">
                    {topicSummaries && (Object.keys(topicSummaries) as IARTopicArea[]).map((topic) => (
                      <div key={topic} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#dde3eb]">
                        <div>
                          <p className="font-medium text-[#0a1628]">{TOPIC_LABELS[topic]}</p>
                          <p className="text-xs text-slate-500">
                            {topicSummaries[topic].correct}/{topicSummaries[topic].total} correct • {topicSummaries[topic].scorePercent}%
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${classifyBadgeClass(topicSummaries[topic].classification)}`}>
                          {topicSummaries[topic].classification === 'Mastered' ? <TrendingUp size={12} /> : <AlertTriangle size={12} />}
                          {formatClassificationLabel(topicSummaries[topic].classification)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {g12Readiness && (
                  <div className="bg-sky-50 rounded-2xl p-6 border border-sky-100 text-left space-y-2">
                    <h4 className="font-bold text-[#0a1628]">Grade 12 Readiness Signals</h4>
                    <p className="text-xs text-slate-600">These indicators come from challenge and candidate items only.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-md font-bold ${g12Readiness.readyForFiniteMath ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                        Finite Math: {g12Readiness.readyForFiniteMath ? 'Ready' : 'Build More'}
                      </span>
                      <span className={`px-2 py-1 rounded-md font-bold ${g12Readiness.readyForAdvancedStats ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                        Advanced Stats: {g12Readiness.readyForAdvancedStats ? 'Ready' : 'Build More'}
                      </span>
                      <span className={`px-2 py-1 rounded-md font-bold ${g12Readiness.readyForCalcIntro ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                        Calculus Intro: {g12Readiness.readyForCalcIntro ? 'Ready' : 'Build More'}
                      </span>
                    </div>
                  </div>
                )}

                {atRiskSubjects.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl text-left">
                    <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h5 className="font-bold text-rose-800 text-sm">Attention Needed</h5>
                      <p className="text-rose-700 text-xs mt-1">
                        We flagged {atRiskSubjects.length} topic area{atRiskSubjects.length > 1 ? 's' : ''} for review.
                        In IAR + Diagnostic mode, focused deep diagnostics may launch before full unlock.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    onClick={handleComplete}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-4 rounded-xl text-lg font-bold w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default DiagnosticAssessmentModal;