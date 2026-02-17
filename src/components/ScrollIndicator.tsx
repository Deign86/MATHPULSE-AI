import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface ScrollIndicatorProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ scrollContainerRef }) => {
  const [showIndicator, setShowIndicator] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef?.current) {
        const { scrollTop } = scrollContainerRef.current;
        // Hide indicator after user scrolls down 50px
        if (scrollTop > 50) {
          setShowIndicator(false);
        } else {
          setShowIndicator(true);
        }
      }
    };

    const container = scrollContainerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [scrollContainerRef]);

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-slate-400 text-xs font-medium bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-slate-200">
              Scroll to explore
            </div>
            <ChevronDown size={20} className="text-slate-400" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollIndicator;
