import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDefaultAvatar } from '../utils/avatarUtils';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Brain, Sparkles, BookOpen, BarChart3, Target, ChevronDown,
  ChevronRight, ChevronLeft, Plus, Minus, Eye, Wand2, Download, Copy, Check,
  AlertCircle, Loader2, GraduationCap, Layers, TrendingUp, Bell,
  FileText, Calculator, ChevronUp, Info, Lightbulb,
  Save, Send, Library, Trash2, Users, Search, HelpCircle, Award, ListChecks, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  apiService,
  ApiError,
  type QuizGenerationRequest,
  type QuizGenerationResponse,
  type QuizQuestionGenerated,
  type QuestionType,
  type BloomLevel,
  type DifficultyLevel,
  type CourseMaterialTopicMapTopic,
  type AsyncTaskStatusResponse,
} from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import BloomsTaxonomyModal from './BloomsTaxonomyModal';
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
  onBack: () => void;
  gradeLevel?: string;
  selectedClassId?: string;
  selectedClassName?: string;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenInsightModal?: () => void;
  userPhoto?: string;
  teacherName?: string;
  /** When true, hides the outer gradient shell so a parent drawer controls the container */
  drawerMode?: boolean;
  /** Called after a quiz is saved to library — lets the drawer know it can offer to close */
  onQuizSaved?: (quizId: string) => void;
  /** Called when quiz generation starts — lets the drawer mark itself as dirty */
  onQuizGenerating?: () => void;
}

type Step = 'setup' | 'topics' | 'style' | 'preview' | 'results';
type MakerTab = 'create' | 'bank';

const STATUS_COLORS: Record<GeneratedQuizStatus, string> = {
  draft: 'bg-[#edf1f7] text-[#5a6578]',
  published: 'bg-green-100 text-green-700',
  assigned: 'bg-sky-100 text-sky-700',
  completed: 'bg-rose-100 text-rose-700',
};

const QUESTION_TYPE_LABELS: Record<QuestionType, { label: string; icon: React.ReactNode; description: string }> = {
  identification: { label: 'Identification', icon: <FileText size={16} />, description: 'Define or identify concepts' },
  enumeration: { label: 'Enumeration', icon: <Layers size={16} />, description: 'List steps or properties' },
  multiple_choice: { label: 'Multiple Choice', icon: <Check size={16} />, description: 'Choose from 4 options' },
  word_problem: { label: 'Word Problem', icon: <BookOpen size={16} />, description: 'Real-world scenarios' },
  equation_based: { label: 'Equation-Based', icon: <Calculator size={16} />, description: 'Solve equations' },
};

const BLOOM_LABELS: Record<BloomLevel, { label: string; color: string; description: string }> = {
  remember: { label: 'Remember', color: 'bg-sky-100 text-sky-700 border-sky-300', description: 'Recall facts & formulas' },
  understand: { label: 'Understand', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', description: 'Explain concepts' },
  apply: { label: 'Apply', color: 'bg-rose-100 text-rose-700 border-rose-300', description: 'Use in new contexts' },
  analyze: { label: 'Analyze', color: 'bg-rose-100 text-rose-700 border-rose-300', description: 'Examine & compare' },
};

const GRADE_LEVELS = ['Grade 11', 'Grade 12'];

const normalizeGradeLevel = (value?: string): 'Grade 11' | 'Grade 12' => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'grade 12' || normalized === '12' || normalized.includes('12')) {
    return 'Grade 12';
  }
  return 'Grade 11';
};

const FALLBACK_TOPICS_BY_GRADE: Record<'Grade 11' | 'Grade 12', Record<string, string[]>> = {
  'Grade 11': {
    'General Mathematics - Patterns, Relations, and Functions': ['Patterns and Real-Life Relationships', 'Functions as Mathematical Models', 'Function Notation and Evaluation', 'Domain and Range of Functions', 'Operations on Functions', 'Composite Functions', 'Inverse Functions', 'Graphs of Rational Functions', 'Graphs of Exponential Functions', 'Graphs of Logarithmic Functions'],
    'General Mathematics - Financial Mathematics': ['Simple and Compound Interest', 'Simple and General Annuities', 'Present and Future Value', 'Loans, Amortization, and Sinking Funds', 'Stocks, Bonds, and Market Indices', 'Business Decision-Making with Mathematical Models'],
    'General Mathematics - Logic and Mathematical Reasoning': ['Propositions and Logical Connectives', 'Truth Values and Truth Tables', 'Logical Equivalence and Implication', 'Quantifiers and Negation', 'Validity of Arguments'],
  },
  'Grade 12': {
    'Pre-Calculus - Analytic Geometry': ['Conic Sections - Parabola', 'Conic Sections - Ellipse', 'Conic Sections - Hyperbola', 'Conic Sections - Circle', 'Systems of Nonlinear Equations'],
    'Pre-Calculus - Series and Induction': ['Sequences and Series', 'Arithmetic Sequences', 'Geometric Sequences', 'Mathematical Induction', 'Binomial Theorem'],
    'Pre-Calculus - Trigonometry': ['Angles and Unit Circle', 'Trigonometric Functions', 'Trigonometric Identities', 'Sum and Difference Formulas', 'Inverse Trigonometric Functions', 'Polar Coordinates'],
    'Basic Calculus - Limits': ['Limits of Functions', 'Limit Theorems', 'One-Sided Limits', 'Infinite Limits and Limits at Infinity', 'Continuity of Functions'],
    'Basic Calculus - Derivatives': ['Definition of the Derivative', 'Differentiation Rules', 'Chain Rule', 'Implicit Differentiation', 'Higher-Order Derivatives', 'Related Rates', 'Extrema and the First Derivative Test', 'Concavity and the Second Derivative Test', 'Optimization Problems'],
    'Basic Calculus - Integration': ['Antiderivatives and Indefinite Integrals', 'Definite Integrals and the FTC', 'Integration by Substitution', 'Area Under a Curve'],
  },
};

const CATEGORY_PREFIXES_BY_GRADE: Record<'Grade 11' | 'Grade 12', string[]> = {
  'Grade 11': ['General Mathematics - '],
  'Grade 12': ['Pre-Calculus - ', 'Basic Calculus - '],
};

const filterTopicsByGrade = (
  topics: Record<string, string[]>,
  grade: 'Grade 11' | 'Grade 12',
): Record<string, string[]> => {
  const allowedPrefixes = CATEGORY_PREFIXES_BY_GRADE[grade];
  return Object.fromEntries(
    Object.entries(topics).filter(([category]) => allowedPrefixes.some((prefix) => category.startsWith(prefix))),
  );
};

// Balanced limits for classroom use: allows longer quizzes while keeping response times practical.
const MAX_QUESTIONS_LIMIT = 30;
const MAX_TOPICS_LIMIT = 12;
const QUIZ_TASK_STORAGE_KEY = 'mathpulse:quiz-maker:active-task';

interface PersistedQuizTask {
  taskId: string;
  request: QuizGenerationRequest;
  createdAt: string;
  ownerUid?: string;
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: 'text-green-600',
  medium: 'text-rose-600',
  hard: 'text-red-600',
};

// ─── Component ──────────────────────────────────────────────

