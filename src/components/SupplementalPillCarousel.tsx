import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight } from 'lucide-react';

interface SupplementalPillCarouselProps {
  /** At-risk subjects from diagnostic assessment */
  atRiskSubjects?: string[];
  /** Callback when user clicks a topic pill */
  onTopicClick?: (topic: string) => void;
}

// Color palette matching the design description
const COLORS = {
  pillBg: '#E9D5FF', // Light purple (purple-200)
  pillText: '#6B21A8', // Dark purple (purple-800)
  headerText: '#1F2937', // gray-800
  arrowBg: '#F3F4F6', // gray-100
};

// Topic label mapping
const TOPIC_LABELS: Record<string, string> = {
  'functions': 'Functions & Graphs',
  'businessmath': 'Business Math',
  'logic': 'Logic & Reasoning',
  'statistics': 'Statistics',
  'probability': 'Probability',
  'precalc': 'Pre-Calculus',
  'calculus': 'Basic Calculus',
  'geometry': 'Geometry',
  'trigonometry': 'Trigonometry',
  'algebra': 'Algebra',
};

function formatTopicLabel(topic: string): string {
  const normalized = topic.toLowerCase().trim();
  return TOPIC_LABELS[normalized] || 
    topic.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const SupplementalPillCarousel: React.FC<SupplementalPillCarouselProps> = ({
  atRiskSubjects = [],
  onTopicClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightArrow, setShowRightArrow] = useState(false);

  if (atRiskSubjects.length === 0) return null;

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const handleTopicClick = (topic: string) => {
    onTopicClick?.(topic);
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      {/* Section Header */}
      <h3 
        className="text-base font-bold mb-3"
        style={{ color: COLORS.headerText }}
      >
        Recommended for Review
      </h3>

      {/* Pill Carousel Container */}
      <div className="relative flex items-center">
        {/* Horizontal Scroll Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {atRiskSubjects.slice(0, 8).map((topic, index) => (
            <button
              key={`${topic}-${index}`}
              onClick={() => handleTopicClick(topic)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] whitespace-nowrap"
              style={{ 
                backgroundColor: COLORS.pillBg,
                color: COLORS.pillText,
              }}
            >
              <AlertTriangle size={14} />
              {formatTopicLabel(topic)}
              <ChevronRight size={14} />
            </button>
          ))}
        </div>

        {/* Right Arrow Indicator (when more items to scroll) */}
        {showRightArrow && (
          <button
            onClick={scrollRight}
            className="flex-shrink-0 ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ 
              backgroundColor: COLORS.arrowBg,
            }}
            aria-label="Scroll right"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        )}
      </div>

      {/* CSS to hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.div>
  );
};

export default SupplementalPillCarousel;