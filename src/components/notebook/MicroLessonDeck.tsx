import React, { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../ui/utils';
import { MicroLessonCard, type MicroLessonCardProps } from './MicroLessonCard';

export interface MicroLessonDeckProps {
  cards: readonly MicroLessonCardProps[];
}

export const MicroLessonDeck: React.FC<MicroLessonDeckProps> = ({ cards }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const progressTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduceMotion = useReducedMotion();
  const deckId = useId();

  if (cards.length === 0) {
    return null;
  }

  const safeActiveIndex = Math.min(activeIndex, cards.length - 1);
  const activeCard = cards[safeActiveIndex];
  const activePanelId = `${deckId}-panel`;

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tabIndex: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (tabIndex + 1) % cards.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (tabIndex - 1 + cards.length) % cards.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = cards.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    progressTabRefs.current[nextIndex]?.focus();
  };

  return (
    <section aria-label="Merrill micro-lesson" className="w-full max-w-3xl space-y-5">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <p className="font-display text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
            Merrill mini quest
          </p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Learn it, try it, then prove it.
          </p>
        </div>
        <p className="shrink-0 text-sm font-extrabold tabular-nums text-muted-foreground">
          <span className="text-foreground">{safeActiveIndex + 1}</span> / {cards.length}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${activeCard.phase}-${safeActiveIndex}`}
          initial={reduceMotion ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          id={activePanelId}
          role="tabpanel"
          aria-live="polite"
          aria-label={`${activeCard.phase}: ${activeCard.title}`}
          aria-labelledby={`${deckId}-tab-${safeActiveIndex}`}
          className="focus-visible:outline-none"
        >
          <MicroLessonCard
            phase={activeCard.phase}
            title={activeCard.title}
            body={activeCard.body}
            katex={activeCard.katex}
            minutes={activeCard.minutes}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-4 px-1">
        <div
          role="tablist"
          aria-label="Micro-lesson progress"
          aria-orientation="horizontal"
          className="flex items-center gap-3"
        >
          {cards.map((lessonCard, tabIndex) => {
            const isActive = tabIndex === safeActiveIndex;

            return (
              <button
                key={`${lessonCard.phase}-${lessonCard.title}`}
                ref={(element) => {
                  progressTabRefs.current[tabIndex] = element;
                }}
                type="button"
                role="tab"
                id={`${deckId}-tab-${tabIndex}`}
                aria-selected={isActive}
                aria-controls={activePanelId}
                aria-label={`Go to ${lessonCard.phase}: ${lessonCard.title}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveIndex(tabIndex)}
                onKeyDown={(event) => handleTabKeyDown(event, tabIndex)}
                className={cn(
                  'flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
                  isActive ? 'scale-110' : 'hover:scale-105',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-3 rounded-full border border-border transition-colors dark:border-slate-600 motion-reduce:transition-none',
                    isActive ? 'bg-primary ring-4 ring-primary/15 dark:ring-primary/25' : 'bg-muted-foreground/30 dark:bg-muted-foreground/50',
                  )}
                />
              </button>
            );
          })}
        </div>

        <p className="hidden text-right text-xs font-bold text-muted-foreground sm:block">
          Use ← → to move through the quest
        </p>
      </div>
    </section>
  );
};

export default MicroLessonDeck;
