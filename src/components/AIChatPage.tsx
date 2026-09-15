import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Search, Plus, Trash2, ChevronLeft, Sparkles,
  Brain, Calculator, BookOpen, FlaskConical, Copy, Check,
  MessageSquare, Clock, Hash, Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import ChatMarkdown from './ChatMarkdown';
import UserAvatar from './UserAvatar';

const QUICK_PROMPTS = [
  { label: 'Explain step-by-step', icon: BookOpen, prompt: 'Can you explain this step-by-step?' },
  { label: 'SHS practice problem', icon: Calculator, prompt: 'Give me an SHS STEM practice problem on this topic.' },
  { label: 'Simplify concept', icon: Brain, prompt: "Simplify this concept for me like I'm a Grade 11 student." },
  { label: 'Check my solution', icon: FlaskConical, prompt: 'Can you check if my solution is correct?' },
] as const;

const TOPIC_CARDS = [
  { label: 'Algebra', icon: Calculator, color: 'from-[#9956DE] to-[#7274ED]', desc: 'Equations, functions, polynomials' },
  { label: 'Geometry', icon: Hash, color: 'from-[#1FA7E1] to-[#6ED1CF]', desc: 'Shapes, proofs, coordinates' },
  { label: 'Calculus', icon: Zap, color: 'from-[#FB96BB] to-[#FF8B8B]', desc: 'Limits, derivatives, integrals' },
  { label: 'Statistics', icon: Brain, color: 'from-[#FFB356] to-[#75D06A]', desc: 'Data, probability, distributions' },
] as const;

