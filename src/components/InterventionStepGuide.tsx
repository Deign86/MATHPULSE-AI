// src/components/InterventionStepGuide.tsx
// Modal panel for working through a learning step with AI guidance

import React, { useState } from 'react';
import { X, CheckCircle, Clock, Video, PenTool, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { assignStepAsModule } from '../services/interventionService';
import type { LearningStep } from '../services/interventionService';
import { InterventionVideoStep } from './intervention/InterventionVideoStep';
import { toast } from 'sonner';

interface Props {
  step: LearningStep;
  studentId: string;
  studentName: string;
  teacherId: string;
  totalSteps: number;
  onClose: () => void;
  onStepCompleted: (stepNumber: number) => void;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  video_lesson: <Video className="w-5 h-5" />,
  practice: <PenTool className="w-5 h-5" />,
  assessment: <CheckCircle className="w-5 h-5" />,
  chat_session: <MessageCircle className="w-5 h-5" />,
  review: <RefreshCw className="w-5 h-5" />,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
};

export const InterventionStepGuide: React.FC<Props> = ({
  step,
  studentId,
  studentName,
  teacherId,
  totalSteps,
  onClose,
  onStepCompleted,
}) => {
  const [completing, setCompleting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: `Hi ${studentName}! Let's work on "${step.title}". ${step.description || `This covers ${step.topic}.`} Ready to start?` },
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleAssign = async () => {
    setCompleting(true);
    try {
      await assignStepAsModule(step, studentId, teacherId);
      onStepCompleted(step.step_number);
      toast.success(`Step ${step.step_number} assigned to student!`);
      onClose();
    } catch (err) {
      toast.error('Failed to assign step.');
    } finally {
      setCompleting(false);
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    // Simulate AI response (in production, this would call /api/intervention/guidance)
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Great question about ${step.topic}! Let me help you understand this step by step. What part are you finding most challenging?`,
      }]);
    }, 1000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.18)] w-full max-w-[800px] max-h-[85vh] flex flex-col overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                {STEP_ICONS[step.type] || <PenTool className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[#1e293b]">{step.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-[#64748b]">Step {step.step_number} of {totalSteps}</span>
                  {step.competency_tag && (
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-mono rounded">{step.competency_tag}</span>
                  )}
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${DIFFICULTY_COLORS[step.difficulty] || DIFFICULTY_COLORS.easy}`}>
                    {step.difficulty}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Step content */}
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-[14px] p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-[12px] font-semibold text-slate-600">{step.duration_minutes} minutes</span>
                  {step.num_items && <span className="text-[12px] text-slate-500">• {step.num_items} items</span>}
                </div>
                <p className="text-[13px] text-[#475569] leading-relaxed">{step.description || `Work through ${step.topic} at ${step.difficulty} difficulty.`}</p>
              </div>

              {step.type === 'video_lesson' && (
                <InterventionVideoStep step={step} isActive={true} />
              )}

              {(step.type === 'practice' || step.type === 'assessment') && (
                <div className="bg-purple-50/50 rounded-[14px] p-6 border border-purple-100 flex flex-col items-center justify-center min-h-[160px]">
                  <PenTool className="w-10 h-10 text-purple-400 mb-3" />
                  <p className="text-[13px] font-semibold text-purple-700">{step.type === 'assessment' ? 'Assessment' : 'Practice'} Questions</p>
                  <p className="text-[11px] text-purple-500 mt-1">{step.num_items || 10} questions on {step.topic}</p>
                </div>
              )}
            </div>

            {/* Right: AI Guidance Chat */}
            <div className="flex flex-col bg-slate-50 rounded-[14px] border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-white">
                <p className="text-[12px] font-semibold text-[#1e293b] flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-indigo-500" /> AI Guide
                  <span className="text-[9px] font-medium text-slate-400 ml-1">(Preview)</span>
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[300px]">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-[12px] text-[12px] leading-relaxed ${
                      msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-[#475569]'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Ask for help..."
                  className="flex-1 text-[12px] px-3 py-2 rounded-[10px] border border-slate-200 focus:outline-none focus:border-indigo-300"
                />
                <button onClick={handleSendChat} className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white transition-colors">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden" style={{ width: 120 }}>
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(step.step_number / totalSteps) * 100}%` }} />
              </div>
              <span className="text-[11px] text-slate-500">{step.step_number}/{totalSteps}</span>
            </div>
            <button
              onClick={handleAssign}
              disabled={completing || step.is_completed}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-semibold rounded-full transition-colors disabled:opacity-50 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              {step.is_completed ? 'Assigned ✓' : completing ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InterventionStepGuide;
