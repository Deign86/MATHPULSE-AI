import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ChevronRight, Lock, Hourglass, X, Sparkles } from 'lucide-react';
import { TOPIC_LABELS } from '../lib/topicTaxonomy';
import { CURRICULUM_MODULE_BLUEPRINTS, type ModuleStatus } from '../data/curriculumModules';
import { fetchStudyTips } from '../services/deepseekRagService';

interface SupplementalPillCarouselProps {
  /** Module IDs flagged as weak from diagnostic (topic-level) */
  flaggedTopics?: string[];
  /** Legacy: broad at-risk subject names (fallback) */
  atRiskSubjects?: string[];
  /** Set of module IDs the student has unlocked */
  unlockedModuleIds?: Set<string>;
  /** Map of moduleId → status for rendering chip state */
  moduleStatusMap?: Record<string, ModuleStatus>;
  /** Callback when user clicks a topic pill — receives moduleId */
  onTopicClick?: (moduleId: string) => void;
  /** Student UID for fetching study tips */
  studentId?: string;
}

const COLORS = {
  pillBg: '#E9D5FF',
  pillText: '#6B21A8',
  pillLockedBg: '#F3F4F6',
  pillLockedText: '#9CA3AF',
  pillComingSoonBg: '#FEF3C7',
  pillComingSoonText: '#92400E',
  headerText: '#1F2937',
  arrowBg: '#F3F4F6',
};

const VALID_MODULE_IDS = new Set(CURRICULUM_MODULE_BLUEPRINTS.map(m => m.id));

function getTopicLabel(moduleId: string): string {
  return TOPIC_LABELS[moduleId] ||
    CURRICULUM_MODULE_BLUEPRINTS.find(m => m.id === moduleId)?.moduleTitle ||
    moduleId.split('-').slice(2).join(' ').replace(/\b\w/g, c => c.toUpperCase());
}

const SupplementalPillCarousel: React.FC<SupplementalPillCarouselProps> = ({
  flaggedTopics = [],
  atRiskSubjects = [],
  unlockedModuleIds,
  moduleStatusMap = {},
  onTopicClick,
  studentId,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [studyTips, setStudyTips] = useState<Record<string, string>>({});
  const [loadingTips, setLoadingTips] = useState<string | null>(null);

  // Filter: only show chips for modules that exist AND are not 'unavailable'
  const validTopics = flaggedTopics.filter(id => {
    if (!VALID_MODULE_IDS.has(id)) return false;
    const status = moduleStatusMap[id];
    if (status === 'unavailable') return false; // suppress dead-end recommendations
    return true;
  });

  if (validTopics.length === 0) return null;

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const handleChipClick = async (moduleId: string, isClickable: boolean) => {
    if (!isClickable) return;
    // If already expanded, navigate
    if (expandedTopic === moduleId) {
      onTopicClick?.(moduleId);
      return;
    }
    // Expand and fetch tips
    setExpandedTopic(moduleId);
    if (!studyTips[moduleId] && studentId) {
      setLoadingTips(moduleId);
      try {
        const label = getTopicLabel(moduleId);
        const result = await fetchStudyTips(studentId, moduleId, label, 'General Mathematics', 0.7);
        if (result.generated) {
          setStudyTips(prev => ({ ...prev, [moduleId]: result.tips }));
        }
      } catch { /* silent */ }
      setLoadingTips(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <h3
        className="text-base font-bold mb-3"
        style={{ color: COLORS.headerText }}
      >
        Recommended for Review
      </h3>

      <div className="relative flex items-center">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {validTopics.slice(0, 8).map((moduleId, index) => {
            const status = moduleStatusMap[moduleId] || 'available';
            const isLocked = unlockedModuleIds ? !unlockedModuleIds.has(moduleId) : false;
            const isComingSoon = status === 'coming_soon';
            const isClickable = !isLocked && !isComingSoon;

            let style: React.CSSProperties;
            let icon: React.ReactNode;
            let title: string | undefined;

            if (isComingSoon) {
              style = { backgroundColor: COLORS.pillComingSoonBg, color: COLORS.pillComingSoonText, cursor: 'default' };
              icon = <Hourglass size={14} />;
              title = "Module coming soon — DepEd hasn't released this yet";
            } else if (isLocked) {
              style = { backgroundColor: COLORS.pillLockedBg, color: COLORS.pillLockedText, cursor: 'not-allowed' };
              icon = <Lock size={14} />;
              title = 'Complete previous modules to unlock';
            } else {
              style = { backgroundColor: COLORS.pillBg, color: COLORS.pillText };
              icon = <AlertTriangle size={14} />;
            }

            return (
              <button
                key={`${moduleId}-${index}`}
                onClick={() => handleChipClick(moduleId, isClickable)}
                disabled={!isClickable && !isComingSoon}
                title={title}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
                style={style}
              >
                {icon}
                {getTopicLabel(moduleId)}
                {isClickable && <ChevronRight size={14} />}
              </button>
            );
          })}
        </div>

        {showRightArrow && (
          <button
            onClick={scrollRight}
            className="flex-shrink-0 ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: COLORS.arrowBg }}
            aria-label="Scroll right"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Study Tips Panel */}
      <AnimatePresence>
        {expandedTopic && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-600" />
                <span className="text-xs font-bold text-purple-800">Study Tips · {getTopicLabel(expandedTopic)}</span>
              </div>
              <button onClick={() => setExpandedTopic(null)} className="text-purple-400 hover:text-purple-600">
                <X size={14} />
              </button>
            </div>
            {loadingTips === expandedTopic ? (
              <p className="text-xs text-purple-600 animate-pulse">Generating personalized tips...</p>
            ) : studyTips[expandedTopic] ? (
              <p className="text-xs text-purple-900 leading-relaxed whitespace-pre-line">{studyTips[expandedTopic]}</p>
            ) : (
              <p className="text-xs text-purple-600">Click "Go to Module" to start reviewing this topic.</p>
            )}
            <button
              onClick={() => onTopicClick?.(expandedTopic)}
              className="mt-2 text-xs font-bold text-purple-700 hover:text-purple-900 underline"
            >
              Go to Module →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SupplementalPillCarousel;
