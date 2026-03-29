import os
import re

with open('src/components/ModuleDetailView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'Bookmark' not in text:
    text = text.replace('import {\n  ArrowLeft,', 'import {\n  ArrowLeft,\n  Bookmark,\n  Hash,\n  PenTool,')
elif 'PenTool' not in text:
    text = text.replace('import ', "import { PenTool, Bookmark, Hash } from 'lucide-react';\nimport ", 1)

main_return_pattern = r"  return \(\s*<div className=\"h-full flex flex-col\">\s*\{/\* Header \*/\}.*?\nexport default ModuleDetailView;"

new_return = '''  return (
    <div className="h-full flex flex-col px-4 sm:px-6 xl:px-10 py-6 sm:py-8 lg:overflow-hidden">
      {/* Header Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#5a6578] hover:text-sky-600 font-bold mb-4 transition-colors group w-max shrink-0"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Modules
      </button>

      {/* Book Cover / Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 lg:mb-8 rounded-[2rem] bg-[#0f172a] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden"
      >
        {/* Decorative Textbook Background */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #ffffff 39px, #ffffff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #ffffff 39px, #ffffff 40px)' }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative p-7 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
          <div className="flex-1 text-white">
            <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-5">
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest text-[#f8fafc] border border-white/20 shadow-sm flex items-center gap-1.5">
                <Bookmark size={14} /> Chapter {module.id.split('-').pop() || '1'}
              </div>
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-400/30">
                Lv {module.level || 1}
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white mb-3 md:mb-4 tracking-[-0.02em] leading-tight">
              {module.title}
            </h1>
            <p className="text-slate-300 text-sm md:text-[15px] max-w-2xl font-medium leading-relaxed mb-6 md:mb-8">
              {module.description}
            </p>

            {/* Elegant Linear Progress instead of redundant circles/bars */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 max-w-xl">
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2.5">
                  <Award size={20} className="text-emerald-400" />
                  <span className="text-[12px] md:text-[13px] font-black text-white uppercase tracking-wider">Module Mastery</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] md:text-[13px] font-bold text-slate-400 mb-0.5">{completedItems}/{totalItems} steps</span>
                  <span className="text-xl md:text-2xl font-black text-white shrink-0 leading-none">{module.progress}%</span>
                </div>
              </div>
              <div className="h-3 bg-black/40 rounded-full overflow-hidden shadow-inner ring-1 ring-white/10 p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${module.progress}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                  className={`h-full rounded-full relative ${module.progress === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-sky-400 to-indigo-400'}`}
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8L3N2Zz4=')] opacity-30 mix-blend-overlay" />
                </motion.div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex w-48 h-48 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md items-center justify-center transform rotate-[-3deg] shadow-2xl relative group hover:rotate-0 transition-all duration-500 shrink-0">
            <div className={`absolute inset-0 opacity-40 rounded-[2rem] bg-gradient-to-br ${module.progress === 100 ? 'from-emerald-400 to-teal-600' : 'from-[#1FA7E1] to-[#9956DE]'}`} />
            
            {module.progress === 100 ? (
              <Trophy size={80} className="text-white drop-shadow-xl z-10 scale-100 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
            ) : (
              <BookOpen size={80} className="text-white drop-shadow-xl z-10 scale-100 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
            )}
            
            <motion.div animate={{y:[-5,5,-5], rotate:[-10,10,-10]}} transition={{duration:4, repeat:Infinity}} className="absolute top-6 left-6 text-emerald-300 z-20">
              <Star size={20} fill="currentColor" />
            </motion.div>
            <motion.div animate={{y:[5,-5,5], rotate:[10,-10,10]}} transition={{duration:3.5, repeat:Infinity}} className="absolute bottom-8 right-6 text-sky-300 z-20">
              <Hash size={24} />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 2-Column Notebook Grid Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:min-h-0 pb-6 lg:pb-0">
        
        {/* LEFT COLUMN: Lessons */}
        <div className="relative flex flex-col bg-[#FAFAFA] rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden lg:h-full">
          {/* Notebook binding / margin line */}
          <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-rose-200/60 pointer-events-none z-0"></div>
          <div className="absolute left-[54px] top-0 bottom-0 w-px bg-rose-100/40 pointer-events-none z-0"></div>
          
          <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm relative z-10 flex items-center justify-between sticky top-0 shrink-0">
            <h2 className="font-display font-black text-xl md:text-2xl text-slate-800 flex items-center gap-3">
              <BookOpen size={24} className="text-sky-500" />
              Study Notes
            </h2>
            <div className="text-xs md:text-sm font-bold bg-sky-100 text-sky-600 px-3 py-1 rounded-full shadow-sm border border-sky-200/50">
              {completedLessons}/{module.lessons.length}
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto px-5 md:px-8 py-5 md:py-6 space-y-4 scrollbar-hide relative z-10" 
            style={{ 
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #f1f5f9 31px, #f1f5f9 32px)', 
              backgroundAttachment: 'local', 
              lineHeight: '32px' 
            }}
          >
            {module.lessons.map((lesson, index) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => !lesson.locked && setSelectedLesson({ lesson, type: 'lesson' })}
                className={`bg-white rounded-xl p-3 md:p-4 border relative overflow-hidden group transition-all duration-300 ${
                  lesson.locked
                    ? 'border-slate-200 opacity-60 saturate-50 cursor-not-allowed'
                    : lesson.completed
                    ? 'border-teal-200 hover:border-teal-300 hover:shadow-md cursor-pointer'
                    : 'border-sky-200 hover:border-sky-300 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                  lesson.locked ? 'bg-slate-300' :
                  lesson.completed ? 'bg-teal-400' : 'bg-sky-400'
                }`} />

                <div className="flex items-center justify-between pl-3 relative z-10">
                  <div className="flex items-center gap-3 md:gap-4 flex-1">
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-[10px] flex items-center justify-center shrink-0 shadow-sm ${
                      lesson.locked ? 'bg-slate-100 text-slate-400' :
                      lesson.completed ? 'bg-teal-50 text-teal-600' : 'bg-sky-50 text-sky-600'
                    }`}>
                      {lesson.locked ? <Lock size={16} /> :
                       lesson.completed ? <CheckCircle2 size={16} /> : 
                       <Play size={16} className="ml-1" />}
                    </div>

                    <div className="flex-1">
                      <div className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Lesson {index + 1}</div>
                      <h3 className={`font-bold text-[14px] md:text-[15px] leading-tight transition-colors ${
                        lesson.locked ? 'text-slate-600' : 'text-[#0a1628] group-hover:text-sky-600'
                      }`}>
                        {lesson.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3 md:ml-4">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] md:text-xs font-bold bg-slate-50 px-2 py-1 rounded-md">
                      <Clock size={12} />
                      <span>{lesson.duration}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Spacer for bottom padding */}
            <div className="h-4 pointer-events-none"></div>
          </div>
        </div>

        {/* RIGHT COLUMN: Assessments */}
        <div className="relative flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden lg:h-full">
          <div className="h-5 bg-slate-200/50 border-b border-slate-200 w-full flex items-center justify-center pointer-events-none sticky top-0 z-20">
            <div className="w-16 h-1.5 bg-slate-300 rounded-full"></div>
          </div>
          
          <div className="px-6 md:px-8 py-4 md:py-5 border-b-2 border-dashed border-slate-200 bg-white relative z-10 flex items-center justify-between sticky top-5 shrink-0">
            <h2 className="font-display font-black text-xl md:text-2xl text-slate-800 flex items-center gap-3">
              <PenTool size={24} className="text-rose-500" />
              Assessments
            </h2>
            <div className="text-xs md:text-sm font-bold bg-rose-100 text-rose-600 px-3 py-1 rounded-full shadow-sm border border-rose-200/50">
              {completedQuizzes}/{module.quizzes.length}
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto px-5 md:px-8 py-5 md:py-6 space-y-4 md:space-y-5 scrollbar-hide relative z-10"
            style={{
              backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: '-12px -12px'
            }}
          >
            {module.quizzes.map((quiz, index) => {
              const isLocked = quiz.locked;
              const isFinal = quiz.type === 'final';
              const isModuleQuiz = quiz.type === 'module';

              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (module.lessons.length + index) * 0.05 }}
                  onClick={() => !isLocked && setSelectedLesson({ quiz, type: 'quiz' })}
                  className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-5 border-2 relative select-none transition-all duration-300 ${
                    isLocked
                      ? 'border-slate-200 opacity-60 saturate-50 cursor-not-allowed'
                      : quiz.completed
                      ? 'border-teal-200 shadow-sm hover:border-teal-300 hover:shadow-md cursor-pointer'
                      : isFinal
                      ? 'border-indigo-200 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer'
                      : 'border-orange-200 shadow-sm hover:border-orange-300 hover:shadow-md cursor-pointer'
                  } group`}
                >
                  <div className="flex items-center justify-between gap-3 md:gap-4">
                    <div className="flex items-center gap-3 md:gap-4 flex-1">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transform group-hover:rotate-3 transition-transform ${
                        isLocked ? 'bg-slate-100 text-slate-400' :
                        quiz.completed ? 'bg-teal-500 text-white' :
                        isFinal ? 'bg-indigo-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {isLocked ? <Lock size={18} /> :
                         quiz.completed ? <Trophy size={18} /> :
                         <PenTool size={18} />}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[9px] md:text-[10px] font-black uppercase tracking-wider ${
                            isFinal ? 'bg-indigo-100 text-indigo-700' :
                            isModuleQuiz ? 'bg-orange-100 text-orange-700' :
                            'bg-sky-100 text-sky-700'
                          }`}>
                            {isFinal ? 'Final Exam' : isModuleQuiz ? 'Module Task' : 'Quiz'}
                          </span>
                          {!isLocked && !quiz.completed && (
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500 animate-pulse"></span>
                          )}
                        </div>
                        <h3 className={`font-bold text-[14px] md:text-[16px] leading-tight mb-1 md:mb-1.5 transition-colors ${
                          isLocked ? 'text-slate-600' : 'text-[#0a1628]'
                        }`}>
                          {quiz.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[11px] md:text-[12px] font-bold text-slate-400">
                          <span className="flex items-center gap-1"><BookOpen size={12}/> {quiz.questions} Qs</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="flex items-center gap-1"><Clock size={12}/> {quiz.duration}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {quiz.score !== undefined && quiz.completed && (
                        <div className="text-right">
                          <div className="text-xl md:text-2xl font-black text-teal-600 leading-none">{quiz.score}%</div>
                        </div>
                      )}
                      
                      {!isLocked && (
                        <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-[11px] md:text-[12px] font-black uppercase tracking-wider shadow-sm transition-all ${
                          quiz.completed 
                            ? 'bg-white border border-slate-200 text-slate-600 group-hover:bg-slate-50' 
                            : 'bg-slate-900 text-white group-hover:bg-slate-800'
                        }`}>
                          {quiz.completed ? 'Review' : 'Start'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Spacer for bottom padding */}
            <div className="h-4 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailView;'''

new_text = re.sub(main_return_pattern, new_return, text, flags=re.DOTALL)

if new_text == text:
    print('Failed to replace! Pattern did not match.')
else:
    with open('src/components/ModuleDetailView.tsx', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('Update successful!')
