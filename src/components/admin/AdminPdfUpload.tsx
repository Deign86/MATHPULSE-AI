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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
    <div className="space-y-5 pt-2 pb-6 max-w-[1200px] mx-auto min-w-0">
      {/* 1. Tab Switcher & Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'upload' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload size={14} />
            Import Modules
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'inventory' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database size={14} />
            File Inventory
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
            className="space-y-4"
          >
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden group">
              {/* Card Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/60 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Learning Module Upload</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Provide official DepEd curriculum PDF context for AI tutoring logic.</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Upload size={18} />
                  </div>
                </div>

                <div className="mt-5">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group/drop
                      ${dragOver ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/40'}
                      ${uploading ? 'cursor-not-allowed opacity-60' : ''}
                      min-h-[160px] flex flex-col items-center justify-center
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
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-sm shrink-0">
                          <FileText size={24} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[320px]">{selectedFile.name}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span className="text-slate-400">PDF Document</span>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-600 mt-1 flex items-center gap-1"
                          >
                            Remove file
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center mx-auto mb-2 text-slate-400">
                          <Upload size={22} />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Drop PDF or click to browse</h4>
                        <p className="text-xs text-slate-400">Standard DepEd learning modules, textbooks, or curriculum guides (max 50MB)</p>
                      </div>
                    )}

                    {uploadProgress > 0 && (
                      <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 z-20">
                        <div className="w-full max-w-xs space-y-3 text-center">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-1 text-white">
                            <Sparkles size={20} />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white">{uploading ? 'Ingesting Curriculum...' : 'Complete!'}</h5>
                            <p className="text-xs text-slate-400 mt-0.5">Platform Vectorization</p>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-indigo-600 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Curriculum Subject</label>
                    <Select value={subjectId} onValueChange={handleSubjectChange} disabled={uploading}>
                      <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-700 border-slate-200/80 dark:border-slate-600 rounded-xl text-xs font-medium">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                        {SHS_MATH_SUBJECTS.map((s) => {
                          // SAFETY: Subject objects from SHS_MATH_SUBJECTS optionally define termStructure and quarters metadata.
                          const subject = s as { termStructure?: string; quarters?: readonly string[] };
                          const quarterText =
                            subject.termStructure === 'year-long'
                              ? 'Year-long'
                              : `Quarters ${([...(subject.quarters ?? [])].join(', ') || 'Q1–Q4')}`;
                          return (
                            <SelectItem key={s.id} value={s.id} className="rounded-lg py-2">
                              <div className="flex flex-col items-start">
                                <span className="font-semibold text-xs">{s.name}</span>
                                <span className="text-[10px] text-slate-400">
                                  {s.gradeLevel} • {quarterText}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Display Label</label>
                    <Input
                      value={subjectName}
                      onChange={e => setSubjectName(e.target.value)}
                      placeholder="e.g. General Mathematics"
                      disabled={uploading}
                      className="h-11 bg-white dark:bg-slate-700 border-slate-200/80 dark:border-slate-600 rounded-xl text-xs font-medium px-3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Quarter</label>
                    <Select value={quarter} onValueChange={setQuarter} disabled={uploading}>
                      <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-700 border-slate-200/80 dark:border-slate-600 rounded-xl text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                        <SelectItem value="1" className="text-xs">First Quarter (Q1)</SelectItem>
                        <SelectItem value="2" className="text-xs">Second Quarter (Q2)</SelectItem>
                        <SelectItem value="3" className="text-xs">Third Quarter (Q3)</SelectItem>
                        <SelectItem value="4" className="text-xs">Fourth Quarter (Q4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !subjectId || !subjectName.trim()}
                  className="w-full h-11 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all text-xs font-semibold min-h-[44px]"
                >
                  {uploading ? (
                    <><Loader2 size={16} className="animate-spin" /> Ingesting Knowledge Source...</>
                  ) : (
                    <><Upload size={16} /> Deploy Knowledge Source</>
                  )}
                </Button>
              </div>
            </div>

            {/* Compact Feature Summary (System Blue/Purple) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Sparkles, color: 'bg-purple-50', iconColor: 'text-purple-600', title: 'Grounding', desc: 'Curriculum-pinned logic.' },
                { icon: Database, color: 'bg-sky-50', iconColor: 'text-sky-600', title: 'Indexing', desc: 'Millisecond RAG retrieval.' },
                { icon: Cpu, color: 'bg-emerald-50', iconColor: 'text-emerald-600', title: 'Extraction', desc: 'Neural chunk parsing.' }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                    <item.icon size={14} className={item.iconColor} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-[#1e293b] uppercase tracking-wide leading-none">{item.title}</h4>
                    <p className="text-[9px] text-slate-400 leading-tight mt-1 font-medium italic">{item.desc}</p>
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
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden relative">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  <TableRow className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-700/60 sticky top-0 z-20">
                    <TableHead className="px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider h-auto">File Name</TableHead>
                    <TableHead className="px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider h-auto">Uploaded By</TableHead>
                    <TableHead className="px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider h-auto">Type</TableHead>
                    <TableHead className="px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider h-auto">Date</TableHead>
                    <TableHead className="px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider h-auto text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" onClick={loadUploadedFiles} disabled={loadingFiles}>
                        <RefreshCw size={13} className={loadingFiles ? 'animate-spin' : ''} />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-50">
                  {loadingFiles ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <Loader2 size={24} className="animate-spin text-purple-500 mx-auto" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Loading files...</p>
                      </TableCell>
                    </TableRow>
                  ) : uploadedFiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <FileText size={24} className="text-slate-200 mx-auto" />
                        <p className="text-[12px] font-black text-slate-400 mt-2">No uploaded files found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    uploadedFiles.map(file => (
                      <TableRow key={file.id} className="group hover:bg-purple-50/10 transition-all">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText size={16} className="text-purple-500" />
                            <span className="font-bold text-[13px] text-slate-800 truncate max-w-[200px]">{file.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[12px] text-slate-600">{file.teacherEmail || '—'}</TableCell>
                        <TableCell className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-600">{file.fileType}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[12px] text-slate-500">{file.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteFile(file.id, file.collection)}>
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