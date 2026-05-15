import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, MoreVertical, 
  Trash2, Edit2, Eye, Download, RefreshCw, 
  CheckCircle, XCircle, AlertCircle, RotateCcw, ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from './ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from './ConfirmModal';

interface ContentModule {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  type: 'PDF' | 'Template' | 'Quiz' | 'Interactive';
  status: 'Published' | 'Draft' | 'Archived';
  lastModified: string;
  author: string;
  size?: string;
}

const AdminContent: React.FC = () => {
  const [modules, setModules] = useState<ContentModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Mock data loading
  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setModules([
        {
          id: '1',
          title: 'Introduction to Functions',
          subject: 'General Mathematics',
          gradeLevel: 'Grade 11',
          type: 'PDF',
          status: 'Published',
          lastModified: '2024-03-10',
          author: 'Admin User',
          size: '2.4 MB'
        },
        {
          id: '2',
          title: 'Unit Circle Trigonometry',
          subject: 'Pre-Calculus',
          gradeLevel: 'Grade 11',
          type: 'Template',
          status: 'Published',
          lastModified: '2024-03-08',
          author: 'Curriculum Team',
          size: '1.1 MB'
        },
        {
          id: '3',
          title: 'Limits and Continuity',
          subject: 'Basic Calculus',
          gradeLevel: 'Grade 12',
          type: 'Interactive',
          status: 'Draft',
          lastModified: '2024-03-12',
          author: 'Admin User',
          size: '4.8 MB'
        },
        {
          id: '4',
          title: 'Hypothesis Testing',
          subject: 'Stats & Probability',
          gradeLevel: 'Grade 11',
          type: 'Quiz',
          status: 'Published',
          lastModified: '2024-03-05',
          author: 'Teacher Sarah',
          size: '0.5 MB'
        }
      ]);
      setLoading(false);
    }, 800);
  };

  const handleDelete = (id: string) => {
    setModules(modules.filter(m => m.id !== id));
    setDeleteConfirmId(null);
    toast.success('Module deleted successfully');
  };

  const handleOpenAdd = () => {
    setShowAddModal(true);
  };

  const filteredModules = modules.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || m.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Published':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">Published</Badge>;
      case 'Draft':
        return <Badge variant="outline" className="text-slate-400 border-slate-200">Draft</Badge>;
      case 'Archived':
        return <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50">Archived</Badge>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText size={14} className="text-blue-500" />;
      case 'Template': return <Eye size={14} className="text-purple-500" />;
      case 'Quiz': return <Eye size={14} className="text-orange-500" />;
      case 'Interactive': return <Eye size={14} className="text-emerald-500" />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col min-h-full bg-slate-50/50 relative"
    >
      <div className="flex-1 space-y-8 pt-6 xl:pt-8 pb-6 px-1 max-w-[1600px] mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-[#0a1628]">Content Management</h2>
        <p className="text-sm text-[#5a6578]">Manage learning modules, templates, and educational content</p>
      </div>

      {/* Action Bar */}
      <div className="sticky top-0 z-40 -mx-[24px] xl:-mx-[32px] px-[24px] xl:px-[32px] pt-4 pb-4 bg-[#f8fafc]">
        <div className="flex flex-col xl:flex-row items-center gap-3">
            <div className="flex items-center gap-3 w-full xl:w-auto">
            <Button variant="outline" className="h-12 gap-2 border-slate-200/60 hover:bg-slate-50 text-slate-600 rounded-2xl shadow-md shadow-slate-200/40 transition-all" onClick={loadModules}>
                <RefreshCw size={16} />
                Refresh
              </Button>
              <Button className="h-12 gap-2 bg-[#9956DE] hover:bg-[#8b5cf6] text-white rounded-2xl shadow-lg shadow-purple-200/50 transition-all px-6 font-black uppercase text-[11px] tracking-widest" onClick={handleOpenAdd}>
                <Plus size={16} />
                New Content
              </Button>
            </div>
            
            <div className="relative flex-1 w-full group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#9956DE] transition-colors" />
              <Input 
                placeholder="Search by title or subject..." 
                className="pl-11 h-12 bg-slate-50/50 border-slate-200/60 rounded-2xl focus-visible:ring-[#9956DE]/20 focus-visible:border-[#9956DE] transition-all text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 w-[200px] bg-white border border-slate-200 hover:border-[#9956DE] transition-all focus:ring-2 focus:ring-[#9956DE]/10 text-[11px] font-black uppercase tracking-wider text-slate-900 rounded-xl shadow-md shadow-slate-200/50 px-4 flex justify-between">
                  <span className="truncate">{filterType === 'All' ? 'All Types' : filterType}</span>
                  <Filter size={14} className="opacity-40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-slate-200 shadow-xl p-1">
                {['All', 'PDF', 'Template', 'Quiz', 'Interactive'].map((type) => (
                  <DropdownMenuItem key={type} onClick={() => setFilterType(type)} className="rounded-lg font-bold uppercase tracking-widest text-[10px] py-2.5">
                    {type === 'All' ? 'All Types' : type}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSearchTerm('');
                setFilterType('All');
              }}
              disabled={!searchTerm && filterType === 'All'}
              className="h-12 w-12 rounded-2xl border-slate-200/60 text-[#9956DE] hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-slate-200/40"
              title="Reset Filters"
            >
              <RotateCcw size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Modules Table */}
      <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm shadow-slate-200/40 relative">
        <div className="rounded-[32px]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-[106px] z-30 shadow-md bg-[#f8fafc]">
              <tr className="border-b border-[#8b5cf6]">
                <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap rounded-tl-[32px]">Title</th>
                <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest">Subject</th>
                <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest">Type</th>
                <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest">Status</th>
                <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest">Modified</th>
                <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest text-right rounded-tr-[32px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(4).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="h-16 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-slate-300" />
                        <span className="text-slate-400 text-sm">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} className="text-slate-200" />
                      <p className="text-slate-400 text-sm">No content modules found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredModules.map((module) => (
                  <tr key={module.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors">
                          {getTypeIcon(module.type)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#1e293b] leading-tight group-hover:text-indigo-600 transition-colors">{module.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{module.size || '0 KB'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-black text-slate-600">{module.subject}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{module.gradeLevel}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        {module.type}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {getStatusBadge(module.status)}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <p className="text-[11px] font-black text-slate-600 leading-tight">{module.lastModified}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{module.author}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 transition-all">
                            <MoreVertical size={16} className="text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px] rounded-xl border-slate-200 shadow-xl p-1">
                          <DropdownMenuItem className="rounded-lg font-bold text-[10px] uppercase tracking-widest py-2.5 gap-3">
                            <Edit2 size={14} className="text-indigo-500" /> Edit Content
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg font-bold text-[10px] uppercase tracking-widest py-2.5 gap-3">
                            <Eye size={14} className="text-sky-500" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg font-bold text-[10px] uppercase tracking-widest py-2.5 gap-3">
                            <Download size={14} className="text-emerald-500" /> Download
                          </DropdownMenuItem>
                          <div className="h-[1px] bg-slate-100 my-1"></div>
                          <DropdownMenuItem 
                            className="rounded-lg font-bold text-[10px] uppercase tracking-widest py-2.5 gap-3 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                            onClick={() => setDeleteConfirmId(module.id)}
                          >
                            <Trash2 size={14} /> Delete Module
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Standardized Sticky Footer Pagination ── */}
      <div className="sticky bottom-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-12 py-3 bg-white border-t-2 border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] -mx-[24px] xl:-mx-[32px] w-[calc(100%+48px)] xl:w-[calc(100%+64px)]">
        <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9956DE] animate-pulse shadow-[0_0_12px_rgba(153,86,222,0.6)]"></span>
          Showing <span className="text-slate-900 font-black border-b-2 border-[#9956DE]/40 pb-0.5">1–{filteredModules.length}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-400">{filteredModules.length}</span> Total Records
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 h-10 w-10 p-0 hover:bg-purple-50 hover:text-[#9956DE] transition-all disabled:opacity-30" disabled>
            <ChevronRight className="rotate-180" size={18} />
          </Button>
          <div className="flex items-center px-4 h-10 rounded-xl bg-slate-50 border border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-600 gap-2">
            Page <span className="text-slate-900">1</span> <span className="text-slate-300">of</span> 1
          </div>
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 h-10 w-10 p-0 hover:bg-purple-50 hover:text-[#9956DE] transition-all disabled:opacity-30" disabled>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      {/* Stats Summary Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-[#dde3eb] p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-2xl font-display font-black text-[#0a1628]">128</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modules Published</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#dde3eb] p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-2xl font-display font-black text-[#0a1628]">14.2 GB</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Storage used</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#dde3eb] p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-2xl font-display font-black text-[#0a1628]">5</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drafts Pending</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) handleDelete(deleteConfirmId); }}
        title="Delete Content Module"
        message="Are you sure you want to delete this module? This action cannot be undone and will remove the content from all linked subjects."
        confirmText="Delete Module"
        cancelText="Cancel"
        type="danger"
        icon="delete"
      />

      {/* Add Module Dialog - Simplified for mock */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[425px] rounded-[28px] border-[#dde3eb]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0a1628]">Add New Content</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col gap-4">
            <p className="text-sm text-[#5a6578]">This is a mock dialog. In a real system, you would select file types and upload resources here.</p>
            <div className="h-32 border-2 border-dashed border-[#dde3eb] rounded-2xl flex items-center justify-center text-slate-300">
              <Plus size={32} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl">Create Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminContent;
