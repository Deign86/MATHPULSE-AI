import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Zap } from 'lucide-react';

interface LivePopupProps {
  show: boolean;
  type: 'streak' | 'multiplier';
  multiplierValue?: number;
  onClose: () => void;
}

const LivePopup: React.FC<LivePopupProps> = ({ show, type, multiplierValue, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  const getContent = () => {
    if (type === 'streak') {
      return {
        icon: <Flame size={16} className="text-orange-500" />,
        title: 'Streak Started!',
        subtitle: 'Keep answering correctly!',
        accent: 'border-orange-500'
      };
    } else {
      const value = multiplierValue || 2;
      return {
        icon: <Zap size={16} className="text-amber-500" />,
        title: `Multiplier ×${value}!`,
        subtitle: 'Combo streak active',
        accent: 'border-amber-500'
      };
    }
  };

  const content = getContent();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          className="fixed top-4 right-4 z-[300] max-w-[320px]"
        >
          <div className={`bg-white border-l-4 ${content.accent} rounded-xl shadow-lg border border-slate-200 px-4 py-3 flex items-center gap-3`}>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              {content.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-800 leading-tight">{content.title}</span>
              <span className="text-xs text-slate-500">{content.subtitle}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LivePopup;