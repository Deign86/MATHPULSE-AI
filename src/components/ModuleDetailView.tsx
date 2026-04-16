import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, Hash, Clock, Award, Play, Lock, CheckCircle2, Circle, BookOpen, PenTool, Trophy, Star, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import InteractiveLesson, { Question } from './InteractiveLesson';
import LessonViewer from './LessonViewer';
import { subjects, Module, Lesson, Quiz } from '../data/subjects';
import { useAuth } from '../contexts/AuthContext';
import { completeLesson, completeQuiz, recalculateAndUpdateModuleProgress, subscribeToUserProgress, updateLessonProgressPercent } from '../services/progressService';
import type { UserProgress } from '../types/models';

interface ModuleDetailViewProps {
  module: Module;
  onBack: () => void;
  onEarnXP?: (xp: number, message: string) => void;
}

// Question banks per module/quiz topic
const quizQuestionBanks: Record<string, Question[]> = {
  // General Mathematics - Module 1: Functions and Their Graphs
  'gm-1': [
    { id: 1, type: 'multiple-choice', question: 'Which statement best describes a function?', options: ['Each input has exactly one output', 'Each output has exactly one input', 'Inputs and outputs must be equal', 'A function is always linear'], correctAnswer: 'Each input has exactly one output', explanation: 'A relation is a function when every input is paired with only one output value.', optionExplanations: { 'Each input has exactly one output': 'Correct. This is the defining condition of a function.', 'Each output has exactly one input': 'Not required. Different inputs can share the same output.', 'Inputs and outputs must be equal': 'Functions can map inputs to different values.', 'A function is always linear': 'Many functions are nonlinear.' } },
    { id: 2, type: 'multiple-choice', question: 'If f(x) = 2x + 3, what is f(4)?', options: ['8', '11', '10', '5'], correctAnswer: '11', explanation: 'Substitute x = 4. f(4) = 2(4) + 3 = 11.', optionExplanations: { '8': 'This is 2x only. Add 3 as well.', '11': 'Correct. 2(4)+3 = 11.', '10': 'Check substitution carefully.', '5': 'This would come from a different expression.' } },
    { id: 3, type: 'fill-in-blank', question: 'For f(x) = x^2, the range is y ___ 0 (answer with >= or >).', correctAnswer: '>=', explanation: 'Squares are never negative, and 0 is included when x = 0.' },
    { id: 4, type: 'multiple-choice', question: 'If f(x) = x - 5 and g(x) = x^2, what is (g o f)(x)?', options: ['x^2 - 5', '(x - 5)^2', 'x^2 + 5', '2x - 5'], correctAnswer: '(x - 5)^2', explanation: 'Compose by substituting f(x) into g. g(f(x)) = g(x-5) = (x-5)^2.', optionExplanations: { 'x^2 - 5': 'This is not the result of composition.', '(x - 5)^2': 'Correct. Substitute x-5 into g(x)=x^2.', 'x^2 + 5': 'Incorrect sign and operation.', '2x - 5': 'This is linear, but g(x) is quadratic.' } },
    { id: 5, type: 'true-false', question: 'A one-to-one function always has an inverse that is also a function.', correctAnswer: 'True', explanation: 'One-to-one functions pass the horizontal line test, which guarantees an inverse function.', optionExplanations: { 'True': 'Correct. One-to-one is the key condition for inverses to be functions.', 'False': 'If a function is one-to-one, its inverse relation is a function.' } },
    { id: 6, type: 'multiple-choice', question: 'Which parent graph has a horizontal asymptote at y = 0?', options: ['y = log(x)', 'y = x^2', 'y = 2^x', 'y = x + 1'], correctAnswer: 'y = 2^x', explanation: 'Basic exponential functions approach y = 0 but never reach it.', optionExplanations: { 'y = log(x)': 'Logarithmic functions have a vertical asymptote at x = 0.', 'y = x^2': 'Parabolas have no horizontal asymptote.', 'y = 2^x': 'Correct. Exponential graphs approach y = 0.', 'y = x + 1': 'Linear functions do not have asymptotes.' } }
  ],
  // General Mathematics - Module 2: Business Mathematics
  'gm-2': [
    { id: 1, type: 'multiple-choice', question: 'What is the simple interest on Php 8,000 at 6% per year for 2 years?', options: ['Php 480', 'Php 960', 'Php 1,200', 'Php 1,600'], correctAnswer: 'Php 960', explanation: 'Simple interest I = Prt = 8000(0.06)(2) = 960.', optionExplanations: { 'Php 480': 'That is one year of interest only.', 'Php 960': 'Correct. Multiply principal, rate, and time.', 'Php 1,200': 'Check the rate and time values.', 'Php 1,600': 'This overstates the computed interest.' } },
    { id: 2, type: 'multiple-choice', question: 'Which formula gives compound amount after t periods?', options: ['A = P(1 + rt)', 'A = P(1 + r)^t', 'A = P - rt', 'A = Prt'], correctAnswer: 'A = P(1 + r)^t', explanation: 'Compound growth multiplies by (1 + r) each period.', optionExplanations: { 'A = P(1 + rt)': 'This is the simple interest amount form.', 'A = P(1 + r)^t': 'Correct. This is the standard compound amount formula.', 'A = P - rt': 'This is not an amount model.', 'A = Prt': 'This computes simple interest, not total compound amount.' } },
    { id: 3, type: 'fill-in-blank', question: 'If the future value is 12,000 and discount rate is 20%, present value is ___', correctAnswer: '10000', explanation: 'Present value PV = FV/(1+r) = 12000/1.2 = 10000.' },
    { id: 4, type: 'true-false', question: 'A general annuity has payment interval different from the compounding interval.', correctAnswer: 'True', explanation: 'That mismatch between payment and conversion periods defines a general annuity.', optionExplanations: { 'True': 'Correct. Different intervals make it a general annuity.', 'False': 'Matching intervals correspond to a simple annuity.' } },
    { id: 5, type: 'multiple-choice', question: 'In an amortization schedule, each regular payment is split into:', options: ['Tax and insurance', 'Principal and interest', 'Deposit and withdrawal', 'Discount and markup'], correctAnswer: 'Principal and interest', explanation: 'Loan payments reduce outstanding principal and cover interest charges.', optionExplanations: { 'Tax and insurance': 'These may appear in housing payments, but are not the core loan split.', 'Principal and interest': 'Correct. This is the fundamental breakdown.', 'Deposit and withdrawal': 'These terms describe bank account activity, not amortization.', 'Discount and markup': 'These are pricing terms, not amortization terms.' } },
    { id: 6, type: 'multiple-choice', question: 'Which statement is true about a stock market index?', options: ['It guarantees profit', 'It tracks performance of a selected group of stocks', 'It sets loan interest rates', 'It replaces bond yields'], correctAnswer: 'It tracks performance of a selected group of stocks', explanation: 'An index is a benchmark that summarizes how a basket of stocks performs.', optionExplanations: { 'It guarantees profit': 'No index can guarantee returns.', 'It tracks performance of a selected group of stocks': 'Correct. That is the purpose of an index.', 'It sets loan interest rates': 'Loan rates are set by lenders and market conditions, not indexes directly.', 'It replaces bond yields': 'Bond yields and stock indexes measure different markets.' } }
  ],
  // General Mathematics - Module 3: Logic and Mathematical Reasoning
  'gm-3': [
    { id: 1, type: 'multiple-choice', question: 'Which of the following is a proposition?', options: ['Open the door.', 'x + 5 = 12', 'Manila is in the Philippines.', 'How are you?'], correctAnswer: 'Manila is in the Philippines.', explanation: 'A proposition is a declarative statement that is either true or false.', optionExplanations: { 'Open the door.': 'This is a command, not a proposition.', 'x + 5 = 12': 'Without a value for x, this is an open sentence.', 'Manila is in the Philippines.': 'Correct. This statement has a definite truth value.', 'How are you?': 'This is a question, not a proposition.' } },
    { id: 2, type: 'true-false', question: 'If p is true and q is false, then p AND q is false.', correctAnswer: 'True', explanation: 'A conjunction p AND q is true only when both p and q are true.', optionExplanations: { 'True': 'Correct. One false part makes the conjunction false.', 'False': 'Conjunction requires both components to be true.' } },
    { id: 3, type: 'multiple-choice', question: 'What is the negation of the statement: "All students passed"?', options: ['No student passed', 'At least one student did not pass', 'Some students passed', 'All students did not pass'], correctAnswer: 'At least one student did not pass', explanation: 'Negating "all" gives "there exists at least one" that does not satisfy the statement.', optionExplanations: { 'No student passed': 'This is stronger than the logical negation.', 'At least one student did not pass': 'Correct. This is the precise negation.', 'Some students passed': 'This can still be true with the original statement.', 'All students did not pass': 'This is not equivalent to the negation of "all passed".' } },
    { id: 4, type: 'fill-in-blank', question: 'In logic, "if p then q" is written as p ___ q', correctAnswer: '->', explanation: 'The conditional symbol is arrow, often typed as ->.' },
    { id: 5, type: 'multiple-choice', question: 'Which argument form is valid?', options: ['If p then q; q; therefore p', 'If p then q; p; therefore q', 'p OR q; p; therefore not q', 'If p then q; not p; therefore not q'], correctAnswer: 'If p then q; p; therefore q', explanation: 'This is modus ponens, a valid argument form.', optionExplanations: { 'If p then q; q; therefore p': 'This is affirming the consequent, invalid.', 'If p then q; p; therefore q': 'Correct. This is modus ponens.', 'p OR q; p; therefore not q': 'From inclusive OR, not q does not follow.', 'If p then q; not p; therefore not q': 'This is denying the antecedent, invalid.' } },
    { id: 6, type: 'multiple-choice', question: 'A tautology is a proposition that is:', options: ['Always true', 'Always false', 'True only when p is true', 'Undefined'], correctAnswer: 'Always true', explanation: 'A tautology evaluates to true for all possible truth assignments.', optionExplanations: { 'Always true': 'Correct. This is the definition of tautology.', 'Always false': 'That describes a contradiction.', 'True only when p is true': 'That depends on p and is not always true.', 'Undefined': 'Tautologies are fully defined and always true.' } }
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
  const STANDARD_LESSON_XP = 10;
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; type: 'lesson'; returnFromQuiz?: boolean } | { quiz: Quiz; type: 'quiz' } | null>(null);
  const { userProfile } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  const moduleLevel = useMemo(() => {
    const candidate = Number(module.id.split('-').pop());
    return Number.isFinite(candidate) && candidate > 0 ? candidate : 1;
  }, [module.id]);

  const subjectId = useMemo(() => {
    const parent = subjects.find((s) => s.modules.some((m) => m.id === module.id));
    return parent?.id ?? null;
  }, [module.id]);

  // Palette (requested) used for per-module accents where the curriculum data isn't differentiated.
  const MODULE_PALETTE = ['#1FA7E1', '#9956DE', '#75D06A', '#FFB356', '#7274ED', '#FF8B8B', '#6ED1CF', '#FB96BB'];

  const moduleAccentHex = useMemo(() => {
    const parent = subjectId ? subjects.find((s) => s.id === subjectId) : null;
    const idx = parent?.modules?.findIndex((m) => m.id === module.id) ?? 0;
    const safeIdx = idx >= 0 ? idx : 0;
    return MODULE_PALETTE[safeIdx % MODULE_PALETTE.length];
  }, [module.id, subjectId]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    return subscribeToUserProgress(userProfile.uid, setUserProgress);
  }, [userProfile?.uid]);

  const dbModuleProgress = useMemo(() => {
    if (!subjectId) return null;
    return userProgress?.subjects?.[subjectId]?.modulesProgress?.[module.id] ?? null;
  }, [module.id, subjectId, userProgress?.subjects]);

  const [returningToLesson, setReturningToLesson] = useState<Lesson | null>(null);

  const completedLessonIds = useMemo(() => {
    const ids = dbModuleProgress?.lessonsCompleted ?? [];
    return new Set(ids);
  }, [dbModuleProgress?.lessonsCompleted]);

  const completedQuizIds = useMemo(() => {
    const ids = dbModuleProgress?.quizzesCompleted ?? [];
    return new Set(ids);
  }, [dbModuleProgress?.quizzesCompleted]);

  const completedLessons = dbModuleProgress?.lessonsCompleted?.length ?? module.lessons.filter(l => l.completed).length;
  const completedQuizzes = dbModuleProgress?.quizzesCompleted?.length ?? module.quizzes.filter(q => q.completed).length;
  const moduleProgressPercentFromDb = dbModuleProgress?.progress ?? module.progress;

  // Calculate overall module progress
  const totalItems = module.lessons.length + module.quizzes.length;
  const completedItems = completedLessons + completedQuizzes;
  const lessonProgressPercent = module.lessons.length ? (completedLessons / module.lessons.length) * 100 : 0;
  const quizProgressPercent = module.quizzes.length ? (completedQuizzes / module.quizzes.length) * 100 : 0;

  // Per-lesson progress (0-100) persisted in Firestore under progress.lessons[lessonId].
  const getLessonProgressPercent = (lessonId: string, isCompleted: boolean) => {
    const pct = userProgress?.lessons?.[lessonId]?.score; // Assuming score stores the percentage here based on models
    if (typeof pct === 'number' && Number.isFinite(pct)) return Math.max(0, Math.min(100, pct));
    return isCompleted ? 100 : 0;
  };

  // Derived module progress that includes partial lesson progress.
  const derivedModuleProgressPercent = useMemo(() => {
    if (!totalItems) return 0;
    const lessonSum = module.lessons.reduce((sum, lesson) => {
      const isCompleted = completedLessonIds.has(lesson.id) || lesson.completed;
      return sum + getLessonProgressPercent(lesson.id, isCompleted);
    }, 0);
    const quizSum = completedQuizzes * 100;
    return Math.round((lessonSum + quizSum) / totalItems);
  }, [completedLessonIds, completedQuizzes, module.lessons, module.quizzes.length, totalItems, userProgress?.lessons]);

  const moduleProgressPercent = moduleProgressPercentFromDb > 0 ? moduleProgressPercentFromDb : derivedModuleProgressPercent;

  const standaloneQuiz = useMemo(() => {
    return (
      module.quizzes.find(
        (quiz) => quiz.type === 'final' || /module\s+quiz|general\s+quiz/i.test(quiz.title),
      ) ?? null
    );
  }, [module.quizzes]);

  const lessonActivityMap = useMemo(() => {
    const mapped = new Map<string, Quiz[]>();

    module.lessons.forEach((lesson) => {
      mapped.set(lesson.id, []);
    });

    const lessonCount = module.lessons.length;
    if (lessonCount === 0) return mapped;

    module.quizzes.forEach((quiz, index) => {
      if (standaloneQuiz?.id === quiz.id) return;
      const lessonIndex = Math.min(index, lessonCount - 1);
      const lesson = module.lessons[lessonIndex];
      if (!lesson) return;

      const bucket = mapped.get(lesson.id) ?? [];
      bucket.push(quiz);
      mapped.set(lesson.id, bucket);
    });

    return mapped;
  }, [module.lessons, module.quizzes, standaloneQuiz?.id]);

  const standaloneInsertIndex = useMemo(() => {
    return Math.max(1, Math.ceil(module.lessons.length / 2));
  }, [module.lessons.length]);

  // If a lesson is selected, show the appropriate viewer
  if (selectedLesson) {
    if (selectedLesson.type === 'lesson') {
      const associatedQuiz = lessonActivityMap.get(selectedLesson.lesson.id)?.[0] ?? null;

      // Show the actual lesson content viewer
      const practiceQuizCompleted = associatedQuiz ? (completedQuizIds.has(associatedQuiz.id) || associatedQuiz.completed) : false;

      return (
        <LessonViewer
          lesson={selectedLesson.lesson}
          lessonCompletionXP={STANDARD_LESSON_XP}
          practiceQuiz={associatedQuiz}
          practiceQuizCompleted={practiceQuizCompleted}
          initialSection={selectedLesson.returnFromQuiz ? -1 : 0}
          onBack={() => {
            setSelectedLesson(null);
            setReturningToLesson(null);
          }}
          onStartPractice={() => {
            if (associatedQuiz) {
              setReturningToLesson(selectedLesson.lesson);
              setSelectedLesson({ type: 'quiz', quiz: associatedQuiz });
            }
          }}
          onProgressUpdate={(percent) => {
            // This is lesson-scoped progress; no subject/module IDs needed.
            if (userProfile?.uid) {
              updateLessonProgressPercent(userProfile.uid, selectedLesson.lesson.id, percent);
            }

            // Optimistic UI update so the module lesson card rim reflects immediately.
            setUserProgress((prev) => {
              if (!prev) return prev;
              const lessonId = selectedLesson.lesson.id;
              const existingPct = prev.lessons?.[lessonId]?.score;
              const safeExistingPct = typeof existingPct === 'number' && Number.isFinite(existingPct) ? existingPct : 0;
              const nextPct = Math.max(safeExistingPct, Math.max(0, Math.min(100, percent)));
              return {
                ...prev,
                lessons: {
                  ...(prev.lessons || {}),
                  [lessonId]: {
                    ...(prev.lessons?.[lessonId] || {}),
                    lessonId,
                    score: nextPct,
                  },
                },
                updatedAt: new Date(),
              };
            });
          }}
          onComplete={(score, totalXP, goToNext) => {
            // Standard lesson rewards are intentionally lower to keep pacing balanced.
            const xpAmount = STANDARD_LESSON_XP;
            console.log('[LessonComplete] XP Award:', xpAmount, 'for', selectedLesson.lesson.title);
            onEarnXP?.(xpAmount, `Completed "${selectedLesson.lesson.title}"`);

            // Persist progress for Competency Matrix (Concept Grasp)
            if (userProfile?.uid && subjectId) {
              void (async () => {
                try {
                  await completeLesson(
                    userProfile.uid,
                    subjectId,
                    module.id,
                    selectedLesson.lesson.id,
                    0,
                    xpAmount
                  );
                  await recalculateAndUpdateModuleProgress(
                    userProfile.uid,
                    subjectId,
                    module.id,
                    module.lessons.length,
                    module.quizzes.length
                  );
                } catch (err) {
                  console.error('[LessonComplete] Failed to persist progress:', err);
                }
              })();
            }

            // Figure out the next index based on current lesson inside module.lessons
            if (goToNext) {
              const currentIdx = module.lessons.findIndex(l => l.id === selectedLesson.lesson.id);
              if (currentIdx !== -1 && currentIdx < module.lessons.length - 1) {
                // Automatically move to the next lesson
                setSelectedLesson({ type: 'lesson', lesson: module.lessons[currentIdx + 1] });
              } else if (currentIdx === module.lessons.length - 1 && module.quizzes.length > 0) {
                // If it was the last lesson, move to the first quiz
                setSelectedLesson({ type: 'quiz', quiz: module.quizzes[0] });
              } else {
                // Nothing left to go to
                setSelectedLesson(null);
              }
            } else {
              setSelectedLesson(null);
            }
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
          onBack={() => {
            if (returningToLesson) {
              setSelectedLesson({ type: 'lesson', lesson: returningToLesson, returnFromQuiz: true });
              setReturningToLesson(null);
            } else {
              setSelectedLesson(null);
            }
          }}
          onComplete={(score, totalXP) => {
            console.log('[QuizComplete] Score:', score, 'totalXP from calculator:', totalXP);
            // Ensure we have a meaningful XP reward - use totalXP if available and > 0, otherwise calculate from score
            const xpReward = (totalXP && totalXP > 0) ? totalXP : Math.max(100, Math.round(score * 1.5));
            console.log('[QuizComplete] Awarding XP:', xpReward);
            onEarnXP?.(xpReward, `Scored ${score}% on "${selectedLesson.quiz.title}"`);

            // Persist progress for Competency Matrix (Application)
            if (userProfile?.uid && subjectId) {
              void (async () => {
                try {
                  await completeQuiz(
                    userProfile.uid,
                    subjectId,
                    module.id,
                    selectedLesson.quiz.id,
                    score,
                    [],
                    0
                  );
                  await recalculateAndUpdateModuleProgress(
                    userProfile.uid,
                    subjectId,
                    module.id,
                    module.lessons.length,
                    module.quizzes.length
                  );
                } catch (err) {
                  console.error('[QuizComplete] Failed to persist progress:', err);
                }
              })();
            }

            if (returningToLesson) {
              setSelectedLesson({ type: 'lesson', lesson: returningToLesson, returnFromQuiz: true });
              setReturningToLesson(null);
            } else {
              setSelectedLesson(null);
            }
          }}
        />
      );
    }
  }

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 xl:px-10 py-6 sm:py-8 lg:overflow-hidden relative">
      {/* Floating Header & Navigation */}
      <div className="sticky top-0 sm:top-4 z-50 mb-6 xl:mb-8 w-full sm:w-max">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/60 text-slate-600 hover:text-indigo-600 font-bold text-sm tracking-wide transition-all hover:-translate-x-1 shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      {/* Book Cover / Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative mb-6 lg:mb-8 rounded-[2rem] ${module.accentColor} shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden`}
      >
        {/* Simple black overlay to darken the specific module color */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />
        {/* Decorative Textbook Background */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #ffffff 39px, #ffffff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #ffffff 39px, #ffffff 40px)' }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative p-5 sm:p-7 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
          <div className="flex-1 text-white">
            <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-5">
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest text-[#f8fafc] border border-white/20 shadow-sm flex items-center gap-1.5">
                <Bookmark size={14} /> Chapter {module.id.split('-').pop() || '1'}
              </div>
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-400/30">
                Lv {moduleLevel}
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white mb-3 md:mb-4 tracking-[-0.02em] leading-tight">
              {module.title}
            </h1>
            <p className="text-slate-300 text-sm md:text-[15px] max-w-2xl font-medium leading-relaxed mb-6 md:mb-8">
              {module.description}
            </p>

            {/* Elegant Linear Progress instead of redundant circles/bars */}
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 max-w-xl">
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2.5">
                  <Award size={20} className="text-emerald-400" />
                  <span className="text-[12px] md:text-[13px] font-black text-white uppercase tracking-wider">Module Mastery</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] md:text-[13px] font-bold text-slate-400 mb-0.5">{completedItems}/{totalItems} steps</span>
                  <span className="text-xl md:text-2xl font-black text-white shrink-0 leading-none">{Math.round(moduleProgressPercent)}%</span>
                </div>
              </div>
              <div className="h-3 bg-black/40 rounded-full overflow-hidden shadow-inner ring-1 ring-white/10 p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${moduleProgressPercent}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                  className={`h-full rounded-full relative ${moduleProgressPercent === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : module.accentColor}`}
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8L3N2Zz4=')] opacity-30 mix-blend-overlay" />
                </motion.div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex w-48 h-48 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md items-center justify-center transform rotate-[-3deg] shadow-2xl relative group hover:rotate-0 transition-all duration-500 shrink-0">
            <div className={`absolute inset-0 opacity-40 rounded-[2rem] ${module.progress === 100 ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : module.accentColor}`} />
            
            {moduleProgressPercent === 100 ? (
              <Trophy size={80} className="text-white drop-shadow-xl z-10 scale-100 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
            ) : (
              <BookOpen size={80} className="text-white drop-shadow-xl z-10 scale-100 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
            )}
            
            <motion.div animate={{y:[-5,5,-5], rotate:[-10,10,-10]}} transition={{duration:4, repeat:Infinity}} className="absolute top-6 left-6 text-emerald-300 z-20">
              <Star size={20} fill="currentColor" />
            </motion.div>
            <motion.div animate={{y:[5,-5,5], rotate:[10,-10,10]}} transition={{duration:3.5, repeat:Infinity}} className="absolute bottom-8 right-6 text-sky-300 z-20">
              <Hash size={24} />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Single-column lesson flow with nested activities */}
      <div className="flex-1 overflow-y-auto pr-2 pb-8 scrollbar-hide">
        <div className="relative rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(153,86,222,0.08),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(31,167,225,0.08),transparent_45%)]" />

          <div className="relative z-10 px-4 sm:px-6 md:px-8 py-5 md:py-6 border-b border-slate-200/70 bg-white/70 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-black text-xl md:text-2xl text-slate-800 flex items-center gap-3">
              <BookOpen size={24} className="text-sky-500" />
              Study Journey
            </h2>
            <div className="flex items-center gap-2.5">
              <div className="text-xs md:text-sm font-bold bg-sky-100 text-sky-700 px-3 py-1 rounded-full shadow-sm border border-sky-200/50">
                Lessons {completedLessons}/{module.lessons.length}
              </div>
              <div className="text-xs md:text-sm font-bold bg-rose-100 text-rose-700 px-3 py-1 rounded-full shadow-sm border border-rose-200/50">
                Quizzes {completedQuizzes}/{module.quizzes.length}
              </div>
            </div>
          </div>

          <div className="relative z-10 px-4 sm:px-6 md:px-8 py-5 md:py-6 space-y-5">
            {module.lessons.map((lesson, index) => {
              const isCompleted = completedLessonIds.has(lesson.id) || lesson.completed;
              const lessonPct = getLessonProgressPercent(lesson.id, isCompleted);
              const nestedActivities = lessonActivityMap.get(lesson.id) ?? [];
              const lessonAccentHex = MODULE_PALETTE[index % MODULE_PALETTE.length];

              return (
                <React.Fragment key={lesson.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative rounded-[1.5rem] border overflow-hidden group transition-all duration-500 mb-6 ${
                      lesson.locked
                        ? 'border-slate-200 opacity-65 saturate-50'
                        : 'border-slate-200/80 hover:border-slate-300 hover:shadow-[0_16px_40px_-15px_rgba(0,0,0,0.12)] hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Top Progress Bar matching the screenshot's placement but dynamic */}
                    <div className="absolute top-0 left-0 right-0 h-[6px] z-20 bg-slate-100 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(2, lessonPct)}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 + index * 0.05 }}
                        className="h-full relative" 
                        style={{ backgroundColor: lessonAccentHex }}
                      >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8L3N2Zz4=')] opacity-30 mix-blend-overlay" />
                      </motion.div>
                    </div>
                    
                    <div 
                      className="absolute inset-0 bg-white transition-opacity duration-500 group-hover:opacity-90" 
                      style={{
                        backgroundImage: `linear-gradient(to right, ${lessonAccentHex}44 0%, ${lessonAccentHex}11 50%, white 100%)`
                      }}
                    />
                    <div 
                      className="absolute inset-0 opacity-[0.2] pointer-events-none" 
                      style={{ 
                        backgroundImage: `radial-gradient(circle at 2px 2px, ${lessonAccentHex} 1.5px, transparent 0)`, 
                        backgroundSize: '24px 24px' 
                      }} 
                    />
                    <div className="absolute -top-12 -left-10 h-40 w-40 rounded-full blur-[32px] pointer-events-none transition-transform duration-700 group-hover:scale-[1.3] group-hover:translate-x-4" style={{ backgroundColor: `${lessonAccentHex}22` }} />
                    <div className="absolute -bottom-8 right-8 h-32 w-32 rounded-full blur-2xl pointer-events-none transition-transform duration-700 group-hover:scale-125 group-hover:-translate-y-4" style={{ backgroundColor: `${lessonAccentHex}11` }} />
                    
                    <div className="absolute right-4 top-4 opacity-10 pointer-events-none transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 drop-shadow-sm" style={{ color: lessonAccentHex }}><Hash size={56} strokeWidth={1} /></div>
                    <div className="absolute right-16 bottom-5 opacity-10 pointer-events-none transition-all duration-500 group-hover:-rotate-6 group-hover:-translate-y-2 drop-shadow-sm" style={{ color: lessonAccentHex }}><BookOpen size={40} strokeWidth={1} /></div>

                    <div className="relative z-10 p-4 md:p-5 pt-6 space-y-4">
                      
                      {/* Lesson Content Box */}
                      <button
                        type="button"
                        onClick={() => !lesson.locked && setSelectedLesson({ lesson, type: 'lesson' })}
                        className={`w-full text-left flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 transition shadow-sm ${
                          lesson.locked
                            ? 'cursor-not-allowed border border-slate-200 bg-white/70'
                            : 'cursor-pointer bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm ${
                              lesson.locked
                                ? 'bg-slate-100 text-slate-400'
                                : isCompleted
                                ? 'text-white'
                                : 'text-white'
                            }`}
                            style={!lesson.locked ? (isCompleted ? { backgroundColor: '#0ea5e9' /* completed green color representation */ } : { backgroundColor: lessonAccentHex }) : {}}
                          >
                            {lesson.locked ? <Lock size={18} /> : isCompleted ? <CheckCircle2 size={24} /> : <Play size={20} className="ml-0.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] md:text-[12px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                              Lesson {index + 1}
                            </p>
                            <h3 className="font-bold text-[16px] md:text-[18px] text-[#0a1628] truncate">{lesson.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs md:text-sm font-semibold bg-slate-100/80 px-3 py-1.5 rounded-xl">
                            <Clock size={14} />
                            {lesson.duration}
                          </span>
                        </div>
                      </button>

                      {/* Flashcards / Study Materials Pilled Buttons */}
                      <div className="flex flex-wrap gap-3 px-1">
                        <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold shadow-sm transition hover:-translate-y-0.5" style={{ color: lessonAccentHex }}>
                          <BookOpen size={14} /> Study Materials
                        </button>
                        <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold shadow-sm transition hover:-translate-y-0.5" style={{ color: lessonAccentHex }}>
                          <Bookmark size={14} /> Flashcards
                        </button>
                      </div>

                      {/* Practice Activities removed from ModuleDetailView rendering */}
                    </div>
                  </motion.div>

                  {standaloneQuiz && index === standaloneInsertIndex - 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + index * 0.03 }}
                      className="mt-8 mb-6"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest text-center">
                          mid-module checkpoint
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      <div className="relative rounded-[1.5rem] bg-[#533ab6] p-5 shadow-lg overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 text-white/5 text-[140px] font-black font-display pointer-events-none group-hover:scale-110 transition-transform duration-500">?</div>
                        
                        <div className="relative z-10 flex flex-wrap items-center gap-4 md:gap-5">
                          <div className="w-14 h-14 rounded-[14px] bg-white/10 backdrop-blur-md border border-white/10 shrink-0 flex items-center justify-center shadow-inner">
                            <Target size={28} className="text-rose-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#a3b1ee] mb-1 drop-shadow-sm">
                              Module Task • General Quiz
                            </p>
                            <h3 className="font-display font-medium text-[20px] md:text-[22px] text-white leading-tight mb-2 tracking-tight">
                              {standaloneQuiz.title}
                            </h3>
                            <p className="text-xs font-semibold text-white/80 flex items-center gap-3">
                              <span className="inline-flex items-center gap-1"><PenTool size={12} /> {standaloneQuiz.questions} Qs</span>
                              <span className="inline-flex items-center gap-1"><Clock size={12} /> {standaloneQuiz.duration}</span>
                              <span className="inline-flex items-center gap-1 text-amber-300 drop-shadow-md"><Zap size={12} className="fill-amber-300"/> +50 XP</span>
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => !standaloneQuiz.locked && setSelectedLesson({ quiz: standaloneQuiz, type: 'quiz' })}
                            className={`px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all backdrop-blur-sm self-center shrink-0 ${
                              standaloneQuiz.locked
                                ? 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                                : (completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed)
                                ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30 shadow-sm'
                                : 'bg-transparent text-white border border-white/40 hover:bg-white/10 shadow-sm'
                            }`}
                          >
                            {(completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed) ? 'REVIEW' : 'START'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}

            {module.lessons.length === 0 && standaloneQuiz && (
              <div className="relative rounded-[1.5rem] bg-[#533ab6] p-5 shadow-lg overflow-hidden group">
                <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 text-white/5 text-[140px] font-black font-display pointer-events-none group-hover:scale-110 transition-transform duration-500">?</div>
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 md:gap-5">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-[14px] bg-white/10 backdrop-blur-md border border-white/10 shrink-0 flex items-center justify-center shadow-inner">
                      <Target size={28} className="text-rose-400" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#a3b1ee] mb-1 drop-shadow-sm">Module Task • General Quiz</p>
                      <h3 className="font-display font-medium text-[20px] md:text-[22px] text-white leading-tight mb-2 tracking-tight">{standaloneQuiz.title}</h3>
                      <p className="text-xs font-semibold text-white/80 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><PenTool size={12} /> {standaloneQuiz.questions} Qs</span>
                        <span className="inline-flex items-center gap-1"><Clock size={12} /> {standaloneQuiz.duration}</span>
                        <span className="inline-flex items-center gap-1 text-amber-300 drop-shadow-md"><Zap size={12} className="fill-amber-300"/> +50 XP</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !standaloneQuiz.locked && setSelectedLesson({ quiz: standaloneQuiz, type: 'quiz' })}
                    className={`px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all backdrop-blur-sm self-center shrink-0 ${
                      standaloneQuiz.locked
                        ? 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                        : (completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed)
                        ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30 shadow-sm'
                        : 'bg-transparent text-white border border-white/40 hover:bg-white/10 shadow-sm'
                    }`}
                  >
                    {(completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed) ? 'REVIEW' : 'START'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailView;