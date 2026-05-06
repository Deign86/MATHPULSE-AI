import React, { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, CheckCircle, XCircle, RefreshCw,
  Loader2, AlertTriangle, Trash2, BarChart3
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
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
    // Auto-fill subject name if subject is selected
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

      // Simulate progress (XHR would give real progress, but Fetch doesn't)
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

  // Build status table rows from ragHealth
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
    <div className="space-y-6">
      {/* Upload Card */}
      <div className="bg-white rounded-2xl border border-[#dde3eb] shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
            <Upload size={20} className="text-sky-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#0a1628]">Upload Module PDF</h3>
            <p className="text-xs text-[#5a6578]">Upload a DepEd teaching module PDF and trigger RAG ingestion</p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4
            ${dragOver ? 'border-sky-500 bg-sky-50' : 'border-[#dde3eb] hover:border-sky-400 hover:bg-sky-50/50'}
            ${uploading ? 'cursor-not-allowed opacity-60' : ''}
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
            <div className="flex items-center justify-center gap-3">
              <FileText size={24} className="text-sky-600" />
              <div className="text-left">
                <p className="font-semibold text-[#0a1628]">{selectedFile.name}</p>
                <p className="text-xs text-[#5a6578]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              {!uploading && (
                <button
                  onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                  className="ml-4 p-1.5 hover:bg-rose-50 rounded-lg text-rose-500"
                  aria-label="Remove file"
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>
          ) : (
            <>
              <Upload size={28} className="mx-auto mb-2 text-[#dde3eb]" />
              <p className="font-semibold text-[#0a1628]">Drop PDF here or click to browse</p>
              <p className="text-xs text-[#5a6578] mt-1">PDF files only, max 50MB</p>
            </>
          )}
        </div>

        {/* Upload Progress */}
        {uploadProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#5a6578] mb-1">
              <span>{uploading ? 'Uploading...' : 'Complete'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-[#edf1f7] rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-[#5a6578] mb-1.5 block">Subject</label>
            <Select value={subjectId} onValueChange={handleSubjectChange} disabled={uploading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {SHS_MATH_SUBJECTS.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.gradeLevel} — {s.semester})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-[#5a6578] mb-1.5 block">Subject Name (display)</label>
            <Input
              value={subjectName}
              onChange={e => setSubjectName(e.target.value)}
              placeholder="e.g. General Mathematics"
              disabled={uploading}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5a6578] mb-1.5 block">Semester</label>
            <Select value={quarter} onValueChange={setQuarter} disabled={uploading}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || !subjectId || !subjectName.trim()}
          className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading & Indexing...</>
          ) : (
            <><Upload size={16} /> Upload & Ingest</>
          )}
        </Button>
      </div>

      {/* Current PDFs Status Table */}
      <div className="bg-white rounded-2xl border border-[#dde3eb] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#dde3eb] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#0a1628]">RAG Index Status</h3>
              <p className="text-xs text-[#5a6578]">
                {loadingHealth ? 'Loading...' : `${ragHealth?.chunkCount ?? 0} total chunks across ${statusRows.length} subjects`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={loadHealth}
            disabled={loadingHealth}
          >
            <RefreshCw size={14} className={loadingHealth ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {loadingHealth ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-sky-500" />
          </div>
        ) : statusRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <AlertTriangle size={24} className="text-[#dde3eb]" />
            <p className="text-sm text-[#5a6578]">No PDFs indexed yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#edf1f7] border-b border-[#dde3eb]">
                  <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Subject</th>
                  <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Chunks</th>
                  <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde3eb]">
                {statusRows.map(row => (
                  <tr key={row.name} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <FileText size={16} className="text-[#5a6578]" />
                        <span className="font-semibold text-sm text-[#0a1628]">{row.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-[#0a1628]">{row.chunks}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${
                        row.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : row.status === 'locked'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {row.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleReingest(row.name.toLowerCase().replace(/\s+/g, '-').replace('&', ''), row.storagePath)}
                        disabled={reingesting === row.name.toLowerCase().replace(/\s+/g, '-').replace('&', '')}
                      >
                        {reingesting === row.name.toLowerCase().replace(/\s+/g, '-').replace('&', '') ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        Re-ingest
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ragHealth?.lastIngested && (
          <div className="p-4 border-t border-[#dde3eb] bg-[#f8fafc]">
            <p className="text-xs text-[#5a6578]">
              Last ingestion: {new Date(ragHealth.lastIngested).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPdfUpload;