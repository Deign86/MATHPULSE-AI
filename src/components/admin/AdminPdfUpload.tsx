import React, { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, CheckCircle, XCircle, RefreshCw,
  Loader2, AlertTriangle, Trash2, BarChart3, 
  Sparkles, Database, BookOpen, Search, Info,
  ChevronDown, ArrowUpRight, CheckCircle2,
  Cpu, FileSpreadsheet, Layers, Activity, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="space-y-4 pt-2 xl:pt-4 pb-4 max-w-[1200px] mx-auto">
      {/* 1. Tab Switcher & Stats Bar (Compact & System Colors) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-black transition-all duration-300 ${
              activeTab === 'upload' 
                ? 'bg-[#9956DE] text-white shadow-lg shadow-purple-200' 
                : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-black transition-all duration-300 ${
              activeTab === 'inventory' 
                ? 'bg-[#9956DE] text-white shadow-lg shadow-purple-200' 
                : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Database size={14} />
            Inventory
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Chunks</span>
              <span className="text-[12px] font-black text-purple-600 leading-none mt-1">{loadingHealth ? '...' : (ragHealth?.chunkCount ?? 0).toLocaleString()}</span>
            </div>
            <div className="w-px h-5 bg-slate-100" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Health</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[12px] font-black text-purple-600 leading-none">{statusRows.length}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${statusRows.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              </div>
            </div>
          </div>
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
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden group">
              {/* Card Header (Pulse Purple Theme) */}
              <div className="p-6 border-b border-slate-50 bg-gradient-to-br from-white to-purple-50/20 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-[#1e293b] tracking-tight">Learning Module Upload</h3>
                    <p className="text-[11px] text-slate-500 font-medium italic">Provide curriculum context for AI tutoring logic.</p>
                  </div>
                  <div className="w-10 h-10 bg-[#9956DE] rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110">
                    <Upload size={20} />
                  </div>
                </div>

                <div className="mt-6">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 group/drop
                      ${dragOver ? 'border-[#9956DE] bg-purple-50 scale-[0.99]' : 'border-slate-200 hover:border-[#9956DE] bg-white hover:bg-purple-50/30'}
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
                        <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm shrink-0">
                          <FileText size={28} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-black text-[14px] text-[#1e293b] truncate max-w-[300px]">{selectedFile.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-purple-500 font-black uppercase">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">PDF Source</span>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                            className="text-[10px] font-black text-rose-500 hover:text-rose-600 mt-1 flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mb-4 group-hover/drop:text-purple-500 group-hover/drop:bg-purple-50 transition-all">
                          <Upload size={24} />
                        </div>
                        <h4 className="text-[14px] font-black text-[#1e293b]">Drop PDF or click to browse</h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Max 50MB (SLM, Textbook, Guide)</p>
                      </div>
                    )}

                    {uploadProgress > 0 && (
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center p-8 z-20">
                        <div className="w-full max-w-xs space-y-3 text-center">
                          <div className="w-12 h-12 bg-[#9956DE] rounded-xl flex items-center justify-center mx-auto mb-2 animate-bounce">
                            <Sparkles size={24} className="text-white" />
                          </div>
                          <div className="space-y-0.5">
                            <h5 className="text-sm font-black text-[#1e293b]">{uploading ? 'Analyzing Curriculum...' : 'Complete!'}</h5>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Platform Ingestion</p>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 mt-2">
                            <motion.div
                              className="h-full bg-gradient-to-r from-purple-500 to-sky-500 rounded-full"
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

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Curriculum Subject</label>
                    <Select value={subjectId} onValueChange={handleSubjectChange} disabled={uploading}>
                      <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200 rounded-xl text-[12px] font-bold focus:ring-purple-500/20">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {SHS_MATH_SUBJECTS.map(s => (
                          <SelectItem key={s.id} value={s.id} className="rounded-lg py-2">
                            <div className="flex flex-col items-start">
                              <span className="font-black text-[12px]">{s.name}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{s.gradeLevel} • {s.semester}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Label</label>
                    <Input
                      value={subjectName}
                      onChange={e => setSubjectName(e.target.value)}
                      placeholder="e.g. General Mathematics"
                      disabled={uploading}
                      className="h-10 bg-slate-50/50 border-slate-200 rounded-xl text-[12px] font-bold px-4 focus-visible:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quarter</label>
                    <Select value={quarter} onValueChange={setQuarter} disabled={uploading}>
                      <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200 rounded-xl text-[12px] font-bold focus:ring-purple-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="1" className="rounded-lg text-[12px] font-bold">First Quarter</SelectItem>
                        <SelectItem value="2" className="rounded-lg text-[12px] font-bold">Second Quarter</SelectItem>
                        <SelectItem value="3" className="rounded-lg text-[12px] font-bold">Third Quarter</SelectItem>
                        <SelectItem value="4" className="rounded-lg text-[12px] font-bold">Fourth Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !subjectId || !subjectName.trim()}
                  className="w-full h-12 gap-2 bg-[#9956DE] hover:bg-[#8b5cf6] text-white rounded-2xl shadow-lg shadow-purple-100 transition-all hover:scale-[1.01] active:scale-95 text-[14px] font-black"
                >
                  {uploading ? (
                    <><Loader2 size={16} className="animate-spin" /> Ingesting...</>
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
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden relative">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  <TableRow className="bg-[#9956DE] hover:bg-[#9956DE] border-b border-[#8b5cf6] sticky top-0 z-20 shadow-sm">
                    <TableHead className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest h-auto">Identity</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest h-auto">Density</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest h-auto text-center">Status</TableHead>
                    <th className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="relative group">
                          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-white transition-colors" />
                          <Input 
                            placeholder="Filter..." 
                            className="pl-8 h-8 w-32 bg-white/10 border-white/20 rounded-lg text-[10px] font-black placeholder:text-white/40 text-white focus-visible:ring-white/20 transition-all"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 bg-white/10 text-white hover:bg-white/20 rounded-lg"
                          onClick={loadHealth}
                          disabled={loadingHealth}
                        >
                          <RefreshCw size={12} className={loadingHealth ? 'animate-spin' : ''} />
                        </Button>
                      </div>
                    </th>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-50">
                  {loadingHealth ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center">
                        <Loader2 size={24} className="animate-spin text-purple-500 mx-auto" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Syncing Knowledge Base...</p>
                      </TableCell>
                    </TableRow>
                  ) : statusRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center">
                        <Database size={24} className="text-slate-200 mx-auto" />
                        <p className="text-[12px] font-black text-slate-400 mt-2">No data in index.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    statusRows.map(row => (
                      <TableRow key={row.name} className="group hover:bg-purple-50/10 transition-all border-b border-slate-50">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 flex items-center justify-center text-purple-500 shadow-sm group-hover:scale-110 transition-transform">
                              <BookOpen size={18} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-black text-[#1e293b] text-[13px] block group-hover:text-purple-600 transition-colors">{row.name}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1 block">Curriculum Source</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[14px] font-display font-black text-purple-600 leading-none">{row.chunks.toLocaleString()} <span className="text-[9px] text-slate-400">units</span></span>
                            <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: '100%' }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              row.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              <div className={`w-1 h-1 rounded-full ${row.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {row.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-4 gap-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg border-slate-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all"
                            onClick={() => handleReingest(row.name.toLowerCase().replace(/\s+/g, '-').replace('&', ''), row.storagePath)}
                            disabled={reingesting === row.name.toLowerCase().replace(/\s+/g, '-').replace('&', '')}
                          >
                            <RefreshCw size={10} className={reingesting === row.name.toLowerCase() ? 'animate-spin' : ''} />
                            Sync
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