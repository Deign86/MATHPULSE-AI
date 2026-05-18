import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ChevronRight, Lock, Clock, X, Sparkles } from 'lucide-react';
import { TOPIC_LABELS } from '../lib/topicTaxonomy';
import { CURRICULUM_MODULE_BLUEPRINTS, type ModuleStatus } from '../data/curriculumModules';
import { fetchStudyTips } from '../services/deepseekRagService';
import AtRiskStudyBrief, { type ResolutionState, type FallbackContentData } from './AtRiskStudyBrief';

export type AtRiskResolutionState = 'accessible' | 'coming_soon' | 'progression_locked' | 'no_module';

interface SupplementalPillCarouselProps {
  /** Module IDs flagged as weak from diagnostic (topic-level) */
  flaggedTopics?: string[];
  /** Legacy: broad at-risk subject names (fallback) */
  atRiskSubjects?: string[];
  /** Set of module IDs the student has unlocked */
  unlockedModuleIds?: Set<string>;
  /** Map of moduleId → status for rendering chip state */
  moduleStatusMap?: Record<string, ModuleStatus>;
  /** Map of moduleId → resolution state from at-risk resolution endpoint */
  resolutionStateMap?: Record<string, AtRiskResolutionState>;
  /** Map of moduleId → fallback content from Firestore */
  fallbackContentMap?: Record<string, FallbackContentData>;
  /** Callback when user clicks a topic pill — receives moduleId */
  onTopicClick?: (moduleId: string) => void;
  /** Callback to navigate to prerequisite module */
  onNavigateToPrerequisite?: (moduleId: string) => void;
  /** Student UID for fetching study tips */
  studentId?: string;
}

const COLORS = {
  pillBg: '#E9D5FF',
  pillText: '#6B21A8',
  pillLockedBg: '#EDE9FE',
  pillLockedText: '#7C3AED',
  pillComingSoonBg: '#FEF3C7',
  pillComingSoonText: '#92400E',
  pillNoModuleBg: '#FFE4E6',
  pillNoModuleText: '#BE123C',
  headerText: '#1F2937',
  arrowBg: '#F3F4F6',
};

const VALID_MODULE_IDS = new Set(CURRICULUM_MODULE_BLUEPRINTS.map(m => m.id));

function getTopicLabel(moduleId: string): string {
  return TOPIC_LABELS[moduleId] ||
    CURRICULUM_MODULE_BLUEPRINTS.find(m => m.id === moduleId)?.moduleTitle ||
    moduleId.split('-').slice(2).join(' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getChipStyle(resolutionState: AtRiskResolutionState): { style: React.CSSProperties; icon: React.ReactNode } {
  switch (resolutionState) {
    case 'coming_soon':
      return {
        style: { backgroundColor: COLORS.pillComingSoonBg, color: COLORS.pillComingSoonText, cursor: 'pointer' },
        icon: <Clock size={14} />,
      };
    case 'progression_locked':
      return {
        style: { backgroundColor: COLORS.pillLockedBg, color: COLORS.pillLockedText, cursor: 'pointer' },
        icon: <Lock size={14} />,
      };
    case 'no_module':
      return {
        style: { backgroundColor: COLORS.pillNoModuleBg, color: COLORS.pillNoModuleText, cursor: 'pointer' },
        icon: <AlertTriangle size={14} />,
      };
    default: // accessible
      return {
        style: { backgroundColor: COLORS.pillBg, color: COLORS.pillText, cursor: 'pointer' },
        icon: <AlertTriangle size={14} />,
      };
  }
}

const SupplementalPillCarousel: React.FC<SupplementalPillCarouselProps> = ({
  flaggedTopics = [],
  atRiskSubjects = [],
  unlockedModuleIds,
  moduleStatusMap = {},
  resolutionStateMap = {},
  fallbackContentMap = {},
  onTopicClick,
  onNavigateToPrerequisite,
  studentId,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [studyTips, setStudyTips] = useState<Record<string, string>>({});
  const [loadingTips, setLoadingTips] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTopicId, setDrawerTopicId] = useState<string>('');

  // Filter: only show chips for modules that exist in curriculum
  const validTopics = flaggedTopics.filter(id => VALID_MODULE_IDS.has(id));

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

  const getResolutionState = (moduleId: string): AtRiskResolutionState => {
    // Use explicit resolution state if available
    if (resolutionStateMap[moduleId]) return resolutionStateMap[moduleId];
    // Fallback: derive from moduleStatusMap + unlockedModuleIds
    const status = moduleStatusMap[moduleId];
    if (status === 'coming_soon') return 'coming_soon';
    if (status === 'unavailable') return 'no_module';
    if (status === 'available' || status === 'teacher_uploaded') {
      if (unlockedModuleIds && !unlockedModuleIds.has(moduleId)) return 'progression_locked';
      return 'accessible';
    }
    return 'accessible';
  };

  const handleChipClick = async (moduleId: string) => {
    const state = getResolutionState(moduleId);

    if (state === 'accessible') {
      // Normal navigation — expand for study tips first, double-click navigates
      if (expandedTopic === moduleId) {
        onTopicClick?.(moduleId);
        return;
      }
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
    } else {
      // Non-accessible: open Study Brief drawer
      setDrawerTopicId(moduleId);
      setDrawerOpen(true);
    }
  };

  const drawerResolutionState = drawerTopicId ? getResolutionState(drawerTopicId) : 'no_module';
  const drawerFallback = drawerTopicId ? (fallbackContentMap[drawerTopicId] || null) : null;
  const drawerModuleId = drawerTopicId || null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h3 className="text-base font-bold mb-3" style={{ color: COLORS.headerText }}>
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
              const state = getResolutionState(moduleId);
              const { style, icon } = getChipStyle(state);

              return (
                <button
                  key={`${moduleId}-${index}`}
                  onClick={() => handleChipClick(moduleId)}
                  title={
                    state === 'coming_soon' ? "Module coming soon — tap for study brief"
                    : state === 'progression_locked' ? "Locked — complete previous module first"
                    : state === 'no_module' ? "No module yet — tap for curriculum brief"
                    : undefined
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
                  style={style}
                >
                  {icon}
                  {getTopicLabel(moduleId)}
                  {state === 'accessible' && <ChevronRight size={14} />}
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

        {/* Study Tips Panel (for accessible topics only) */}
        <AnimatePresence>
          {expandedTopic && getResolutionState(expandedTopic) === 'accessible' && (
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

      {/* At-Risk Study Brief Drawer */}
      <AtRiskStudyBrief
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        topicId={drawerTopicId}
        topicName={drawerTopicId ? getTopicLabel(drawerTopicId) : ''}
        resolutionState={drawerResolutionState as ResolutionState}
        fallbackContent={drawerFallback}
        moduleId={drawerModuleId}
        studentId={studentId}
        onNavigateToPrerequisite={onNavigateToPrerequisite}
        loading={false}
        error={!drawerFallback && drawerOpen ? 'No study brief available yet. Try again later.' : null}
      />
    </>
  );
};

export default SupplementalPillCarousel;
