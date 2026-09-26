import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search,
  Trash2, RefreshCw, AlertCircle, RotateCcw, Database, FileSpreadsheet,
  ChevronDown, Upload
} from 'lucide-react';
import { collection, query, getDocs, deleteDoc, doc, orderBy, limit as firestoreLimit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface UploadRecord {
  id: string;
  title: string;
  teacherEmail: string;
  type: 'Course Material' | 'Class Record';
  fileType: string;
  classSectionId?: string;
  className?: string;
  createdAt: string;
  collection: string;
}

const TYPE_OPTIONS = ['All', 'Course Material', 'Class Record'] as const;

const AdminContent: React.FC = () => {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const items: UploadRecord[] = [];

      const cmSnap = await getDocs(query(collection(db, 'courseMaterials'), orderBy('createdAt', 'desc'), firestoreLimit(100)));
      cmSnap.docs.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          title: data.fileName || d.id,
          teacherEmail: data.teacherEmail || 'Unknown',
          type: 'Course Material',
          fileType: data.fileType || 'unknown',
          classSectionId: data.classSectionId,
          className: data.className,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || '',
          collection: 'courseMaterials',
        });
      });

      const crSnap = await getDocs(query(collection(db, 'classRecordImports'), orderBy('createdAt', 'desc'), firestoreLimit(100)));
      crSnap.docs.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          title: data.fileName || d.id,
          teacherEmail: data.teacherEmail || 'Unknown',
          type: 'Class Record',
          fileType: data.fileType || 'csv',
          classSectionId: data.classSectionId,
          className: data.className,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || '',
          collection: 'classRecordImports',
        });
      });

      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setRecords(items);
    } catch (err) {
      console.error('[AdminContent] Failed to load records:', err);
      toast.error('Failed to load content records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleDelete = async (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, record.collection, id));
      if (record.collection === 'classRecordImports') {
        const normSnap = await getDocs(query(collection(db, 'normalizedClassRecords'), where('importId', '==', id)));
        const deletePromises = normSnap.docs.map((d) => deleteDoc(d.ref));
        await Promise.allSettled(deletePromises);
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmId(null);
      toast.success(`Deleted "${record.title}" and associated data`);
    } catch (err) {
      console.error('[AdminContent] Delete failed:', err);
      toast.error('Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.teacherEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.className || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  const courseMaterialCount = records.filter((r) => r.type === 'Course Material').length;
  const classRecordCount = records.filter((r) => r.type === 'Class Record').length;
  const hasActiveFilter = !!searchTerm || filterType !== 'All';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col min-h-full"
    >
      <div className="flex-1 space-y-6 pt-6 xl:pt-8 pb-6 px-1 max-w-[1600px] mx-auto w-full">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Total Files',       sub: 'All uploaded content',   value: records.length,         icon: Database,       gradient: 'from-[#9956DE] via-[#8643C8] to-[#7274ED]', shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.35)]' },
            { label: 'Course Materials',  sub: 'Uploaded by teachers',   value: courseMaterialCount,    icon: FileText,       gradient: 'from-[#38BDF8] via-[#0284C7] to-[#0369A1]', shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.35)]'   },
            { label: 'Class Records',     sub: 'Grade sheets & records', value: classRecordCount,       icon: FileSpreadsheet,gradient: 'from-[#75D06A] via-[#52B847] to-[#36962C]', shadow: 'shadow-[0_8px_24px_-6px_rgba(82,184,71,0.35)]'   },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`group relative bg-gradient-to-br ${stat.gradient} ${stat.shadow} border border-white/25 rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0">
                <stat.icon size={16} className="sm:hidden" />
                <stat.icon size={20} className="hidden sm:block" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-3xl font-black text-white tabular-nums leading-none">{stat.value}</p>
                <p className="text-[11px] sm:text-xs font-bold text-white/95 mt-1">{stat.label}</p>
                <p className="text-[10px] text-white/70 mt-0.5 hidden sm:block truncate">{stat.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Table Card with integrated toolbar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Brand accent strip */}
          <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />

          {/* Integrated header toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#9956DE]" />
                Uploaded Files
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {filteredRecords.length} of {records.length} files
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Search */}
              <div className="relative flex-1 sm:w-[220px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search files or teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#9956DE] focus:ring-1 focus:ring-[#9956DE]/30 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* Type filter */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#9956DE] focus:ring-1 focus:ring-[#9956DE]/30 text-slate-700 dark:text-slate-200 font-medium transition-all cursor-pointer"
                >
                  {TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Clear filters */}
              {hasActiveFilter && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterType('All'); }}
                  title="Clear filters"
                  className="p-2 h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <RotateCcw size={13} />
                </button>
              )}

              {/* Refresh */}
              <button
                onClick={loadRecords}
                disabled={loading}
                title="Refresh"
                className="p-2 h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/95 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/60">
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">File</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Teacher</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Uploaded</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
                          <div className="space-y-1.5">
                            <div className="w-32 h-3 rounded bg-slate-100 dark:bg-slate-800" />
                            <div className="w-16 h-2 rounded bg-slate-100 dark:bg-slate-800" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="w-20 h-3 rounded bg-slate-100 dark:bg-slate-800 mx-auto" />
                        </td>
                      ))}
                      <td className="px-4 py-3.5 text-center">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 px-6">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                          {hasActiveFilter
                            ? <AlertCircle size={22} className="text-slate-300 dark:text-slate-600" />
                            : <Upload size={22} className="text-slate-300 dark:text-slate-600" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {hasActiveFilter ? 'No results match your filter' : 'No files uploaded yet'}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {hasActiveFilter ? 'Try clearing the search or type filter.' : 'Teachers can upload course materials and class records.'}
                          </p>
                        </div>
                        {hasActiveFilter && (
                          <button
                            onClick={() => { setSearchTerm(''); setFilterType('All'); }}
                            className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 underline underline-offset-2"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="group hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-all border-l-2 border-l-transparent hover:border-l-[#9956DE]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 ${
                            record.type === 'Course Material'
                              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-500'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500'
                          }`}>
                            {record.type === 'Course Material' ? <FileText size={16} /> : <FileSpreadsheet size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px] group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                              {record.title}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">.{record.fileType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          record.type === 'Course Material'
                            ? 'text-purple-600 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/40'
                            : 'text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40'
                        }`}>
                          {record.type === 'Course Material' ? 'Material' : 'Record'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">{record.teacherEmail}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                          {record.className || record.classSectionId || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {record.createdAt
                            ? new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setDeleteConfirmId(record.id)}
                          title="Delete file"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200/80 dark:hover:border-rose-800/50 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && records.length > 0 && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Showing {filteredRecords.length} of {records.length} files
                {hasActiveFilter && <span className="ml-1 text-purple-500 font-semibold">(filtered)</span>}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
                Deleting a file removes it and all its associated data permanently.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) handleDelete(deleteConfirmId); }}
        title="Delete File"
        message="This will permanently delete this file and all its associated data. This cannot be undone."
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        type="danger"
        icon="delete"
      />
    </motion.div>
  );
};

export default AdminContent;
