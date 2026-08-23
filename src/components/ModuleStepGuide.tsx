// src/components/ModuleStepGuide.tsx
// Student-side modal for working through a teacher-uploaded module step (mirrors InterventionStepGuide)

import React, { useState } from 'react';
import { recordGet } from '../utils/memberOf';
import { X, Clock, Video, PenTool, CheckCircle2, MessageCircle, RefreshCw, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InterventionVideoStep } from './intervention/InterventionVideoStep';
import { apiService } from '../services/apiService';
import type { LearningStep } from '../services/interventionService';

interface ModuleSection {
  title: string;
  content: string;
  stepType?: string;
  stepNumber?: number;
  topic?: string;
  durationMinutes?: number;
  numItems?: number | null;
  difficulty?: string;
  competencyTag?: string;
  youtubeQuery?: string;
  isCompleted?: boolean;
}

interface Props {
  section: ModuleSection;
  sectionIndex: number;
  totalSections: number;
  moduleTitle: string;
  studentName: string;
  practice?: Array<{ question: string; options: Array<{ label: string; text: string }>; answer: string; explanation: string }>;
  onClose: () => void;
}

const STEP_ICONS = {
  video_lesson: <Video className="w-5 h-5" />,
  practice: <PenTool className="w-5 h-5" />,
  assessment: <CheckCircle2 className="w-5 h-5" />,
  chat_session: <MessageCircle className="w-5 h-5" />,
  review: <RefreshCw className="w-5 h-5" />,
};

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
};

export const ModuleStepGuide: React.FC<Props> = ({
  section,
  sectionIndex,
  totalSections,
  moduleTitle,
  studentName,
  practice,
  onClose,
}) => {
  const stepNumber = section.stepNumber ?? sectionIndex + 1;
  const detectedType = section.stepType
    || (section.content.includes('video lesson') ? 'video_lesson'
      : section.content.includes('practice') ? 'practice'
      : section.content.includes('assessment') ? 'assessment'
      : section.content.includes('chat') ? 'chat_session'
      : section.content.includes('review') ? 'review' : 'video_lesson');

  const topic = section.topic || section.title.replace(/^Step \d+:\s*/, '');

  // Build a LearningStep-compatible object for InterventionVideoStep
  const videoStep: LearningStep = {
    step_number: stepNumber,
    type: 'video_lesson',
    title: section.title,
    topic,
    description: section.content,
    // SAFETY: trusted internal value already conforms to the asserted type.
    difficulty: (section.difficulty as 'easy' | 'medium' | 'hard') || 'easy',
    duration_minutes: section.durationMinutes || 8,
    num_items: section.numItems ?? null,
    competency_tag: section.competencyTag || '',
    youtube_query: section.youtubeQuery || `${topic} math lesson`,
    is_completed: section.isCompleted || false,
    completion_score: null,
  };

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: `Hi ${studentName}! Let's work on "${moduleTitle}". ${section.content || `Review ${topic}.`} Ready to start?` },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const history = chatMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await apiService.chat(userMsg, history, undefined, {
        moduleContext: { title: moduleTitle, summary: `Topic: ${topic}. ${section.content}` },
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `I'm having trouble connecting right now. Try asking again in a moment!` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.18)] w-full max-w-[800px] max-h-[85vh] flex flex-col overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                {recordGet(STEP_ICONS, detectedType) ?? <PenTool className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[#1e293b]">{moduleTitle}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-[#64748b]">Step {stepNumber} of {totalSections}</span>
                  {section.competencyTag && (
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-mono rounded">{section.competencyTag}</span>
                  )}
                  {section.difficulty && (
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${recordGet(DIFFICULTY_COLORS, section.difficulty) ?? DIFFICULTY_COLORS.easy}`}>
                      {section.difficulty}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Step content */}
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-[14px] p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-[12px] font-semibold text-slate-600">{section.durationMinutes || 8} minutes</span>
                  {section.numItems && <span className="text-[12px] text-slate-500">• {section.numItems} items</span>}
                </div>
                <p className="text-[13px] text-[#475569] leading-relaxed">{section.content}</p>
              </div>

              {detectedType === 'video_lesson' && (
                <InterventionVideoStep step={videoStep} isActive={true} />
              )}

              {(detectedType === 'practice' || detectedType === 'assessment') && practice && practice.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-purple-50/50 rounded-[14px] p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                      <PenTool className="w-5 h-5 text-purple-500" />
                      <p className="text-[13px] font-semibold text-purple-700">Practice Questions</p>
                      <span className="text-[11px] text-purple-500">{practice.length} questions</span>
                    </div>
                    <div className="space-y-3">
                      {practice.map((q, i) => (
                        <div key={i} className="bg-white rounded-xl border border-purple-100 p-3">
                          <p className="text-[12px] font-bold text-slate-800 mb-2">{q.question}</p>
                          <div className="grid grid-cols-1 gap-1.5 mb-2">
                            {q.options.map((opt, j) => (
                              <div key={j} className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                                {opt.label}. {opt.text}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowAnswers(prev => ({ ...prev, [i]: !prev[i] }))}
                            className="text-[10px] text-indigo-600 font-semibold hover:underline"
                          >
                            {showAnswers[i] ? 'Hide Answer' : 'Show Answer'}
                          </button>
                          {showAnswers[i] && (
                            <div className="mt-1.5">
                              <p className="text-[11px] text-emerald-700 font-semibold">Answer: {q.answer}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(detectedType === 'practice' || detectedType === 'assessment') && (!practice || practice.length === 0) && (
                <div className="bg-purple-50/50 rounded-[14px] p-6 border border-purple-100 flex flex-col items-center justify-center min-h-[160px]">
                  <PenTool className="w-10 h-10 text-purple-400 mb-3" />
                  <p className="text-[13px] font-semibold text-purple-700">Practice Questions</p>
                  <p className="text-[11px] text-purple-500 mt-1">{section.numItems || 10} questions on {topic}</p>
                </div>
              )}
            </div>

            {/* Right: AI Guidance Chat */}
            <div className="flex flex-col bg-slate-50 rounded-[14px] border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-white">
                <p className="text-[12px] font-semibold text-[#1e293b] flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-indigo-500" /> AI Guide
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[300px]">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-[12px] text-[12px] leading-relaxed ${
                      msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-[#475569]'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Ask for help..."
                  className="flex-1 text-[12px] px-3 py-2 rounded-[10px] border border-slate-200 focus:outline-none focus:border-indigo-300"
                />
                <button onClick={handleSendChat} disabled={chatLoading} className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center text-white transition-colors">
                  {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden" style={{ width: 120 }}>
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(stepNumber / totalSections) * 100}%` }} />
              </div>
              <span className="text-[11px] text-slate-500">{stepNumber}/{totalSections}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModuleStepGuide;
