import React, { useRef, useState, useEffect } from 'react';
import { BookOpen, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

const mockModules = [
  { id: 'gen-math', title: 'General Mathematics', icon: BookOpen, bg: 'bg-[#9956DE]', tags: ['Algebra', 'Fractions', 'Integers'], level: 1, progress: 25, isAtRisk: true },
  { id: 'pre-calc', title: 'Pre-Calculus', icon: BookOpen, bg: 'bg-[#1FA7E1]', tags: ['Functions', 'Limits', 'Graphs'], level: 2, progress: 15, isAtRisk: true },
  { id: 'stats-prob', title: 'Statistics & Probability', icon: BookOpen, bg: 'bg-[#FFB356]', tags: ['Probability', 'Mean/Median'], level: 2, progress: 40, isAtRisk: false },
  { id: 'basic-calc', title: 'Basic Calculus', icon: BookOpen, bg: 'bg-[#FB96BB]', tags: ['Derivatives', 'Integrals'], level: 3, progress: 50, isAtRisk: false },
  { id: 'adv-math', title: 'Advanced Algebra', icon: BookOpen, bg: 'bg-[#7274ED]', tags: ['Math', 'Logic'], level: 4, progress: 10, isAtRisk: true },
].slice(0, 5); // 5 items

const AdminPriorityModules: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    // Calculate which card is most visible
    // We have cards that are roughly 300px wide plus gap
    const scrollPercentage = scrollLeft / (scrollWidth - clientWidth);
    
    // Map percentage to an index (roughly)
    const totalDots = 3;
    let newIndex = Math.round(scrollPercentage * (totalDots - 1));
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= totalDots) newIndex = totalDots - 1;
    
    setActiveIndex(newIndex);
  };

  const scrollToDot = (index: number) => {
    if (!scrollRef.current) return;
    const { scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    const targetScroll = (maxScroll / 2) * index; 
    
    scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    setActiveIndex(index);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#dde3eb] mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-[#0a1628] mb-1">Priority Attention Modules</h2>
          <p className="text-sm text-[#5a6578]">Highly recommended to be reviewed (lowest performance).</p>
        </div>
      </div>

      <div className="relative">
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-6 hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {mockModules.map((module) => {
            const Icon = module.icon;
            
            return (
              <div
                key={module.id}
                className={`snap-center shrink-0 w-[280px] sm:w-[300px] ${module.bg} rounded-[2rem] p-5 min-h-[290px] relative overflow-hidden transition-all duration-300 flex flex-col group shadow-sm`}
              >
                {/* Background Circles */}
                <div className="absolute -bottom-8 right-[-20%] w-32 h-32 bg-white opacity-10 rounded-full" />
                <div className="absolute bottom-4 right-12 w-20 h-20 bg-white opacity-10 rounded-full" />

                {/* Top Row: Icon & Level */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-[1rem] bg-white/20 flex flex-shrink-0 items-center justify-center text-white backdrop-blur-sm">
                    <Icon size={24} className="opacity-90" />
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-white/20 text-white/90 text-sm font-bold backdrop-blur-sm">
                    Lv {module.level}
                  </div>
                </div>

                {/* Title & Tags */}
                <div className="relative z-10 flex-1">
                  <h3 className="text-2xl font-display font-black text-white leading-[1.1] mb-3 drop-shadow-sm pr-4 line-clamp-2">
                    {module.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 pb-4">
                    {module.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/20 text-white text-[13px] font-bold shadow-sm backdrop-blur-sm">       
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Section: Progress & Stats */}
                <div className="relative z-10 mt-auto pt-4 flex flex-col gap-2.5">
                  <div className="flex justify-between text-white/90 text-[13px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span>Avg Mastery</span>
                    </div>
                    <span>{module.progress}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-white/30 overflow-hidden shadow-inner mt-1">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>

                  {module.isAtRisk && (
                    <div className="absolute -top-12 right-0 bg-red-500 text-white px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-lg animate-pulse">
                      <AlertTriangle size={12} /> At Risk
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 3 dots carousel indicator */}
      <div className="flex justify-center items-center gap-2 mt-2">
        {[0, 1, 2].map((dotIndex) => (
          <button
            key={dotIndex}
            onClick={() => scrollToDot(dotIndex)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              activeIndex === dotIndex ? 'bg-sky-600 w-6' : 'bg-sky-200 hover:bg-sky-300'
            }`}
            aria-label={`Go to slide ${dotIndex + 1}`}
          />
        ))}
      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default AdminPriorityModules;