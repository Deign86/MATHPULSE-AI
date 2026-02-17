import React from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HeroBannerProps {
  userName?: string;
  userLevel?: number;
  onContinueAlgebra?: () => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ userName = 'Student', userLevel = 1, onContinueAlgebra }) => {
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden p-8 mb-8 shadow-[0_10px_30px_rgba(37,99,235,0.2)]">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500"></div>
      
      {/* Decorative Circle */}
      <div className="absolute top-1/2 right-20 -translate-y-1/2 w-64 h-64 bg-white opacity-10 rounded-full blur-2xl"></div>

      <div className="relative z-10 flex items-center justify-between">
        <div className="max-w-lg text-white">
          <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {userName}! 👋</h1>
          <p className="text-blue-100 mb-6 text-lg">Mastery Level {userLevel}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-blue-100">
              <span>Weekly Goal Progress</span>
              <span>75%</span>
            </div>
            <div className="h-3 bg-blue-900/30 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-teal-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: '75%' }}
              ></div>
            </div>
            <p className="text-xs text-blue-200 mt-2">Just 2 more lessons to reach your weekly streak!</p>
          </div>
          
          <button 
            onClick={onContinueAlgebra}
            className="mt-8 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            Continue Algebra
          </button>
        </div>

        <div className="hidden md:block relative w-64 h-64">
           {/* Robot Image */}
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
               <ImageWithFallback 
                 src="https://images.unsplash.com/photo-1707948952408-f7aa2c51db1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwM2QlMjByb2JvdCUyMGVkdWNhdGlvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzcwMTE2NTkzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                 alt="Robot Tutor"
                 className="w-full h-full object-cover"
               />
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;