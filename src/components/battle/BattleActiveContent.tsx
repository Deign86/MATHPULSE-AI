import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Users, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../ui/utils';

interface BattleActiveContentProps {
  activeMatch: any;
  roundSecondsLeft: number;
  lastRoundResult: any;
  selectedOptionIndex: number | null;
  roundLocked: boolean;
  answerSubmitting: boolean;
  designPauseActive: boolean;
  onOptionSelect: (idx: number) => void;
  floatingMomentum: any;
  lastRoundMomentumDelta: number | null;
  studentProfile: any;
  quizBattleAvatar: string;
}

export const BattleActiveContent: React.FC<BattleActiveContentProps> = React.memo(({
  activeMatch,
  roundSecondsLeft,
  lastRoundResult,
  selectedOptionIndex,
  roundLocked,
  answerSubmitting,
  designPauseActive,
  onOptionSelect,
  floatingMomentum,
  lastRoundMomentumDelta,
  studentProfile,
  quizBattleAvatar,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center gap-4 md:gap-6 w-full min-h-0 overflow-y-auto pt-4 pb-28 z-20 no-scrollbar">
      {/* Question Card */}
      <div className={cn('relative bg-[#1e2536] border shadow-[0_20px_60px_rgba(0,0,0,0.4)] rounded-[1.5rem] p-5 md:p-6 w-full max-w-4xl text-center flex flex-col items-center', roundSecondsLeft <= 3 ? 'border-rose-400/50' : 'border-white/10')}>
        <div className="absolute -top-3.5 bg-[#2f3547] border border-white/10 text-white/80 px-4 py-1 rounded-full text-xs font-black shadow-lg uppercase tracking-wider">
          {activeMatch.currentRound} / {activeMatch.totalRounds}
        </div>

        <AnimatePresence>
          {floatingMomentum && floatingMomentum.tone === 'positive' && (
            <motion.div
              key={floatingMomentum.id}
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className={cn(
                'absolute -top-12 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] backdrop-blur-lg',
                floatingMomentum.tone === 'positive'
                  ? 'border-emerald-300/70 bg-emerald-500/20 text-emerald-100'
                  : floatingMomentum.tone === 'negative'
                    ? 'border-rose-300/70 bg-rose-500/20 text-rose-100'
                    : 'border-slate-300/50 bg-slate-500/20 text-slate-100',
              )}
            >
              {floatingMomentum.label}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-base sm:text-lg md:text-xl text-white font-extrabold leading-tight tracking-tight mt-1 min-h-[40px] flex items-center justify-center">
          {activeMatch.currentQuestion?.prompt}
        </p>
      </div>

      {/* Choices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-4xl px-4">
        {activeMatch.currentQuestion?.choices.map((choice: string, idx: number) => {
          const isSelected = selectedOptionIndex === idx;
          const isSubmitting = answerSubmitting || roundLocked;
          const isRoundOver = !!lastRoundResult && lastRoundResult.roundNumber === activeMatch.currentRound;
          const isCorrectOption = isRoundOver && lastRoundResult.correctOptionIndex === idx;
          
          let opponentPickedIdx = -1;
          if (isRoundOver) {
            if (activeMatch.mode === 'bot') {
              if (lastRoundResult.botCorrect) {
                opponentPickedIdx = lastRoundResult.correctOptionIndex;
              } else {
                const wrongIndices = [0, 1, 2, 3].filter(i => i !== lastRoundResult.correctOptionIndex);
                opponentPickedIdx = wrongIndices[lastRoundResult.roundNumber % wrongIndices.length];
              }
            } else {
              opponentPickedIdx = typeof lastRoundResult.botSelectedIndex === 'number' ? lastRoundResult.botSelectedIndex : -1;
            }
          }
          
          const opponentSelectedThis = opponentPickedIdx === idx;
          let btnColorClass = 'bg-[#1e2433] hover:bg-[#283042] border-[#2f384e] text-white shadow-[0_6px_0_rgba(15,20,30,0.5)]';
          
          if (isRoundOver) {
             if (isCorrectOption) {
                btnColorClass = 'bg-emerald-500 text-emerald-950 border-emerald-400 shadow-[0_6px_0_rgba(5,150,105,1)]';
             } else if (isSelected) {
                btnColorClass = 'bg-rose-500 text-white border-rose-400 shadow-[0_6px_0_rgba(225,29,72,1)]';
             } else {
                btnColorClass = 'bg-[#1e2433] opacity-40 border-[#2f384e] shadow-[0_6px_0_rgba(15,20,30,0.5)] text-white';
             }
          } else if (isSelected) {
             btnColorClass = 'bg-indigo-500 text-white border-indigo-400 shadow-[0_6px_0_rgba(79,70,229,1)]';
          }

          return (
            <motion.button
              whileTap={{ y: 8, scale: 0.98 }}
              whileHover={!isRoundOver && !isSubmitting ? { scale: 1.02 } : {}}
              disabled={isSubmitting || roundLocked || designPauseActive}
              key={idx}
              onClick={() => onOptionSelect(idx)}
              className={cn(
                'relative h-16 md:h-20 rounded-2xl md:rounded-3xl font-black text-base md:text-lg pl-6 pr-20 border-[2px] border-b-[4px] flex items-center justify-start text-left transition-all disabled:cursor-not-allowed',
                btnColorClass,
                isSelected && !isRoundOver ? 'ring-[4px] ring-white/20 ring-offset-[4px] ring-offset-[#0B0F19]' : '',
                roundSecondsLeft <= 3 && !isSubmitting && !isRoundOver ? 'shadow-[0_0_0_2px_rgba(251,113,133,0.45),0_6px_0_rgba(127,29,29,1)]' : ''
              )}
            >
              <span className="mr-3 md:mr-4 text-xs md:text-sm opacity-60 bg-black/20 px-3 py-1 rounded-full">{String.fromCharCode(65 + idx)}</span>
              <span className="line-clamp-2">{choice}</span>

              <div className="absolute right-3 md:right-4 flex items-center gap-1.5 md:gap-2">
                 {opponentSelectedThis && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full border-[3px] border-[#0B0F19] overflow-hidden bg-rose-500 shadow-lg flex items-center justify-center z-10"
                    >
                       {activeMatch.mode === 'bot' ? (
                         <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
                       ) : (
                         <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
                       )}
                    </motion.div>
                 )}
                 {isSelected && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full border-[3px] border-[#0B0F19] overflow-hidden bg-indigo-200 shadow-lg z-20"
                    >
                       <img src={studentProfile?.photo || quizBattleAvatar} alt="You" className="w-full h-full object-cover" />
                    </motion.div>
                 )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Waiting Indicator */}
      <AnimatePresence>
        {roundLocked && !lastRoundResult && activeMatch.mode === 'online' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-2 text-white/70 font-semibold bg-black/30 px-6 py-2 rounded-full border border-white/10">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              Waiting for opponent...
            </div>
            <p className="text-white/30 text-[11px] mt-1">Choices locked until round resolves</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Pop-up Overlay */}
      <AnimatePresence>
        {lastRoundResult?.studentCorrect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none flex flex-col items-center justify-center"
          >
            <div className="bg-[#1e2433]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] flex flex-col items-center min-w-[280px] md:min-w-[320px]">
              <img src={quizBattleAvatar} alt="Mascot" className="w-24 h-24 md:w-32 md:h-32 mb-4 drop-shadow-xl" />
              <h2 className={cn(
                "text-3xl md:text-4xl font-black mb-4 uppercase tracking-widest",
                lastRoundResult.studentCorrect ? "text-emerald-400" : "text-rose-400"
              )}>
                {lastRoundResult.studentCorrect ? "Correct!" : "Incorrect"}
              </h2>
              
              {lastRoundResult.studentCorrect ? (
                 <div className="flex items-center gap-3 w-full justify-center">
                    <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl font-bold border border-emerald-500/30">
                       <span>+ 10 XP</span>
                    </div>
                    {lastRoundMomentumDelta !== null && lastRoundMomentumDelta > 0 && (
                      <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-2xl font-bold border border-amber-500/30">
                        <span>+ {lastRoundMomentumDelta} <Sparkles className="w-4 h-4 inline" /></span>
                      </div>
                    )}
                 </div>
              ) : (
                 <div className="bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold px-5 py-2 rounded-xl text-center">
                    Correct: {String.fromCharCode(65 + lastRoundResult.correctOptionIndex)}
                 </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

BattleActiveContent.displayName = 'BattleActiveContent';
