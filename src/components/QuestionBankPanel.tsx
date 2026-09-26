import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../services/apiService';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, Upload, RefreshCw, BookOpen, FileText, Sparkles, Bell, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface PdfStatus {
  filename: string;
  processed: boolean;
  timestamp: string;
  question_count: number;
  grade_level: number;
  topic: string;
  storage_path: string;
}

interface QuestionBankPanelProps {
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenInsightModal?: () => void;
  userPhoto?: string;
  teacherName?: string;
}

export const QuestionBankPanel: React.FC<QuestionBankPanelProps> = ({
  onOpenNotifications,
  onOpenProfile,
  onOpenInsightModal,
  userPhoto,
  teacherName,
}) => {
  const [pdfs, setPdfs] = useState<PdfStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [storagePath, setStoragePath] = useState('');
  const [gradeLevel, setGradeLevel] = useState(11);
  const [topic, setTopic] = useState('general_mathematics');

  // Browse questions state
  interface QuestionItem {
    id: string;
    question: string;
    choices: string[];
    correct_answer: string;
    explanation: string;
    topic: string;
    difficulty: string;
    grade_level: number;
  }
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      // Backend stores questions at: question_bank/{grade_level}/{topic}/questions/questions/{docId}
      const q = query(
        collection(db, 'question_bank', String(gradeLevel), topic, 'questions', 'questions'),
        limit(50)
      );
      const snap = await getDocs(q);
      let items: QuestionItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          question: data.question || '',
          choices: data.choices || [],
          correct_answer: data.correct_answer || '',
          explanation: data.explanation || '',
          topic: data.topic || '',
          difficulty: data.difficulty || 'medium',
          grade_level: data.grade_level || 11,
        };
      });
      // Fallback: also check legacy quizBattleQuestionBank collection
      if (items.length === 0) {
        const legacyQ = query(collection(db, 'quizBattleQuestionBank'), limit(50));
        const legacySnap = await getDocs(legacyQ);
        items = legacySnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            question: data.question || '',
            choices: data.choices || [],
            correct_answer: data.correct_answer || '',
            explanation: data.explanation || '',
            topic: data.topic || '',
            difficulty: data.difficulty || 'medium',
            grade_level: data.grade_level || 11,
          };
        });
      }
      setQuestions(items);
    } catch (err) {
      console.warn('[QuestionBankPanel] Failed to load questions:', err);
    } finally {
      setQuestionsLoading(false);
    }
  }, [gradeLevel, topic]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ pdfs: PdfStatus[] }>('/api/quiz-battle/bank-status');
      setPdfs(data.pdfs);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load bank status';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleIngest = async () => {
    if (!storagePath.trim()) {
      toast.error('Please enter a storage path');
      return;
    }
    setIngesting(true);
    try {
      await apiFetch('/api/quiz-battle/ingest-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: storagePath.trim(),
          grade_level: gradeLevel,
          topic: topic.trim(),
          force_reingest: false,
        }),
      });
      toast.success('PDF ingestion completed');
      await fetchStatus();
      setStoragePath('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Ingestion failed';
      toast.error(message);
    } finally {
      setIngesting(false);
    }
  };

  const totalQuestions = pdfs.reduce((sum, p) => sum + p.question_count, 0);
  const processedCount = pdfs.filter((p) => p.processed).length;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]">
      <div className="w-full px-3.5 sm:px-6 xl:px-8 pt-3 sm:pt-4 pb-28 sm:pb-32 lg:pb-12 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Top Stats Cards - Sleek 3-column metric layout */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
          {/* Stat Card 1 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-5 shadow-[0_2px_8px_rgba(59,130,246,0.18)] sm:shadow-[0_4px_12px_rgba(59,130,246,0.2)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.28)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-6 -bottom-6 sm:-right-12 sm:-bottom-12 w-20 h-20 sm:w-36 sm:h-36 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.6]"></div>
            <div className="flex items-center justify-between relative z-10 mb-1 sm:mb-2 md:mb-3 gap-1">
              <span className="font-body text-[10px] sm:text-xs md:text-[13px] font-semibold text-white/90 truncate leading-tight">Total PDFs</span>
              <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10 shrink-0">
                <FileText className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
              </div>
            </div>
            <div className="font-display text-base sm:text-2xl md:text-[30px] font-extrabold sm:font-black relative z-10 leading-none tabular-nums">{pdfs.length}</div>
          </div>

          {/* Stat Card 2 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#a855f7] to-[#9333ea] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-5 shadow-[0_2px_8px_rgba(168,85,247,0.18)] sm:shadow-[0_4px_12px_rgba(168,85,247,0.2)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.28)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-6 -bottom-6 sm:-right-12 sm:-bottom-12 w-20 h-20 sm:w-36 sm:h-36 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.6]"></div>
            <div className="flex items-center justify-between relative z-10 mb-1 sm:mb-2 md:mb-3 gap-1">
              <span className="font-body text-[10px] sm:text-xs md:text-[13px] font-semibold text-white/90 truncate leading-tight">
                <span className="inline sm:hidden">Questions</span>
                <span className="hidden sm:inline">Total Questions</span>
              </span>
              <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10 shrink-0">
                <BookOpen className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
              </div>
            </div>
            <div className="font-display text-base sm:text-2xl md:text-[30px] font-extrabold sm:font-black relative z-10 leading-none tabular-nums">{totalQuestions}</div>
          </div>

          {/* Stat Card 3 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-5 shadow-[0_2px_8px_rgba(168,85,247,0.18)] sm:shadow-[0_4px_12px_rgba(168,85,247,0.2)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.28)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-6 -bottom-6 sm:-right-12 sm:-bottom-12 w-20 h-20 sm:w-36 sm:h-36 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.6]"></div>
            <div className="flex items-center justify-between relative z-10 mb-1 sm:mb-2 md:mb-3 gap-1">
              <span className="font-body text-[10px] sm:text-xs md:text-[13px] font-semibold text-white/90 truncate leading-tight">Processed</span>
              <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10 shrink-0">
                <RefreshCw className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
              </div>
            </div>
            <div className="font-display text-base sm:text-2xl md:text-[30px] font-extrabold sm:font-black relative z-10 leading-none tabular-nums">{processedCount}</div>
          </div>
        </div>

        {/* Ingest New PDF Card */}
        <div className="bg-white/80 backdrop-blur-[12px] rounded-2xl sm:rounded-[24px] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-4 sm:p-6 md:p-8">
            <h2 className="font-display text-base sm:text-lg md:text-[20px] font-bold text-[#1e293b] mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[10px] bg-gradient-to-br from-[#a855f7] to-[#9333ea] flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              Ingest New PDF
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 items-end">
              {/* Storage Path Input */}
              <div className="md:col-span-6 group">
                <label className="font-body text-xs sm:text-[13px] font-bold text-[#1e293b] mb-1.5 sm:mb-2 block group-hover:text-[#a855f7] transition-colors">
                  Firebase Storage Path
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#94a3b8] group-hover:text-[#a855f7] transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="quiz_pdfs/grade_11/gen_math_q1.pdf"
                    value={storagePath}
                    onChange={(e) => setStoragePath(e.target.value)}
                    className="font-body w-full bg-slate-50 border border-slate-200 hover:border-[#cbd5e1] text-[#475569] text-xs sm:text-[14px] font-medium rounded-xl pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3.5 outline-none focus:bg-white focus:border-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/10 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Grade Level Input */}
              <div className="md:col-span-2 group">
                <label className="font-body text-xs sm:text-[13px] font-bold text-[#1e293b] mb-1.5 sm:mb-2 block group-hover:text-[#a855f7] transition-colors">
                  Grade Level
                </label>
                <input
                  type="number"
                  placeholder="11"
                  min={7}
                  max={12}
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(Number(e.target.value))}
                  className="font-body w-full bg-slate-50 border border-slate-200 hover:border-[#cbd5e1] text-[#475569] text-xs sm:text-[14px] font-medium rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 outline-none focus:bg-white focus:border-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/10 transition-all shadow-inner"
                />
              </div>

              {/* Topic Slug Input */}
              <div className="md:col-span-4 group">
                <label className="font-body text-xs sm:text-[13px] font-bold text-[#1e293b] mb-1.5 sm:mb-2 block group-hover:text-[#a855f7] transition-colors">
                  Topic Slug
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                    <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#94a3b8] group-hover:text-[#a855f7] transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="general_mathematics"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="font-body w-full bg-slate-50 border border-slate-200 hover:border-[#cbd5e1] text-[#475569] text-xs sm:text-[14px] font-medium rounded-xl pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3.5 outline-none focus:bg-white focus:border-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/10 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-4 sm:mt-6 flex justify-end pt-3 sm:pt-6 border-t border-slate-100">
              <button
                onClick={handleIngest}
                disabled={ingesting}
                className="font-body bg-gradient-to-r from-[#a855f7] to-[#9333ea] hover:from-[#9333ea] hover:to-[#7e22ce] text-white text-xs sm:text-[13px] font-bold uppercase tracking-wider rounded-full px-5 sm:px-8 py-2.5 sm:py-3 shadow-[0_4px_16px_rgba(168,85,247,0.3)] transition-all hover:scale-[1.02] flex items-center gap-2 hover:shadow-[0_8px_24px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:hover:scale-100"
              >
                {ingesting ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                Ingest PDF
              </button>
            </div>
          </div>
        </div>

        {/* Processing Status Table Section */}
        <div className="bg-white/80 backdrop-blur-[12px] rounded-xl sm:rounded-2xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-3.5 sm:p-5">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="font-display text-sm sm:text-base font-bold text-[#1e293b]">Processing Status</h2>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#64748b] hover:text-[#9333ea] hover:border-purple-200 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#f1f5f9] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#a855f7] to-[#9333ea] text-white">
                    <th className="h-8 sm:h-9 px-3.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Filename</th>
                    <th className="h-8 sm:h-9 px-3.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Grade</th>
                    <th className="h-8 sm:h-9 px-3.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Topic</th>
                    <th className="h-8 sm:h-9 px-3.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap text-center">Questions</th>
                    <th className="h-8 sm:h-9 px-3.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                    <th className="h-8 sm:h-9 px-3.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap text-center">Processed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] bg-white">
                  {pdfs.map((pdf) => (
                    <tr key={pdf.filename} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${pdf.processed ? 'bg-purple-50 text-[#a855f7]' : 'bg-amber-50 text-amber-500'}`}>
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs sm:text-[13px] font-bold text-[#1e293b] group-hover:text-[#a855f7] transition-colors line-clamp-1">{pdf.filename}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-xs sm:text-[13px] font-semibold text-[#475569]">{pdf.grade_level}</td>
                      <td className="py-2.5 px-3.5">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md line-clamp-1">{pdf.topic}</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-xs sm:text-[13px] font-bold text-[#1e293b] text-center">{pdf.question_count || '-'}</td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full border shadow-sm ${
                          pdf.processed
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50'
                            : 'bg-amber-50 text-amber-600 border-amber-200/50'
                        }`}>
                          {pdf.processed ? <RefreshCw className="w-2.5 h-2.5" /> : <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                          {pdf.processed ? 'Completed' : 'Processing...'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-xs sm:text-[13px] font-medium text-[#64748b] text-center">
                        {pdf.timestamp ? new Date(pdf.timestamp).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {pdfs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 sm:py-5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center text-[#64748b]">
                          <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center mb-1.5 border border-slate-200/60">
                            <FileText className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-xs sm:text-[13px] font-bold text-[#1e293b]">No PDFs processed yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Upload a PDF using the form above to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Browse Questions Section */}
        <div className="bg-white/80 backdrop-blur-[12px] rounded-xl sm:rounded-2xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-3.5 sm:p-5">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-base font-bold text-[#1e293b] flex items-center gap-2 sm:gap-2.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-sm shrink-0">
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
              Question Bank ({questions.length})
            </h2>
            <button
              onClick={fetchQuestions}
              disabled={questionsLoading}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#64748b] hover:text-[#9333ea] hover:border-purple-200 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${questionsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {questionsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#a855f7]" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-4 sm:py-5 text-[#64748b]">
              <BookOpen className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs sm:text-[13px] font-bold text-[#1e293b]">No questions in the bank yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ingest a PDF above to populate the question bank.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="border border-[#f1f5f9] rounded-xl p-4 hover:border-purple-200 transition-colors bg-white"
                >
                  <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1e293b] line-clamp-2">{q.question}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold">Grade {q.grade_level}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">{q.topic}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                          q.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
                          q.difficulty === 'hard' ? 'bg-rose-50 text-rose-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>{q.difficulty}</span>
                      </div>
                    </div>
                    {expandedQuestion === q.id ? <ChevronUp size={16} className="text-[#94a3b8] shrink-0" /> : <ChevronDown size={16} className="text-[#94a3b8] shrink-0" />}
                  </div>
                  {expandedQuestion === q.id && (
                    <div className="mt-3 pt-3 border-t border-[#f1f5f9] space-y-2">
                      <div className="space-y-1">
                        {q.choices.map((c, i) => (
                          <p key={i} className={`text-[12px] px-3 py-1.5 rounded-lg ${c === q.correct_answer ? 'bg-green-50 text-green-700 font-semibold border border-green-200' : 'bg-slate-50 text-[#475569]'}`}>
                            {String.fromCharCode(65 + i)}. {c}
                          </p>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-[12px] text-[#64748b] italic mt-2 flex items-center gap-1"><Lightbulb size={12} /> {q.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionBankPanel;
