import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, FileText, ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import type { StudyMaterial } from '../../services/lessonService';

interface StudyMaterialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: StudyMaterial[];
  isLoading: boolean;
}

const StudyMaterialsModal: React.FC<StudyMaterialsModalProps> = ({
  open,
  onOpenChange,
  materials,
  isLoading,
}) => {
  const handleViewPdf = (url: string) => {
    window.open(url, '_blank', 'noopener');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#f7f9fc] border-[#dde3eb] rounded-2xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-sky-600 to-sky-500 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full -ml-18 -mb-18" />
          <div className="relative z-10">
            <DialogTitle className="text-xl font-display font-bold text-white">
              Study Materials
            </DialogTitle>
            <DialogDescription className="text-white/90 text-sm font-body mt-1">
              Source PDFs referenced in this lesson
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#d1cec6] scrollbar-track-[#edf1f7]">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-[#dde3eb] bg-white p-5 space-y-3"
                  >
                    <div className="h-5 w-3/4 rounded-lg bg-[#edf1f7] animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-[#edf1f7] animate-pulse" />
                    <div className="h-9 w-28 rounded-xl bg-[#edf1f7] animate-pulse mt-2" />
                  </div>
                ))}
              </motion.div>
            ) : materials.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[#edf1f7] flex items-center justify-center mb-4">
                  <BookOpen size={28} className="text-[#5a6578]" />
                </div>
                <p className="text-[#5a6578] font-body text-sm">
                  No source materials found for this lesson.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="materials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {materials.map((material, index) => (
                  <motion.div
                    key={`${material.title}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.06,
                      type: 'spring',
                      damping: 25,
                      stiffness: 300,
                    }}
                    className="rounded-2xl border border-[#dde3eb] bg-white p-5 hover:border-sky-200 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 group-hover:bg-sky-100 transition-colors">
                        <FileText size={18} className="text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-display font-bold text-[#0a1628] leading-snug">
                          {material.title}
                        </h3>
                        <p className="text-sm font-body text-[#5a6578] mt-1 leading-relaxed">
                          {material.topic_match}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewPdf(material.source_pdf_url)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-body font-semibold transition-colors shadow-sm hover:shadow-md"
                      >
                        <ExternalLink size={14} />
                        View PDF
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudyMaterialsModal;