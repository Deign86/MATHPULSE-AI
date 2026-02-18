import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useChatContext, Message } from '../contexts/ChatContext';
import ChatMarkdown from './ChatMarkdown';
import { warmupBackend } from '../services/apiService';

interface FloatingAITutorProps {
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  onFullScreen: () => void;
}

const FloatingAITutor: React.FC<FloatingAITutorProps> = ({ constraintsRef, onFullScreen }) => {
  const { activeSessionId, setActiveSessionId, createNewSession, getActiveSession, sendMessage, isLoading } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Warm up the HuggingFace Space when chat is opened
  useEffect(() => {
    if (isOpen) {
      warmupBackend();
    }
  }, [isOpen]);

  // Initialize with a new session if none exists
  useEffect(() => {
    if (isOpen && !activeSessionId) {
      const welcomeMessage: Message = {
        id: '1',
        sender: 'ai',
        text: 'Hi! 👋 I\'m your AI math tutor. What would you like to learn about today?',
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

  return (
    <div className="pointer-events-none">
      {/* Chat Window (Popup) */}
      <div 
        className={`pointer-events-auto mb-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right select-none ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none h-0'
        }`}
        style={{ maxHeight: isOpen ? '32rem' : '0' }}  
      >
        {/* Chat Header - Fixed */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">AI Math Tutor</h3>
              <p className="text-blue-100 text-xs">Always here to help</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFullScreenClick}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Open fullscreen"
            >
              <Maximize2 size={16} className="text-white" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-800 shadow-sm border border-slate-100'
                }`}
              >
                {message.sender === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <ChatMarkdown>{message.text}</ChatMarkdown>
                )}
                <p className={`text-[10px] mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                }`}>
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-800 shadow-sm border border-slate-100 rounded-2xl px-4 py-2.5 max-w-[75%]">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed */}
        <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
            />
            <button
              onClick={handleSendMessage}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!currentMessage.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="pointer-events-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:shadow-blue-300 transition-all"
      >
        {isOpen ? <X size={28} /> : <Bot size={28} />}
      </motion.button>
    </div>
  );
};

export default FloatingAITutor;