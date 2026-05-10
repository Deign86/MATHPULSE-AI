import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle, BookOpen, Lightbulb,
  Calculator, Award, RefreshCw, AlertTriangle, Eye, EyeOff, PlayCircle, NotebookPen,
  Clock, Key, ClipboardCheck, Target, Zap
} from 'lucide-react';
import { VideoLessonSection } from './notebook/VideoLessonSection';

import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { Lesson, Quiz } from '../data/subjects';
import { useLessonContent } from '../hooks/useLessonContent';
import type { LucideIcon } from 'lucide-react';
import type { RagLessonSection } from '../services/lessonService';

interface LessonViewerProps {
  lesson: Lesson & { subjectId?: string; lessonId?: string; competencyCode?: string };
  lessonCompletionXP?: number;
  practiceQuiz?: Quiz | null;
  practiceQuizCompleted?: boolean;
  practiceQuizScore?: number;
  initialSection?: number;
  onStartPractice?: () => void;
  onBack: () => void;
  onComplete: (score?: number, totalXP?: number, goToNext?: boolean) => void;
  onProgressUpdate?: (percent: number) => void;
}

function LoadingSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 gap-5">
      <div className="w-12 h-12 rounded-full border-4 border-rose-400 border-t-transparent animate-spin" />
      <div className="space-y-2 text-center">
        <p className="text-slate-700 font-semibold text-base">Loading lesson from DepEd curriculum...</p>
        <p className="text-slate-400 text-xs max-w-xs">This may take a moment while the AI retrieves curriculum content.</p>
      </div>
      <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-rose-300 rounded-full"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '50%' }}
        />
      </div>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
  isOffline,
}: {
  message: string;
  onRetry: () => void;
  isOffline: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 text-center"
      >
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="text-red-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {isOffline ? 'Lesson Source Unavailable' : 'Failed to Load Lesson'}
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">{message}</p>
        <Button
          onClick={onRetry}
          className="w-full py-3 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} />
          Try Again
        </Button>
      </motion.div>
    </div>
  );
}

