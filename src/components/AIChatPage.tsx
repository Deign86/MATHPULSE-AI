import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Search, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChatContext } from '../contexts/ChatContext';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { warmupBackend } from '../services/apiService';

const AIChatPage = () => {
  const { 
    sessions, 
    activeSessionId, 
    isLoading,
    setActiveSessionId, 
    createNewSession, 
    sendMessage,
    deleteSession,
    getActiveSession 
  } = useChatContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = getActiveSession();
  const messages = activeSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Warm up the HuggingFace Space on mount to reduce cold-start latency
  useEffect(() => {
    warmupBackend();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createNewSession();
      setActiveSessionId(sessionId);
    }

    const text = currentMessage.trim();
    setCurrentMessage('');
    await sendMessage(sessionId, text);
  };

  const handleNewChat = () => {
    const newSessionId = createNewSession();
    setActiveSessionId(newSessionId);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(sessionId);
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Left Sidebar - Chat History (Fixed, Scrollable) */}
      <div className="w-80 flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden">
        {/* Header - Fixed */}
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">MathPulse AI</h2>
              <p className="text-[10px] text-slate-500">Your AI Math Tutor</p>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            New Chat
          </button>
          
          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Sessions List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-bold text-slate-500">
              {filteredSessions.length} Conversations
            </span>
          </div>
          
          <AnimatePresence>
            {filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => setActiveSessionId(session.id)}
                className={`group p-3 rounded-2xl cursor-pointer transition-all duration-200 border relative ${
                  activeSessionId === session.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-slate-50 border-transparent hover:bg-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className={`text-xs font-bold mb-0.5 pr-6 line-clamp-1 ${
                    activeSessionId === session.id ? 'text-blue-700' : 'text-slate-800'
                  }`}>
                    {session.title}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">{session.preview}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">{session.date}</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    activeSessionId === session.id 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {session.messageCount} msgs
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredSessions.length === 0 && (
            <div className="text-center py-8">
              <Bot size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No conversations found</p>
              <p className="text-xs text-slate-300 mt-1">Start a new chat!</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area - Fixed Viewport Layout */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden">
        {activeSessionId ? (
          <>
            {/* Chat Header - Fixed */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-bold text-slate-800">{activeSession?.title}</h2>
                <p className="text-xs text-slate-500">{activeSession?.date}</p>
              </div>
              <div className="flex items-center gap-2">
                {activeSession?.topics.map((topic, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg">
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Messages Container - Scrollable with Fixed Height */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 min-h-0">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                          : 'bg-white text-slate-800 shadow-md border border-slate-100'
                      }`}
                    >
                      {message.sender === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                      ) : (
                        <div className="chat-markdown">
                          <ReactMarkdown>{message.text}</ReactMarkdown>
                        </div>
                      )}
                      <p className={`text-[10px] mt-1.5 ${
                        message.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                      }`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-800 shadow-md border border-slate-100 rounded-2xl px-5 py-3 max-w-[70%]">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Sticky at Bottom */}
            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
              <div className="flex gap-3">
                <Input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything about math..."
                  className="flex-1 px-5 py-3 rounded-xl border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  className="px-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-3xl flex items-center justify-center mb-6">
              <Bot size={48} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to MathPulse AI</h2>
            <p className="text-slate-500 mb-6 max-w-md">
              Your personal AI math tutor is here to help! Start a new conversation or select one from the sidebar.
            </p>
            <button
              onClick={handleNewChat}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              Start Your First Chat
            </button>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl">
              {['Algebra', 'Geometry', 'Calculus'].map((topic) => (
                <div key={topic} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-700">{topic}</p>
                  <p className="text-xs text-slate-500 mt-1">Get help with {topic.toLowerCase()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatPage;