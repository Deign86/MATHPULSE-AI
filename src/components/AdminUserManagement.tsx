import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Plus,
  Edit, Trash2, Shield, Ban, Users, UserCheck,
  GraduationCap, School, Loader2, RefreshCw, CheckCheck, Mail, Download, AlertCircle,
  Eye, EyeOff,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
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
  getAdminUsersPage,
  updateAdminUser,
  createAdminUser,
  applyAdminBulkAction,
  addAuditLog,
  type AdminUser,
  type AdminBulkActionType,
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

const PAGE_SIZE_OPTIONS = ['10', '25', '50', '100'] as const;

interface PendingConfirmState {
  title: string;
  message: string;
  confirmText: string;
  action: AdminBulkActionType;
  params?: {
    userIds?: string[];
    role?: string;
    status?: string;
    grade?: string;
    section?: string;
    exportFormat?: 'csv' | 'json';
  };
  auditAction: string;
  auditDetail: string;
}

function normalizeFilterValue(value: string, allToken: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === allToken) {
    return undefined;
  }
  return trimmed;
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  createIntentRole = null,
  onCreateIntentConsumed,
}) => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isProcessingBulkAction, setIsProcessingBulkAction] = useState(false);
  const [pendingRowActionUserId, setPendingRowActionUserId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);
  const [excludedUserIds, setExcludedUserIds] = useState<Set<string>>(new Set());
  const [knownUsersById, setKnownUsersById] = useState<Record<string, AdminUser>>({});

  const [bulkRoleTarget, setBulkRoleTarget] = useState<'Student' | 'Teacher' | 'Admin'>('Student');
  const [bulkStatusTarget, setBulkStatusTarget] = useState<'Active' | 'Inactive'>('Active');
  const [bulkGradeTarget, setBulkGradeTarget] = useState('Grade 11');
  const [bulkSectionTarget, setBulkSectionTarget] = useState('Section A');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<PendingConfirmState | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formErrors, setFormErrors] = useState<AdminCreateUserValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState(buildDefaultFormData());

  const activeFilters = useMemo(
    () => ({
      search: searchQuery.trim() || undefined,
      role: normalizeFilterValue(roleFilter, 'All Roles'),
      status: normalizeFilterValue(statusFilter, 'All Status'),
    }),
    [searchQuery, roleFilter, statusFilter],
  );

  const clearSelection = useCallback(() => {
    setSelectedUserIds(new Set());
    setAllFilteredSelected(false);
    setExcludedUserIds(new Set());
  }, []);

  const isUserSelected = useCallback(
    (userId: string) => {
      if (allFilteredSelected) {
        return !excludedUserIds.has(userId);
      }
      return selectedUserIds.has(userId);
    },
    [allFilteredSelected, excludedUserIds, selectedUserIds],
  );

  const selectedCount = useMemo(() => {
    if (allFilteredSelected) {
      return Math.max(totalUsers - excludedUserIds.size, 0);
    }
    return selectedUserIds.size;
  }, [allFilteredSelected, excludedUserIds, selectedUserIds, totalUsers]);

  const allVisibleSelected = useMemo(() => {
    if (users.length === 0) {
      return false;
    }
    return users.every((user) => isUserSelected(user.id));
  }, [users, isUserSelected]);

  const selectedUsers = useMemo(() => {
    if (allFilteredSelected) {
      return [] as AdminUser[];
    }
    return Array.from(selectedUserIds)
      .map((uid) => knownUsersById[uid])
      .filter((user): user is AdminUser => Boolean(user));
  }, [allFilteredSelected, selectedUserIds, knownUsersById]);

  const canAssignClassSection = useMemo(() => {
    if (selectedCount === 0) {
      return false;
    }
    if (allFilteredSelected) {
      return !activeFilters.role || activeFilters.role.toLowerCase() === 'student';
    }
    if (selectedUsers.length !== selectedUserIds.size) {
      return false;
    }
    return selectedUsers.every((user) => user.role === 'Student');
  }, [allFilteredSelected, selectedCount, selectedUsers, selectedUserIds.size, activeFilters.role]);

  const canActivate = useMemo(() => {
    if (selectedCount === 0) {
      return false;
    }
    if (allFilteredSelected) {
      return activeFilters.status?.toLowerCase() !== 'active';
    }
    if (selectedUsers.length !== selectedUserIds.size) {
      return false;
    }
    return selectedUsers.some((user) => user.status !== 'Active');
  }, [allFilteredSelected, selectedCount, selectedUsers, selectedUserIds.size, activeFilters.status]);

  const canDeactivate = useMemo(() => {
    if (selectedCount === 0) {
      return false;
    }
    if (allFilteredSelected) {
      return activeFilters.status?.toLowerCase() !== 'inactive';
    }
    if (selectedUsers.length !== selectedUserIds.size) {
      return false;
    }
    return selectedUsers.some((user) => user.status !== 'Inactive');
  }, [allFilteredSelected, selectedCount, selectedUsers, selectedUserIds.size, activeFilters.status]);

  const loadUsers = useCallback(async (targetPage: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const pageData = await getAdminUsersPage({
        page: targetPage,
        pageSize,
        searchQuery: activeFilters.search,
        roleFilter: activeFilters.role,
        statusFilter: activeFilters.status,
      });
      setUsers(pageData.users);
      setCurrentPage(pageData.total === 0 ? 1 : pageData.page);
      setTotalUsers(pageData.total);
      setTotalPages(pageData.totalPages || 1);
      setHasNextPage(pageData.hasNextPage);
      setKnownUsersById((prev) => {
        const next = { ...prev };
        pageData.users.forEach((user) => {
          next[user.id] = user;
        });
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [pageSize, activeFilters.search, activeFilters.role, activeFilters.status]);

  useEffect(() => {
    loadUsers(currentPage);
  }, [loadUsers, currentPage]);

  const handleOpenAddModal = useCallback((preferredRole: 'Student' | 'Teacher' | 'Admin' = 'Student') => {
    setEditingUser(null);
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
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

  const handleToggleUserSelection = useCallback((userId: string) => {
    if (allFilteredSelected) {
      setExcludedUserIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
      return;
    }

    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, [allFilteredSelected]);

  const handleToggleSelectVisible = useCallback(() => {
    if (users.length === 0) {
      return;
    }

    const visibleIds = users.map((user) => user.id);
    if (allFilteredSelected) {
      setExcludedUserIds((prev) => {
        const next = new Set(prev);
        const shouldDeselectVisible = visibleIds.every((id) => !next.has(id));
        if (shouldDeselectVisible) {
          visibleIds.forEach((id) => next.add(id));
        } else {
          visibleIds.forEach((id) => next.delete(id));
        }
        return next;
      });
      return;
    }

    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      const shouldDeselectVisible = visibleIds.every((id) => next.has(id));
      if (shouldDeselectVisible) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [users, allFilteredSelected]);

  const handleSelectAllFiltered = useCallback(() => {
    setAllFilteredSelected(true);
    setSelectedUserIds(new Set());
    setExcludedUserIds(new Set());
  }, []);

  const downloadExportRows = useCallback((rows: Record<string, unknown>[]) => {
    if (!rows.length) {
      toast.info('No rows were returned for export.');
      return;
    }

    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>()),
    );
    const csv = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `admin-users-export-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const executeBulkAction = useCallback(async (
    action: AdminBulkActionType,
    options: {
      userIds?: string[];
      role?: string;
      status?: string;
      grade?: string;
      section?: string;
      exportFormat?: 'csv' | 'json';
      auditAction: string;
      auditDetail: string;
      skipSelectionReset?: boolean;
    },
  ) => {
    const explicitUserIds = options.userIds;
    const filterPayload = {
      ...(activeFilters.search ? { search: activeFilters.search } : {}),
      ...(activeFilters.role ? { role: activeFilters.role } : {}),
      ...(activeFilters.status ? { status: activeFilters.status } : {}),
    };

    if (!explicitUserIds && selectedCount === 0) {
      toast.error('Select at least one user before applying a bulk action.');
      return;
    }

    setIsProcessingBulkAction(true);
    try {
      const result = await applyAdminBulkAction({
        action,
        ...(explicitUserIds
          ? { userIds: explicitUserIds }
          : allFilteredSelected
            ? {
                userIds: [],
                excludeUserIds: Array.from(excludedUserIds),
                filters: filterPayload,
              }
            : {
                userIds: Array.from(selectedUserIds),
              }),
        ...(options.role ? { role: options.role } : {}),
        ...(options.status ? { status: options.status } : {}),
        ...(options.grade ? { grade: options.grade } : {}),
        ...(options.section ? { section: options.section } : {}),
        ...(options.exportFormat ? { exportFormat: options.exportFormat } : {}),
      });

      if (action === 'export') {
        downloadExportRows(result.exportRows);
      }

      if (result.summary.failed > 0) {
        toast.warning(
          `Completed with partial failures. ${result.summary.succeeded} succeeded, ${result.summary.failed} failed, ${result.summary.skipped} skipped.`,
        );
      } else {
        toast.success(`Action completed. ${result.summary.succeeded} user(s) updated.`);
      }

      if (result.warnings.length > 0) {
        toast.info(result.warnings[0]);
      }

      await addAuditLog(
        options.auditAction,
        'User',
        action === 'delete' || action === 'deactivate' ? 'Warning' : 'Info',
        `${options.auditDetail}; targeted=${result.summary.targeted}, succeeded=${result.summary.succeeded}, failed=${result.summary.failed}, skipped=${result.summary.skipped}`,
        { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null },
      );

      if (!options.skipSelectionReset) {
        clearSelection();
      }
      await loadUsers(currentPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk action failed');
    } finally {
      setIsProcessingBulkAction(false);
    }
  }, [
    activeFilters.search,
    activeFilters.role,
    activeFilters.status,
    allFilteredSelected,
    excludedUserIds,
    selectedUserIds,
    selectedCount,
    userProfile?.name,
    userProfile?.photo,
    clearSelection,
    loadUsers,
    currentPage,
    downloadExportRows,
  ]);

  const openConfirmAction = useCallback((config: PendingConfirmState) => {
    setPendingConfirmAction(config);
    setIsConfirmModalOpen(true);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingConfirmAction || isConfirmingAction) {
      return;
    }

    setIsConfirmingAction(true);
    try {
      await executeBulkAction(pendingConfirmAction.action, {
        ...(pendingConfirmAction.params || {}),
        auditAction: pendingConfirmAction.auditAction,
        auditDetail: pendingConfirmAction.auditDetail,
      });
      setIsConfirmModalOpen(false);
      setPendingConfirmAction(null);
    } finally {
      setIsConfirmingAction(false);
    }
  }, [pendingConfirmAction, isConfirmingAction, executeBulkAction]);

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role as 'Student' | 'Teacher' | 'Admin',
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
      if (editingUser) {
        await loadUsers(currentPage);
      } else {
        clearSelection();
        setCurrentPage(1);
        await loadUsers(1);
      }
      setIsModalOpen(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    openConfirmAction({
      title: 'Delete User?',
      message: `Delete user "${name}"? This cannot be undone.`,
      confirmText: 'Delete',
      action: 'delete',
      params: { userIds: [id] },
      auditAction: 'User Deleted',
      auditDetail: `Deleted user account: ${name}`,
    });
  };

  const handleToggleStatus = async (user: AdminUser) => {
    if (pendingRowActionUserId || isProcessingBulkAction) {
      return;
    }

    const deactivate = user.status === 'Active';
    if (deactivate) {
      openConfirmAction({
        title: 'Deactivate User?',
        message: `Deactivate "${user.name}"? They will lose access until reactivated.`,
        confirmText: 'Deactivate',
        action: 'deactivate',
        params: { userIds: [user.id] },
        auditAction: 'User Status Changed',
        auditDetail: `Deactivated user: ${user.email}`,
      });
      return;
    }

    setPendingRowActionUserId(user.id);
    try {
      await executeBulkAction('activate', {
        userIds: [user.id],
        auditAction: 'User Status Changed',
        auditDetail: `Activated user: ${user.email}`,
        skipSelectionReset: true,
      });
    } finally {
      setPendingRowActionUserId(null);
    }
  };

  const handleBulkChangeRole = async () => {
    await executeBulkAction('change_role', {
      role: bulkRoleTarget,
      auditAction: 'Bulk Role Update',
      auditDetail: `Updated selected users to role ${bulkRoleTarget}`,
    });
  };

  const handleBulkChangeStatus = async () => {
    await executeBulkAction('change_status', {
      status: bulkStatusTarget,
      auditAction: 'Bulk Status Update',
      auditDetail: `Updated selected users to status ${bulkStatusTarget}`,
    });
  };

  const handleBulkAssignClassSection = async () => {
    if (!canAssignClassSection) {
      toast.error('Class/section assignment is only available for student selections.');
      return;
    }

    await executeBulkAction('assign_class_section', {
      grade: bulkGradeTarget,
      section: bulkSectionTarget,
      auditAction: 'Bulk Class Assignment',
      auditDetail: `Assigned class section ${bulkGradeTarget} - ${bulkSectionTarget}`,
    });
  };

  const handleBulkResetPassword = async () => {
    await executeBulkAction('reset_password_email', {
      auditAction: 'Bulk Password Reset',
      auditDetail: 'Sent password reset emails to selected users',
    });
  };

  const handleBulkExport = async () => {
    await executeBulkAction('export', {
      exportFormat: 'csv',
      auditAction: 'Bulk Export Users',
      auditDetail: 'Exported selected users',
    });
  };

  const handleBulkActivate = () => {
    if (!canActivate) {
      return;
    }
    void executeBulkAction('activate', {
      auditAction: 'Bulk User Activation',
      auditDetail: 'Activated selected users',
    });
  };

  const handleBulkDeactivate = () => {
    if (!canDeactivate) {
      return;
    }
    openConfirmAction({
      title: 'Deactivate Selected Users?',
      message: `Deactivate ${selectedCount} selected user(s)? They will lose access until reactivated.`,
      confirmText: 'Deactivate Users',
      action: 'deactivate',
      auditAction: 'Bulk User Deactivation',
      auditDetail: `Deactivated ${selectedCount} selected users`,
    });
  };

  const handleBulkDelete = () => {
    openConfirmAction({
      title: 'Delete Selected Users?',
      message: `Delete ${selectedCount} selected user(s)? This action cannot be undone.`,
      confirmText: 'Delete Users',
      action: 'delete',
      auditAction: 'Bulk User Deletion',
      auditDetail: `Deleted ${selectedCount} selected users`,
    });
  };

  // Stats — derived from server paginated view and current page composition
  const stats = [
    { label: 'Total Users', value: totalUsers, color: 'text-[#0a1628]' },
    { label: 'Active (Page)', value: users.filter(u => u.status === 'Active').length, color: 'text-green-600' },
    { label: 'Admins (Page)', value: users.filter(u => u.role === 'Admin').length, color: 'text-sky-600' },
    { label: 'Teachers (Page)', value: users.filter(u => u.role === 'Teacher').length, color: 'text-sky-600' },
    { label: 'Students (Page)', value: users.filter(u => u.role === 'Student').length, color: 'text-emerald-600' },
  ];

  const visibleRangeStart = totalUsers === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const visibleRangeEnd = totalUsers === 0 ? 0 : Math.min(currentPage * pageSize, totalUsers);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats Cards - Bento Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {loading && users.length === 0
          ? Array.from({ length: 5 }).map((_, idx) => (
              <div key={`stats-skeleton-${idx}`} className="bg-white p-5 rounded-[28px] border border-slate-200/60 shadow-sm shadow-slate-200/50 animate-pulse">
                <div className="h-4 w-20 bg-slate-100 rounded-full mb-3" />
                <div className="h-8 w-12 bg-slate-100 rounded-lg" />
              </div>
            ))
          : [
              { label: 'Total Users', value: totalUsers, icon: Users, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
              { label: 'Active Today', value: users.filter(u => u.status === 'Active').length, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
              { label: 'Admins', value: users.filter(u => u.role === 'Admin').length, icon: Shield, color: 'bg-sky-50 text-sky-600', border: 'border-sky-100' },
              { label: 'Teachers', value: users.filter(u => u.role === 'Teacher').length, icon: GraduationCap, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
              { label: 'Students', value: users.filter(u => u.role === 'Student').length, icon: School, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
            ].map((stat, idx) => (
              <div key={idx} className={`bg-white p-5 rounded-[28px] border ${stat.border || 'border-slate-200/60'} shadow-sm shadow-slate-200/50 group hover:shadow-md transition-all duration-300 relative overflow-hidden`}>
                <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700 ${stat.color.split(' ')[0]}`}></div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <div className={`p-2 rounded-xl ${stat.color}`}>
                    <stat.icon size={14} />
                  </div>
                </div>
                <h3 className="text-3xl font-display font-black text-[#1e293b] leading-none">{stat.value}</h3>
              </div>
            ))}
      </div>

      {/* Action Bar - Premium Integrated */}
      <div className="bg-white rounded-[28px] border border-slate-200/60 shadow-sm shadow-slate-200/50 p-3">
        <div className="flex flex-col xl:flex-row items-center gap-3">
          {/* Global Search */}
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <Input 
              placeholder="Search by name, email, or LRN..." 
              className="pl-11 h-12 bg-slate-50/50 border-slate-200/60 rounded-2xl focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
                clearSelection();
              }}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <div className="flex items-center bg-slate-50/50 p-1 rounded-2xl border border-slate-200/60 h-12">
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                  clearSelection();
                }}
              >
                <SelectTrigger className="w-[120px] bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="All Roles">All Roles</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Teacher">Teacher</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                </SelectContent>
              </Select>

              <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                  clearSelection();
                }}
              >
                <SelectTrigger className="w-[120px] bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-2xl border-slate-200/60 text-slate-500 hover:bg-slate-50"
              onClick={() => loadUsers(currentPage)}
              disabled={loading || isProcessingBulkAction}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>

            <Button 
              className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl gap-2 font-bold text-sm shadow-sm shadow-indigo-500/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
              onClick={() => handleOpenAddModal()}
              disabled={isProcessingBulkAction}
            >
              <Plus size={18} />
              Add User
            </Button>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedCount > 0 && (
          <div className="mt-3 bg-indigo-900 rounded-2xl p-3 flex flex-col xl:flex-row items-center gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 px-3 border-r border-white/10 pr-6">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center text-white font-black text-xs">
                {selectedCount}
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none">Selected</p>
                <p className="text-[9px] text-white/60 font-medium mt-1">
                  {allFilteredSelected ? 'All matching users' : `${selectedCount} users chosen`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Compact Bulk Tools */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                <Select value={bulkRoleTarget} onValueChange={(value) => setBulkRoleTarget(value as 'Student' | 'Teacher' | 'Admin')}>
                  <SelectTrigger className="h-8 bg-transparent border-none text-white text-[10px] font-bold min-w-[90px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black rounded-lg" onClick={() => void handleBulkChangeRole()}>Apply Role</Button>
              </div>

              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                <Select value={bulkStatusTarget} onValueChange={(value) => setBulkStatusTarget(value as 'Active' | 'Inactive')}>
                  <SelectTrigger className="h-8 bg-transparent border-none text-white text-[10px] font-bold min-w-[90px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black rounded-lg" onClick={() => void handleBulkChangeStatus()}>Set Status</Button>
              </div>

              <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-9 text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => void handleBulkResetPassword()}>
                  <Mail size={14} /> Reset Pass
                </Button>
                <Button size="sm" variant="ghost" className="h-9 text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => void handleBulkExport()}>
                  <Download size={14} /> Export
                </Button>
                <Button size="sm" variant="ghost" className="h-9 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-[10px] font-black uppercase tracking-widest gap-2" onClick={handleBulkDelete}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-white/10">
               {!allFilteredSelected && selectedCount < totalUsers && (
                <Button variant="ghost" className="h-9 text-indigo-200 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest" onClick={handleSelectAllFiltered}>
                  Select All {totalUsers}
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-9 w-9 text-white/40 hover:text-white hover:bg-white/10 rounded-xl" onClick={clearSelection}>
                <Edit size={16} className="rotate-45" />
              </Button>
            </div>
          </div>
        )}
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
            onClick={() => loadUsers(currentPage)}
            disabled={loading || isProcessingBulkAction}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {/* Users Table - Premium Styling */}
      <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm shadow-slate-200/50 overflow-hidden relative">
        {loading && users.length > 0 && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        )}
        
        <div className="md:hidden divide-y divide-slate-100">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">
              <Checkbox checked={allVisibleSelected} onCheckedChange={handleToggleSelectVisible} className="rounded-md border-slate-300" />
              Select Page
            </label>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
          </div>
          {loading && users.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 font-medium">Loading users...</div>
          ) : users.length > 0 ? (
            users.map((user) => {
              const isPendingToggle = pendingRowActionUserId === user.id;
              return (
                <div key={`mobile-${user.id}`} className="p-5 space-y-4 group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isUserSelected(user.id)}
                      onCheckedChange={() => handleToggleUserSelection(user.id)}
                      className="rounded-md border-slate-300"
                    />
                    <div className="relative">
                      <Avatar className="h-12 w-12 rounded-2xl border-2 border-white shadow-sm">
                        <AvatarImage src={user.photo} className="object-cover" />
                        <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold">{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#1e293b] truncate text-sm">{user.name}</p>
                      <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                      user.role === 'Admin' ? 'bg-sky-50 text-sky-600' :
                      user.role === 'Teacher' ? 'bg-purple-50 text-purple-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {user.role}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-50 text-slate-500">
                      {user.grade} • {user.section || user.department}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 rounded-xl border-slate-200 text-slate-600 font-bold text-xs gap-2"
                      onClick={() => handleOpenEditModal(user)}
                    >
                      <Edit size={14} /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex-1 h-9 rounded-xl border-slate-200 font-bold text-xs gap-2 ${
                        user.status === 'Active' ? 'text-slate-600' : 'text-emerald-600'
                      }`}
                      onClick={() => handleToggleStatus(user)}
                      disabled={isPendingToggle || isProcessingBulkAction}
                    >
                      {isPendingToggle ? <Loader2 size={14} className="animate-spin" /> : user.status === 'Active' ? <Ban size={14} /> : <UserCheck size={14} />}
                      {user.status === 'Active' ? 'Ban' : 'Active'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-xl border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-100"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      disabled={isProcessingBulkAction}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Users size={32} className="text-slate-300" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-slate-600 uppercase tracking-widest text-sm">No Users Found</p>
                <p className="text-xs text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                  We couldn't find any users matching your current filters. Try adjusting your search.
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-indigo-600 font-bold" onClick={() => {
                setSearchQuery('');
                setRoleFilter('All Roles');
                setStatusFilter('All Status');
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 w-[60px]">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={handleToggleSelectVisible} className="rounded-md border-slate-300" />
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User Profile</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role & Access</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Placement</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity</th>
                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Loader2 className="animate-spin text-indigo-200 mx-auto" size={40} />
                    <p className="mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Records...</p>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => {
                  const isPendingToggle = pendingRowActionUserId === user.id;
                  return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={isUserSelected(user.id)}
                        onCheckedChange={() => handleToggleUserSelection(user.id)}
                        className="rounded-md border-slate-300 group-hover:border-indigo-400 transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <Avatar className="h-11 w-11 rounded-2xl border-2 border-white shadow-sm ring-1 ring-slate-100">
                            <AvatarImage src={user.photo} className="object-cover" />
                            <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-sm">{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[#1e293b] truncate text-sm leading-tight group-hover:text-indigo-600 transition-colors">{user.name}</p>
                          <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`
                            text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider
                            ${user.role === 'Admin' ? 'bg-sky-50 text-sky-600' : ''}
                            ${user.role === 'Teacher' ? 'bg-purple-50 text-purple-600' : ''}
                            ${user.role === 'Student' ? 'bg-blue-50 text-blue-600' : ''}
                          `}>
                            {user.role}
                          </span>
                        </div>
                        {user.lrn && <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter ml-0.5">LRN: {user.lrn}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border
                        ${user.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-600">{user.grade || 'N/A'}</p>
                        <p className="text-[10px] font-medium text-slate-400">{user.role === 'Student' ? (user.classSection || user.section || 'Unassigned') : user.department}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{user.lastLogin ? 'Recent Activity' : 'Inactive Account'}</p>
                        <p className="text-[10px] font-medium text-slate-400">{user.lastLogin || 'No login history'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(user)}
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="Edit User"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(user)}
                          disabled={isPendingToggle || isProcessingBulkAction}
                          className={`h-9 w-9 rounded-xl transition-all ${
                            user.status === 'Active' 
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {isPendingToggle ? <Loader2 size={16} className="animate-spin" /> : user.status === 'Active' ? <Ban size={16} /> : <UserCheck size={16} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={isProcessingBulkAction}
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-32 text-center">
                    <div className="max-w-xs mx-auto space-y-6">
                      <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto shadow-sm shadow-slate-100 group-hover:scale-110 transition-transform duration-500">
                        <Users size={40} className="text-slate-200" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-slate-600 uppercase tracking-widest">No matching users</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                          We couldn't find any results for your current query. Try broadening your search or clearing filters.
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl border-slate-200 text-indigo-600 font-bold px-6 h-10 hover:bg-indigo-50"
                        onClick={() => {
                          setSearchQuery('');
                          setRoleFilter('All Roles');
                          setStatusFilter('All Status');
                        }}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination - Refined Styling */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-2 py-4 border-t border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Showing <span className="text-slate-600">{visibleRangeStart}-{visibleRangeEnd}</span> of{' '}
          <span className="text-slate-600">{totalUsers}</span> users
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 mr-4">
             <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextPageSize = Number(value);
                if (Number.isNaN(nextPageSize)) return;
                setPageSize(nextPageSize);
                setCurrentPage(1);
                clearSelection();
              }}
            >
              <SelectTrigger className="h-8 w-[100px] bg-slate-50 border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 rounded-lg focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size}>{size} / Page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
              disabled={currentPage <= 1 || loading || isProcessingBulkAction}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              <Edit size={14} className="rotate-180" />
            </Button>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest min-w-[80px] text-center">
              Page {currentPage} / {Math.max(totalPages, 1)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
              disabled={!hasNextPage || loading || isProcessingBulkAction || currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
            >
              <Edit size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal - Premium Styling */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !saving && setIsModalOpen(open)}>
        <DialogContent className="sm:max-w-[450px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
          <div className={`h-2 w-full bg-gradient-to-r ${editingUser ? 'from-indigo-500 to-purple-500' : 'from-emerald-500 to-indigo-500'}`}></div>
          <div className="p-8 space-y-6">
            <DialogHeader className="text-left space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${editingUser ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {editingUser ? <Edit size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-display font-black text-[#1e293b] leading-tight">
                    {editingUser ? 'Edit User Access' : 'Add New User'}
                  </DialogTitle>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {editingUser ? 'System Management' : 'Onboarding Pipeline'}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Enter full name"
                    className={`h-11 rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all font-medium ${formErrors.name ? 'border-rose-300 bg-rose-50/20' : ''}`}
                  />
                  {formErrors.name && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500" />}
                </div>
                {formErrors.name && <p className="text-[10px] text-rose-500 font-bold ml-1">{formErrors.name}</p>}
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      if (editingUser) return;
                      setFormData({ ...formData, email: e.target.value });
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    readOnly={Boolean(editingUser)}
                    placeholder="name@example.com"
                    className={`h-11 rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all font-medium ${formErrors.email ? 'border-rose-300 bg-rose-50/20' : ''} ${editingUser ? 'opacity-60 grayscale' : ''}`}
                  />
                </div>
                {formErrors.email && <p className="text-[10px] text-rose-500 font-bold ml-1">{formErrors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Role</label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => {
                      setFormData({ ...formData, role: value as 'Student' | 'Teacher' | 'Admin', lrn: value === 'Student' ? formData.lrn : '' });
                      setFormErrors((prev) => ({ ...prev, role: undefined, lrn: undefined }));
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Teacher">Teacher</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Status</label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => {
                      setFormData({ ...formData, status: value });
                      if (formErrors.status) setFormErrors((prev) => ({ ...prev, status: undefined }));
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Inputs based on Role */}
              {formData.role === 'Student' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade Level</label>
                    <Input value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} placeholder="Grade 11" className="h-11 rounded-xl bg-slate-50/50 border-slate-200 font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                    <Input value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} placeholder="STEM A" className="h-11 rounded-xl bg-slate-50/50 border-slate-200 font-bold" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">LRN (12 Digits)</label>
                    <Input value={formData.lrn} onChange={(e) => setFormData({ ...formData, lrn: e.target.value })} placeholder="Required for students" className="h-11 rounded-xl bg-slate-50/50 border-slate-200 font-bold tracking-widest" />
                  </div>
                </div>
              )}

              {(formData.role === 'Teacher' || formData.role === 'Admin') && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                  <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Mathematics Department" className="h-11 rounded-xl bg-slate-50/50 border-slate-200 font-bold" />
                </div>
              )}

              {/* Password Fields for New Users */}
              {!editingUser && (
                <div className="space-y-4 pt-2 border-t border-slate-100 mt-4">
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Set Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="h-11 rounded-xl bg-slate-50/50 border-slate-200 pr-10 font-bold tracking-widest"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between gap-3 pt-4">
              <Button variant="ghost" className="rounded-xl font-bold text-slate-500 hover:bg-slate-100" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSaveUser} className={`flex-1 h-12 rounded-xl font-black uppercase tracking-widest gap-2 text-xs shadow-lg transition-all active:scale-95 ${editingUser ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : editingUser ? 'Save Changes' : 'Onboard User'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          if (isConfirmingAction) return;
          setIsConfirmModalOpen(false);
          setPendingConfirmAction(null);
        }}
        onConfirm={handleConfirmAction}
        title={pendingConfirmAction?.title || 'Confirm Action'}
        message={pendingConfirmAction?.message || 'Proceed with this action?'}
        confirmText={isConfirmingAction ? 'Processing...' : (pendingConfirmAction?.confirmText || 'Confirm')}
        cancelText="Cancel"
        type="danger"
        icon="delete"
      />
    </div>
  );
};

export default AdminUserManagement;
