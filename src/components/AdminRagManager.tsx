import React, { useState, useEffect, useCallback } from 'react';
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

const AdminRagManager: React.FC = () => {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<RagHealthResponse>('/api/rag/documents');
      setDocuments(data.documents);
      setTotalChunks(data.total_chunks);
    } catch (err) {
      console.error('Failed to fetch RAG documents:', err);
      toast.error('Failed to load RAG inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

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
      const result = await apiFetch<{ deleted: number; message: string }>(`/api/rag/documents/by-subject/${encodeURIComponent(subject)}`, { method: 'DELETE' });
      toast.success(result.message);
      await fetchDocuments();
    } catch (err) {
      toast.error(`Failed to delete subject: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSource = async (sourceFile: string) => {
    setActionLoading(`source:${sourceFile}`);
    try {
      const result = await apiFetch<{ deleted: number; message: string }>(`/api/rag/documents/by-source?source_file=${encodeURIComponent(sourceFile)}`, { method: 'DELETE' });
      toast.success(result.message);
      await fetchDocuments();
    } catch (err) {
      toast.error(`Failed to delete source: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurgeAll = async () => {
    setActionLoading('purge');
    try {
      const result = await apiFetch<{ message: string }>('/api/rag/documents/all', { method: 'DELETE' });
      toast.success(result.message);
      setConfirmPurge(false);
      await fetchDocuments();
    } catch (err) {
      toast.error(`Purge failed: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReingest = async () => {
    setActionLoading('reingest');
    try {
      await apiFetch('/api/admin/reingest-pdf', { method: 'POST', body: JSON.stringify({}) });
      toast.success('Re-ingestion triggered. This may take a few minutes.');
      setTimeout(fetchDocuments, 5000);
    } catch (err) {
      toast.error(`Re-ingestion failed: ${err}`);
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

      {/* Actions Bar */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <Button
          onClick={fetchDocuments}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
        <Button
          onClick={handleReingest}
          disabled={!!actionLoading}
          variant="outline"
          className="gap-2"
        >
          {actionLoading === 'reingest' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Re-ingest All PDFs
        </Button>
        <div className="flex-1" />
        {!confirmPurge ? (
          <Button
            onClick={() => setConfirmPurge(true)}
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Purge All
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600 font-medium flex items-center gap-1">
              <AlertTriangle size={14} /> This will delete ALL RAG content
            </span>
            <Button onClick={handlePurgeAll} disabled={actionLoading === 'purge'} className="bg-red-600 hover:bg-red-700 text-white gap-2">
              {actionLoading === 'purge' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Confirm Purge
            </Button>
            <Button onClick={() => setConfirmPurge(false)} variant="outline">Cancel</Button>
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
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50 text-xs h-8"
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
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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
