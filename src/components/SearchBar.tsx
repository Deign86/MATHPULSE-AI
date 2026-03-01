import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Clock, BookOpen, Users, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchResult {
  id: string;
  type: 'module' | 'student' | 'teacher' | 'page';
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface SearchBarProps {
  placeholder?: string;
  userRole?: 'student' | 'teacher' | 'admin';
  onSelect?: (result: SearchResult) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search anything...',
  userRole = 'student',
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sample search data based on user role
  const getSearchData = (): SearchResult[] => {
    if (userRole === 'student') {
      return [
        { id: '1', type: 'module', title: 'General Mathematics', subtitle: 'Grade 11 • Functions & Business Math', icon: BookOpen },
        { id: '2', type: 'module', title: 'Statistics & Probability', subtitle: 'Grade 11 • Distributions & Testing', icon: BookOpen },
        { id: '3', type: 'module', title: 'Pre-Calculus', subtitle: 'Grade 12 • Analytic Geometry & Trig', icon: BookOpen },
        { id: '4', type: 'module', title: 'Basic Calculus', subtitle: 'Grade 12 • Limits & Derivatives', icon: BookOpen },
        { id: '5', type: 'page', title: 'AI Chat', subtitle: 'Get help from AI tutor', icon: TrendingUp },
        { id: '6', type: 'page', title: 'My Progress', subtitle: 'View your achievements', icon: TrendingUp },
      ];
    } else if (userRole === 'teacher') {
      return [
        { id: '1', type: 'student', title: 'Alex Johnson', subtitle: 'Grade 11 • Level 12', icon: Users },
        { id: '2', type: 'student', title: 'Sarah Williams', subtitle: 'Grade 12 • Level 11', icon: Users },
        { id: '3', type: 'module', title: 'Gen Math Quiz 5', subtitle: '12 submissions', icon: BookOpen },
        { id: '4', type: 'page', title: 'Analytics', subtitle: 'Class performance overview', icon: TrendingUp },
        { id: '5', type: 'page', title: 'Create Assignment', subtitle: 'New homework or quiz', icon: BookOpen },
      ];
    } else {
      return [
        { id: '1', type: 'teacher', title: 'Prof. Anderson', subtitle: '48 students • Math Dept', icon: GraduationCap },
        { id: '2', type: 'student', title: 'Alex Johnson', subtitle: 'Top Performer • Level 12', icon: Users },
        { id: '3', type: 'page', title: 'System Settings', subtitle: 'Platform configuration', icon: TrendingUp },
        { id: '4', type: 'page', title: 'Reports', subtitle: 'Export analytics', icon: BookOpen },
        { id: '5', type: 'page', title: 'User Management', subtitle: 'Manage accounts', icon: Users },
      ];
    }
  };

  const recentSearches = [
    'Functions and Relations',
    'Normal Distribution',
    'AI Chat'
  ];

  useEffect(() => {
    if (query.trim()) {
      const searchData = getSearchData();
      const filtered = searchData.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    onSelect?.(result);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full max-w-xl">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-11 pr-24 py-2.5 bg-white border border-[#dde3eb] rounded-lg text-[#0a1628] placeholder-[#a8a5b3] font-body text-sm focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15 focus:outline-none transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClear}
              className="p-1.5 text-slate-500 hover:text-[#5a6578] hover:bg-[#edf1f7] rounded-md transition-colors"
            >
              <X size={14} />
            </motion.button>
          )}
          <kbd className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-body font-semibold text-slate-500 bg-[#edf1f7] border border-[#dde3eb] rounded-md">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-[#dde3eb] z-50 overflow-hidden max-h-96 overflow-y-auto"
            >
              {query.trim() ? (
                results.length > 0 ? (
                  <div className="p-2">
                    <div className="px-3 py-2 text-[10px] font-body font-semibold text-slate-500 uppercase tracking-wider">
                      Results
                    </div>
                    {results.map((result) => {
                      const Icon = result.icon || Search;
                      return (
                        <motion.button
                          key={result.id}
                          whileHover={{ backgroundColor: 'rgba(248, 247, 244, 1)' }}
                          onClick={() => handleSelect(result)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                        >
                          <div className="w-9 h-9 bg-sky-500/10 rounded-lg flex items-center justify-center text-sky-600 flex-shrink-0">
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-body font-semibold text-[#0a1628] truncate">
                              {result.title}
                            </h4>
                            {result.subtitle && (
                              <p className="text-xs font-body text-[#5a6578] truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Search size={40} className="text-[#d1cec6] mx-auto mb-3" />
                    <p className="text-[#5a6578] font-body text-sm">No results found</p>
                    <p className="text-slate-500 font-body text-xs mt-1">Try a different search term</p>
                  </div>
                )
              ) : (
                <div className="p-2">
                  <div className="px-3 py-2 text-[10px] font-body font-semibold text-slate-500 uppercase tracking-wider">
                    Recent Searches
                  </div>
                  {recentSearches.map((search, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ backgroundColor: 'rgba(248, 247, 244, 1)' }}
                      onClick={() => setQuery(search)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                    >
                      <Clock size={16} className="text-slate-500 flex-shrink-0" />
                      <span className="text-sm font-body text-[#0a1628]">{search}</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