const QuizMaker: React.FC<QuizMakerProps> = ({
  onBack,
  gradeLevel: initialGrade,
  selectedClassId,
  selectedClassName,
  onOpenNotifications,
  onOpenProfile,
  onOpenInsightModal,
  userPhoto,
  teacherName,
  drawerMode = false,
  onQuizSaved,
  onQuizGenerating,
}) => {
  const { currentUser, loading: authLoading } = useAuth();
  const rolloutFlags = useMemo(() => apiService.getImportGroundedRolloutFlags(), []);

  // Tab state
  const [activeTab, setActiveTab] = useState<MakerTab>('create');

  // Form state
  const [step, setStep] = useState<Step>('setup');
  const [selectedGrade, setSelectedGrade] = useState(normalizeGradeLevel(initialGrade));
  const [numQuestions, setNumQuestions] = useState(10); // Capped at MAX_QUESTIONS_LIMIT
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [excludeTopics, setExcludeTopics] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['multiple_choice', 'word_problem', 'identification']);
  const [selectedBlooms, setSelectedBlooms] = useState<BloomLevel[]>(['remember', 'understand', 'apply', 'analyze']);
  const [includeGraphs, setIncludeGraphs] = useState(false);
  const [difficultyDist, setDifficultyDist] = useState<Record<DifficultyLevel, number>>({ easy: 30, medium: 50, hard: 20 });

  // Available topics from API
  const [availableTopics, setAvailableTopics] = useState<Record<string, string[]>>({});
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [importedTopics, setImportedTopics] = useState<CourseMaterialTopicMapTopic[]>([]);
  const [importedTopicsLoading, setImportedTopicsLoading] = useState(false);
  const [importedTopicsWarning, setImportedTopicsWarning] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('queued');
  const [generationMessage, setGenerationMessage] = useState('Waiting to start generation...');
  const [quizResult, setQuizResult] = useState<QuizGenerationResponse | null>(null);
  const [previewResult, setPreviewResult] = useState<QuizGenerationResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const resumeAttemptedRef = useRef(false);

  // UI state
  const [expandedSection, setExpandedSection] = useState<string | null>('topics');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [showBloomsModal, setShowBloomsModal] = useState(false);
  const [provenanceSourceFilter, setProvenanceSourceFilter] = useState<string>('all');
  const [provenanceMaterialFilter, setProvenanceMaterialFilter] = useState<string>('all');

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
  const [viewingBankQuizId, setViewingBankQuizId] = useState<string | null>(null);

  // Load topics when grade changes
  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    const normalizedGrade = normalizeGradeLevel(selectedGrade);
    try {
      const response = await apiService.getQuizTopics(normalizedGrade);
      if (response.topics) {
        setAvailableTopics(filterTopicsByGrade(response.topics, normalizedGrade));
      }
    } catch {
      // Fallback topics if API fails — keep grades separated.
      setAvailableTopics(filterTopicsByGrade(FALLBACK_TOPICS_BY_GRADE[normalizedGrade], normalizedGrade));
    } finally {
      setTopicsLoading(false);
    }
  }, [selectedGrade]);

  const loadImportedTopics = useCallback(async () => {
    if (!rolloutFlags.quizEnabled) {
      setImportedTopics([]);
      setImportedTopicsWarning('Import-grounded quiz generation is disabled by rollout flag; using curriculum defaults.');
      setImportedTopicsLoading(false);
      return;
    }

    setImportedTopicsLoading(true);
    setImportedTopicsWarning('');
    try {
      const response = await apiService.getCourseMaterialTopics({
        classSectionId: selectedClassId,
        limit: 20,
      });
      const validTopics = (response.topics || []).filter((topic) => topic.title?.trim());
      setImportedTopics(validTopics);
      if (response.warnings && response.warnings.length > 0) {
        setImportedTopicsWarning(response.warnings.join(' '));
      }
    } catch {
      setImportedTopics([]);
      setImportedTopicsWarning('Imported topics are currently unavailable; quiz generation will use curriculum defaults.');
    } finally {
      setImportedTopicsLoading(false);
    }
  }, [selectedClassId, rolloutFlags.quizEnabled]);

  useEffect(() => {
    loadTopics();
    setSelectedTopics([]);
    setExcludeTopics([]);
  }, [loadTopics]);

  useEffect(() => {
    void loadImportedTopics();
  }, [loadImportedTopics]);

  const mergedAvailableTopics = useMemo(() => {
    const importedTitles = Array.from(
      new Set(importedTopics.map((topic) => topic.title.trim()).filter(Boolean))
    );
    if (importedTitles.length === 0) {
      return availableTopics;
    }
    return {
      'Imported Course Materials': importedTitles,
      ...availableTopics,
    };
  }, [availableTopics, importedTopics]);

  useEffect(() => {
    setProvenanceSourceFilter('all');
    setProvenanceMaterialFilter('all');
  }, [quizResult]);

  const quizProvenanceSources = useMemo(() => {
    if (!quizResult) return [];
    const questionSources = quizResult.questions
      .map((q) => q.provenance?.sourceFile?.trim())
      .filter((source): source is string => Boolean(source));
    const metadataSources = (quizResult.metadata.topicProvenance || [])
      .map((item) => item.sourceFile?.trim())
      .filter((source): source is string => Boolean(source));
    return Array.from(new Set([...questionSources, ...metadataSources])).sort((a, b) => a.localeCompare(b));
  }, [quizResult]);

  const quizProvenanceMaterials = useMemo(() => {
    if (!quizResult) return [];
    const questionMaterials = quizResult.questions
      .map((q) => q.provenance?.materialId?.trim())
      .filter((material): material is string => Boolean(material));
    const metadataMaterials = (quizResult.metadata.topicProvenance || [])
      .map((item) => item.materialId?.trim())
      .filter((material): material is string => Boolean(material));
    return Array.from(new Set([...questionMaterials, ...metadataMaterials])).sort((a, b) => a.localeCompare(b));
  }, [quizResult]);

  const filteredQuizQuestions = useMemo(() => {
    if (!quizResult) return [];
    return quizResult.questions.filter((question) => {
      const matchesSource =
        provenanceSourceFilter === 'all' ||
        (question.provenance?.sourceFile || '').trim() === provenanceSourceFilter;
      const matchesMaterial =
        provenanceMaterialFilter === 'all' ||
        (question.provenance?.materialId || '').trim() === provenanceMaterialFilter;
      return matchesSource && matchesMaterial;
    });
  }, [quizResult, provenanceSourceFilter, provenanceMaterialFilter]);

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

  const buildRequest = (): QuizGenerationRequest => {
    // Determine effective topics, filtering out excluded ones
    let effectiveTopics = selectedTopics.length > 0
      ? selectedTopics.filter(t => !excludeTopics.includes(t))
      : Object.values(mergedAvailableTopics).flat().filter(t => !excludeTopics.includes(t)).slice(0, 3);

    // Hard cap topics to stay within LLM token budget
    if (effectiveTopics.length > MAX_TOPICS_LIMIT) {
      effectiveTopics = effectiveTopics.slice(0, MAX_TOPICS_LIMIT);
    }

    // Hard cap questions
    const clampedQuestions = Math.min(numQuestions, MAX_QUESTIONS_LIMIT);

    return {
      topics: effectiveTopics,
      gradeLevel: selectedGrade,
      numQuestions: clampedQuestions,
      questionTypes: selectedTypes,
      includeGraphs,
      difficultyDistribution: difficultyDist,
      bloomLevels: selectedBlooms,
      excludeTopics,
      classSectionId: selectedClassId,
      className: selectedClassName,
      preferImportedTopics: rolloutFlags.quizEnabled,
    };
  };

  const persistActiveTask = useCallback((taskId: string, request: QuizGenerationRequest) => {
    const payload: PersistedQuizTask = {
      taskId,
      request,
      createdAt: new Date().toISOString(),
      ownerUid: currentUser?.uid,
    };
    try {
      sessionStorage.setItem(QUIZ_TASK_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Non-blocking: resume still works while modal remains open.
    }
  }, [currentUser]);

  const clearPersistedTask = useCallback(() => {
    try {
      sessionStorage.removeItem(QUIZ_TASK_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const applyTaskProgress = useCallback((status: AsyncTaskStatusResponse) => {
    const mappedPercent = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          typeof status.progressPercent === 'number'
            ? status.progressPercent
            : status.status === 'queued'
            ? 10
            : status.status === 'running'
            ? 65
            : status.status === 'completed'
            ? 100
            : status.status === 'cancelling'
            ? 95
            : 100,
        ),
      ),
    );

    setGenerationProgress((prev) => {
      // Backend emits coarse checkpoints (e.g., 30 -> 70 -> 92). Smooth between them
      // so long-running generations reflect forward progress instead of appearing stuck.
      let next = Math.max(prev, mappedPercent);

      if (status.status === 'running' && mappedPercent <= prev) {
        const stage = String(status.progressStage || '').toLowerCase();
        const stageCap = stage.includes('assembling') || stage.includes('final')
          ? 97
          : stage.includes('generating')
            ? 89
            : 95;
        next = Math.min(stageCap, prev + 1);
      }

      return next;
    });
    setGenerationStage(status.progressStage || status.status);
    setGenerationMessage(
      status.progressMessage ||
      (status.status === 'queued'
        ? 'Task queued for generation.'
        : status.status === 'running'
        ? 'Generating quiz in the background...'
        : status.status === 'completed'
        ? 'Generation complete.'
        : status.status === 'cancelling'
        ? 'Cancelling generation...'
        : 'Generation finished with an error.'),
    );
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (resumeAttemptedRef.current) {
      return;
    }
    resumeAttemptedRef.current = true;

    if (!currentUser) {
      clearPersistedTask();
      return;
    }

    let cancelled = false;
    const raw = sessionStorage.getItem(QUIZ_TASK_STORAGE_KEY);
    if (!raw) {
      return;
    }

    let persisted: PersistedQuizTask | null = null;
    try {
      persisted = JSON.parse(raw) as PersistedQuizTask;
    } catch {
      clearPersistedTask();
      return;
    }

    if (!persisted?.taskId) {
      clearPersistedTask();
      return;
    }

    if (persisted.ownerUid && persisted.ownerUid !== currentUser.uid) {
      clearPersistedTask();
      return;
    }

    setGenerating(true);
    setActiveTaskId(persisted.taskId);
    setError('');

    void apiService
      .waitForTaskResult(persisted.taskId, {
        timeoutMs: 240_000,
        pollIntervalMs: 1_500,
        onProgress: applyTaskProgress,
      })
      .then(async (task) => {
        if (cancelled) return;
        const payload = task.result;
        if (!payload || typeof payload !== 'object') {
          throw new Error('Quiz generation completed without a valid result payload.');
        }
        const resultPayload = payload as unknown as QuizGenerationResponse;
        setQuizResult(resultPayload);
        setStep('results');
        setGenerationProgress(100);
        setGenerationStage('completed');
        setGenerationMessage('Generation complete.');
        setActiveTaskId(null);
        clearPersistedTask();
        try {
          await autoSaveGeneratedQuiz(resultPayload, persisted.request);
          toast.success('Quiz auto-saved to your library as draft.');
        } catch (saveErr) {
          toast.error(saveErr instanceof Error ? saveErr.message : 'Quiz generated but failed to save to library');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          // Auth can still be hydrating after a hard refresh; keep task persisted and retry once auth settles.
          resumeAttemptedRef.current = false;
          setGenerating(false);
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to resume quiz generation');
        setActiveTaskId(null);
        clearPersistedTask();
      })
      .finally(() => {
        if (!cancelled) {
          setGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyTaskProgress, authLoading, clearPersistedTask, currentUser]);

  const handleBack = () => {
    if (generating) {
      if (window.confirm('Quiz generation is in progress. Are you sure you want to leave?')) {
        setStep('setup');
        setQuizResult(null);
        setError('');
        onBack();
      }
      return;
    }
    setStep('setup');
    setQuizResult(null);
    setError('');
    onBack();
  };

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
    onQuizGenerating?.();
    setError('');
    setGenerating(true);
    setViewingBankQuizId(null);
    setGenerationProgress(8);
    setGenerationStage('queued');
    setGenerationMessage('Submitting quiz generation task...');
    setQuizResult(null);
    const requestPayload = buildRequest();
    try {
      const result = await apiService.generateQuiz(requestPayload, {
        onTaskCreated: (taskId) => {
          setActiveTaskId(taskId);
          persistActiveTask(taskId, requestPayload);
          setGenerationProgress((prev) => Math.max(prev, 12));
          setGenerationStage('queued');
          setGenerationMessage('Task queued. Generation is running in the background.');
        },
        onProgress: (status) => {
          applyTaskProgress(status);
          if (status.taskId && status.taskId !== activeTaskId) {
            setActiveTaskId(status.taskId);
          }
        },
      });
      setQuizResult(result);
      setStep('results');
      setGenerationProgress(100);
      setGenerationStage('completed');
      setGenerationMessage('Generation complete.');
      setActiveTaskId(null);
      clearPersistedTask();
      try {
        await autoSaveGeneratedQuiz(result, requestPayload);
        toast.success('Quiz auto-saved to your library as draft.');
      } catch (saveErr) {
        toast.error(saveErr instanceof Error ? saveErr.message : 'Quiz generated but failed to save to library');
      }
      void apiService.reportImportGroundedFeedback({
        flow: 'quiz',
        status: 'success',
        classSectionId: requestPayload.classSectionId,
        className: requestPayload.className,
        metadata: {
          totalQuestions: result.metadata.totalQuestions,
          usedImportedTopics: Boolean(result.metadata.usedImportedTopics),
          importedTopicCount: result.metadata.importedTopicCount ?? 0,
          importGroundingEnabled: rolloutFlags.quizEnabled,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Quiz generation failed');
      setGenerationProgress(100);
      setGenerationStage('failed');
      setGenerationMessage('Generation failed.');
      setActiveTaskId(null);
      clearPersistedTask();
      void apiService.reportImportGroundedFeedback({
        flow: 'quiz',
        status: 'failed',
        classSectionId: requestPayload.classSectionId,
        className: requestPayload.className,
        metadata: {
          error: err instanceof Error ? err.message : 'Quiz generation failed',
          importGroundingEnabled: rolloutFlags.quizEnabled,
        },
      });
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

  const isFormValid = selectedTopics.length > 0 || Object.values(mergedAvailableTopics).flat().length > 0;

  // ─── Save / Publish / Assign Handlers ─────────────────────

  /** Convert API QuizGenerationResponse to a storable GeneratedQuiz shape */
  const buildGeneratedQuiz = (
    result: QuizGenerationResponse,
    sourceRequest?: QuizGenerationRequest,
  ): Omit<GeneratedQuiz, 'id'> => {
    const effectiveGrade = sourceRequest?.gradeLevel || selectedGrade;
    const effectiveTopics = sourceRequest?.topics || selectedTopics;

    const questions: AIQuizQuestion[] = result.questions.map((q, i) => ({
      id: `q_${Date.now()}_${i}`,
      questionType: (q.questionType as AIQuizQuestion['questionType']) || 'identification',
      question: q.question,
      ...(q.options ? { options: q.options } : {}),
      correctAnswer: q.correctAnswer,
      bloomLevel: (q.bloomLevel as AIQuizQuestion['bloomLevel']) || 'understand',
      difficulty: (q.difficulty as AIQuizQuestion['difficulty']) || 'medium',
      topic: q.topic,
      subject: effectiveGrade,
      points: q.points,
      explanation: q.explanation,
    }));

    return {
      title: `${effectiveGrade} Quiz – ${effectiveTopics.length > 0 ? effectiveTopics.slice(0, 2).join(', ') : 'Mixed Topics'}`,
      gradeLevel: effectiveGrade,
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

  const upsertBankQuiz = useCallback((quiz: GeneratedQuiz) => {
    setBankQuizzes((prev) => [quiz, ...prev.filter((existing) => existing.id !== quiz.id)]);
  }, []);

  async function autoSaveGeneratedQuiz(
    result: QuizGenerationResponse,
    sourceRequest: QuizGenerationRequest,
  ): Promise<string | null> {
    if (!currentUser) {
      return null;
    }

    const quizData = buildGeneratedQuiz(result, sourceRequest);
    const id = await saveGeneratedQuiz(
      quizData,
      currentUser.uid,
      savedQuizId ? { documentId: savedQuizId } : undefined,
    );
    setSavedQuizId(id);
    upsertBankQuiz({
      id,
      ...quizData,
      teacherId: currentUser.uid,
    } as GeneratedQuiz);
    return id;
  }

  const handleSaveToLibrary = async () => {
    if (!quizResult) {
      toast.error('No quiz to save. Generate a quiz first.');
      return;
    }
    if (!currentUser) {
      toast.error('You must be signed in to save quizzes.');
      return;
    }
    setSaving(true);
    try {
      const quizData = buildGeneratedQuiz(quizResult);
      const id = await saveGeneratedQuiz(
        quizData,
        currentUser.uid,
        savedQuizId ? { documentId: savedQuizId } : undefined,
      );
      setSavedQuizId(id);
      upsertBankQuiz({
        id,
        ...quizData,
        teacherId: currentUser.uid,
      } as GeneratedQuiz);
      toast.success('Quiz saved to your library!');
      onQuizSaved?.(id);
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
      setBankQuizzes((prev) =>
        prev.map((quiz) =>
          quiz.id === savedQuizId
            ? { ...quiz, status: 'published' }
            : quiz,
        ),
      );
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
      setBankQuizzes((prev) =>
        prev.map((quiz) =>
          quiz.id === quizId
            ? {
                ...quiz,
                status: 'assigned',
                metadata: {
                  ...quiz.metadata,
                  assignedTo: selectedStudentId,
                },
              }
            : quiz,
        ),
      );
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

  const mapBankQuizToGenerationResponse = (quiz: GeneratedQuiz): QuizGenerationResponse => {
    const topicsCovered = (quiz.metadata.topicsCovered || []).reduce<Record<string, number>>((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});

    return {
      questions: quiz.questions.map((question) => ({
        questionType: question.questionType,
        question: question.question,
        correctAnswer: question.correctAnswer,
        options: question.options ?? null,
        bloomLevel: question.bloomLevel,
        difficulty: question.difficulty,
        topic: question.topic,
        points: question.points,
        explanation: question.explanation,
      })),
      totalPoints: quiz.totalPoints,
      metadata: {
        topicsCovered,
        difficultyBreakdown: quiz.metadata.difficultyBreakdown,
        bloomTaxonomyDistribution: quiz.metadata.bloomDistribution,
        questionTypeBreakdown: quiz.metadata.questionTypeBreakdown,
        gradeLevel: quiz.gradeLevel,
        totalQuestions: quiz.questions.length,
        includesGraphQuestions: false,
        supplementalPurpose: quiz.metadata.supplementalPurpose,
        bloomTaxonomyRationale: 'Loaded from saved quiz bank entry.',
        recommendedTeacherActions: quiz.metadata.recommendedTeacherActions || [],
      },
    };
  };

  const handleViewBankQuiz = (quiz: GeneratedQuiz) => {
    setSavedQuizId(quiz.id);
    setQuizResult(mapBankQuizToGenerationResponse(quiz));
    setPreviewResult(null);
    setViewingBankQuizId(quiz.id);
    setProvenanceSourceFilter('all');
    setProvenanceMaterialFilter('all');
    setExpandedQuestion(null);
    setStep('results');
    setActiveTab('create');
  };

  // ─── Render ────────────────────────────────────────────────

  const renderSection = (id: string, title: React.ReactNode, icon: React.ReactNode, children: React.ReactNode) => {
    const isOpen = expandedSection === id;
    return (
      <div className="border border-[#dde3eb] rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(isOpen ? null : id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#edf1f7] hover:bg-[#dde3eb] transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-[#0a1628]">
            {icon}
            {title}
          </div>
          {isOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
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

  const BLOOM_BADGE_COLORS: Record<string, string> = {
    remember: 'bg-sky-100 text-sky-700 border-sky-300',
    understand: 'bg-rose-100 text-rose-700 border-rose-300',
    apply: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    analyze: 'bg-rose-100 text-rose-700 border-rose-300',
  };

  const BLOOM_COLORS: Record<string, { badge: string; card: string; num: string }> = {
    remember: { badge: 'border-purple-200 text-purple-700 bg-purple-50', card: 'from-[#a855f7] to-[#9333ea]', num: 'text-purple-700 bg-purple-100 border-purple-200' },
    understand: { badge: 'border-blue-200 text-blue-700 bg-blue-50', card: 'from-[#3b82f6] to-[#2563eb]', num: 'text-blue-700 bg-blue-100 border-blue-200' },
    apply: { badge: 'border-amber-200 text-amber-700 bg-amber-50', card: 'from-[#f59e0b] to-[#d97706]', num: 'text-amber-700 bg-amber-100 border-amber-200' },
    analyze: { badge: 'border-orange-200 text-orange-700 bg-orange-50', card: 'from-[#f97316] to-[#ea580c]', num: 'text-orange-700 bg-orange-100 border-orange-200' },
    evaluate: { badge: 'border-rose-200 text-rose-700 bg-rose-50', card: 'from-[#f43f5e] to-[#e11d48]', num: 'text-rose-700 bg-rose-100 border-rose-200' },
    create: { badge: 'border-emerald-200 text-emerald-700 bg-emerald-50', card: 'from-[#10b981] to-[#059669]', num: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
  };

  const renderQuestionCard = (q: QuizQuestionGenerated, index: number, showAnswer: boolean) => {
    const isExpanded = expandedQuestion === index;
    const bloom = BLOOM_COLORS[q.bloomLevel?.toLowerCase()] || BLOOM_COLORS['remember'];
    const hoverBorder = q.bloomLevel?.toLowerCase() === 'remember' ? 'hover:border-purple-200'
      : q.bloomLevel?.toLowerCase() === 'understand' ? 'hover:border-blue-200'
      : q.bloomLevel?.toLowerCase() === 'apply' ? 'hover:border-amber-200'
      : 'hover:border-slate-200';
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`border border-[#e2e8f0] rounded-[20px] overflow-hidden bg-white shadow-sm hover:shadow-md ${hoverBorder} transition-all duration-300`}
      >
        {/* Header row — always visible */}
        <div
          className="p-6 flex justify-between items-start cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => setExpandedQuestion(isExpanded ? null : index)}
        >
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              {/* Q-number badge */}
              <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${bloom.card} text-white flex items-center justify-center font-bold text-[13px] shadow-sm`}>
                Q{index + 1}
              </span>
              {/* Bloom badge */}
              <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider shadow-sm ${bloom.badge}`}>
                {q.bloomLevel}
              </span>
              {/* Difficulty badge */}
              <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                q.difficulty === 'easy' ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                : q.difficulty === 'hard' ? 'border-rose-200 text-rose-700 bg-rose-50'
                : 'border-amber-200 text-amber-700 bg-amber-50'
              }`}>
                {q.difficulty}
              </span>
              {/* Points */}
              <span className="text-[12px] font-bold text-[#64748b] bg-slate-100 px-2 py-1 rounded-md">{q.points} pts</span>
              {/* Topic */}
              {q.topic && (
                <span className="text-[12px] font-semibold text-[#64748b] px-2 py-1 hidden sm:inline-block border-l border-slate-200">{q.topic}</span>
              )}
            </div>
            <p className="text-[16px] font-bold text-[#1e293b] pr-4 leading-relaxed">{q.question}</p>
          </div>
          <div className="flex flex-col items-end justify-between h-full gap-4 shrink-0 mt-1">
            <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest hidden sm:block border shadow-sm ${bloom.badge}`}>
              {q.bloomLevel}
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 mt-2">
              {isExpanded ? <ChevronUp size={16} className="text-[#64748b] transition-transform duration-300" /> : <ChevronDown size={16} className="text-[#64748b]" />}
            </div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-0 bg-white">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-[#e2e8f0] to-transparent mb-6" />

                {/* Options */}
                {q.options && (
                  <div className="mb-6">
                    <p className="text-[13px] font-bold text-[#64748b] mb-3 uppercase tracking-wider">Options:</p>
                    <div className="space-y-3">
                      {q.options.map((opt, oi) => {
                        const isCorrect = showAnswer && opt.includes(q.correctAnswer);
                        return (
                          <div key={oi} className={`rounded-[12px] p-4 text-[14px] font-medium transition-all cursor-pointer relative overflow-hidden ${
                            isCorrect
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/30 border-2 border-emerald-400 text-emerald-800 font-bold shadow-sm'
                              : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#a855f7] hover:shadow-[0_2px_8px_rgba(168,85,247,0.1)]'
                          }`}>
                            {isCorrect && <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />}
                            <span className={isCorrect ? 'pl-2' : ''}>{opt}</span>
                            {isCorrect && (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm absolute right-4 top-1/2 -translate-y-1/2">
                                <Check size={13} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Answer + Explanation side by side */}
                {showAnswer && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-[16px] p-5 shadow-sm">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Correct Answer
                      </p>
                      <p className="text-[16px] font-bold text-[#1e293b]">{q.correctAnswer}</p>
                    </div>
                    <div className="bg-purple-50/80 border border-purple-200/60 rounded-[16px] p-5 shadow-sm">
                      <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles size={14} /> AI Explanation
                      </p>
                      <p className="text-[13px] text-[#475569] leading-relaxed font-medium">{q.explanation}</p>
                    </div>
                  </div>
                )}

                {/* Footer metadata */}
                <div className="flex gap-6 text-[12px] font-medium text-[#64748b] mt-5 pt-4 border-t border-slate-100">
                  <span className="flex items-center gap-1.5"><FileText size={14} /> <strong className="text-[#1e293b]">Type:</strong> {QUESTION_TYPE_LABELS[q.questionType as QuestionType]?.label || q.questionType}</span>
                  <span className="flex items-center gap-1.5"><Brain size={14} /> <strong className="text-[#1e293b]">Bloom:</strong> {q.bloomLevel}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const content = (
    <div className="w-full min-h-screen md:min-h-full flex flex-col overflow-y-auto bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-[#fff7ed]">
      <div className="w-full px-4 md:px-6 lg:px-[24px] xl:px-[32px] pt-[12px] pb-4">
        {/* ─── TAB TOGGLES ─── */}
        <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md p-1.5 rounded-full border border-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] w-full md:w-max overflow-x-auto" style={{scrollbarWidth:'none'}}>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 sm:px-6 py-2 rounded-full text-[13px] font-bold flex items-center gap-2 transition-all duration-300 ease-out whitespace-nowrap ${
              activeTab === 'create'
                ? 'bg-white text-[#a855f7] shadow-[0_2px_8px_rgba(168,85,247,0.15)] scale-100'
                : 'bg-transparent text-[#64748b] hover:text-[#1e293b] hover:bg-white/60 scale-95 hover:scale-100'
            }`}
          >
            <Wand2 size={16} /> Create Quiz
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-3 sm:px-6 py-2 rounded-full text-[13px] font-bold flex items-center gap-2 transition-all duration-300 ease-out whitespace-nowrap ${
              activeTab === 'bank'
                ? 'bg-white text-[#a855f7] shadow-[0_2px_8px_rgba(168,85,247,0.15)] scale-100'
                : 'bg-transparent text-[#64748b] hover:text-[#1e293b] hover:bg-white/60 scale-95 hover:scale-100'
            }`}
          >
            <Library size={16} /> Quiz Bank
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="w-full px-4 md:px-6 lg:px-[24px] xl:px-[32px] pb-[32px] flex-1">

          {/* ─── QUIZ BANK TAB ─── */}
          {activeTab === 'bank' && (
            <div className="w-full space-y-[24px]">
              {/* Bank Filters */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-[#e2e8f0] mb-6" style={{scrollbarWidth:'none'}}>
                {(['all', 'draft', 'published', 'assigned', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBankFilter(f)}
                    className={`px-5 py-2 text-[13px] font-bold rounded-full whitespace-nowrap transition-all duration-300 mb-4 capitalize ${
                      bankFilter === f
                        ? 'bg-purple-50 text-[#9333ea] border border-purple-200 shadow-[0_2px_8px_rgba(168,85,247,0.15)] hover:scale-105'
                        : 'bg-white/80 text-[#64748b] border border-white hover:border-[#e2e8f0] hover:bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>


              {bankLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-sky-500" />
                  <span className="ml-2 text-sm text-[#5a6578]">Loading quiz bank…</span>
                </div>
              ) : filteredBankQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
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
                      onClick={() => handleViewBankQuiz(q)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleViewBankQuiz(q);
                        }
                      }}
                      className={`relative bg-white/80 backdrop-blur-md rounded-[20px] p-6 shadow-sm border flex flex-col group hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7] ${
                        q.status === 'assigned' || q.status === 'published'
                          ? 'border-white hover:border-purple-100 hover:shadow-[0_8px_24px_rgba(168,85,247,0.1)]'
                          : 'border-white hover:border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
                      }`}
                    >
                      {/* Left accent bar */}
                      <div className={`absolute top-0 left-0 w-[6px] h-full transition-colors duration-300 ${
                        q.status === 'assigned' || q.status === 'published'
                          ? 'bg-purple-300 group-hover:bg-[#a855f7]'
                          : 'bg-slate-200 group-hover:bg-slate-400'
                      }`} />

                      {/* Header */}
                      <div className="flex justify-between items-start mb-4 gap-4 pl-3">
                        <h3 className={`font-bold text-[15px] text-[#1e293b] leading-tight transition-colors ${
                          q.status === 'assigned' || q.status === 'published'
                            ? 'group-hover:text-[#9333ea]'
                            : 'group-hover:text-slate-700'
                        }`}>{q.title}</h3>
                        <span className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm ${STATUS_COLORS[q.status]}`}>
                          {q.status}
                        </span>
                      </div>

                      {/* Topic tags */}
                      <div className="flex flex-wrap gap-2 mb-5 pl-3">
                        {q.metadata.topicsCovered.slice(0, 3).map((t) => (
                          <span key={t} className="px-2.5 py-1 bg-[#f8fafc] text-slate-600 text-[11px] font-medium rounded-md border border-slate-200 group-hover:border-slate-300 transition-colors">{t}</span>
                        ))}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-5 text-[13px] text-[#64748b] font-medium mb-6 pl-3">
                        <span className="flex items-center gap-1.5"><HelpCircle size={14} /> {q.questions.length} questions</span>
                        <span className="flex items-center gap-1.5"><Award size={14} /> {q.totalPoints} pts</span>
                        <span className="flex items-center gap-1.5"><Users size={14} /> {q.gradeLevel}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-4 mt-auto pt-5 border-t border-[#f1f5f9] pl-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewBankQuiz(q); }}
                          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#64748b] hover:text-[#1e293b] transition-colors bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-full shadow-sm"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenAssign(q.id); }}
                          className="flex items-center gap-1.5 text-[13px] font-bold text-[#a855f7] hover:text-[#9333ea] transition-colors"
                        >
                          <Send size={14} /> Assign
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBankQuiz(q.id); }}
                          className="flex items-center gap-1.5 text-[13px] font-semibold text-rose-500 hover:text-rose-700 transition-colors ml-auto opacity-60 group-hover:opacity-100"
                        >
                          <Trash2 size={14} /> Delete
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

          {/* Error Banner */}
          {error && (
            <div className="w-full px-[24px] xl:px-[32px] pt-4">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
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
            </div>
          )}

          {/* Generating Banner */}
          {generating && (
            <div className="flex-1 flex flex-col items-center justify-center p-[24px] xl:p-[32px]">
              <div className="bg-white p-8 rounded-[16px] shadow-sm border border-[#e2e8f0] w-full max-w-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[16px] font-bold text-[#1e293b] flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-[#a855f7]" />
                    Generating Quiz in Background
                  </h3>
                  <span className="text-[14px] font-extrabold text-[#9333ea]">{generationProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-6">
                  <motion.div
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 h-full rounded-full"
                  />
                </div>
                <div className="text-[13px] text-[#64748b]">
                  <p className="font-medium text-[#475569] mb-1">Stage: <span className="font-bold text-[#1e293b] capitalize">{generationStage.replace(/_/g, ' ')}</span></p>
                  <p>{generationMessage}</p>
                  {activeTaskId && <p className="text-[11px] mt-3 opacity-60 font-mono">Task ID: {activeTaskId}</p>}
                </div>
              </div>
              <p className="mt-8 text-[14px] font-medium text-[#64748b] flex items-center gap-2 animate-pulse">
                <Loader2 size={16} className="animate-spin" /> Generating quiz... Please wait.
              </p>
            </div>
          )}

          {/* WIZARD STEPPER */}
          {!generating && step !== 'results' && (
            <div className="w-full px-4 md:px-6 lg:px-[24px] xl:px-[32px] mb-8">
              <div className="flex items-center justify-between bg-white/80 backdrop-blur-[12px] rounded-2xl border border-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-1.5">
                {[
                  { id: 'setup', label: 'Setup' },
                  { id: 'topics', label: 'Topics' },
                  { id: 'style', label: 'Question Style' },
                  { id: 'preview', label: 'Preview' },
                ].map((s, idx) => {
                  const WIZARD_STEPS = ['setup', 'topics', 'style', 'preview'];
                  const currentIdx = WIZARD_STEPS.indexOf(step);
                  const isCompleted = currentIdx > idx;
                  const isCurrent = currentIdx === idx;
                  return (
                    <div
                      key={s.id}
                      className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-4 rounded-xl transition-all duration-500 ${
                        isCurrent
                          ? 'bg-purple-50/80 shadow-[0_1px_3px_rgba(168,85,247,0.1)]'
                          : isCompleted
                          ? 'bg-transparent'
                          : 'bg-transparent opacity-60'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[12px] font-bold shrink-0 ${
                          isCurrent
                            ? 'bg-gradient-to-br from-[#a855f7] to-[#9333ea] text-white shadow-md'
                            : isCompleted
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-slate-100 text-[#64748b]'
                        }`}
                      >
                        {isCompleted ? <Check size={11} strokeWidth={3} className="sm:size-[13]" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] sm:text-[13px] font-bold whitespace-nowrap hidden sm:block ${
                          isCurrent ? 'text-[#9333ea]' : isCompleted ? 'text-[#1e293b]' : 'text-[#64748b]'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── STEP: SETUP ─── */}
          {step === 'setup' && !generating && (
            <div className="w-full px-[24px] xl:px-[32px] flex-1 space-y-[24px] pb-8">

              {/* Info Banner */}
              <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 backdrop-blur-sm border border-purple-100/50 rounded-[16px] p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                  <Info size={18} className="text-[#9333ea]" />
                </div>
                <p className="text-[13px] text-[#475569] leading-relaxed pt-0.5">
                  This quiz maker generates <span className="font-bold text-[#9333ea]">supplemental assessments</span> to support classroom instruction. Questions follow Bloom's Taxonomy for comprehensive skill evaluation. Generation limit: up to {MAX_QUESTIONS_LIMIT} questions and {MAX_TOPICS_LIMIT} topics per quiz.
                </p>
              </div>

              {/* Basic Settings Card */}
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[20px] border border-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300">
                <div className="p-5 border-b border-[#f1f5f9] bg-white/50">
                  <h3 className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Basic Settings</h3>
                </div>
                <div className="p-8 flex flex-col md:flex-row gap-8">
                  {/* Grade Level */}
                  <div className="flex-1 group">
                    <label htmlFor="quiz-grade-level" className="text-[13px] font-bold text-[#1e293b] mb-2 block group-hover:text-[#a855f7] transition-colors">Grade level</label>
                    <div className="relative">
                      <select
                        id="quiz-grade-level"
                        value={selectedGrade}
                        onChange={e => setSelectedGrade(normalizeGradeLevel(e.target.value))}
                        className="appearance-none w-full bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] text-[#475569] text-[14px] font-medium rounded-xl px-4 py-3.5 outline-none focus:border-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/10 cursor-pointer transition-all duration-200 shadow-sm"
                      >
                        {GRADE_LEVELS.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="text-[#64748b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  {/* Question Counter */}
                  <div className="flex-1 group">
                    <label htmlFor="quiz-num-questions" className="text-[13px] font-bold text-[#1e293b] mb-2 block group-hover:text-[#a855f7] transition-colors">Number of questions</label>
                    <div className="flex items-center bg-white border border-[#e2e8f0] rounded-xl overflow-hidden focus-within:border-[#a855f7] focus-within:ring-4 focus-within:ring-[#a855f7]/10 transition-all duration-200 h-[50px] shadow-sm hover:border-[#cbd5e1]">
                      <button
                        onClick={() => setNumQuestions(Math.max(1, numQuestions - 1))}
                        className="w-14 h-full flex items-center justify-center text-[#64748b] bg-slate-50 hover:bg-slate-100 hover:text-[#1e293b] transition-colors border-r border-[#e2e8f0] active:bg-slate-200"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        id="quiz-num-questions"
                        type="number"
                        min={1}
                        max={MAX_QUESTIONS_LIMIT}
                        value={numQuestions}
                        onChange={e => setNumQuestions(Math.min(MAX_QUESTIONS_LIMIT, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="flex-1 text-center font-bold text-[16px] text-[#1e293b] border-none outline-none focus:ring-0 w-full h-full p-0"
                      />
                      <button
                        onClick={() => setNumQuestions(Math.min(MAX_QUESTIONS_LIMIT, numQuestions + 1))}
                        className="w-14 h-full flex items-center justify-center text-[#64748b] bg-slate-50 hover:bg-slate-100 hover:text-[#1e293b] transition-colors border-l border-[#e2e8f0] active:bg-slate-200"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP: TOPICS ─── */}
          {step === 'topics' && !generating && (
            <div className="w-full px-4 md:px-6 lg:px-[24px] xl:px-[32px] flex-1 space-y-[24px] pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-[18px] sm:text-[20px] font-bold text-[#1e293b] mb-1">Select topics</h2>
                  <p className="text-[12px] sm:text-[13px] text-[#64748b]">Choose up to {MAX_TOPICS_LIMIT} topics across all strands</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm self-start">
                  <div className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse" />
                  <span className="text-[12px] font-bold text-[#a855f7]">{selectedTopics.filter(t => !excludeTopics.includes(t)).length} of {MAX_TOPICS_LIMIT} selected</span>
                </div>
              </div>

              {topicsLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-[#5a6578]">
                  <Loader2 size={24} className="animate-spin text-[#9b51e0] mr-2" /> Loading topics...
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(mergedAvailableTopics).map(([category, subtopics]) => {
                    const selectedCount = subtopics.filter(t => selectedTopics.includes(t) && !excludeTopics.includes(t)).length;
                    const isOpen = expandedSection === category;
                    
                    return (
                      <div key={category} className="border border-[#dde3eb] rounded-xl bg-white overflow-hidden shadow-sm">
                        <button
                          onClick={() => setExpandedSection(isOpen ? null : category)}
                          className="w-full flex items-center justify-between p-2 sm:p-4 hover:bg-[#f7f9fc] transition-colors"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="w-1 h-5 sm:h-6 bg-[#9b51e0] rounded-full shrink-0"></div>
                            <div className="text-left min-w-0 flex-1">
                              <p className="font-bold text-[#0a1628] text-xs sm:text-sm truncate">{category}</p>
                              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">{subtopics.length} topics</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            <span className="bg-purple-100 text-[#9b51e0] px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold">
                              {selectedCount}
                            </span>
                            {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                          </div>
                        </button>
                        
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden border-t border-[#edf1f7]"
                            >
                              <div className="py-2">
                                {subtopics.map((topic, idx) => {
                                  const isSelected = selectedTopics.includes(topic);
                                  const isExcluded = excludeTopics.includes(topic);
                                  const effectiveSelected = isSelected && !isExcluded;
                                  
                                  let tag = 'Core';
                                  if (idx % 3 === 0) tag = 'Foundation';
                                  if (idx % 3 === 2) tag = 'Advanced';

                                  return (
                                    <div key={topic} className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 hover:bg-[#f7f9fc] gap-2">
                                      <label className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1 min-w-0">
                                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center transition-colors shrink-0 ${effectiveSelected ? 'bg-[#9b51e0] border-[#9b51e0]' : 'border-2 border-[#dde3eb] bg-white'}`}>
                                          {effectiveSelected && <Check size={12} className="text-white" />}
                                        </div>
                                        <input
                                          type="checkbox"
                                          className="hidden"
                                          checked={effectiveSelected}
                                          onChange={() => toggleTopic(topic)}
                                        />
                                        <span className={`text-xs sm:text-sm font-semibold truncate ${effectiveSelected ? 'text-[#0a1628]' : 'text-[#5a6578]'}`}>{topic}</span>
                                      </label>
                                      <span className={`border px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] uppercase font-bold tracking-wider shrink-0 ${tag === 'Advanced' ? 'bg-white text-slate-400 border-[#dde3eb]' : 'bg-purple-50 text-[#9b51e0] border-purple-100'}`}>
                                        {tag}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── STEP: STYLE ─── */}
          {step === 'style' && !generating && (
            <div className="w-full px-[24px] xl:px-[32px] flex-1 space-y-[24px] pb-8">
              {/* Question Types */}
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[20px] border border-[#e2e8f0] shadow-sm overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-shadow duration-300">
                <div className="p-5 border-b border-[#f1f5f9] bg-white/50">
                  <h3 className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Question Types</h3>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, typeof QUESTION_TYPE_LABELS[QuestionType]][]).map(([type, info]) => {
                    const isSelected = selectedTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`border-2 rounded-[16px] p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden group hover:-translate-y-1 ${
                          isSelected
                            ? 'border-[#a855f7] bg-gradient-to-b from-purple-50/80 to-white/80 shadow-[0_4px_12px_rgba(168,85,247,0.12)]'
                            : 'border-slate-100 bg-slate-50/50 shadow-sm hover:shadow-md hover:border-purple-200'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-br from-[#a855f7] to-[#9333ea] rounded-full flex items-center justify-center shadow-md">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 ${
                          isSelected
                            ? 'bg-white border border-purple-200 shadow-md'
                            : 'bg-white border border-slate-200 shadow-sm group-hover:shadow-md'
                        }`}>
                          <span className={isSelected ? 'text-[#a855f7]' : 'text-slate-500'}>{info.icon}</span>
                        </div>
                        <span className={`font-bold text-[12px] leading-tight ${
                          isSelected ? 'text-[#9333ea]' : 'text-slate-700'
                        }`}>{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bloom's Taxonomy */}
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[20px] border border-[#e2e8f0] shadow-sm overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-shadow duration-300">
                <div className="p-5 border-b border-[#f1f5f9] bg-white/50">
                  <h3 className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Bloom's Taxonomy Levels</h3>
                </div>
                <div className="p-6 flex flex-wrap gap-4">
                  {(Object.entries(BLOOM_LABELS) as [BloomLevel, typeof BLOOM_LABELS[BloomLevel]][]).map(([level, info]) => {
                    const isSelected = selectedBlooms.includes(level);
                    return (
                      <button
                        key={level}
                        onClick={() => toggleBloom(level)}
                        className={`px-6 py-2.5 rounded-full border-2 font-bold text-[13px] transition-all duration-200 hover:-translate-y-0.5 capitalize ${
                          isSelected
                            ? 'border-[#a855f7] text-[#9333ea] bg-purple-50/80 shadow-[0_2px_8px_rgba(168,85,247,0.15)]'
                            : 'border-slate-200 text-[#64748b] bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Distribution */}
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[20px] border border-[#e2e8f0] shadow-sm overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-shadow duration-300">
                <div className="p-5 border-b border-[#f1f5f9] bg-white/50">
                  <h3 className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Difficulty Distribution</h3>
                </div>
                <div className="p-8 space-y-8">
                  {(Object.entries(difficultyDist) as [DifficultyLevel, number][]).map(([level, pct]) => {
                    const colorMap = { easy: 'bg-emerald-400', medium: 'bg-amber-400', hard: 'bg-rose-400' };
                    const hoverColorMap = { easy: 'text-emerald-600', medium: 'text-amber-500', hard: 'text-rose-500' };
                    const borderMap = { easy: 'group-hover:border-emerald-200', medium: 'group-hover:border-amber-200', hard: 'group-hover:border-rose-200' };
                    return (
                      <div key={level} className="flex items-center gap-6 group">
                        <span className={`w-16 text-[13px] font-bold text-[#475569] capitalize group-hover:${hoverColorMap[level]} transition-colors`}>{level}</span>
                        <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                          <motion.div animate={{ width: `${pct}%` }} className={`h-full rounded-full transition-all duration-500 ease-out ${colorMap[level]}`} />
                        </div>
                        <div className={`flex items-center bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden p-0.5 w-28 h-10 transition-colors ${borderMap[level]}`}>
                          <button onClick={() => adjustDifficulty(level, -5)} className={`w-8 h-full flex items-center justify-center text-[#64748b] hover:bg-slate-50 hover:${hoverColorMap[level]} rounded-lg transition-colors`}><Minus className="w-3.5 h-3.5" /></button>
                          <input type="text" value={`${pct}%`} readOnly className="flex-1 text-center font-bold text-[14px] text-[#1e293b] border-none outline-none focus:ring-0 w-full p-0 pointer-events-none" />
                          <button onClick={() => adjustDifficulty(level, 5)} className={`w-8 h-full flex items-center justify-center text-[#64748b] hover:bg-slate-50 hover:${hoverColorMap[level]} rounded-lg transition-colors`}><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP: PREVIEW ─── */}
          {step === 'preview' && !generating && !quizResult && (
            <div className="w-full px-[24px] xl:px-[32px] flex-1 space-y-[24px] pb-8">
              <div className="bg-white/80 backdrop-blur-md rounded-[20px] border border-[#e2e8f0] shadow-[0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden p-8">
                <h3 className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-6 flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#a855f7]" /> Quiz Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[
                    { label: 'Questions', value: numQuestions },
                    { label: 'Topics', value: selectedTopics.filter(t => !excludeTopics.includes(t)).length },
                    { label: 'Level', value: selectedGrade.replace('Grade ', 'Gr. ') },
                  ].map(card => (
                    <div key={card.label} className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[16px] p-6 text-center border border-purple-100/50 shadow-sm flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-200/30 rounded-full group-hover:scale-150 transition-transform duration-500" />
                      <span className="text-[36px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] to-[#9333ea] leading-none mb-1 relative z-10">{card.value}</span>
                      <span className="text-[13px] font-bold text-[#64748b] relative z-10">{card.label}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50/80 rounded-[14px] p-5 border border-slate-200/60 text-[#475569] text-[14px] leading-relaxed flex gap-4 items-start shadow-inner">
                  <Info size={18} className="text-[#94a3b8] shrink-0 mt-0.5" />
                  <p>
                    {selectedTypes.map(t => QUESTION_TYPE_LABELS[t]?.label).join(' and ')} questions across{' '}
                    <span className="font-bold text-[#1e293b]">{selectedTopics.filter(t => !excludeTopics.includes(t)).length} topics</span>{' '}
                    — aligned to <span className="font-semibold">{selectedBlooms.map(b => BLOOM_LABELS[b]?.label).join(', ')}</span> levels of Bloom's Taxonomy.{' '}
                    <span className="font-semibold text-emerald-600">Easy {difficultyDist.easy}%</span>{' • '}
                    <span className="font-semibold text-amber-500">Medium {difficultyDist.medium}%</span>{' • '}
                    <span className="font-semibold text-rose-500">Hard {difficultyDist.hard}%</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP: RESULTS ─── */}
          {step === 'results' && quizResult && (
            <div className="w-full px-[24px] xl:px-[32px] space-y-[24px] pb-8">
              {/* Summary Card */}
              <div className="bg-white/80 backdrop-blur-md rounded-[20px] border border-[#e2e8f0] shadow-[0_8px_24px_rgba(0,0,0,0.04)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold font-display text-[#0a1628]">Quiz Generated</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyQuiz}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#dde3eb] rounded-lg text-xs font-medium text-[#5a6578] hover:bg-[#edf1f7] transition-colors"
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy All'}
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#dde3eb] rounded-lg text-xs font-medium text-[#5a6578] hover:bg-[#edf1f7] transition-colors"
                    >
                      <Download size={14} />
                      Export JSON
                    </button>
                  </div>
                </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {/* Questions */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#a855f7] to-[#9333ea] text-white shadow-[0_8px_16px_rgba(168,85,247,0.25)] rounded-[20px] p-6 text-center flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                  <FileText size={22} className="text-white/80 mb-2 relative z-10" />
                  <span className="text-[32px] font-extrabold leading-none mb-1 relative z-10 drop-shadow-sm">{quizResult.questions.length}</span>
                  <span className="text-[12px] font-bold text-white/90 uppercase tracking-widest relative z-10">Questions</span>
                </div>
                {/* Total Points */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#f43f5e] to-[#e11d48] text-white shadow-[0_8px_16px_rgba(244,63,94,0.25)] rounded-[20px] p-6 text-center flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                  <Target size={22} className="text-white/80 mb-2 relative z-10" />
                  <span className="text-[32px] font-extrabold leading-none mb-1 relative z-10 drop-shadow-sm">{quizResult.totalPoints}</span>
                  <span className="text-[12px] font-bold text-white/90 uppercase tracking-widest relative z-10">Total Points</span>
                </div>
                {/* Topics */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white shadow-[0_8px_16px_rgba(245,158,11,0.25)] rounded-[20px] p-6 text-center flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                  <BookOpen size={22} className="text-white/80 mb-2 relative z-10" />
                  <span className="text-[32px] font-extrabold leading-none mb-1 relative z-10 drop-shadow-sm">{Object.keys(quizResult.metadata.topicsCovered).length}</span>
                  <span className="text-[12px] font-bold text-white/90 uppercase tracking-widest relative z-10">Topics</span>
                </div>
                {/* Bloom Levels */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#10b981] to-[#059669] text-white shadow-[0_8px_16px_rgba(16,185,129,0.25)] rounded-[20px] p-6 text-center flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                  <Layers size={22} className="text-white/80 mb-2 relative z-10" />
                  <span className="text-[32px] font-extrabold leading-none mb-1 relative z-10 drop-shadow-sm">{Object.keys(quizResult.metadata.bloomTaxonomyDistribution).length}</span>
                  <span className="text-[12px] font-bold text-white/90 uppercase tracking-widest relative z-10">Bloom Levels</span>
                </div>
              </div>

                {(quizResult.metadata.usedImportedTopics || (quizResult.metadata.topicProvenance || []).length > 0) && (
                  <div className="mt-4 bg-white rounded-lg p-3 border border-[#dde3eb]">
                    <p className="text-xs font-semibold text-[#5a6578] mb-2">Imported Topic Provenance</p>
                    <p className="text-xs text-[#5a6578] mb-2">
                      Imported topics used: {quizResult.metadata.usedImportedTopics ? 'Yes' : 'No'}
                      {' • '}Materials: {quizResult.metadata.importedMaterialsCount ?? 0}
                      {' • '}Topics: {quizResult.metadata.importedTopicCount ?? 0}
                    </p>
                    {(quizResult.metadata.topicProvenance || []).slice(0, 5).map((item, index) => (
                      <div key={`${item.topicId || item.title || 'topic'}_${index}`} className="text-xs text-[#5a6578]">
                        {item.title || 'Untitled topic'}
                        {item.sourceFile ? ` • ${item.sourceFile}` : ''}
                      </div>
                    ))}
                    {(quizProvenanceSources.length > 0 || quizProvenanceMaterials.length > 0) && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <label className="text-xs text-[#5a6578] flex flex-col gap-1">
                          <span className="font-semibold">Filter by Source File</span>
                          <select
                            value={provenanceSourceFilter}
                            onChange={(event) => setProvenanceSourceFilter(event.target.value)}
                            className="bg-white border border-[#dde3eb] rounded-md px-2 py-1.5 text-xs"
                          >
                            <option value="all">All sources</option>
                            {quizProvenanceSources.map((source) => (
                              <option key={source} value={source}>{source}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-[#5a6578] flex flex-col gap-1">
                          <span className="font-semibold">Filter by Material ID</span>
                          <select
                            value={provenanceMaterialFilter}
                            onChange={(event) => setProvenanceMaterialFilter(event.target.value)}
                            className="bg-white border border-[#dde3eb] rounded-md px-2 py-1.5 text-xs"
                          >
                            <option value="all">All materials</option>
                            {quizProvenanceMaterials.map((material) => (
                              <option key={material} value={material}>{material}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                    <p className="text-[11px] text-[#5a6578] mt-2">
                      Showing {filteredQuizQuestions.length} of {quizResult.questions.length} questions after provenance filters.
                    </p>
                  </div>
                )}

              {/* Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-10">
                <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-sm border-t-[4px] border-t-[#10b981] hover:shadow-md transition-shadow">
                  <h4 className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-5 flex items-center gap-2"><BarChart3 size={14} /> Difficulty</h4>
                  <div className="space-y-3 text-[14px] font-medium text-[#475569]">
                    {Object.entries(quizResult.metadata.difficultyBreakdown).map(([d, c]) => (
                      <div key={d} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                        <span className={`font-bold capitalize ${DIFFICULTY_COLORS[d as DifficultyLevel] || 'text-[#475569]'}`}>{d}</span>
                        <span className="font-bold text-[#1e293b] bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-sm border-t-[4px] border-t-[#a855f7] hover:shadow-md transition-shadow">
                  <h4 className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-5 flex items-center gap-2"><Brain size={14} /> Bloom's Taxonomy</h4>
                  <div className="space-y-3 text-[14px] font-medium text-[#475569]">
                    {Object.entries(quizResult.metadata.bloomTaxonomyDistribution).map(([b, c]) => (
                      <div key={b} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                        <span className="text-[#1e293b] font-semibold capitalize">{b}</span>
                        <span className="font-bold text-[#1e293b] bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-sm border-t-[4px] border-t-[#0ea5e9] hover:shadow-md transition-shadow">
                  <h4 className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-5 flex items-center gap-2"><Layers size={14} /> Question Types</h4>
                  <div className="space-y-3 text-[14px] font-medium text-[#475569]">
                    {Object.entries(quizResult.metadata.questionTypeBreakdown).map(([t, c]) => (
                      <div key={t} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                        <span className="text-[#1e293b] font-semibold">{QUESTION_TYPE_LABELS[t as QuestionType]?.label || t}</span>
                        <span className="font-bold text-[#1e293b] bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Insight + Recommended Actions Box */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50/50 border border-purple-100 rounded-[16px] p-6 mb-10 flex items-start gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#a855f7]" />
                <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                  <Info size={18} className="text-[#9333ea]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#9333ea] mb-3">
                    {quizResult.metadata.supplementalPurpose || 'This quiz is designed to supplement classroom instruction, not replace teacher-led learning.'}
                  </p>
                  {quizResult.metadata.recommendedTeacherActions && quizResult.metadata.recommendedTeacherActions.length > 0 && (
                    <>
                      <p className="text-[13px] font-bold text-[#1e293b] mb-2">Recommended Actions:</p>
                      <ul className="list-disc pl-5 text-[13px] font-medium text-[#475569] space-y-1.5">
                        {quizResult.metadata.recommendedTeacherActions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                <h3 className="text-[18px] font-bold text-[#1e293b] flex items-center gap-2">
                  <ListChecks size={20} className="text-[#a855f7]" /> Review Questions
                </h3>
                <div className="space-y-4">
                  {filteredQuizQuestions.length > 0 ? (
                    filteredQuizQuestions.map((q, i) => renderQuestionCard(q, i, true))
                  ) : (
                    <div className="border border-[#dde3eb] rounded-xl p-4 bg-white text-sm text-[#5a6578]">
                      No questions match the selected provenance filters. Clear one or both filters to view all questions.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </>)}
      </div>

      {/* EDGE-TO-EDGE STICKY ACTION BAR */}
      {activeTab === 'create' && (
        <div className="sticky bottom-0 mt-auto w-full bg-white/90 backdrop-blur-[12px] border-t border-[#e2e8f0] z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <div className="w-full px-4 md:px-6 xl:px-8 py-3 md:py-4 flex items-center justify-between gap-2">
            <div>
              {step === 'topics' && !generating && (
                <button onClick={() => { setSelectedTopics([]); setExcludeTopics([]); }} className="text-[12px] md:text-[13px] font-semibold text-[#a855f7] hover:underline">
                  Clear all
                </button>
              )}
              {(step === 'style' || step === 'preview') && !generating && (
                <button onClick={() => setStep(step === 'preview' ? 'style' : 'topics')} className="bg-white hover:bg-slate-50 border border-slate-200 text-[#475569] text-[12px] md:text-[14px] font-semibold rounded-full px-3 md:px-6 py-2 md:py-2.5 shadow-sm transition-transform hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                  <ChevronLeft size={14} style={{width:14,height:14}} /> <span className="hidden sm:inline">Back</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step === 'setup' && !generating && (
                <button onClick={() => setStep('topics')} className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-[12px] md:text-[14px] font-semibold rounded-full px-4 md:px-8 py-2 md:py-2.5 shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-transform hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                  Next <ChevronRight size={14} style={{width:14,height:14}} />
                </button>
              )}
              {step === 'topics' && !generating && (
                <>
                  <button onClick={() => setStep('setup')} className="bg-white hover:bg-slate-50 border border-slate-200 text-[#475569] text-[12px] md:text-[14px] font-semibold rounded-full px-3 md:px-6 py-2 md:py-2.5 shadow-sm transition-transform hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                    <ChevronLeft size={14} style={{width:14,height:14}} /> <span className="hidden sm:inline">Back</span>
                  </button>
                  <button onClick={() => setStep('style')} className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-[12px] md:text-[14px] font-semibold rounded-full px-3 md:px-6 py-2 md:py-2.5 shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-transform hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                    Next <ChevronRight size={14} style={{width:14,height:14}} />
                  </button>
                </>
              )}
              {step === 'style' && !generating && (
                <button onClick={() => setStep('preview')} className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-[12px] md:text-[14px] font-semibold rounded-full px-4 md:px-8 py-2 md:py-2.5 shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-transform hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                  Next <ChevronRight size={14} style={{width:14,height:14}} />
                </button>
              )}
              {step === 'preview' && !generating && !quizResult && (
                <button onClick={handleGenerate} className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-[12px] md:text-[14px] font-bold rounded-full px-4 md:px-8 py-2 md:py-2.5 shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-all hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                  <Check size={14} style={{width:14,height:14}} /> <span className="hidden sm:inline">Generate </span>Quiz
                </button>
              )}
              {generating && (
                <div className="flex items-center gap-2 md:gap-3 text-slate-500 font-medium text-xs md:text-sm">
                  <Loader2 size={14} className="animate-spin" style={{width:14,height:14}} /> <span className="hidden sm:inline">Generating quiz... Please wait.</span><span className="sm:hidden">Generating...</span>
                </div>
              )}
              {step === 'results' && (
                viewingBankQuizId ? (
                  <>
                    <button onClick={() => { setActiveTab('bank'); setViewingBankQuizId(null); }} className="bg-white hover:bg-slate-50 border border-slate-200 text-[#475569] text-[11px] md:text-[14px] font-semibold rounded-full px-3 md:px-6 py-2 md:py-2.5 shadow-sm transition-transform hover:scale-[1.02]">
                      <span className="hidden sm:inline">Back to </span>Quiz Bank
                    </button>
                    <button onClick={() => handleOpenAssign(viewingBankQuizId)} className="bg-white border border-[#a855f7] text-[#9333ea] hover:bg-purple-50 text-[11px] md:text-[14px] font-bold rounded-full px-3 md:px-6 py-2 md:py-2.5 shadow-sm transition-transform hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                      <Send size={14} style={{width:14,height:14}} /> <span className="hidden sm:inline">Assign</span>
                    </button>
                    <button onClick={handleBack} className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-[11px] md:text-[14px] font-bold rounded-full px-4 md:px-8 py-2 md:py-2.5 shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-transform hover:scale-[1.02]">Done</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setStep('setup'); setQuizResult(null); setPreviewResult(null); setSavedQuizId(null); setViewingBankQuizId(null); }} className="bg-white hover:bg-slate-50 border border-slate-200 text-[#475569] text-[11px] md:text-[14px] font-semibold rounded-full px-3 md:px-6 py-2 md:py-2.5 shadow-sm transition-transform hover:scale-[1.02]">
                      <span className="hidden sm:inline">Create Another</span><span className="sm:hidden">New</span>
                    </button>
                    {!savedQuizId ? (
                      <button onClick={handleSaveToLibrary} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-8 py-2 md:py-2.5 rounded-full font-bold shadow-lg shadow-emerald-500/30 hover:-translate-y-1 transition-all flex items-center gap-1 md:gap-2 text-[11px] md:text-[14px]">
                        {saving ? <Loader2 size={14} className="animate-spin" style={{width:14,height:14}} /> : <Save size={14} style={{width:14,height:14}} />} <span className="hidden sm:inline">Save to Library</span>
                      </button>
                    ) : (
                      <>
                        <button onClick={handlePublish} disabled={publishing} className="bg-white border border-[#a855f7] text-[#9333ea] hover:bg-purple-50 text-[11px] md:text-[14px] font-bold rounded-full px-3 md:px-6 py-2 md:py-2.5 shadow-sm transition-transform hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                          {publishing ? <Loader2 size={14} className="animate-spin" style={{width:14,height:14}} /> : <TrendingUp size={14} style={{width:14,height:14}} />} <span className="hidden sm:inline">Publish</span>
                        </button>
                        <button onClick={() => handleOpenAssign()} className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-[11px] md:text-[14px] font-bold rounded-full px-3 md:px-6 py-2 md:py-2.5 shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-transform hover:scale-[1.02] flex items-center gap-1 md:gap-2">
                          <Send size={14} style={{width:14,height:14}} /> <span className="hidden sm:inline">Assign to Class</span>
                        </button>
                      </>
                    )}
                    <button onClick={handleBack} className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-[11px] md:text-[14px] font-bold rounded-full px-4 md:px-8 py-2 md:py-2.5 shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-transform hover:scale-[1.02]">Done</button>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}

      
      <BloomsTaxonomyModal isOpen={showBloomsModal} onClose={() => setShowBloomsModal(false)} />

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
              className="bg-[#f7f9fc] rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden border border-[#dde3eb]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-[#dde3eb] flex items-center justify-between">
                <h3 className="text-base font-bold font-display text-[#0a1628] flex items-center gap-2">
                  <Users size={18} className="text-sky-600" />
                  Assign to Student
                </h3>
                <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-[#edf1f7] rounded-lg transition-colors">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-[#dde3eb]">
                <div className="flex items-center gap-2 bg-[#edf1f7] rounded-xl px-3 py-2">
                  <Search size={14} className="text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search students…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-sky-500" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-10">No students found</p>
                ) : (
                  filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        selectedStudentId === s.id
                          ? 'bg-sky-50 border border-sky-300'
                          : 'hover:bg-[#edf1f7] border border-transparent'
                      }`}
                    >
                      <img
                        src={(s.avatar && !s.avatar.includes('ui-avatars.com')) ? s.avatar : getDefaultAvatar(s.gender)}
                        alt={s.name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0a1628] truncate">{s.name}</p>
                        <p className="text-xs text-slate-500 truncate">{s.email}</p>
                      </div>
                      {selectedStudentId === s.id && <Check size={16} className="text-sky-600 flex-shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              <div className="px-5 py-3 border-t border-[#dde3eb] flex justify-end gap-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-[#5a6578] hover:bg-[#edf1f7] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedStudentId || assigning}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedStudentId && !assigning
                      ? 'bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-sm'
                      : 'bg-[#dde3eb] text-slate-500 cursor-not-allowed'
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

  // In drawer mode, strip the outer gradient background \u2014 the drawer shell handles it
  if (drawerMode) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-white">
        {content}
      </div>
    );
  }

  return content;
};

export default QuizMaker;
