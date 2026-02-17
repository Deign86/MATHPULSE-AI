import { Calculator, TrendingUp, BarChart3, Sigma } from 'lucide-react';

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  locked: boolean;
  videoUrl?: string;
  description?: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: number;
  duration: string;
  completed: boolean;
  score?: number;
  locked: boolean;
  type: 'practice' | 'module' | 'final';
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  quizzes: Quiz[];
  progress: number;
  color: string;
  iconColor: string;
  accentColor: string;
}

export interface Subject {
  id: string;
  title: string;
  description: string;
  modules: Module[];
  icon: any;
  color: string;
  iconColor: string;
  accentColor: string;
  progress: number;
  totalModules: number;
  completedModules: number;
}

export const subjects: Subject[] = [
  // GENERAL MATHEMATICS
  {
    id: 'general-math',
    title: 'General Mathematics',
    description: 'Master fundamental mathematical concepts including number systems, basic algebra, geometry, and problem-solving skills essential for advanced mathematics.',
    icon: Calculator,
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    accentColor: 'bg-indigo-600',
    progress: 45,
    totalModules: 6,
    completedModules: 2,
    modules: [
      {
        id: 'gm-1',
        title: 'Number Systems and Operations',
        description: 'Explore integers, rational and irrational numbers, and master arithmetic operations.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 100,
        lessons: [
          { id: 'gm-1-l1', title: 'Introduction to Number Systems', duration: '12 min', completed: true, locked: false },
          { id: 'gm-1-l2', title: 'Integers and Operations', duration: '15 min', completed: true, locked: false },
          { id: 'gm-1-l3', title: 'Rational Numbers', duration: '18 min', completed: true, locked: false },
          { id: 'gm-1-l4', title: 'Irrational Numbers', duration: '20 min', completed: true, locked: false },
          { id: 'gm-1-l5', title: 'Real Number Line', duration: '14 min', completed: true, locked: false },
        ],
        quizzes: [
          { id: 'gm-1-q1', title: 'Practice Quiz: Number Systems', questions: 10, duration: '15 min', completed: true, score: 90, locked: false, type: 'practice' },
          { id: 'gm-1-q2', title: 'Module Quiz: Number Operations', questions: 15, duration: '20 min', completed: true, score: 85, locked: false, type: 'module' },
        ]
      },
      {
        id: 'gm-2',
        title: 'Fractions, Decimals, and Percentages',
        description: 'Convert between fractions, decimals, and percentages and solve real-world problems.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 60,
        lessons: [
          { id: 'gm-2-l1', title: 'Understanding Fractions', duration: '16 min', completed: true, locked: false },
          { id: 'gm-2-l2', title: 'Decimal Numbers', duration: '14 min', completed: true, locked: false },
          { id: 'gm-2-l3', title: 'Converting Fractions to Decimals', duration: '18 min', completed: true, locked: false },
          { id: 'gm-2-l4', title: 'Percentages Basics', duration: '15 min', completed: false, locked: false },
          { id: 'gm-2-l5', title: 'Percentage Applications', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'gm-2-q1', title: 'Practice Quiz: Conversions', questions: 12, duration: '18 min', completed: true, score: 75, locked: false, type: 'practice' },
          { id: 'gm-2-q2', title: 'Module Quiz: Percentages', questions: 15, duration: '20 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'gm-3',
        title: 'Ratio, Proportion, and Variation',
        description: 'Learn ratio and proportion concepts and apply them to solve problems.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 25,
        lessons: [
          { id: 'gm-3-l1', title: 'Introduction to Ratios', duration: '14 min', completed: true, locked: false },
          { id: 'gm-3-l2', title: 'Proportions and Cross Multiplication', duration: '16 min', completed: false, locked: false },
          { id: 'gm-3-l3', title: 'Direct Variation', duration: '18 min', completed: false, locked: false },
          { id: 'gm-3-l4', title: 'Inverse Variation', duration: '18 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'gm-3-q1', title: 'Practice Quiz: Ratios', questions: 10, duration: '15 min', completed: false, locked: false, type: 'practice' },
          { id: 'gm-3-q2', title: 'Module Quiz: Variation', questions: 12, duration: '18 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'gm-4',
        title: 'Basic Algebra',
        description: 'Master algebraic expressions, equations, and inequalities.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 0,
        lessons: [
          { id: 'gm-4-l1', title: 'Variables and Expressions', duration: '15 min', completed: false, locked: false },
          { id: 'gm-4-l2', title: 'Solving Linear Equations', duration: '20 min', completed: false, locked: false },
          { id: 'gm-4-l3', title: 'Word Problems', duration: '22 min', completed: false, locked: false },
          { id: 'gm-4-l4', title: 'Inequalities', duration: '18 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'gm-4-q1', title: 'Practice Quiz: Equations', questions: 15, duration: '20 min', completed: false, locked: false, type: 'practice' },
          { id: 'gm-4-q2', title: 'Module Quiz: Algebra Basics', questions: 20, duration: '25 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'gm-5',
        title: 'Geometry Fundamentals',
        description: 'Study basic geometric shapes, angles, and measurement principles.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 0,
        lessons: [
          { id: 'gm-5-l1', title: 'Points, Lines, and Planes', duration: '14 min', completed: false, locked: false },
          { id: 'gm-5-l2', title: 'Angles and Their Measures', duration: '16 min', completed: false, locked: false },
          { id: 'gm-5-l3', title: 'Triangles and Polygons', duration: '20 min', completed: false, locked: false },
          { id: 'gm-5-l4', title: 'Perimeter and Area', duration: '18 min', completed: false, locked: false },
          { id: 'gm-5-l5', title: 'Circles', duration: '16 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'gm-5-q1', title: 'Practice Quiz: Shapes', questions: 12, duration: '18 min', completed: false, locked: false, type: 'practice' },
          { id: 'gm-5-q2', title: 'Module Quiz: Geometry', questions: 15, duration: '22 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'gm-6',
        title: 'Sets and Logic',
        description: 'Introduction to set theory, Venn diagrams, and logical reasoning.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 0,
        lessons: [
          { id: 'gm-6-l1', title: 'Introduction to Sets', duration: '15 min', completed: false, locked: false },
          { id: 'gm-6-l2', title: 'Set Operations', duration: '18 min', completed: false, locked: false },
          { id: 'gm-6-l3', title: 'Venn Diagrams', duration: '16 min', completed: false, locked: false },
          { id: 'gm-6-l4', title: 'Basic Logic', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'gm-6-q1', title: 'Practice Quiz: Sets', questions: 10, duration: '15 min', completed: false, locked: false, type: 'practice' },
          { id: 'gm-6-q2', title: 'Module Quiz: Logic', questions: 12, duration: '18 min', completed: false, locked: true, type: 'module' },
        ]
      },
    ]
  },

  // PRE-CALCULUS
  {
    id: 'pre-calculus',
    title: 'Pre-Calculus',
    description: 'Build a strong foundation in functions, trigonometry, and analytical geometry to prepare for calculus and advanced mathematics.',
    icon: TrendingUp,
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
    accentColor: 'bg-teal-500',
    progress: 65,
    totalModules: 7,
    completedModules: 3,
    modules: [
      {
        id: 'pc-1',
        title: 'Functions and Relations',
        description: 'Understand functions, their properties, and graphical representations.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 100,
        lessons: [
          { id: 'pc-1-l1', title: 'Introduction to Functions', duration: '18 min', completed: true, locked: false },
          { id: 'pc-1-l2', title: 'Function Notation', duration: '15 min', completed: true, locked: false },
          { id: 'pc-1-l3', title: 'Domain and Range', duration: '20 min', completed: true, locked: false },
          { id: 'pc-1-l4', title: 'Graphing Functions', duration: '22 min', completed: true, locked: false },
          { id: 'pc-1-l5', title: 'Transformations of Functions', duration: '24 min', completed: true, locked: false },
        ],
        quizzes: [
          { id: 'pc-1-q1', title: 'Practice Quiz: Function Basics', questions: 12, duration: '20 min', completed: true, score: 95, locked: false, type: 'practice' },
          { id: 'pc-1-q2', title: 'Module Quiz: Functions', questions: 18, duration: '25 min', completed: true, score: 88, locked: false, type: 'module' },
        ]
      },
      {
        id: 'pc-2',
        title: 'Polynomial and Rational Functions',
        description: 'Study polynomial and rational functions, their graphs, and applications.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 100,
        lessons: [
          { id: 'pc-2-l1', title: 'Polynomial Functions', duration: '20 min', completed: true, locked: false },
          { id: 'pc-2-l2', title: 'Factoring Polynomials', duration: '22 min', completed: true, locked: false },
          { id: 'pc-2-l3', title: 'Rational Functions', duration: '24 min', completed: true, locked: false },
          { id: 'pc-2-l4', title: 'Asymptotes', duration: '18 min', completed: true, locked: false },
        ],
        quizzes: [
          { id: 'pc-2-q1', title: 'Practice Quiz: Polynomials', questions: 15, duration: '22 min', completed: true, score: 82, locked: false, type: 'practice' },
          { id: 'pc-2-q2', title: 'Module Quiz: Rational Functions', questions: 18, duration: '28 min', completed: true, score: 90, locked: false, type: 'module' },
        ]
      },
      {
        id: 'pc-3',
        title: 'Exponential and Logarithmic Functions',
        description: 'Explore exponential growth and decay, logarithms, and their properties.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 70,
        lessons: [
          { id: 'pc-3-l1', title: 'Exponential Functions', duration: '20 min', completed: true, locked: false },
          { id: 'pc-3-l2', title: 'The Number e', duration: '16 min', completed: true, locked: false },
          { id: 'pc-3-l3', title: 'Logarithmic Functions', duration: '22 min', completed: true, locked: false },
          { id: 'pc-3-l4', title: 'Properties of Logarithms', duration: '18 min', completed: false, locked: false },
          { id: 'pc-3-l5', title: 'Exponential and Logarithmic Equations', duration: '24 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'pc-3-q1', title: 'Practice Quiz: Exponentials', questions: 14, duration: '20 min', completed: true, score: 78, locked: false, type: 'practice' },
          { id: 'pc-3-q2', title: 'Module Quiz: Logarithms', questions: 16, duration: '24 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'pc-4',
        title: 'Trigonometric Functions',
        description: 'Master trigonometric ratios, the unit circle, and trigonometric graphs.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 40,
        lessons: [
          { id: 'pc-4-l1', title: 'Angles and Radian Measure', duration: '18 min', completed: true, locked: false },
          { id: 'pc-4-l2', title: 'Right Triangle Trigonometry', duration: '20 min', completed: true, locked: false },
          { id: 'pc-4-l3', title: 'The Unit Circle', duration: '22 min', completed: false, locked: false },
          { id: 'pc-4-l4', title: 'Graphs of Sine and Cosine', duration: '24 min', completed: false, locked: false },
          { id: 'pc-4-l5', title: 'Other Trigonometric Functions', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'pc-4-q1', title: 'Practice Quiz: Trig Basics', questions: 12, duration: '18 min', completed: false, locked: false, type: 'practice' },
          { id: 'pc-4-q2', title: 'Module Quiz: Trigonometry', questions: 20, duration: '30 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'pc-5',
        title: 'Trigonometric Identities',
        description: 'Learn fundamental and advanced trigonometric identities.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 0,
        lessons: [
          { id: 'pc-5-l1', title: 'Fundamental Identities', duration: '20 min', completed: false, locked: false },
          { id: 'pc-5-l2', title: 'Sum and Difference Formulas', duration: '22 min', completed: false, locked: false },
          { id: 'pc-5-l3', title: 'Double-Angle Formulas', duration: '18 min', completed: false, locked: false },
          { id: 'pc-5-l4', title: 'Half-Angle Formulas', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'pc-5-q1', title: 'Practice Quiz: Identities', questions: 15, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'pc-5-q2', title: 'Module Quiz: Advanced Trig', questions: 18, duration: '28 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'pc-6',
        title: 'Conic Sections',
        description: 'Study circles, ellipses, parabolas, and hyperbolas.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 0,
        lessons: [
          { id: 'pc-6-l1', title: 'Introduction to Conics', duration: '16 min', completed: false, locked: false },
          { id: 'pc-6-l2', title: 'Circles', duration: '18 min', completed: false, locked: false },
          { id: 'pc-6-l3', title: 'Parabolas', duration: '22 min', completed: false, locked: false },
          { id: 'pc-6-l4', title: 'Ellipses', duration: '24 min', completed: false, locked: false },
          { id: 'pc-6-l5', title: 'Hyperbolas', duration: '24 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'pc-6-q1', title: 'Practice Quiz: Conics', questions: 14, duration: '20 min', completed: false, locked: false, type: 'practice' },
          { id: 'pc-6-q2', title: 'Module Quiz: Conic Sections', questions: 18, duration: '26 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'pc-7',
        title: 'Sequences and Series',
        description: 'Explore arithmetic and geometric sequences, and series.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 0,
        lessons: [
          { id: 'pc-7-l1', title: 'Arithmetic Sequences', duration: '18 min', completed: false, locked: false },
          { id: 'pc-7-l2', title: 'Geometric Sequences', duration: '20 min', completed: false, locked: false },
          { id: 'pc-7-l3', title: 'Arithmetic Series', duration: '22 min', completed: false, locked: false },
          { id: 'pc-7-l4', title: 'Geometric Series', duration: '22 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'pc-7-q1', title: 'Practice Quiz: Sequences', questions: 12, duration: '18 min', completed: false, locked: false, type: 'practice' },
          { id: 'pc-7-q2', title: 'Module Quiz: Series', questions: 16, duration: '24 min', completed: false, locked: true, type: 'module' },
        ]
      },
    ]
  },

  // STATISTICS AND PROBABILITY
  {
    id: 'statistics-probability',
    title: 'Statistics and Probability',
    description: 'Analyze data, understand probability distributions, and make informed decisions using statistical methods and probability theory.',
    icon: BarChart3,
    color: 'bg-purple-50',
    iconColor: 'text-purple-600',
    accentColor: 'bg-purple-500',
    progress: 30,
    totalModules: 6,
    completedModules: 1,
    modules: [
      {
        id: 'sp-1',
        title: 'Data Collection and Presentation',
        description: 'Learn methods of data collection and visual data representation.',
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
        accentColor: 'bg-purple-500',
        progress: 100,
        lessons: [
          { id: 'sp-1-l1', title: 'Types of Data', duration: '14 min', completed: true, locked: false },
          { id: 'sp-1-l2', title: 'Data Collection Methods', duration: '16 min', completed: true, locked: false },
          { id: 'sp-1-l3', title: 'Frequency Distributions', duration: '18 min', completed: true, locked: false },
          { id: 'sp-1-l4', title: 'Graphs and Charts', duration: '20 min', completed: true, locked: false },
        ],
        quizzes: [
          { id: 'sp-1-q1', title: 'Practice Quiz: Data Types', questions: 10, duration: '15 min', completed: true, score: 92, locked: false, type: 'practice' },
          { id: 'sp-1-q2', title: 'Module Quiz: Data Presentation', questions: 15, duration: '20 min', completed: true, score: 86, locked: false, type: 'module' },
        ]
      },
      {
        id: 'sp-2',
        title: 'Measures of Central Tendency',
        description: 'Calculate and interpret mean, median, and mode.',
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
        accentColor: 'bg-purple-500',
        progress: 50,
        lessons: [
          { id: 'sp-2-l1', title: 'The Mean', duration: '16 min', completed: true, locked: false },
          { id: 'sp-2-l2', title: 'The Median', duration: '14 min', completed: true, locked: false },
          { id: 'sp-2-l3', title: 'The Mode', duration: '12 min', completed: false, locked: false },
          { id: 'sp-2-l4', title: 'Choosing the Right Measure', duration: '18 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-2-q1', title: 'Practice Quiz: Central Tendency', questions: 12, duration: '18 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-2-q2', title: 'Module Quiz: Mean, Median, Mode', questions: 14, duration: '20 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'sp-3',
        title: 'Measures of Dispersion',
        description: 'Understand range, variance, and standard deviation.',
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
        accentColor: 'bg-purple-500',
        progress: 0,
        lessons: [
          { id: 'sp-3-l1', title: 'Range and Quartiles', duration: '16 min', completed: false, locked: false },
          { id: 'sp-3-l2', title: 'Variance', duration: '20 min', completed: false, locked: false },
          { id: 'sp-3-l3', title: 'Standard Deviation', duration: '22 min', completed: false, locked: false },
          { id: 'sp-3-l4', title: 'Box Plots', duration: '18 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-3-q1', title: 'Practice Quiz: Dispersion', questions: 14, duration: '20 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-3-q2', title: 'Module Quiz: Variance & SD', questions: 16, duration: '24 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'sp-4',
        title: 'Probability Theory',
        description: 'Master fundamental probability concepts and rules.',
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
        accentColor: 'bg-purple-500',
        progress: 0,
        lessons: [
          { id: 'sp-4-l1', title: 'Introduction to Probability', duration: '18 min', completed: false, locked: false },
          { id: 'sp-4-l2', title: 'Sample Spaces and Events', duration: '20 min', completed: false, locked: false },
          { id: 'sp-4-l3', title: 'Probability Rules', duration: '22 min', completed: false, locked: false },
          { id: 'sp-4-l4', title: 'Conditional Probability', duration: '24 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-4-q1', title: 'Practice Quiz: Probability Basics', questions: 15, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-4-q2', title: 'Module Quiz: Probability Theory', questions: 18, duration: '28 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'sp-5',
        title: 'Probability Distributions',
        description: 'Study discrete and continuous probability distributions.',
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
        accentColor: 'bg-purple-500',
        progress: 0,
        lessons: [
          { id: 'sp-5-l1', title: 'Discrete Random Variables', duration: '20 min', completed: false, locked: false },
          { id: 'sp-5-l2', title: 'Binomial Distribution', duration: '24 min', completed: false, locked: false },
          { id: 'sp-5-l3', title: 'Normal Distribution', duration: '26 min', completed: false, locked: false },
          { id: 'sp-5-l4', title: 'Standard Normal Distribution', duration: '22 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-5-q1', title: 'Practice Quiz: Distributions', questions: 16, duration: '24 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-5-q2', title: 'Module Quiz: Normal Distribution', questions: 20, duration: '30 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'sp-6',
        title: 'Hypothesis Testing',
        description: 'Introduction to statistical inference and hypothesis testing.',
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
        accentColor: 'bg-purple-500',
        progress: 0,
        lessons: [
          { id: 'sp-6-l1', title: 'Statistical Inference', duration: '20 min', completed: false, locked: false },
          { id: 'sp-6-l2', title: 'Null and Alternative Hypotheses', duration: '22 min', completed: false, locked: false },
          { id: 'sp-6-l3', title: 'Test Statistics', duration: '24 min', completed: false, locked: false },
          { id: 'sp-6-l4', title: 'p-Values and Conclusions', duration: '26 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-6-q1', title: 'Practice Quiz: Hypothesis Testing', questions: 14, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-6-q2', title: 'Module Quiz: Statistical Inference', questions: 18, duration: '28 min', completed: false, locked: true, type: 'module' },
        ]
      },
    ]
  },

  // BASIC CALCULUS
  {
    id: 'basic-calculus',
    title: 'Basic Calculus',
    description: 'Discover the fundamental concepts of calculus including limits, derivatives, and integrals, and their real-world applications.',
    icon: Sigma,
    color: 'bg-orange-50',
    iconColor: 'text-orange-600',
    accentColor: 'bg-orange-500',
    progress: 55,
    totalModules: 6,
    completedModules: 2,
    modules: [
      {
        id: 'bc-1',
        title: 'Limits and Continuity',
        description: 'Understand the concept of limits and continuity of functions.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 100,
        lessons: [
          { id: 'bc-1-l1', title: 'Introduction to Limits', duration: '20 min', completed: true, locked: false },
          { id: 'bc-1-l2', title: 'Limit Laws', duration: '22 min', completed: true, locked: false },
          { id: 'bc-1-l3', title: 'One-Sided Limits', duration: '18 min', completed: true, locked: false },
          { id: 'bc-1-l4', title: 'Continuity', duration: '20 min', completed: true, locked: false },
          { id: 'bc-1-l5', title: 'Limits at Infinity', duration: '24 min', completed: true, locked: false },
        ],
        quizzes: [
          { id: 'bc-1-q1', title: 'Practice Quiz: Limits', questions: 12, duration: '20 min', completed: true, score: 88, locked: false, type: 'practice' },
          { id: 'bc-1-q2', title: 'Module Quiz: Continuity', questions: 16, duration: '25 min', completed: true, score: 92, locked: false, type: 'module' },
        ]
      },
      {
        id: 'bc-2',
        title: 'Introduction to Derivatives',
        description: 'Learn the definition and interpretation of derivatives.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 100,
        lessons: [
          { id: 'bc-2-l1', title: 'The Derivative Concept', duration: '22 min', completed: true, locked: false },
          { id: 'bc-2-l2', title: 'Derivative as a Rate of Change', duration: '20 min', completed: true, locked: false },
          { id: 'bc-2-l3', title: 'The Power Rule', duration: '18 min', completed: true, locked: false },
          { id: 'bc-2-l4', title: 'Product and Quotient Rules', duration: '24 min', completed: true, locked: false },
        ],
        quizzes: [
          { id: 'bc-2-q1', title: 'Practice Quiz: Basic Derivatives', questions: 14, duration: '22 min', completed: true, score: 85, locked: false, type: 'practice' },
          { id: 'bc-2-q2', title: 'Module Quiz: Derivative Rules', questions: 18, duration: '28 min', completed: true, score: 90, locked: false, type: 'module' },
        ]
      },
      {
        id: 'bc-3',
        title: 'Advanced Differentiation',
        description: 'Master the chain rule and implicit differentiation.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 60,
        lessons: [
          { id: 'bc-3-l1', title: 'The Chain Rule', duration: '24 min', completed: true, locked: false },
          { id: 'bc-3-l2', title: 'Implicit Differentiation', duration: '26 min', completed: true, locked: false },
          { id: 'bc-3-l3', title: 'Derivatives of Trig Functions', duration: '22 min', completed: true, locked: false },
          { id: 'bc-3-l4', title: 'Derivatives of Exponential Functions', duration: '20 min', completed: false, locked: false },
          { id: 'bc-3-l5', title: 'Derivatives of Logarithmic Functions', duration: '22 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'bc-3-q1', title: 'Practice Quiz: Chain Rule', questions: 15, duration: '24 min', completed: true, score: 78, locked: false, type: 'practice' },
          { id: 'bc-3-q2', title: 'Module Quiz: Advanced Derivatives', questions: 20, duration: '30 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'bc-4',
        title: 'Applications of Derivatives',
        description: 'Apply derivatives to solve optimization and related rates problems.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 25,
        lessons: [
          { id: 'bc-4-l1', title: 'Critical Points', duration: '20 min', completed: true, locked: false },
          { id: 'bc-4-l2', title: 'Maximum and Minimum Values', duration: '24 min', completed: false, locked: false },
          { id: 'bc-4-l3', title: 'Optimization Problems', duration: '28 min', completed: false, locked: false },
          { id: 'bc-4-l4', title: 'Related Rates', duration: '26 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'bc-4-q1', title: 'Practice Quiz: Optimization', questions: 12, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'bc-4-q2', title: 'Module Quiz: Applications', questions: 16, duration: '28 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'bc-5',
        title: 'Introduction to Integration',
        description: 'Learn antiderivatives and the fundamental theorem of calculus.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 0,
        lessons: [
          { id: 'bc-5-l1', title: 'Antiderivatives', duration: '20 min', completed: false, locked: false },
          { id: 'bc-5-l2', title: 'The Definite Integral', duration: '24 min', completed: false, locked: false },
          { id: 'bc-5-l3', title: 'Fundamental Theorem of Calculus', duration: '28 min', completed: false, locked: false },
          { id: 'bc-5-l4', title: 'Integration Techniques', duration: '26 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'bc-5-q1', title: 'Practice Quiz: Antiderivatives', questions: 14, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'bc-5-q2', title: 'Module Quiz: Integration', questions: 18, duration: '28 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'bc-6',
        title: 'Applications of Integration',
        description: 'Use integration to find areas, volumes, and solve applied problems.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 0,
        lessons: [
          { id: 'bc-6-l1', title: 'Area Between Curves', duration: '24 min', completed: false, locked: false },
          { id: 'bc-6-l2', title: 'Volumes of Solids of Revolution', duration: '28 min', completed: false, locked: false },
          { id: 'bc-6-l3', title: 'Arc Length', duration: '22 min', completed: false, locked: false },
          { id: 'bc-6-l4', title: 'Applications to Physics', duration: '26 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'bc-6-q1', title: 'Practice Quiz: Areas & Volumes', questions: 15, duration: '24 min', completed: false, locked: false, type: 'practice' },
          { id: 'bc-6-q2', title: 'Module Quiz: Integration Applications', questions: 20, duration: '32 min', completed: false, locked: true, type: 'module' },
        ]
      },
    ]
  },
];
