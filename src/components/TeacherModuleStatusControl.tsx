import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Upload, CheckCircle, Clock, XCircle, FileText, Search, 
  Check, Sparkles, ExternalLink, X
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { setModuleStatus } from '../services/moduleWatchService';
import { CURRICULUM_MODULE_BLUEPRINTS, type ModuleStatus, type CurriculumModuleBlueprint } from '../data/curriculumModules';
import { SHS_MATH_SUBJECTS } from '../data/subjects';

interface TeacherModuleStatusControlProps {
  teacherId: string;
}

interface ModuleOverrideData {
  status: ModuleStatus;
  teacherPdfUrl?: string;
  updatedAt?: string;
}

const STATUS_CONFIG: Record<ModuleStatus, {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
  borderClass: string;
  activeBg: string;
  description: string;
}> = {
  available: {
    label: 'Available',
    icon: <CheckCircle size={14} className="text-emerald-500" />,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    activeBg: 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20',
    description: 'DepEd curriculum content is active and accessible to all students.',
  },
  teacher_uploaded: {
    label: 'Teacher Material',
    icon: <Upload size={14} className="text-sky-500" />,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    borderClass: 'border-sky-200 hover:border-sky-400',
    activeBg: 'bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20',
    description: 'Custom teacher PDF is provided for student study and review.',
  },
  coming_soon: {
    label: 'Coming Soon',
    icon: <Clock size={14} className="text-amber-500" />,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    borderClass: 'border-amber-200 hover:border-amber-400',
    activeBg: 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20',
    description: 'Module is queued; students can subscribe to notifications.',
  },
  unavailable: {
    label: 'Unavailable',
    icon: <XCircle size={14} className="text-slate-400" />,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    borderClass: 'border-slate-200 hover:border-slate-400',
    activeBg: 'bg-slate-100 border-slate-500 ring-2 ring-slate-500/20',
    description: 'Module is hidden or temporarily disabled for students.',
  },
};

const ALL_STATUS_KEYS: ModuleStatus[] = ['available', 'teacher_uploaded', 'coming_soon', 'unavailable'];

const SUBJECT_NAMES = SHS_MATH_SUBJECTS.reduce<Record<string, string>>((acc, subj) => {
  acc[subj.id] = subj.name;
  return acc;
}, {});

