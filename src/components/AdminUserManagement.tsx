import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus, Download, 
  Edit, Trash2, Shield, Ban, Users, UserCheck, 
  GraduationCap, School, Loader2, RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  getAllUsers,
  updateAdminUser,
  deleteAdminUser,
  createAdminUser,
  addAuditLog,
  type AdminUser,
} from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const AdminUserManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Student',
    status: 'Active',
    department: '',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'Student', status: 'Active', department: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department,
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await updateAdminUser(editingUser.id, formData);
        await addAuditLog(
          'User Updated',
          'User',
          'Info',
          `Updated user: ${formData.name} (${formData.email})`,
          { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
        );
        toast.success('User updated successfully');
      } else {
        await createAdminUser(formData.email, formData.name, formData.role, formData.department);
        await addAuditLog(
          'Created New User',
          'User',
          'Info',
          `Created new ${formData.role.toLowerCase()} account: ${formData.name} (${formData.email})`,
          { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
        );
        toast.success('User created successfully');
      }
      await loadUsers();
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAdminUser(id);
      await addAuditLog(
        'User Deleted',
        'User',
        'Warning',
        `Deleted user account: ${name}`,
        { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
      );
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateAdminUser(user.id, { status: newStatus });
      await addAuditLog(
        'User Status Changed',
        'User',
        'Warning',
        `${newStatus === 'Active' ? 'Activated' : 'Deactivated'} user: ${user.email}`,
        { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
      );
      toast.success(`User ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Stats — derived from real Firestore data
  const stats = [
    { label: 'Total Users', value: users.length, color: 'text-[#0a1628]' },
    { label: 'Active', value: users.filter(u => u.status === 'Active').length, color: 'text-green-600' },
    { label: 'Admins', value: users.filter(u => u.role === 'Admin').length, color: 'text-sky-600' },
    { label: 'Teachers', value: users.filter(u => u.role === 'Teacher').length, color: 'text-sky-600' },
    { label: 'Students', value: users.filter(u => u.role === 'Student').length, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 size={28} className="animate-spin text-sky-500" />
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm">
            <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.value}</h3>
            <p className="text-sm text-[#5a6578]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input 
            placeholder="Search users by name or email..." 
            className="pl-10 bg-[#edf1f7] border-[#dde3eb]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] bg-[#edf1f7] border-[#dde3eb]">
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
              <SelectTrigger className="w-[140px] bg-[#edf1f7] border-[#dde3eb]">
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
            <Button variant="outline" className="gap-2 border-[#dde3eb] text-[#5a6578]" onClick={loadUsers}>
              <RefreshCw size={16} />
              Refresh
            </Button>
            <Button 
              className="gap-2 bg-sky-500 hover:bg-sky-600 text-white"
              onClick={handleOpenAddModal}
            >
              <Plus size={16} />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#dde3eb] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#5a6578] uppercase bg-[#edf1f7] border-b border-[#dde3eb]">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Department/Grade</th>
                <th className="px-6 py-4 font-semibold">Last Login</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde3eb]">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#edf1f7]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photo} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-[#0a1628]">{user.name}</p>
                          <p className="text-xs text-[#5a6578]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {user.role === 'Admin' && <Shield size={14} className="text-sky-600" />}
                        {user.role === 'Teacher' && <GraduationCap size={14} className="text-sky-600" />}
                        {user.role === 'Student' && <School size={14} className="text-emerald-600" />}
                        <span className={`
                          font-medium text-xs px-2 py-0.5 rounded-full
                          ${user.role === 'Admin' ? 'bg-sky-100 text-sky-700' : ''}
                          ${user.role === 'Teacher' ? 'bg-sky-100 text-sky-700' : ''}
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
                          : 'bg-[#edf1f7] text-[#5a6578] border-[#dde3eb]'}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-[#a8a5b3]'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#5a6578]">{user.department}</td>
                    <td className="px-6 py-4 text-[#5a6578]">{user.lastLogin}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.status === 'Active' 
                              ? 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
                              : 'text-orange-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.status === 'Active' ? <Ban size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#5a6578]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-[#edf1f7] rounded-full">
                        <Users size={24} className="text-slate-500" />
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
              <label htmlFor="name" className="text-right text-sm font-medium text-[#0a1628]">Name</label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right text-sm font-medium text-[#0a1628]">Email</label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="role" className="text-right text-sm font-medium text-[#0a1628]">Role</label>
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
              <label htmlFor="status" className="text-right text-sm font-medium text-[#0a1628]">Status</label>
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
              <label htmlFor="department" className="text-right text-sm font-medium text-[#0a1628]">Dept/Grade</label>
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
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveUser} className="bg-sky-600 hover:bg-sky-700 text-white" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
