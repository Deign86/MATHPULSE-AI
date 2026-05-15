import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, MoreVertical, 
  Trash2, Edit2, Eye, Download, RefreshCw, 
  CheckCircle, XCircle, AlertCircle
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
      className="space-y-8 pt-6 xl:pt-8"
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
          New Content
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search modules..." 
              className="pl-9 w-[260px] h-10 border-[#dde3eb] bg-white rounded-xl focus-visible:ring-sky-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-[#dde3eb] rounded-xl h-10">
                <Filter size={16} />
                {filterType}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] rounded-xl border-[#dde3eb] shadow-lg">
              {['All', 'PDF', 'Template', 'Quiz', 'Interactive'].map((type) => (
                <DropdownMenuItem key={type} onClick={() => setFilterType(type)}>
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modules Table */}
      <div className="bg-white rounded-2xl border border-[#dde3eb] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f8fafc] border-b border-[#dde3eb] hover:bg-[#f8fafc]">
              <TableHead className="w-[300px] text-xs font-bold text-[#5a6578] uppercase py-4">Title</TableHead>
              <TableHead className="text-xs font-bold text-[#5a6578] uppercase py-4">Subject</TableHead>
              <TableHead className="text-xs font-bold text-[#5a6578] uppercase py-4">Type</TableHead>
              <TableHead className="text-xs font-bold text-[#5a6578] uppercase py-4">Status</TableHead>
              <TableHead className="text-xs font-bold text-[#5a6578] uppercase py-4">Last Modified</TableHead>
              <TableHead className="text-right py-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(4).fill(0).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell colSpan={6} className="h-16 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-slate-300" />
                      <span className="text-slate-400 text-sm">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredModules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={24} className="text-slate-200" />
                    <p className="text-slate-400 text-sm">No content modules found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredModules.map((module) => (
                <TableRow key={module.id} className="hover:bg-[#f8fafc] transition-colors border-b border-[#f1f5f9]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        {getTypeIcon(module.type)}
                      </div>
                      <div>
                        <p className="font-bold text-[#0a1628] text-sm leading-tight">{module.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{module.author} • {module.size}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[#5a6578]">{module.subject}</span>
                      <span className="text-[11px] text-slate-400">{module.gradeLevel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-[#5a6578]">{module.type}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(module.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500 font-medium">{module.lastModified}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-[#dde3eb] shadow-lg">
                        <DropdownMenuItem className="gap-2">
                          <Edit2 size={14} /> Edit Module
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Download size={14} /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          onClick={() => setDeleteConfirmId(module.id)}
                        >
                          <Trash2 size={14} /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
