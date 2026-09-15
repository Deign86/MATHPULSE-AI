// src/components/ModuleStepGuide.tsx
// Dedicated full-page view for working through a teacher-uploaded module step.
// Features a full-screen fixed portal (covering sidebar & distracting overlays),
// side-by-side split screen with interactive lesson/practice on the left,
// and a persistent live AI Guide on the right with preserved chat history.

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { recordGet } from '../utils/memberOf';
import {
  ArrowLeft, ArrowRight, Clock, Video, PenTool, CheckCircle2,
  MessageCircle, RefreshCw, Send, Loader2, Layers, Sparkles,
  BookOpen, ChevronRight, ChevronLeft, Check, PanelRightClose, PanelRightOpen,
  RotateCcw, Lightbulb, HelpCircle, X,
} from 'lucide-react';
import { motion } from 'motion/react';
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
  moduleId?: string;
  section: ModuleSection;
  sectionIndex: number;
  totalSections: number;
  moduleTitle: string;
  studentName: string;
  practice?: Array<{ question: string; options: Array<{ label: string; text: string }>; answer: string; explanation: string }>;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

interface StepChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type StepTypeKey = 'video_lesson' | 'practice' | 'assessment' | 'chat_session' | 'review';

interface StepTypeMeta {
  label: string;
  color: string;
  bg: string;
  darkBg: string;
}

const STEP_TYPE_META: Record<StepTypeKey, StepTypeMeta> = {
  video_lesson: { label: 'Video Lesson',    color: '#9956DE', bg: 'rgba(153,86,222,0.1)',  darkBg: 'rgba(153,86,222,0.2)' },
  practice:     { label: 'Guided Practice', color: '#7274ED', bg: 'rgba(114,116,237,0.1)',  darkBg: 'rgba(114,116,237,0.2)' },
  assessment:   { label: 'Assessment',      color: '#1FA7E1', bg: 'rgba(31,167,225,0.1)',  darkBg: 'rgba(31,167,225,0.2)' },
  chat_session: { label: 'AI Tutor Chat',   color: '#10b981', bg: 'rgba(16,185,129,0.1)',  darkBg: 'rgba(16,185,129,0.2)' },
  review:       { label: 'Topic Review',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  darkBg: 'rgba(245,158,11,0.2)' },
};

type DifficultyKey = 'easy' | 'medium' | 'hard';

const DIFFICULTY_STYLES: Record<DifficultyKey, string> = {
  easy:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  hard:   'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
};

