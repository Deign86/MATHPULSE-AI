import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader2, RotateCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import type { Flashcard } from '../../services/lessonService';

interface FlashcardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcards: Flashcard[];
  isLoading: boolean;
}

const difficultyConfig: Record<Flashcard['difficulty'], { label: string; classes: string }> = {
  easy: { label: 'Easy', classes: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Medium', classes: 'bg-amber-100 text-amber-700' },
  hard: { label: 'Hard', classes: 'bg-rose-100 text-rose-700' },
};

const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  open,
  onOpenChange,
  flashcards,
  isLoading,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = flashcards[currentIndex] as Flashcard | undefined;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === flashcards.length - 1;
  const progressPercent = flashcards.length > 0
    ? ((currentIndex + 1) / flashcards.length) * 100
    : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handlePrevious = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
  }, [flashcards.length]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setIsFlipped(false);
      setCurrentIndex(0);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl bg-[#f7f9fc] border-[#dde3eb] rounded-2xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-violet-600 to-indigo-500 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full -ml-18 -mb-18" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-display font-bold text-white">
                Flashcards
              </DialogTitle>
              <DialogDescription className="text-white/90 text-sm font-body mt-1">
                Tap the card to reveal the answer
              </DialogDescription>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <RotateCw size={20} className="text-white" />
            </div>
          </div>
        </DialogHeader>

        {/* Progress bar */}
        <div className="h-1 bg-[#edf1f7]">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          />
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16"
              >
                {/* Skeleton card with flip hint */}
                <div className="w-full aspect-[3/2] max-w-sm rounded-2xl border border-[#dde3eb] bg-white overflow-hidden">
                  <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
                    <div className="h-6 w-3/4 rounded-lg bg-[#edf1f7] animate-pulse" />
                    <div className="h-4 w-1/2 rounded bg-[#edf1f7] animate-pulse" />
                    <div className="mt-4 h-3 w-24 rounded bg-[#edf1f7] animate-pulse" />
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[#5a6578]">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-body">Loading flashcards…</span>
                </div>
              </motion.div>
            ) : flashcards.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[#edf1f7] flex items-center justify-center mb-4">
                  <Loader2 size={28} className="text-[#5a6578] animate-spin" />
                </div>
                <p className="text-[#5a6578] font-body text-sm max-w-xs">
                  Flashcards are being prepared. Please try again shortly.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={`card-${currentIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Flip card container */}
                <div
                  className="w-full aspect-[3/2] max-w-sm mx-auto cursor-pointer perspective-[1000px]"
                  onClick={handleFlip}
                  role="button"
                  tabIndex={0}
                  aria-label={isFlipped ? 'Show question' : 'Show answer'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleFlip();
                    }
                  }}
                >
                  <motion.div
                    className="relative w-full h-full"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  >
                    {/* Front face */}
                    <div
                      className="absolute inset-0 rounded-2xl border border-[#dde3eb] bg-white shadow-lg flex flex-col items-center justify-center p-6 backface-hidden"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      {currentCard && (
                        <>
                          <span
                            className={`mb-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold font-body ${difficultyConfig[currentCard.difficulty].classes}`}
                          >
                            {difficultyConfig[currentCard.difficulty].label}
                          </span>
                          <p className="text-lg md:text-xl font-display font-bold text-[#0a1628] text-center leading-relaxed">
                            {currentCard.front}
                          </p>
                          <p className="mt-4 text-xs text-[#8b95a5] font-body">
                            Tap to flip
                          </p>
                        </>
                      )}
                    </div>

                    {/* Back face */}
                    <div
                      className="absolute inset-0 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-lg flex flex-col items-center justify-center p-6 backface-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      {currentCard && (
                        <>
                          <span
                            className={`mb-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold font-body ${difficultyConfig[currentCard.difficulty].classes}`}
                          >
                            {difficultyConfig[currentCard.difficulty].label}
                          </span>
                          <p className="text-lg md:text-xl font-display font-bold text-violet-900 text-center leading-relaxed">
                            {currentCard.back}
                          </p>
                          <p className="mt-4 text-xs text-violet-400 font-body">
                            Tap to flip back
                          </p>
                        </>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Card counter */}
                <p className="text-center text-sm text-[#5a6578] font-body mt-5">
                  Card {currentIndex + 1} of {flashcards.length}
                </p>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={handlePrevious}
                    disabled={isFirst}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-body font-semibold transition-all duration-200
                      disabled:opacity-40 disabled:cursor-not-allowed
                      bg-white border border-[#dde3eb] text-[#0a1628] hover:bg-[#edf1f7] hover:border-[#c4cdd9] active:scale-95"
                    aria-label="Previous card"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={isLast}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-body font-semibold transition-all duration-200
                      disabled:opacity-40 disabled:cursor-not-allowed
                      bg-violet-600 text-white hover:bg-violet-700 active:scale-95 shadow-sm hover:shadow-md"
                    aria-label="Next card"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlashcardsModal;