import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, MoreVertical,
  Trash2, Eye, RefreshCw, AlertCircle, RotateCcw, ChevronRight, Database, FileSpreadsheet
} from 'lucide-react';
import { collection, query, getDocs, deleteDoc, doc, orderBy, limit as firestoreLimit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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

      // Load course materials
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

      // Load class record imports
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

      // Sort by date descending
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
      // Delete the main document
      await deleteDoc(doc(db, record.collection, id));

      // If it's a class record import, also delete associated normalizedClassRecords
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
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.teacherEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.className || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  const courseMaterialCount = records.filter((r) => r.type === 'Course Material').length;
  const classRecordCount = records.filter((r) => r.type === 'Class Record').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col min-h-full bg-slate-50/50 relative"
    >
      <div className="flex-1 space-y-8 pt-6 xl:pt-8 pb-6 px-1 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-[#0a1628]">Content & Upload Management</h2>
          <p className="text-sm text-[#5a6578]">Manage uploaded course materials and class records. Delete to clean storage and RAG pipeline.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Database size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0a1628]">{records.length}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Uploads</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0a1628]">{courseMaterialCount}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Course Materials</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0a1628]">{classRecordCount}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Class Records</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col xl:flex-row items-center gap-3">
          <Button variant="outline" className="h-10 gap-2 rounded-xl" onClick={loadRecords} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by filename, teacher, or class..."
              className="pl-9 h-10 rounded-xl text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 rounded-xl min-w-[160px] justify-between">
                <span>{filterType === 'All' ? 'All Types' : filterType}</span>
                <Filter size={14} className="opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              {['All', 'Course Material', 'Class Record'].map((type) => (
                <DropdownMenuItem key={type} onClick={() => setFilterType(type)}>
                  {type === 'All' ? 'All Types' : type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setSearchTerm(''); setFilterType('All'); }}
            disabled={!searchTerm && filterType === 'All'}
            className="h-10 w-10 rounded-xl"
          >
            <RotateCcw size={16} />
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#9956DE]">
                  <th className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-wider">Filename</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-wider">Class</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-wider">Uploaded</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <RefreshCw size={20} className="animate-spin text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Loading uploads...</p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <AlertCircle size={24} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No uploads found</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            record.type === 'Course Material' ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {record.type === 'Course Material' ? <FileText size={16} /> : <FileSpreadsheet size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1e293b] truncate max-w-[200px]">{record.title}</p>
                            <p className="text-[11px] text-slate-400">.{record.fileType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${
                          record.type === 'Course Material' ? 'text-purple-600 border-purple-200 bg-purple-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50'
                        }`}>
                          {record.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">{record.teacherEmail}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">{record.className || record.classSectionId || '—'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => setDeleteConfirmId(record.id)}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-2 py-2 text-xs text-slate-500">
          <span>Showing {filteredRecords.length} of {records.length} records</span>
          <span className="text-[11px] text-slate-400">Deleting removes Firestore metadata and associated normalized records</span>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) handleDelete(deleteConfirmId); }}
        title="Delete Upload"
        message="This will permanently delete this upload and its associated data from Firestore. This cannot be undone."
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        type="danger"
        icon="delete"
      />
    </motion.div>
  );
};

export default AdminContent;