const TeacherModuleStatusControl: React.FC<TeacherModuleStatusControlProps> = ({ teacherId }) => {
  const [overrides, setOverrides] = useState<Record<string, ModuleOverrideData>>({});
  const [loadingOverrides, setLoadingOverrides] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [editingBlueprint, setEditingBlueprint] = useState<CurriculumModuleBlueprint | null>(null);
  const [modalStatus, setModalStatus] = useState<ModuleStatus>('available');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load Firestore module status overrides
  const loadOverrides = useCallback(async () => {
    setLoadingOverrides(true);
    try {
      const snap = await getDocs(collection(db, 'modules'));
      const overrideMap: Record<string, ModuleOverrideData> = {};
      snap.forEach((docSnap) => {
        const docRecord = docSnap.data();
        // SAFETY: trusted internal value already conforms to the asserted type.
        const resolvedStatus = (docRecord.moduleStatus || docRecord.status || 'available') as ModuleStatus;
        overrideMap[docSnap.id] = {
          status: resolvedStatus,
          teacherPdfUrl: docRecord.teacherPdfUrl,
          updatedAt: docRecord.updatedAt?.toDate?.()?.toLocaleDateString(),
        };
      });
      setOverrides(overrideMap);
    } catch (fetchErr) {
      console.warn('[TeacherModuleStatusControl] Failed to load module overrides:', fetchErr);
    } finally {
      setLoadingOverrides(false);
    }
  }, []);

  useEffect(() => {
    loadOverrides();
  }, [loadOverrides]);

  // Open modal for a specific module
  const handleOpenEdit = (blueprint: CurriculumModuleBlueprint) => {
    const currentOverride = overrides[blueprint.id];
    setEditingBlueprint(blueprint);
    setModalStatus(currentOverride?.status || 'available');
    setPdfFile(null);
  };

  const handleCloseEdit = () => {
    if (uploading) return;
    setEditingBlueprint(null);
    setPdfFile(null);
  };

  // Submit modal update
  const handleSaveStatus = async () => {
    if (!editingBlueprint) return;

    setUploading(true);
    try {
      let uploadedPdfUrl: string | undefined = overrides[editingBlueprint.id]?.teacherPdfUrl;

      if (pdfFile && modalStatus === 'teacher_uploaded') {
        const storageRef = ref(storage, `teacher_modules/${teacherId}/${editingBlueprint.id}/${pdfFile.name}`);
        await uploadBytes(storageRef, pdfFile);
        uploadedPdfUrl = await getDownloadURL(storageRef);
      }

      await setModuleStatus(editingBlueprint.id, modalStatus, teacherId, uploadedPdfUrl);

      setOverrides((prev) => ({
        ...prev,
        [editingBlueprint.id]: {
          status: modalStatus,
          teacherPdfUrl: uploadedPdfUrl,
          updatedAt: new Date().toLocaleDateString(),
        },
      }));

      toast.success(`"${editingBlueprint.moduleTitle}" updated to ${STATUS_CONFIG[modalStatus].label}.`);
      handleCloseEdit();
    } catch (saveErr) {
      const errorMsg = saveErr instanceof Error ? saveErr.message : 'Failed to update module status.';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  // Filtered module list
  const filteredModules = useMemo(() => {
    return CURRICULUM_MODULE_BLUEPRINTS.filter((bp) => {
      if (subjectFilter !== 'all' && bp.subjectId !== subjectFilter) return false;
      if (quarterFilter !== 'all' && bp.quarter !== quarterFilter) return false;
      const effectiveStatus = overrides[bp.id]?.status || 'available';
      if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        const matchesTitle = bp.moduleTitle.toLowerCase().includes(queryLower);
        const matchesDomain = bp.contentDomain?.toLowerCase().includes(queryLower);
        const matchesId = bp.id.toLowerCase().includes(queryLower);
        if (!matchesTitle && !matchesDomain && !matchesId) return false;
      }
      return true;
    });
  }, [overrides, subjectFilter, quarterFilter, statusFilter, searchQuery]);

  // Status counts for summary banner
  const statusCounts = useMemo(() => {
    const counts = { total: CURRICULUM_MODULE_BLUEPRINTS.length, available: 0, teacher_uploaded: 0, coming_soon: 0, unavailable: 0 };
    CURRICULUM_MODULE_BLUEPRINTS.forEach((bp) => {
      const effective = overrides[bp.id]?.status || 'available';
      counts[effective] = (counts[effective] || 0) + 1;
    });
    return counts;
  }, [overrides]);

  return (
    <div className="space-y-6">
      {/* Header Info & Stats */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Curriculum Module Availability
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Control student access for DepEd modules or attach custom teacher PDFs when standard content is unavailable.
            </p>
          </div>
          <button
            type="button"
            onClick={loadOverrides}
            disabled={loadingOverrides}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 self-start sm:self-auto px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
          >
            {loadingOverrides ? 'Syncing...' : 'Refresh Statuses'}
          </button>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Available</p>
              <p className="text-lg font-bold text-emerald-900">{statusCounts.available}</p>
            </div>
          </div>

          <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Upload size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-sky-700 uppercase tracking-wide">Teacher Material</p>
              <p className="text-lg font-bold text-sky-900">{statusCounts.teacher_uploaded}</p>
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Coming Soon</p>
              <p className="text-lg font-bold text-amber-900">{statusCounts.coming_soon}</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <XCircle size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Unavailable</p>
              <p className="text-lg font-bold text-slate-800">{statusCounts.unavailable}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 min-w-[200px]">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search module title, code, or domain..."
            className="bg-transparent text-xs sm:text-sm text-slate-800 outline-none w-full"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Subjects</option>
            {SHS_MATH_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Quarter Filter */}
          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Quarters</option>
            <option value="Q1">Quarter 1</option>
            <option value="Q2">Quarter 2</option>
            <option value="Q3">Quarter 3</option>
            <option value="Q4">Quarter 4</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="teacher_uploaded">Teacher Material</option>
            <option value="coming_soon">Coming Soon</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Module List Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 sm:px-6 py-3.5">Module</th>
                <th className="px-4 sm:px-6 py-3.5">Subject & Quarter</th>
                <th className="px-4 sm:px-6 py-3.5">Availability Status</th>
                <th className="px-4 sm:px-6 py-3.5">Material</th>
                <th className="px-4 sm:px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No curriculum modules match your selected filters.
                  </td>
                </tr>
              ) : (
                filteredModules.map((bp) => {
                  const override = overrides[bp.id];
                  const currentStatus: ModuleStatus = override?.status || 'available';
                  const config = STATUS_CONFIG[currentStatus];
                  const subjectName = SUBJECT_NAMES[bp.subjectId] || bp.subjectId;

                  return (
                    <tr key={bp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <p className="font-bold text-slate-900">{bp.moduleTitle}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{bp.id}</p>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-semibold">
                            {subjectName}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold">
                            {bp.quarter}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.badgeClass}`}>
                          {config.icon}
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {override?.teacherPdfUrl ? (
                          <a
                            href={override.teacherPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                          >
                            <FileText size={13} />
                            Custom PDF
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">DepEd Standard</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(bp)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Status Modal Dialog */}
      {editingBlueprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Configure Module Availability</h4>
                <p className="text-xs text-slate-500 mt-0.5">{editingBlueprint.moduleTitle} ({editingBlueprint.quarter})</p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={uploading}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Select Availability Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ALL_STATUS_KEYS.map((statusKey) => {
                    const option = STATUS_CONFIG[statusKey];
                    const isSelected = modalStatus === statusKey;
                    return (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setModalStatus(statusKey)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected ? option.activeBg : `${option.borderClass} bg-white`
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            {option.icon}
                            {option.label}
                          </span>
                          {isSelected && <Check size={14} className="text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PDF Upload when teacher_uploaded is selected */}
              {modalStatus === 'teacher_uploaded' && (
                <div className="border border-dashed border-sky-300 rounded-xl p-4 bg-sky-50/40 space-y-2">
                  <label className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <Upload size={14} className="text-sky-600" />
                    Upload Alternative PDF Material
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Upload your custom lesson PDF for this module. Students will download this document when studying.
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-800 hover:file:bg-sky-200 cursor-pointer"
                  />
                  {pdfFile && (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 pt-1">
                      <Check size={12} />
                      Selected: {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                    </p>
                  )}
                  {overrides[editingBlueprint.id]?.teacherPdfUrl && !pdfFile && (
                    <p className="text-[11px] text-slate-500 italic">
                      Current file uploaded. Selecting a new file will overwrite it.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={uploading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={uploading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin text-white">...</span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherModuleStatusControl;

