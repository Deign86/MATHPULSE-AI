import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Lightbulb, Calculator, Play, Volume2, Pause, ChevronRight, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Lesson } from '../data/subjects';

interface LessonViewerProps {
  lesson: Lesson;
  onBack: () => void;
  onComplete: () => void;
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

const LessonViewer: React.FC<LessonViewerProps> = ({ lesson, onBack, onComplete }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const content = generateLessonContent(lesson.title);
  const totalSections = content.sections.length;

  useEffect(() => {
    setProgress(((currentSection + 1) / totalSections) * 100);
  }, [currentSection, totalSections]);

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

  const handleComplete = () => {
    onComplete();
  };

  const currentSectionData = content.sections[currentSection];

  if (showCompletion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={40} className="text-white" />
          </motion.div>

          <h2 className="text-2xl font-bold text-slate-800 mb-3">Lesson Complete! 🎉</h2>
          <p className="text-slate-600 mb-6">
            Great job! You've finished learning about <strong>{lesson.title}</strong>.
          </p>

          <div className="bg-teal-50 rounded-2xl p-5 mb-6 border-2 border-teal-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="text-teal-600" size={24} />
            </div>
            <p className="text-xs text-teal-600 font-bold uppercase mb-1">XP Earned</p>
            <p className="text-3xl font-black text-teal-700">+50</p>
          </div>

          <Button
            onClick={handleComplete}
            className="w-full py-6 rounded-2xl font-bold text-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:opacity-90 shadow-lg"
          >
            Continue to Next Lesson
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all hover:scale-110"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <BookOpen size={14} />
                <span>Lesson</span>
              </div>
              <h1 className="font-bold text-lg text-slate-800">{content.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-xs text-slate-500 font-medium">Progress</p>
              <p className="text-sm font-bold text-slate-700">{Math.round(progress)}%</p>
            </div>
            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
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
      <main className="flex-1 overflow-y-auto px-6 py-8">
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
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-2">
                  <span>Section {currentSection + 1} of {totalSections}</span>
                </div>
                {currentSectionData.heading && (
                  <h2 className="text-3xl font-bold text-slate-800 mb-4">
                    {currentSectionData.heading}
                  </h2>
                )}
              </div>

              {/* Content Based on Type */}
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100 min-h-[500px]">
                {/* Text Content */}
                {currentSectionData.type === 'text' && (
                  <div className="prose prose-slate max-w-none">
                    <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                      {currentSectionData.content}
                    </p>
                  </div>
                )}

                {/* Key Point */}
                {currentSectionData.type === 'key-point' && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Lightbulb size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900 mb-2 text-lg">Important!</h3>
                        <p className="text-amber-800 leading-relaxed">{currentSectionData.content}</p>
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
                    <p className="text-slate-600">{currentSectionData.content}</p>
                  </div>
                )}

                {/* Examples */}
                {currentSectionData.type === 'example' && (
                  <div>
                    <p className="text-slate-700 mb-6">{currentSectionData.content}</p>
                    <div className="space-y-4">
                      {currentSectionData.examples?.map((example, idx) => (
                        <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calculator size={18} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-blue-900 mb-2">{example.problem}</h4>
                            </div>
                          </div>
                          <div className="ml-11 bg-white/60 rounded-xl p-4 border border-blue-100">
                            <p className="text-sm font-bold text-blue-700 mb-2">Solution:</p>
                            <p className="text-slate-700 whitespace-pre-line text-sm leading-relaxed">
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
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-200 text-center">
                    <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-purple-900 mb-3">{currentSectionData.heading}</h3>
                    <p className="text-purple-800 text-lg mb-6">{currentSectionData.content}</p>
                    <div className="bg-white/60 rounded-xl p-4 inline-block">
                      <p className="text-sm text-purple-700">
                        💡 <strong>Tip:</strong> Complete the practice quizzes after this lesson to reinforce your learning!
                      </p>
                    </div>
                  </div>
                )}
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
                    : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentSection === 0}
            variant="outline"
            className="px-6 py-6 rounded-xl font-bold disabled:opacity-50 hover:bg-slate-50"
          >
            <ArrowLeft size={18} className="mr-2" />
            Previous
          </Button>

          <div className="text-center">
            <p className="text-sm text-slate-500">
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
    </div>
  );
};

export default LessonViewer;
