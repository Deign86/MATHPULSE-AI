import React, { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2, Minus } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useChatContext, Message } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTutorNudges, consumeNudge, requestNudgeCheck, type TutorNudge } from '../services/tutorNudgeService';

export function isObjectVal<T>(value: T): value is T & object {
  return typeof value === "object";
}

const ChatMarkdown = lazy(() => import('./ChatMarkdown.tsx'));

const hasWindow = 'window' in globalThis;

interface FloatingAITutorProps {
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  onFullScreen: () => void;
}

/** Safely convert a Date or Firestore Timestamp to a time string */
function safeTimestamp(ts: string | number | Date | { toDate(): Date } | null | undefined): string {
  if (!ts) return '';
  if (ts instanceof Date) return ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isObjectVal(ts) && 'toDate' in ts) {
    // SAFETY: the 'toDate' in-guard above verified the Firestore timestamp shape.
    return (ts as { toDate(): Date }).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return String(ts);
}

const FloatingAITutor: React.FC<FloatingAITutorProps> = ({ constraintsRef, onFullScreen }) => {
  const { activeSessionId, setActiveSessionId, createNewSession, getActiveSession, sendMessage, isLoading } = useChatContext();
  const { currentUser, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    if (!hasWindow) return false;
    return window.localStorage.getItem('floating_ai_tutor_minimized') === '1';
  });
  const [currentMessage, setCurrentMessage] = useState('');
  const [pendingNudge, setPendingNudge] = useState<TutorNudge | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nudgeConsumedRef = useRef<string | null>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  // Subscribe to tutor nudges for students
  useEffect(() => {
    if (!currentUser?.uid || userRole !== 'student') return;
    let checkedOnce = false;
    return subscribeToTutorNudges(currentUser.uid, (nudge) => {
      if (nudge && nudge.id !== nudgeConsumedRef.current) {
        setPendingNudge(nudge);
      } else {
        setPendingNudge(null);
        // If no nudge exists on first check, ask backend to generate one
        if (!checkedOnce) {
          checkedOnce = true;
          requestNudgeCheck(currentUser.uid);
        }
      }
    });
  }, [currentUser?.uid, userRole]);

  useEffect(() => {
    if (!hasWindow) return;
    window.localStorage.setItem('floating_ai_tutor_minimized', isMinimized ? '1' : '0');
  }, [isMinimized]);

  // Escape closes the panel and returns focus to the launcher
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        fabRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Warm up the backend when chat is opened
  useEffect(() => {
    if (isOpen) {
      import('../services/apiService.ts')
        .then(({ warmupBackend }) => {
          warmupBackend();
        })
        .catch((error) => {
          console.warn('Floating tutor warmup skipped:', error);
        });
    }
  }, [isOpen]);

  // Initialize with a new session if none exists
  useEffect(() => {
    if (isOpen && !activeSessionId) {
      // Use nudge message if available, otherwise default welcome
      const text = pendingNudge
        ? pendingNudge.message
        : 'Hi! I\'m your AI math tutor. What would you like to learn about today?';
      const welcomeMessage: Message = {
        id: pendingNudge ? `nudge-${pendingNudge.id}` : '1',
        sender: 'ai',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const newSessionId = createNewSession(welcomeMessage);
      setActiveSessionId(newSessionId);
    }
  }, [isOpen]);

  // Consume nudge when tutor is opened and nudge is visible
  useEffect(() => {
    if (isOpen && pendingNudge && currentUser?.uid) {
      nudgeConsumedRef.current = pendingNudge.id;
      consumeNudge(currentUser.uid, pendingNudge.id).catch(() => {});
      setPendingNudge(null);
    }
  }, [isOpen, pendingNudge]);

  const activeSession = getActiveSession();
  const messages = activeSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !activeSessionId || isLoading) return;
    const text = currentMessage.trim();
    setCurrentMessage('');
    await sendMessage(activeSessionId, text);
  };

  const handleFullScreenClick = () => {
    onFullScreen();
  };

  const handleMinimizeLauncher = () => {
    setIsOpen(false);
    setIsMinimized(true);
  };

  const handleRestoreLauncher = () => {
    setIsMinimized(false);
  };

  return (
    <div className="pointer-events-none flex flex-col items-end">
      {/* Chat Window (Popup) - unmounted when closed so it leaves tab order */}
      <AnimatePresence>
      {isOpen && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
        className="pointer-events-auto mb-4 w-[calc(100vw-2rem)] max-w-sm sm:w-80 bg-[#f7f9fc] rounded-3xl shadow-2xl border border-[#dde3eb] flex flex-col overflow-hidden origin-bottom-right select-none"
        role="dialog"
        aria-label="AI tutor chat"
      >
        {/* Chat Header - Fixed */}
        <div className="bg-sky-600 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-9 h-9 object-contain drop-shadow-md" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">L.O.L.I.</h3>
              <p className="text-sky-100 text-[10px] leading-tight">Logical Operations &<br/>Learning Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFullScreenClick}
              type="button"
              aria-label="Open fullscreen"
              className="p-2.5 hover:bg-white/20 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Open fullscreen"
            >
              <Maximize2 size={16} className="text-white" />
            </button>
            <button
              type="button"
              aria-label="Minimize AI tutor launcher"
              onClick={handleMinimizeLauncher}
              className="p-2.5 hover:bg-white/20 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Minimize"
            >
              <Minus size={16} className="text-white" />
            </button>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
              className="p-2.5 hover:bg-white/20 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#edf1f7] max-h-[60vh] sm:max-h-[350px]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  message.sender === 'user'
                    ? 'bg-sky-600 text-white'
                    : 'bg-white text-[#0a1628] shadow-sm border border-[#dde3eb]'
                }`}
              >
                {message.sender === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <Suspense fallback={<p className="text-sm whitespace-pre-wrap">{message.text}</p>}>
                    <ChatMarkdown>{message.text}</ChatMarkdown>
                  </Suspense>
                )}
                <p className={`text-[10px] mt-1 ${
                  message.sender === 'user' ? 'text-sky-200' : 'text-slate-500'
                }`}>
                  {safeTimestamp(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-[#0a1628] shadow-sm border border-[#dde3eb] rounded-2xl px-4 py-2.5 max-w-[75%]">
                <div className="flex gap-1" aria-hidden="true">
                  <div className={`w-2 h-2 bg-sky-400 rounded-full ${reduceMotion ? '' : 'animate-bounce'}`}></div>
                  <div className={`w-2 h-2 bg-sky-400 rounded-full ${reduceMotion ? '' : 'animate-bounce [animation-delay:150ms]'}`}></div>
                  <div className={`w-2 h-2 bg-sky-400 rounded-full ${reduceMotion ? '' : 'animate-bounce [animation-delay:300ms]'}`}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed */}
        <div className="p-3 sm:p-4 border-t border-[#dde3eb] bg-white flex-shrink-0">
          <div className="flex gap-2">
            <input
              id="ai-tutor-input"
              name="ai-tutor-input"
              aria-label="Ask AI tutor a question"
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#dde3eb] focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-[#f7f9fc] min-h-[44px]"
            />
            <button
              type="button"
              aria-label="Send message"
              onClick={handleSendMessage}
              className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              disabled={!currentMessage.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </motion.div>
      )}
      </AnimatePresence>

      {/* Floating Button - Refined Dimensional with Hover-Only Minimize */}
      <div className="pointer-events-auto relative self-end">
        {isMinimized ? (
          <motion.button
            type="button"
            onClick={handleRestoreLauncher}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md shadow-slate-900/10 border border-white/20 flex items-center justify-center cursor-pointer"
            aria-label="Restore AI tutor launcher"
            title="Show AI tutor"
            style={{ willChange: 'transform' }}
          >
            <Bot size={18} />
          </motion.button>
        ) : (
          <div className="relative group">
            {/* Tooltip on Hover */}
            {!isOpen && (
              <div className="hidden sm:block absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-semibold rounded-xl border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                Hello! I'm L.O.L.I., how may I help you?
                <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2.5 h-2.5 bg-slate-900/90 rotate-45 border-r border-t border-white/10" />
              </div>
            )}

            {/* Hover-Only Minimize Button */}
            {!isOpen && (
              <button
                type="button"
                aria-label="Minimize AI tutor launcher"
                title="Minimize"
                onClick={handleMinimizeLauncher}
                className="absolute -top-1.5 -left-1.5 z-20 h-6 w-6 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 transition-all duration-150 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto scale-90 group-hover:scale-100"
              >
                <Minus size={12} className="stroke-[2.5]" />
              </button>
            )}

            {/* Dimensional Button Body - Noticeable & Clean */}
            <motion.button
              ref={fabRef}
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              drag
              dragConstraints={constraintsRef}
              dragElastic={0.2}
              dragMomentum={false}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white cursor-pointer relative transition-all duration-200 border-2 ${
                isOpen
                  ? 'bg-gradient-to-br from-rose-500 to-rose-600 border-white/60 shadow-xl shadow-slate-900/20'
                  : 'bg-gradient-to-br from-sky-400 via-sky-500 to-sky-600 border-white/80 shadow-xl shadow-sky-950/20 hover:shadow-2xl hover:shadow-sky-950/25'
              }`}
              aria-label={isOpen ? 'Close AI tutor chat' : 'Open AI tutor chat'}
              style={{ willChange: 'transform' }}
            >
              {/* Icon / Avatar content */}
              {isOpen ? (
                <X size={26} className="text-white drop-shadow-xs stroke-[2.4]" />
              ) : (
                <>
                  <img
                    src="/avatar/avatar_icon.png"
                    alt="AI Tutor"
                    className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-200 group-hover:scale-105"
                  />
                  {/* Subtle AI label badge */}
                  <span className="absolute -bottom-1.5 px-2 py-0.5 rounded-full bg-white text-sky-600 text-[10px] font-black tracking-wider shadow-sm border border-sky-100 uppercase pointer-events-none select-none">
                    AI
                  </span>
                </>
              )}

              {/* Nudge / Radar Ping indicator */}
              {!isOpen && pendingNudge && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400 border-2 border-white shadow-xs" />
                </span>
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingAITutor;