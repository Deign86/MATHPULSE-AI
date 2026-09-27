import React from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Zap,
  Globe,
  ShieldCheck,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  FileCode2,
} from 'lucide-react';
import { Button } from '../ui/button';

interface SubjectsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StepItem {
  step: string;
  badge: string;
  title: string;
  desc: string;
  tag: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  iconBg: string;
  borderAccent: string;
  textColor: string;
}

const STEPS: StepItem[] = [
  {
    step: '01',
    badge: 'Step 1',
    title: 'Define Identity',
    desc: 'Assign official subject codes (e.g. GMATH, PRECAL), strand levels, and academic term structures in the core registry.',
    tag: 'Core Registry',
    icon: BookOpen,
    gradient: 'from-purple-500 via-indigo-600 to-indigo-700',
    iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-[#9956DE] dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60',
    borderAccent: 'border-l-purple-500',
    textColor: 'text-[#9956DE] dark:text-purple-400',
  },
  {
    step: '02',
    badge: 'Step 2',
    title: 'Map RAG Source',
    desc: 'Link PDF learning module storage paths directly to the AI Knowledge Base to enable vector chunk indexing and neural retrieval.',
    tag: 'RAG Pipeline',
    icon: Zap,
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
    borderAccent: 'border-l-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    step: '03',
    badge: 'Step 3',
    title: 'Global Toggle',
    desc: 'Instantly lock or make subjects accessible across all student learning dashboards and teacher lesson portals with a single switch.',
    tag: 'Universal Access',
    icon: Globe,
    gradient: 'from-emerald-500 via-teal-600 to-emerald-700',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
    borderAccent: 'border-l-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    step: '04',
    badge: 'Step 4',
    title: 'Audit Sync',
    desc: 'Every configuration change, link update, and availability toggle is logged with admin credentials and synchronized in real time.',
    tag: 'Security Ledger',
    icon: ShieldCheck,
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/60',
    borderAccent: 'border-l-sky-500',
    textColor: 'text-sky-600 dark:text-sky-400',
  },
];

const SubjectsHelpModal: React.FC<SubjectsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const modalElement = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92dvh] rounded-3xl sm:rounded-[36px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        {/* Top Brand Gradient Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] shrink-0" />

        {/* Header */}
        <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9956DE] to-[#7274ED] flex items-center justify-center text-white shadow-md shadow-purple-500/25 shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider font-display">
                  How It Works: Curriculum Control
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-[#9956DE] dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50">
                  Protocol
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                4-Stage Curriculum Governance & RAG Knowledge Pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all border border-slate-200/80 dark:border-slate-700 shadow-xs group cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Modal Body: Mobile Timeline vs Desktop Flow */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {/* ── Mobile View (< md): Interactive Vertical Connected Timeline ── */}
          <div className="md:hidden relative pl-4 space-y-4">
            {/* Left Connecting Gradient Line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-purple-500 via-amber-500 to-sky-500 opacity-40 pointer-events-none" />

            {STEPS.map((item, idx) => (
              <div key={`mob-step-${idx}`} className="relative flex items-start gap-3.5 group">
                {/* Numbered Node on Timeline */}
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${item.gradient} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20 z-10 border-2 border-white dark:border-slate-900`}>
                  {item.step}
                </div>

                {/* Step Card Content */}
                <div className="flex-1 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 shadow-xs space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-lg ${item.iconBg} border flex items-center justify-center shrink-0`}>
                        <item.icon size={13} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</h4>
                    </div>
                    <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-slate-700/60 border border-slate-200/70 dark:border-slate-600 text-slate-600 dark:text-slate-300 shrink-0">
                      {item.tag}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop View (≥ md): 4-Card Horizontal Flow ── */}
          <div className="hidden md:grid grid-cols-4 gap-4 relative">
            {STEPS.map((item, idx) => (
              <div
                key={`desk-step-${idx}`}
                className="group relative flex flex-col justify-between p-5 rounded-3xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-white dark:hover:bg-slate-800/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Subtle top indicator bar on hover */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="space-y-4">
                  {/* Step Header with Icon & Step Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${item.iconBg} border flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon size={22} />
                    </div>

                    <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${item.gradient} text-white font-black text-xs shadow-xs tracking-wider`}>
                      {item.badge}
                    </div>
                  </div>

                  {/* Title & Tag */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                      {item.tag}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </h4>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {/* Bottom Step Progression Indicator */}
                <div className="pt-4 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Phase {item.step}</span>
                  {idx < STEPS.length - 1 ? (
                    <ArrowRight size={13} className="text-slate-400 group-hover:text-[#9956DE] group-hover:translate-x-0.5 transition-all" />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Helpful Governance Protocol Summary Card ── */}
          <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#9956DE] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Layers size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Real-time synchronization across all platforms
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Availability toggles and PDF path changes take effect immediately without requiring app rebuilds.
                </p>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white text-xs font-bold shadow-sm shadow-purple-500/25 shrink-0 self-end sm:self-auto cursor-pointer"
            >
              Got It
            </Button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 sm:px-8 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#9956DE] animate-pulse" />
                </div>
              ))}
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Live Governance Protocol Active
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
            SHS STEM Curriculum v2.0
          </span>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
};

export default SubjectsHelpModal;
