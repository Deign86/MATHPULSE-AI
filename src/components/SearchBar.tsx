import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Clock, BookOpen, Users, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchResult {
  id: string;
  type: 'module' | 'student' | 'teacher' | 'page';
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<any>;
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
        { id: '1', type: 'module', title: 'Algebra Basics', subtitle: 'Foundation • 12 lessons', icon: BookOpen },
        { id: '2', type: 'module', title: 'Calculus Introduction', subtitle: 'Advanced • 8 lessons', icon: BookOpen },
        { id: '3', type: 'module', title: 'Geometry Fundamentals', subtitle: 'Foundation • 15 lessons', icon: BookOpen },
        { id: '4', type: 'page', title: 'AI Chat', subtitle: 'Get help from AI tutor', icon: TrendingUp },
        { id: '5', type: 'page', title: 'My Progress', subtitle: 'View your achievements', icon: TrendingUp },
      ];
    } else if (userRole === 'teacher') {
      return [
        { id: '1', type: 'student', title: 'Alex Johnson', subtitle: 'Math 101 • Level 12', icon: Users },
        { id: '2', type: 'student', title: 'Sarah Williams', subtitle: 'Math 102 • Level 11', icon: Users },
        { id: '3', type: 'module', title: 'Algebra Quiz 5', subtitle: '12 submissions', icon: BookOpen },
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
    'Algebra Basics',
    'Pythagorean Theorem',
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-3 bg-slate-100 border-2 border-transparent rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
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
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X size={16} />
            </motion.button>
          )}
          <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-bold text-slate-500 bg-slate-200 rounded-lg">
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
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden max-h-96 overflow-y-auto"
            >
              {query.trim() ? (
                results.length > 0 ? (
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Results
                    </div>
                    {results.map((result) => {
                      const Icon = result.icon || Search;
                      return (
                        <motion.button
                          key={result.id}
                          whileHover={{ backgroundColor: 'rgba(241, 245, 249, 1)' }}
                          onClick={() => handleSelect(result)}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                        >
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-800 truncate">
                              {result.title}
                            </h4>
                            {result.subtitle && (
                              <p className="text-xs text-slate-500 truncate">
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
                    <Search size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No results found</p>
                    <p className="text-slate-400 text-xs mt-1">Try a different search term</p>
                  </div>
                )
              ) : (
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Recent Searches
                  </div>
                  {recentSearches.map((search, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ backgroundColor: 'rgba(241, 245, 249, 1)' }}
                      onClick={() => setQuery(search)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                    >
                      <Clock size={18} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{search}</span>
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
