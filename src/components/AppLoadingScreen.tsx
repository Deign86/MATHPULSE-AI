import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bot } from 'lucide-react';

interface AppLoadingScreenProps {
  message?: string;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ message = 'Loading MathPulse AI...' }) => {
  const [showFallbackIcon, setShowFallbackIcon] = useState(false);

  return (
    <div
      className="app-loader-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="app-loader-card"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="app-loader-avatar-shell"
        >
          <img 
            src="/avatar/avatar_icon.png" 
            alt="Loading..." 
            className={`app-loader-avatar ${showFallbackIcon ? 'hidden' : 'block'}`}
            onError={() => {
              setShowFallbackIcon(true);
            }}
          />
          <Bot className={`app-loader-bot-icon ${showFallbackIcon ? 'block' : 'hidden'}`} />
        </motion.div>
        
        <div className="app-loader-copy">
          <h2 className="app-loader-title">MathPulse AI</h2>
          <div className="app-loader-message-row">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="app-loader-spinner"
            />
            <p className="app-loader-message">{message}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AppLoadingScreen;