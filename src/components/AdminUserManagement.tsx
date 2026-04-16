import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Plus,
  Edit, Trash2, Shield, Ban, Users, UserCheck,
  GraduationCap, School, Loader2, RefreshCw, CheckCheck, Mail, Download
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
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
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
      if (editingUser) {
        await loadUsers(currentPage);
      } else {
        clearSelection();
        setCurrentPage(1);
        await loadUsers(1);
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
              clearSelection();
            }}
          />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setCurrentPage(1);
                clearSelection();
              }}
            >
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

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
                clearSelection();
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px] bg-[#edf1f7] border-[#dde3eb]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextPageSize = Number(value);
                if (Number.isNaN(nextPageSize)) {
                  return;
                }
                setPageSize(nextPageSize);
                setCurrentPage(1);
                clearSelection();
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px] bg-[#edf1f7] border-[#dde3eb]">
                <SelectValue placeholder="Rows per page" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size}>{size} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="gap-2 border-[#dde3eb] text-[#5a6578]"
              onClick={() => loadUsers(currentPage)}
              disabled={loading || isProcessingBulkAction}
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
            <Button 
              className="gap-2 bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => handleOpenAddModal()}
              disabled={isProcessingBulkAction}
            >
              <Plus size={16} />
              Add User
            </Button>
          </div>
        </div>

        {selectedCount > 0 ? (
          <div className="border-t border-[#dde3eb] pt-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="text-sm text-[#5a6578]">
                <span className="font-semibold text-[#0a1628]">{selectedCount}</span> user(s) selected
                {allFilteredSelected ? ' across filtered results' : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {!allFilteredSelected && selectedCount > 0 && selectedCount < totalUsers ? (
                  <Button variant="outline" size="sm" className="border-[#dde3eb]" onClick={handleSelectAllFiltered}>
                    <CheckCheck size={14} className="mr-2" />
                    Select all {totalUsers} filtered users
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" className="border-[#dde3eb]" onClick={clearSelection}>
                  Clear selection
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={bulkRoleTarget} onValueChange={(value) => setBulkRoleTarget(value as 'Student' | 'Teacher' | 'Admin')}>
                  <SelectTrigger className="bg-[#edf1f7] border-[#dde3eb] sm:w-[160px]">
                    <SelectValue placeholder="Role target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#dde3eb]"
                  onClick={() => void handleBulkChangeRole()}
                  disabled={isProcessingBulkAction}
                >
                  Change Role
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={bulkStatusTarget} onValueChange={(value) => setBulkStatusTarget(value as 'Active' | 'Inactive')}>
                  <SelectTrigger className="bg-[#edf1f7] border-[#dde3eb] sm:w-[160px]">
                    <SelectValue placeholder="Status target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#dde3eb]"
                  onClick={() => void handleBulkChangeStatus()}
                  disabled={isProcessingBulkAction}
                >
                  Change Status
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={bulkGradeTarget}
                  onChange={(e) => setBulkGradeTarget(e.target.value)}
                  className="bg-[#edf1f7] border-[#dde3eb] sm:w-[140px]"
                  placeholder="Grade"
                />
                <Input
                  value={bulkSectionTarget}
                  onChange={(e) => setBulkSectionTarget(e.target.value)}
                  className="bg-[#edf1f7] border-[#dde3eb] sm:w-[140px]"
                  placeholder="Section"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#dde3eb]"
                  onClick={() => void handleBulkAssignClassSection()}
                  disabled={isProcessingBulkAction || !canAssignClassSection}
                >
                  Assign Class
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#dde3eb]"
                onClick={handleBulkActivate}
                disabled={isProcessingBulkAction || !canActivate}
              >
                <UserCheck size={14} className="mr-2" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#dde3eb]"
                onClick={handleBulkDeactivate}
                disabled={isProcessingBulkAction || !canDeactivate}
              >
                <Ban size={14} className="mr-2" />
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#dde3eb]"
                onClick={() => void handleBulkResetPassword()}
                disabled={isProcessingBulkAction}
              >
                <Mail size={14} className="mr-2" />
                Send Reset Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#dde3eb]"
                onClick={() => void handleBulkExport()}
                disabled={isProcessingBulkAction}
              >
                <Download size={14} className="mr-2" />
                Export Selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isProcessingBulkAction}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#dde3eb] shadow-sm overflow-hidden">
        <div className="md:hidden divide-y divide-[#dde3eb]">
          <div className="px-4 py-3 bg-[#edf1f7] border-b border-[#dde3eb] flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[#5a6578]">
              <Checkbox checked={allVisibleSelected} onCheckedChange={handleToggleSelectVisible} />
              Select visible ({users.length})
            </label>
            <span className="text-xs text-[#5a6578]">Page {currentPage} / {totalPages}</span>
          </div>
          {loading && users.length === 0 ? (
            <div className="px-6 py-10 text-center text-[#5a6578]">Loading users...</div>
          ) : users.length > 0 ? (
            users.map((user) => {
              const isPendingToggle = pendingRowActionUserId === user.id;
              return (
                <div key={`mobile-${user.id}`} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isUserSelected(user.id)}
                      onCheckedChange={() => handleToggleUserSelection(user.id)}
                    />
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
                      disabled={isPendingToggle || isProcessingBulkAction}
                      className="px-3 py-2 rounded-lg border border-[#dde3eb] text-[#5a6578] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isPendingToggle ? 'Updating...' : user.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      aria-label={`Delete ${user.name}`}
                      disabled={isProcessingBulkAction}
                      className="px-3 py-2 rounded-lg border border-red-200 text-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
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
                <th className="px-4 py-4 font-semibold w-[56px]">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={handleToggleSelectVisible} />
                </th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Class/Department</th>
                <th className="px-6 py-4 font-semibold">Last Login</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde3eb]">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#5a6578]">Loading users...</td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => {
                  const isPendingToggle = pendingRowActionUserId === user.id;
                  return (
                  <tr key={user.id} className="hover:bg-[#edf1f7]/50 transition-colors">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={isUserSelected(user.id)}
                        onCheckedChange={() => handleToggleUserSelection(user.id)}
                      />
                    </td>
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
                          disabled={isPendingToggle || isProcessingBulkAction}
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
                          disabled={isProcessingBulkAction}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#5a6578]">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <p className="text-sm text-[#5a6578]">
          Showing <span className="font-semibold text-[#0a1628]">{visibleRangeStart}-{visibleRangeEnd}</span> of{' '}
          <span className="font-semibold text-[#0a1628]">{totalUsers}</span> users
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#dde3eb]"
            disabled={currentPage <= 1 || loading || isProcessingBulkAction}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-[#5a6578] min-w-[72px] text-center">Page {currentPage} / {Math.max(totalPages, 1)}</span>
          <Button
            variant="outline"
            size="sm"
            className="border-[#dde3eb]"
            disabled={!hasNextPage || loading || isProcessingBulkAction || currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
          >
            Next
          </Button>
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
