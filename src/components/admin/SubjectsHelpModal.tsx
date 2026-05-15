import React from 'react';
import { BookOpen, Zap, Globe, ShieldCheck, X, ChevronRight } from 'lucide-react';

interface SubjectsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubjectsHelpModal: React.FC<SubjectsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-[#1e293b] uppercase tracking-wider">How It Works: Subject Governance</h3>
            <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Platform Curriculum Protocol & RAG Workflow</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-200 shadow-sm group"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content - Step-by-Step Graphic */}
        <div className="p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative">
            {/* Connecting Lines (Desktop) */}
            <div className="absolute top-12 left-0 right-0 h-0.5 border-t-2 border-dashed border-indigo-100 hidden md:block z-0" style={{ left: '10%', right: '10%' }} />

            {[
              { 
                step: "1", 
                title: "Define Identity", 
                desc: "Assign subject codes and grade levels in the core registry.", 
                icon: BookOpen, 
                color: "text-indigo-600", 
                bg: "bg-indigo-50" 
              },
              { 
                step: "2", 
                title: "Map RAG Source", 
                desc: "Link Firebase PDF paths to the AI Knowledge Base.", 
                icon: Zap, 
                color: "text-amber-600", 
                bg: "bg-amber-50" 
              },
              { 
                step: "3", 
                title: "Global Toggle", 
                desc: "Enable or lock subject access across all dashboards instantly.", 
                icon: Globe, 
                color: "text-emerald-600", 
                bg: "bg-emerald-50" 
              },
              { 
                step: "4", 
                title: "Audit Sync", 
                desc: "Every modification is logged and synced to the cloud registry.", 
                icon: ShieldCheck, 
                color: "text-purple-600", 
                bg: "bg-purple-50" 
              },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center text-center group relative z-10">
                {/* Step Circle with Number */}
                <div className={`relative mb-6 w-24 h-24 ${item.bg} rounded-[32px] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-indigo-100/20`}>
                  <item.icon size={36} className={`${item.color} drop-shadow-sm`} />
                  
                  {/* Step Number */}
                  <div className="absolute -top-3 -left-3 bg-[#9956DE] text-white text-[12px] font-black w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
                    {item.step}
                  </div>
                </div>
                
                <h4 className="text-sm font-black text-[#1e293b] uppercase tracking-wide mb-2">{item.title}</h4>
                <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-[180px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-12 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center gap-4">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse" />
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Governance Active & Monitored</p>
        </div>
      </div>
    </div>
  );
};

export default SubjectsHelpModal;
