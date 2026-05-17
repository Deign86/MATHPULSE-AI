import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getDefaultAvatar } from '../utils/avatarUtils';
import { 
  Search, Plus, Save,
  Edit, Trash2, Shield, Ban, Users, UserCheck,
  GraduationCap, School, Loader2, RefreshCw, CheckCheck, Mail, Download, AlertCircle,
  Eye, EyeOff, ChevronLeft, ChevronRight, RotateCcw, UserPlus, FilterX
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
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="space-y-8 pt-6 xl:pt-8 pb-6 px-1">
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
              { label: 'Total Users', value: totalUsers, icon: Users, bg: 'bg-[#4f46e5]', shadow: 'shadow-indigo-500/20' },
              { label: 'Active Today', value: users.filter(u => u.status === 'Active').length, icon: UserCheck, bg: 'bg-[#10b981]', shadow: 'shadow-emerald-500/20' },
              { label: 'Admins', value: users.filter(u => u.role === 'Admin').length, icon: Shield, bg: 'bg-[#0ea5e9]', shadow: 'shadow-sky-500/20' },
              { label: 'Teachers', value: users.filter(u => u.role === 'Teacher').length, icon: GraduationCap, bg: 'bg-[#8b5cf6]', shadow: 'shadow-purple-500/20' },
              { label: 'Students', value: users.filter(u => u.role === 'Student').length, icon: School, bg: 'bg-[#3b82f6]', shadow: 'shadow-blue-500/20' },
            ].map((stat, idx) => (
              <div key={idx} className={`relative overflow-hidden ${stat.bg} ${stat.shadow} p-5 rounded-[28px] text-white flex flex-col gap-3 group hover:scale-[1.02] transition-all duration-300 shadow-lg`}>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-700 ease-out" />
                <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-700 delay-75 ease-out" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{stat.label}</p>
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                    <stat.icon size={14} />
                  </div>
                </div>
                <h3 className="relative z-10 text-3xl font-display font-black leading-none tracking-tight">{stat.value}</h3>
              </div>
            ))}
      </div>
      </div>

      {/* Action Bar - Sticky Header */}
      <div className="sticky top-0 z-40 -mx-[24px] xl:-mx-[32px] px-[24px] xl:px-[32px] pt-4 pb-4 bg-[#f8fafc] backdrop-blur-sm">
        <div className="flex flex-col xl:flex-row items-center gap-3">
          {/* Global Search */}
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <Input 
              placeholder="Search by name, email, or LRN..." 
              className="pl-11 h-12 bg-white border-slate-200/60 rounded-2xl focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all text-sm font-medium shadow-md shadow-slate-200/40"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
                clearSelection();
              }}
            />
          </div>
          
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                  clearSelection();
                }}
              >
                <SelectTrigger className="w-[180px] h-12 rounded-xl bg-white border border-slate-200 hover:border-[#9956DE] transition-all focus:ring-2 focus:ring-[#9956DE]/10 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-md shadow-slate-200/40 px-4">
                  <span className="truncate">
                    {roleFilter === 'All Roles' ? 'All Roles' : roleFilter === 'Admin' ? 'Administrator' : roleFilter === 'Teacher' ? 'Educator' : roleFilter}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="All Roles" className="font-bold uppercase tracking-widest text-[10px]">All Roles</SelectItem>
                  <SelectItem value="Admin" className="font-bold uppercase tracking-widest text-[10px]">Administrator</SelectItem>
                  <SelectItem value="Teacher" className="font-bold uppercase tracking-widest text-[10px]">Educator</SelectItem>
                  <SelectItem value="Student" className="font-bold uppercase tracking-widest text-[10px]">Student</SelectItem>
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
                <SelectTrigger className="w-[180px] h-12 rounded-xl bg-white border border-slate-200 hover:border-[#9956DE] transition-all focus:ring-2 focus:ring-[#9956DE]/10 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-md shadow-slate-200/40 px-4">
                  <span className="truncate">{statusFilter === 'All Status' ? 'All Statuses' : statusFilter}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="All Status" className="font-bold uppercase tracking-widest text-[10px]">All Statuses</SelectItem>
                  <SelectItem value="Active" className="font-bold uppercase tracking-widest text-[10px]">Active</SelectItem>
                  <SelectItem value="Inactive" className="font-bold uppercase tracking-widest text-[10px]">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('All Roles');
                setStatusFilter('All Status');
                setCurrentPage(1);
                clearSelection();
              }}
              disabled={!searchQuery && roleFilter === 'All Roles' && statusFilter === 'All Status'}
              className="h-12 w-12 rounded-xl border-slate-200 text-[#9956DE] hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-slate-200/40"
              title="Reset Filters"
            >
              <FilterX size={18} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shadow-md shadow-slate-200/40"
              onClick={() => loadUsers(currentPage)}
              disabled={loading || isProcessingBulkAction}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>

            <Button 
              className="h-12 gap-2 bg-[#9956DE] hover:bg-[#8b5cf6] text-white rounded-xl shadow-lg shadow-purple-200/50 transition-all px-6 font-black uppercase text-[11px] tracking-widest" 
              onClick={() => handleOpenAddModal()}
              disabled={isProcessingBulkAction}
            >
              <UserPlus size={18} />
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
      <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm shadow-slate-200/50 relative">
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
                      <Avatar className="h-12 w-12 rounded-full border-2 border-white shadow-sm">
                        <AvatarImage src={user.photo || getDefaultAvatar(user.gender)} className="object-cover" />
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
                      disabled={(pendingRowActionUserId === user.id) || isProcessingBulkAction}
                    >
                      {(pendingRowActionUserId === user.id) ? <Loader2 size={14} className="animate-spin" /> : user.status === 'Active' ? <Ban size={14} /> : <UserCheck size={14} />}
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
              )
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

        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-[80px] z-30 bg-[#f8fafc] backdrop-blur-sm shadow-[0_-12px_0_0_#f8fafc]">
              <tr className="border-b border-[#8b5cf6]">
                <th className="bg-[#9956DE] px-6 py-4 w-[60px] rounded-tl-[20px]">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={handleToggleSelectVisible} className="rounded-md border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#9956DE]" />
                </th>
                <th className="bg-[#9956DE] px-6 py-4 text-[11px] font-black text-white uppercase tracking-widest">User Profile</th>
                <th className="bg-[#9956DE] px-6 py-4 text-[11px] font-black text-white uppercase tracking-widest">Role & Access</th>
                <th className="bg-[#9956DE] px-6 py-4 text-[11px] font-black text-white uppercase tracking-widest">Status</th>
                <th className="bg-[#9956DE] px-6 py-4 text-[11px] font-black text-white uppercase tracking-widest">Placement</th>
                <th className="bg-[#9956DE] px-6 py-4 text-[11px] font-black text-white uppercase tracking-widest">Activity</th>
                <th className="bg-[#9956DE] px-6 py-4 text-right text-[11px] font-black text-white uppercase tracking-widest rounded-tr-[20px]">Actions</th>
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
                          <Avatar className="h-11 w-11 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100">
                            <AvatarImage src={user.photo || getDefaultAvatar(user.gender)} className="object-cover" />
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
                      <div className="flex items-center justify-end gap-1">
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
                )
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

      {/* Pagination — ── Standardized Sticky Footer Pagination ── */}
      <div className="sticky bottom-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-12 py-3 bg-white border-t-2 border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] -mx-[24px] xl:-mx-[32px] w-[calc(100%+48px)] xl:w-[calc(100%+64px)]">
        <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9956DE] animate-pulse shadow-[0_0_12px_rgba(153,86,222,0.6)]"></span>
          Showing <span className="text-slate-900 font-black border-b-2 border-[#9956DE]/40 pb-0.5">{visibleRangeStart}–{visibleRangeEnd}</span>
          <span className="text-slate-300 font-bold mx-1">/</span>
          <span className="text-slate-900 font-black border-b-2 border-[#9956DE]/40 pb-0.5">{totalUsers}</span>
          <span className="text-slate-400 ml-1">Total System Records</span>
        </p>

        <div className="flex items-center gap-6">
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
            <SelectTrigger className="h-10 w-[140px] bg-white border border-slate-300 text-[11px] font-black uppercase tracking-wider text-slate-900 rounded-xl hover:border-[#9956DE] transition-all px-4 shadow-sm">
              <span className="truncate">{pageSize} / Page</span>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size} className="font-bold">{size} / Page</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl bg-[#9956DE] border-none text-white hover:bg-[#8b5cf6] hover:scale-105 active:scale-95 disabled:opacity-30 transition-all shadow-lg shadow-purple-200/60"
              disabled={currentPage <= 1 || loading || isProcessingBulkAction}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </Button>

            <div className="px-5 py-2 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center min-w-[130px]">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                Page <span className="text-[#9956DE] mx-1">{currentPage}</span>
                <span className="text-slate-300 mx-1">OF</span>
                <span className="text-slate-500">{Math.max(totalPages, 1)}</span>
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl bg-[#9956DE] border-none text-white hover:bg-[#8b5cf6] hover:scale-105 active:scale-95 disabled:opacity-30 transition-all shadow-lg shadow-purple-200/60"
              disabled={!hasNextPage || loading || isProcessingBulkAction || currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
            >
              <ChevronRight size={18} strokeWidth={3} />
            </Button>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal - Premium Styling */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !saving && setIsModalOpen(open)}>
        <DialogContent className="sm:max-w-[850px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
          <div className={`h-2 w-full bg-gradient-to-r ${editingUser ? 'from-indigo-600 to-purple-600' : 'from-emerald-600 to-indigo-600'}`}></div>
          <div className="p-8 space-y-8">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 hover:rotate-3 ${editingUser ? 'bg-indigo-100 text-indigo-700 shadow-indigo-200/50' : 'bg-emerald-100 text-emerald-700 shadow-emerald-200/50'}`}>
                  {editingUser ? <Edit size={28} className="drop-shadow-sm" /> : <Plus size={28} className="drop-shadow-sm" />}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-display font-black text-[#1e293b] leading-tight">
                    {editingUser ? 'Edit User Access' : 'Onboard New User'}
                  </DialogTitle>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    {editingUser ? 'User Identity Management' : 'System Enrollment Pipeline'}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              {/* Left Column: Primary Info */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.15em] pb-1 border-b border-indigo-50">Identity Details</h4>
                  
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
                        className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all font-bold text-[#1e293b] ${formErrors.name ? 'border-rose-300 bg-rose-50/20' : ''}`}
                      />
                      {formErrors.name && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500" />}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        if (editingUser) return;
                        setFormData({ ...formData, email: e.target.value });
                      }}
                      readOnly={Boolean(editingUser)}
                      placeholder="name@example.com"
                      className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all font-bold text-[#1e293b] ${editingUser ? 'opacity-60 grayscale bg-slate-100' : ''}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Role</label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(value) => {
                          setFormData({ ...formData, role: value as 'Student' | 'Teacher' | 'Admin', lrn: value === 'Student' ? formData.lrn : '' });
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-black text-[#1e293b]">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="Student" className="font-bold">Student</SelectItem>
                          <SelectItem value="Teacher" className="font-bold">Teacher</SelectItem>
                          <SelectItem value="Admin" className="font-bold">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-black text-[#1e293b]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="Active" className="font-bold">Active</SelectItem>
                          <SelectItem value="Inactive" className="font-bold">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Contextual Info */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.15em] pb-1 border-b border-indigo-50">Contextual Assignment</h4>

                  {formData.role === 'Student' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade Level</label>
                          <Input value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} placeholder="Grade 11" className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                          <Input value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} placeholder="STEM A" className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">LRN (Learner Reference Number)</label>
                        <Input value={formData.lrn} onChange={(e) => setFormData({ ...formData, lrn: e.target.value })} placeholder="12-digit number" className="h-12 rounded-xl bg-slate-50 border-slate-200 font-black tracking-widest" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department / Office</label>
                      <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. Mathematics Department" className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                    </div>
                  )}

                  {!editingUser && (
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 pr-10 font-black tracking-widest"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-100">
              <Button 
                variant="outline" 
                className={`h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${editingUser ? 'border-indigo-600/50 text-indigo-600 hover:bg-indigo-50' : 'border-emerald-600/50 text-emerald-600 hover:bg-emerald-50'}`} 
                onClick={() => setIsModalOpen(false)} 
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveUser} className={`h-12 rounded-xl font-black uppercase tracking-widest gap-3 text-[10px] shadow-lg transition-all active:scale-95 ${editingUser ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'}`} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : editingUser ? <><Save size={16} /> Save Changes</> : <><Plus size={16} /> Onboard User</>}
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
