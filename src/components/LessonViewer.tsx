import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle, BookOpen, Lightbulb,
  Calculator, Play, Award, RefreshCw, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Lesson, Quiz } from '../data/subjects';
import { useLessonContent } from '../hooks/useLessonContent';
import type { RagLessonSection } from '../services/lessonService';

interface LessonViewerProps {
  lesson: Lesson & { subjectId?: string; lessonId?: string; competencyCode?: string };
  lessonCompletionXP?: number;
  practiceQuiz?: Quiz | null;
  practiceQuizCompleted?: boolean;
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
        <button onClick={onRetry} className="mt-3 text-slate-400 text-xs hover:text-slate-600 underline">
          Retry
        </button>
      </motion.div>
    </div>
  );
}

function SectionRenderer({
  section,
  sectionIndex,
  onShowSolution,
  expandedIndex,
}: {
  section: RagLessonSection;
  sectionIndex: number;
  onShowSolution: (idx: number) => void;
  expandedIndex: number | null;
}) {
  switch (section.type) {
    case 'introduction':
      return (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed text-base whitespace-pre-line">
            {section.content}
          </p>
        </div>
      );

    case 'key_concepts':
      return (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed text-base whitespace-pre-line mb-4">
            {section.content}
          </p>
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
          <p className="text-slate-600 text-sm">{section.content}</p>
          {section.embedUrl ? (
            <div className="rounded-2xl overflow-hidden bg-slate-900">
              <div className="aspect-video">
                <iframe
                  src={section.embedUrl}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={section.videoTitle || 'Lesson video'}
                  className="border-0"
                />
              </div>
              {section.videoTitle && (
                <div className="px-4 py-3 bg-slate-800">
                  <p className="text-slate-300 text-xs font-medium truncate">{section.videoTitle}</p>
                  {section.videoChannel && (
                    <p className="text-slate-500 text-xs">{section.videoChannel}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-100 rounded-2xl aspect-video flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center">
                <Play size={24} className="text-slate-400 ml-1" />
              </div>
              <p className="text-slate-400 text-sm">Video temporarily unavailable</p>
            </div>
          )}
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
        <div className="space-y-3">
          {section.practiceProblems && section.practiceProblems.length > 0 ? (
            section.practiceProblems.map((prob, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-5 border border-rose-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-slate-800 text-sm font-medium flex-1 leading-relaxed">
                    {prob.question}
                  </p>
                  <button
                    onClick={() => onShowSolution(sectionIndex)}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-rose-200 flex items-center justify-center hover:bg-rose-50 transition-colors"
                    aria-label={expandedIndex === sectionIndex ? 'Hide solution' : 'Show solution'}
                  >
                    {expandedIndex === sectionIndex ? (
                      <EyeOff size={14} className="text-rose-500" />
                    ) : (
                      <Eye size={14} className="text-rose-500" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {expandedIndex === sectionIndex && prob.solution && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-rose-200">
                        <p className="text-slate-600 text-sm">{prob.solution}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No practice problems available for this lesson.</p>
            </div>
          )}
        </div>
      );

    case 'summary':
      return (
        <div className="space-y-3">
          <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">
            {section.content}
          </p>
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

const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  lessonCompletionXP = 10,
  practiceQuiz,
  practiceQuizCompleted = false,
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

  const totalSections = sections.length || 7;

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
    content: '',
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden">
      <header className="flex-none bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shadow-sm relative z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-medium mb-0.5">
                <BookOpen size={13} />
                <span>Notebook Lesson</span>
                {activeModel && (
                  <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {activeModel.split('/').pop()}
                  </span>
                )}
                {retrievalBand === 'high' && (
                  <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                    DepEd Source
                  </span>
                )}
                {needsReview && (
                  <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                    Limited Coverage
                  </span>
                )}
              </div>
              <h1 className="font-bold text-slate-800 text-sm truncate">{lesson.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-500 font-medium">Progress</p>
              <p className="text-sm font-bold text-slate-800">
                {Math.round(((currentSection + 1) / totalSections) * 100)}%
              </p>
            </div>
            <div className="w-24 sm:w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-400 to-orange-400 rounded-full"
                animate={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-4 sm:px-8 py-6 flex items-center justify-center">
        <div className="max-w-3xl w-full h-full flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-6 pr-1" key={currentSection}>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
              <span>Section {currentSection + 1} of {totalSections}</span>
              <span className="flex-1 border-t border-dashed border-slate-200" />
              <span className="text-rose-500 font-semibold">
                {SECTION_SYMBOLS[currentSectionData.type] || currentSectionData.title}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentSection}
                initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <h2 className="text-2xl font-black text-slate-800 mb-5 tracking-tight">
                  {currentSectionData.title}
                </h2>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-h-[320px]">
                  <SectionRenderer
                    section={currentSectionData}
                    sectionIndex={currentSection}
                    onShowSolution={(idx) =>
                      setExpandedProblem(expandedProblem === idx ? null : idx)
                    }
                    expandedIndex={expandedProblem}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {sources.length > 0 && (
              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-600 font-medium">
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
            )}
          </div>

          <div className="flex items-center justify-center gap-2 py-4 mt-2 flex-shrink-0">
            {sections.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentSection ? 1 : -1);
                  setCurrentSection(idx);
                }}
                className={`h-2 rounded-full transition-all duration-200 ${
                  idx === currentSection
                    ? 'w-8 bg-rose-400'
                    : idx < currentSection
                    ? 'w-2 bg-rose-300'
                    : 'w-2 bg-slate-300'
                }`}
                aria-label={`Go to section ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-4 sm:px-8 py-4 shadow-lg flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentSection === 0}
            variant="outline"
            className="px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Previous
          </Button>

          <p className="text-xs text-slate-400 font-medium tabular-nums">
            {currentSection + 1} / {totalSections}
          </p>

          <Button
            onClick={handleNext}
            disabled={currentSection === totalSections - 1 && isPracticeRequired}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-500 to-orange-400 text-white hover:opacity-90 shadow-md transition-opacity disabled:opacity-40"
          >
            {currentSection === totalSections - 1 ? (
              <>
                Complete Lesson
                <CheckCircle size={16} className="ml-1.5" />
              </>
            ) : (
              <>
                Next
                <ArrowRight size={16} className="ml-1.5" />
              </>
            )}
          </Button>
        </div>
        {currentSection === totalSections - 1 && isPracticeRequired && (
          <p className="text-center text-xs font-semibold text-amber-600 mt-2">
            Complete the practice quiz first to unlock lesson completion.
          </p>
        )}
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
              <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                <CheckCircle size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Lesson Complete!</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Great job finishing <strong className="text-slate-700">{lesson.title}</strong>.
              </p>
              <div className="bg-rose-50 rounded-2xl p-4 mb-6 border border-rose-100">
                <div className="flex items-center justify-center mb-1">
                  <Award className="text-rose-500" size={22} />
                </div>
                <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mb-0.5">XP Earned</p>
                <p className="text-3xl font-black text-rose-500">+{lessonCompletionXP}</p>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => handleComplete(true)}
                  disabled={isPracticeRequired}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-500 to-orange-400 text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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