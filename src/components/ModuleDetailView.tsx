import React, { useState } from 'react';
import { ArrowLeft, Clock, Award, Play, Lock, CheckCircle2, Circle, BookOpen, PenTool, Trophy, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import InteractiveLesson, { Question } from './InteractiveLesson';
import LessonViewer from './LessonViewer';
import { Module, Lesson, Quiz } from '../data/subjects';

interface ModuleDetailViewProps {
  module: Module;
  onBack: () => void;
  onEarnXP?: (xp: number, message: string) => void;
}

// Question banks per module/quiz topic
const quizQuestionBanks: Record<string, Question[]> = {
  // General Mathematics - Module 1: Number Systems
  'gm-1': [
    { id: 1, type: 'multiple-choice', question: 'Which of the following is a rational number?', options: ['√2', 'π', '3/4', 'e'], correctAnswer: '3/4', explanation: 'A rational number can be expressed as a fraction p/q where p and q are integers. 3/4 fits this definition.', optionExplanations: { '√2': 'Irrational — cannot be expressed as a simple fraction.', 'π': 'Irrational — its decimal never repeats or terminates.', '3/4': 'Correct! It is a ratio of two integers.', 'e': 'Irrational — Euler\'s number has a non-repeating decimal.' } },
    { id: 2, type: 'true-false', question: 'Zero is a natural number.', correctAnswer: 'False', explanation: 'In most conventions, natural numbers start from 1. Zero is a whole number but not a natural number.', optionExplanations: { 'True': 'In some conventions zero is included, but traditionally natural numbers start at 1.', 'False': 'Correct! Natural numbers typically start at 1.' } },
    { id: 3, type: 'multiple-choice', question: 'What is the result of −3 × (−4)?', options: ['12', '-12', '7', '-7'], correctAnswer: '12', explanation: 'Multiplying two negative numbers gives a positive result: (−3) × (−4) = 12.', optionExplanations: { '12': 'Correct! Negative × negative = positive.', '-12': 'Two negatives multiplied give a positive, not negative.', '7': 'This is the sum, not the product.', '-7': 'This is the negative sum, not the product.' } },
    { id: 4, type: 'fill-in-blank', question: 'The absolute value of −15 is ___', correctAnswer: '15', explanation: 'The absolute value removes the sign: |−15| = 15.' },
    { id: 5, type: 'multiple-choice', question: 'Which number is irrational?', options: ['0.5', '1/3', '√5', '−7'], correctAnswer: '√5', explanation: '√5 cannot be expressed as a ratio of integers, making it irrational.', optionExplanations: { '0.5': 'This equals 1/2, a rational number.', '1/3': 'This is a ratio of integers, so it is rational.', '√5': 'Correct! √5 is irrational.', '−7': 'This is an integer and therefore rational.' } }
  ],
  // General Mathematics - Module 2: Fractions, Decimals, Percentages
  'gm-2': [
    { id: 1, type: 'multiple-choice', question: 'What is 25% of 200?', options: ['25', '50', '75', '100'], correctAnswer: '50', explanation: '25% means 25/100. So 25/100 × 200 = 50.', optionExplanations: { '25': '25 is the percentage itself, not 25% of 200.', '50': 'Correct! 25/100 × 200 = 50.', '75': 'This would be 37.5% of 200.', '100': 'This would be 50% of 200.' } },
    { id: 2, type: 'fill-in-blank', question: 'Convert 3/4 to a percentage: ___%', correctAnswer: '75', explanation: '3/4 = 0.75, and 0.75 × 100 = 75%.' },
    { id: 3, type: 'true-false', question: '0.333... (repeating) is equal to 1/3.', correctAnswer: 'True', explanation: '0.333... is the decimal representation of 1/3.', optionExplanations: { 'True': 'Correct! 1 ÷ 3 = 0.333... repeating.', 'False': 'Actually, 0.333... repeating is exactly equal to 1/3.' } },
    { id: 4, type: 'multiple-choice', question: 'A shirt originally costs $80 and is on sale for 30% off. What is the sale price?', options: ['$24', '$50', '$56', '$60'], correctAnswer: '$56', explanation: '30% of $80 = $24 discount. Sale price = $80 − $24 = $56.', optionExplanations: { '$24': 'That is the discount amount, not the sale price.', '$50': 'This would be a 37.5% discount.', '$56': 'Correct! $80 − (30% × $80) = $80 − $24 = $56.', '$60': 'This would be a 25% discount.' } },
    { id: 5, type: 'multiple-choice', question: 'What is 0.125 as a fraction in simplest form?', options: ['1/4', '1/8', '1/5', '1/10'], correctAnswer: '1/8', explanation: '0.125 = 125/1000 = 1/8 when simplified.', optionExplanations: { '1/4': '1/4 = 0.25, not 0.125.', '1/8': 'Correct! 1/8 = 0.125.', '1/5': '1/5 = 0.2, not 0.125.', '1/10': '1/10 = 0.1, not 0.125.' } }
  ],
  // General Mathematics - Module 3: Ratio, Proportion, Variation
  'gm-3': [
    { id: 1, type: 'multiple-choice', question: 'If the ratio of boys to girls is 3:5 and there are 40 students, how many boys are there?', options: ['15', '20', '24', '25'], correctAnswer: '15', explanation: 'Total parts = 3+5 = 8. Boys = (3/8) × 40 = 15.', optionExplanations: { '15': 'Correct! 3 out of 8 parts × 40 = 15.', '20': 'This would be half of 40, not the 3:5 ratio.', '24': '24/40 = 3/5, but the ratio is 3:5, meaning 3 out of 8 total parts.', '25': '25 is 5/8 of 40, which is the number of girls.' } },
    { id: 2, type: 'fill-in-blank', question: 'If 4 pencils cost $2, then 10 pencils cost $___', correctAnswer: '5', explanation: 'Unit price = $2/4 = $0.50 per pencil. 10 × $0.50 = $5.' },
    { id: 3, type: 'true-false', question: 'In direct variation, when one variable doubles the other also doubles.', correctAnswer: 'True', explanation: 'Direct variation means y = kx. If x doubles, y doubles too.', optionExplanations: { 'True': 'Correct! In y = kx, doubling x doubles y.', 'False': 'In direct variation y = kx, the variables change proportionally.' } },
    { id: 4, type: 'multiple-choice', question: 'Simplify the ratio 18:24.', options: ['2:3', '3:4', '6:8', '9:12'], correctAnswer: '3:4', explanation: 'GCD of 18 and 24 is 6. 18/6 : 24/6 = 3:4.', optionExplanations: { '2:3': 'This is not equivalent to 18:24.', '3:4': 'Correct! Divide both by GCD 6.', '6:8': 'This can be simplified further to 3:4.', '9:12': 'This can be simplified further to 3:4.' } },
    { id: 5, type: 'multiple-choice', question: 'If y varies inversely with x and y=6 when x=2, what is y when x=4?', options: ['3', '12', '8', '2'], correctAnswer: '3', explanation: 'Inverse variation: y = k/x. k = 6×2 = 12. When x=4, y = 12/4 = 3.', optionExplanations: { '3': 'Correct! k=12, so y = 12/4 = 3.', '12': 'That is the constant k, not y.', '8': 'Check: does 8×4 = 12? No. The constant is 12.', '2': 'Check: does 2×4 = 12? No, 2×4 = 8.' } }
  ],
  // General Mathematics - Module 4: Basic Algebra
  'gm-4': [
    { id: 1, type: 'multiple-choice', question: 'Solve for x: 2x + 4 = 10', options: ['x = 3', 'x = 2', 'x = 6', 'x = 4'], correctAnswer: 'x = 3', explanation: 'Subtract 4: 2x = 6. Divide by 2: x = 3.', optionExplanations: { 'x = 3': 'Correct! 2(3)+4 = 10.', 'x = 2': '2(2)+4 = 8, not 10.', 'x = 6': 'You may have forgotten to divide by 2.', 'x = 4': '2(4)+4 = 12, not 10.' } },
    { id: 2, type: 'fill-in-blank', question: 'Simplify: 3(x + 2) = ___', correctAnswer: '3x + 6', explanation: 'Distribute: 3·x + 3·2 = 3x + 6.' },
    { id: 3, type: 'true-false', question: 'The expression 5x − 3x simplifies to 2x.', correctAnswer: 'True', explanation: 'Combine like terms: 5x − 3x = 2x.', optionExplanations: { 'True': 'Correct! Subtracting coefficients: 5−3 = 2.', 'False': '5x and 3x are like terms and can be combined.' } },
    { id: 4, type: 'multiple-choice', question: 'What is the slope-intercept form of a linear equation?', options: ['ax + by = c', 'y = mx + b', 'x = my + b', 'y = mx − b'], correctAnswer: 'y = mx + b', explanation: 'Slope-intercept form is y = mx + b, where m is slope and b is y-intercept.', optionExplanations: { 'ax + by = c': 'This is standard form.', 'y = mx + b': 'Correct! m = slope, b = y-intercept.', 'x = my + b': 'x and y are reversed.', 'y = mx − b': 'The intercept should be + b.' } },
    { id: 5, type: 'multiple-choice', question: 'If f(x) = 3x + 2, what is f(4)?', options: ['10', '12', '14', '16'], correctAnswer: '14', explanation: 'f(4) = 3(4) + 2 = 12 + 2 = 14.', optionExplanations: { '10': 'Check: 3(4)+2 = 14, not 10.', '12': 'You forgot to add 2. 3(4) = 12, then +2 = 14.', '14': 'Correct! 3(4)+2 = 14.', '16': 'Check your multiplication: 3×4 = 12, not 14.' } }
  ],
  // General Mathematics - Module 5: Geometry Fundamentals
  'gm-5': [
    { id: 1, type: 'multiple-choice', question: 'What is the sum of interior angles in a triangle?', options: ['90°', '180°', '270°', '360°'], correctAnswer: '180°', explanation: 'The sum of interior angles in any triangle is always 180°.', optionExplanations: { '90°': 'That is a right angle, not the sum of all angles.', '180°': 'Correct! All triangle angles sum to 180°.', '270°': 'This is the sum for a different shape.', '360°': 'This is the sum for a quadrilateral.' } },
    { id: 2, type: 'fill-in-blank', question: 'The area of a rectangle with length 8 and width 5 is ___', correctAnswer: '40', explanation: 'Area = length × width = 8 × 5 = 40.' },
    { id: 3, type: 'true-false', question: 'A square is a special type of rectangle.', correctAnswer: 'True', explanation: 'A square has four right angles and opposite sides equal, meeting all rectangle criteria.', optionExplanations: { 'True': 'Correct! A square is a rectangle with all sides equal.', 'False': 'A square satisfies all properties of a rectangle.' } },
    { id: 4, type: 'multiple-choice', question: 'What is the circumference of a circle with radius 7? (Use π ≈ 22/7)', options: ['22', '44', '154', '14'], correctAnswer: '44', explanation: 'C = 2πr = 2 × 22/7 × 7 = 44.', optionExplanations: { '22': 'This is πr, not 2πr.', '44': 'Correct! 2 × 22/7 × 7 = 44.', '154': 'This is the area (πr²), not circumference.', '14': 'This is the diameter (2r).' } },
    { id: 5, type: 'multiple-choice', question: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correctAnswer: '6', explanation: 'A hexagon has 6 sides. The prefix "hex" means 6.', optionExplanations: { '5': 'That is a pentagon.', '6': 'Correct! Hexagon = 6 sides.', '7': 'That is a heptagon.', '8': 'That is an octagon.' } }
  ],
  // General Mathematics - Module 6: Sets and Logic
  'gm-6': [
    { id: 1, type: 'multiple-choice', question: 'If A = {1,2,3} and B = {2,3,4}, what is A ∩ B?', options: ['{1,2,3,4}', '{2,3}', '{1,4}', '{1}'], correctAnswer: '{2,3}', explanation: 'A ∩ B (intersection) contains elements common to both: {2,3}.', optionExplanations: { '{1,2,3,4}': 'That is A ∪ B (union).', '{2,3}': 'Correct! The intersection has shared elements.', '{1,4}': 'These elements are only in one set each.', '{1}': '1 is only in A, not in both.' } },
    { id: 2, type: 'true-false', question: 'The empty set is a subset of every set.', correctAnswer: 'True', explanation: 'By definition, the empty set ∅ is a subset of every set.', optionExplanations: { 'True': 'Correct! ∅ ⊆ A for any set A.', 'False': 'The empty set is indeed a subset of every set by definition.' } },
    { id: 3, type: 'fill-in-blank', question: 'If A = {a, b, c}, the number of elements |A| = ___', correctAnswer: '3', explanation: 'The cardinality |A| counts the elements: a, b, c → 3.' },
    { id: 4, type: 'multiple-choice', question: 'What does A ∪ B represent?', options: ['Elements in both A and B', 'Elements in A or B or both', 'Elements in A but not B', 'Elements not in A'], correctAnswer: 'Elements in A or B or both', explanation: 'Union (∪) combines all elements from both sets.', optionExplanations: { 'Elements in both A and B': 'That describes intersection (∩).', 'Elements in A or B or both': 'Correct! Union includes all elements.', 'Elements in A but not B': 'That describes set difference A−B.', 'Elements not in A': 'That describes the complement of A.' } },
    { id: 5, type: 'multiple-choice', question: 'Which logical connective represents "and"?', options: ['∨', '∧', '¬', '→'], correctAnswer: '∧', explanation: '∧ is the logical AND connective.', optionExplanations: { '∨': '∨ means OR.', '∧': 'Correct! ∧ means AND.', '¬': '¬ means NOT.', '→': '→ means IMPLIES.' } }
  ],
  // Pre-Calculus - Module 1: Functions
  'pc-1': [
    { id: 1, type: 'multiple-choice', question: 'If f(x) = x² + 1, what is f(3)?', options: ['7', '9', '10', '12'], correctAnswer: '10', explanation: 'f(3) = 3² + 1 = 9 + 1 = 10.', optionExplanations: { '7': 'Check: 3²+1 = 10.', '9': 'You forgot to add 1.', '10': 'Correct! 9+1 = 10.', '12': 'Check your calculation.' } },
    { id: 2, type: 'true-false', question: 'Every function is a relation, but not every relation is a function.', correctAnswer: 'True', explanation: 'A function is a special relation where each input has exactly one output.', optionExplanations: { 'True': 'Correct! Functions are a subset of relations.', 'False': 'Functions require unique outputs for each input, making them a special type of relation.' } },
    { id: 3, type: 'fill-in-blank', question: 'The domain of f(x) = 1/x excludes x = ___', correctAnswer: '0', explanation: 'Division by zero is undefined, so x = 0 is excluded.' },
    { id: 4, type: 'multiple-choice', question: 'What is the range of f(x) = x²?', options: ['All real numbers', 'x ≥ 0', 'y ≥ 0', 'y > 0'], correctAnswer: 'y ≥ 0', explanation: 'x² is always non-negative, so the range is y ≥ 0.', optionExplanations: { 'All real numbers': 'x² can never be negative.', 'x ≥ 0': 'This describes the domain restriction, not the range.', 'y ≥ 0': 'Correct! Squares are always ≥ 0.', 'y > 0': 'f(0) = 0, so y = 0 is included.' } },
    { id: 5, type: 'multiple-choice', question: 'If f(x) = 2x and g(x) = x+3, what is (f∘g)(x)?', options: ['2x+3', '2x+6', '2(x+3)', 'Both B and C'], correctAnswer: 'Both B and C', explanation: 'f(g(x)) = f(x+3) = 2(x+3) = 2x+6. Both B and C are equivalent.', optionExplanations: { '2x+3': 'This adds 3 after multiplying. The correct order is f(g(x)) = 2(x+3).', '2x+6': 'Correct form! 2(x+3) = 2x+6.', '2(x+3)': 'Correct form! This equals 2x+6.', 'Both B and C': 'Correct! 2(x+3) and 2x+6 are equivalent.' } }
  ],
  // Basic Calculus
  'bc': [
    { id: 1, type: 'multiple-choice', question: 'What is the derivative of x²?', options: ['2x', 'x', '2', 'x²'], correctAnswer: '2x', explanation: 'Using the power rule d/dx[xⁿ] = nxⁿ⁻¹: derivative of x² is 2x.', optionExplanations: { '2x': 'Correct! Power rule: 2x²⁻¹ = 2x.', 'x': 'This would be the derivative of x²/2.', '2': 'The derivative of x² varies with x.', 'x²': 'This is the original function.' } },
    { id: 2, type: 'true-false', question: 'The limit of a function always exists at every point.', correctAnswer: 'False', explanation: 'Limits don\'t always exist, e.g. lim(x→0) 1/x does not exist.', optionExplanations: { 'True': 'Limits can fail at discontinuities or asymptotes.', 'False': 'Correct! Limits do not always exist.' } },
    { id: 3, type: 'fill-in-blank', question: 'The integral of 2x is ___', correctAnswer: 'x²', explanation: '∫2x dx = x² + C.' },
    { id: 4, type: 'multiple-choice', question: 'What is the derivative of sin(x)?', options: ['cos(x)', '-cos(x)', 'sin(x)', '-sin(x)'], correctAnswer: 'cos(x)', explanation: 'd/dx[sin(x)] = cos(x).', optionExplanations: { 'cos(x)': 'Correct!', '-cos(x)': 'The derivative of sin is positive cos.', 'sin(x)': 'sin is the original, not the derivative.', '-sin(x)': 'This is the derivative of cos(x).' } },
    { id: 5, type: 'multiple-choice', question: 'What does the derivative represent geometrically?', options: ['Area under the curve', 'Slope of the tangent line', 'Y-intercept', 'Maximum value'], correctAnswer: 'Slope of the tangent line', explanation: 'The derivative at a point gives the slope of the tangent line at that point.', optionExplanations: { 'Area under the curve': 'That is the integral.', 'Slope of the tangent line': 'Correct!', 'Y-intercept': 'The y-intercept is f(0).', 'Maximum value': 'Derivatives help find max/min but don\'t directly give them.' } }
  ],
  // Statistics and Probability
  'sp': [
    { id: 1, type: 'multiple-choice', question: 'What is the mean of {2, 4, 6, 8, 10}?', options: ['4', '5', '6', '8'], correctAnswer: '6', explanation: 'Mean = (2+4+6+8+10)/5 = 30/5 = 6.', optionExplanations: { '4': 'Sum is 30, not 20.', '5': 'There are 5 numbers but the mean is sum/count = 30/5 = 6.', '6': 'Correct! 30/5 = 6.', '8': 'Check the sum: 2+4+6+8+10 = 30.' } },
    { id: 2, type: 'fill-in-blank', question: 'The probability of getting heads on a fair coin flip is ___', correctAnswer: '0.5', explanation: 'A fair coin has equal probability: 1/2 = 0.5.' },
    { id: 3, type: 'true-false', question: 'The median of a dataset is always equal to the mean.', correctAnswer: 'False', explanation: 'Median and mean are equal only in symmetric distributions.', optionExplanations: { 'True': 'They are equal only in perfectly symmetric distributions.', 'False': 'Correct! Skewed data has different mean and median.' } },
    { id: 4, type: 'multiple-choice', question: 'What is the mode of {3, 5, 5, 7, 9}?', options: ['3', '5', '7', '9'], correctAnswer: '5', explanation: 'Mode is the most frequent value. 5 appears twice.', optionExplanations: { '3': '3 appears once.', '5': 'Correct! 5 appears most frequently (twice).', '7': '7 appears once.', '9': '9 appears once.' } },
    { id: 5, type: 'multiple-choice', question: 'If P(A) = 0.3, what is P(not A)?', options: ['0.3', '0.5', '0.7', '1.0'], correctAnswer: '0.7', explanation: 'P(not A) = 1 − P(A) = 1 − 0.3 = 0.7.', optionExplanations: { '0.3': 'That is P(A), not its complement.', '0.5': 'Complements only equal 0.5 when P(A) = 0.5.', '0.7': 'Correct! 1 − 0.3 = 0.7.', '1.0': '1.0 means certain, but A doesn\'t always not happen.' } }
  ]
};

// Get questions for a quiz based on its ID
const getQuestionsForLesson = (quizId: string, type: 'practice' | 'quiz'): Question[] => {
  // Extract module prefix from quiz ID (e.g., 'gm-2-q1' → 'gm-2')
  const parts = quizId.split('-');
  let moduleKey = '';
  
  if (parts.length >= 3) {
    // Format: 'gm-2-q1' → module key 'gm-2'
    moduleKey = `${parts[0]}-${parts[1]}`;
  } else if (parts.length === 2) {
    moduleKey = quizId;
  }

  // Try exact module match first, then prefix match
  if (quizQuestionBanks[moduleKey]) {
    return quizQuestionBanks[moduleKey];
  }

  // Fallback: match by subject prefix
  const subjectPrefix = parts[0];
  const subjectMap: Record<string, string> = {
    'gm': 'gm-4',  // Default to Basic Algebra for general math
    'pc': 'pc-1',  // Default to Functions for pre-calc
    'bc': 'bc',     // Basic Calculus
    'sp': 'sp',     // Statistics
  };

  const fallbackKey = subjectMap[subjectPrefix];
  if (fallbackKey && quizQuestionBanks[fallbackKey]) {
    return quizQuestionBanks[fallbackKey];
  }

  // Ultimate fallback: general algebra questions
  return quizQuestionBanks['gm-4'];
};

const ModuleDetailView: React.FC<ModuleDetailViewProps> = ({ module, onBack, onEarnXP }) => {
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; type: 'lesson' } | { quiz: Quiz; type: 'quiz' } | null>(null);

  const completedLessons = module.lessons.filter(l => l.completed).length;
  const completedQuizzes = module.quizzes.filter(q => q.completed).length;

  // Calculate overall module progress
  const totalItems = module.lessons.length + module.quizzes.length;
  const completedItems = completedLessons + completedQuizzes;

  // If a lesson is selected, show the appropriate viewer
  if (selectedLesson) {
    if (selectedLesson.type === 'lesson') {
      // Show the actual lesson content viewer
      return (
        <LessonViewer
          lesson={selectedLesson.lesson}
          onBack={() => setSelectedLesson(null)}
          onComplete={() => {
            onEarnXP?.(50, `Completed "${selectedLesson.lesson.title}"`);
            setSelectedLesson(null);
          }}
        />
      );
    } else {
      // Show the quiz interface
      const questions = getQuestionsForLesson(selectedLesson.quiz.id, 'quiz');
      return (
        <InteractiveLesson
          lesson={{
            id: parseInt(selectedLesson.quiz.id.split('-').pop() || '1'),
            title: selectedLesson.quiz.title,
            duration: selectedLesson.quiz.duration,
            type: 'quiz',
            completed: selectedLesson.quiz.completed,
            locked: selectedLesson.quiz.locked
          }}
          questions={questions}
          onBack={() => setSelectedLesson(null)}
          onComplete={(score) => {
            console.log('Quiz completed with score:', score);
            const xpReward = Math.round(score * 1.5);
            onEarnXP?.(xpReward, `Scored ${score}% on "${selectedLesson.quiz.title}"`);
            setSelectedLesson(null);
          }}
        />
      );
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold mb-4 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Modules
        </button>

        {/* Module Hero */}
        <div className={`${module.color} rounded-3xl p-8 border border-white/50 shadow-lg`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">{module.title}</h1>
              <p className="text-slate-600 mb-6">{module.description}</p>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <BookOpen size={18} />
                  <span className="font-medium">{module.lessons.length} Lessons</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Award size={18} />
                  <span className="font-medium">{module.quizzes.length} Quizzes</span>
                </div>
                <div className="flex items-center gap-2 text-teal-600">
                  <CheckCircle2 size={18} />
                  <span className="font-medium">{completedItems}/{totalItems} Completed</span>
                </div>
              </div>
            </div>

            {/* Progress Circle */}
            <div className="relative">
              <svg width="100" height="100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke={module.accentColor.replace('bg-', '#')}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - module.progress / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-slate-800">{module.progress}%</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-600">Module Progress</span>
              <span className="text-xs font-bold text-slate-800">{module.progress}%</span>
            </div>
            <div className="h-3 bg-white/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${module.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full ${module.accentColor} rounded-full`}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 scrollbar-hide">
        {/* Lessons Section */}
        <div>
          <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen size={20} className={module.iconColor} />
            Lessons ({completedLessons}/{module.lessons.length})
          </h2>
          
          <div className="space-y-2">
            {module.lessons.map((lesson, index) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => !lesson.locked && setSelectedLesson({ lesson, type: 'lesson' })}
                className={`bg-white rounded-2xl p-4 border-2 transition-all ${
                  lesson.locked
                    ? 'border-slate-200 opacity-60 cursor-not-allowed'
                    : lesson.completed
                    ? 'border-teal-200 hover:border-teal-300 cursor-pointer hover:shadow-md'
                    : 'border-indigo-200 hover:border-indigo-300 cursor-pointer hover:shadow-md'
                } group`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      lesson.locked
                        ? 'bg-slate-100 text-slate-400'
                        : lesson.completed
                        ? 'bg-teal-100 text-teal-600'
                        : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {lesson.locked ? (
                        <Lock size={18} />
                      ) : lesson.completed ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Play size={18} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400">Lesson {index + 1}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {lesson.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                      <Clock size={14} />
                      <span>{lesson.duration}</span>
                    </div>
                    {lesson.completed && (
                      <div className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-bold">
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quizzes Section */}
        <div>
          <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <Award size={20} className={module.iconColor} />
            Quizzes & Assessments ({completedQuizzes}/{module.quizzes.length})
          </h2>
          
          <div className="space-y-3">
            {module.quizzes.map((quiz, index) => {
              const isLocked = quiz.locked;
              const isPractice = quiz.type === 'practice';
              const isModuleQuiz = quiz.type === 'module';
              const isFinal = quiz.type === 'final';

              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (module.lessons.length + index) * 0.05 }}
                  onClick={() => !isLocked && setSelectedLesson({ quiz, type: 'quiz' })}
                  className={`rounded-2xl p-5 border-2 transition-all ${
                    isLocked
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : quiz.completed
                      ? 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200 hover:border-teal-300 cursor-pointer hover:shadow-md'
                      : isFinal
                      ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:border-purple-300 cursor-pointer hover:shadow-md'
                      : isModuleQuiz
                      ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:border-orange-300 cursor-pointer hover:shadow-md'
                      : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-300 cursor-pointer hover:shadow-md'
                  } group`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isLocked
                          ? 'bg-slate-200 text-slate-400'
                          : quiz.completed
                          ? 'bg-teal-500 text-white'
                          : isFinal
                          ? 'bg-purple-500 text-white'
                          : isModuleQuiz
                          ? 'bg-orange-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {isLocked ? (
                          <Lock size={20} />
                        ) : quiz.completed ? (
                          <Trophy size={20} />
                        ) : (
                          <PenTool size={20} />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                            isFinal
                              ? 'bg-purple-200 text-purple-700'
                              : isModuleQuiz
                              ? 'bg-orange-200 text-orange-700'
                              : 'bg-blue-200 text-blue-700'
                          }`}>
                            {isFinal ? 'Final Exam' : isModuleQuiz ? 'Module Quiz' : 'Practice Quiz'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 mb-1">{quiz.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{quiz.questions} questions</span>
                          <span>•</span>
                          <span>{quiz.duration}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {quiz.score !== undefined && quiz.completed && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-teal-600">{quiz.score}%</div>
                          <div className="text-xs text-slate-500">Best Score</div>
                        </div>
                      )}
                      {quiz.completed ? (
                        <div className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold flex items-center gap-1">
                          <CheckCircle2 size={16} />
                          Retake
                        </div>
                      ) : (
                        <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
                          isLocked
                            ? 'bg-slate-300 text-slate-500'
                            : 'bg-indigo-600 text-white group-hover:bg-indigo-700'
                        }`}>
                          Start Quiz
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Module Completion Reward */}
        {module.progress === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-2 border-amber-200 text-center"
          >
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Module Completed! 🎉</h3>
            <p className="text-slate-600 mb-4">
              Congratulations! You've mastered this module. Keep up the great work!
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-600 font-bold">
              <Star size={20} />
              <span>+200 XP Earned</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ModuleDetailView;