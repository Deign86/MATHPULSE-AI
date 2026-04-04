import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Lightbulb, Calculator, Play, Volume2, Pause, ChevronRight, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Lesson } from '../data/subjects';

interface LessonViewerProps {
  lesson: Lesson;
  onBack: () => void;
  onComplete: (score?: number, totalXP?: number, goToNext?: boolean) => void;
  onProgressUpdate?: (percent: number) => void;
}

interface LessonContent {
  title: string;
  sections: {
    type: 'text' | 'example' | 'video' | 'key-point' | 'practice';
    heading?: string;
    content: string;
    examples?: { problem: string; solution: string; }[];
    videoUrl?: string;
  }[];
}

// Mock lesson content generator based on lesson title
const generateLessonContent = (lessonTitle: string): LessonContent => {
  // This is a simplified version - in a real app, this would come from a database
  return {
    title: lessonTitle,
    sections: [
      {
        type: 'text',
        heading: 'Introduction',
        content: `Welcome to this lesson on ${lessonTitle}. In this lesson, you'll learn the fundamental concepts and practical applications that will build your mathematical foundation.`
      },
      {
        type: 'key-point',
        heading: 'Key Concepts',
        content: 'Understanding the core principles is essential for mastering this topic. Pay close attention to the definitions and properties we\'ll explore.'
      },
      {
        type: 'video',
        heading: 'Video Lesson',
        content: 'Watch this explanation to understand the concepts visually.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' // Placeholder
      },
      {
        type: 'example',
        heading: 'Worked Examples',
        content: 'Let\'s work through some examples to see these concepts in action.',
        examples: [
          {
            problem: 'Example Problem 1: Apply the concept to solve this problem.',
            solution: 'Step 1: Identify what we know.\nStep 2: Apply the formula or method.\nStep 3: Simplify and solve.\nAnswer: The solution demonstrates how to approach similar problems.'
          },
          {
            problem: 'Example Problem 2: A more complex application.',
            solution: 'Step 1: Break down the problem.\nStep 2: Use what we learned.\nStep 3: Verify our answer.\nAnswer: This shows the method works for various cases.'
          }
        ]
      },
      {
        type: 'text',
        heading: 'Important Notes',
        content: 'Remember these key points as you practice:\n• Always check your work\n• Look for patterns\n• Practice makes perfect\n• Don\'t hesitate to review if needed'
      },
      {
        type: 'practice',
        heading: 'Try It Yourself',
        content: 'Now it\'s your turn! Try applying what you\'ve learned. You can practice with the exercises at the end of this module.'
      },
      {
        type: 'text',
        heading: 'Summary',
        content: `Great job! You've completed the lesson on ${lessonTitle}. Make sure you understand the key concepts before moving on. Feel free to review this lesson anytime.`
      }
    ]
  };
};

