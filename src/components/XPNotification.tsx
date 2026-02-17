import React, { useEffect, useState } from 'react';
import { Star, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface XPNotificationProps {
  xp: number;
  message: string;
  show: boolean;
  onComplete: () => void;
}

const XPNotification: React.FC<XPNotificationProps> = ({ xp, message, show, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Star size={20} className="text-white" fill="currentColor" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={16} className="text-amber-200" />
              </motion.div>
            </div>
            <div>
              <p className="text-sm font-bold">{message}</p>
              <p className="text-2xl font-black">+{xp} XP</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XPNotification;
