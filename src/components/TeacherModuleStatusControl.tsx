import React, { useState } from 'react';
import { Upload, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { setModuleStatus } from '../services/moduleWatchService';
import { CURRICULUM_MODULE_BLUEPRINTS, type ModuleStatus } from '../data/curriculumModules';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

interface TeacherModuleStatusControlProps {
  teacherId: string;
}

const STATUS_OPTIONS: { value: ModuleStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'available', label: 'Available', icon: <CheckCircle size={14} />, color: 'text-emerald-600' },
  { value: 'teacher_uploaded', label: 'Teacher Material', icon: <Upload size={14} />, color: 'text-blue-600' },
  { value: 'coming_soon', label: 'Coming Soon', icon: <Clock size={14} />, color: 'text-amber-600' },
  { value: 'unavailable', label: 'Unavailable', icon: <XCircle size={14} />, color: 'text-slate-400' },
];

const TeacherModuleStatusControl: React.FC<TeacherModuleStatusControlProps> = ({ teacherId }) => {
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ModuleStatus>('teacher_uploaded');
  const [uploading, setUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!selectedModuleId) {
      toast.error('Select a module first.');
      return;
    }

    setUploading(true);
    try {
      let pdfUrl: string | undefined;

      if (pdfFile && selectedStatus === 'teacher_uploaded') {
        const storageRef = ref(storage, `teacher_modules/${teacherId}/${selectedModuleId}/${pdfFile.name}`);
        await uploadBytes(storageRef, pdfFile);
        pdfUrl = await getDownloadURL(storageRef);
      }

      await setModuleStatus(selectedModuleId, selectedStatus, teacherId, pdfUrl);
      toast.success(`Module status updated to "${selectedStatus}".`);
      setPdfFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update module status.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-800">Module Availability Control</h4>
        <p className="text-xs text-slate-500 mt-0.5">Set module status or upload alternative PDF when DepEd content is unavailable.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Module</label>
          <select
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select module...</option>
            {CURRICULUM_MODULE_BLUEPRINTS.map((m) => (
              <option key={m.id} value={m.id}>{m.moduleTitle} ({m.quarter})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ModuleStatus)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedStatus === 'teacher_uploaded' && (
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Upload Alternative PDF (optional)</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            className="text-sm text-slate-600"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedModuleId || uploading}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? 'Updating...' : 'Update Status'}
      </button>
    </div>
  );
};

export default TeacherModuleStatusControl;
