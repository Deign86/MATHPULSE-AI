import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Database, Trash2, RefreshCw, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { apiFetch } from '../services/apiService';
import { toast } from 'sonner';

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

const AdminRagManager: React.FC = () => {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [reingestStatus, setReingestStatus] = useState<ReingestStatusResponse | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);

  const isReingestRunning = reingestStatus?.status === 'running';

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const healthResponse = await apiFetch<RagHealthResponse>('/api/rag/documents');
      setDocuments(healthResponse.documents);
      setTotalChunks(healthResponse.total_chunks);
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
    if (!isReingestRunning) {
      return;
    }

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
  const subjectGroups: SubjectGroup[] = React.useMemo(() => {
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

  const handleDeleteSubject = async (subject: string) => {
    setActionLoading(`subject:${subject}`);
    try {
      const deleteResponse = await apiFetch<{ deleted: number; message: string }>(`/api/rag/documents/by-subject/${encodeURIComponent(subject)}`, { method: 'DELETE' });
      toast.success(deleteResponse.message);
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
      const deleteResponse = await apiFetch<{ deleted: number; message: string }>(`/api/rag/documents/by-source?source_file=${encodeURIComponent(sourceFile)}`, { method: 'DELETE' });
      toast.success(deleteResponse.message);
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
      const purgeResponse = await apiFetch<{ message: string }>('/api/rag/documents/all', { method: 'DELETE' });
      toast.success(purgeResponse.message);
      setConfirmPurge(false);
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

  return (
    <div className="space-y-6 pt-2 pb-6 max-w-[1400px] mx-auto min-w-0">
      {/* Header Stats Bento Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between min-h-[58px] sm:min-h-0">
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Database size={14} className="sm:hidden" />
              <Database size={18} className="hidden sm:block" />
            </div>
            <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vector Store</span>
          </div>
          <div>
            <p className="text-lg sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums leading-none sm:leading-normal">{totalChunks.toLocaleString()}</p>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate">Indexed Chunks</p>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block truncate">Parsed into BAAI/bge-small vector store</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between min-h-[58px] sm:min-h-0">
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileText size={14} className="sm:hidden" />
              <FileText size={18} className="hidden sm:block" />
            </div>
            <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Ready
            </span>
          </div>
          <div>
            <p className="text-lg sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums leading-none sm:leading-normal">{subjectGroups.length}</p>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate">Active Subjects</p>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block truncate">Active knowledge namespaces</p>
          </div>
        </div>
      </div>

      {/* Cloud Re-ingestion Banner */}
      {isReingestRunning && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl text-amber-900 dark:text-amber-200"
        >
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold">
                Cloud re-ingestion pipeline in progress...
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                Vectorstore chunks are being re-indexed. This page will update automatically upon completion.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
            Running
          </span>
        </motion.div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm w-full min-w-0">
        <Button
          onClick={fetchDocuments}
          disabled={loading}
          variant="outline"
          className="gap-2 min-h-[44px] flex-1 sm:flex-initial text-xs font-semibold rounded-xl border-slate-200/80 dark:border-slate-700/60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
        <Button
          onClick={handleReingest}
          disabled={!!actionLoading || isReingestRunning}
          variant="outline"
          className="gap-2 min-h-[44px] flex-1 sm:flex-initial text-xs font-semibold rounded-xl border-slate-200/80 dark:border-slate-700/60"
        >
          {actionLoading === 'reingest' || isReingestRunning ? (
            <Loader2 size={14} className="animate-spin text-indigo-600" />
          ) : (
            <RefreshCw size={14} />
          )}
          {isReingestRunning ? 'Re-ingestion Running...' : 'Re-ingest All PDFs'}
        </Button>
        <div className="hidden sm:block sm:flex-1" />
        {!confirmPurge ? (
          <Button
            onClick={() => setConfirmPurge(true)}
            variant="outline"
            className="gap-2 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-h-[44px] w-full sm:w-auto text-xs font-semibold rounded-xl"
          >
            <Trash2 size={14} />
            Purge All
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
              <AlertTriangle size={14} /> Deletes ALL RAG content
            </span>
            <Button onClick={handlePurgeAll} disabled={actionLoading === 'purge'} className="bg-rose-600 hover:bg-rose-700 text-white gap-2 min-h-[44px] text-xs font-semibold rounded-xl shadow-sm">
              {actionLoading === 'purge' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Confirm Purge
            </Button>
            <Button onClick={() => setConfirmPurge(false)} variant="outline" className="min-h-[44px] text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700">Cancel</Button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : subjectGroups.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-6">
          <Database size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No RAG content indexed yet</p>
          <p className="text-xs text-slate-400 mt-0.5">Upload curriculum PDFs via the Content tab or trigger cloud re-ingestion</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subjectGroups.map((group) => (
            <motion.div
              key={group.subject}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden"
            >
              {/* Subject Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-slate-50/50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white capitalize">{group.subject.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-slate-400">{group.totalChunks} chunks • {group.files.length} source file{group.files.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleDeleteSubject(group.subject)}
                  disabled={!!actionLoading}
                  variant="outline"
                  className="gap-1.5 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold min-h-[40px] rounded-xl self-start sm:self-auto"
                >
                  {actionLoading === `subject:${group.subject}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Remove Subject
                </Button>
              </div>

              {/* Source Files */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {group.files.map((file) => (
                  <div key={file.source_file} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-700 dark:text-slate-200 font-medium truncate max-w-[360px]">{file.source_file}</span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full shrink-0 tabular-nums">{file.chunk_count} chunks</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSource(file.source_file)}
                      disabled={!!actionLoading}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                      aria-label={`Delete ${file.source_file}`}
                    >
                      {actionLoading === `source:${file.source_file}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRagManager;