function SectionRenderer({
  section,
  sectionIndex,
  onShowSolution,
  expandedIndex,
  lesson,
  practiceQuiz,
  practiceQuizCompleted,
  practiceQuizScore,
  onStartPractice,
  lessonSpecificTopic,
}: {
  section: RagLessonSection;
  sectionIndex: number;
  onShowSolution: (idx: number) => void;
  expandedIndex: number | null;
  lesson: LessonViewerProps['lesson'];
  practiceQuiz?: Quiz | null;
  practiceQuizCompleted?: boolean;
  practiceQuizScore?: number;
  onStartPractice?: () => void;
  lessonSpecificTopic?: string | null;
}) {
  switch (section.type) {
    case 'introduction':
      return (
        <div className="space-y-4">
          {section.content?.trim() ? (
            <p className="text-slate-700 leading-relaxed text-base whitespace-pre-line">
              {section.content}
            </p>
          ) : (
            <p className="text-slate-400 text-sm italic">Introduction content is being prepared. Please proceed to the next section or try refreshing the lesson.</p>
          )}
        </div>
      );

    case 'key_concepts':
      return (
        <div className="space-y-4">
          {section.content?.trim() ? (
            <p className="text-slate-700 leading-relaxed text-base whitespace-pre-line mb-4">
              {section.content}
            </p>
          ) : (
            <p className="text-slate-400 text-sm italic mb-4">Key concepts are being compiled. Review the curriculum sources below for reference material.</p>
          )}
          {section.callouts && section.callouts.length > 0 && (
            <div className="space-y-2">
              {section.callouts.map((callout, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 border-l-4 flex items-start gap-3 ${
                    callout.type === 'important'
                      ? 'bg-rose-50 border-rose-400'
                      : callout.type === 'tip'
                      ? 'bg-emerald-50 border-emerald-400'
                      : 'bg-amber-50 border-amber-400'
                  }`}
                >
                  <Lightbulb
                    size={18}
                    className={
                      callout.type === 'important'
                        ? 'text-rose-500 mt-0.5'
                        : callout.type === 'tip'
                        ? 'text-emerald-500 mt-0.5'
                        : 'text-amber-500 mt-0.5'
                    }
                  />
                  <p className="text-sm text-slate-700">{callout.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'video':
      return (
        <div className="space-y-4">
          {section.content?.trim() ? (
            <p className="text-slate-600 text-sm">{section.content}</p>
          ) : (
            <p className="text-slate-400 text-sm italic">Video explanation loading...</p>
          )}
          <VideoLessonSection
            videos={section.videos || []}
            topic={lesson.title}
          />
        </div>
      );

    case 'worked_examples':
      return (
        <div className="space-y-4">
          {section.examples && section.examples.length > 0 ? (
            section.examples.map((example, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-5 border border-rose-100"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calculator size={16} className="text-white" />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm pt-1">{example.problem}</p>
                </div>
                <div className="space-y-1.5 ml-11">
                  {example.steps.map((step, si) => (
                    <p key={si} className="text-slate-600 text-sm">
                      {si + 1}. {step}
                    </p>
                  ))}
                  {example.answer && (
                    <p className="text-slate-800 text-sm font-semibold mt-2 pt-2 border-t border-rose-100">
                      Answer: {example.answer}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm italic">No worked examples available for this lesson.</p>
          )}
        </div>
      );

    case 'important_notes':
      return (
        <div className="space-y-2">
          {section.bulletPoints && section.bulletPoints.length > 0 ? (
            section.bulletPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <p className="text-slate-700 text-sm leading-relaxed">{point}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm italic">No notes available for this lesson.</p>
          )}
        </div>
      );

    case 'try_it_yourself':
      return (
        <div className="space-y-4">
          {/* Try It Yourself — Button Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-orange-400 rounded-xl flex items-center justify-center shadow-sm">
                  <Zap size={20} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Try It Yourself!</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4 max-w-lg">
                Test your understanding of this lesson with an interactive quiz. Answer questions, get instant feedback, and track your progress to reinforce what you've learned.
              </p>
              {/* Always show Start Quiz button - use defaults if no practiceQuiz provided */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1"><NotebookPen size={12} /> {practiceQuiz?.questions || 10} questions</span>
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {practiceQuiz?.duration || lesson?.duration || '15 min'}</span>
                  <span className="inline-flex items-center gap-1 text-amber-500"><Zap size={12} className="fill-amber-300" /> +50 XP</span>
                </div>
                {practiceQuizCompleted ? (
                  <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-xl">
                    <CheckCircle size={16} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">
                      Quiz Complete
                      {typeof practiceQuizScore === 'number' && (
                        <span className="ml-1 text-emerald-600">{practiceQuizScore}%</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => onStartPractice?.()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2"
                  >
                    <ClipboardCheck size={16} />
                    Start Quiz
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );

    case 'summary':
      return (
        <div className="space-y-3">
          {section.content?.trim() ? (
            <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          ) : (
            <p className="text-slate-400 text-sm italic">Summary is being prepared. Review the lesson sections above to reinforce your understanding.</p>
          )}
        </div>
      );

    default:
      return (
        <p className="text-slate-500 text-sm italic">Section content not available.</p>
      );
  }
}

const SECTION_SYMBOLS: Record<string, string> = {
  introduction: 'Introduction',
  key_concepts: 'Key Concepts',
  video: 'Video Lesson',
  worked_examples: 'Worked Examples',
  important_notes: 'Important Notes',
  try_it_yourself: 'Try It Yourself',
  summary: 'Summary',
};

type LessonTab = {
  type: RagLessonSection['type'];
  label: string;
  helper: string;
  icon: LucideIcon;
  accent: string;
  tint: string;
  tabBg: string;
};

const SECTION_TABS: LessonTab[] = [
  {
    type: 'introduction',
    label: 'Intro',
    helper: 'Welcome note',
    icon: Clock,
    accent: 'from-[#1a85a4] to-[#126b84]',
    tint: 'bg-[#1a85a4] text-white border-transparent',
    tabBg: 'bg-[#1a85a4]',
  },
  {
    type: 'key_concepts',
    label: 'Concepts',
    helper: 'Core ideas',
    icon: Key,
    accent: 'from-[#fbab41] to-[#e0983a]',
    tint: 'bg-[#fbab41] text-white border-transparent',
    tabBg: 'bg-[#fbab41]',
  },
  {
    type: 'video',
    label: 'Video',
    helper: 'Watch and learn',
    icon: Lightbulb,
    accent: 'from-[#e66a5e] to-[#ce5e53]',
    tint: 'bg-[#e66a5e] text-white border-transparent',
    tabBg: 'bg-[#e66a5e]',
  },
  {
    type: 'worked_examples',
    label: 'Examples',
    helper: 'Guided solving',
    icon: ClipboardCheck,
    accent: 'from-[#7ec16d] to-[#71ad62]',
    tint: 'bg-[#7ec16d] text-white border-transparent',
    tabBg: 'bg-[#7ec16d]',
  },
  {
    type: 'important_notes',
    label: 'Notes',
    helper: 'Key reminders',
    icon: NotebookPen,
    accent: 'from-[#9a67d0] to-[#8a5cc0]',
    tint: 'bg-[#9a67d0] text-white border-transparent',
    tabBg: 'bg-[#9a67d0]',
  },
  {
    type: 'try_it_yourself',
    label: 'Practice',
    helper: 'Try it yourself',
    icon: Target,
    accent: 'from-[#eb74a6] to-[#d46895]',
    tint: 'bg-[#eb74a6] text-white border-transparent',
    tabBg: 'bg-[#eb74a6]',
  },
  {
    type: 'summary',
    label: 'Summary',
    helper: 'Wrap-up',
    icon: Award,
    accent: 'from-[#48bca6] to-[#40a794]',
    tint: 'bg-[#48bca6] text-white border-transparent',
    tabBg: 'bg-[#48bca6]',
  },
];

const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  lessonCompletionXP = 10,
  practiceQuiz,
  practiceQuizCompleted = false,
  practiceQuizScore,
  initialSection = 0,
  onStartPractice,
  onBack,
  onComplete,
  onProgressUpdate,
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showCompletion, setShowCompletion] = useState(false);
  const [expandedProblem, setExpandedProblem] = useState<number | null>(null);

  const request = {
    topic: lesson.title,
    subject: (lesson as any).subject || 'General Mathematics',
    quarter: (lesson as any).quarter || 1,
    lessonTitle: lesson.title,
    moduleId: (lesson as any).subjectId,
    lessonId: lesson.id,
    competencyCode: (lesson as any).competencyCode,
    learnerLevel: 'Grade 11-12',
    storagePath: (lesson as any).storagePath,
  };

  const {
    sections,
    isLoading,
    error,
    retry,
    sources,
    retrievalBand,
    needsReview,
    activeModel,
    isOffline,
  } = useLessonContent(lesson.id, request, true);

  // Extract specific lesson topic from RAG sections (e.g., "Simple Interest" from "Introduction to Simple Interest")
  // This fixes the quiz topic bug where the generic competency name was used instead
  const [lessonSpecificTopic, setLessonSpecificTopic] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length > 0) {
      const introSection = sections.find(s => s.type === 'introduction');
      if (introSection?.title) {
        const title = introSection.title;
        // Strip common prefixes: "Introduction to X", "Introduction - X", "X: Introduction", "X Introduction"
        const stripped = title
          .replace(/^Introduction\s+(to|-|:|—)\s+/i, '')
          .replace(/\s*[-:—]\s*Introduction$/i, '')
          .replace(/\s+Introduction$/i, '')
          .trim();
        if (stripped && stripped.toLowerCase() !== 'introduction') {
          setLessonSpecificTopic(stripped);
        }
      }
    }
  }, [sections]);

  const totalSections = sections.length || SECTION_TABS.length;

  useEffect(() => {
    if (initialSection >= 0 && initialSection < totalSections) {
      setCurrentSection(initialSection);
    }
  }, [lesson.id]);

  useEffect(() => {
    const practiceIdx = sections.findIndex((s) => s.type === 'try_it_yourself');
    if (initialSection === -1 && practiceIdx >= 0) {
      setCurrentSection(practiceIdx);
    }
  }, [sections, initialSection]);

  useEffect(() => {
    const progress = totalSections > 0 ? ((currentSection + 1) / totalSections) * 100 : 0;
    onProgressUpdate?.(progress);
  }, [currentSection, totalSections, onProgressUpdate]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error && sections.length === 0) {
    return <ErrorPanel message={error} onRetry={retry} isOffline={isOffline} />;
  }

  const currentSectionData = sections[currentSection] || {
    type: 'introduction',
    title: 'Loading...',
    content: 'Lesson content is loading. Please wait a moment.',
  };

  const handleNext = () => {
    if (currentSection < totalSections - 1) {
      setDirection(1);
      setCurrentSection((p) => p + 1);
    } else if (!practiceQuiz || practiceQuizCompleted) {
      setShowCompletion(true);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setDirection(-1);
      setCurrentSection((p) => p - 1);
    }
  };

  const handleComplete = (goToNext: boolean) => {
    onComplete(undefined, undefined, goToNext);
  };

  const isPracticeRequired = Boolean(practiceQuiz && !practiceQuizCompleted);
  const currentTab = SECTION_TABS[currentSection] || SECTION_TABS[0];
  const CurrentTabIcon = currentTab.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden font-sans">
      <header className="flex-none bg-transparent px-4 sm:px-8 py-6 relative z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors flex-shrink-0 shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                <BookOpen size={12} />
                <span>NOTEBOOK LESSON</span>
                {activeModel && (
                  <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                    {activeModel.split('/').pop()}
                  </span>
                )}
                {retrievalBand === 'high' && (
                  <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                    DepEd Source
                  </span>
                )}
              </div>
              <h1 className="font-bold text-slate-800 text-sm truncate">{lesson.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</p>
              <p className="text-sm font-bold text-slate-800">
                {Math.round(((currentSection + 1) / totalSections) * 100)}%
              </p>
            </div>
            <div className="w-24 sm:w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#7ec16d] rounded-full"
                animate={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-4 sm:px-8 pb-8 relative flex justify-center">
        <div className="w-full max-w-5xl h-full relative flex md:pl-16">
          
          {/* Tabs - Stick out on left */}
          <div className="hidden md:flex absolute left-0 top-8 bottom-8 w-20 flex-col justify-between z-0 py-2">
            {SECTION_TABS.map((tab, idx) => {
              const active = idx === currentSection;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.type}
                  onClick={() => {
                    setDirection(idx > currentSection ? 1 : -1);
                    setCurrentSection(idx);
                  }}
                  className={cn(
                    'group relative flex items-center justify-start pl-4 rounded-l-[1.5rem] transition-all duration-300 shadow-sm border-r-0 flex-shrink-0',
                    tab.tabBg,
                    active 
                      ? 'w-24 h-20 -translate-x-4 shadow-xl z-20 brightness-105' 
                      : 'w-16 h-16 hover:w-24 hover:h-20 hover:-translate-x-4 hover:brightness-110 opacity-90 hover:opacity-100 z-10'
                  )}
                  aria-label={`Go to ${tab.label} section`}
                >
                  <div className={cn("transition-all duration-300 rounded-xl", active ? "bg-white/30 p-2.5" : "bg-white/20 p-2 group-hover:bg-white/30 group-hover:p-2.5")}>
                    <Icon size={active ? 24 : 20} className="text-white transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  {/* Tooltip */}
                  <div className="absolute right-full mr-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl border border-slate-700/50">
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-r border-t border-slate-700/50"></div>
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Notebook Container */}
          <div className={cn("flex-1 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative z-10 transition-colors duration-500", currentTab.tabBg)}>
            {/* Header inside notebook */}
            <div className="px-6 sm:px-8 py-5 flex items-center gap-4 text-white">
              <div className="bg-white/20 p-2.5 rounded-xl shrink-0">
                 <CurrentTabIcon size={28} className="text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-2xl sm:text-3xl font-bold truncate" title={currentSectionData.title}>
                  {currentSectionData.title}
                </h2>
                <p className="text-white/90 text-sm font-medium truncate mt-0.5" title={lesson.title}>
                  {lesson.title}
                </p>
              </div>
            </div>

            {/* Inner Paper Area */}
            <div className="flex-1 bg-[#fdfdfd] rounded-[1.5rem] m-2 mt-0 relative overflow-hidden shadow-inner flex flex-col">
              {/* Notebook lines background */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage: 'linear-gradient(transparent 95%, #cbd5e1 95%)',
                  backgroundSize: '100% 40px',
                  backgroundPosition: '0 0'
                }}
              />
              {/* Red margin line */}
              <div className="absolute top-0 bottom-0 left-12 md:left-16 w-[2px] bg-rose-300/60 pointer-events-none z-0" />

              {/* Scrollable Content */}
              <div className="relative z-10 flex-1 overflow-y-auto px-6 md:pl-24 md:pr-12 py-8" key={currentSection}>
                {/* Mobile Tabs */}
                <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {SECTION_TABS.map((tab, idx) => {
                    const active = idx === currentSection;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.type}
                        onClick={() => {
                          setDirection(idx > currentSection ? 1 : -1);
                          setCurrentSection(idx);
                        }}
                        className={cn(
                          'min-w-[100px] rounded-2xl px-3 py-2 text-left transition-all duration-200',
                          active
                            ? `${tab.tabBg} text-white shadow-md`
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={14} />
                          <span className="text-xs font-bold">{tab.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSection}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="bg-white/90 backdrop-blur-sm rounded-[1.5rem] p-6 sm:p-8 shadow-sm border border-slate-100/50">
<SectionRenderer
                           section={currentSectionData}
                           sectionIndex={currentSection}
                           onShowSolution={(idx) =>
                             setExpandedProblem(expandedProblem === idx ? null : idx)
                           }
                           expandedIndex={expandedProblem}
                           lesson={lesson}
                            lessonSpecificTopic={lessonSpecificTopic}
                          />
                    </div>

                    {/* Sources hidden from students - uncomment below to show for debugging */}
                    {/* {sources.length > 0 && (
                      <details className="rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-3 text-xs text-slate-500 shadow-sm">
                        <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-800">
                          {sources.length} source{sources.length > 1 ? 's' : ''} used
                        </summary>
                        <div className="mt-2 space-y-1 pl-2">
                          {sources.slice(0, 3).map((src, i) => (
                            <p key={i} className="font-mono truncate">
                              {src.source_file} p.{src.page} ({Math.round((src.score || 0) * 100)}%)
                            </p>
                          ))}
                        </div>
                      </details>
                    )} */}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-transparent px-4 sm:px-8 flex-shrink-0 relative z-40 w-full flex justify-center items-center h-20">
        <div className="w-full max-w-5xl flex flex-col items-center">
          <div className="flex items-center justify-center gap-8 w-full md:ml-16">
            <Button
              onClick={handlePrevious}
              disabled={currentSection === 0}
              variant="outline"
              className="px-6 py-3 rounded-full font-bold text-sm bg-white border-slate-200 text-slate-600 shadow-sm disabled:opacity-40 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Previous
            </Button>

            <p className="text-sm text-slate-500 font-bold tabular-nums">
              {currentSection + 1} / {totalSections}
            </p>

            <Button
              onClick={handleNext}
              disabled={currentSection === totalSections - 1 && isPracticeRequired}
              className="px-8 py-3 rounded-full font-bold text-sm bg-[#7ec16d] text-white hover:bg-[#6ab359] shadow-md transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {currentSection === totalSections - 1 ? (
                <>
                  Complete
                  <CheckCircle size={16} />
                </>
              ) : (
                 <>
                  Next
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
          {currentSection === totalSections - 1 && isPracticeRequired && (
            <p className="text-center text-xs font-semibold text-amber-600 mt-3 md:ml-16">
              Complete the practice quiz first to unlock lesson completion.
            </p>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-[#7ec16d] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                <CheckCircle size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Lesson Complete!</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Great job finishing <strong className="text-slate-700">{lesson.title}</strong>.
              </p>
              <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-100">
                <div className="flex items-center justify-center mb-1">
                  <Award className="text-[#7ec16d]" size={22} />
                </div>
                <p className="text-xs text-[#7ec16d] font-bold uppercase tracking-wider mb-0.5">XP Earned</p>
                <p className="text-3xl font-black text-[#7ec16d]">+{lessonCompletionXP}</p>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => handleComplete(true)}
                  disabled={isPracticeRequired}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-[#1a85a4] text-white hover:bg-[#126b84] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to Next Lesson
                </button>
                <button
                  onClick={() => handleComplete(false)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Back to Modules
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LessonViewer;