export function isObjectVal<T>(value: T): value is T & object {
  return typeof value === "object";
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

const AIChatPage = () => {
  const { 
    sessions, 
    activeSessionId, 
    isLoading,
    loadingSessionId,
    setActiveSessionId, 
    createNewSession, 
    sendMessage,
    deleteSession,
    getActiveSession,
    sessionsLoaded
  } = useChatContext();

  const { userProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const sendLockRef = useRef(false);

  const activeSession = getActiveSession();
  const messages = activeSession?.messages || [];
  const hasStreamingPlaceholder = messages.some(
    message => message.sender === 'ai' && message.id.startsWith('stream-')
  );
  const showTypingIndicator =
    isLoading && activeSessionId === loadingSessionId && !hasStreamingPlaceholder;

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= 120;
  };

  const handleMessagesScroll = () => {
    shouldAutoScrollRef.current = isNearBottom();
  };

  // Warm up the backend on mount to reduce cold-start latency
  useEffect(() => {
    import('../services/apiService.ts')
      .then(({ warmupBackend }) => {
        warmupBackend();
      })
      .catch((error) => {
        console.warn('AI chat warmup skipped:', error);
      });
  }, []);

  // Auto-create a session with welcome message when no sessions exist
  useEffect(() => {
    if (sessionsLoaded && sessions.length === 0) {
      const welcomeMessage = {
        id: 'welcome-' + Date.now(),
        sender: 'ai' as const,
        text: "Hi! I\u2019m L.O.L.I., your AI math tutor. What would you like to learn about today? \uD83C\uDF93",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const newSessionId = createNewSession(welcomeMessage);
      setActiveSessionId(newSessionId);
    }
  }, [sessionsLoaded]);
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const frame = window.requestAnimationFrame(() => scrollToBottom('auto'));
    return () => window.cancelAnimationFrame(frame);
  }, [messages, showTypingIndicator]);

  useEffect(() => {
    shouldAutoScrollRef.current = true;
    scrollToBottom('auto');
    if (activeSessionId) setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeSessionId]);

  const handleSendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? currentMessage).trim();
    if (!text || isLoading || isSendingMessage || sendLockRef.current) return;

    sendLockRef.current = true;
    setIsSendingMessage(true);

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = createNewSession();
        setActiveSessionId(sessionId);
      }
      if (!overrideText) setCurrentMessage('');
      await sendMessage(sessionId, text);
    } finally {
      sendLockRef.current = false;
      setIsSendingMessage(false);
    }
  };

  const handleNewChat = () => {
    const welcomeMessage = {
      id: 'welcome-' + Date.now(),
      sender: 'ai' as const,
      text: "Hi! I\u2019m L.O.L.I., your AI math tutor. What would you like to learn about today? \uD83C\uDF93",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const newSessionId = createNewSession(welcomeMessage);
    setActiveSessionId(newSessionId);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(sessionId);
  };

  const handleCopyMessage = async (text: string, msgId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full min-h-0 overflow-hidden flex md:gap-4 px-0 pt-0 pb-0 sm:px-3 sm:pt-3 sm:pb-2.5 md:px-5 md:pt-2.5 md:pb-3 lg:px-6 lg:py-6 xl:px-10">

      {/* ── Left Sidebar ── */}
      <div className={`${activeSessionId ? 'hidden md:flex' : 'flex'} w-full md:w-80 min-h-0 flex-col bg-white rounded-none md:rounded-3xl border-0 md:border border-[#e4e4e7] overflow-hidden`}>

        {/* Gradient header */}
        <div className="relative px-4 pt-5 pb-4 flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #9956DE 0%, #7274ED 60%, #1FA7E1 100%)' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 50%)' }} />
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <img src="/avatar/avatar_icon.png" alt="L.O.L.I." className="w-8 h-8 object-contain drop-shadow" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-display text-white leading-tight">L.O.L.I.</h2>
                <p className="text-[10px] text-white/70">AI Math Tutor</p>
              </div>
            </div>
            <button
              onClick={handleNewChat}
              aria-label="New chat"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-bold rounded-xl transition-all"
            >
              <Plus size={13} />
              New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={13} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/50 transition-all"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            />
          </div>
        </div>

        {/* Count label */}
        <div className="px-4 py-2 flex-shrink-0 border-b border-[#f4f4f5]">
          <span className="text-[10px] font-bold text-[#a1a1aa] uppercase tracking-wider">
            {filteredSessions.length} Conversation{filteredSessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <AnimatePresence>
            {filteredSessions.map((session) => (
              <motion.button
                key={session.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                onClick={() => setActiveSessionId(session.id)}
                className={`group w-full text-left p-3 rounded-2xl cursor-pointer transition-all duration-200 border relative ${
                  activeSessionId === session.id
                    ? 'border-[#9956DE]/30 shadow-sm'
                    : 'bg-[#fafafa] border-transparent hover:bg-[#f4f4f5] hover:border-[#e4e4e7]'
                }`}
                style={activeSessionId === session.id ? { background: 'linear-gradient(to right, rgba(153,86,222,0.09), rgba(114,116,237,0.09))' } : {}}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSessionId === session.id ? 'bg-[#9956DE]' : 'bg-[#d4d4d8]'}`} />
                    <h3 className={`text-xs font-bold line-clamp-1 ${activeSessionId === session.id ? 'text-[#9956DE]' : 'text-[#0a1628]'}`}>
                      {session.title}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    aria-label="Delete conversation"
                    className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-[#a1a1aa] hover:text-red-500 transition-all ml-1"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <p className="text-[10px] text-[#71717a] mb-2 line-clamp-2 pl-3.5">{session.preview}</p>
                <div className="flex items-center justify-between text-[10px] pl-3.5">
                  <div className="flex items-center gap-1 text-[#a1a1aa]">
                    <Clock size={9} />
                    <span>{session.date}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${activeSessionId === session.id ? 'bg-[#9956DE]/10 text-[#9956DE]' : 'bg-[#f4f4f5] text-[#a1a1aa]'}`}>
                    {session.messageCount} msgs
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {filteredSessions.length === 0 && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(153,86,222,0.1)' }}>
                <MessageSquare size={20} className="text-[#9956DE]" />
              </div>
              <p className="text-sm font-semibold text-[#71717a]">No conversations yet</p>
              <p className="text-xs text-[#a1a1aa] mt-1">Start a new chat to begin!</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className={`${!activeSessionId ? 'hidden md:flex' : 'flex'} flex-1 min-h-0 flex-col bg-white rounded-none md:rounded-3xl border-0 md:border border-[#e4e4e7] overflow-hidden`}>
        {activeSessionId ? (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 border-b border-[#f4f4f5] bg-white">
              <div className="px-3 md:px-5 py-3 md:py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <button
                    onClick={() => setActiveSessionId(null)}
                    aria-label="Back to conversations"
                    className="md:hidden p-1.5 -ml-1 text-[#71717a] hover:text-[#0a1628] rounded-xl hover:bg-[#f4f4f5] transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #9956DE, #7274ED)' }}>
                    <img src="/avatar/avatar_icon.png" alt="L.O.L.I." className="w-6 h-6 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold font-display text-[#0a1628] text-sm truncate">{activeSession?.title}</h2>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      <p className="text-[10px] text-[#71717a]">L.O.L.I. · {activeSession?.date}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {activeSession?.topics.slice(0, 2).map((topic, i) => (
                    <span key={i} className="hidden sm:flex px-2.5 py-1 text-[#9956DE] text-[10px] font-bold rounded-lg" style={{ background: 'rgba(153,86,222,0.1)' }}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-5 min-h-0"
              style={{ background: '#fafafa' }}
            >
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-end gap-2.5 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.sender !== 'user' && (
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5" style={{ background: 'linear-gradient(135deg, #9956DE, #7274ED)' }}>
                        <img src="/avatar/avatar_icon.png" alt="AI" className="w-5 h-5 object-contain" />
                      </div>
                    )}

                    <div className="group relative max-w-[78%] md:max-w-[70%]">
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.sender === 'user'
                            ? 'text-white rounded-br-sm'
                            : 'bg-white text-[#0a1628] shadow-sm border border-[#f4f4f5] rounded-bl-sm'
                        }`}
                        style={message.sender === 'user' ? { background: 'linear-gradient(135deg, #9956DE, #7274ED)' } : {}}
                      >
                        {message.sender === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                        ) : (
                          <ChatMarkdown>{message.text}</ChatMarkdown>
                        )}
                        <p className={`text-[10px] mt-1.5 ${message.sender === 'user' ? 'text-white/60' : 'text-[#a1a1aa]'}`}>
                          {safeTimestamp(message.timestamp)}
                        </p>
                      </div>

                      {message.sender !== 'user' && (
                        <button
                          onClick={() => handleCopyMessage(message.text, message.id)}
                          aria-label="Copy message"
                          className="absolute -top-2 -right-2 p-1.5 bg-white border border-[#e4e4e7] rounded-lg opacity-0 group-hover:opacity-100 text-[#a1a1aa] hover:text-[#9956DE] shadow-sm transition-all"
                        >
                          {copiedMsgId === message.id ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      )}
                    </div>

                    {message.sender === 'user' && (
                      <UserAvatar
                        src={userProfile?.photo}
                        name={userProfile?.name}
                        gender={userProfile?.gender}
                        className="w-7 h-7 flex-shrink-0 mb-0.5 rounded-xl"
                        fallbackClassName="text-[10px]"
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {showTypingIndicator && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-end gap-2.5 justify-start"
                >
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #9956DE, #7274ED)' }}>
                    <img src="/avatar/avatar_icon.png" alt="AI" className="w-5 h-5 object-contain" />
                  </div>
                  <div className="bg-white border border-[#f4f4f5] shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 bg-[#9956DE] rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-[#7274ED] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-[#1FA7E1] rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick prompt pills */}
            <div className="flex-shrink-0 px-4 pt-2.5 pb-1 bg-white border-t border-[#f4f4f5] overflow-x-auto">
              <div className="flex gap-2">
                {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
                  <button
                    key={label}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading || isSendingMessage}
                    className="flex items-center gap-1.5 px-3 py-1.5 border text-[11px] font-semibold rounded-xl whitespace-nowrap transition-all disabled:opacity-40 disabled:cursor-not-allowed text-[#9956DE] hover:border-[#9956DE]/40"
                    style={{ background: 'rgba(153,86,222,0.07)', borderColor: 'rgba(153,86,222,0.2)' }}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input — safe-area aware for mobile bottom nav */}
            <div
              className="flex-shrink-0 px-3 md:px-4 pt-2 bg-white"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex gap-2 items-center bg-[#fafafa] border border-[#e4e4e7] rounded-2xl px-3 py-1.5 transition-all focus-within:border-[#9956DE]/40">
                <Input
                  ref={inputRef}
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Ask me anything about math..."
                  className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-[#0a1628] placeholder-[#a1a1aa] py-1.5 px-0"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!currentMessage.trim() || isLoading || isSendingMessage}
                  aria-label="Send message"
                  className="w-9 h-9 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex-shrink-0 p-0 border-0"
                  style={{ background: 'linear-gradient(135deg, #9956DE, #7274ED)' }}
                >
                  <Send size={16} />
                </Button>
              </div>
              <p className="text-center text-[9px] text-[#a1a1aa] mt-1 pb-1">Press Enter to send · L.O.L.I. may make mistakes</p>
            </div>
          </>
        ) : (
          /* ── Welcome / Empty State ── */
          <div className="flex-1 overflow-y-auto">

            {/* Hero */}
            <div className="relative px-6 pt-8 pb-8 overflow-hidden" style={{ background: 'linear-gradient(135deg, #9956DE 0%, #7274ED 60%, #1FA7E1 100%)' }}>
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 10% 80%, #fff 0%, transparent 50%), radial-gradient(circle at 90% 20%, #fff 0%, transparent 40%)' }} />
              <div className="relative max-w-xl mx-auto text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                    <img src="/avatar/avatar_icon.png" alt="L.O.L.I." className="w-13 h-13 object-contain drop-shadow-lg" />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <Sparkles size={11} className="text-white/70" />
                  <span className="text-white/70 text-[10px] font-bold tracking-widest uppercase">Powered by AI</span>
                  <Sparkles size={11} className="text-white/70" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold font-display text-white mb-1">Meet L.O.L.I.</h1>
                <p className="text-white/70 text-xs font-medium">Logical Operations &amp; Learning Intelligence</p>
              </div>
            </div>

            <div className="px-4 md:px-8 py-6 space-y-6">

              {/* CTA Card */}
              <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-2xl border border-[#e4e4e7] shadow-lg p-5 text-center">
                  <p className="text-[#71717a] text-sm mb-4">Select an existing conversation or start a new one</p>
                  <button
                    onClick={handleNewChat}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #9956DE, #7274ED)' }}
                  >
                    <Plus size={16} />
                    Start New Chat
                  </button>
                </div>
              </div>

              {/* Topic cards */}
              <div className="max-w-2xl mx-auto">
                <p className="text-xs font-bold text-[#a1a1aa] uppercase tracking-wider mb-3">Explore Topics</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {TOPIC_CARDS.map(({ label, icon: Icon, color, desc }) => (
                    <button
                      key={label}
                      onClick={() => {
                        const id = createNewSession();
                        setActiveSessionId(id);
                        setTimeout(() => handleSendMessage(`I want to learn about ${label} in SHS STEM`), 200);
                      }}
                      className="group p-4 bg-white rounded-2xl border border-[#e4e4e7] hover:border-[#9956DE]/30 hover:shadow-md transition-all text-left"
                    >
                      <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <Icon size={18} className="text-white" />
                      </div>
                      <p className="text-sm font-bold text-[#0a1628] mb-0.5">{label}</p>
                      <p className="text-[10px] text-[#a1a1aa] leading-tight">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent sessions */}
              {sessions.length > 0 && (
                <div className="max-w-2xl mx-auto pb-4">
                  <p className="text-xs font-bold text-[#a1a1aa] uppercase tracking-wider mb-3">Recent Conversations</p>
                  <div className="space-y-2">
                    {sessions.slice(0, 3).map(session => (
                      <button
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id)}
                        className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-[#f4f4f5] hover:border-[#9956DE]/30 transition-all text-left"

                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(153,86,222,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(153,86,222,0.1)' }}>
                          <MessageSquare size={14} className="text-[#9956DE]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#0a1628] truncate">{session.title}</p>
                          <p className="text-[10px] text-[#a1a1aa] truncate">{session.preview}</p>
                        </div>
                        <span className="text-[10px] text-[#a1a1aa] flex-shrink-0">{session.date}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatPage;