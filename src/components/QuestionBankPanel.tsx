import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../services/apiService';
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
import { Loader2, Upload, RefreshCw, BookOpen, FileText, Sparkles, Bell } from 'lucide-react';
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
      {/* Standard Header */}
      <div className="w-full px-[24px] xl:px-[32px] pt-[12px] pb-2">
      </div>

      <div className="w-full px-[24px] xl:px-[32px] pb-[32px] space-y-[32px]">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stat Card 1 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(59,130,246,0.2)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4"></div>
            <div className="flex items-start justify-between relative z-10 mb-4">
              <span className="text-[13px] font-medium text-white/90">Total PDFs</span>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                <FileText size={16} className="text-white" />
              </div>
            </div>
            <div className="text-[32px] font-bold relative z-10 leading-none">{pdfs.length}</div>
          </div>

          {/* Stat Card 2 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#a855f7] to-[#9333ea] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(168,85,247,0.2)] hover:shadow-[0_8px_24px_rgba(168,85,247,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4"></div>
            <div className="flex items-start justify-between relative z-10 mb-4">
              <span className="text-[13px] font-medium text-white/90">Total Questions</span>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                <BookOpen size={16} className="text-white" />
              </div>
            </div>
            <div className="text-[32px] font-bold relative z-10 leading-none">{totalQuestions}</div>
          </div>

          {/* Stat Card 3 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-white">
            <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4"></div>
            <div className="flex items-start justify-between relative z-10 mb-4">
              <span className="text-[13px] font-medium text-white/90">Processed</span>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                <RefreshCw size={16} className="text-white" />
              </div>
            </div>
            <div className="text-[32px] font-bold relative z-10 leading-none">{processedCount}</div>
          </div>
        </div>

        {/* Ingest New PDF Card */}
          {/* Ingest New PDF Card */}
        <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-[24px] sm:p-[32px]">
            <h2 className="text-[20px] font-bold text-[#1e293b] mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#a855f7] to-[#9333ea] flex items-center justify-center shadow-md shadow-purple-500/20">
                <Upload className="w-4 h-4 text-white" />
              </div>
              Ingest New PDF
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              {/* Storage Path Input */}
              <div className="md:col-span-6 group">
                <label className="text-[13px] font-bold text-[#1e293b] mb-2 block group-hover:text-[#a855f7] transition-colors">
                  Firebase Storage Path
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-[#94a3b8] group-hover:text-[#a855f7] transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="quiz_pdfs/grade_11/gen_math_q1.pdf"
                    value={storagePath}
                    onChange={(e) => setStoragePath(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-[#cbd5e1] text-[#475569] text-[14px] font-medium rounded-xl pl-11 pr-4 py-3.5 outline-none focus:bg-white focus:border-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/10 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Grade Level Input */}
              <div className="md:col-span-2 group">
                <label className="text-[13px] font-bold text-[#1e293b] mb-2 block group-hover:text-[#a855f7] transition-colors">
                  Grade Level
                </label>
                <input
                  type="number"
                  placeholder="11"
                  min={7}
                  max={12}
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-[#cbd5e1] text-[#475569] text-[14px] font-medium rounded-xl px-4 py-3.5 outline-none focus:bg-white focus:border-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/10 transition-all shadow-inner"
                />
              </div>

              {/* Topic Slug Input */}
              <div className="md:col-span-4 group">
                <label className="text-[13px] font-bold text-[#1e293b] mb-2 block group-hover:text-[#a855f7] transition-colors">
                  Topic Slug
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-[#94a3b8] group-hover:text-[#a855f7] transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="general_mathematics"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-[#cbd5e1] text-[#475569] text-[14px] font-medium rounded-xl pl-11 pr-4 py-3.5 outline-none focus:bg-white focus:border-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/10 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 flex justify-end pt-6 border-t border-slate-100">
              <button
                onClick={handleIngest}
                disabled={ingesting}
                className="bg-gradient-to-r from-[#a855f7] to-[#9333ea] hover:from-[#9333ea] hover:to-[#7e22ce] text-white text-[14px] font-bold rounded-full px-8 py-3 shadow-[0_4px_16px_rgba(168,85,247,0.3)] transition-all hover:scale-[1.02] flex items-center gap-2 hover:shadow-[0_8px_24px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:hover:scale-100"
              >
                {ingesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Ingest PDF
              </button>
            </div>
          </div>
        </div>

        {/* Processing Status Table Section */}
        <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-[24px] sm:p-[32px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[20px] font-bold text-[#1e293b]">Processing Status</h2>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#64748b] hover:text-[#9333ea] hover:border-purple-200 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-white rounded-[16px] border border-[#f1f5f9] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#9956DE] border-b border-[#8b5cf6] shadow-md relative z-10">
                    <th className="h-12 px-6 text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">Filename</th>
                    <th className="h-12 px-6 text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">Grade</th>
                    <th className="h-12 px-6 text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">Topic</th>
                    <th className="h-12 px-6 text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap text-center">Questions</th>
                    <th className="h-12 px-6 text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="h-12 px-6 text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">Processed At</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] bg-white">
                {pdfs.map((pdf) => (
                  <tr key={pdf.filename} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pdf.processed ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-bold text-[#1e293b] group-hover:text-purple-600 transition-colors line-clamp-1">{pdf.filename}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[13px] font-semibold text-[#475569]">{pdf.grade_level}</td>
                    <td className="py-4 px-6">
                      <span className="text-[12px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md line-clamp-1">{pdf.topic}</span>
                    </td>
                    <td className="py-4 px-6 text-[13px] font-bold text-[#1e293b] text-center">{pdf.question_count || '-'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full border shadow-sm ${
                        pdf.processed
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50'
                          : 'bg-amber-50 text-amber-600 border-amber-200/50'
                      }`}>
                        {pdf.processed ? <RefreshCw className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                        {pdf.processed ? 'Completed' : 'Processing...'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[13px] font-medium text-[#64748b]">
                      {pdf.timestamp ? new Date(pdf.timestamp).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
                {pdfs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 px-6 text-center">
                      <div className="flex flex-col items-center justify-center text-[#64748b]">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                          <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-[14px] font-bold text-[#1e293b] mb-1">No PDFs processed yet</p>
                        <p className="text-[13px]">Upload a PDF using the form above to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankPanel;
