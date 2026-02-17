import React, { useState } from 'react';
import { BookOpen, GraduationCap, Target, TrendingUp, ChevronRight, Lock, CheckCircle, Play, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import SubjectDetailView from './SubjectDetailView';
import ModuleDetailView from './ModuleDetailView';
import PracticeCenter from './PracticeCenter';
import QuizExperience from './QuizExperience';
import { Quiz as QuizExperienceQuiz } from './QuizExperience';
import { subjects, Subject, Module } from '../data/subjects';

interface ModulesPageProps {
  onEarnXP?: (xp: number, message: string) => void;
  atRiskSubjects?: string[];
}

const ModulesPage: React.FC<ModulesPageProps> = ({ onEarnXP, atRiskSubjects = [] }) => {
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
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Explore Modules</h1>
        
        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('learning-path')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'learning-path'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap size={18} />
            My Learning Path
          </button>
          <button
            onClick={() => setActiveTab('all-subjects')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'all-subjects'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen size={18} />
            All Subjects
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'practice'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Target size={18} />
            Practice & Quizzes
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'recommended'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
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
        <h2 className="font-bold text-lg text-slate-800 mb-4">Continue Learning</h2>
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
          <h2 className="font-bold text-lg text-slate-800 mb-4">Start Learning</h2>
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
            <h2 className="font-bold text-lg text-slate-800">Continue Where You Left Off</h2>
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
            <h2 className="font-bold text-lg text-slate-800">Suggested Next</h2>
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
          <h2 className="font-bold text-lg text-slate-800">All Subjects</h2>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`${subject.color} rounded-2xl p-6 border ${isAtRisk ? 'border-red-400 ring-2 ring-red-100' : 'border-white/50'} shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden`}
    >
      {/* Background Icon */}
      <div className="absolute right-4 bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={80} />
      </div>

      {/* At Risk/On Track Badge */}
      {showProgress && subject.progress > 0 && (
        <div className="absolute top-4 right-4 z-20">
          {isAtRisk ? (
            <div className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm border border-red-200">
              <AlertTriangle size={12} />
              At Risk
            </div>
          ) : (
             <div className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm border border-emerald-200">
              <CheckCircle size={12} />
              On Track
            </div>
          )}
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 ${subject.color} brightness-95 rounded-xl flex items-center justify-center ${subject.iconColor}`}>
            <Icon size={28} />
          </div>
          {showProgress && subject.progress > 0 && (
            <div className="text-right">
              <p className={`text-2xl font-bold ${subject.iconColor}`}>{subject.progress}%</p>
              <p className="text-xs text-slate-500 font-medium">Complete</p>
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="font-bold text-slate-800 mb-2">{subject.title}</h3>
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{subject.description}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <BookOpen size={14} />
            <span className="font-medium">{subject.totalModules} modules</span>
          </div>
          {subject.completedModules > 0 && (
            <div className="flex items-center gap-1 text-teal-600">
              <CheckCircle size={14} />
              <span className="font-medium">{subject.completedModules} done</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${subject.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
              className={`h-full ${subject.accentColor} rounded-full`}
            />
          </div>
        )}

        {/* CTA */}
        {!showProgress || subject.progress === 0 && (
          <Button
            className={`w-full ${subject.accentColor} hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm mt-4`}
          >
            Start Learning
          </Button>
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`${module.color} rounded-2xl p-4 border ${isAtRisk ? 'border-red-400 ring-2 ring-red-100' : 'border-white/50'} shadow-sm hover:shadow-lg transition-all cursor-pointer relative`}
    >
      {isAtRisk && (
        <div className="absolute top-2 right-2 z-20">
          <AlertTriangle size={14} className="text-red-500" />
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${subject.iconColor} ${subject.color} brightness-95`}>
          {subject.title}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
          status === 'Completed' ? 'bg-teal-100 text-teal-700' :
          'bg-emerald-100 text-emerald-700'
        }`}>
          {status}
        </span>
      </div>

      <h3 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2">{module.title}</h3>
      <p className="text-xs text-slate-600 mb-3 line-clamp-1">{module.description}</p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">
          {module.lessons.length} lessons • {module.quizzes.length} quizzes
        </span>
        {module.progress > 0 && (
          <span className={`font-bold ${module.iconColor}`}>{module.progress}%</span>
        )}
      </div>

      {module.progress > 0 && (
        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mt-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${module.progress}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
            className={`h-full ${module.accentColor} rounded-full`}
          />
        </div>
      )}
    </motion.div>
  );
};

export default ModulesPage;