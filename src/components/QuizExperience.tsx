import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, XCircle, Zap, Trophy, Target, Clock, Star, TrendingUp, Award, Flame, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: number;
  duration: string;
  xpReward: number;
  type: 'practice' | 'challenge' | 'mastery';
  completed: boolean;
  bestScore?: number;
  locked: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizExperienceProps {
  quiz: Quiz;
  onClose: () => void;
  onComplete: (score: number, xpEarned: number) => void;
}

const QuizExperience: React.FC<QuizExperienceProps> = ({ quiz, onClose, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  // Generate mock questions with correct answers mapped properly
  const [questions] = useState<QuizQuestion[]>(() => 
    Array.from({ length: quiz.questions }, (_, i) => ({
      id: `q${i + 1}`,
      question: getQuestionForSubject(quiz.subject, i),
      options: getOptionsForQuestion(quiz.subject, i),
      correctAnswer: getCorrectAnswerForQuestion(quiz.subject, i),
      explanation: getExplanationForQuestion(quiz.subject, i, quiz.difficulty)
    }))
  );

  const currentQuestion = questions[currentQuestionIndex];

  // Timer
  useEffect(() => {
    const durationInMinutes = parseInt(quiz.duration);
    setTimeRemaining(durationInMinutes * 60);

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Sound effects
  const playSound = (type: 'correct' | 'incorrect' | 'complete' | 'combo') => {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'correct':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'incorrect':
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'combo':
        oscillator.frequency.value = 1200;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
      case 'complete':
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
    }
  };

  const handleTimeUp = () => {
    setShowResults(true);
    calculateFinalScore();
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAnswers(newAnswers);

    if (isCorrect) {
      playSound('correct');
      setScore(score + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);

      // Update combo multiplier
      if (newStreak >= 5) {
        setComboMultiplier(3);
        playSound('combo');
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } else if (newStreak >= 3) {
        setComboMultiplier(2);
        playSound('combo');
      } else {
        setComboMultiplier(1);
      }
    } else {
      playSound('incorrect');
      setStreak(0);
      setComboMultiplier(1);
    }

    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Quiz complete
      setShowResults(true);
      calculateFinalScore();
    }
  };

  const calculateFinalScore = () => {
    const percentage = Math.round((score / questions.length) * 100);
    let xpEarned = quiz.xpReward;

    // Bonus XP for performance
    if (percentage >= 90) {
      xpEarned = Math.round(xpEarned * 1.5);
    } else if (percentage >= 80) {
      xpEarned = Math.round(xpEarned * 1.25);
    }

    // Bonus XP for speed (if completed with more than 50% time remaining)
    const totalTime = parseInt(quiz.duration) * 60;
    if (timeRemaining > totalTime * 0.5) {
      xpEarned = Math.round(xpEarned * 1.2);
    }

    setTotalXP(xpEarned);

    playSound('complete');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      onComplete(percentage, xpEarned);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPassing = percentage >= 70;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isPassing ? 'bg-gradient-to-br from-teal-500 to-emerald-500' : 'bg-gradient-to-br from-orange-500 to-red-500'
              }`}
            >
              {isPassing ? (
                <Trophy size={48} className="text-white" />
              ) : (
                <Target size={48} className="text-white" />
              )}
            </motion.div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {isPassing ? 'Great Job!' : 'Keep Practicing!'}
            </h2>
            <p className="text-slate-600">{quiz.title}</p>
          </div>

          {/* Score */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 mb-6">
            <div className="text-center mb-4">
              <div className="text-6xl font-bold text-blue-600 mb-2">{percentage}%</div>
              <p className="text-slate-600">Final Score</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 text-center">
                <CheckCircle size={24} className="mx-auto mb-2 text-teal-600" />
                <p className="text-2xl font-bold text-slate-800">{score}</p>
                <p className="text-xs text-slate-500">Correct</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <XCircle size={24} className="mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold text-slate-800">{questions.length - score}</p>
                <p className="text-xs text-slate-500">Incorrect</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <Zap size={24} className="mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold text-slate-800">+{totalXP}</p>
                <p className="text-xs text-slate-500">XP Earned</p>
              </div>
            </div>
          </div>

          {/* Performance Badges */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {percentage >= 90 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3">
                <Star size={20} className="text-purple-600" />
                <div>
                  <p className="font-bold text-sm text-slate-800">Perfect Score!</p>
                  <p className="text-xs text-slate-500">+50% Bonus XP</p>
                </div>
              </div>
            )}
            {timeRemaining > parseInt(quiz.duration) * 30 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                <Clock size={20} className="text-blue-600" />
                <div>
                  <p className="font-bold text-sm text-slate-800">Speed Demon</p>
                  <p className="text-xs text-slate-500">+20% Bonus XP</p>
                </div>
              </div>
            )}
            {streak >= 5 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
                <Flame size={20} className="text-orange-600" />
                <div>
                  <p className="font-bold text-sm text-slate-800">Hot Streak!</p>
                  <p className="text-xs text-slate-500">3x Combo Achieved</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-4 rounded-xl transition-all"
          >
            Continue
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{quiz.title}</h2>
              <p className="text-cyan-100 text-sm">{quiz.subject}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
              <div className="flex items-center gap-4">
                {streak > 0 && (
                  <div className="flex items-center gap-1 bg-orange-500/30 px-3 py-1 rounded-full">
                    <Flame size={16} />
                    <span className="text-sm font-bold">{streak} Streak</span>
                    {comboMultiplier > 1 && (
                      <span className="text-xs ml-1">x{comboMultiplier}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                  <Clock size={16} />
                  <span className="text-sm font-bold">{formatTime(timeRemaining)}</span>
                </div>
              </div>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <span className="text-sm font-bold">Score: {score}/{questions.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/30 px-3 py-1 rounded-full">
              <Trophy size={16} />
              <span className="text-sm font-bold">+{quiz.xpReward} XP</span>
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Question */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{currentQuestion.question}</h3>
                <p className="text-sm text-slate-500">Select the correct answer</p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === currentQuestion.correctAnswer;
                  const showCorrectness = showExplanation;

                  let bgColor = 'bg-slate-50 hover:bg-slate-100 border-slate-200';
                  if (showCorrectness) {
                    if (isCorrect) {
                      bgColor = 'bg-teal-50 border-teal-500';
                    } else if (isSelected && !isCorrect) {
                      bgColor = 'bg-red-50 border-red-500';
                    }
                  } else if (isSelected) {
                    bgColor = 'bg-blue-50 border-blue-500';
                  }

                  return (
                    <motion.button
                      key={index}
                      whileHover={!showExplanation ? { scale: 1.01 } : {}}
                      whileTap={!showExplanation ? { scale: 0.99 } : {}}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showExplanation}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${bgColor} ${
                        showExplanation ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          showCorrectness && isCorrect ? 'bg-teal-500 text-white' :
                          showCorrectness && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                          isSelected ? 'bg-blue-500 text-white' :
                          'bg-white text-slate-700'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="font-medium text-slate-800">{option}</span>
                        {showCorrectness && isCorrect && (
                          <CheckCircle size={20} className="ml-auto text-teal-600" />
                        )}
                        {showCorrectness && isSelected && !isCorrect && (
                          <XCircle size={20} className="ml-auto text-red-600" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border-2 ${
                    selectedAnswer === currentQuestion.correctAnswer
                      ? 'bg-teal-50 border-teal-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedAnswer === currentQuestion.correctAnswer
                        ? 'bg-teal-500'
                        : 'bg-blue-500'
                    }`}>
                      <Award size={18} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1">Explanation</h4>
                      <p className="text-sm text-slate-600">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {showExplanation ? (
                <span className="flex items-center gap-2">
                  <TrendingUp size={16} />
                  Keep going! You're doing great
                </span>
              ) : (
                <span>Select an answer to continue</span>
              )}
            </div>
            {showExplanation ? (
              <button
                onClick={handleNextQuestion}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all"
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className={`font-bold px-8 py-3 rounded-xl transition-all ${
                  selectedAnswer !== null
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Submit Answer
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Helper functions to generate content per subject
function getQuestionForSubject(subject: string, index: number): string {
  const questions: { [key: string]: string[] } = {
    'Pre-Calculus': [
      'What is the domain of the function f(x) = √(x - 2)?',
      'Solve for x: 2^x = 16',
      'What is the period of the function y = sin(2x)?',
      'Find the inverse of f(x) = 3x + 5',
      'What is the value of log₂(32)?',
      'Simplify: (x² - 9) / (x - 3)',
      'What is the range of f(x) = |x| - 3?',
      'If f(x) = 2x + 1 and g(x) = x², find f(g(2)).',
      'What is the amplitude of y = 3cos(x)?',
      'Solve: log₃(x) = 4',
    ],
    'General Mathematics': [
      'Simplify: (2x + 3)(x - 4)',
      'What is 15% of 240?',
      'Solve: 3x + 7 = 22',
      'What is the value of 5! (5 factorial)?',
      'Convert 0.75 to a fraction',
      'What is 25% of 360?',
      'Simplify: 12/18',
      'What is the GCD of 24 and 36?',
      'Convert 3/8 to a decimal',
      'If a shirt costs $40 and is 20% off, what is the sale price?',
      'What is 2/3 + 1/4?',
      'Calculate: 15% tip on a $80 bill',
      'Simplify: 45/60',
      'What fraction is equivalent to 0.125?',
      'If 30% of a number is 45, what is the number?',
    ],
    'Statistics and Probability': [
      'What is the probability of rolling a 6 on a fair die?',
      'Calculate the mean of: 4, 7, 9, 12, 15',
      'What is the median of: 2, 5, 8, 11, 14?',
      'In a bag with 5 red and 3 blue balls, what is P(red)?',
      'What is the range of: 10, 15, 20, 25, 30?',
      'What is the mode of: 3, 5, 5, 7, 8, 5, 9?',
      'What is the standard deviation concept?',
      'P(A) = 0.3, P(B) = 0.5, events independent. P(A and B) = ?',
      'What is the median of: 4, 7, 10, 13?',
      'How many ways can you arrange 3 books?',
    ],
    'Basic Calculus': [
      'Find the derivative of f(x) = 3x²',
      'What is the limit of (x² - 4)/(x - 2) as x → 2?',
      'Integrate: ∫ 2x dx',
      'Find f\'(x) if f(x) = 5x³ - 2x',
      'What is the derivative of sin(x)?',
      'Find the derivative of f(x) = eˣ + 3x',
      'What is ∫ cos(x) dx?',
      'Find the derivative of f(x) = ln(x)',
      'What is the limit of 1/x as x → ∞?',
      'Find f\'(x) if f(x) = x⁴ - 2x² + 1',
    ],
  };

  // Normalize subject name to match keys
  const normalizedSubject = normalizeSubjectName(subject);
  const subjectQuestions = questions[normalizedSubject] || questions['General Mathematics'];
  return subjectQuestions[index % subjectQuestions.length];
}

function normalizeSubjectName(subject: string): string {
  const lower = subject.toLowerCase();
  if (lower.includes('pre-calc') || lower.includes('pre calc') || lower.includes('precalc')) return 'Pre-Calculus';
  if (lower.includes('statistic') || lower.includes('probability')) return 'Statistics and Probability';
  if (lower.includes('calculus') && !lower.includes('pre')) return 'Basic Calculus';
  if (lower.includes('general') || lower.includes('math')) return 'General Mathematics';
  // Default fallback based on partial matches
  if (lower.includes('algebra') || lower.includes('fraction') || lower.includes('percent') || lower.includes('ratio') || lower.includes('geometry')) return 'General Mathematics';
  if (lower.includes('derivative') || lower.includes('integral') || lower.includes('limit')) return 'Basic Calculus';
  if (lower.includes('trig') || lower.includes('function') || lower.includes('log')) return 'Pre-Calculus';
  if (lower.includes('mean') || lower.includes('median') || lower.includes('data')) return 'Statistics and Probability';
  return 'General Mathematics';
}

function getOptionsForQuestion(subject: string, index: number): string[] {
  const optionSets: { [key: string]: string[][] } = {
    'Pre-Calculus': [
      ['x ≥ 2', 'x ≤ 2', 'x ≥ 0', 'All real numbers'],
      ['x = 2', 'x = 4', 'x = 8', 'x = 16'],
      ['π', '2π', 'π/2', '4π'],
      ['f⁻¹(x) = (x - 5)/3', 'f⁻¹(x) = 3x - 5', 'f⁻¹(x) = x/3 - 5', 'f⁻¹(x) = (x + 5)/3'],
      ['4', '5', '6', '7'],
      ['x + 3', 'x - 3', 'x² + 3', '(x + 3)(x - 3)'],
      ['y ≥ -3', 'y ≥ 0', 'All real numbers', 'y > -3'],
      ['9', '5', '7', '3'],
      ['1', '2', '3', '1/3'],
      ['12', '27', '64', '81'],
    ],
    'General Mathematics': [
      ['2x² - 5x - 12', '2x² + 5x - 12', '2x² - 8x + 12', '2x² - 5x + 12'],
      ['36', '32', '28', '24'],
      ['x = 5', 'x = 4', 'x = 6', 'x = 7'],
      ['120', '24', '60', '720'],
      ['3/4', '1/2', '2/3', '4/5'],
      ['90', '80', '100', '72'],
      ['2/3', '3/4', '4/6', '6/9'],
      ['12', '6', '8', '4'],
      ['0.375', '0.38', '0.35', '0.325'],
      ['$32', '$28', '$30', '$36'],
      ['11/12', '3/7', '5/6', '2/3'],
      ['$12', '$10', '$15', '$8'],
      ['3/4', '2/3', '4/5', '9/12'],
      ['1/8', '1/4', '1/5', '1/6'],
      ['150', '135', '120', '160'],
    ],
    'Statistics and Probability': [
      ['1/6', '1/3', '1/2', '2/3'],
      ['9.4', '8.5', '10.2', '7.8'],
      ['8', '9', '7', '10'],
      ['5/8', '3/8', '1/2', '2/5'],
      ['20', '15', '25', '30'],
      ['5', '3', '7', '8'],
      ['Spread of data from the mean', 'The highest value', 'The average', 'The middle value'],
      ['0.15', '0.8', '0.35', '0.2'],
      ['8.5', '7', '10', '9'],
      ['6', '3', '9', '12'],
    ],
    'Basic Calculus': [
      ['6x', '3x', '9x²', '6x²'],
      ['4', '2', '0', 'undefined'],
      ['x² + C', '2x² + C', 'x²/2 + C', '2x + C'],
      ['15x² - 2', '15x² - 2x', '5x² - 2', '15x - 2'],
      ['cos(x)', '-cos(x)', 'tan(x)', '-sin(x)'],
      ['eˣ + 3', 'eˣ + 3x', 'xeˣ + 3', 'eˣ'],
      ['sin(x) + C', '-sin(x) + C', 'tan(x) + C', '-cos(x) + C'],
      ['1/x', 'x', 'ln(x)', '-1/x²'],
      ['0', '1', '∞', 'undefined'],
      ['4x³ - 4x', '4x³ - 2x', 'x³ - 4x', '4x⁴ - 4x²'],
    ],
  };

  const normalizedSubject = normalizeSubjectName(subject);
  const subjectOptions = optionSets[normalizedSubject] || optionSets['General Mathematics'];
  return subjectOptions[index % subjectOptions.length];
}

function getCorrectAnswerForQuestion(subject: string, index: number): number {
  const correctAnswers: { [key: string]: number[] } = {
    'Pre-Calculus': [
      0, // x ≥ 2
      1, // x = 4
      0, // π
      0, // f⁻¹(x) = (x - 5)/3
      1, // 5
      0, // x + 3
      0, // y ≥ -3
      0, // 9 (f(g(2)) = f(4) = 2*4+1 = 9)
      2, // 3
      3, // 81 (3⁴ = 81)
    ],
    'General Mathematics': [
      0, // 2x² - 5x - 12
      0, // 36
      0, // x = 5
      0, // 120
      0, // 3/4
      0, // 90
      0, // 2/3
      0, // 12
      0, // 0.375
      0, // $32
      0, // 11/12
      0, // $12
      0, // 3/4
      0, // 1/8
      0, // 150
    ],
    'Statistics and Probability': [
      0, // 1/6
      0, // 9.4
      0, // 8
      0, // 5/8
      0, // 20
      0, // 5
      0, // Spread of data from the mean
      0, // 0.15
      0, // 8.5
      0, // 6
    ],
    'Basic Calculus': [
      0, // 6x
      0, // 4
      0, // x² + C
      0, // 15x² - 2
      0, // cos(x)
      0, // eˣ + 3
      0, // sin(x) + C
      0, // 1/x
      0, // 0
      0, // 4x³ - 4x
    ],
  };

  const normalizedSubject = normalizeSubjectName(subject);
  const answers = correctAnswers[normalizedSubject] || correctAnswers['General Mathematics'];
  return answers[index % answers.length];
}

function getExplanationForQuestion(subject: string, index: number, difficulty: string): string {
  const explanations: { [key: string]: string[] } = {
    'Pre-Calculus': [
      'The expression under the square root must be non-negative: x - 2 ≥ 0, so x ≥ 2.',
      'Since 2⁴ = 16, we get x = 4.',
      'The period of sin(kx) is 2π/k. Here k = 2, so period = 2π/2 = π.',
      'To find the inverse: y = 3x + 5 → x = 3y + 5 → y = (x - 5)/3.',
      'Since 2⁵ = 32, log₂(32) = 5.',
      '(x² - 9)/(x - 3) = (x+3)(x-3)/(x-3) = x + 3 (for x ≠ 3).',
      'The absolute value |x| ≥ 0 for all x, so |x| - 3 ≥ -3. The range is y ≥ -3.',
      'g(2) = 4, then f(4) = 2(4) + 1 = 9.',
      'The amplitude of y = Acos(x) is |A|. Here A = 3, so amplitude = 3.',
      'log₃(x) = 4 means 3⁴ = x, so x = 81.',
    ],
    'General Mathematics': [
      '(2x + 3)(x - 4) = 2x² - 8x + 3x - 12 = 2x² - 5x - 12',
      '15% of 240 = 0.15 × 240 = 36',
      '3x + 7 = 22 → 3x = 15 → x = 5',
      '5! = 5 × 4 × 3 × 2 × 1 = 120',
      '0.75 = 75/100 = 3/4 after simplifying by dividing both by 25',
      '25% of 360 = 0.25 × 360 = 90',
      '12/18 = (12÷6)/(18÷6) = 2/3',
      'Factors of 24: {1,2,3,4,6,8,12,24}. Factors of 36: {1,2,3,4,6,9,12,18,36}. GCD = 12',
      '3 ÷ 8 = 0.375',
      '20% off $40 = $40 × 0.80 = $32',
      '2/3 + 1/4 = 8/12 + 3/12 = 11/12',
      '15% of $80 = 0.15 × 80 = $12',
      '45/60 = (45÷15)/(60÷15) = 3/4',
      '0.125 = 125/1000 = 1/8',
      '30% × N = 45 → N = 45/0.30 = 150',
    ],
    'Statistics and Probability': [
      'A fair die has 6 outcomes, each equally likely. P(6) = 1/6.',
      'Mean = (4 + 7 + 9 + 12 + 15) / 5 = 47/5 = 9.4',
      'Sorted: 2, 5, 8, 11, 14. The middle value is 8.',
      'P(red) = 5/(5+3) = 5/8',
      'Range = max - min = 30 - 10 = 20',
      'The value 5 appears 3 times, more than any other value. Mode = 5.',
      'Standard deviation measures how spread out data points are from the mean.',
      'For independent events: P(A and B) = P(A) × P(B) = 0.3 × 0.5 = 0.15',
      'For even-count dataset {4,7,10,13}: median = (7+10)/2 = 8.5',
      '3 books can be arranged in 3! = 3 × 2 × 1 = 6 ways.',
    ],
    'Basic Calculus': [
      'Using the power rule: d/dx[3x²] = 3 × 2x = 6x',
      'Factor: (x²-4)/(x-2) = (x+2)(x-2)/(x-2) = x+2. As x→2: 2+2 = 4',
      '∫ 2x dx = 2 × x²/2 + C = x² + C',
      'f\'(x) = 5 × 3x² - 2 = 15x² - 2',
      'The derivative of sin(x) is cos(x). This is a fundamental trigonometric derivative.',
      'd/dx[eˣ + 3x] = eˣ + 3. The derivative of eˣ is eˣ and of 3x is 3.',
      '∫ cos(x) dx = sin(x) + C. Integration is the reverse of differentiation.',
      'The derivative of ln(x) is 1/x. This is a fundamental logarithmic derivative.',
      'As x → ∞, 1/x approaches 0. The function gets infinitely close to zero.',
      'f\'(x) = 4x³ - 4x using the power rule on each term.',
    ],
  };

  const normalizedSubject = normalizeSubjectName(subject);
  const subjectExplanations = explanations[normalizedSubject] || explanations['General Mathematics'];
  return subjectExplanations[index % subjectExplanations.length];
}

export default QuizExperience;
