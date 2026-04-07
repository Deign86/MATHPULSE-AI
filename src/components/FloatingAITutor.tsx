import React, { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import { useChatContext, Message } from '../contexts/ChatContext';

const ChatMarkdown = lazy(() => import('./ChatMarkdown.tsx'));

interface FloatingAITutorProps {
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  onFullScreen: () => void;
}

const FloatingAITutor: React.FC<FloatingAITutorProps> = ({ constraintsRef, onFullScreen }) => {
  const { activeSessionId, setActiveSessionId, createNewSession, getActiveSession, sendMessage, isLoading } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('floating_ai_tutor_minimized') === '1';
  });
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('floating_ai_tutor_minimized', isMinimized ? '1' : '0');
  }, [isMinimized]);

  // Warm up the HuggingFace Space when chat is opened
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
      const welcomeMessage: Message = {
        id: '1',
        sender: 'ai',
        text: 'Hi! I\'m your AI math tutor. What would you like to learn about today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const newSessionId = createNewSession(welcomeMessage);
      setActiveSessionId(newSessionId);
    }
  }, [isOpen]);

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
      {/* Chat Window (Popup) */}
      <div 
        className={`pointer-events-auto mb-4 w-80 bg-[#f7f9fc] rounded-3xl shadow-2xl border border-[#dde3eb] flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right select-none ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none h-0'
        }`}
        style={{ maxHeight: isOpen ? '32rem' : '0' }}  
      >
        {/* Chat Header - Fixed */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-500 p-4 flex items-center justify-between flex-shrink-0">
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
              className="p-2 hover:bg-slate-200/70 rounded-lg transition-colors"
              title="Open fullscreen"
            >
              <Maximize2 size={16} className="text-white" />
            </button>
            <button
              type="button"
              aria-label="Minimize AI tutor launcher"
              onClick={handleMinimizeLauncher}
              className="p-2 hover:bg-slate-200/70 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minus size={16} className="text-white" />
            </button>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#edf1f7]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
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
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-[#0a1628] shadow-sm border border-[#dde3eb] rounded-2xl px-4 py-2.5 max-w-[75%]">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed */}
        <div className="p-4 border-t border-[#dde3eb] bg-white flex-shrink-0">
          <div className="flex gap-2">
            <input
              id="ai-tutor-input"
              name="ai-tutor-input"
              aria-label="Ask AI tutor a question"
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#dde3eb] focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-[#f7f9fc]"
            />
            <button
              type="button"
              aria-label="Send message"
              onClick={handleSendMessage}
              className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!currentMessage.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <div className="pointer-events-auto relative self-end">
        {isMinimized ? (
          <motion.button
            type="button"
            onClick={handleRestoreLauncher}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="h-9 w-9 rounded-full bg-slate-900/85 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-sm flex items-center justify-center"
            aria-label="Restore AI tutor launcher"
            title="Show AI tutor"
          >
            <Bot size={14} />
          </motion.button>
        ) : (
          <div className="relative group">
            {/* Tooltip */}
            {!isOpen && (
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-xl z-50">
                Hello! I'm L.O.L.I., how may I help you?
                <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-slate-800 rotate-45" />
              </div>
            )}

            {!isOpen && (
              <button
                type="button"
                aria-label="Minimize AI tutor launcher"
                title="Minimize"
                onClick={handleMinimizeLauncher}
                className="absolute -top-2 -left-2 z-10 h-6 w-6 rounded-full bg-white text-slate-700 border border-slate-200 shadow-md hover:bg-slate-100 transition-colors flex items-center justify-center"
              >
                <Minus size={12} />
              </button>
            )}

            <motion.button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 bg-gradient-to-br from-sky-600 to-sky-500 rounded-xl shadow-2xl flex items-center justify-center text-white hover:shadow-sky-300/50 transition-all"
              aria-label={isOpen ? 'Close AI tutor chat' : 'Open AI tutor chat'}
            >
              {isOpen ? <X size={28} /> : <img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-14 h-14 object-contain drop-shadow-lg" />}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingAITutor;