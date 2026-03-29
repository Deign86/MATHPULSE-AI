import React, { useState } from 'react';
import {
  BookOpen, Play, CheckCircle, ChevronDown, ChevronRight, Lock, GraduationCap, Award, Clock, Star, TrendingUp, AlertTriangle, Target, Calculator, Compass, PieChart, Box, Percent, Infinity as InfinityIcon, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import SubjectDetailView from './SubjectDetailView';
import ModuleDetailView from './ModuleDetailView';
import PracticeCenter from './PracticeCenter';
import QuizExperience from './QuizExperience';
import { Quiz as QuizExperienceQuiz } from './QuizExperience';
import { subjects, type Subject, type Module } from '../data/subjects';
import { useAuth } from '../contexts/AuthContext';

interface ModulesPageProps {
  onEarnXP?: (xp: number, message: string) => void;
  atRiskSubjects?: string[];
}

const ModulesPage: React.FC<ModulesPageProps> = ({ onEarnXP, atRiskSubjects = [] }) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'learning-path' | 'all-subjects' | 'practice' | 'recommended'>('learning-path');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizExperienceQuiz | null>(null);

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0a1628] mb-4">Explore Modules</h1>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('learning-path')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'learning-path'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted'
              }`}
          >
            <GraduationCap size={18} />
            My Learning Path
          </button>
          <button
            onClick={() => setActiveTab('all-subjects')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'all-subjects'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted'
              }`}
          >
            <BookOpen size={18} />
            All Subjects
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'practice'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted'
              }`}
          >
            <Target size={18} />
            Practice & Quizzes
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'recommended'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted'
              }`}
          >
            <TrendingUp size={18} />
            Recommended
          </button>
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
            <PracticeCenter onStartQuiz={handleStartQuiz} />
          ) : activeTab === 'learning-path' ? (
            <LearningPathView subjects={subjects} onSelectSubject={setSelectedSubject} atRiskSubjects={atRiskSubjects} />
          ) : activeTab === 'all-subjects' ? (
            <AllSubjectsView subjects={subjects} onSelectSubject={setSelectedSubject} atRiskSubjects={atRiskSubjects} />
          ) : (
            <RecommendedView subjects={subjects} onSelectSubject={setSelectedSubject} onSelectModule={setSelectedModule} atRiskSubjects={atRiskSubjects} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Learning Path View - Shows subjects with active progress
const LearningPathView: React.FC<{ subjects: Subject[]; onSelectSubject: (subject: Subject) => void; atRiskSubjects?: string[] }> = ({ subjects, onSelectSubject, atRiskSubjects = [] }) => {
  const activeSubjects = subjects.filter(s => s.progress > 0);
  const nextSubjects = subjects.filter(s => s.progress === 0).slice(0, 2);

  return (
    <div className="h-full overflow-y-auto pr-2 pb-4 space-y-6 scrollbar-hide">
      {/* Active Subjects */}
      <div>
        <h2 className="font-bold text-lg text-[#0a1628] mb-4">Continue Learning</h2>
        <div className="grid grid-cols-2 gap-4">
          {activeSubjects.map((subject, index) => (
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

      {/* Next Up */}
      {nextSubjects.length > 0 && (
        <div>
          <h2 className="font-bold text-lg text-[#0a1628] mb-4">Start Learning</h2>
          <div className="grid grid-cols-2 gap-4">
            {nextSubjects.map((subject, index) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onClick={() => onSelectSubject(subject)}
                index={index}
                showProgress={false}
                isAtRisk={atRiskSubjects.includes(subject.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// All Subjects View - Browse all available subjects
const AllSubjectsView: React.FC<{ subjects: Subject[]; onSelectSubject: (subject: Subject) => void; atRiskSubjects?: string[] }> = ({ subjects, onSelectSubject, atRiskSubjects = [] }) => {
  return (
    <div className="h-full overflow-y-auto pr-2 pb-4 scrollbar-hide">
      <div className="grid grid-cols-2 gap-4">
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
    <div className="h-full overflow-y-auto pr-2 pb-4 space-y-6 scrollbar-hide">
      {/* Continue Where You Left Off */}
      {recommendedModules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-[#0a1628]">Continue Where You Left Off</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {recommendedModules.slice(0, 6).map((item, index) => (
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-[#0a1628]">Suggested Next</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {suggestedModules.slice(0, 3).map((item, index) => (
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-[#0a1628]">All Subjects</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
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

  const cardGradient = subject.id === 'gen-math' ? 'bg-gradient-to-br from-pink-400 to-pink-500' :
    subject.id === 'pre-calc' ? 'bg-gradient-to-br from-indigo-500 to-violet-600' :
      subject.id === 'stats-prob' ? 'bg-gradient-to-br from-amber-200 to-yellow-400' :
        'bg-gradient-to-br from-sky-400 to-blue-500';

  const textColor = subject.id === 'stats-prob' ? 'text-[#0a1628]' : 'text-white';
  const mutedText = subject.id === 'stats-prob' ? 'text-[#0a1628]/70' : 'text-white/80';
  const bubbleColor = subject.id === 'stats-prob' ? 'bg-white/40' : 'bg-white/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onClick}
      className={`${cardGradient} rounded-[2rem] p-6 h-56 relative overflow-hidden card-elevated hover:card-elevated-lg transition-all cursor-pointer flex flex-col justify-between group`}
    >
      {/* Scattered Graphics Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Background bubbles */}
        <div className={`absolute top-6 right-24 w-4 h-4 rounded-full ${bubbleColor} animate-pulse`} />
        <div className={`absolute bottom-12 right-1/2 w-8 h-8 rounded-full ${bubbleColor}`} />
        <div className={`absolute top-1/3 right-8 w-6 h-6 rounded-full ${bubbleColor}`} />

        {/* Main huge graphic */}
        <div className={`absolute -bottom-8 -right-6 w-40 h-40 ${bubbleColor} rounded-full mix-blend-overlay opacity-50`}></div>
        <div className={`absolute -bottom-4 -right-2 transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500 ${textColor}`}>
          <Icon size={120} className="opacity-90 drop-shadow-xl" />
        </div>

        {/* Scattered small icons depending on subject */}
        <div className={`absolute top-8 right-8 ${textColor} opacity-60 animate-bounce`} style={{ animationDuration: '3s' }}>
          {subject.id === 'gen-math' ? <Calculator size={24} /> :
            subject.id === 'pre-calc' ? <Compass size={24} /> :
              subject.id === 'stats-prob' ? <PieChart size={24} /> : <Box size={24} />}
        </div>
        <div className={`absolute top-1/2 right-28 ${textColor} opacity-50 animate-bounce`} style={{ animationDuration: '4s', animationDelay: '1s' }}>
          {subject.id === 'gen-math' ? <Percent size={32} /> :
            subject.id === 'pre-calc' ? <InfinityIcon size={32} /> :
              subject.id === 'stats-prob' ? <Target size={32} /> : <Layers size={32} />}
        </div>
      </div>

      {/* Front Content */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <div>
            {/* Star Rating and Duration */}
            <div className="flex items-center gap-1 text-orange-400 mb-3">
              {'★'.repeat(5)}
              <span className={`text-xs ml-1 ${mutedText}`}>({subject.totalModules * 12})</span>
            </div>

            <div className={`text-xs font-semibold tracking-wide ${mutedText}`}>
              {subject.totalModules * 5} / {subject.totalModules * 15} tasks • {subject.progress}%
            </div>
          </div>

          {/* At Risk Badge over image graphics space */}
          {isAtRisk && (
            <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md z-20">
              <AlertTriangle size={12} />
              At Risk
            </div>
          )}
        </div>

        <div>
          <h3 className={`text-[1.7rem] font-display font-bold ${textColor} leading-tight drop-shadow-sm pr-16`}>{subject.title}</h3>
        </div>
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`bg-white rounded-3xl border border-slate-100 card-elevated hover:card-elevated-lg transition-all cursor-pointer relative overflow-hidden flex flex-col`}
    >
      <div className={`h-20 relative ${module.accentColor} overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-black/10" />
        {isAtRisk && (
          <div className="absolute top-2 right-2 z-20">
            <AlertTriangle size={14} className="text-white drop-shadow-md" />
          </div>
        )}
        <div className="absolute inset-0 opacity-20 bg-pattern" />
        <div className="absolute -bottom-3 left-4">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border border-white/50 ${status === 'In Progress' ? 'bg-orange-100 text-orange-700' :
            status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
              'bg-violet-100 text-violet-700'
            }`}>
            {status}
          </span>
        </div>
      </div>

      <div className="p-4 pt-5 flex-1 flex flex-col">
        <div className={`text-xs font-bold text-primary mb-1 uppercase tracking-wide truncate`}>
          {subject.title}
        </div>
        <h3 className="font-bold text-[#0a1628] text-sm mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{module.title}</h3>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-[10px] mt-3">
            <span className="text-slate-500 font-bold flex items-center gap-1 border border-slate-100 px-1.5 py-0.5 rounded bg-slate-50">
              <BookOpen size={10} className="text-orange-500" />
              {module.lessons.length} Lessons
            </span>
            {module.progress > 0 && (
              <span className={`font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20`}>{module.progress}%</span>
            )}
          </div>

          {module.progress > 0 && (
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${module.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                className={`h-full bg-primary rounded-full`}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ModulesPage;