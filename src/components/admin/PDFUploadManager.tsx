import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  RefreshCw,
  FileUp,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../contexts/AuthContext';
import {
  createProcessingJob,
  uploadFileWithProgress,
  subscribeToAllJobs,
  cancelJob,
  deleteJob,
  PDF_SUBJECT_OPTIONS,
  GRADE_LEVEL_OPTIONS,
  STATUS_CONFIG,
  type ProcessingJob,
  type ProcessingStatus,
} from '../../services/pdfProcessingService';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// PDF Upload Manager — Admin UI for uploading curriculum PDFs
// ─────────────────────────────────────────────────────────────────────────────

interface UploadingFile {
  id: string;
  file: File;
  jobId: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

const PDFUploadManager: React.FC = () => {
  const { userProfile } = useAuth();
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);

  // Subscribe to job updates
  useEffect(() => {
    if (!userProfile?.uid) return;

    const unsub = subscribeToAllJobs(
      userProfile.uid,
      (updatedJobs) => {
        setJobs(updatedJobs);
      },
      (error) => {
        console.error('[PDFUploadManager] subscription error:', error);
      },
    );

    subscriptionRef.current = unsub;
    return () => {
      unsub();
      subscriptionRef.current = null;
    };
  }, [userProfile?.uid]);

  // Handle file selection
  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
      );

      if (pdfFiles.length === 0) {
        toast.error('Please select PDF files only');
        return;
      }

      if (pdfFiles.length !== Array.from(files).length) {
        toast.warning(`${Array.from(files).length - pdfFiles.length} non-PDF file(s) were skipped`);
      }

      setSelectedFiles((prev) => [...prev, ...pdfFiles]);
    },
    [],
  );

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  // Remove a selected file
  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Upload all selected files
  const handleUpload = useCallback(async () => {
    if (!userProfile?.uid) {
      toast.error('You must be logged in to upload files');
      return;
    }
    if (!subject) {
      toast.error('Please select a subject');
      return;
    }
    if (!gradeLevel) {
      toast.error('Please select a grade level');
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one PDF file');
      return;
    }

    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);

    for (const file of filesToUpload) {
      try {
        // Create job in Firestore
        const jobId = await createProcessingJob({
          file,
          subject,
          gradeLevel,
          userId: userProfile.uid,
        });

        // Track upload progress
        const uploadEntry: UploadingFile = {
          id: `${jobId}-${file.name}`,
          file,
          jobId,
          progress: 0,
          status: 'uploading',
        };

        setUploadingFiles((prev) => [...prev, uploadEntry]);

        // Start upload with progress tracking
        uploadFileWithProgress(jobId, file, subject, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((u) =>
              u.jobId === jobId ? { ...u, progress } : u,
            ),
          );
        })
          .then(() => {
            setUploadingFiles((prev) =>
              prev.map((u) =>
                u.jobId === jobId ? { ...u, status: 'done' } : u,
              ),
            );
            toast.success(`${file.name} uploaded successfully`);
          })
          .catch((err) => {
            setUploadingFiles((prev) =>
              prev.map((u) =>
                u.jobId === jobId
                  ? { ...u, status: 'error', error: err.message }
                  : u,
              ),
            );
            toast.error(`Failed to upload ${file.name}: ${err.message}`);
          });
      } catch (err) {
        toast.error(`Failed to create job for ${file.name}`);
        console.error(err);
      }
    }
  }, [userProfile?.uid, subject, gradeLevel, selectedFiles]);

  // Cancel a job
  const handleCancel = useCallback(async (jobId: string) => {
    try {
      await cancelJob(jobId);
      toast.success('Job cancelled');
    } catch (err) {
      toast.error('Failed to cancel job');
      console.error(err);
    }
  }, []);

  // Delete a job
  const handleDelete = useCallback(async (jobId: string) => {
    try {
      await deleteJob(jobId);
      toast.success('Job removed');
    } catch (err) {
      toast.error('Failed to remove job');
      console.error(err);
    }
  }, []);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Status icon
  const StatusIcon: React.FC<{ status: ProcessingStatus }> = ({ status }) => {
    switch (status) {
      case 'uploading':
      case 'queued':
      case 'processing':
        return <Loader2 size={16} className="animate-spin text-sky-500" />;
      case 'completed':
        return <CheckCircle2 size={16} className="text-teal-500" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'cancelled':
        return <Clock size={16} className="text-slate-400" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-display font-bold text-[#0a1628]">PDF Upload Manager</h2>
        <p className="text-sm text-[#5a6578]">
          Upload curriculum PDFs for RAG ingestion. Files are stored in Firebase Storage and queued for processing.
        </p>
      </div>

      {/* Upload Form */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Metadata Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Subject
              </label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {PDF_SUBJECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Grade Level
              </label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200
              ${
                isDragOver
                  ? 'border-sky-400 bg-sky-50 scale-[1.01]'
                  : 'border-slate-200 bg-slate-50/50 hover:border-sky-300 hover:bg-sky-50/50'
              }
            `}
            role="button"
            tabIndex={0}
            aria-label="Upload PDF files"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="flex flex-col items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragOver ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <UploadCloud size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0a1628]">
                  {isDragOver ? 'Drop PDF files here' : 'Drag & drop PDF files here'}
                </p>
                <p className="text-xs text-[#5a6578] mt-1">
                  or click to browse — PDF files only, max 20 MB each
                </p>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {selectedFiles.length} file(s) selected
                </p>
                {selectedFiles.map((file, idx) => (
                  <motion.div
                    key={`${file.name}-${idx}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0a1628] truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-400">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelectedFile(idx);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || !subject || !gradeLevel}
              className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
            >
              <FileUp size={16} />
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : 'Files'}
            </Button>
            {selectedFiles.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => setSelectedFiles([])}
                className="text-slate-500"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Uploads */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Active Uploads
            </p>
            {uploadingFiles.map((uf) => (
              <div
                key={uf.id}
                className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3"
              >
                <Loader2 size={16} className="animate-spin text-sky-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0a1628] truncate">{uf.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={uf.progress} className="h-1.5 flex-1" />
                    <span className="text-[11px] font-bold text-sky-600">{uf.progress}%</span>
                  </div>
                </div>
                {uf.status === 'done' && (
                  <CheckCircle2 size={16} className="text-teal-500 flex-shrink-0" />
                )}
                {uf.status === 'error' && (
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Status List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            Processing Jobs
          </p>
          {jobs.length > 0 && (
            <p className="text-xs text-slate-400">{jobs.length} job(s)</p>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <FileText size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-400">No processing jobs yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Upload a PDF to start the ingestion pipeline
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status];
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border px-4 py-3 ${cfg.bgColor}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <StatusIcon status={job.status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-[#0a1628] truncate">
                          {job.fileName}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-1.5 py-0 ${cfg.color} border-current`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>{formatSize(job.fileSize)}</span>
                        <span>·</span>
                        <span>
                          {PDF_SUBJECT_OPTIONS.find((o) => o.value === job.subject)?.label ||
                            job.subject}
                        </span>
                        <span>·</span>
                        <span>
                          {GRADE_LEVEL_OPTIONS.find((o) => o.value === job.gradeLevel)?.label ||
                            job.gradeLevel}
                        </span>
                        <span>·</span>
                        <span>{job.createdAt.toLocaleString()}</span>
                      </div>
                      {/* Progress bar for active jobs */}
                      {(job.status === 'uploading' ||
                        job.status === 'processing' ||
                        job.status === 'queued') && (
                        <div className="flex items-center gap-2 mt-2">
                          <Progress
                            value={job.status === 'uploading' ? job.progress : job.status === 'processing' ? 50 : 10}
                            className="h-1.5 flex-1"
                          />
                          <span className="text-[10px] font-bold text-slate-500">
                            {job.status === 'uploading'
                              ? `${job.progress}%`
                              : job.status === 'processing'
                              ? 'Processing...'
                              : 'Waiting...'}
                          </span>
                        </div>
                      )}
                      {/* Error message */}
                      {job.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">{job.errorMessage}</p>
                      )}
                      {/* Completed info */}
                      {job.status === 'completed' && job.chunksCount && (
                        <p className="text-xs text-teal-600 mt-1">
                          {job.chunksCount} chunks indexed
                          {job.processingTimeMs
                            ? ` in ${(job.processingTimeMs / 1000).toFixed(1)}s`
                            : ''}
                        </p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(job.status === 'queued' || job.status === 'uploading') && (
                        <button
                          type="button"
                          onClick={() => handleCancel(job.id)}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-red-500 transition-colors"
                          aria-label="Cancel job"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {job.status === 'failed' && (
                        <button
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-sky-500 transition-colors"
                          aria-label="Retry upload"
                          title="Retry"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                      {(job.status === 'completed' ||
                        job.status === 'failed' ||
                        job.status === 'cancelled') && (
                        <button
                          type="button"
                          onClick={() => handleDelete(job.id)}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-red-500 transition-colors"
                          aria-label="Remove job"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700 mb-2">
          How it works
        </p>
        <ul className="text-sm text-sky-800 space-y-1 list-disc list-inside">
          <li>
            <strong>Upload</strong> — Select a subject and grade level, then drag & drop PDF files.
          </li>
          <li>
            <strong>Queue</strong> — Files are uploaded to Firebase Storage and queued for processing.
          </li>
          <li>
            <strong>Process</strong> — The backend ingests PDFs into the RAG vector store (ChromaDB).
          </li>
          <li>
            <strong>Track</strong> — Job status updates in real-time via Firestore subscriptions.
          </li>
        </ul>
      </div>
    </motion.div>
  );
};

export default PDFUploadManager;