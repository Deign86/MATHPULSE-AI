import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus,
  Edit, Trash2, Shield, Ban, Users, UserCheck, 
  GraduationCap, School, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import ConfirmModal from './ConfirmModal';
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
import {
  getFirstValidationError,
  validateAdminCreateUserForm,
  type AdminCreateUserValidationErrors,
} from '../utils/adminUserValidation';

interface AdminUserManagementProps {
  createIntentRole?: 'Teacher' | 'Student' | null;
  onCreateIntentConsumed?: () => void;
}

const buildDefaultFormData = (role: 'Student' | 'Teacher' | 'Admin' = 'Student') => ({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role,
  status: 'Active',
  department: role === 'Teacher' ? 'Mathematics' : role === 'Admin' ? 'System' : '',
  grade: 'Grade 11',
  section: 'Section A',
  lrn: '',
});

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  createIntentRole = null,
  onCreateIntentConsumed,
}) => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [pendingStatusUserId, setPendingStatusUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<Pick<AdminUser, 'id' | 'name'> | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formErrors, setFormErrors] = useState<AdminCreateUserValidationErrors>({});

  // Form State
  const [formData, setFormData] = useState(buildDefaultFormData());

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenAddModal = useCallback((preferredRole: 'Student' | 'Teacher' | 'Admin' = 'Student') => {
    setEditingUser(null);
    setFormErrors({});
    setFormData(buildDefaultFormData(preferredRole));
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (!createIntentRole) {
      return;
    }

    handleOpenAddModal(createIntentRole);
    onCreateIntentConsumed?.();
  }, [createIntentRole, handleOpenAddModal, onCreateIntentConsumed]);

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormErrors({});
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      status: user.status,
      department: user.department,
      grade: user.grade || 'Grade 11',
      section: user.section || 'Section A',
      lrn: user.lrn || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (!editingUser) {
      const validationErrors = validateAdminCreateUserForm({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
        status: formData.status,
        grade: formData.grade,
        section: formData.section,
        lrn: formData.lrn,
      });
      const firstError = getFirstValidationError(validationErrors);
      if (firstError) {
        setFormErrors(validationErrors);
        toast.error(firstError);
        return;
      }
    }

    setSaving(true);
    try {
      if (editingUser) {
        const updatePayload: {
          name: string;
          role: string;
          status: string;
          department?: string;
          grade: string;
          section: string;
          lrn?: string;
        } = {
          name: formData.name,
          role: formData.role,
          status: formData.status,
          grade: formData.grade,
          section: formData.section,
          lrn: formData.role === 'Student' ? formData.lrn : undefined,
        };

        if (formData.role !== 'Student') {
          updatePayload.department = formData.department;
        }

        await updateAdminUser(editingUser.id, updatePayload);
        await addAuditLog(
          'User Updated',
          'User',
          'Info',
          `Updated user: ${formData.name} (${editingUser.email})`,
          { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
        );
        toast.success('User updated successfully');
      } else {
        const createResult = await createAdminUser({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: formData.role as 'Student' | 'Teacher' | 'Admin',
          status: formData.status as 'Active' | 'Inactive',
          grade: formData.grade,
          section: formData.section,
          lrn: formData.role === 'Student' ? formData.lrn : undefined,
        });

        await addAuditLog(
          'Created New User',
          'User',
          'Info',
          `Created new ${formData.role.toLowerCase()} account: ${formData.name} (${formData.email}), emailSent=${createResult.emailSent}`,
          { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
        );

        if (createResult.emailSent) {
          toast.success('User created and welcome email sent');
        } else {
          toast.warning('User created, but welcome email failed to send');
          if (createResult.emailError?.message) {
            toast.error(createResult.emailError.message);
          }
        }
      }
      await loadUsers();
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setPendingDeleteUser({ id, name });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!pendingDeleteUser || isDeletingUser) return;

    setIsDeletingUser(true);
    try {
      await deleteAdminUser(pendingDeleteUser.id);
      await addAuditLog(
        'User Deleted',
        'User',
        'Warning',
        `Deleted user account: ${pendingDeleteUser.name}`,
        { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null }
      );
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => u.id !== pendingDeleteUser.id));
      setIsDeleteModalOpen(false);
      setPendingDeleteUser(null);
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    if (pendingStatusUserId || isDeletingUser) {
      return;
    }

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    setPendingStatusUserId(user.id);
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
    } finally {
      setPendingStatusUserId(null);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, idx) => (
              <div key={`stats-skeleton-${idx}`} className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm">
                <div className="h-7 w-16 bg-[#edf1f7] rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-[#edf1f7] rounded animate-pulse" />
              </div>
            ))
          : stats.map((stat, idx) => (
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[140px] bg-[#edf1f7] border-[#dde3eb]">
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
              <SelectTrigger className="w-full sm:w-[140px] bg-[#edf1f7] border-[#dde3eb]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="gap-2 border-[#dde3eb] text-[#5a6578]" onClick={loadUsers} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              className="gap-2 bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => handleOpenAddModal()}
            >
              <Plus size={16} />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-700">Unable to load users</p>
              <p className="text-sm text-red-600 break-words">{loadError}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-100"
            onClick={loadUsers}
            disabled={loading}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#dde3eb] shadow-sm overflow-hidden">
        <div className="md:hidden divide-y divide-[#dde3eb]">
          {loading ? (
            <div className="px-6 py-12 text-center text-[#5a6578]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={22} className="text-slate-500 animate-spin" />
                <p>Loading users...</p>
              </div>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isPendingToggle = pendingStatusUserId === user.id;
              return (
                <div key={`mobile-${user.id}`} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.photo} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0a1628] truncate">{user.name}</p>
                      <p className="text-xs text-[#5a6578] truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-[#edf1f7] px-2 py-1.5 text-[#5a6578]">Role: <span className="font-semibold text-[#0a1628]">{user.role}</span></div>
                    <div className="rounded-lg bg-[#edf1f7] px-2 py-1.5 text-[#5a6578]">Status: <span className="font-semibold text-[#0a1628]">{user.status}</span></div>
                    <div className="rounded-lg bg-[#edf1f7] px-2 py-1.5 text-[#5a6578] col-span-2">
                      Last Login: <span className="font-semibold text-[#0a1628]">{user.lastLogin || 'Never'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(user)}
                      aria-label={`Edit ${user.name}`}
                      className="px-3 py-2 rounded-lg border border-[#dde3eb] text-[#5a6578] hover:bg-[#edf1f7]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user)}
                      aria-label={user.status === 'Active' ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                      disabled={isPendingToggle || isDeletingUser}
                      className="px-3 py-2 rounded-lg border border-[#dde3eb] text-[#5a6578] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isPendingToggle ? 'Updating...' : user.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      aria-label={`Delete ${user.name}`}
                      disabled={isDeletingUser}
                      className="px-3 py-2 rounded-lg border border-red-200 text-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : loadError ? (
            <div className="px-6 py-12 text-center text-red-600">
              <div className="flex flex-col items-center gap-3">
                <AlertCircle size={24} className="text-red-500" />
                <p>Users could not be loaded.</p>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-[#5a6578]">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-[#edf1f7] rounded-full">
                  <Users size={24} className="text-slate-500" />
                </div>
                <p>No users found matching your filters</p>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#5a6578] uppercase bg-[#edf1f7] border-b border-[#dde3eb]">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Class/Department</th>
                <th className="px-6 py-4 font-semibold">Last Login</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde3eb]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#5a6578]">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={24} className="text-slate-500 animate-spin" />
                      <p>Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isPendingToggle = pendingStatusUserId === user.id;
                  return (
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
                    <td className="px-6 py-4 text-[#5a6578]">{user.role === 'Student' ? (user.classSection || user.department) : user.department}</td>
                    <td className="px-6 py-4 text-[#5a6578]">{user.lastLogin || 'Never'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(user)}
                          aria-label={`Edit ${user.name}`}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          aria-label={user.status === 'Active' ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                          disabled={isPendingToggle || isDeletingUser}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isPendingToggle ? 'opacity-60 cursor-not-allowed' : ''
                          } ${
                            user.status === 'Active' 
                              ? 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
                              : 'text-orange-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                        >
                          {isPendingToggle ? <Loader2 size={16} className="animate-spin" /> : user.status === 'Active' ? <Ban size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          aria-label={`Delete ${user.name}`}
                          disabled={isDeletingUser}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-600">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle size={24} className="text-red-500" />
                      <p>Users could not be loaded.</p>
                    </div>
                  </td>
                </tr>
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
                : 'Create a new account and send welcome credentials by email.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
              <label htmlFor="name" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Name</label>
              <div className="sm:col-span-3">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={formErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {formErrors.name ? <p className="mt-1 text-xs text-red-600">{formErrors.name}</p> : null}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
              <label htmlFor="email" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Email</label>
              <div className="sm:col-span-3">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    if (editingUser) {
                      return;
                    }
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) {
                      setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  readOnly={Boolean(editingUser)}
                  aria-readonly={Boolean(editingUser)}
                  className={`${formErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''} ${editingUser ? 'bg-[#edf1f7] text-[#5a6578] cursor-not-allowed' : ''}`}
                />
                {formErrors.email ? <p className="mt-1 text-xs text-red-600">{formErrors.email}</p> : null}
                {editingUser ? <p className="mt-1 text-xs text-[#5a6578]">Email changes are disabled because authentication email updates are not supported in this panel.</p> : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
              <label htmlFor="role" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Role</label>
              <div className="sm:col-span-3">
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, role: value, lrn: value === 'Student' ? formData.lrn : '' });
                    setFormErrors((prev) => ({ ...prev, role: undefined, lrn: undefined }));
                  }}
                >
                  <SelectTrigger className={formErrors.role ? 'border-red-500 focus:ring-red-500' : ''}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.role ? <p className="mt-1 text-xs text-red-600">{formErrors.role}</p> : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
              <label htmlFor="status" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Status</label>
              <div className="sm:col-span-3">
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, status: value });
                    if (formErrors.status) {
                      setFormErrors((prev) => ({ ...prev, status: undefined }));
                    }
                  }}
                >
                  <SelectTrigger className={formErrors.status ? 'border-red-500 focus:ring-red-500' : ''}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.status ? <p className="mt-1 text-xs text-red-600">{formErrors.status}</p> : null}
              </div>
            </div>

            {editingUser ? (
              formData.role === 'Student' ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                    <label htmlFor="lrn" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">LRN</label>
                    <Input
                      id="lrn"
                      value={formData.lrn}
                      onChange={(e) => setFormData({ ...formData, lrn: e.target.value })}
                      placeholder="12-digit learner reference"
                      className="sm:col-span-3"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                    <label htmlFor="grade" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Grade</label>
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g. Grade 11"
                      className="sm:col-span-3"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                    <label htmlFor="section" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Section</label>
                    <Input
                      id="section"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      placeholder="e.g. STEM A"
                      className="sm:col-span-3"
                    />
                  </div>
                </>
              ) : (
                <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                  <label htmlFor="department" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Department</label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Mathematics"
                    className="sm:col-span-3"
                  />
                </div>
              )
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                  <label htmlFor="grade" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Grade</label>
                  <div className="sm:col-span-3">
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => {
                        setFormData({ ...formData, grade: e.target.value });
                        if (formErrors.grade) {
                          setFormErrors((prev) => ({ ...prev, grade: undefined }));
                        }
                      }}
                      placeholder="e.g. Grade 11"
                      className={formErrors.grade ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {formErrors.grade ? <p className="mt-1 text-xs text-red-600">{formErrors.grade}</p> : null}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                  <label htmlFor="section" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Section</label>
                  <div className="sm:col-span-3">
                    <Input
                      id="section"
                      value={formData.section}
                      onChange={(e) => {
                        setFormData({ ...formData, section: e.target.value });
                        if (formErrors.section) {
                          setFormErrors((prev) => ({ ...prev, section: undefined }));
                        }
                      }}
                      placeholder="e.g. STEM A"
                      className={formErrors.section ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {formErrors.section ? <p className="mt-1 text-xs text-red-600">{formErrors.section}</p> : null}
                  </div>
                </div>

                {formData.role === 'Student' ? (
                  <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                    <label htmlFor="lrn" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">LRN</label>
                    <div className="sm:col-span-3">
                      <Input
                        id="lrn"
                        value={formData.lrn}
                        onChange={(e) => {
                          setFormData({ ...formData, lrn: e.target.value });
                          if (formErrors.lrn) {
                            setFormErrors((prev) => ({ ...prev, lrn: undefined }));
                          }
                        }}
                        placeholder="Required for student accounts"
                        className={formErrors.lrn ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {formErrors.lrn ? <p className="mt-1 text-xs text-red-600">{formErrors.lrn}</p> : null}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                  <label htmlFor="password" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Password</label>
                  <div className="sm:col-span-3">
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (formErrors.password) {
                          setFormErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      placeholder="Min 8 chars, upper/lowercase, number, and symbol"
                      className={formErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {formErrors.password ? <p className="mt-1 text-xs text-red-600">{formErrors.password}</p> : null}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                  <label htmlFor="confirmPassword" className="text-left sm:text-right text-sm font-medium text-[#0a1628]">Confirm</label>
                  <div className="sm:col-span-3">
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        if (formErrors.confirmPassword) {
                          setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      placeholder="Retype password"
                      className={formErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {formErrors.confirmPassword ? <p className="mt-1 text-xs text-red-600">{formErrors.confirmPassword}</p> : null}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveUser} className="bg-sky-600 hover:bg-sky-700 text-white" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {editingUser ? 'Save Changes' : 'Create User & Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (isDeletingUser) return;
          setIsDeleteModalOpen(false);
          setPendingDeleteUser(null);
        }}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User?"
        message={pendingDeleteUser ? `Delete user \"${pendingDeleteUser.name}\"? This cannot be undone.` : 'Delete this user? This cannot be undone.'}
        confirmText={isDeletingUser ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        type="danger"
        icon="delete"
      />
    </div>
  );
};

export default AdminUserManagement;