export const ModuleStepGuide: React.FC<Props> = ({
  moduleId,
  section,
  sectionIndex,
  totalSections,
  moduleTitle,
  studentName,
  practice,
  onClose,
  onNext,
  onPrev,
}) => {
  const stepNumber = section.stepNumber ?? sectionIndex + 1;
  const detectedType = section.stepType
    || (section.content.includes('video lesson') ? 'video_lesson'
      : section.content.includes('practice') ? 'practice'
      : section.content.includes('assessment') ? 'assessment'
      : section.content.includes('chat') ? 'chat_session'
      : section.content.includes('review') ? 'review' : 'video_lesson');

  const topic = section.topic || section.title.replace(/^Step \d+:\s*/, '');
  const typeMeta = recordGet(STEP_TYPE_META, detectedType) ?? STEP_TYPE_META.video_lesson;
  const progressPct = Math.round((stepNumber / totalSections) * 100);

  const videoStep: LearningStep = {
    step_number: stepNumber,
    type: 'video_lesson',
    title: section.title,
    topic,
    description: section.content,
    // SAFETY: section.difficulty is a trusted server-provided enum value constrained to these three literals.
    difficulty: (section.difficulty as 'easy' | 'medium' | 'hard') || 'easy',
    duration_minutes: section.durationMinutes || 8,
    num_items: section.numItems ?? null,
    competency_tag: section.competencyTag || '',
    youtube_query: section.youtubeQuery || `${topic} math lesson`,
    is_completed: section.isCompleted || false,
    completion_score: null,
  };

  // Persist conversation history per module in sessionStorage
  const storageKey = `mathpulse_chat_mod_${moduleId || moduleTitle.replace(/\s+/g, '_')}`;
  const [chatMessages, setChatMessages] = useState<StepChatMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage read errors
    }
    return [
      {
        role: 'assistant',
        content: `Hi ${studentName}! I'm your AI Guide for "${moduleTitle}". I'll stay here side-by-side with you while you watch the video, review concepts, and work through practice items. Ask me anything if you get stuck!`,
      },
    ];
  });

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'content' | 'practice'>('content');
  const [showSideBySideChat, setShowSideBySideChat] = useState(true);
  const [mobileViewTab, setMobileViewTab] = useState<'content' | 'practice' | 'chat'>('content');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(sectionIndex);

  // Sync chat messages to sessionStorage whenever they update
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(chatMessages));
    } catch {
      // Ignore storage write errors
    }
  }, [chatMessages, storageKey]);

  // When step changes, automatically append a transition note while preserving prior chat history
  useEffect(() => {
    if (prevStepRef.current !== sectionIndex) {
      prevStepRef.current = sectionIndex;
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `📍 **Step ${stepNumber}: ${section.title}** (${typeMeta.label}).\n${section.content ? section.content.slice(0, 140) + '...' : ''}\n\nI'm ready to help you with this step!`,
        },
      ]);
      // Reset content tab on step change
      setActiveTab('content');
      setMobileViewTab('content');
    }
  }, [sectionIndex, stepNumber, section.title, section.content, typeMeta.label]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleSendChat = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || chatInput.trim();
    if (!textToSend || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: 'user', content: textToSend }]);
    if (!overridePrompt) setChatInput('');
    setChatLoading(true);
    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await apiService.chat(textToSend, history, undefined, {
        moduleContext: { title: moduleTitle, summary: `Topic: ${topic}. Step ${stepNumber}: ${section.title}. ${section.content}` },
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.response }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I’m having trouble connecting right now. Try again in a moment!' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    const freshMessage: StepChatMessage = {
      role: 'assistant',
      content: `Chat history cleared. Working on **Step ${stepNumber}: ${section.title}**. What would you like to explore?`,
    };
    setChatMessages([freshMessage]);
  };

  const hasPractice = practice && practice.length > 0;

  // AI Chat Pane component
  const renderAIChatPane = (isInlineMobile = false) => (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-900 ${isInlineMobile ? '' : 'border-l border-slate-200/80 dark:border-slate-800'}`}>
      {/* AI Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-xs flex-shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
              <img src="/avatar/avatar_icon.png" alt="L.O.L.I." className="w-6 h-6 object-contain" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-display whitespace-nowrap truncate">L.O.L.I. AI Guide</h3>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap truncate">Side-by-side tutoring for Step {stepNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleClearChat}
            title="Reset chat for this module"
            aria-label="Reset chat for this module"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
          </button>
          {!isInlineMobile && (
            <button
              type="button"
              onClick={() => setShowSideBySideChat(false)}
              title="Minimize AI Chatbot to side tab"
              aria-label="Minimize AI Chatbot to side tab"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 text-[11px] font-bold transition-all border border-transparent hover:border-purple-200 dark:hover:border-purple-800/40 cursor-pointer whitespace-nowrap shrink-0"
            >
              <PanelRightClose size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Minimize</span>
            </button>
          )}
        </div>
      </div>

      {/* Suggested quick chips */}
      <div className="flex-shrink-0 px-3 py-2 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0 whitespace-nowrap">
          <Lightbulb size={11} className="text-amber-500 shrink-0" /> Ask:
        </span>
        <button
          type="button"
          onClick={() => handleSendChat(`Can you explain the main idea of "${section.title}" in simple words?`)}
          disabled={chatLoading}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400 transition-all shrink-0 shadow-2xs cursor-pointer whitespace-nowrap"
        >
          Explain simply
        </button>
        <button
          type="button"
          onClick={() => handleSendChat(`Give me a step-by-step example problem related to ${topic}.`)}
          disabled={chatLoading}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400 transition-all shrink-0 shadow-2xs cursor-pointer whitespace-nowrap"
        >
          Give an example
        </button>
        <button
          type="button"
          onClick={() => handleSendChat(`Quiz me with 1 quick question on ${topic} to test my understanding.`)}
          disabled={chatLoading}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400 transition-all shrink-0 shadow-2xs cursor-pointer whitespace-nowrap"
        >
          Quiz me
        </button>
      </div>

      {/* Message stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                <img src="/avatar/avatar_icon.png" alt="AI" className="w-4 h-4 object-contain" />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs shadow-xs font-medium'
                  : 'bg-slate-100/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-tl-xs whitespace-pre-wrap'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <img src="/avatar/avatar_icon.png" alt="AI" className="w-4 h-4 object-contain" />
            </div>
            <div className="bg-slate-100/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl rounded-tl-xs px-3.5 py-2.5">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input row */}
      <div className="flex-shrink-0 p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat();
          }}
          className="flex gap-2 items-center"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={`Ask about ${topic}...`}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 dark:focus:border-purple-500 transition-all"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            aria-label="Send message"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
          >
            {chatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 shadow-xs z-30">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to module"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600 transition-all group cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="whitespace-nowrap">Back to Module</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />

          {/* Breadcrumbs with clean bullet */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 min-w-0">
            <span className="truncate max-w-[120px] lg:max-w-[200px] font-semibold text-slate-600 dark:text-slate-400 hidden md:inline whitespace-nowrap">{moduleTitle}</span>
            <ChevronRight size={12} className="shrink-0 hidden md:inline text-slate-400" />
            <span className="font-bold truncate max-w-[200px] sm:max-w-[300px] text-slate-900 dark:text-slate-100 whitespace-nowrap">
              Step {stepNumber} · {section.title}
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Side-by-Side toggle (desktop) */}
          <button
            type="button"
            onClick={() => setShowSideBySideChat(!showSideBySideChat)}
            className={`hidden lg:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer whitespace-nowrap shrink-0 ${
              showSideBySideChat
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent hover:brightness-110 shadow-xs'
            }`}
            title={showSideBySideChat ? 'Hide AI Chatbot' : 'Open AI Chatbot'}
          >
            {showSideBySideChat ? <PanelRightClose size={14} className="shrink-0" /> : <PanelRightOpen size={14} className="shrink-0" />}
            <span className="whitespace-nowrap">{showSideBySideChat ? 'AI Guide: Active' : 'Open AI Guide'}</span>
          </button>

          {/* Step indicator counter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
            <span>Step {stepNumber}</span>
            <span className="text-slate-400">/</span>
            <span>{totalSections}</span>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close study guide"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Top Progress Track ── */}
      <div className="flex-shrink-0 h-1 bg-slate-100 dark:bg-slate-800">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #9956DE, #7274ED, #1FA7E1)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* ── Main Split View Body ── */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Left Side: Lesson / Practice Content */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto scrollbar-hide">
          {/* Header Banner */}
          <div className="flex-shrink-0 px-6 sm:px-10 py-5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #9956DE, #7274ED)' }}
                >
                  {detectedType === 'video_lesson' && <Video size={19} />}
                  {detectedType === 'practice' && <PenTool size={19} />}
                  {detectedType === 'assessment' && <CheckCircle2 size={19} />}
                  {detectedType === 'chat_session' && <MessageCircle size={19} />}
                  {detectedType === 'review' && <RefreshCw size={19} />}
                  {!['video_lesson', 'practice', 'assessment', 'chat_session', 'review'].includes(detectedType) && <Layers size={19} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0"
                      style={{
                        color: typeMeta.color,
                        background: typeMeta.bg,
                        borderColor: `${typeMeta.color}40`,
                      }}
                    >
                      Step {stepNumber} · {typeMeta.label}
                    </span>
                    {section.difficulty && (
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${recordGet(DIFFICULTY_STYLES, section.difficulty) ?? DIFFICULTY_STYLES.easy}`}>
                        {section.difficulty.toUpperCase()}
                      </span>
                    )}
                    {section.durationMinutes && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                        <Clock size={11} className="shrink-0" /> {section.durationMinutes}m
                      </span>
                    )}
                  </div>

                  <h1 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {section.title}
                  </h1>

                  {section.competencyTag && (
                    <span className="mt-1.5 inline-block text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/80 dark:border-slate-700 whitespace-nowrap shrink-0">
                      {section.competencyTag}
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop / Mobile Tab Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('content');
                      setMobileViewTab('content');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      (showSideBySideChat ? activeTab === 'content' : mobileViewTab === 'content')
                        ? 'bg-purple-100/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen size={13} className="shrink-0" />
                    <span className="whitespace-nowrap">Lesson Material</span>
                  </button>

                  {hasPractice && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('practice');
                        setMobileViewTab('practice');
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        (showSideBySideChat ? activeTab === 'practice' : mobileViewTab === 'practice')
                          ? 'bg-purple-100/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <PenTool size={13} className="shrink-0" />
                    <span className="whitespace-nowrap">Practice ({practice.length})</span>
                  </button>
                  )}

                  {/* Mobile-only tab button for AI Guide */}
                  <button
                    type="button"
                    onClick={() => setMobileViewTab('chat')}
                    className={`lg:hidden flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      mobileViewTab === 'chat'
                        ? 'bg-purple-100/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sparkles size={13} className="shrink-0" />
                    <span className="whitespace-nowrap">AI Guide</span>
                  </button>
                </div>

                {!showSideBySideChat && (
                  <button
                    type="button"
                    onClick={() => setShowSideBySideChat(true)}
                    className="hidden lg:inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <PanelRightOpen size={13} className="shrink-0" />
                    <span className="whitespace-nowrap">Open AI Guide Side-by-Side</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Content Area */}
          <div className="flex-1 px-6 sm:px-10 py-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* On mobile, if student selected AI Guide tab */}
              {mobileViewTab === 'chat' ? (
                <div className="lg:hidden rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs h-[520px]">
                  {renderAIChatPane(true)}
                </div>
              ) : (showSideBySideChat ? activeTab === 'content' : mobileViewTab === 'content') ? (
                <div className="space-y-6">
                  {/* Lesson Overview Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <HelpCircle size={13} className="text-purple-500" /> Step Overview
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {section.content}
                    </p>
                  </div>

                  {/* Interactive Video Lesson */}
                  {detectedType === 'video_lesson' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                          <Video size={13} className="text-purple-500 shrink-0" />
                          <span className="whitespace-nowrap">Interactive Video Lesson</span>
                        </h3>
                        {showSideBySideChat && (
                          <span className="hidden sm:inline-block text-[11px] font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap shrink-0">
                            Follow along with AI Guide on the right →
                          </span>
                        )}
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm bg-black">
                        <InterventionVideoStep step={videoStep} isActive={true} />
                      </div>
                    </div>
                  )}

                  {/* Guided Practice Prompt Card */}
                  {hasPractice && (
                    <div
                      onClick={() => {
                        setActiveTab('practice');
                        setMobileViewTab('practice');
                      }}
                      className="p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 dark:from-slate-900 dark:to-slate-800/60 shadow-xs flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
                          <PenTool size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap truncate">
                            Ready to Practice? ({practice.length} Items)
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            Test your knowledge with immediate answer reveal and explanations.
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform whitespace-nowrap shrink-0">
                        <span className="whitespace-nowrap">Go to Practice</span>
                        <ArrowRight size={14} className="shrink-0" />
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Practice Questions Tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/40">
                        <PenTool size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Practice Items · {practice?.length || 0} Questions
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Solve each question, then click Reveal Answer to verify your steps.
                        </p>
                      </div>
                    </div>
                  </div>

                  {practice?.map((q, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span
                          className="w-6 h-6 rounded-lg text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs"
                          style={{ background: 'linear-gradient(135deg, #9956DE, #7274ED)' }}
                        >
                          {i + 1}
                        </span>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{q.question}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-9 mb-3">
                        {q.options.map((opt, j) => {
                          const isCorrect = opt.label === q.answer;
                          return (
                            <div
                              key={j}
                              className={`text-xs rounded-xl px-3.5 py-2.5 font-medium border flex items-center justify-between ${
                                isCorrect && showAnswers[i]
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span>{opt.label}. {opt.text}</span>
                              {isCorrect && showAnswers[i] && (
                                <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-1.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pl-9 pt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAnswers((prev) => ({ ...prev, [i]: !prev[i] }))}
                          className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline self-start cursor-pointer"
                        >
                          {showAnswers[i] ? 'Hide Answer' : 'Reveal Answer & Explanation'}
                        </button>

                        {showAnswers[i] && (
                          <div
                            className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1"
                          >
                            <p className="font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              Correct Answer: Option {q.answer}
                            </p>
                            {q.explanation && (
                              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Persistent AI Guide Pane (Desktop) */}
        {showSideBySideChat ? (
          <div className="hidden lg:block w-[400px] xl:w-[440px] 2xl:w-[480px] shrink-0 h-full">
            {renderAIChatPane(false)}
          </div>
        ) : (
          /* Floating Docked Toggle on Right Edge when Minimized */
          <button
            type="button"
            onClick={() => setShowSideBySideChat(true)}
            className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 items-center gap-2 pl-3.5 pr-2 py-4 rounded-l-2xl bg-gradient-to-l from-purple-600 via-indigo-600 to-purple-700 text-white shadow-2xl hover:shadow-purple-500/30 hover:-translate-x-1 active:translate-x-0 transition-all cursor-pointer group border-y border-l border-white/20 select-none"
            title="Open AI Guide side-by-side"
            aria-label="Open AI Guide side-by-side"
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center p-1 group-hover:scale-110 transition-transform shadow-inner">
              <img src="/avatar/avatar_icon.png" alt="AI" className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] font-black font-display tracking-widest [writing-mode:vertical-rl] rotate-180 flex items-center gap-1.5 py-1">
              <Sparkles size={11} className="rotate-90 text-amber-300 animate-pulse" />
              AI GUIDE
            </span>
            <ChevronLeft size={16} className="text-white/80 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* ── Polished Bottom Action Bar (Unobstructed, Flexible & Responsive) ── */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-3 sm:px-8 xl:px-10 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 z-30 shadow-xs">
        {/* Prev Button */}
        <div className="flex justify-start shrink-0">
          {onPrev ? (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Previous</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Exit Study</span>
            </button>
          )}
        </div>

        {/* Centered Step Progress Indicator Pill */}
        <div className="flex-1 max-w-[220px] sm:max-w-xs md:max-w-sm flex flex-col items-center gap-1 min-w-0 px-1 sm:px-2">
          <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 font-display whitespace-nowrap truncate">
            <span className="hidden sm:inline">Step </span>{stepNumber} of {totalSections} · {progressPct}% Complete
          </span>
          <div className="w-full h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #9956DE, #7274ED)',
              }}
            />
          </div>
        </div>

        {/* Next / Finish Button */}
        <div className="flex justify-end shrink-0">
          {onNext ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
              style={{ background: 'linear-gradient(135deg, #9956DE, #7274ED)' }}
            >
              <span className="whitespace-nowrap">Next Step</span>
              <ArrowRight size={14} className="shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Finish Module</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const portalTarget = typeof document !== 'undefined' ? (document.getElementById('modal-root') || document.body) : null;
  if (!portalTarget) return null;
  return ReactDOM.createPortal(content, portalTarget);
};

export default ModuleStepGuide;
