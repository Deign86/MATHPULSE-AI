import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Plus, Upload, CheckCircle, FileText, Trash2, 
  Video, HelpCircle, Edit3, Copy,
  BookOpen, Users, Loader2, RefreshCw, X
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  getModules,
  createModule,
  updateModule,
  deleteModule,
  addAuditLog,
  type ContentModule,
} from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const AdminContent: React.FC = () => {
  const { userProfile } = useAuth();
  const [modules, setModules] = useState<ContentModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ContentModule | null>(null);
  const [formData, setFormData] = useState<Omit<ContentModule, 'id'>>({
    title: '',
    subject: '',
    type: 'Video',
    difficulty: 'Beginner',
    status: 'Draft',
    assigned: 0,
    created: new Date().toLocaleDateString(),
  });

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getModules();
      setModules(data);
    } catch {
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const handleOpenAdd = () => {
    setEditingModule(null);
    setFormData({
      title: '',
      subject: '',
      type: 'Video',
      difficulty: 'Beginner',
      status: 'Draft',
      assigned: 0,
      created: new Date().toLocaleDateString(),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mod: ContentModule) => {
    setEditingModule(mod);
    setFormData({
      title: mod.title,
      subject: mod.subject,
      type: mod.type,
      difficulty: mod.difficulty,
      status: mod.status,
      assigned: mod.assigned,
      created: mod.created,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.subject.trim()) {
      toast.error('Title and subject are required');
      return;
    }
    setSaving(true);
    try {
      if (editingModule) {
        await updateModule(editingModule.id, formData);
        await addAuditLog(
          'Module Updated',
          'Content',
          'Info',
          `Updated module: "${formData.title}"`,
          { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
        );
        toast.success('Module updated');
      } else {
        await createModule(formData);
        await addAuditLog(
          'Module Created',
          'Content',
          'Info',
          `Created new module: "${formData.title}" (${formData.subject})`,
          { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
        );
        toast.success('Module created');
      }
      await loadModules();
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mod: ContentModule) => {
    if (!confirm(`Delete "${mod.title}"? This cannot be undone.`)) return;
    try {
      await deleteModule(mod.id);
      await addAuditLog(
        'Module Deleted',
        'Content',
        'Warning',
        `Deleted module: "${mod.title}"`,
        { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
      );
      toast.success('Module deleted');
      setModules(prev => prev.filter(m => m.id !== mod.id));
    } catch {
      toast.error('Failed to delete module');
    }
  };

  // Computed stats from real data
  const totalModules = modules.length;
  const publishedCount = modules.filter(m => m.status === 'Published').length;
  const draftCount = modules.filter(m => m.status === 'Draft').length;
  const archivedCount = modules.filter(m => m.status === 'Archived').length;

  // Note: old hardcoded block below was replaced — no stray variables left
  // (the following legacy lines in the original file are removed)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-green-100 text-green-700 border-green-200';
      case 'Draft': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Archived': return 'bg-[#edf1f7] text-[#0a1628] border-[#dde3eb]';
      default: return 'bg-[#edf1f7] text-[#0a1628]';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-sky-50 text-sky-700';
      case 'Intermediate': return 'bg-sky-50 text-sky-700';
      case 'Advanced': return 'bg-sky-50 text-sky-700';
      default: return 'bg-[#edf1f7] text-[#0a1628]';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': return <Video size={16} className="text-sky-600" />;
      case 'Quiz': return <HelpCircle size={16} className="text-teal-600" />;
      default: return <FileText size={16} className="text-[#5a6578]" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Video': return 'bg-sky-100 text-sky-700';
      case 'Quiz': return 'bg-teal-100 text-teal-700';
      default: return 'bg-[#edf1f7] text-[#0a1628]';
    }
  };

  // Filter logic
  const filteredModules = modules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          module.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All Types' || module.type === selectedType;
    const matchesStatus = selectedStatus === 'All Status' || module.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-[#0a1628]">Content Management</h2>
        <p className="text-sm text-[#5a6578]">Manage learning modules, templates, and educational content</p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="gap-2 border-[#dde3eb] hover:bg-[#edf1f7]" onClick={loadModules}>
          <RefreshCw size={16} />
          Refresh
        </Button>
        <Button className="gap-2 bg-sky-600 hover:bg-sky-700 text-white" onClick={handleOpenAdd}>
          <Plus size={16} />
          Create Module
        </Button>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 size={24} className="animate-spin text-sky-500" />
        </div>
      ) : null}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm">
          <p className="text-xs font-bold text-[#5a6578] mb-1">Total Modules</p>
          <p className="text-2xl font-bold text-[#0a1628]">{totalModules}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-green-500" />
              <p className="text-xs font-bold text-[#5a6578]">Published</p>
            </div>
            <p className="text-2xl font-bold text-[#0a1628]">{publishedCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Edit3 size={14} className="text-rose-500" />
              <p className="text-xs font-bold text-[#5a6578]">Drafts</p>
            </div>
            <p className="text-2xl font-bold text-[#0a1628]">{draftCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trash2 size={14} className="text-slate-500" />
              <p className="text-xs font-bold text-[#5a6578]">Archived</p>
            </div>
            <p className="text-2xl font-bold text-[#0a1628]">{archivedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input 
            type="text" 
            placeholder="Search modules by title or topic..." 
            className="pl-10 bg-[#edf1f7] border-[#dde3eb]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="px-3 py-2 rounded-lg border border-[#dde3eb] bg-white text-sm font-medium text-[#5a6578] focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option>All Types</option>
            <option>Video</option>
            <option>Quiz</option>
            <option>Document</option>
          </select>
          <select 
            className="px-3 py-2 rounded-lg border border-[#dde3eb] bg-white text-sm font-medium text-[#5a6578] focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option>All Status</option>
            <option>Published</option>
            <option>Draft</option>
            <option>Archived</option>
          </select>
        </div>
      </div>

      {/* Modules List */}
      <div className="bg-white rounded-xl border border-[#dde3eb] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#edf1f7] border-b border-[#dde3eb]">
              <th className="p-4 w-10">
                <input type="checkbox" className="rounded border-[#dde3eb] text-sky-600 focus:ring-sky-500" />
              </th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Module</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Type</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Difficulty</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Assigned</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Created</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dde3eb]">
            {filteredModules.map((module) => (
              <tr key={module.id} className="hover:bg-[#edf1f7] transition-colors group">
                <td className="p-4">
                  <input type="checkbox" className="rounded border-[#dde3eb] text-sky-600 focus:ring-sky-500" />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${module.type === 'Video' ? 'bg-sky-100 text-sky-600' : module.type === 'Quiz' ? 'bg-teal-100 text-teal-600' : 'bg-[#edf1f7] text-[#5a6578]'}`}>
                      {getTypeIcon(module.type)}
                    </div>
                    <div>
                      <p className="font-bold text-[#0a1628] text-sm">{module.title}</p>
                      <p className="text-xs text-[#5a6578]">{module.subject}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getTypeBadge(module.type)}`}>
                    {module.type}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getDifficultyColor(module.difficulty)}`}>
                    {module.difficulty}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(module.status)}`}>
                    {module.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 text-[#5a6578] text-sm">
                    <Users size={14} />
                    <span>{module.assigned}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-[#5a6578]">
                  {module.created}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(module)}
                      className="p-2 hover:bg-[#dde3eb] rounded-lg text-[#5a6578] hover:text-sky-600 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(module)}
                      className="p-2 hover:bg-red-50 rounded-lg text-[#5a6578] hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredModules.length === 0 && !loading && (
          <div className="p-12 text-center text-[#5a6578]">
            <BookOpen size={48} className="mx-auto mb-4 text-slate-500" />
            <p className="font-medium">No modules found</p>
            <p className="text-sm">{modules.length === 0 ? 'Create your first module to get started' : 'Try adjusting your search or filters'}</p>
          </div>
        )}
      </div>

      {/* Create / Edit Module Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Edit Module' : 'Create New Module'}</DialogTitle>
            <DialogDescription>
              {editingModule ? 'Update module details below.' : 'Fill in the details to create a new learning module.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium text-[#0a1628]">Title</label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Module title"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium text-[#0a1628]">Subject</label>
              <Input
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Algebra, Calculus"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium text-[#0a1628]">Type</label>
              <div className="col-span-3">
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as ContentModule['type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Quiz">Quiz</SelectItem>
                    <SelectItem value="Document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium text-[#0a1628]">Difficulty</label>
              <div className="col-span-3">
                <Select value={formData.difficulty} onValueChange={v => setFormData({ ...formData, difficulty: v as ContentModule['difficulty'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium text-[#0a1628]">Status</label>
              <div className="col-span-3">
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as ContentModule['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {editingModule ? 'Save Changes' : 'Create Module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminContent;
