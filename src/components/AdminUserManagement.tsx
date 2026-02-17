import React, { useState } from 'react';
import { 
  Search, Plus, Filter, Download, MoreVertical, 
  Edit, Trash2, Shield, Ban, Users, UserCheck, 
  GraduationCap, School
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

// Mock Data
const initialUsers = [
  {
    id: 1,
    name: 'Sarah Chen',
    email: 'sarah.chen@student.edu',
    role: 'Student',
    status: 'Active',
    department: 'Grade 12',
    lastLogin: 'Never',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    id: 2,
    name: 'Alex Johnson',
    email: 'alex.j@student.edu',
    role: 'Student',
    status: 'Active',
    department: 'Grade 11',
    lastLogin: 'Invalid Date',
    avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop'
  },
  {
    id: 3,
    name: 'Prof. Michael Brown',
    email: 'm.brown@mathpulse.edu',
    role: 'Teacher',
    status: 'Active',
    department: 'Mathematics',
    lastLogin: '2 hours ago',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
  },
  {
    id: 4,
    name: 'Emily Davis',
    email: 'emily.d@student.edu',
    role: 'Student',
    status: 'Inactive',
    department: 'Grade 10',
    lastLogin: '5 days ago',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop'
  },
  {
    id: 5,
    name: 'James Wilson',
    email: 'j.wilson@admin.edu',
    role: 'Admin',
    status: 'Active',
    department: 'IT Dept',
    lastLogin: 'Just now',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
  }
];

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(typeof initialUsers)[number] | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Student',
    status: 'Active',
    department: ''
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'Student',
      status: 'Active',
      department: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: (typeof initialUsers)[number]) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      // Edit existing
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
    } else {
      // Add new
      const newUser = {
        id: users.length + 1,
        ...formData,
        lastLogin: 'Never',
        avatar: `https://ui-avatars.com/api/?name=${formData.name}&background=random`
      };
      setUsers([...users, newUser]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteUser = (id: number) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const handleToggleStatus = (id: number) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' };
      }
      return u;
    }));
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Stats
  const stats = [
    { label: 'Total Users', value: users.length, color: 'text-slate-800' },
    { label: 'Active', value: users.filter(u => u.status === 'Active').length, color: 'text-green-600' },
    { label: 'Admins', value: users.filter(u => u.role === 'Admin').length, color: 'text-purple-600' },
    { label: 'Teachers', value: users.filter(u => u.role === 'Teacher').length, color: 'text-blue-600' },
    { label: 'Students', value: users.filter(u => u.role === 'Student').length, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.value}</h3>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search users by name or email..." 
            className="pl-10 bg-slate-50 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Roles">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Teacher">Teacher</SelectItem>
                <SelectItem value="Student">Student</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 border-slate-200 text-slate-600">
              <Download size={16} />
              Export
            </Button>
            <Button 
              className="gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleOpenAddModal}
            >
              <Plus size={16} />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Department/Grade</th>
                <th className="px-6 py-4 font-semibold">Last Login</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {user.role === 'Admin' && <Shield size={14} className="text-purple-600" />}
                        {user.role === 'Teacher' && <GraduationCap size={14} className="text-blue-600" />}
                        {user.role === 'Student' && <School size={14} className="text-emerald-600" />}
                        <span className={`
                          font-medium text-xs px-2 py-0.5 rounded-full
                          ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : ''}
                          ${user.role === 'Teacher' ? 'bg-blue-100 text-blue-700' : ''}
                          ${user.role === 'Student' ? 'bg-emerald-100 text-emerald-700' : ''}
                        `}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                        ${user.status === 'Active' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-slate-50 text-slate-600 border-slate-200'}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.department}</td>
                    <td className="px-6 py-4 text-slate-500">{user.lastLogin}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.status === 'Active' 
                              ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                              : 'text-orange-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={user.status === 'Active' ? "Deactivate User" : "Activate User"}
                        >
                          {user.status === 'Active' ? <Ban size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-slate-100 rounded-full">
                        <Users size={24} className="text-slate-400" />
                      </div>
                      <p>No users found matching your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User Access' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Update user details and manage access permissions.' 
                : 'Create a new user account and assign roles.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right text-sm font-medium text-slate-700">Name</label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right text-sm font-medium text-slate-700">Email</label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="role" className="text-right text-sm font-medium text-slate-700">Role</label>
              <div className="col-span-3">
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="status" className="text-right text-sm font-medium text-slate-700">Status</label>
              <div className="col-span-3">
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="department" className="text-right text-sm font-medium text-slate-700">Dept/Grade</label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Grade 12 or Mathematics"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