const LessonViewer: React.FC<LessonViewerProps> = ({ lesson, onBack, onComplete, onProgressUpdate }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    setCurrentSection(0);
    setShowCompletion(false);
    setIsPlaying(false);
    setProgress(0);
  }, [lesson.id, lesson.title]);

  const content = generateLessonContent(lesson.title);
  const totalSections = content.sections.length;

  useEffect(() => {
    const newProgress = ((currentSection + 1) / totalSections) * 100;
    setProgress(newProgress);
    onProgressUpdate?.(newProgress);
  }, [currentSection, totalSections, onProgressUpdate]);

  const handleNext = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection(prev => prev + 1);
    } else {
      setShowCompletion(true);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const handleComplete = (goToNext: boolean) => {
    onComplete(undefined, undefined, goToNext);
  };

  const currentSectionData = content.sections[currentSection];
  const sectionSymbolMap: Record<LessonContent['sections'][number]['type'], string> = {
    text: '📝',
    example: '📎',
    video: '🎬',
    'key-point': '💡',
    practice: '✍️',
  };
  const sectionSymbol = currentSectionData ? sectionSymbolMap[currentSectionData.type] || '📘' : '📘';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[radial-gradient(circle_at_top_left,#f8fbff_0%,#eef4ff_40%,#f8f4ff_100%)] overflow-hidden">
      
      {/* Header */}
      <header className="flex-none bg-white/90 backdrop-blur-md border-b border-[#dde3eb] px-6 sm:px-10 lg:px-16 py-4 shadow-sm relative z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-[#edf1f7] hover:bg-[#dde3eb] flex items-center justify-center text-[#5a6578] transition-all hover:scale-110"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#5a6578] font-medium mb-1 uppercase tracking-wider">
                <BookOpen size={14} />
                <span>Notebook Lesson</span>
              </div>
              <h1 className="font-bold text-lg text-[#0a1628]">{content.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-xs text-[#5a6578] font-medium">Progress</p>
              <p className="text-sm font-bold text-[#0a1628]">{Math.round(progress)}%</p>
            </div>
            <div className="w-32 h-2 bg-[#dde3eb] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-16 py-10">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-[#5a6578] font-medium mb-2">
                  <span>Section {currentSection + 1} of {totalSections}</span>
                </div>
                {currentSectionData.heading && (
                  <h2 className="text-3xl font-black text-[#0a1628] mb-4 tracking-tight flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{sectionSymbol}</span>
                    <span>{currentSectionData.heading}</span>
                  </h2>
                )}
              </div>

              {/* Content Based on Type */}
              <div className="relative bg-white rounded-3xl p-8 shadow-lg border border-[#dde3eb] min-h-[500px] overflow-hidden">
                <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-rose-200/70 pointer-events-none" />
                <div className="absolute left-[56px] top-0 bottom-0 w-px bg-rose-100/60 pointer-events-none" />
                <div
                  className="absolute inset-0 pointer-events-none opacity-60"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 37px, #e9eef8 37px, #e9eef8 38px)',
                  }}
                />

                <div className="relative z-10 pl-8 md:pl-12">
                {/* Text Content */}
                {currentSectionData.type === 'text' && (
                  <div className="prose prose-slate max-w-none">
                    <p className="text-lg text-[#0a1628] leading-relaxed whitespace-pre-line">
                      {currentSectionData.content}
                    </p>
                  </div>
                )}

                {/* Key Point */}
                {currentSectionData.type === 'key-point' && (
                  <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-6 border-2 border-rose-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Lightbulb size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-rose-900 mb-2 text-lg">Important!</h3>
                        <p className="text-rose-800 leading-relaxed">{currentSectionData.content}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video */}
                {currentSectionData.type === 'video' && (
                  <div>
                    <div className="bg-slate-900 rounded-2xl overflow-hidden mb-4 aspect-video flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Play size={32} className="text-white ml-1" />
                        </div>
                        <p className="text-white/70 text-sm">Video content would be embedded here</p>
                        <p className="text-white/50 text-xs mt-2">In production, this would show actual video lessons</p>
                      </div>
                    </div>
                    <p className="text-[#5a6578]">{currentSectionData.content}</p>
                  </div>
                )}

                {/* Examples */}
                {currentSectionData.type === 'example' && (
                  <div>
                    <p className="text-[#0a1628] mb-6">{currentSectionData.content}</p>
                    <div className="space-y-4">
                      {currentSectionData.examples?.map((example, idx) => (
                        <div key={idx} className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-2xl p-6 border-2 border-sky-200">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calculator size={18} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-sky-900 mb-2">{example.problem}</h4>
                            </div>
                          </div>
                          <div className="ml-11 bg-white/60 rounded-xl p-4 border border-sky-100">
                            <p className="text-sm font-bold text-sky-700 mb-2">Solution:</p>
                            <p className="text-[#0a1628] whitespace-pre-line text-sm leading-relaxed">
                              {example.solution}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practice Prompt */}
                {currentSectionData.type === 'practice' && (
                  <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-2xl p-8 border-2 border-sky-200 text-center">
                    <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-sky-900 mb-3">{currentSectionData.heading}</h3>
                    <p className="text-sky-800 text-lg mb-6">{currentSectionData.content}</p>
                    <div className="bg-white/60 rounded-xl p-4 inline-block">
                      <p className="text-sm text-sky-700">
                        <Lightbulb size={14} className="inline mr-1 -mt-0.5" />
                        <strong>Tip:</strong> Complete the practice quizzes after this lesson to reinforce your learning!
                      </p>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Section Navigation Dots */}
          <div className="flex items-center justify-center gap-2 mt-8 mb-4">
            {content.sections.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSection(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSection
                    ? 'w-8 bg-teal-500'
                    : idx < currentSection
                    ? 'w-2 bg-teal-300'
                    : 'w-2 bg-[#dde3eb]'
                }`}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="bg-white border-t border-[#dde3eb] px-6 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentSection === 0}
            variant="outline"
            className="px-6 py-6 rounded-xl font-bold disabled:opacity-50 hover:bg-[#edf1f7]"
          >
            <ArrowLeft size={18} className="mr-2" />
            Previous
          </Button>

          <div className="text-center">
            <p className="text-sm text-[#5a6578]">
              {currentSection + 1} / {totalSections}
            </p>
          </div>

          <Button
            onClick={handleNext}
            className="px-6 py-6 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:opacity-90 shadow-lg"
          >
            {currentSection === totalSections - 1 ? 'Complete Lesson' : 'Next'}
            {currentSection === totalSections - 1 ? (
              <CheckCircle size={18} className="ml-2" />
            ) : (
              <ArrowRight size={18} className="ml-2" />
            )}
          </Button>
        </div>
      </footer>

      {/* COMPLETION MODAL LAYER */}
      {showCompletion && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden relative"
          >
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-teal-100 rounded-full blur-3xl opacity-50 mix-blend-multiply" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-50 mix-blend-multiply" />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-teal-500/30"
            >
              <CheckCircle size={40} className="text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-[#0a1628] mb-3 relative z-10">Lesson Complete!</h2>
            <p className="text-[#5a6578] mb-6 relative z-10 leading-relaxed px-2">
              Great job! You've finished learning about <strong className="text-slate-800">{lesson.title}</strong>.
            </p>

            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-5 mb-8 border border-teal-100 shadow-inner relative z-10">
              <div className="flex items-center justify-center mb-2">
                <div className="bg-teal-100 p-2 rounded-xl">
                  <Award className="text-teal-600" size={24} />
                </div>
              </div>
              <p className="text-xs text-teal-700 font-bold uppercase tracking-wider mb-1">XP Earned</p>
              <p className="text-3xl font-black text-teal-600 drop-shadow-sm">+50</p>
            </div>

            <div className="flex flex-col gap-3 relative z-10">
              <button
                onClick={() => handleComplete(true)}
                className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/25 hover:-translate-y-0.5 transition-all outline-none"
              >
                Continue to Next Lesson
              </button>
              
              <button
                onClick={() => handleComplete(false)}
                className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700 transition-all outline-none"
              >
                Back to Modules
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LessonViewer;
