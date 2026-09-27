import React from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Zap, Globe, ShieldCheck, X } from 'lucide-react';

interface SubjectsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubjectsHelpModal: React.FC<SubjectsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const modalElement = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90dvh] rounded-3xl sm:rounded-[36px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-8 duration-500">
        {/* Top Brand Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] shrink-0" />

        {/* Header */}
        <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-4 sm:pb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">How It Works: Subject Governance</h3>
            <p className="text-[10px] sm:text-[11px] font-black text-[#9956DE] dark:text-purple-400 uppercase tracking-[0.2em] mt-0.5">Platform Curriculum Protocol & RAG Workflow</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all border border-slate-200/80 dark:border-slate-700 shadow-xs group cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content - Step-by-Step Graphic */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
            {[
              { 
                step: "1", 
                title: "Define Identity", 
                desc: "Assign subject codes and grade levels in the core registry.", 
                icon: BookOpen, 
                color: "text-indigo-600 dark:text-indigo-400", 
                bg: "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50" 
              },
              { 
                step: "2", 
                title: "Map RAG Source", 
                desc: "Link Firebase PDF paths to the AI Knowledge Base.", 
                icon: Zap, 
                color: "text-amber-600 dark:text-amber-400", 
                bg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50" 
              },
              { 
                step: "3", 
                title: "Global Toggle", 
                desc: "Enable or lock subject access across all dashboards instantly.", 
                icon: Globe, 
                color: "text-emerald-600 dark:text-emerald-400", 
                bg: "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50" 
              },
              { 
                step: "4", 
                title: "Audit Sync", 
                desc: "Every modification is logged and synced to the cloud registry.", 
                icon: ShieldCheck, 
                color: "text-purple-600 dark:text-purple-400", 
                bg: "bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/50" 
              },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center group relative z-10 p-4 rounded-2xl bg-slate-50/40 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                {/* Step Circle with Number */}
                <div className={`relative mb-4 sm:mb-5 w-16 h-16 sm:w-20 sm:h-20 ${item.bg} rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-sm`}>
                  <item.icon size={26} className={`${item.color} drop-shadow-xs`} />
                  
                  {/* Step Number */}
                  <div className="absolute -top-2 -left-2 bg-[#9956DE] text-white text-[11px] font-black w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                    {item.step}
                  </div>
                </div>
                
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide mb-1.5">{item.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 sm:px-10 py-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3 shrink-0">
          <div className="flex -space-x-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#9956DE] animate-pulse" />
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Platform Governance Active & Monitored</p>
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
