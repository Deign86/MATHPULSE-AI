import React from 'react';
import MathPulseLoader from './ui/MathPulseLoader';

interface AppLoadingScreenProps {
  message?: string;
  subtitle?: string;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  message = 'Loading...',
  subtitle = 'Preparing your MathPulse AI experience...',
}) => {
  return (
    <MathPulseLoader
      title={message}
      subtitle={subtitle}
      fullScreen={true}
    />
  );
};

export default AppLoadingScreen;