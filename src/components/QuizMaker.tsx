import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Brain, Sparkles, BookOpen, BarChart3, Target, ChevronDown,
  ChevronRight, Plus, Minus, Eye, Wand2, Download, Copy, Check,
  AlertCircle, Loader2, GraduationCap, Layers, TrendingUp,
  FileText, Calculator, ChevronUp, Info, Lightbulb,
  Save, Send, Library, Trash2, Users, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  apiService,
  type QuizGenerationRequest,
  type QuizGenerationResponse,
  type QuizQuestionGenerated,
  type QuestionType,
  type BloomLevel,
  type DifficultyLevel,
} from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import {
  saveGeneratedQuiz,
  publishQuiz,
  assignQuizToStudent,
  fetchQuizzesByTeacher,
  deleteGeneratedQuiz,
} from '../services/quizService';
import { getStudentsByTeacher, type ManagedStudent } from '../services/studentService';
import type { GeneratedQuiz, AIQuizQuestion, GeneratedQuizStatus } from '../types/models';

// ─── Types ──────────────────────────────────────────────────

interface QuizMakerProps {
  onClose: () => void;
  gradeLevel?: string;
}

type Step = 'configure' | 'preview' | 'results';
type MakerTab = 'create' | 'bank';

const STATUS_COLORS: Record<GeneratedQuizStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-green-100 text-green-700',
  assigned: 'bg-blue-100 text-blue-700',
  completed: 'bg-violet-100 text-violet-700',
};

const QUESTION_TYPE_LABELS: Record<QuestionType, { label: string; icon: React.ReactNode; description: string }> = {
  identification: { label: 'Identification', icon: <FileText size={16} />, description: 'Define or identify concepts' },
  enumeration: { label: 'Enumeration', icon: <Layers size={16} />, description: 'List steps or properties' },
  multiple_choice: { label: 'Multiple Choice', icon: <Check size={16} />, description: 'Choose from 4 options' },
  word_problem: { label: 'Word Problem', icon: <BookOpen size={16} />, description: 'Real-world scenarios' },
  equation_based: { label: 'Equation-Based', icon: <Calculator size={16} />, description: 'Solve equations' },
};

const BLOOM_LABELS: Record<BloomLevel, { label: string; color: string; description: string }> = {
  remember: { label: 'Remember', color: 'bg-blue-100 text-blue-700 border-blue-300', description: 'Recall facts & formulas' },
  understand: { label: 'Understand', color: 'bg-green-100 text-green-700 border-green-300', description: 'Explain concepts' },
  apply: { label: 'Apply', color: 'bg-amber-100 text-amber-700 border-amber-300', description: 'Use in new contexts' },
  analyze: { label: 'Analyze', color: 'bg-purple-100 text-purple-700 border-purple-300', description: 'Examine & compare' },
};

const GRADE_LEVELS = ['Grade 11', 'Grade 12'];

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: 'text-green-600',
  medium: 'text-amber-600',
  hard: 'text-red-600',
};

// ─── Component ──────────────────────────────────────────────

