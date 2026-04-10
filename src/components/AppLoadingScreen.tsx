import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bot } from 'lucide-react';

interface AppLoadingScreenProps {
  message?: string;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ message = 'Loading MathPulse AI...' }) => {
  const [showFallbackIcon, setShowFallbackIcon] = useState(false);

  const screenStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: '#f7f9fc',
  };

  const cardStyle: React.CSSProperties = {
    width: 'min(100%, 24rem)',
    padding: '2rem',
    borderRadius: '2rem',
    border: '1px solid #dde3eb',
    background: '#ffffff',
    boxShadow: '0 24px 40px rgba(56, 189, 248, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  };

  const avatarShellStyle: React.CSSProperties = {
    width: '6rem',
    height: '6rem',
    borderRadius: '1.5rem',
    border: '2px solid #ffffff',
    background: 'linear-gradient(135deg, #e0f2fe 0%, #e0e7ff 100%)',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const avatarStyle: React.CSSProperties = {
    width: '4rem',
    height: '4rem',
    objectFit: 'contain',
    filter: 'drop-shadow(0 8px 12px rgba(15, 23, 42, 0.2))',
  };

  const messageRowStyle: React.CSSProperties = {
    marginTop: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  };

  const spinnerStyle: React.CSSProperties = {
    width: '1rem',
    height: '1rem',
    borderRadius: '999px',
    border: '2px solid #0284c7',
    borderTopColor: 'transparent',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0a1628',
  };

  const messageStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#64748b',
  };

  return (
    <div
      className="app-loader-screen"
      style={screenStyle}
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
        style={cardStyle}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="app-loader-avatar-shell"
          style={avatarShellStyle}
        >
          <img 
            src="/avatar/avatar_icon.png" 
            alt="Loading..." 
            className="app-loader-avatar"
            style={{ ...avatarStyle, display: showFallbackIcon ? 'none' : 'block' }}
            onError={() => {
              setShowFallbackIcon(true);
            }}
          />
          <Bot className="app-loader-bot-icon" style={{ display: showFallbackIcon ? 'block' : 'none' }} />
        </motion.div>
        
        <div className="app-loader-copy">
          <h2 className="app-loader-title" style={titleStyle}>MathPulse AI</h2>
          <div className="app-loader-message-row" style={messageRowStyle}>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="app-loader-spinner"
              style={spinnerStyle}
            />
            <p className="app-loader-message" style={messageStyle}>{message}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AppLoadingScreen;