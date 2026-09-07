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
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">RAG Pipeline Manager</h2>
            <p className="text-sm text-slate-500">Manage vectorstore content and uploaded files</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-50 rounded-xl text-center">
            <p className="text-xl font-bold text-indigo-600">{totalChunks}</p>
            <p className="text-[10px] font-bold text-indigo-400 uppercase">Total Chunks</p>
          </div>
          <div className="px-4 py-2 bg-emerald-50 rounded-xl text-center">
            <p className="text-xl font-bold text-emerald-600">{subjectGroups.length}</p>
            <p className="text-[10px] font-bold text-emerald-400 uppercase">Subjects</p>
          </div>
        </div>
      </div>

      {/* Cloud Re-ingestion Banner */}
      {isReingestRunning && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900"
        >
          <div className="flex items-center gap-2.5">
            <Loader2 size={16} className="animate-spin text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold">
                Cloud re-ingestion in progress (FastAPI / GitHub Actions runner)...
              </p>
              <p className="text-[11px] text-amber-700">
                Vectorstore chunks are being re-indexed and synchronized. This page will update automatically.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 flex-shrink-0">
            Running
          </span>
        </motion.div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 w-full min-w-0">
        <Button
          onClick={fetchDocuments}
          disabled={loading}
          variant="outline"
          className="gap-2 min-h-[40px] flex-1 sm:flex-initial text-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
        <Button
          onClick={handleReingest}
          disabled={!!actionLoading || isReingestRunning}
          variant="outline"
          className="gap-2 min-h-[40px] flex-1 sm:flex-initial text-xs"
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
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50 min-h-[40px] w-full sm:w-auto text-xs"
          >
            <Trash2 size={14} />
            Purge All
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertTriangle size={14} /> This will delete ALL RAG content
            </span>
            <Button onClick={handlePurgeAll} disabled={actionLoading === 'purge'} className="bg-red-600 hover:bg-red-700 text-white gap-2 min-h-[40px] text-xs">
              {actionLoading === 'purge' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Confirm Purge
            </Button>
            <Button onClick={() => setConfirmPurge(false)} variant="outline" className="min-h-[40px] text-xs">Cancel</Button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : subjectGroups.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Database size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No RAG content found</p>
          <p className="text-sm">Upload PDFs via the Content tab or trigger re-ingestion</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subjectGroups.map((group) => (
            <motion.div
              key={group.subject}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              {/* Subject Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <FileText size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 capitalize">{group.subject.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-slate-500">{group.totalChunks} chunks • {group.files.length} source file{group.files.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleDeleteSubject(group.subject)}
                  disabled={!!actionLoading}
                  variant="outline"
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50 text-xs min-h-[38px]"
                >
                  {actionLoading === `subject:${group.subject}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Remove Subject
                </Button>
              </div>

              {/* Source Files */}
              <div className="divide-y divide-slate-100">
                {group.files.map((file) => (
                  <div key={file.source_file} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-700 font-medium truncate max-w-[400px]">{file.source_file}</span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{file.chunk_count} chunks</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSource(file.source_file)}
                      disabled={!!actionLoading}
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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
