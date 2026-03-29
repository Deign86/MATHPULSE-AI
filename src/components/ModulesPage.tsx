import React, { useState } from 'react';
import {
  BookOpen, Play, CheckCircle, ChevronDown, ChevronRight, Lock, Award, Clock, Star, TrendingUp, AlertTriangle, Target, Calculator, Compass, PieChart, Box, Percent, Infinity as InfinityIcon, Layers, Search, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import SubjectDetailView from './SubjectDetailView';
import ModuleDetailView from './ModuleDetailView';
import PracticeCenter from './PracticeCenter';
import QuizExperience from './QuizExperience';
import { Quiz as QuizExperienceQuiz } from './QuizExperience';
import { subjects, getActiveSubjectIdsForGrade, type Subject, type Module, type SubjectId } from '../data/subjects';
import { useAuth } from '../contexts/AuthContext';
import { type StudentProfile } from '../types/models';

interface ModulesPageProps {
  onEarnXP?: (xp: number, message: string) => void;
  atRiskSubjects?: string[];
}

const ModulesPage: React.FC<ModulesPageProps> = ({ onEarnXP, atRiskSubjects = [] }) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'all-subjects' | 'practice' | 'recommended'>('all-subjects');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizExperienceQuiz | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const studentGrade = (userProfile as StudentProfile | null)?.grade;
  const allowedSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const gradeScopedSubjects = subjects.filter((subject) => allowedSubjectIds.includes(subject.id as SubjectId));

  // Filter subjects based on search query
  const filteredSubjects = gradeScopedSubjects.map(subject => {
    const query = searchQuery.toLowerCase();
    const subjectMatches = subject.title.toLowerCase().includes(query);
    const matchedModules = subject.modules.filter(m => 
      m.title.toLowerCase().includes(query) || 
      m.description.toLowerCase().includes(query)
    );
    
    if (subjectMatches) {
      return subject; // Keep all modules if subject matches
    } else if (matchedModules.length > 0) {
      return { ...subject, modules: matchedModules }; // Only keep matched modules
    }
    return null;
  }).filter(Boolean) as Subject[];

  // Handle quiz start
  const handleStartQuiz = (quiz: QuizExperienceQuiz) => {
    setSelectedQuiz(quiz);
  };

  // Handle quiz completion
  const handleQuizComplete = (score: number, xpEarned: number) => {
    if (onEarnXP) {
      onEarnXP(xpEarned, `Quiz Completed! +${xpEarned} XP`);
    }
    setSelectedQuiz(null);
  };

  // If quiz is selected, show quiz experience
  if (selectedQuiz) {
    return (
      <QuizExperience
        quiz={selectedQuiz}
        onClose={() => setSelectedQuiz(null)}
        onComplete={handleQuizComplete}
        studentId={userProfile?.uid}
      />
    );
  }

  // If module is selected, show module detail view
  if (selectedModule) {
    return (
      <ModuleDetailView
        module={selectedModule}
        onBack={() => setSelectedModule(null)}
        onEarnXP={onEarnXP}
      />
    );
  }

  // If subject is selected, show subject detail view
  if (selectedSubject) {
    return (
      <SubjectDetailView
        subject={selectedSubject}
        onBack={() => setSelectedSubject(null)}
        onSelectModule={(module) => setSelectedModule(module)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
      {/* Kaggle-style Header Area */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-8">
          <div className="flex-1 max-w-2xl">
            <h1 className="text-[36px] md:text-[44px] font-display font-black text-[#202124] tracking-tight leading-[1.1] mb-5">
              Explore Modules
            </h1>
            <p className="text-[#3c4043] text-[16px] md:text-[17px] leading-[1.7] md:pr-10">
              Welcome to your personalized learning hub! MathPulse transforms your teacher's curriculum into a smart, adaptive lesson plan tailored exactly to your needs. The system dynamically generates quizzes and adjusts the difficulty level to match your true capacity, helping you master tricky math concepts at your own perfect pace. <span className="font-bold text-indigo-600 drop-shadow-sm">Start leveling up! 🚀</span>
            </p>
          </div>
          
          <div className="hidden md:flex flex-shrink-0 items-center justify-end w-[350px]">
            {/* Elegant Illustration mimicking the screenshot */}
            <svg viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm">
              {/* Character Base */}
              <circle cx="210" cy="90" r="45" fill="#202124" />
              <path d="M165 90 C165 65.1472 185.147 45 210 45 C234.853 45 255 65.1472 255 90 C255 114.853 234.853 135 210 135 C185.147 135 165 114.853 165 90 Z" fill="#202124"/>
              
              {/* Hair/Body */}
              <path d="M150 140 C140 120 160 80 200 70 C240 60 260 80 270 120 C275 140 260 180 210 180 C160 180 155 160 150 140 Z" fill="#202124"/>
              
              {/* Face */}
              <path d="M210 125 C195 125 185 110 185 95 C185 80 200 72 215 72 C230 72 245 80 245 95 C245 115 225 125 210 125 Z" fill="#e8eaed"/>
              <circle cx="202" cy="92" r="2" fill="#202124"/>
              <circle cx="225" cy="92" r="2" fill="#202124"/>
              <path d="M210 105 Q 215 110 220 105" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M198 86 Q 202 84 206 86" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M220 86 Q 225 84 230 86" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              
              {/* Earrings */}
              <circle cx="180" cy="100" r="6" stroke="#202124" strokeWidth="2" fill="none"/>
              <circle cx="248" cy="100" r="6" stroke="#202124" strokeWidth="2" fill="none"/>
              
              {/* Shirt */}
              <path d="M175 180 L 180 135 C185 125 235 125 240 135 L 245 180 Z" fill="#f8f9fa"/>
              <path d="M175 180 L 180 135 C185 125 235 125 240 135 L 245 180 Z" stroke="#202124" strokeWidth="2" fill="none"/>
              
              {/* Laptop */}
              <path d="M170 178 L 220 178 L 230 130 L 180 130 Z" fill="white" stroke="#202124" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M160 178 L 250 178" stroke="#202124" strokeWidth="2" strokeLinecap="round"/>
              <path d="M195 130 C195 130 190 155 180 170" stroke="#202124" strokeWidth="2" strokeLinecap="round" fill="none"/>
              
              {/* Floating Elements (Left) */}
              <circle cx="120" cy="50" r="14" fill="white" stroke="#202124" strokeWidth="1.5"/>
              <path d="M112 50 L 128 50 M 120 42 L 120 58 M 115 45 L 125 55 M 115 55 L 125 45" stroke="#202124" strokeWidth="1"/>
              
              <rect x="135" cy="55" width="16" height="12" rx="2" fill="white" stroke="#202124" strokeWidth="1.5" y="45"/>
              <path d="M140 50 h6 M140 53 h4" stroke="#202124" strokeWidth="1" strokeLinecap="round"/>

              {/* Floating Graph (Right) */}
              <circle cx="50" cy="110" r="4" fill="#202124"/>
              <circle cx="80" cy="70" r="3" fill="#1FA7E1"/>
              <circle cx="30" cy="80" r="3" fill="#1FA7E1"/>
              <circle cx="85" cy="140" r="3" fill="#1FA7E1"/>
              <circle cx="100" cy="100" r="3" fill="#1FA7E1"/>
              <circle cx="20" cy="130" r="3" fill="#1FA7E1"/>
              <path d="M50 110 L80 70 M50 110 L30 80 M50 110 L85 140 M50 110 L100 100 M50 110 L20 130" stroke="#1FA7E1" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
              
              <path d="M100 35 L 105 25 L 110 35 L 100 35 Z" fill="white" stroke="#202124" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M40 40 L 45 40 L 42.5 35 Z" fill="#202124"/>
            </svg>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#5f6368]">
            <Search size={22} strokeWidth={2.5} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Modules..." 
            className="w-full pl-16 pr-6 py-4 rounded-full border border-[#dadce0] bg-white text-[#202124] text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        {/* Tabs - Dynamic Segmented Control */}
        <div className="flex items-center bg-slate-100/80 p-1.5 rounded-full border border-slate-200/60 shadow-inner gap-1 w-max overflow-x-auto max-w-full no-scrollbar">
          {[
            { id: 'all-subjects', label: 'Subjects', icon: BookOpen, color: 'text-[#1FA7E1]' },
            { id: 'recommended', label: 'Recommended', icon: TrendingUp, color: 'text-[#75D06A]' },
            { id: 'practice', label: 'Practice', icon: Target, color: 'text-[#FF8B8B]' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2.5 px-6 py-3 rounded-full text-[15px] font-bold transition-all duration-300 flex-shrink-0 ${
                  isActive ? 'shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="modulesTabBackground"
                    className="absolute inset-0 bg-white rounded-full shadow-[0_2px_15px_-3px_rgba(0,0,0,0.1)] border border-slate-100"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-2 ${isActive ? tab.color : ''}`}>
                  <tab.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto"
        >
          {activeTab === 'practice' ? (
            <PracticeCenter onStartQuiz={handleStartQuiz} searchQuery={searchQuery} allowedSubjectIds={allowedSubjectIds} />
          ) : activeTab === 'all-subjects' ? (
            <AllSubjectsView subjects={filteredSubjects} onSelectSubject={setSelectedSubject} atRiskSubjects={atRiskSubjects} />
          ) : (
            <RecommendedView subjects={filteredSubjects} onSelectSubject={setSelectedSubject} onSelectModule={setSelectedModule} atRiskSubjects={atRiskSubjects} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// All Subjects View - Browse all available subjects
const AllSubjectsView: React.FC<{ subjects: Subject[]; onSelectSubject: (subject: Subject) => void; atRiskSubjects?: string[] }> = ({ subjects, onSelectSubject, atRiskSubjects = [] }) => {
  return (
    <div className="h-full overflow-y-auto pr-2 pb-8 scrollbar-hide space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-inner">
            <BookOpen size={20} strokeWidth={2.5} />
          </div>
          <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">All Subjects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjects.map((subject, index) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onClick={() => onSelectSubject(subject)}
              index={index}
              showProgress
              isAtRisk={atRiskSubjects.includes(subject.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Recommended View - AI-suggested modules
const RecommendedView: React.FC<{ subjects: Subject[]; onSelectSubject: (subject: Subject) => void; onSelectModule: (module: Module) => void; atRiskSubjects?: string[] }> = ({ subjects, onSelectSubject, onSelectModule, atRiskSubjects = [] }) => {
  // Get recommended modules (in progress modules from different subjects)
  const recommendedModules: { subject: Subject; module: Module }[] = [];

  subjects.forEach(subject => {
    const inProgressModules = subject.modules.filter(m => m.progress > 0 && m.progress < 100);
    inProgressModules.forEach(module => {
      recommendedModules.push({ subject, module });
    });
  });

  // Get suggested next modules (first incomplete module from subjects with progress)
  const suggestedModules: { subject: Subject; module: Module }[] = [];

  subjects.filter(s => s.progress > 0).forEach(subject => {
    const nextModule = subject.modules.find(m => m.progress === 0);
    if (nextModule) {
      suggestedModules.push({ subject, module: nextModule });
    }
  });

  return (
    <div className="h-full overflow-y-auto pr-2 pb-8 space-y-10 scrollbar-hide">
      {/* Continue Where You Left Off */}
      {recommendedModules.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[14px] bg-[#FF8B8B]/10 flex items-center justify-center text-[20px] shadow-inner">🔥</div>
            <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">Jump Back In</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {recommendedModules.slice(0, 4).map((item, index) => (
              <ModuleCardCompact
                key={item.module.id}
                subject={item.subject}
                module={item.module}
                onClick={() => onSelectModule(item.module)}
                index={index}
                status="In Progress"
                isAtRisk={atRiskSubjects.includes(item.subject.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Next */}
      {suggestedModules.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[14px] bg-[#75D06A]/10 flex items-center justify-center text-[20px] shadow-inner">💡</div>
            <h2 className="font-display font-black text-[24px] text-slate-800 tracking-tight">Suggested Next</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {suggestedModules.slice(0, 4).map((item, index) => (
              <ModuleCardCompact
                key={item.module.id}
                subject={item.subject}
                module={item.module}
                onClick={() => onSelectModule(item.module)}
                index={index}
                status="New"
                isAtRisk={atRiskSubjects.includes(item.subject.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Browse All Subjects */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-[22px] text-slate-800">All Subjects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjects.map((subject, index) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onClick={() => onSelectSubject(subject)}
              index={index}
              showProgress
              isAtRisk={atRiskSubjects.includes(subject.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Subject Card Component
const SubjectCard: React.FC<{
  subject: Subject;
  onClick: () => void;
  index: number;
  showProgress: boolean;
  isAtRisk?: boolean;
}> = ({ subject, onClick, index, showProgress, isAtRisk }) => {
  const Icon = subject.icon;

  const getCardStyle = (id: string) => {
    switch(id) {
      case 'gen-math': return { bg: 'bg-[#9956DE]', tags: ['Algebra', 'Fractions', 'Integers'], level: 1 };
      case 'pre-calc': return { bg: 'bg-[#1FA7E1]', tags: ['Functions', 'Limits', 'Graphs'], level: 2 };
      case 'stats-prob': return { bg: 'bg-[#FF8B8B]', tags: ['Probability', 'Charts'], level: 2 };
      case 'basic-calc': return { bg: 'bg-[#FB96BB]', tags: ['Derivatives', 'Integrals'], level: 3 };
      default: return { bg: 'bg-[#75D06A]', tags: ['Math', 'Logic'], level: 1 };
    }
  };
  const { bg, tags, level } = getCardStyle(subject.id);

  const rating = subject.rating || 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={onClick}
      className={`${bg} rounded-[2rem] p-5 min-h-[260px] h-full relative overflow-hidden transition-all duration-300 ease-out cursor-pointer flex flex-col group shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)]`}
    >
      {/* Background Graphic Elements */}
      <div className="absolute -bottom-8 right-[-20%] w-48 h-48 bg-white opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute bottom-4 right-12 w-32 h-32 bg-white opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110 delay-75" />

      {/* Top Row */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-12 h-12 rounded-[1rem] bg-white/20 flex flex-shrink-0 items-center justify-center text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          <Icon size={24} className="opacity-100" />
        </div>
        <div className="px-3 py-1 bg-white/20 rounded-full text-white text-[13px] font-bold backdrop-blur-md">
          Lv {level}
        </div>
      </div>

      {/* Title & Tags */}
      <div className="relative z-10 flex-1">
         <h3 className="text-[22px] font-display font-bold text-white leading-tight mb-3 drop-shadow-sm pr-4 line-clamp-2">
           {subject.title}
         </h3>
         <div className="flex flex-wrap gap-2 pb-4">
           {tags.map(tag => (
             <span key={tag} className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[12px] font-bold shadow-sm backdrop-blur-md">
               {tag}
             </span>
           ))}
         </div>
      </div>

      {/* Bottom Section */}
      <div className="relative z-10 mt-auto pt-3 flex flex-col gap-2">
         {showProgress ? (
           <>
             <div className="flex justify-between text-white font-bold text-[13px] tracking-wide mt-1">
                <span>Progress</span>
                <span>{subject.progress}%</span>
             </div>
             
             <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden shadow-inner ring-1 ring-white/20">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000 ease-out" 
                  style={{width: `${subject.progress}%`}} 
                />
             </div>
           </>
         ) : (
            <div className="flex justify-between text-white/90 text-[13px] font-bold mt-1">
               <div className="flex items-center gap-1.5">
                 <Clock size={14} /> {(subject.totalModules * 45)} mins
               </div>
               <div className="flex items-center gap-1 tracking-widest text-white">
                 {'★'.repeat(Math.floor(rating))}
                 <span className="opacity-50">{'★'.repeat(5 - Math.floor(rating))}</span> 
               </div>
            </div>
         )}
         
         {isAtRisk && (
            <div className="absolute -top-3 right-0 bg-red-500 text-white px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-lg animate-pulse">
              <AlertTriangle size={12} /> At Risk
            </div>
         )}
      </div>
    </motion.div>
  );
};

// Compact Module Card for Recommended Section
const ModuleCardCompact: React.FC<{
  subject: Subject;
  module: Module;
  onClick: () => void;
  index: number;
  status: string;
  isAtRisk?: boolean;
}> = ({ subject, module, onClick, index, status, isAtRisk }) => {
  const getCardStyle = (id: string) => {
    switch(id) {
      case 'gen-math': return { bg: 'bg-[#9956DE]', light: 'bg-[#F5EDFC]', text: 'text-[#9956DE]' };
      case 'pre-calc': return { bg: 'bg-[#1FA7E1]', light: 'bg-[#E5F5FC]', text: 'text-[#1FA7E1]' };
      case 'stats-prob': return { bg: 'bg-[#FF8B8B]', light: 'bg-[#FFEDED]', text: 'text-[#FF8B8B]' };
      case 'basic-calc': return { bg: 'bg-[#FB96BB]', light: 'bg-[#FFEEF4]', text: 'text-[#FB96BB]' };
      default: return { bg: 'bg-[#75D06A]', light: 'bg-[#EDFAEB]', text: 'text-[#75D06A]' };
    }
  };
  
  const { bg, light, text } = getCardStyle(subject.id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className="bg-white rounded-[2rem] border border-slate-100 p-5 cursor-pointer shadow-sm hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col min-h-[170px]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${light} flex items-center justify-center`}>
          <subject.icon size={24} className={text} />
        </div>
        
        {isAtRisk && (
           <div className="absolute top-2 right-2">
             <AlertTriangle size={14} className="text-red-500" />
           </div>
        )}
        
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
          status === 'In Progress' ? 'bg-[#FFF3E0] text-[#FFB356]' :
          status === 'Completed' ? 'bg-[#EDFAEB] text-[#75D06A]' :
          'bg-slate-100 text-slate-500'
        }`}>
          {status}
        </span>
      </div>

      <div className="flex-1">
        <div className={`text-[11px] font-bold ${text} uppercase tracking-wider mb-1`}>
          {subject.title}
        </div>
        <h3 className="font-display font-bold text-slate-800 text-[16px] leading-[1.3] mb-3 line-clamp-2">
          {module.title}
        </h3>
      </div>

      <div className="mt-auto pt-2 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[13px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <BookOpen size={16} className={text} />
            {module.lessons.length} Lessons
          </span>
          {module.progress > 0 && <span className={text}>{module.progress}%</span>}
        </div>

        {module.progress > 0 && (
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1 ring-1 ring-slate-200/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${module.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
              className={`h-full ${bg} rounded-full`}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ModulesPage;