const QuizMaker: React.FC<QuizMakerProps> = ({ onClose, gradeLevel: initialGrade }) => {
  const { currentUser } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<MakerTab>('create');

  // Form state
  const [step, setStep] = useState<Step>('configure');
  const [selectedGrade, setSelectedGrade] = useState(initialGrade || 'Grade 11');
  const [numQuestions, setNumQuestions] = useState(10);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [excludeTopics, setExcludeTopics] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['multiple_choice', 'word_problem', 'identification']);
  const [selectedBlooms, setSelectedBlooms] = useState<BloomLevel[]>(['remember', 'understand', 'apply', 'analyze']);
  const [includeGraphs, setIncludeGraphs] = useState(false);
  const [difficultyDist, setDifficultyDist] = useState<Record<DifficultyLevel, number>>({ easy: 30, medium: 50, hard: 20 });

  // Available topics from API
  const [availableTopics, setAvailableTopics] = useState<Record<string, string[]>>({});
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizGenerationResponse | null>(null);
  const [previewResult, setPreviewResult] = useState<QuizGenerationResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // UI state
  const [expandedSection, setExpandedSection] = useState<string | null>('topics');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Save / Assign / Publish state
  const [saving, setSaving] = useState(false);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [students, setStudents] = useState<ManagedStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Quiz Bank state
  const [bankQuizzes, setBankQuizzes] = useState<GeneratedQuiz[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankFilter, setBankFilter] = useState<GeneratedQuizStatus | 'all'>('all');
  const [bankAssignQuizId, setBankAssignQuizId] = useState<string | null>(null);

  // Load topics when grade changes
  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const response = await apiService.getQuizTopics(selectedGrade);
      if (response.topics) {
        setAvailableTopics(response.topics);
      }
    } catch {
      // Fallback topics if API fails — aligned with SHS curriculum
      setAvailableTopics({
        'General Mathematics - Functions and Their Graphs': ['Functions and Relations', 'Evaluating Functions', 'Operations on Functions', 'Composite Functions', 'Inverse Functions', 'Rational Functions', 'Exponential Functions', 'Logarithmic Functions'],
        'General Mathematics - Business Mathematics': ['Simple Interest', 'Compound Interest', 'Annuities', 'Loans and Amortization', 'Stocks and Bonds'],
        'General Mathematics - Logic': ['Propositions and Connectives', 'Truth Tables', 'Logical Equivalence', 'Valid Arguments and Fallacies'],
        'Statistics and Probability - Random Variables': ['Random Variables', 'Discrete Probability Distributions', 'Mean and Variance of Discrete RV'],
        'Statistics and Probability - Normal Distribution': ['Normal Distribution', 'Standard Normal Distribution and Z-scores', 'Areas Under the Normal Curve'],
        'Statistics and Probability - Sampling and Estimation': ['Sampling Distributions', 'Central Limit Theorem', 'Point Estimation', 'Confidence Intervals'],
        'Statistics and Probability - Hypothesis Testing': ['Hypothesis Testing Concepts', 'T-test', 'Z-test', 'Correlation and Regression'],
        'Pre-Calculus - Analytic Geometry': ['Conic Sections - Parabola', 'Conic Sections - Ellipse', 'Conic Sections - Hyperbola', 'Conic Sections - Circle', 'Systems of Nonlinear Equations'],
        'Pre-Calculus - Series and Induction': ['Sequences and Series', 'Arithmetic Sequences', 'Geometric Sequences', 'Mathematical Induction', 'Binomial Theorem'],
        'Pre-Calculus - Trigonometry': ['Angles and Unit Circle', 'Trigonometric Functions', 'Trigonometric Identities', 'Sum and Difference Formulas', 'Inverse Trigonometric Functions', 'Polar Coordinates'],
        'Basic Calculus - Limits': ['Limits of Functions', 'Limit Theorems', 'One-Sided Limits', 'Infinite Limits and Limits at Infinity', 'Continuity of Functions'],
        'Basic Calculus - Derivatives': ['Definition of the Derivative', 'Differentiation Rules', 'Chain Rule', 'Implicit Differentiation', 'Higher-Order Derivatives', 'Related Rates', 'Extrema and the First Derivative Test', 'Concavity and the Second Derivative Test', 'Optimization Problems'],
        'Basic Calculus - Integration': ['Antiderivatives and Indefinite Integrals', 'Definite Integrals and the FTC', 'Integration by Substitution', 'Area Under a Curve'],
      });
    } finally {
      setTopicsLoading(false);
    }
  }, [selectedGrade]);

  useEffect(() => {
    loadTopics();
    setSelectedTopics([]);
    setExcludeTopics([]);
  }, [loadTopics]);

  // Difficulty adjustment
  const adjustDifficulty = (key: DifficultyLevel, delta: number) => {
    const newDist = { ...difficultyDist };
    const newVal = Math.max(0, Math.min(100, newDist[key] + delta));
    const diff = newVal - newDist[key];
    newDist[key] = newVal;

    // Redistribute to maintain sum = 100
    const others = Object.keys(newDist).filter(k => k !== key) as DifficultyLevel[];
    const othersTotal = others.reduce((s, k) => s + newDist[k], 0);
    if (othersTotal > 0) {
      for (const k of others) {
        newDist[k] = Math.max(0, Math.round(newDist[k] - (diff * newDist[k]) / othersTotal));
      }
    }

    // Fix rounding
    const total = Object.values(newDist).reduce((s, v) => s + v, 0);
    if (total !== 100) {
      const largest = others.reduce((a, b) => (newDist[a] >= newDist[b] ? a : b));
      newDist[largest] += 100 - total;
    }

    setDifficultyDist(newDist);
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
    // Remove from exclude if added
    setExcludeTopics(prev => prev.filter(t => t !== topic));
  };

  const toggleExclude = (topic: string) => {
    setExcludeTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
    // Remove from selected if excluded
    setSelectedTopics(prev => prev.filter(t => t !== topic));
  };

  const toggleType = (type: QuestionType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.length > 1 ? prev.filter(t => t !== type) : prev;
      }
      return [...prev, type];
    });
  };

  const toggleBloom = (level: BloomLevel) => {
    setSelectedBlooms(prev => {
      if (prev.includes(level)) {
        return prev.length > 1 ? prev.filter(l => l !== level) : prev;
      }
      return [...prev, level];
    });
  };

  const buildRequest = (): QuizGenerationRequest => ({
    topics: selectedTopics.length > 0 ? selectedTopics : Object.values(availableTopics).flat().slice(0, 3),
    gradeLevel: selectedGrade,
    numQuestions,
    questionTypes: selectedTypes,
    includeGraphs,
    difficultyDistribution: difficultyDist,
    bloomLevels: selectedBlooms,
    excludeTopics,
  });

  const handlePreview = async () => {
    setError('');
    setPreviewing(true);
    setPreviewResult(null);
    try {
      const result = await apiService.previewQuiz(buildRequest());
      setPreviewResult(result);
      setStep('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Preview generation failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    setQuizResult(null);
    try {
      const result = await apiService.generateQuiz(buildRequest());
      setQuizResult(result);
      setStep('results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Quiz generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyQuiz = () => {
    if (!quizResult) return;
    const text = quizResult.questions.map((q, i) => {
      let out = `${i + 1}. [${q.difficulty.toUpperCase()}] [${q.bloomLevel}] (${q.points} pts)\n`;
      out += `   ${q.question}\n`;
      if (q.options) {
        out += q.options.map(o => `   ${o}`).join('\n') + '\n';
      }
      out += `   Answer: ${q.correctAnswer}\n`;
      out += `   Explanation: ${q.explanation}\n`;
      return out;
    }).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJSON = () => {
    if (!quizResult) return;
    const blob = new Blob([JSON.stringify(quizResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_${selectedGrade.replace(/\s/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isFormValid = selectedTopics.length > 0 || Object.values(availableTopics).flat().length > 0;

  // ─── Save / Publish / Assign Handlers ─────────────────────

  /** Convert API QuizGenerationResponse to a storable GeneratedQuiz shape */
  const buildGeneratedQuiz = (result: QuizGenerationResponse): Omit<GeneratedQuiz, 'id'> => {
    const questions: AIQuizQuestion[] = result.questions.map((q, i) => ({
      id: `q_${Date.now()}_${i}`,
      questionType: (q.questionType as AIQuizQuestion['questionType']) || 'identification',
      question: q.question,
      options: q.options ?? undefined,
      correctAnswer: q.correctAnswer,
      bloomLevel: (q.bloomLevel as AIQuizQuestion['bloomLevel']) || 'understand',
      difficulty: (q.difficulty as AIQuizQuestion['difficulty']) || 'medium',
      topic: q.topic,
      subject: selectedGrade,
      points: q.points,
      explanation: q.explanation,
    }));

    return {
      title: `${selectedGrade} Quiz – ${selectedTopics.length > 0 ? selectedTopics.slice(0, 2).join(', ') : 'Mixed Topics'}`,
      gradeLevel: selectedGrade,
      questions,
      totalPoints: result.totalPoints,
      metadata: {
        topicsCovered: Object.keys(result.metadata.topicsCovered),
        difficultyBreakdown: {
          easy: result.metadata.difficultyBreakdown['easy'] ?? 0,
          medium: result.metadata.difficultyBreakdown['medium'] ?? 0,
          hard: result.metadata.difficultyBreakdown['hard'] ?? 0,
        },
        bloomDistribution: result.metadata.bloomTaxonomyDistribution,
        questionTypeBreakdown: result.metadata.questionTypeBreakdown,
        supplementalPurpose: result.metadata.supplementalPurpose,
        recommendedTeacherActions: result.metadata.recommendedTeacherActions ?? [],
        generatedAt: new Date().toISOString(),
        generatedBy: 'teacher_generated',
      },
      status: 'draft',
      source: 'teacher_generated',
    };
  };

  const handleSaveToLibrary = async () => {
    if (!quizResult || !currentUser) return;
    setSaving(true);
    try {
      const quizData = buildGeneratedQuiz(quizResult);
      const id = await saveGeneratedQuiz(quizData, currentUser.uid);
      setSavedQuizId(id);
      toast.success('Quiz saved to your library!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!savedQuizId) return;
    setPublishing(true);
    try {
      await publishQuiz(savedQuizId);
      toast.success('Quiz published to Quiz Bank!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish quiz');
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenAssign = async (quizId?: string) => {
    const id = quizId ?? savedQuizId;
    if (!id) {
      toast.error('Save the quiz first before assigning.');
      return;
    }
    setBankAssignQuizId(id);
    setShowAssignModal(true);
    setSelectedStudentId(null);
    setStudentSearch('');

    if (students.length === 0 && currentUser) {
      setStudentsLoading(true);
      try {
        const s = await getStudentsByTeacher(currentUser.uid);
        setStudents(s);
      } catch {
        toast.error('Failed to load students');
      } finally {
        setStudentsLoading(false);
      }
    }
  };

  const handleAssign = async () => {
    const quizId = bankAssignQuizId ?? savedQuizId;
    if (!selectedStudentId || !quizId || !currentUser) return;
    setAssigning(true);
    try {
      await assignQuizToStudent(quizId, selectedStudentId, currentUser.uid);
      toast.success('Quiz assigned to student!');
      setShowAssignModal(false);
      setBankAssignQuizId(null);
      // Refresh bank if open
      if (activeTab === 'bank') loadBankQuizzes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign quiz');
    } finally {
      setAssigning(false);
    }
  };

  // ─── Quiz Bank Loader ─────────────────────────────────────

  const loadBankQuizzes = useCallback(async () => {
    if (!currentUser) return;
    setBankLoading(true);
    try {
      const quizzes = await fetchQuizzesByTeacher(currentUser.uid);
      setBankQuizzes(quizzes);
    } catch {
      toast.error('Failed to load quiz bank');
    } finally {
      setBankLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'bank') loadBankQuizzes();
  }, [activeTab, loadBankQuizzes]);

  const handleDeleteBankQuiz = async (quizId: string) => {
    try {
      await deleteGeneratedQuiz(quizId);
      setBankQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      toast.success('Quiz deleted');
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  const filteredStudents = students.filter(
    (s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  const filteredBankQuizzes = bankFilter === 'all' ? bankQuizzes : bankQuizzes.filter((q) => q.status === bankFilter);

  // ─── Render ────────────────────────────────────────────────

  const renderSection = (id: string, title: string, icon: React.ReactNode, children: React.ReactNode) => {
    const isOpen = expandedSection === id;
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(isOpen ? null : id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            {icon}
            {title}
          </div>
          {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderQuestionCard = (q: QuizQuestionGenerated, index: number, showAnswer: boolean) => {
    const isExpanded = expandedQuestion === index;
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="border border-slate-200 rounded-xl overflow-hidden"
      >
        <div
          className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setExpandedQuestion(isExpanded ? null : index)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold text-white bg-slate-500 px-2 py-0.5 rounded">Q{index + 1}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${BLOOM_LABELS[q.bloomLevel as BloomLevel]?.color || 'bg-slate-100 text-slate-600'}`}>
                  {q.bloomLevel}
                </span>
                <span className={`text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty as DifficultyLevel] || 'text-slate-600'}`}>
                  {q.difficulty}
                </span>
                <span className="text-xs text-slate-400">{q.points} pts</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{q.topic}</span>
              </div>
              <p className="text-sm text-slate-800 font-medium">{q.question}</p>
            </div>
            <div className="flex-shrink-0 mt-1">
              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-100 overflow-hidden"
            >
              <div className="p-4 space-y-3 bg-slate-50/50">
                {q.options && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Options:</p>
                    <div className="space-y-1">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`text-sm px-3 py-1.5 rounded-lg ${
                            showAnswer && opt.includes(q.correctAnswer)
                              ? 'bg-green-100 text-green-800 font-medium'
                              : 'bg-white text-slate-700'
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {showAnswer && (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-700 mb-1">Correct Answer:</p>
                      <p className="text-sm text-green-800 font-medium">{q.correctAnswer}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Explanation:</p>
                      <p className="text-sm text-blue-800">{q.explanation}</p>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Type: {QUESTION_TYPE_LABELS[q.questionType as QuestionType]?.label || q.questionType}</span>
                  <span>Bloom: {q.bloomLevel}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Quiz Maker</h2>
                <p className="text-violet-200 text-sm">Generate AI-powered assessments with Bloom's Taxonomy</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'create' ? 'bg-white text-violet-700' : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              <Wand2 size={14} /> Create Quiz
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'bank' ? 'bg-white text-violet-700' : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              <Library size={14} /> Quiz Bank
            </button>
          </div>

          {/* Step indicator (Create tab only) */}
          {activeTab === 'create' && (
            <div className="flex items-center gap-2 mt-3">
              {(['configure', 'preview', 'results'] as Step[]).map((s, i) => (
                <React.Fragment key={s}>
                  <button
                    onClick={() => {
                      if (s === 'configure') setStep('configure');
                      if (s === 'preview' && previewResult) setStep('preview');
                      if (s === 'results' && quizResult) setStep('results');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      step === s ? 'bg-white/90 text-violet-700' : 'bg-white/15 text-white/70 hover:bg-white/25'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === s ? 'bg-violet-600 text-white' : 'bg-white/30'
                    }`}>{i + 1}</span>
                    {s === 'configure' ? 'Configure' : s === 'preview' ? 'Preview' : 'Full Quiz'}
                  </button>
                  {i < 2 && <ChevronRight size={14} className="text-white/40" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ═══ QUIZ BANK TAB ═══ */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              {/* Bank Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'draft', 'published', 'assigned', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBankFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                      bankFilter === f ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {bankLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-violet-500" />
                  <span className="ml-2 text-sm text-slate-500">Loading quiz bank…</span>
                </div>
              ) : filteredBankQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Library size={40} className="mb-3" />
                  <p className="font-medium">No quizzes found</p>
                  <p className="text-xs mt-1">Generate your first quiz in the Create tab</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBankQuizzes.map((q) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-bold text-slate-800 leading-tight">{q.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[q.status]}`}>
                          {q.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {q.metadata.topicsCovered.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        <span>{q.questions.length} questions</span>
                        <span>{q.totalPoints} pts</span>
                        <span>{q.gradeLevel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenAssign(q.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
                        >
                          <Send size={12} /> Assign
                        </button>
                        <button
                          onClick={() => handleDeleteBankQuiz(q.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ CREATE QUIZ TAB ═══ */}
          {activeTab === 'create' && (<>
          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <button onClick={() => setError('')} className="ml-auto">
                <X size={14} className="text-red-400" />
              </button>
            </motion.div>
          )}

          {/* ─── STEP: CONFIGURE ─── */}
          {step === 'configure' && (
            <div className="space-y-4">
              {/* Supplemental notice */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                <Lightbulb size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Supplemental Assessment Tool</p>
                  <p className="text-xs text-indigo-600">
                    This quiz maker generates supplemental assessments to support your classroom instruction — 
                    it does not replace teacher-led learning. Questions follow Bloom's Taxonomy for comprehensive skill evaluation.
                  </p>
                </div>
              </div>

              {/* Grade + Question Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Grade Level</label>
                  <select
                    value={selectedGrade}
                    onChange={e => setSelectedGrade(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  >
                    {GRADE_LEVELS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Number of Questions</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setNumQuestions(Math.max(1, numQuestions - 1))}
                      className="w-9 h-9 border border-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={numQuestions}
                      onChange={e => setNumQuestions(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                    <button
                      onClick={() => setNumQuestions(Math.min(50, numQuestions + 1))}
                      className="w-9 h-9 border border-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Topics */}
              {renderSection('topics', 'Topics', <BookOpen size={16} />, (
                <div className="space-y-3">
                  {topicsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> Loading topics...
                    </div>
                  ) : (
                    Object.entries(availableTopics).map(([category, subtopics]) => (
                      <div key={category}>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {subtopics.map(topic => {
                            const isSelected = selectedTopics.includes(topic);
                            const isExcluded = excludeTopics.includes(topic);
                            return (
                              <div key={topic} className="flex items-center gap-1">
                                <button
                                  onClick={() => toggleTopic(topic)}
                                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                    isSelected
                                      ? 'bg-violet-100 border-violet-400 text-violet-700 font-medium'
                                      : isExcluded
                                      ? 'bg-red-50 border-red-200 text-red-400 line-through'
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                                  }`}
                                >
                                  {topic}
                                </button>
                                <button
                                  onClick={() => toggleExclude(topic)}
                                  title={isExcluded ? 'Include this topic' : 'Exclude this topic'}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors ${
                                    isExcluded
                                      ? 'bg-red-500 text-white'
                                      : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500'
                                  }`}
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                  {selectedTopics.length > 0 && (
                    <p className="text-xs text-violet-600 mt-2">
                      {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                  {excludeTopics.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      {excludeTopics.length} topic{excludeTopics.length !== 1 ? 's' : ''} excluded (class already competent)
                    </p>
                  )}
                </div>
              ))}

              {/* Question Types */}
              {renderSection('types', 'Question Types', <FileText size={16} />, (
                <div className="space-y-2">
                  {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, typeof QUESTION_TYPE_LABELS[QuestionType]][]).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                        selectedTypes.includes(type)
                          ? 'bg-violet-50 border-violet-300 text-violet-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-violet-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedTypes.includes(type) ? 'bg-violet-200' : 'bg-slate-100'
                      }`}>
                        {info.icon}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{info.label}</span>
                        <p className="text-xs text-slate-400">{info.description}</p>
                      </div>
                      {selectedTypes.includes(type) && <Check size={16} className="text-violet-600" />}
                    </button>
                  ))}

                  {/* Graph toggle */}
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors mt-3">
                    <input
                      type="checkbox"
                      checked={includeGraphs}
                      onChange={e => setIncludeGraphs(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">Include Graph Questions</span>
                      <p className="text-xs text-slate-400">
                        Generates identification-type questions about graphs (text-described, as graphing is challenging for students)
                      </p>
                    </div>
                  </label>
                </div>
              ))}

              {/* Bloom's Taxonomy */}
              {renderSection('bloom', "Bloom's Taxonomy Levels", <GraduationCap size={16} />, (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-500">
                        Bloom's Taxonomy ensures questions assess different cognitive levels — from basic fact recall
                        to complex analysis — providing comprehensive skill evaluation.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(BLOOM_LABELS) as [BloomLevel, typeof BLOOM_LABELS[BloomLevel]][]).map(([level, info]) => (
                      <button
                        key={level}
                        onClick={() => toggleBloom(level)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                          selectedBlooms.includes(level)
                            ? info.color + ' font-medium'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <span className="text-sm">{info.label}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{info.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Difficulty Distribution */}
              {renderSection('difficulty', 'Difficulty Distribution', <BarChart3 size={16} />, (
                <div className="space-y-4">
                  {(Object.entries(difficultyDist) as [DifficultyLevel, number][]).map(([level, pct]) => (
                    <div key={level} className="flex items-center gap-4">
                      <span className={`text-sm font-medium w-16 capitalize ${DIFFICULTY_COLORS[level]}`}>{level}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${
                            level === 'easy' ? 'bg-green-500' : level === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustDifficulty(level, -5)}
                          className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-400"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-sm font-bold w-10 text-center">{pct}%</span>
                        <button
                          onClick={() => adjustDifficulty(level, 5)}
                          className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-400"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 text-center">
                    Total: {Object.values(difficultyDist).reduce((a, b) => a + b, 0)}%
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ─── STEP: PREVIEW ─── */}
          {step === 'preview' && previewResult && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Eye size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Preview Mode</p>
                  <p className="text-xs text-amber-600">
                    Showing {previewResult.questions.length} sample questions with answers visible.
                    Review quality before generating the full quiz.
                  </p>
                </div>
              </div>

              {previewResult.questions.map((q, i) => renderQuestionCard(q, i, true))}

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Preview Metadata</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>Topics: {Object.keys(previewResult.metadata.topicsCovered).join(', ')}</span>
                  <span>Total Points: {previewResult.totalPoints}</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP: RESULTS ─── */}
          {step === 'results' && quizResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Quiz Generated</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyQuiz}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy All'}
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download size={14} />
                      Export JSON
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-violet-600">{quizResult.questions.length}</p>
                    <p className="text-xs text-slate-500">Questions</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{quizResult.totalPoints}</p>
                    <p className="text-xs text-slate-500">Total Points</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {Object.keys(quizResult.metadata.topicsCovered).length}
                    </p>
                    <p className="text-xs text-slate-500">Topics</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-cyan-600">
                      {Object.keys(quizResult.metadata.bloomTaxonomyDistribution).length}
                    </p>
                    <p className="text-xs text-slate-500">Bloom Levels</p>
                  </div>
                </div>

                {/* Distribution breakdowns */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Difficulty</p>
                    {Object.entries(quizResult.metadata.difficultyBreakdown).map(([d, c]) => (
                      <div key={d} className="flex justify-between text-xs">
                        <span className={`capitalize ${DIFFICULTY_COLORS[d as DifficultyLevel] || 'text-slate-600'}`}>{d}</span>
                        <span className="font-medium">{c}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Bloom's Taxonomy</p>
                    {Object.entries(quizResult.metadata.bloomTaxonomyDistribution).map(([b, c]) => (
                      <div key={b} className="flex justify-between text-xs">
                        <span className="capitalize">{b}</span>
                        <span className="font-medium">{c}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Question Types</p>
                    {Object.entries(quizResult.metadata.questionTypeBreakdown).map(([t, c]) => (
                      <div key={t} className="flex justify-between text-xs">
                        <span>{QUESTION_TYPE_LABELS[t as QuestionType]?.label || t}</span>
                        <span className="font-medium">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supplemental purpose */}
                <div className="mt-3 bg-indigo-50 rounded-lg p-3 flex items-start gap-2">
                  <Info size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-600">{quizResult.metadata.supplementalPurpose}</p>
                </div>

                {/* Teacher recommendations */}
                {quizResult.metadata.recommendedTeacherActions && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Recommended Actions:</p>
                    <ul className="list-disc list-inside text-xs text-slate-500 space-y-0.5">
                      {quizResult.metadata.recommendedTeacherActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {quizResult.questions.map((q, i) => renderQuestionCard(q, i, true))}
              </div>
            </div>
          )}
          </>)}
        </div>

        {/* Footer (Create tab only) */}
        {activeTab === 'create' && (
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-400">
            {step === 'configure' && (
              <span className="flex items-center gap-1">
                <Sparkles size={12} /> Powered by Meta-Llama-3-8B-Instruct
              </span>
            )}
            {step === 'preview' && <span>Preview: {previewResult?.questions.length || 0} sample questions</span>}
            {step === 'results' && <span>{quizResult?.questions.length || 0} questions • {quizResult?.totalPoints || 0} points</span>}
          </div>

          <div className="flex items-center gap-3">
            {step === 'configure' && (
              <>
                <button
                  onClick={handlePreview}
                  disabled={!isFormValid || previewing}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isFormValid && !previewing
                      ? 'bg-white border border-violet-300 text-violet-700 hover:bg-violet-50'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {previewing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                  Preview (3 Qs)
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!isFormValid || generating}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isFormValid && !generating
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-200'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  Generate Quiz
                </button>
              </>
            )}

            {step === 'preview' && (
              <>
                <button
                  onClick={() => setStep('configure')}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Back to Configure
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-200 transition-all"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  Generate Full Quiz ({numQuestions} Qs)
                </button>
              </>
            )}

            {step === 'results' && (
              <>
                <button
                  onClick={() => {
                    setStep('configure');
                    setQuizResult(null);
                    setPreviewResult(null);
                    setSavedQuizId(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Create Another
                </button>

                {/* Save to Library */}
                {!savedQuizId ? (
                  <button
                    onClick={handleSaveToLibrary}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save to Library
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      {publishing ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                      Publish
                    </button>
                    <button
                      onClick={() => handleOpenAssign()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-50 border border-violet-300 text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      <Send size={16} /> Assign
                    </button>
                  </>
                )}

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white transition-all"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
        )}
      </motion.div>

      {/* ═══ ASSIGN STUDENT MODAL ═══ */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users size={18} className="text-violet-600" />
                  Assign to Student
                </h3>
                <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                  <Search size={14} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-violet-500" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-10">No students found</p>
                ) : (
                  filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        selectedStudentId === s.id
                          ? 'bg-violet-50 border border-violet-300'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <img
                        src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&size=32`}
                        alt={s.name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-400 truncate">{s.email}</p>
                      </div>
                      {selectedStudentId === s.id && <Check size={16} className="text-violet-600 flex-shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedStudentId || assigning}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedStudentId && !assigning
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {assigning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Assign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizMaker;
