import React, { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, CheckCircle, XCircle, RefreshCw,
  Loader2, AlertTriangle, Trash2, BarChart3, 
  Sparkles, Database, BookOpen, Search, Info,
  ChevronDown, ArrowUpRight, CheckCircle2,
  Cpu, FileSpreadsheet, Layers, Activity, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import {
  Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { apiService } from '../../services/apiService';
import { SHS_MATH_SUBJECTS } from '../../data/subjects';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface UploadedFile {
  id: string;
  fileName: string;
  teacherEmail: string;
  fileType: string;
  className?: string;
  createdAt: Date;
  collection: string;
}

interface RagHealthSubject {
  name: string;
  chunks: number;
  storagePath: string;
  status: 'active' | 'locked' | 'missing';
}

interface AdminPdfUploadProps {
  onUploadSuccess?: (subjectId: string, chunkCount: number) => void;
}

const AdminPdfUpload: React.FC<AdminPdfUploadProps> = ({ onUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'inventory'>('upload');
  const [uploading, setUploading] = useState(false);
  const [reingesting, setReingesting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [quarter, setQuarter] = useState('1');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ragHealth, setRagHealth] = useState<{
    subjects: Record<string, number>;
    chunkCount: number;
    lastIngested: string;
  } | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Load teacher-uploaded files
  const loadUploadedFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const [materialsSnap, recordsSnap] = await Promise.all([
        getDocs(query(collection(db, 'courseMaterials'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'classRecordImports'), orderBy('createdAt', 'desc'))),
      ]);
      const files: UploadedFile[] = [
        ...materialsSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, fileName: data.fileName || 'Untitled', teacherEmail: data.teacherEmail || '', fileType: data.fileType || 'PDF', className: data.className, createdAt: data.createdAt?.toDate?.() || new Date(), collection: 'courseMaterials' };
        }),
        ...recordsSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, fileName: data.fileName || 'Untitled', teacherEmail: data.teacherEmail || '', fileType: data.fileType || 'CSV', className: data.className, createdAt: data.createdAt?.toDate?.() || new Date(), collection: 'classRecordImports' };
        }),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setUploadedFiles(files);
    } catch (err) {
      console.error('Failed to load uploaded files:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const handleDeleteFile = async (fileId: string, collectionName: string) => {
    try {
      // Call backend to delete file + associated data
      await apiService.adminDeleteFile(fileId, collectionName);
      toast.success('File removed');
      loadUploadedFiles();
    } catch {
      // Fallback: try direct Firestore delete
      try {
        await deleteDoc(doc(db, collectionName, fileId));
        toast.success('File removed');
        loadUploadedFiles();
      } catch { toast.error('Failed to delete file'); }
    }
  };

  React.useEffect(() => { loadUploadedFiles(); }, [loadUploadedFiles]);

  // Load RAG health on mount
  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const health = await apiService.getRagHealth();
      setRagHealth({
        subjects: health.subjects || {},
        chunkCount: health.chunkCount || 0,
        lastIngested: health.lastIngested || '',
      });
    } catch {
      toast.error('Failed to load RAG health status');
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  React.useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB');
      return;
    }
    setSelectedFile(file);
    if (subjectId) {
      const subject = SHS_MATH_SUBJECTS.find(s => s.id === subjectId);
      if (subject) setSubjectName(subject.name);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [subjectId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleSubjectChange = (id: string) => {
    setSubjectId(id);
    const subject = SHS_MATH_SUBJECTS.find(s => s.id === id);
    if (subject) setSubjectName(subject.name);
  };

  const handleUpload = async () => {
    if (!selectedFile || !subjectId || !subjectName.trim()) {
      toast.error('Please select a PDF file, subject, and enter a subject name');
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('subjectId', subjectId);
      formData.append('subjectName', subjectName.trim());
      formData.append('quarter', quarter);

      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 15, 85));
      }, 300);

      const result = await apiService.uploadModulePdf(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        toast.success(`${selectedFile.name} uploaded! ${result.chunkCount ?? 0} chunks indexed.`);
        setSelectedFile(null);
        if (result.chunkCount !== undefined) {
          onUploadSuccess?.(subjectId, result.chunkCount);
        }
        loadHealth();
        setTimeout(() => setActiveTab('inventory'), 1000);
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleReingest = async (subjectIdToReingest: string, storagePath?: string) => {
    setReingesting(subjectIdToReingest);
    try {
      const result = await apiService.reingestModulePdf(subjectIdToReingest, storagePath);
      if (result.success) {
        toast.success(`Re-ingestion complete for ${subjectIdToReingest}: ${result.chunkCount ?? 0} chunks`);
        loadHealth();
      } else {
        toast.error(result.error || 'Re-ingestion failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Re-ingestion failed');
    } finally {
      setReingesting(null);
    }
  };

  const statusRows: RagHealthSubject[] = ragHealth
    ? Object.entries(ragHealth.subjects).map(([name, chunks]) => ({
        name,
        chunks,
        storagePath: '',
        status: chunks > 0 ? 'active' as const : 'missing' as const,
      }))
      .filter(r => r.chunks > 0)
    : [];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-6 animate-in fade-in duration-300">
      {/* ── Top Stats Bento Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 px-1">
        {[
          {
            label: 'Total Files in Inventory',
            value: uploadedFiles.length,
            subtext: 'Uploaded course materials & records',
            badge: 'Inventory',
            icon: Database,
            gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.52)]',
          },
          {
            label: 'Indexed AI Sections',
            value: (ragHealth?.chunkCount ?? 0).toLocaleString(),
            subtext: 'Vectors available for AI tutoring',
            badge: 'AI Ready',
            icon: Cpu,
            gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(2,132,199,0.52)]',
          },
          {
            label: 'Active Subjects',
            value: Object.keys(ragHealth?.subjects || {}).length,
            subtext: 'Subjects with knowledge ingested',
            badge: 'Curriculum',
            icon: BookOpen,
            gradient: 'bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.52)]',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`group relative ${stat.gradient} ${stat.shadow} border border-white/25 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 ease-out overflow-hidden min-h-[58px] sm:min-h-[120px] ${
              idx === 0 ? 'col-span-2 sm:col-span-1' : 'col-span-1'
            }`}
          >
            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between relative z-10 mb-1.5 sm:mb-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <stat.icon size={14} className="sm:hidden" />
                <stat.icon size={18} className="hidden sm:block" />
              </div>
              <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/25">
                {stat.badge}
              </span>
            </div>
            <div className="relative z-10 min-w-0">
              <h3 className="text-lg sm:text-3xl font-black font-display text-white leading-none tracking-tight tabular-nums drop-shadow-sm">{stat.value}</h3>
              <p className="text-[10px] sm:text-xs font-bold text-white/95 mt-1 sm:mt-1.5 truncate">{stat.label}</p>
              <p className="text-[10px] text-white/70 mt-0.5 truncate font-medium hidden sm:block">{stat.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Switcher Bar ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
              activeTab === 'upload' 
                ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-sm shadow-purple-500/20' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <Upload size={14} />
            Import Modules
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
              activeTab === 'inventory' 
                ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-sm shadow-purple-500/20' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <Database size={14} />
            File Inventory
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
              activeTab === 'inventory' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {uploadedFiles.length}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'upload' ? (
          <motion.div
            key="upload-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Main Upload Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden relative">
              {/* Brand accent strip */}
              <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />

              {/* Card Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#9956DE]" />
                      Learning Module Upload
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ingest official DepEd Senior High School curriculum PDF materials into the AI tutoring knowledge base.
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 rounded-2xl flex items-center justify-center text-[#9956DE] dark:text-purple-300 shrink-0 shadow-xs self-start sm:self-auto">
                    <Upload size={18} />
                  </div>
                </div>

                {/* Dropzone Area */}
                <div className="mt-5">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 group/drop
                      ${dragOver ? 'border-[#9956DE] bg-purple-50/50 dark:bg-purple-950/30' : 'border-slate-200/90 dark:border-slate-700 hover:border-purple-400 bg-white dark:bg-slate-800/70 hover:bg-purple-50/20 dark:hover:bg-purple-950/15'}
                      ${uploading ? 'cursor-not-allowed opacity-60' : ''}
                      min-h-[170px] flex flex-col items-center justify-center shadow-xs
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                    
                    {selectedFile ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full max-w-lg p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200/70 dark:border-purple-800/60">
                        <div className="w-13 h-13 bg-gradient-to-br from-[#9956DE] to-[#7274ED] rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
                          <FileText size={24} />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{selectedFile.name}</p>
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs">
                            <span className="text-[#9956DE] dark:text-purple-300 font-bold tabular-nums">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">PDF Document</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors border border-rose-200/60 dark:border-rose-900/60 cursor-pointer active:scale-95"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-13 h-13 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center mx-auto text-[#9956DE] dark:text-purple-300 group-hover/drop:scale-110 transition-transform shadow-xs">
                          <Upload size={22} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Drop PDF here or click to browse</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                          Official DepEd Senior High School modules, textbooks, or learning activity sheets (up to 50MB)
                        </p>
                      </div>
                    )}

                    {uploadProgress > 0 && (
                      <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20">
                        <div className="w-full max-w-xs space-y-3 text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#9956DE] to-[#7274ED] rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-purple-500/30">
                            <Sparkles size={22} />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white">{uploading ? 'Ingesting Curriculum...' : 'Ingestion Complete!'}</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Semantic AI chunk vectorization in progress</p>
                          </div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#9956DE] to-[#7274ED] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-[11px] font-bold text-[#9956DE] dark:text-purple-300 tabular-nums">{uploadProgress}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="p-5 sm:p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* Subject Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Curriculum Subject</label>
                    <Select value={subjectId} onValueChange={handleSubjectChange} disabled={uploading}>
                      <SelectTrigger className="w-full h-[54px] bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-purple-300 dark:hover:border-purple-600 focus:ring-1 focus:ring-purple-400 transition-all px-3.5 py-2">
                        <SelectValue placeholder="Select curriculum subject" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[280px]">
                        {SHS_MATH_SUBJECTS.map((s) => {
                          // SAFETY: Subject objects from SHS_MATH_SUBJECTS optionally define termStructure and quarters metadata.
                          const subject = s as { termStructure?: string; quarters?: readonly string[] };
                          const quarterText =
                            subject.termStructure === 'year-long'
                              ? 'Year-long'
                              : `Quarters ${([...(subject.quarters ?? [])].join(', ') || 'Q1–Q4')}`;
                          return (
                            <SelectItem
                              key={s.id}
                              value={s.id}
                              className="rounded-xl py-2 px-3 my-0.5 cursor-pointer"
                            >
                              <div className="flex flex-col items-start gap-0.5 min-w-0 pr-4 w-full">
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 group-data-[highlighted]:group-data-[state=unchecked]:text-purple-950 dark:group-data-[highlighted]:group-data-[state=unchecked]:text-purple-100 group-data-[state=checked]:text-white transition-colors truncate">
                                  {s.name}
                                </span>
                                <span className="text-[10px] font-semibold transition-colors text-slate-500 dark:text-slate-400 group-data-[highlighted]:group-data-[state=unchecked]:text-purple-800 dark:group-data-[highlighted]:group-data-[state=unchecked]:text-purple-200 group-data-[state=checked]:text-purple-100 truncate">
                                  {s.gradeLevel} • {quarterText}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Display Label */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Display Title</label>
                    <Input
                      value={subjectName}
                      onChange={e => setSubjectName(e.target.value)}
                      placeholder="e.g. General Mathematics"
                      disabled={uploading}
                      className="h-[54px] bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 px-3.5 focus-visible:ring-1 focus-visible:ring-purple-400 focus-visible:border-purple-400 transition-all"
                    />
                  </div>

                  {/* Quarter Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Quarter</label>
                    <Select value={quarter} onValueChange={setQuarter} disabled={uploading}>
                      <SelectTrigger className="w-full h-[54px] bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-purple-300 dark:hover:border-purple-600 focus:ring-1 focus:ring-purple-400 transition-all px-3.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                        <SelectItem value="1" className="text-xs font-bold py-2.5">First Quarter (Q1)</SelectItem>
                        <SelectItem value="2" className="text-xs font-bold py-2.5">Second Quarter (Q2)</SelectItem>
                        <SelectItem value="3" className="text-xs font-bold py-2.5">Third Quarter (Q3)</SelectItem>
                        <SelectItem value="4" className="text-xs font-bold py-2.5">Fourth Quarter (Q4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !subjectId || !subjectName.trim()}
                  className="w-full h-11 gap-2 bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white rounded-xl shadow-md shadow-purple-500/20 active:scale-95 transition-all text-xs font-bold min-h-[44px] cursor-pointer border border-purple-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <><Loader2 size={16} className="animate-spin text-white" /> Ingesting Knowledge Source...</>
                  ) : (
                    <><Upload size={16} /> Deploy Knowledge Source</>
                  )}
                </Button>
              </div>
            </div>

            {/* ── Visual Architecture Tiles (Refined 3 Info Cards) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {[
                {
                  icon: BookOpen,
                  title: 'Curriculum Alignment',
                  desc: 'Mapped to DepEd SHS STEM learning competencies and official modules.',
                  accentBg: 'bg-purple-50 dark:bg-purple-950/40',
                  accentBorder: 'border-purple-100 dark:border-purple-900/50',
                  iconColor: 'text-[#9956DE] dark:text-purple-300',
                },
                {
                  icon: Database,
                  title: 'Intelligent Retrieval',
                  desc: 'Sub-second semantic search powers step-by-step AI math tutoring.',
                  accentBg: 'bg-sky-50 dark:bg-sky-950/40',
                  accentBorder: 'border-sky-100 dark:border-sky-900/50',
                  iconColor: 'text-sky-600 dark:text-sky-400',
                },
                {
                  icon: Cpu,
                  title: 'Neural Ingestion',
                  desc: 'Automated formula parsing and structured knowledge chunk extraction.',
                  accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
                  accentBorder: 'border-emerald-100 dark:border-emerald-900/50',
                  iconColor: 'text-emerald-600 dark:text-emerald-400',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 flex items-start gap-3.5 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.accentBg} border ${item.accentBorder} flex items-center justify-center shrink-0 ${item.iconColor} group-hover:scale-105 transition-transform shadow-xs`}>
                    <item.icon size={18} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="inventory-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden relative">
              {/* Brand accent strip */}
              <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />

              <Table className="w-full text-left border-collapse min-w-[680px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-700/60 sticky top-0 z-20">
                    <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider h-auto">File Name</TableHead>
                    <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider h-auto">Uploaded By</TableHead>
                    <TableHead className="px-5 py-4 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider h-auto">Type</TableHead>
                    <TableHead className="px-5 py-4 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider h-auto">Date</TableHead>
                    <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider h-auto text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#9956DE] rounded-xl transition-all"
                        onClick={loadUploadedFiles}
                        disabled={loadingFiles}
                        title="Refresh file inventory"
                      >
                        <RefreshCw size={14} className={loadingFiles ? 'animate-spin' : ''} />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingFiles ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <TableRow key={idx} className="animate-pulse">
                        <TableCell colSpan={5} className="px-5 py-4">
                          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-lg" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : uploadedFiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center text-[#9956DE] dark:text-purple-300 mx-auto mb-3 shadow-xs">
                          <FileText size={28} />
                        </div>
                        <p className="font-bold text-base text-slate-900 dark:text-white">No uploaded files found</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Uploaded course materials and class records will appear here.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    uploadedFiles.map(file => (
                      <TableRow
                        key={file.id}
                        className="group hover:bg-purple-50/20 dark:hover:bg-purple-950/10 border-l-2 border-l-transparent hover:border-l-[#9956DE] transition-all"
                      >
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <FileText size={16} className="text-[#9956DE] shrink-0" />
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[280px] group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors">
                              {file.fileName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">{file.teacherEmail || '—'}</TableCell>
                        <TableCell className="px-5 py-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                            {file.fileType}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{file.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                            onClick={() => handleDeleteFile(file.id, file.collection)}
                            title={`Delete ${file.fileName}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPdfUpload;