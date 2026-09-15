import React, { useState, useEffect, useRef } from 'react';
import { Home, BookOpen, Bot, BarChart3, Sparkles, Swords, Trophy, ChevronRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenProfile?: () => void;
  profilePhoto?: string;
  profileName?: string;
}

type ExpandableMenu = 'modules' | 'ai' | 'battle' | null;

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenProfile,
  profilePhoto,
  profileName,
}) => {
  const [openMenu, setOpenMenu] = useState<ExpandableMenu>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && event.target instanceof Node && !navRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTabAndClose = (tab: string) => {
    onSelectTab(tab);
    setOpenMenu(null);
  };

  const handleProfileClick = () => {
    setOpenMenu(null);
    if (onOpenProfile) {
      onOpenProfile();
    } else {
      onSelectTab('profile');
    }
  };

  const isModulesActive = activeTab === 'Modules' || activeTab === 'Grades';
  const isAIActive = activeTab === 'AI Chat' || activeTab === 'Avatar Studio';
  const isBattleActive = activeTab === 'Quiz Battle' || activeTab === 'Leaderboard';

  return (
    <nav
      ref={navRef}
      aria-label="Mobile and Tablet navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      {/* ─── MOBILE VIEW (< md): 5 Primary Buttons with Expandable Popups ─── */}
      <div className="md:hidden relative">
        {/* Backdrop for open popup */}
        {openMenu !== null && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[0.5px]"
            onClick={() => setOpenMenu(null)}
          />
        )}

        {/* MODULES Expansion Popup (Modules + Assessment) */}
        <AnimatePresence>
          {openMenu === 'modules' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+12px)] left-8 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-200 dark:border-purple-800/80 shadow-[0_12px_36px_rgba(124,58,237,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-48"
            >
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Modules')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Modules'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Modules' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'}`}>
                    <BookOpen size={16} aria-hidden="true" />
                  </div>
                  <span>Modules</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Grades')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Grades'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Grades' ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'}`}>
                    <BarChart3 size={16} aria-hidden="true" />
                  </div>
                  <span>Assessment</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI ICON Expansion Popup (AI Chat + Avatar Studio) */}
        <AnimatePresence>
          {openMenu === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-200 dark:border-purple-800/80 shadow-[0_12px_36px_rgba(124,58,237,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-48"
            >
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('AI Chat')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'AI Chat'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'AI Chat' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'}`}>
                    <Bot size={16} aria-hidden="true" />
                  </div>
                  <span>AI Chat</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Avatar Studio')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Avatar Studio'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Avatar Studio' ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'}`}>
                    <Sparkles size={16} aria-hidden="true" />
                  </div>
                  <span>Avatar Studio</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* QUIZ BATTLE Expansion Popup (Quiz Battle + Leaderboard) */}
        <AnimatePresence>
          {openMenu === 'battle' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+12px)] right-12 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-200 dark:border-purple-800/80 shadow-[0_12px_36px_rgba(124,58,237,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-48"
            >
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Quiz Battle')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Quiz Battle'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Quiz Battle' ? 'bg-white/20' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600'}`}>
                    <Swords size={16} aria-hidden="true" />
                  </div>
                  <span>Quiz Battle</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Leaderboard')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Leaderboard'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Leaderboard' ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'}`}>
                    <Trophy size={16} aria-hidden="true" />
                  </div>
                  <span>Leaderboard</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5 Mobile Bottom Bar Buttons */}
        <div className="flex items-center justify-around max-w-md mx-auto relative z-30">
          {/* 1. DASHBOARD */}
          <button
            type="button"
            onClick={() => handleSelectTabAndClose('Dashboard')}
            aria-label="Dashboard"
            aria-current={activeTab === 'Dashboard' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'Dashboard'
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800'
            }`}
          >
            <Home size={20} className={activeTab === 'Dashboard' ? 'stroke-[2.4]' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Dashboard</span>
          </button>

          {/* 2. MODULES (Expandable: Modules & Assessment) */}
          <button
            type="button"
            onClick={() => setOpenMenu(prev => prev === 'modules' ? null : 'modules')}
            aria-label="Module Options: Modules and Assessment"
            aria-expanded={openMenu === 'modules'}
            aria-haspopup="true"
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 ${
              isModulesActive || openMenu === 'modules'
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800'
            }`}
          >
            <BookOpen size={20} className={isModulesActive || openMenu === 'modules' ? 'stroke-[2.4]' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Modules</span>
          </button>

          {/* 3. AI (Center Button - Highlighted Purple with Extra-Large AI Avatar Head, No Label) */}
          <button
            type="button"
            onClick={() => setOpenMenu(prev => prev === 'ai' ? null : 'ai')}
            aria-label="AI Options: AI Chat and Avatar Studio"
            aria-expanded={openMenu === 'ai'}
            aria-haspopup="true"
            className="relative -top-3 flex items-center justify-center w-14 h-14 sm:w-15 sm:h-15 p-1 rounded-2xl transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none active:scale-[0.94] bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/40 ring-2 ring-purple-300 dark:ring-purple-600 shrink-0"
          >
            <img
              src="/avatar/avatar_icon.png"
              alt="AI"
              className="w-12 h-12 sm:w-13 sm:h-13 object-contain drop-shadow-xl select-none pointer-events-none"
            />
          </button>

          {/* 4. QUIZ BATTLE (Expandable: Quiz Battle & Leaderboard) */}
          <button
            type="button"
            onClick={() => setOpenMenu(prev => prev === 'battle' ? null : 'battle')}
            aria-label="Battle Options: Quiz Battle and Leaderboard"
            aria-expanded={openMenu === 'battle'}
            aria-haspopup="true"
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 ${
              isBattleActive || openMenu === 'battle'
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800'
            }`}
          >
            <Swords size={20} className={isBattleActive || openMenu === 'battle' ? 'stroke-[2.4]' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Quiz Battle</span>
          </button>

          {/* 5. PROFILE (Bottom Right - Replaces Assessment) */}
          <button
            type="button"
            onClick={handleProfileClick}
            aria-label={`Profile: ${profileName || 'User'}`}
            className="flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800"
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={profileName || 'Profile'}
                className="w-5 h-5 rounded-full object-cover border border-purple-200 dark:border-purple-800"
              />
            ) : (
              <User size={20} className="stroke-[1.8]" aria-hidden="true" />
            )}
            <span className="text-[10px] mt-1 leading-none truncate font-display">Profile</span>
          </button>
        </div>
      </div>

      {/* ─── TABLET VIEW (md: to lg:): Center AI Button with Same Design as Mobile ─── */}
      <div className="hidden md:flex items-center justify-around max-w-2xl mx-auto gap-1">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab('Dashboard')}
          aria-current={activeTab === 'Dashboard' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            activeTab === 'Dashboard'
              ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home size={20} className={activeTab === 'Dashboard' ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
          <span className="text-[11px] mt-1 font-display">Dashboard</span>
        </button>

        {/* 2. Modules */}
        <button
          type="button"
          onClick={() => onSelectTab('Modules')}
          aria-current={activeTab === 'Modules' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            activeTab === 'Modules'
              ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen size={20} className={activeTab === 'Modules' ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
          <span className="text-[11px] mt-1 font-display">Modules</span>
        </button>

        {/* 3. Assessment */}
        <button
          type="button"
          onClick={() => onSelectTab('Grades')}
          aria-current={activeTab === 'Grades' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            activeTab === 'Grades'
              ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 size={20} className={activeTab === 'Grades' ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
          <span className="text-[11px] mt-1 font-display">Assessment</span>
        </button>

        {/* 4. AI (Exact Center - Same Elevated Purple Design as Mobile, Extra-Large Head, No Label) */}
        <button
          type="button"
          onClick={() => onSelectTab('AI Chat')}
          aria-current={isAIActive ? 'page' : undefined}
          aria-label="AI Chat"
          className="relative -top-3 flex items-center justify-center w-14 h-14 sm:w-15 sm:h-15 p-1 rounded-2xl transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none active:scale-[0.94] bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/40 ring-2 ring-purple-300 dark:ring-purple-600 shrink-0"
        >
          <img
            src="/avatar/avatar_icon.png"
            alt="AI"
            className="w-12 h-12 sm:w-13 sm:h-13 object-contain drop-shadow-xl select-none pointer-events-none"
          />
        </button>

        {/* 5. Quiz Battle */}
        <button
          type="button"
          onClick={() => onSelectTab('Quiz Battle')}
          aria-current={activeTab === 'Quiz Battle' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            activeTab === 'Quiz Battle'
              ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Swords size={20} className={activeTab === 'Quiz Battle' ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
          <span className="text-[11px] mt-1 font-display">Quiz Battle</span>
        </button>

        {/* 6. Leaderboard */}
        <button
          type="button"
          onClick={() => onSelectTab('Leaderboard')}
          aria-current={activeTab === 'Leaderboard' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            activeTab === 'Leaderboard'
              ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy size={20} className={activeTab === 'Leaderboard' ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
          <span className="text-[11px] mt-1 font-display">Leaderboard</span>
        </button>

        {/* 7. Avatar Studio */}
        <button
          type="button"
          onClick={() => onSelectTab('Avatar Studio')}
          aria-current={activeTab === 'Avatar Studio' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            activeTab === 'Avatar Studio'
              ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={20} className={activeTab === 'Avatar Studio' ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
          <span className="text-[11px] mt-1 font-display">Avatar Studio</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
