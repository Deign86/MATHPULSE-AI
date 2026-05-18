import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Lock, AlertTriangle, Bell, ArrowRight, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from './ui/drawer';
import { watchModule } from '../services/moduleWatchService';

export type ResolutionState = 'coming_soon' | 'progression_locked' | 'no_module';

export interface FallbackContentData {
  summary: string;
  key_concepts: string[];
  one_worked_example: { problem: string; solution: string };
  what_to_focus_on: string;
  rag_confidence: 'high' | 'medium' | 'low';
}

interface AtRiskStudyBriefProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  topicName: string;
  resolutionState: ResolutionState;
  fallbackContent: FallbackContentData | null;
  moduleId: string | null;
  studentId?: string;
  onNavigateToPrerequisite?: (moduleId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const BANNER_CONFIG: Record<ResolutionState, { icon: React.ReactNode; bg: string; text: string; message: string }> = {
  coming_soon: {
    icon: <Clock size={16} />,
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    message: "The full module for this topic isn't available yet — here's what you can study in the meantime, based on the DepEd curriculum.",
  },
  progression_locked: {
    icon: <Lock size={16} />,
    bg: 'bg-purple-50 border-purple-200',
    text: 'text-purple-800',
    message: "You're flagged as at-risk here, but this module is currently locked behind progression. Study this brief while you work toward unlocking it.",
  },
  no_module: {
    icon: <AlertTriangle size={16} />,
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-800',
    message: "No module has been created for this topic yet. Here's what the DepEd curriculum says you should know.",
  },
};

const AtRiskStudyBrief: React.FC<AtRiskStudyBriefProps> = ({
  open,
  onOpenChange,
  topicName,
  topicId,
  resolutionState,
  fallbackContent,
  moduleId,
  studentId,
  onNavigateToPrerequisite,
  loading = false,
  error = null,
}) => {
  const [exampleExpanded, setExampleExpanded] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notified, setNotified] = useState(false);

  const banner = BANNER_CONFIG[resolutionState];

  const handleNotifyMe = async () => {
    if (!studentId || !moduleId) return;
    setNotifyLoading(true);
    try {
      await watchModule(studentId, moduleId);
      setNotified(true);
    } catch { /* silent */ }
    setNotifyLoading(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="text-lg">{topicName}</DrawerTitle>
          <DrawerDescription>At-Risk Study Brief</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto flex-1 space-y-4">
          {/* Status Banner */}
          <div className={`flex items-start gap-2 p-3 rounded-lg border ${banner.bg}`}>
            <span className={`mt-0.5 ${banner.text}`}>{banner.icon}</span>
            <p className={`text-xs leading-relaxed ${banner.text}`}>{banner.message}</p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-sm text-gray-500">Loading study brief...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={14} className="text-red-600" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Content */}
          {fallbackContent && !loading && (
            <>
              {/* Summary */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Overview</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{fallbackContent.summary}</p>
              </div>

              {/* Key Concepts */}
              {fallbackContent.key_concepts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Concepts</h4>
                  <ul className="space-y-1.5">
                    {fallbackContent.key_concepts.map((concept, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                        {concept}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Worked Example — Collapsible */}
              {fallbackContent.one_worked_example?.problem && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExampleExpanded(!exampleExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900">Worked Example</span>
                    {exampleExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <AnimatePresence>
                    {exampleExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 py-3 space-y-2">
                          <div>
                            <span className="text-xs font-bold text-gray-500 uppercase">Problem</span>
                            <p className="text-sm text-gray-800 mt-0.5">{fallbackContent.one_worked_example.problem}</p>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-500 uppercase">Solution</span>
                            <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-line">{fallbackContent.one_worked_example.solution}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* What to Focus On */}
              {fallbackContent.what_to_focus_on && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-xs font-bold text-blue-800 uppercase mb-1">What to Focus On</h4>
                  <p className="text-sm text-blue-900 leading-relaxed">{fallbackContent.what_to_focus_on}</p>
                </div>
              )}

              {/* RAG Confidence Disclaimer */}
              {fallbackContent.rag_confidence === 'low' && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <AlertTriangle size={12} />
                  <span>Limited curriculum data was available for this topic preview.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* CTA Footer */}
        <DrawerFooter>
          {resolutionState === 'coming_soon' && moduleId && (
            <button
              onClick={handleNotifyMe}
              disabled={notified || notifyLoading}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              <Bell size={14} />
              {notified ? 'Subscribed!' : notifyLoading ? 'Subscribing...' : 'Notify Me When Available'}
            </button>
          )}

          {resolutionState === 'progression_locked' && moduleId && onNavigateToPrerequisite && (
            <button
              onClick={() => {
                onNavigateToPrerequisite(moduleId);
                onOpenChange(false);
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
            >
              Go to prerequisite module
              <ArrowRight size={14} />
            </button>
          )}

          <DrawerClose asChild>
            <button className="w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Close
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default AtRiskStudyBrief;
