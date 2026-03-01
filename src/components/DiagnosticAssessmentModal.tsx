import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Brain, CheckCircle, ChevronRight, AlertTriangle, Calculator, BarChart3, TrendingUp, X } from 'lucide-react';
import { subjects } from '../data/subjects';
import { triggerDiagnosticCompleted, DiagnosticResult } from '../services/automationService';

interface DiagnosticAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (atRiskSubjectIds: string[]) => void;
  studentId?: string;
  gradeLevel?: string;
}

// Simplified mock questions for the demo
const questions = [
  {
    id: 1,
    subjectId: 'gen-math', // Matches General Mathematics
    question: "Solve for x: 2x + 5 = 15",
    options: ["x = 5", "x = 10", "x = 2", "x = 7"],
    correct: 0 // Index
  },
  {
    id: 2,
    subjectId: 'pre-calc', // Matches Pre-Calculus
    question: "What is the center of the circle (x-2)² + (y+3)² = 16?",
    options: ["(2, 3)", "(-2, 3)", "(2, -3)", "(-2, -3)"],
    correct: 2
  },
  {
    id: 3,
    subjectId: 'stats-prob', // Matches Statistics and Probability
    question: "What is the median of the dataset: 2, 5, 8, 1, 9?",
    options: ["2", "5", "8", "1"],
    correct: 1
  },
  {
    id: 4,
    subjectId: 'basic-calc', // Matches Basic Calculus
    question: "What is the derivative of f(x) = x²?",
    options: ["x", "2x", "2", "x²"],
    correct: 1
  }
];

const DiagnosticAssessmentModal: React.FC<DiagnosticAssessmentModalProps> = ({ isOpen, onClose, onComplete, studentId, gradeLevel = 'Grade 11' }) => {
  const [step, setStep] = useState<'intro' | 'test' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]); // Store selected indices
  const [atRiskSubjects, setAtRiskSubjects] = useState<string[]>([]);
  const [automationProcessing, setAutomationProcessing] = useState(false);

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setAtRiskSubjects([]);
    }
  }, [isOpen]);

  // Escape key handler
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onComplete([]);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onComplete]);

  const handleStart = () => {
    setStep('test');
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 300);
    } else {
      calculateResults(newAnswers);
    }
  };

  const calculateResults = async (finalAnswers: number[]) => {
    const riskList: string[] = [];

    // Build per-subject scores (0 or 100 for single-question diagnostic)
    const subjectScores: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, index) => {
      const isCorrect = finalAnswers[index] === q.correct;
      if (!subjectScores[q.subjectId]) subjectScores[q.subjectId] = { correct: 0, total: 0 };
      subjectScores[q.subjectId].total += 1;
      if (isCorrect) subjectScores[q.subjectId].correct += 1;
      if (!isCorrect) riskList.push(q.subjectId);
    });

    setAtRiskSubjects(riskList);
    setStep('results');

    // Fire automation pipeline if studentId is available
    if (studentId) {
      setAutomationProcessing(true);
      try {
        const diagnosticResults: DiagnosticResult[] = Object.entries(subjectScores).map(
          ([subject, data]) => ({
            subject,
            score: Math.round((data.correct / data.total) * 100),
          })
        );

        // Build question breakdown for weak-topic analysis
        const questionBreakdown: Record<string, { correct: boolean }[]> = {};
        questions.forEach((q, index) => {
          if (!questionBreakdown[q.subjectId]) questionBreakdown[q.subjectId] = [];
          questionBreakdown[q.subjectId].push({ correct: finalAnswers[index] === q.correct });
        });

        await triggerDiagnosticCompleted(studentId, diagnosticResults, gradeLevel, questionBreakdown);
        console.log('[OK] Automation: diagnostic pipeline completed');
      } catch (err) {
        console.error('[WARN] Automation: diagnostic pipeline failed:', err);
      } finally {
        setAutomationProcessing(false);
      }
    }
  };

  const handleComplete = () => {
    onComplete(atRiskSubjects);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => {
        onComplete([]);
        onClose();
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
              <h2 className="text-xl font-bold text-[#0a1628]">Diagnostic Assessment</h2>
              <p className="text-sm text-[#5a6578]">Analyze your strengths & weaknesses</p>
            </div>
          </div>
          <button
            onClick={() => {
              onComplete([]);
              onClose();
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#5a6578] hover:bg-[#dde3eb] transition-colors"
            title="Skip assessment"
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
                
                <h3 className="text-2xl font-bold text-[#0a1628]">Welcome to MathPulse!</h3>
                <p className="text-[#5a6578] max-w-md mx-auto leading-relaxed">
                  To personalize your learning experience, let's take a quick diagnostic test. 
                  This helps us identify which subjects you might need extra support with.
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
                      <AlertTriangle size={16} className="text-amber-500" />
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
                    Start Assessment
                  </Button>
                  <button
                    onClick={() => {
                      onComplete([]);
                      onClose();
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
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span>{Math.round(((currentQuestionIndex) / questions.length) * 100)}% Completed</span>
                </div>
                <div className="h-2 bg-[#edf1f7] rounded-full overflow-hidden mb-8">
                  <motion.div 
                    className="h-full bg-sky-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
                  />
                </div>

                <div className="bg-[#edf1f7] p-6 rounded-2xl border border-[#dde3eb] mb-6">
                  <h3 className="text-xl font-bold text-[#0a1628] leading-relaxed">
                    {questions[currentQuestionIndex].question}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {questions[currentQuestionIndex].options.map((option, idx) => (
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
                  We've analyzed your results. Here's what we found:
                </p>

                <div className="bg-[#edf1f7] rounded-2xl p-6 border border-[#dde3eb] text-left space-y-4">
                  <h4 className="font-bold text-[#0a1628] flex items-center gap-2">
                    <BarChart3 size={18} className="text-sky-600" />
                    Subject Analysis
                  </h4>
                  
                  <div className="space-y-3">
                    {questions.map((q, idx) => {
                      const isCorrect = answers[idx] === q.correct;
                      // Find Subject Name (Mock mapping)
                      const subjectName = 
                        q.subjectId === 'gen-math' ? 'General Mathematics' :
                        q.subjectId === 'pre-calc' ? 'Pre-Calculus' :
                        q.subjectId === 'stats-prob' ? 'Statistics and Probability' : 'Basic Calculus';
                      
                      return (
                        <div key={q.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#dde3eb]">
                          <span className="font-medium text-[#0a1628]">{subjectName}</span>
                          {isCorrect ? (
                            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg flex items-center gap-1">
                              <TrendingUp size={12} /> Strong
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1">
                              <AlertTriangle size={12} /> Needs Focus
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {atRiskSubjects.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-left">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h5 className="font-bold text-amber-800 text-sm">Attention Needed</h5>
                      <p className="text-amber-700 text-xs mt-1">
                        We've marked {atRiskSubjects.length} subject{atRiskSubjects.length > 1 ? 's' : ''} as "At Risk". 
                        Look for the warning icons in your dashboard to prioritize these modules.
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