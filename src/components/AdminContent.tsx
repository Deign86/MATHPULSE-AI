import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Plus, Upload, CheckCircle, FileText, Trash2, 
  MoreHorizontal, Video, HelpCircle, Edit3, Copy, Filter,
  BookOpen, Users
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const AdminContent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const modules = [
    {
      id: 1,
      title: 'Introduction to Derivatives',
      subject: 'Calculus',
      type: 'Video',
      difficulty: 'Beginner',
      status: 'Published',
      assigned: 2,
      created: '9/1/2024'
    },
    {
      id: 2,
      title: 'Derivatives Practice Quiz',
      subject: 'Calculus',
      type: 'Quiz',
      difficulty: 'Intermediate',
      status: 'Published',
      assigned: 1,
      created: '9/5/2024'
    },
    {
      id: 3,
      title: 'Chain Rule Deep Dive',
      subject: 'Calculus',
      type: 'Video',
      difficulty: 'Advanced',
      status: 'Published',
      assigned: 1,
      created: '9/15/2024'
    },
    {
      id: 4,
      title: 'Quadratic Equations Fundamentals',
      subject: 'Algebra',
      type: 'Video',
      difficulty: 'Beginner',
      status: 'Published',
      assigned: 3,
      created: '8/20/2024'
    },
    {
      id: 5,
      title: 'Statistics 101: Probability',
      subject: 'Statistics',
      type: 'Video',
      difficulty: 'Beginner',
      status: 'Draft',
      assigned: 0,
      created: '9/28/2024'
    },
    {
      id: 6,
      title: 'Complex Numbers Quiz',
      subject: 'Algebra',
      type: 'Quiz',
      difficulty: 'Advanced',
      status: 'Draft',
      assigned: 0,
      created: '9/29/2024'
    },
    {
      id: 7,
      title: 'Old Geometry Syllabus',
      subject: 'Geometry',
      type: 'Document',
      difficulty: 'N/A',
      status: 'Archived',
      assigned: 0,
      created: '1/10/2024'
    },
    {
      id: 8,
      title: 'Unit Circle Masterclass',
      subject: 'Trigonometry',
      type: 'Video',
      difficulty: 'Intermediate',
      status: 'Published',
      assigned: 4,
      created: '9/10/2024'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-green-100 text-green-700 border-green-200';
      case 'Draft': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Archived': return 'bg-[#f0eeea] text-[#1a1625] border-[#e8e5de]';
      default: return 'bg-[#f0eeea] text-[#1a1625]';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-violet-50 text-violet-700';
      case 'Intermediate': return 'bg-violet-50 text-violet-700';
      case 'Advanced': return 'bg-purple-50 text-purple-700';
      default: return 'bg-[#f0eeea] text-[#1a1625]';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': return <Video size={16} className="text-purple-600" />;
      case 'Quiz': return <HelpCircle size={16} className="text-teal-600" />;
      default: return <FileText size={16} className="text-[#6b687a]" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Video': return 'bg-purple-100 text-purple-700';
      case 'Quiz': return 'bg-teal-100 text-teal-700';
      default: return 'bg-[#f0eeea] text-[#1a1625]';
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
        <h2 className="text-lg font-bold text-[#1a1625]">Content Management</h2>
        <p className="text-sm text-[#6b687a]">Manage learning modules, templates, and educational content</p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="gap-2 border-[#e8e5de] hover:bg-[#f0eeea]">
          <Upload size={16} />
          Import
        </Button>
        <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Plus size={16} />
          Create Module
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#e8e5de] shadow-sm">
          <p className="text-xs font-bold text-[#6b687a] mb-1">Total Modules</p>
          <p className="text-2xl font-bold text-[#1a1625]">8</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e5de] shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-green-500" />
              <p className="text-xs font-bold text-[#6b687a]">Published</p>
            </div>
            <p className="text-2xl font-bold text-[#1a1625]">5</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e5de] shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Edit3 size={14} className="text-amber-500" />
              <p className="text-xs font-bold text-[#6b687a]">Drafts</p>
            </div>
            <p className="text-2xl font-bold text-[#1a1625]">2</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e5de] shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trash2 size={14} className="text-[#a8a5b3]" />
              <p className="text-xs font-bold text-[#6b687a]">Archived</p>
            </div>
            <p className="text-2xl font-bold text-[#1a1625]">1</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#e8e5de] shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a5b3]" size={18} />
          <Input 
            type="text" 
            placeholder="Search modules by title or topic..." 
            className="pl-10 bg-[#f0eeea] border-[#e8e5de]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="px-3 py-2 rounded-lg border border-[#e8e5de] bg-white text-sm font-medium text-[#6b687a] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option>All Types</option>
            <option>Video</option>
            <option>Quiz</option>
            <option>Document</option>
          </select>
          <select 
            className="px-3 py-2 rounded-lg border border-[#e8e5de] bg-white text-sm font-medium text-[#6b687a] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
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
      <div className="bg-white rounded-xl border border-[#e8e5de] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0eeea] border-b border-[#e8e5de]">
              <th className="p-4 w-10">
                <input type="checkbox" className="rounded border-[#e8e5de] text-violet-600 focus:ring-violet-500" />
              </th>
              <th className="p-4 text-xs font-bold text-[#6b687a] uppercase tracking-wider">Module</th>
              <th className="p-4 text-xs font-bold text-[#6b687a] uppercase tracking-wider">Type</th>
              <th className="p-4 text-xs font-bold text-[#6b687a] uppercase tracking-wider">Difficulty</th>
              <th className="p-4 text-xs font-bold text-[#6b687a] uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-bold text-[#6b687a] uppercase tracking-wider">Assigned</th>
              <th className="p-4 text-xs font-bold text-[#6b687a] uppercase tracking-wider">Created</th>
              <th className="p-4 text-xs font-bold text-[#6b687a] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e5de]">
            {filteredModules.map((module) => (
              <tr key={module.id} className="hover:bg-[#f0eeea] transition-colors group">
                <td className="p-4">
                  <input type="checkbox" className="rounded border-[#e8e5de] text-violet-600 focus:ring-violet-500" />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${module.type === 'Video' ? 'bg-purple-100 text-purple-600' : module.type === 'Quiz' ? 'bg-teal-100 text-teal-600' : 'bg-[#f0eeea] text-[#6b687a]'}`}>
                      {getTypeIcon(module.type)}
                    </div>
                    <div>
                      <p className="font-bold text-[#1a1625] text-sm">{module.title}</p>
                      <p className="text-xs text-[#6b687a]">{module.subject}</p>
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
                  <div className="flex items-center gap-1 text-[#6b687a] text-sm">
                    <Users size={14} />
                    <span>{module.assigned}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-[#6b687a]">
                  {module.created}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-[#e8e5de] rounded-lg text-[#6b687a] hover:text-violet-600 transition-colors">
                      <Edit3 size={16} />
                    </button>
                    <button className="p-2 hover:bg-[#e8e5de] rounded-lg text-[#6b687a] hover:text-[#1a1625] transition-colors">
                      <Copy size={16} />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg text-[#6b687a] hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredModules.length === 0 && (
          <div className="p-12 text-center text-[#6b687a]">
            <BookOpen size={48} className="mx-auto mb-4 text-[#a8a5b3]" />
            <p className="font-medium">No modules found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminContent;
