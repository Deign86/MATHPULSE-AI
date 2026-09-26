import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Database, Trash2, RefreshCw, AlertTriangle, FileText, Loader2,
  Search, BookOpen, Layers, Sparkles, CheckCircle2, ChevronRight,
  Filter, Grid, List, ShieldAlert, Cpu, ExternalLink, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { apiFetch } from '../services/apiService';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';

interface RagDocument {
  source_file: string;
  subject: string;
  chunk_count: number;
}

interface RagHealthResponse {
  documents: RagDocument[];
  total_chunks: number;
}

interface SubjectGroup {
  subject: string;
  files: RagDocument[];
  totalChunks: number;
}

type ReingestStatusValue = 'idle' | 'running' | 'completed' | 'failed';

interface ReingestStatusResponse {
  status: ReingestStatusValue | string;
  message?: string;
  active_run_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

interface ReingestTriggerResponse {
  success: boolean;
  message: string;
}

const formatSubjectTitle = (rawSubject: string): string => {
  return rawSubject
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const AdminRagManager: React.FC = () => {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reingestStatus, setReingestStatus] = useState<ReingestStatusResponse | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | 'ALL'>('ALL');
  const [viewLayout, setViewLayout] = useState<'master-detail' | 'accordion'>('master-detail');
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  // Confirm Modal States
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [deleteSubjectModal, setDeleteSubjectModal] = useState<string | null>(null);
  const [deleteFileModal, setDeleteFileModal] = useState<string | null>(null);

  const isReingestRunning = reingestStatus?.status === 'running';

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const healthResponse = await apiFetch<RagHealthResponse>('/api/rag/documents');
      setDocuments(healthResponse.documents || []);
      setTotalChunks(healthResponse.total_chunks || 0);
    } catch (error) {
      console.error('Failed to fetch RAG documents:', error);
      toast.error('Failed to load RAG inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkReingestStatus = useCallback(async (): Promise<ReingestStatusResponse | null> => {
    try {
      const statusPayload = await apiFetch<ReingestStatusResponse>('/api/admin/reingest-status');
      consecutiveFailuresRef.current = 0;
      setReingestStatus(statusPayload);
      return statusPayload;
    } catch {
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current >= 3) {
        setReingestStatus({ status: 'idle' });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
    void checkReingestStatus();
  }, [fetchDocuments, checkReingestStatus]);

  useEffect(() => {
    if (!isReingestRunning) return;

    const pollIntervalId = window.setInterval(async () => {
      const latestStatus = await checkReingestStatus();
      if (latestStatus && latestStatus.status !== 'running') {
        if (latestStatus.status === 'completed') {
          toast.success(latestStatus.message || 'Remote cloud re-ingestion completed.');
          await fetchDocuments();
        } else if (latestStatus.status === 'failed') {
          toast.error(latestStatus.message || 'Remote cloud re-ingestion failed.');
        }
      }
    }, 8000);

    return () => {
      window.clearInterval(pollIntervalId);
    };
  }, [isReingestRunning, checkReingestStatus, fetchDocuments]);

  // Group documents by subject
  const subjectGroups: SubjectGroup[] = useMemo(() => {
    const map = new Map<string, RagDocument[]>();
    for (const doc of documents) {
      const existing = map.get(doc.subject) || [];
      existing.push(doc);
      map.set(doc.subject, existing);
    }
    return Array.from(map.entries()).map(([subject, files]) => ({
      subject,
      files,
      totalChunks: files.reduce((sum, f) => sum + f.chunk_count, 0),
    }));
  }, [documents]);

  // Auto-select first subject if none selected or invalid
  useEffect(() => {
    if (selectedSubject !== 'ALL' && !subjectGroups.some((g) => g.subject === selectedSubject)) {
      if (subjectGroups.length > 0) {
        setSelectedSubject(subjectGroups[0].subject);
      } else {
        setSelectedSubject('ALL');
      }
    }
  }, [subjectGroups, selectedSubject]);

  // Filtered Groups based on search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subjectGroups;

    return subjectGroups
      .map((group) => {
        const matchesSubject = group.subject.toLowerCase().includes(q);
        const matchingFiles = group.files.filter((f) => f.source_file.toLowerCase().includes(q));

        if (matchesSubject) return group;
        if (matchingFiles.length > 0) {
          return {
            ...group,
            files: matchingFiles,
            totalChunks: matchingFiles.reduce((s, f) => s + f.chunk_count, 0),
          };
        }
        return null;
      })
      .filter((g): g is SubjectGroup => g !== null);
  }, [subjectGroups, searchQuery]);

  // Active Subject Group for Master-Detail view
  const activeSubjectGroup = useMemo(() => {
    if (selectedSubject === 'ALL') return null;
    return subjectGroups.find((g) => g.subject === selectedSubject) || null;
  }, [subjectGroups, selectedSubject]);

  // Total filtered files
  const activeSubjectFiles = useMemo(() => {
    if (!activeSubjectGroup) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeSubjectGroup.files;
    return activeSubjectGroup.files.filter((f) => f.source_file.toLowerCase().includes(q));
  }, [activeSubjectGroup, searchQuery]);

  const handleDeleteSubject = async (subject: string) => {
    setActionLoading(`subject:${subject}`);
    try {
      const deleteResponse = await apiFetch<{ deleted: number; message: string }>(
        `/api/rag/documents/by-subject/${encodeURIComponent(subject)}`,
        { method: 'DELETE' }
      );
      toast.success(deleteResponse.message || 'Subject knowledge removed');
      setDeleteSubjectModal(null);
      await fetchDocuments();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to delete subject: ${message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSource = async (sourceFile: string) => {
    setActionLoading(`source:${sourceFile}`);
    try {
      const deleteResponse = await apiFetch<{ deleted: number; message: string }>(
        `/api/rag/documents/by-source?source_file=${encodeURIComponent(sourceFile)}`,
        { method: 'DELETE' }
      );
      toast.success(deleteResponse.message || 'Source file removed');
      setDeleteFileModal(null);
      await fetchDocuments();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to delete source: ${message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurgeAll = async () => {
    setActionLoading('purge');
    try {
      const purgeResponse = await apiFetch<{ message: string }>('/api/rag/documents/all', {
        method: 'DELETE',
      });
      toast.success(purgeResponse.message || 'All AI knowledge purged');
      setPurgeModalOpen(false);
      await fetchDocuments();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Purge failed: ${message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReingest = async () => {
    setActionLoading('reingest');
    try {
      const triggerResponse = await apiFetch<ReingestTriggerResponse>('/api/admin/reingest-pdf', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success(triggerResponse.message || 'Remote re-ingestion started in the cloud.');
      setReingestStatus({
        status: 'running',
        message: triggerResponse.message,
      });
      await checkReingestStatus();
    } catch (triggerError) {
      const errorMessage = triggerError instanceof Error ? triggerError.message : String(triggerError);
      toast.error(`Re-ingestion failed: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAccordion = (subjectKey: string) => {
    setExpandedAccordions((prev) => ({
      ...prev,
      [subjectKey]: !prev[subjectKey],
    }));
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-6 animate-in fade-in duration-300">
      {/* ── Top Bento Stats Header ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {[
          {
            label: 'Indexed Sections',
            value: totalChunks.toLocaleString(),
            subtext: 'Vector chunks for AI tutoring',
            badge: 'Vector DB',
            icon: Database,
            gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.52)]',
          },
          {
            label: 'Active Subjects',
            value: subjectGroups.length.toString(),
            subtext: 'Curriculum areas with vectors',
            badge: 'Curriculum',
            icon: BookOpen,
            gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(2,132,199,0.52)]',
          },
          {
            label: 'Ingested Documents',
            value: documents.length.toString(),
            subtext: 'Source PDFs stored in Chroma',
            badge: 'Sources',
            icon: FileText,
            gradient: 'bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.52)]',
          },
          {
            label: 'RAG Pipeline Status',
            value: isReingestRunning ? 'Rebuilding' : 'Online',
            subtext: isReingestRunning ? 'Ingesting modules in cloud' : 'Ready for real-time queries',
            badge: isReingestRunning ? 'Processing' : 'Healthy',
            icon: Cpu,
            gradient: isReingestRunning
              ? 'bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309]'
              : 'bg-gradient-to-br from-[#8B5CF6] via-[#6D28D9] to-[#4C1D95]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(109,40,217,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(109,40,217,0.52)]',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`group relative ${stat.gradient} ${stat.shadow} border border-white/25 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 ease-out overflow-hidden min-h-[70px] sm:min-h-[120px]`}
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
              <h3 className="text-lg sm:text-2xl font-black font-display text-white leading-none tracking-tight tabular-nums drop-shadow-sm">
                {stat.value}
              </h3>
              <p className="text-[10px] sm:text-xs font-bold text-white/95 mt-1 sm:mt-1.5 truncate">
                {stat.label}
              </p>
              <p className="text-[10px] text-white/70 mt-0.5 truncate font-medium hidden sm:block">
                {stat.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active Reingest Cloud Progress Banner ── */}
      {isReingestRunning && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 p-4 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl text-amber-900 dark:text-amber-200 shadow-sm backdrop-blur-xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 truncate">
                AI Knowledge Rebuild in Progress...
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5 line-clamp-1">
                {reingestStatus?.message || 'Processing and embedding learning materials in the vector cloud.'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-200 shrink-0 border border-amber-500/30">
            Running
          </span>
        </motion.div>
      )}

      {/* ── Control & Search Bar ── */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Search Box */}
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects or document sources..."
            className="pl-9 pr-8 h-10 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-purple-400 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Buttons: Unified responsive toolbar on a single balanced line */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-between xl:justify-end shrink-0 w-full xl:w-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setViewLayout('master-detail')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'master-detail'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Split View"
            >
              <Grid size={13} />
              <span className="hidden sm:inline">Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('accordion')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'accordion'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Accordion Overview"
            >
              <List size={13} />
              <span className="hidden sm:inline">Accordion</span>
            </button>
          </div>

          <Button
            onClick={fetchDocuments}
            disabled={loading}
            variant="outline"
            className="gap-1.5 h-10 px-2.5 sm:px-3 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:text-[#9956DE] active:scale-95 transition-all shrink-0"
            title="Refresh Knowledge Index"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#9956DE]' : ''} />
            <span className="hidden md:inline">Refresh</span>
          </Button>

          <Button
            onClick={handleReingest}
            disabled={!!actionLoading || isReingestRunning}
            className="gap-1.5 h-10 px-3 sm:px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white shadow-sm shadow-purple-500/20 active:scale-95 transition-all border border-purple-400/30 shrink-0 whitespace-nowrap"
          >
            {actionLoading === 'reingest' || isReingestRunning ? (
              <Loader2 size={13} className="animate-spin text-white shrink-0" />
            ) : (
              <Sparkles size={13} className="text-white shrink-0" />
            )}
            <span>{isReingestRunning ? 'Rebuilding...' : 'Rebuild Knowledge'}</span>
          </Button>

          <Button
            onClick={() => setPurgeModalOpen(true)}
            variant="outline"
            className="gap-1.5 h-10 px-2.5 sm:px-3.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold rounded-xl active:scale-95 transition-all shrink-0"
            title="Clear All Vectors"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Clear All</span>
          </Button>
        </div>
      </div>

      {/* ── Main Interactive Content Area ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 animate-pulse">
            <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ) : subjectGroups.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center text-[#9956DE] dark:text-purple-400 mx-auto mb-4 shadow-sm">
            <Database size={30} />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No AI Knowledge Loaded Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Upload learning materials in the Content section, then click &ldquo;Rebuild Knowledge&rdquo; to vector-index your Senior High School curriculum.
          </p>
          <Button
            onClick={handleReingest}
            disabled={isReingestRunning}
            className="mt-5 gap-2 bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95"
          >
            <Sparkles size={14} /> Start Knowledge Build
          </Button>
        </div>
      ) : viewLayout === 'master-detail' ? (
        /* ════════════════════════════════════════════════════════════════════════
           MASTER-DETAIL SPLIT VIEW (Zero Scroll Fatigue for Massive File Lists)
           ════════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ── Left Column: Subject Directory (Desktop Only: 4 Cols) ── */}
          <div className="hidden lg:block lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Subjects Directory ({filteredGroups.length})
              </span>
              <span className="text-[11px] font-semibold text-[#9956DE] dark:text-purple-400">
                Select to view files
              </span>
            </div>

            {/* Scrollable Subjects List Container (Contained Height) */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filteredGroups.length === 0 ? (
                <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  No subjects match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isSelected = selectedSubject === group.subject;
                  return (
                    <button
                      key={group.subject}
                      onClick={() => setSelectedSubject(group.subject)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 group/btn cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-white dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 border-l-[4px] border-l-[#9956DE] border-t-purple-200/90 border-r-purple-200/90 border-b-purple-200/90 dark:border-t-purple-800/60 dark:border-r-purple-800/60 dark:border-b-purple-800/60 shadow-[0_4px_16px_-4px_rgba(153,86,222,0.18)]'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover/btn:scale-105 ${
                            isSelected
                              ? 'bg-gradient-to-br from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                              : 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900 text-[#9956DE] dark:text-purple-300'
                          }`}
                        >
                          <BookOpen size={16} className={isSelected ? 'text-white' : 'text-[#9956DE] dark:text-purple-300'} />
                        </div>
                        <div className="min-w-0">
                          <h4
                            className={`font-bold text-xs truncate ${
                              isSelected
                                ? 'text-purple-950 dark:text-purple-100 font-extrabold'
                                : 'text-slate-800 dark:text-slate-200 group-hover/btn:text-[#9956DE]'
                            }`}
                          >
                            {formatSubjectTitle(group.subject)}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              {group.files.length} file{group.files.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="font-bold text-[#9956DE] dark:text-purple-300 tabular-nums">
                              {group.totalChunks} chunks
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#9956DE] shadow-xs animate-pulse" />
                        )}
                        <ChevronRight
                          size={16}
                          className={`transition-transform ${
                            isSelected
                              ? 'text-[#9956DE] translate-x-0.5'
                              : 'text-slate-300 dark:text-slate-600 group-hover/btn:text-slate-400'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right Column: Selected Subject Source Files (8 Cols on Desktop, Full on Mobile) ── */}
          <div className="col-span-1 lg:col-span-8 w-full">
            {/* Mobile Subject Dropdown Selector (< lg screens) */}
            <div className="lg:hidden space-y-1.5 mb-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Subject Directory ({filteredGroups.length})
                </label>
                <span className="text-[10px] text-[#9956DE] dark:text-purple-400 font-bold">
                  Tap to switch subject
                </span>
              </div>

              <Select
                value={selectedSubject || ''}
                onValueChange={(val) => setSelectedSubject(val)}
              >
                <SelectTrigger className="w-full min-h-[54px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-3.5 text-xs font-bold shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9956DE] to-[#7274ED] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <BookOpen size={16} className="text-white shrink-0" />
                    </div>
                    <div className="flex flex-col text-left truncate min-w-0">
                      <span className="truncate text-slate-900 dark:text-white font-bold text-xs">
                        {activeSubjectGroup ? formatSubjectTitle(activeSubjectGroup.subject) : 'Select a Subject...'}
                      </span>
                      {activeSubjectGroup && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {activeSubjectGroup.files.length} file{activeSubjectGroup.files.length !== 1 ? 's' : ''} • <span className="font-bold text-[#9956DE] dark:text-purple-300">{activeSubjectGroup.totalChunks} vectors</span>
                        </span>
                      )}
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[320px] rounded-2xl p-1.5 border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl">
                  {filteredGroups.map((grp) => {
                    const isCur = selectedSubject === grp.subject;
                    return (
                      <SelectItem
                        key={grp.subject}
                        value={grp.subject}
                        className="rounded-xl py-2.5 px-3 my-0.5 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-3 w-full">
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            <BookOpen size={14} className={isCur ? 'text-[#9956DE]' : 'text-slate-400'} />
                            <span className={`text-xs truncate ${isCur ? 'font-black text-[#9956DE]' : 'font-semibold'}`}>
                              {formatSubjectTitle(grp.subject)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-400">
                              {grp.files.length} files
                            </span>
                            <span className="font-bold text-[#9956DE] dark:text-purple-300 tabular-nums">
                              {grp.totalChunks} v
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {activeSubjectGroup ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                {/* Brand Accent Top Strip */}
                <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />

                {/* Subject Detail Header Card */}
                <div className="p-4 sm:p-6 bg-slate-50/70 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#9956DE] to-[#7274ED] flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
                        <BookOpen size={20} className="sm:hidden text-white shrink-0" />
                        <BookOpen size={22} className="hidden sm:block text-white shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm sm:text-lg text-slate-900 dark:text-white truncate">
                            {formatSubjectTitle(activeSubjectGroup.subject)}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-purple-100 dark:bg-purple-950/60 text-[#9956DE] dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 shrink-0">
                            Active RAG
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          <strong className="text-slate-700 dark:text-slate-200">{activeSubjectGroup.totalChunks}</strong> semantic vector sections indexed across <strong className="text-slate-700 dark:text-slate-200">{activeSubjectGroup.files.length}</strong> source file{activeSubjectGroup.files.length !== 1 ? 's' : ''}.
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setDeleteSubjectModal(activeSubjectGroup.subject)}
                      disabled={!!actionLoading}
                      variant="outline"
                      className="gap-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold h-9 rounded-xl active:scale-95 shrink-0 self-start sm:self-auto"
                    >
                      <Trash2 size={13} />
                      Remove Subject
                    </Button>
                  </div>
                </div>

                {/* Contained File Inventory List */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText size={14} className="text-[#9956DE]" />
                      Ingested Source Files ({activeSubjectFiles.length})
                    </span>
                    {searchQuery && (
                      <span className="text-[11px] text-slate-400">
                        Filtered by &ldquo;{searchQuery}&rdquo;
                      </span>
                    )}
                  </div>

                  {activeSubjectFiles.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No files match your search query in this subject.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto pr-1">
                      {activeSubjectFiles.map((file) => (
                        <div
                          key={file.source_file}
                          className="group/item flex items-center justify-between py-3 px-2 sm:px-3 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 rounded-xl transition-all border-l-2 border-l-transparent hover:border-l-[#9956DE]"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900 flex items-center justify-center text-[#9956DE] dark:text-purple-300 shrink-0">
                              <FileText size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover/item:text-[#9956DE] dark:group-hover/item:text-purple-300 transition-colors">
                                {file.source_file}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9956DE] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/50 px-2 py-0.2 rounded-md tabular-nums">
                                  {file.chunk_count} vector sections
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Ready
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setDeleteFileModal(file.source_file)}
                            disabled={!!actionLoading}
                            className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 transition-all active:scale-95 cursor-pointer shrink-0"
                            title={`Remove ${file.source_file}`}
                            aria-label={`Remove ${file.source_file}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400 text-xs">
                Select a subject from the directory to view its file inventory.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════════
           ACCORDION VIEW (Collapsible Overview with Internal Scrollboxes)
           ════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedAccordions[group.subject] ?? true;
            return (
              <div
                key={group.subject}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                {/* Brand Strip */}
                <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />

                {/* Collapsible Header */}
                <div
                  onClick={() => toggleAccordion(group.subject)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-850 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9956DE] to-[#7274ED] flex items-center justify-center text-white shadow-xs shrink-0">
                      <BookOpen size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {formatSubjectTitle(group.subject)}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {group.files.length} files
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <strong className="text-slate-700 dark:text-slate-300">{group.totalChunks}</strong> indexed sections
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={() => setDeleteSubjectModal(group.subject)}
                      disabled={!!actionLoading}
                      variant="outline"
                      className="gap-1 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold h-8 rounded-xl active:scale-95"
                    >
                      <Trash2 size={12} />
                      Remove
                    </Button>
                    <button
                      onClick={() => toggleAccordion(group.subject)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                          {group.files.map((file) => (
                            <div
                              key={file.source_file}
                              className="group/row flex items-center justify-between py-2.5 px-2 hover:bg-purple-50/20 dark:hover:bg-purple-950/10 rounded-xl transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-3">
                                <FileText size={14} className="text-slate-400 group-hover/row:text-[#9956DE] shrink-0" />
                                <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold truncate">
                                  {file.source_file}
                                </span>
                                <span className="text-[10px] font-bold text-[#9956DE] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/60 px-2 py-0.2 rounded-md shrink-0 tabular-nums">
                                  {file.chunk_count} sections
                                </span>
                              </div>
                              <button
                                onClick={() => setDeleteFileModal(file.source_file)}
                                disabled={!!actionLoading}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirmation Modals ── */}
      {/* 1. Purge All Modal */}
      <ConfirmModal
        isOpen={purgeModalOpen}
        onClose={() => setPurgeModalOpen(false)}
        onConfirm={handlePurgeAll}
        title="Purge All AI Knowledge?"
        message="This action will permanently delete ALL vector chunks and knowledge embeddings from Chroma across every curriculum subject. The AI tutor will not be able to reference curriculum content until you rebuild it."
        confirmText={actionLoading === 'purge' ? 'Purging...' : 'Yes, Purge Everything'}
        type="danger"
        icon="delete"
      />

      {/* 2. Delete Subject Modal */}
      <ConfirmModal
        isOpen={!!deleteSubjectModal}
        onClose={() => setDeleteSubjectModal(null)}
        onConfirm={async () => {
          if (deleteSubjectModal) {
            await handleDeleteSubject(deleteSubjectModal);
          }
        }}
        title={`Remove Subject: ${deleteSubjectModal ? formatSubjectTitle(deleteSubjectModal) : ''}?`}
        message="This will remove all indexed sections and files associated with this subject from the RAG vector store."
        confirmText="Remove Subject"
        type="danger"
        icon="delete"
      />

      {/* 3. Delete File Modal */}
      <ConfirmModal
        isOpen={!!deleteFileModal}
        onClose={() => setDeleteFileModal(null)}
        onConfirm={async () => {
          if (deleteFileModal) {
            await handleDeleteSource(deleteFileModal);
          }
        }}
        title="Remove Document Source?"
        message={`Are you sure you want to remove "${deleteFileModal}" from the vector database?`}
        confirmText="Remove File"
        type="danger"
        icon="delete"
      />
    </div>
  );
};

export default AdminRagManager;
