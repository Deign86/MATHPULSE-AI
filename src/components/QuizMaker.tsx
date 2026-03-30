import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  onClose: () => void;
  gradeLevel?: string;
  selectedClassId?: string;
  selectedClassName?: string;
}

type Step = 'configure' | 'preview' | 'results';
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
  onClose,
  gradeLevel: initialGrade,
  selectedClassId,
  selectedClassName,
}) => {
  const { currentUser, loading: authLoading } = useAuth();
  const rolloutFlags = useMemo(() => apiService.getImportGroundedRolloutFlags(), []);

  // Tab state
  const [activeTab, setActiveTab] = useState<MakerTab>('create');

  // Form state
  const [step, setStep] = useState<Step>('configure');
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

  const handleClose = () => {
    if (generating && activeTaskId) {
      toast.info('Quiz generation will continue in the background. Reopen this modal to resume progress.');
    }
    onClose();
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

  const renderQuestionCard = (q: QuizQuestionGenerated, index: number, showAnswer: boolean) => {
    const isExpanded = expandedQuestion === index;
    const bloomBadge = BLOOM_BADGE_COLORS[q.bloomLevel] || 'bg-[#edf1f7] text-[#5a6578] border-[#dde3eb]';
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="border border-[#dde3eb] rounded-xl overflow-hidden relative"
      >
        {/* Bloom Level Badge - top right */}
        <div className={`absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${bloomBadge} z-10`}>
          {q.bloomLevel}
        </div>
        <div
          className="p-4 cursor-pointer hover:bg-[#edf1f7] transition-colors"
          onClick={() => setExpandedQuestion(isExpanded ? null : index)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold text-white bg-sky-600 px-2 py-0.5 rounded">Q{index + 1}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${BLOOM_LABELS[q.bloomLevel as BloomLevel]?.color || 'bg-[#edf1f7] text-[#5a6578]'}`}>
                  {q.bloomLevel}
                </span>
                <span className={`text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty as DifficultyLevel] || 'text-[#5a6578]'}`}>
                  {q.difficulty}
                </span>
                <span className="text-xs text-slate-500">{q.points} pts</span>
                <span className="text-xs bg-[#edf1f7] text-[#5a6578] px-2 py-0.5 rounded">{q.topic}</span>
              </div>
              <p className="text-sm text-[#0a1628] font-medium">{q.question}</p>
            </div>
            <div className="flex-shrink-0 mt-1">
              {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-[#dde3eb] overflow-hidden"
            >
              <div className="p-4 space-y-3 bg-[#edf1f7]/50">
                {q.options && (
                  <div>
                    <p className="text-xs font-semibold text-[#5a6578] mb-1">Options:</p>
                    <div className="space-y-1">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`text-sm px-3 py-1.5 rounded-lg ${
                            showAnswer && opt.includes(q.correctAnswer)
                              ? 'bg-green-100 text-green-800 font-medium'
                              : 'bg-white text-[#0a1628]'
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
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-sky-700 mb-1">Explanation:</p>
                      <p className="text-sm text-sky-800">{q.explanation}</p>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Type: {QUESTION_TYPE_LABELS[q.questionType as QuestionType]?.label || q.questionType}</span>
                  <span>Bloom: {q.bloomLevel}</span>
                </div>
                {q.provenance && (
                  <div className="bg-[#f7fbff] border border-sky-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-sky-700 mb-1">Item Provenance</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-[#5a6578]">
                      {q.provenance.title && <p>Topic: {q.provenance.title}</p>}
                      {q.provenance.topicId && <p>Topic ID: {q.provenance.topicId}</p>}
                      {q.provenance.materialId && <p>Material ID: {q.provenance.materialId}</p>}
                      {q.provenance.sourceFile && <p>Source File: {q.provenance.sourceFile}</p>}
                      {q.provenance.sectionId && <p>Section ID: {q.provenance.sectionId}</p>}
                    </div>
                  </div>
                )}
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
        className="bg-[#f7f9fc] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-[#dde3eb]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain size={22} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">AI Quiz Maker</h2>
                <p className="text-sky-300 text-sm">Generate AI-powered assessments with Bloom's Taxonomy</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'create' ? 'bg-white text-sky-700' : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              <Wand2 size={14} /> Create Quiz
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'bank' ? 'bg-white text-sky-700' : 'bg-white/20 text-white/80 hover:bg-white/30'
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
                      step === s ? 'bg-white/90 text-sky-700' : 'bg-white/15 text-white/70 hover:bg-white/25'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === s ? 'bg-sky-600 text-white' : 'bg-white/30'
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
                      bankFilter === f ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-[#edf1f7] text-[#5a6578] hover:bg-[#dde3eb]'
                    }`}
                  >
                    {f}
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
                      className="border border-[#dde3eb] rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-bold text-[#0a1628] leading-tight">{q.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[q.status]}`}>
                          {q.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {q.metadata.topicsCovered.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] bg-[#edf1f7] text-[#5a6578] px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#5a6578] mb-3">
                        <span>{q.questions.length} questions</span>
                        <span>{q.totalPoints} pts</span>
                        <span>{q.gradeLevel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleViewBankQuiz(q);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#edf1f7] text-[#5a6578] rounded-lg hover:bg-[#dde3eb] transition-colors"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenAssign(q.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors"
                        >
                          <Send size={12} /> Assign
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteBankQuiz(q.id);
                          }}
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

          {generating && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-white border border-sky-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-sky-600" />
                  <p className="text-sm font-semibold text-[#0a1628]">Generating Quiz in Background</p>
                </div>
                <span className="text-xs font-bold text-sky-700">{generationProgress}%</span>
              </div>
              <div className="h-2 bg-[#edf1f7] rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${generationProgress}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-sky-600 to-cyan-500"
                />
              </div>
              <p className="mt-2 text-xs text-[#5a6578] capitalize">
                Stage: {generationStage.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-[#5a6578]">{generationMessage}</p>
              {activeTaskId && (
                <p className="text-[11px] text-[#7b8798] mt-1">Task ID: {activeTaskId}</p>
              )}
            </motion.div>
          )}

          {/* ─── STEP: CONFIGURE ─── */}
          {step === 'configure' && (
            <div className="space-y-4">
              {/* Supplemental notice */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
                <Lightbulb size={18} className="text-sky-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-sky-800">Supplemental Assessment Tool</p>
                  <p className="text-xs text-sky-600">
                    This quiz maker generates supplemental assessments to support your classroom instruction — 
                    it does not replace teacher-led learning. Questions follow Bloom's Taxonomy for comprehensive skill evaluation.
                  </p>
                  <p className="text-[11px] text-sky-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    Generation limit: up to {MAX_QUESTIONS_LIMIT} questions and {MAX_TOPICS_LIMIT} topics per quiz.
                  </p>
                </div>
              </div>

              {/* Grade + Question Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quiz-grade-level" className="text-sm font-semibold text-[#0a1628] mb-1.5 block">Grade Level</label>
                  <select
                    id="quiz-grade-level"
                    value={selectedGrade}
                    onChange={e => setSelectedGrade(normalizeGradeLevel(e.target.value))}
                    className="w-full border border-[#dde3eb] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none bg-white"
                  >
                    {GRADE_LEVELS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="quiz-num-questions" className="text-sm font-semibold text-[#0a1628] mb-1.5 block">Number of Questions</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setNumQuestions(Math.max(1, numQuestions - 1))}
                      className="w-9 h-9 border border-[#dde3eb] rounded-lg flex items-center justify-center hover:bg-[#edf1f7] transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      id="quiz-num-questions"
                      type="number"
                      min={1}
                      max={MAX_QUESTIONS_LIMIT}
                      value={numQuestions}
                      onChange={e => setNumQuestions(Math.min(MAX_QUESTIONS_LIMIT, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center border border-[#dde3eb] rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                    />
                    <button
                      onClick={() => setNumQuestions(Math.min(MAX_QUESTIONS_LIMIT, numQuestions + 1))}
                      className="w-9 h-9 border border-[#dde3eb] rounded-lg flex items-center justify-center hover:bg-[#edf1f7] transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Topics */}
              {renderSection('topics', 'Topics', <BookOpen size={16} />, (
                <div className="space-y-3">
                  <div className="bg-[#f6f9ff] border border-[#dde3eb] rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#0a1628]">
                      Imported topic context
                      {selectedClassName ? ` for ${selectedClassName}` : ''}
                    </p>
                    <p className="text-xs text-[#5a6578] mt-1">
                      {importedTopicsLoading
                        ? 'Loading imported topics...'
                        : importedTopics.length > 0
                        ? `${importedTopics.length} imported topic${importedTopics.length !== 1 ? 's' : ''} available and prioritized during generation`
                        : 'No imported topics found for the current class context'}
                    </p>
                    {importedTopicsWarning && (
                      <p className="text-[11px] text-amber-700 mt-1">{importedTopicsWarning}</p>
                    )}
                  </div>
                  {topicsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[#5a6578]">
                      <Loader2 size={14} className="animate-spin" /> Loading topics...
                    </div>
                  ) : (
                    Object.entries(mergedAvailableTopics).map(([category, subtopics]) => (
                      <div key={category}>
                        <p className="text-xs font-bold text-[#5a6578] uppercase tracking-wide mb-2">{category}</p>
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
                                      ? 'bg-sky-100 border-sky-400 text-sky-700 font-medium'
                                      : isExcluded
                                      ? 'bg-red-50 border-red-200 text-red-400 line-through'
                                      : 'bg-white border-[#dde3eb] text-[#5a6578] hover:border-sky-300'
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
                                      : 'bg-[#edf1f7] text-slate-500 hover:bg-red-100 hover:text-red-500'
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
                    <p className={`text-xs mt-2 ${selectedTopics.filter(t => !excludeTopics.includes(t)).length > MAX_TOPICS_LIMIT ? 'text-rose-600 font-medium' : 'text-sky-600'}`}>
                      {selectedTopics.filter(t => !excludeTopics.includes(t)).length} topic{selectedTopics.filter(t => !excludeTopics.includes(t)).length !== 1 ? 's' : ''} selected
                      {selectedTopics.filter(t => !excludeTopics.includes(t)).length > MAX_TOPICS_LIMIT && ` (only first ${MAX_TOPICS_LIMIT} will be used)`}
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
                          ? 'bg-sky-50 border-sky-300 text-sky-700'
                          : 'bg-white border-[#dde3eb] text-[#5a6578] hover:border-sky-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedTypes.includes(type) ? 'bg-sky-200' : 'bg-[#edf1f7]'
                      }`}>
                        {info.icon}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{info.label}</span>
                        <p className="text-xs text-slate-500">{info.description}</p>
                      </div>
                      {selectedTypes.includes(type) && <Check size={16} className="text-sky-600" />}
                    </button>
                  ))}

                  {/* Graph toggle */}
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#dde3eb] cursor-pointer hover:bg-[#edf1f7] transition-colors mt-3">
                    <input
                      type="checkbox"
                      checked={includeGraphs}
                      onChange={e => setIncludeGraphs(e.target.checked)}
                      className="w-4 h-4 rounded border-[#dde3eb] text-sky-600 focus:ring-sky-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-[#0a1628]">Include Graph Questions</span>
                      <p className="text-xs text-slate-500">
                        Generates identification-type questions about graphs (text-described, as graphing is challenging for students)
                      </p>
                    </div>
                  </label>
                </div>
              ))}

              {/* Bloom's Taxonomy */}
              {renderSection('bloom', <span className="flex items-center gap-2">Bloom's Taxonomy Levels<span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setShowBloomsModal(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setShowBloomsModal(true); } }} className="w-5 h-5 rounded-full bg-cyan-100 hover:bg-cyan-200 flex items-center justify-center transition-colors cursor-pointer" title="What is Bloom's Taxonomy?"><Info size={12} className="text-sky-600" /></span></span>, <GraduationCap size={16} />, (
                <div className="space-y-3">
                  <div className="bg-[#edf1f7] rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#5a6578]">
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
                            : 'bg-white border-[#dde3eb] text-[#5a6578]'
                        }`}
                      >
                        <span className="text-sm">{info.label}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">{info.description}</span>
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
                      <div className="flex-1 h-2 bg-[#edf1f7] rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${
                            level === 'easy' ? 'bg-green-500' : level === 'medium' ? 'bg-rose-500' : 'bg-red-500'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustDifficulty(level, -5)}
                          className="w-6 h-6 rounded border border-[#dde3eb] flex items-center justify-center hover:bg-[#edf1f7] text-slate-500"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-sm font-bold w-10 text-center">{pct}%</span>
                        <button
                          onClick={() => adjustDifficulty(level, 5)}
                          className="w-6 h-6 rounded border border-[#dde3eb] flex items-center justify-center hover:bg-[#edf1f7] text-slate-500"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 text-center">
                    Total: {Object.values(difficultyDist).reduce((a, b) => a + b, 0)}%
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ─── STEP: PREVIEW ─── */}
          {step === 'preview' && previewResult && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                <Eye size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-800">Preview Mode</p>
                  <p className="text-xs text-rose-600">
                    Showing {previewResult.questions.length} sample questions.
                    Click each question to reveal its answer and explanation. Review quality before generating the full quiz.
                  </p>
                </div>
              </div>

              {previewResult.questions.map((q, i) => renderQuestionCard(q, i, true))}

              <div className="bg-[#edf1f7] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#5a6578] mb-2">Preview Metadata</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#5a6578]">
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
              <div className="bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200 rounded-xl p-5">
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-sky-600">{quizResult.questions.length}</p>
                    <p className="text-xs text-[#5a6578]">Questions</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-rose-600">{quizResult.totalPoints}</p>
                    <p className="text-xs text-[#5a6578]">Total Points</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-rose-600">
                      {Object.keys(quizResult.metadata.topicsCovered).length}
                    </p>
                    <p className="text-xs text-[#5a6578]">Topics</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {Object.keys(quizResult.metadata.bloomTaxonomyDistribution).length}
                    </p>
                    <p className="text-xs text-[#5a6578]">Bloom Levels</p>
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

                {/* Distribution breakdowns */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#5a6578] mb-2">Difficulty</p>
                    {Object.entries(quizResult.metadata.difficultyBreakdown).map(([d, c]) => (
                      <div key={d} className="flex justify-between text-xs">
                        <span className={`capitalize ${DIFFICULTY_COLORS[d as DifficultyLevel] || 'text-[#5a6578]'}`}>{d}</span>
                        <span className="font-medium">{c}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#5a6578] mb-2">Bloom's Taxonomy</p>
                    {Object.entries(quizResult.metadata.bloomTaxonomyDistribution).map(([b, c]) => (
                      <div key={b} className="flex justify-between text-xs">
                        <span className="capitalize">{b}</span>
                        <span className="font-medium">{c}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#5a6578] mb-2">Question Types</p>
                    {Object.entries(quizResult.metadata.questionTypeBreakdown).map(([t, c]) => (
                      <div key={t} className="flex justify-between text-xs">
                        <span>{QUESTION_TYPE_LABELS[t as QuestionType]?.label || t}</span>
                        <span className="font-medium">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supplemental purpose */}
                <div className="mt-3 bg-sky-50 rounded-lg p-3 flex items-start gap-2">
                  <Info size={14} className="text-sky-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-sky-600">{quizResult.metadata.supplementalPurpose}</p>
                </div>

                {/* Teacher recommendations */}
                {quizResult.metadata.recommendedTeacherActions && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-[#5a6578] mb-1">Recommended Actions:</p>
                    <ul className="list-disc list-inside text-xs text-[#5a6578] space-y-0.5">
                      {quizResult.metadata.recommendedTeacherActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {filteredQuizQuestions.length > 0 ? (
                  filteredQuizQuestions.map((q, i) => renderQuestionCard(q, i, true))
                ) : (
                  <div className="border border-[#dde3eb] rounded-xl p-4 bg-white text-sm text-[#5a6578]">
                    No questions match the selected provenance filters. Clear one or both filters to view all questions.
                  </div>
                )}
              </div>
            </div>
          )}
          </>)}
        </div>

        {/* Footer (Create tab only) */}
        {activeTab === 'create' && (
        <div className="border-t border-[#dde3eb] px-6 py-4 bg-[#edf1f7] flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {step === 'configure' && (
              <span className="flex items-center gap-1">
                <Sparkles size={12} /> Powered by Qwen/Qwen3.5-9B
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
                      ? 'bg-white border border-sky-300 text-sky-700 hover:bg-sky-50'
                      : 'bg-[#edf1f7] text-slate-500 cursor-not-allowed'
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
                      ? 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white shadow-lg shadow-sky-200'
                      : 'bg-[#dde3eb] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {generating ? `Generating... ${generationProgress}%` : 'Generate Quiz'}
                </button>
              </>
            )}

            {step === 'preview' && (
              <>
                <button
                  onClick={() => setStep('configure')}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-[#dde3eb] text-[#5a6578] hover:bg-[#edf1f7] transition-colors"
                >
                  Back to Configure
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white shadow-lg shadow-sky-200 transition-all"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {generating ? `Generating... ${generationProgress}%` : `Generate Full Quiz (${numQuestions} Qs)`}
                </button>
              </>
            )}

            {step === 'results' && (
              viewingBankQuizId ? (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('bank');
                      setViewingBankQuizId(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-[#dde3eb] text-[#5a6578] hover:bg-[#edf1f7] transition-colors"
                  >
                    Back to Quiz Bank
                  </button>
                  <button
                    onClick={() => handleOpenAssign(viewingBankQuizId)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-50 border border-sky-300 text-sky-700 hover:bg-sky-100 transition-colors"
                  >
                    <Send size={16} /> Assign
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white transition-all"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setStep('configure');
                      setQuizResult(null);
                      setPreviewResult(null);
                      setSavedQuizId(null);
                      setViewingBankQuizId(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-[#dde3eb] text-[#5a6578] hover:bg-[#edf1f7] transition-colors"
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
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-50 border border-sky-300 text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        <Send size={16} /> Assign
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white transition-all"
                  >
                    Done
                  </button>
                </>
              )
            )}
          </div>
        </div>
        )}
      </motion.div>

      {/* Bloom's Taxonomy Info Modal */}
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
                        src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&size=32`}
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
};

export default QuizMaker;
