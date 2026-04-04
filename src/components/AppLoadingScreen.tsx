import React from 'react';
import { motion } from 'motion/react';
import { Bot } from 'lucide-react';

interface AppLoadingScreenProps {
  message?: string;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ message = 'Loading MathPulse AI...' }) => {
  return (
    <div className="fixed inset-0 bg-[#f7f9fc] z-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-sky-500/10 border border-[#dde3eb] flex flex-col items-center gap-6 max-w-sm w-full"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center border-2 border-white shadow-xl"
        >
          <img 
            src="/avatar/avatar_icon.png" 
            alt="Loading..." 
            className="w-16 h-16 object-contain drop-shadow-md"
            onError={(e) => {
              // Fallback if image doesn't exist yet
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <Bot className="w-12 h-12 text-sky-600 hidden" />
        </motion.div>
        
        <div className="text-center space-y-2">
          <h2 className="text-xl font-display font-bold text-[#0a1628]">MathPulse AI</h2>
          <div className="flex items-center justify-center gap-2">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full"
            />
            <p className="text-sm font-semibold text-slate-500">{message}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AppLoadingScreen;