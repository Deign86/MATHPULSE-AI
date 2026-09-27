import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getDefaultAvatar } from '../utils/avatarUtils';
import {
  Search, Plus, Save,
  Edit, Trash2, Shield, Ban, Users, UserCheck,
  GraduationCap, School, Loader2, RefreshCw, Mail, Download, AlertCircle,
  Eye, EyeOff, ChevronLeft, ChevronRight, UserPlus, FilterX, X, SlidersHorizontal
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import ConfirmModal from './ConfirmModal';
import {
  Dialog,
  DialogContent,
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
  type AdminBulkActionInput,
  type ExportRow,
} from '../services/adminService';
import { memberOf } from '../utils/memberOf';
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
  sidebarCollapsed?: boolean;
}

const buildDefaultFormData = (role: 'Student' | 'Teacher' | 'Admin' = 'Student') => ({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role,
  status: 'Active',
  department: role === 'Teacher' ? 'Mathematics' : role === 'Admin' ? 'System' : '',
  grade: '',
  section: '',
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

function csvEscape(value: string | number | boolean | null | undefined): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  createIntentRole = null,
  onCreateIntentConsumed,
  sidebarCollapsed = false,
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
  const [sectionFilter, setSectionFilter] = useState('All Sections');

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);
  const [excludedUserIds, setExcludedUserIds] = useState<Set<string>>(new Set());
  const [knownUsersById, setKnownUsersById] = useState<Record<string, AdminUser>>({});

  const [bulkRoleTarget, setBulkRoleTarget] = useState<'Student' | 'Teacher' | 'Admin'>('Student');
  const [bulkStatusTarget, setBulkStatusTarget] = useState<'Active' | 'Inactive'>('Active');
  const [bulkGradeTarget, setBulkGradeTarget] = useState('Grade 11');
  const [bulkSectionTarget, setBulkSectionTarget] = useState('');

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
      section: normalizeFilterValue(sectionFilter, 'All Sections'),
    }),
    [searchQuery, roleFilter, statusFilter, sectionFilter],
  );
  const filters = activeFilters;

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
      // SAFETY: trusted internal value already conforms to the asserted type.
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
      return activeFilters.role?.toLowerCase() === 'student';
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
        searchQuery: filters.search,
        roleFilter: filters.role,
        statusFilter: filters.status,
        sectionFilter: filters.section,
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
  }, [pageSize, filters.search, filters.role, filters.status, filters.section]);

  useEffect(() => {
    loadUsers(currentPage);
  }, [loadUsers, currentPage]);

  // Client-side section filter + available sections for dropdown
  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    users.forEach(u => { if (u.section) sections.add(u.section); });
    return Array.from(sections).sort();
  }, [users]);

  const displayedUsers = useMemo(() => {
    if (!activeFilters.section) return users;
    return users.filter(u => u.section === activeFilters.section);
  }, [users, activeFilters.section]);

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

    const visibleIds = displayedUsers.map((user) => user.id);
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

  const downloadExportRows = useCallback((rows: ExportRow[]) => {
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
      headers.map((key) => csvEscape(key)).join(','),
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
    const filterPayload: NonNullable<AdminBulkActionInput['filters']> = {};
    if (filters.search) filterPayload.search = filters.search;
    if (filters.role) filterPayload.role = filters.role;
    if (filters.status) filterPayload.status = filters.status;
    if (filters.section) filterPayload.section = filters.section;

    if (!explicitUserIds && selectedCount === 0) {
      toast.error('Select at least one user before applying a bulk action.');
      return;
    }

    setIsProcessingBulkAction(true);
    try {
      const payload: AdminBulkActionInput = { action };
      if (explicitUserIds) {
        payload.userIds = explicitUserIds;
      } else if (allFilteredSelected) {
        payload.userIds = [];
        payload.excludeUserIds = Array.from(excludedUserIds);
        payload.filters = filterPayload;
      } else {
        payload.userIds = Array.from(selectedUserIds);
      }
      if (options.role) payload.role = options.role;
      if (options.status) payload.status = options.status;
      if (options.grade) payload.grade = options.grade;
      if (options.section) payload.section = options.section;
      if (options.exportFormat) payload.exportFormat = options.exportFormat;

      const result = await applyAdminBulkAction(payload);

      if (action === 'export') {
        downloadExportRows(result.exportRows);
      }

      if (result.summary.failed > 0) {
        toast.warning(
          `Completed with partial failures. ${result.summary.succeeded} succeeded, ${result.summary.failed} failed, ${result.summary.skipped} skipped.`,
        );
      } else if (result.summary.succeeded === 0 && result.summary.targeted > 0) {
        toast.error(
          result.summary.skipped > 0
            ? `Action skipped for ${result.summary.skipped} user(s).`
            : 'Action could not be completed. No users were updated.',
        );
      } else {
        toast.success(`Action completed. ${result.summary.succeeded} user(s) updated.`);
      }

      if (result.warnings.length > 0) {
        toast.info(result.warnings[0]);
      }

      try {
        await addAuditLog(
          options.auditAction,
          'User',
          action === 'delete' || action === 'deactivate' ? 'Warning' : 'Info',
          `${options.auditDetail}; targeted=${result.summary.targeted}, succeeded=${result.summary.succeeded}, failed=${result.summary.failed}, skipped=${result.summary.skipped}`,
          { name: userProfile?.name || 'Admin', role: 'Admin', avatar: userProfile?.photo || null },
        );
      } catch {
        // Audit log write may fail due to Firestore permissions — non-critical
      }

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
    filters.search,
    filters.role,
    filters.status,
    filters.section,
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
      // SAFETY: trusted internal value already conforms to the asserted type.
      role: user.role as 'Student' | 'Teacher' | 'Admin',
      status: user.status,
      department: user.department,
      grade: user.grade || 'Grade 11',
      section: user.section || '',
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

    interface AdminUserProfilePayload {
      name: string;
      role: string;
      status: string;
      department?: string;
      grade: string;
      section: string;
      lrn?: string;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const updatePayload: AdminUserProfilePayload = {
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
          // SAFETY: trusted internal value already conforms to the asserted type.
          role: formData.role as 'Student' | 'Teacher' | 'Admin',
          // SAFETY: trusted internal value already conforms to the asserted type.
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

  const visibleRangeStart = totalUsers === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const visibleRangeEnd = totalUsers === 0 ? 0 : Math.min(currentPage * pageSize, totalUsers);

  // Quick-filter card definitions for the interactive KPI strip (Teacher-inspired aesthetic)
  const kpiCards = [
    {
      label: 'All Users',
      value: totalUsers,
      subtext: 'Total registered',
      badge: 'Total',
      icon: Users,
      gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.52)]',
      isActive: roleFilter === 'All Roles' && statusFilter === 'All Status',
      onClick: () => {
        setRoleFilter('All Roles');
        setStatusFilter('All Status');
        setCurrentPage(1);
        clearSelection();
      },
    },
    {
      label: 'Active',
      value: users.filter(u => u.status === 'Active').length,
      subtext: 'Online / verified',
      badge: 'Live',
      icon: UserCheck,
      gradient: 'bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.52)]',
      isActive: statusFilter === 'Active',
      onClick: () => {
        setStatusFilter(statusFilter === 'Active' ? 'All Status' : 'Active');
        setCurrentPage(1);
        clearSelection();
      },
    },
    {
      label: 'Admins',
      value: users.filter(u => u.role === 'Admin').length,
      subtext: 'Portal security',
      badge: 'Security',
      icon: Shield,
      gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(2,132,199,0.52)]',
      isActive: roleFilter === 'Admin',
      onClick: () => {
        setRoleFilter(roleFilter === 'Admin' ? 'All Roles' : 'Admin');
        setCurrentPage(1);
        clearSelection();
      },
    },
    {
      label: 'Teachers',
      value: users.filter(u => u.role === 'Teacher').length,
      subtext: 'Faculty educators',
      badge: 'Faculty',
      icon: GraduationCap,
      gradient: 'bg-gradient-to-br from-[#FFB356] via-[#F29424] to-[#D97706]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(242,148,36,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(242,148,36,0.52)]',
      isActive: roleFilter === 'Teacher',
      onClick: () => {
        setRoleFilter(roleFilter === 'Teacher' ? 'All Roles' : 'Teacher');
        setCurrentPage(1);
        clearSelection();
      },
    },
    {
      label: 'Students',
      value: users.filter(u => u.role === 'Student').length,
      subtext: 'Active learners',
      badge: 'Learners',
      icon: School,
      gradient: 'bg-gradient-to-br from-[#60A5FA] via-[#2563EB] to-[#1D4ED8]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(37,99,235,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(37,99,235,0.52)]',
      isActive: roleFilter === 'Student',
      onClick: () => {
        setRoleFilter(roleFilter === 'Student' ? 'All Roles' : 'Student');
        setCurrentPage(1);
        clearSelection();
      },
    },
  ] as const;

  const hasActiveFilters = searchQuery || roleFilter !== 'All Roles' || statusFilter !== 'All Status' || sectionFilter !== 'All Sections';

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-6 animate-in fade-in duration-300">
      {/* ── Interactive KPI Quick-Filter Strip (Symmetrical Non-Scrolling Bento Grid) ── */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {loading && users.length === 0
            ? Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={`kpi-skel-${idx}`}
                  className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-slate-200/60 dark:bg-slate-800 animate-pulse ${
                    idx === 0 ? 'col-span-2 sm:col-span-4 lg:col-span-1 h-12 sm:min-h-[115px]' : 'col-span-1 h-16 sm:min-h-[115px]'
                  }`}
                >
                  <div className="h-3 w-14 bg-white/40 dark:bg-slate-700 rounded-full mb-2 sm:mb-4" />
                  <div className="h-5 sm:h-7 w-10 bg-white/40 dark:bg-slate-700 rounded-lg" />
                </div>
              ))
            : kpiCards.map((card, idx) => (
                <button
                  key={card.label}
                  type="button"
                  onClick={card.onClick}
                  className={`group relative ${card.gradient} ${card.shadow} border border-white/25 hover:border-white/40 rounded-xl sm:rounded-2xl flex transition-all duration-300 ease-out text-left cursor-pointer overflow-hidden ${
                    idx === 0
                      ? 'col-span-2 sm:col-span-4 lg:col-span-1 flex-row items-center justify-between p-2.5 sm:p-4 min-h-0 sm:min-h-[115px] sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-start lg:justify-between'
                      : 'col-span-1 flex-col justify-between p-2 sm:p-4 min-h-[58px] sm:min-h-[115px]'
                  } ${
                    card.isActive ? 'ring-2 ring-white shadow-xl scale-[1.01] sm:scale-[1.02] brightness-110' : 'hover:-translate-y-0.5'
                  }`}
                >
                  {/* ambient decorative orb */}
                  <div className="absolute -bottom-6 -right-6 w-20 sm:w-24 h-20 sm:h-24 bg-white/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                  {/* top shine strip */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                  {idx === 0 ? (
                    <>
                      {/* Mobile Row Layout for Total Card */}
                      <div className="flex items-center gap-2.5 relative z-10">
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <card.icon size={14} className="text-white sm:hidden" />
                          <card.icon size={16} className="text-white hidden sm:block" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-[11px] font-bold text-white leading-tight">{card.label}</p>
                          <p className="text-[10px] text-white/70 font-medium hidden sm:block">{card.subtext}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 relative z-10">
                        <p className="text-xl sm:text-2xl font-black font-display text-white leading-none tracking-tight tabular-nums drop-shadow-sm">{card.value}</p>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/25">
                          {card.badge}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Category Cards */}
                      <div className="flex items-center justify-between w-full relative z-10 mb-1 sm:mb-3">
                        <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <card.icon size={13} className="text-white sm:hidden" />
                          <card.icon size={16} className="text-white hidden sm:block" />
                        </div>
                        <div className="flex items-center gap-1">
                          {card.isActive && (
                            <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white" />
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 sm:px-2 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/25">
                            {card.badge}
                          </span>
                        </div>
                      </div>

                      <div className="relative z-10 min-w-0">
                        <p className="text-lg sm:text-2xl font-black font-display text-white leading-none tracking-tight tabular-nums drop-shadow-sm">{card.value}</p>
                        <p className="text-[10px] sm:text-[11px] font-bold text-white/95 mt-0.5 sm:mt-1 truncate">{card.label}</p>
                        <p className="text-[10px] text-white/70 mt-0.5 truncate font-medium hidden sm:block">{card.subtext}</p>
                      </div>
                    </>
                  )}
                </button>
              ))}
        </div>
      </div>

      {/* ── Compact Toolbar + Active Filters ── */}
      <div className="sticky top-0 z-20 px-1 pt-2 pb-2.5 bg-[#f8fafc]/95 dark:bg-slate-900/95 backdrop-blur-md w-full">
        {/* Toolbar card */}
        <div className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-2.5 sm:p-3 lg:px-4 lg:py-3 shadow-sm flex flex-col gap-2.5 w-full">
          {/* ── Line 1: Search & Filter Controls + Action Buttons ── */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-2 w-full">
            {/* Search */}
            <div className="relative flex-1 min-w-0 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 group-focus-within:text-[#9956DE] transition-colors shrink-0" size={16} />
              <Input
                placeholder="Search name, email, LRN…"
                className="pl-9 pr-8 h-10 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl text-xs font-semibold focus-visible:ring-1 focus-visible:ring-purple-400 focus-visible:border-purple-400 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all w-full"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                  clearSelection();
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); clearSelection(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile/Tablet Action Shortcuts (< lg) */}
            <div className="flex items-center gap-1.5 shrink-0 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-slate-400 dark:text-slate-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#9956DE] border border-slate-200/60 dark:border-slate-700/60 hover:border-purple-200/60 transition-all shrink-0"
                onClick={() => loadUsers(currentPage)}
                disabled={loading || isProcessingBulkAction}
                title="Refresh"
                aria-label="Refresh users"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </Button>

              <Button
                className="h-10 gap-1.5 bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white rounded-xl shadow-md shadow-purple-500/25 hover:shadow-purple-500/40 transition-all px-3 sm:px-4 font-bold text-xs shrink-0 border border-purple-400/30"
                onClick={() => handleOpenAddModal()}
                disabled={isProcessingBulkAction}
              >
                <UserPlus size={15} />
                <span className="hidden xs:inline sm:inline">Add User</span>
              </Button>
            </div>

            {/* Desktop Divider */}
            <div className="hidden lg:block w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0" />

            {/* Filter Dropdowns (< lg: grid or flex row; >= lg: inline controls) */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
              {/* Role filter */}
              <Select
                value={roleFilter}
                onValueChange={(value) => { setRoleFilter(value); setCurrentPage(1); clearSelection(); }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[130px] rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 shrink-0 shadow-none hover:border-purple-300 dark:hover:border-purple-600 focus:ring-1 focus:ring-purple-400 transition-all">
                  <span className="truncate">{roleFilter === 'All Roles' ? 'All Roles' : roleFilter}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                  <SelectItem value="All Roles" className="text-xs font-medium">All Roles</SelectItem>
                  <SelectItem value="Admin" className="text-xs font-medium">Administrator</SelectItem>
                  <SelectItem value="Teacher" className="text-xs font-medium">Educator</SelectItem>
                  <SelectItem value="Student" className="text-xs font-medium">Student</SelectItem>
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); clearSelection(); }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[125px] rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 shrink-0 shadow-none hover:border-purple-300 dark:hover:border-purple-600 focus:ring-1 focus:ring-purple-400 transition-all">
                  <span className="truncate">{statusFilter === 'All Status' ? 'All Status' : statusFilter}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                  <SelectItem value="All Status" className="text-xs font-medium">All Statuses</SelectItem>
                  <SelectItem value="Active" className="text-xs font-medium">Active</SelectItem>
                  <SelectItem value="Inactive" className="text-xs font-medium">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Section filter */}
              {availableSections.length > 0 && (
                <Select
                  value={sectionFilter}
                  onValueChange={(value) => { setSectionFilter(value); clearSelection(); }}
                >
                  <SelectTrigger className="h-10 w-full col-span-2 sm:col-span-1 sm:w-[130px] rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 shrink-0 shadow-none hover:border-purple-300 dark:hover:border-purple-600 focus:ring-1 focus:ring-purple-400 transition-all">
                    <span className="truncate">{sectionFilter === 'All Sections' ? 'All Sections' : sectionFilter}</span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                    <SelectItem value="All Sections" className="text-xs font-medium">All Sections</SelectItem>
                    {availableSections.map(s => (
                      <SelectItem key={s} value={s} className="text-xs font-medium">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Desktop Divider */}
            <div className="hidden lg:block w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0" />

            {/* Desktop Action Buttons (>= lg) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-slate-400 dark:text-slate-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#9956DE] border border-transparent hover:border-purple-200/60 transition-all shrink-0"
                onClick={() => loadUsers(currentPage)}
                disabled={loading || isProcessingBulkAction}
                title="Refresh"
                aria-label="Refresh users"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </Button>

              <Button
                className="h-10 gap-2 bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white rounded-xl shadow-md shadow-purple-500/25 hover:shadow-purple-500/40 transition-all px-4 sm:px-5 font-bold text-xs shrink-0 border border-purple-400/30"
                onClick={() => handleOpenAddModal()}
                disabled={isProcessingBulkAction}
              >
                <UserPlus size={15} />
                <span>Add User</span>
              </Button>
            </div>
          </div>

          {/* ── Line 2: Context / Active Filters (Left) + Pagination (Right) ── */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Left: Active Filters or Default Range Context */}
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {hasActiveFilters ? (
                <>
                  <SlidersHorizontal size={12} className="text-purple-500 shrink-0" />
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#9956DE] dark:text-purple-300 text-[11px] font-bold border border-purple-200/70 dark:border-purple-900/60 shadow-xs">
                      &quot;{searchQuery}&quot;
                      <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="text-purple-400 hover:text-purple-700 ml-0.5"><X size={11} /></button>
                    </span>
                  )}
                  {roleFilter !== 'All Roles' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[11px] font-bold border border-violet-200/70 dark:border-violet-900/60 shadow-xs">
                      Role: {roleFilter}
                      <button type="button" onClick={() => { setRoleFilter('All Roles'); setCurrentPage(1); }} className="text-violet-400 hover:text-violet-700 ml-0.5"><X size={11} /></button>
                    </span>
                  )}
                  {statusFilter !== 'All Status' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/70 dark:border-emerald-900/60 shadow-xs">
                      {statusFilter}
                      <button type="button" onClick={() => { setStatusFilter('All Status'); setCurrentPage(1); }} className="text-emerald-400 hover:text-emerald-700 ml-0.5"><X size={11} /></button>
                    </span>
                  )}
                  {sectionFilter !== 'All Sections' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-[11px] font-bold border border-sky-200/70 dark:border-sky-900/60 shadow-xs">
                      &sect;&nbsp;{sectionFilter}
                      <button type="button" onClick={() => { setSectionFilter('All Sections'); }} className="text-sky-400 hover:text-sky-700 ml-0.5"><X size={11} /></button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setRoleFilter('All Roles'); setStatusFilter('All Status'); setSectionFilter('All Sections'); setCurrentPage(1); clearSelection(); }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <FilterX size={12} /> Clear all
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-[#9956DE] shrink-0" />
                  <span>Showing <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{visibleRangeStart}–{visibleRangeEnd}</strong> of <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{totalUsers}</strong> user records</span>
                </div>
              )}
            </div>

            {/* Right: Pagination Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline">
                {visibleRangeStart}–{visibleRangeEnd} of {totalUsers}
              </span>

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
                <SelectTrigger className="h-8 w-[95px] rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 px-2.5 shrink-0 shadow-none hover:border-purple-300 dark:hover:border-purple-600 focus:ring-1 focus:ring-purple-400 transition-all">
                  <SelectValue placeholder={`${pageSize}/page`} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size} className="text-xs font-medium">{size}/page</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-900/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6.5 w-6.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-[#9956DE] disabled:opacity-30 transition-all cursor-pointer"
                  disabled={currentPage <= 1 || loading || isProcessingBulkAction}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 px-1.5 tabular-nums">
                  {currentPage}/{Math.max(totalPages, 1)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6.5 w-6.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-[#9956DE] disabled:opacity-30 transition-all cursor-pointer"
                  disabled={!hasNextPage || loading || isProcessingBulkAction || currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-[1000px] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-purple-500/30 text-white rounded-2xl p-3 flex flex-col xl:flex-row items-center gap-3 animate-in slide-in-from-bottom-2 duration-300 shadow-2xl" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center gap-2.5 px-3 border-r border-slate-800 pr-5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9956DE] to-[#7274ED] flex items-center justify-center text-white font-black text-xs tabular-nums shadow-sm">
              {selectedCount}
            </div>
            <div>
              <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider leading-none">Selected</p>
              <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                {allFilteredSelected ? 'All matching users' : `${selectedCount} chosen`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Compact Bulk Tools */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <Select value={bulkRoleTarget} onValueChange={(value) => setBulkRoleTarget(memberOf(['Student', 'Teacher', 'Admin'] as const, value, 'Student'))}>
                <SelectTrigger className="h-8 bg-transparent border-none text-white text-xs font-medium min-w-[90px] focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Teacher">Teacher</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 bg-gradient-to-r from-[#9956DE] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white text-xs font-semibold rounded-lg px-2.5" onClick={() => void handleBulkChangeRole()}>Apply Role</Button>
            </div>

            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <Select value={bulkStatusTarget} onValueChange={(value) => setBulkStatusTarget(memberOf(['Active', 'Inactive'] as const, value, 'Active'))}>
                <SelectTrigger className="h-8 bg-transparent border-none text-white text-xs font-medium min-w-[90px] focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg px-2.5" onClick={() => void handleBulkChangeStatus()}>Set Status</Button>
            </div>

            <div className="h-5 w-[1px] bg-slate-800 mx-1" />

            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" className="h-8 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold gap-1.5" onClick={() => void handleBulkResetPassword()}>
                <Mail size={13} /> Reset Pass
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold gap-1.5" onClick={() => void handleBulkExport()}>
                <Download size={13} /> Export
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 text-xs font-semibold gap-1.5" onClick={handleBulkDelete}>
                <Trash2 size={13} /> Delete
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
             {!allFilteredSelected && selectedCount < totalUsers && (
              <Button variant="ghost" className="h-8 text-purple-300 hover:text-purple-200 hover:bg-slate-800 text-xs font-semibold" onClick={handleSelectAllFiltered}>
                Select All {totalUsers}
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" onClick={clearSelection}>
              <FilterX size={15} />
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

      {/* ── Users Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        {loading && users.length > 0 && (
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#9956DE]" size={32} />
          </div>
        )}
        
        {/* Mobile card view (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-3">
          <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer select-none">
              <Checkbox checked={allVisibleSelected} onCheckedChange={handleToggleSelectVisible} className="rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-[#9956DE] data-[state=checked]:border-[#9956DE]" />
              <span className="text-[11px]">Select ({visibleRangeStart}–{visibleRangeEnd} of {totalUsers})</span>
            </label>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <Button
                variant="ghost"
                size="icon"
                className="h-6.5 w-6.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 disabled:opacity-30"
                disabled={currentPage <= 1 || loading || isProcessingBulkAction}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[11px] font-extrabold text-[#9956DE] dark:text-purple-300 px-1.5 tabular-nums">
                {currentPage}/{Math.max(totalPages, 1)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6.5 w-6.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 disabled:opacity-30"
                disabled={!hasNextPage || loading || isProcessingBulkAction || currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
          {loading && users.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 font-bold">Loading user records...</div>
          ) : users.length > 0 ? (
            displayedUsers.map((user) => {
              const isPendingToggle = pendingRowActionUserId === user.id;
              const isSelected = isUserSelected(user.id);
              return (
                <div
                  key={`mobile-${user.id}`}
                  className={`p-4 rounded-2xl border shadow-xs space-y-3.5 transition-all ${
                    isSelected
                      ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/60 hover:shadow-md'
                  } border-l-4 ${
                    user.role === 'Admin' ? 'border-l-sky-500' : user.role === 'Teacher' ? 'border-l-[#9956DE]' : 'border-l-blue-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleUserSelection(user.id)}
                      className="rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-[#9956DE] data-[state=checked]:border-[#9956DE] shrink-0"
                    />
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ring-2 ring-purple-100 dark:ring-purple-900/40">
                        <AvatarImage src={user.photo || getDefaultAvatar(user.gender)} className="object-cover" />
                        <AvatarFallback className="bg-purple-50 dark:bg-purple-950/40 text-[#9956DE] dark:text-purple-300 font-bold text-sm">{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate text-sm leading-tight">{user.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {user.role === 'Admin' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60">
                        <Shield size={11} /> Admin
                      </span>
                    )}
                    {user.role === 'Teacher' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#9956DE] dark:text-purple-300 border border-purple-200/60">
                        <GraduationCap size={11} /> Teacher
                      </span>
                    )}
                    {user.role === 'Student' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60">
                        <School size={11} /> Student
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                      user.status === 'Active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {user.status}
                    </span>
                    {(user.grade || user.section || user.department) && (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate">
                        {user.role === 'Student'
                          ? [user.grade, user.classSection || user.section].filter(Boolean).join(' · ')
                          : user.department}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-11 min-h-[44px] rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs gap-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-[#9956DE]"
                      onClick={() => handleOpenEditModal(user)}
                    >
                      <Edit size={14} /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex-1 h-11 min-h-[44px] rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs gap-1.5 ${
                        user.status === 'Active'
                          ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                      onClick={() => handleToggleStatus(user)}
                      disabled={pendingRowActionUserId === user.id || isProcessingBulkAction}
                    >
                      {pendingRowActionUserId === user.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : user.status === 'Active' ? <Ban size={14} /> : <UserCheck size={14} />}
                      {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-xl border-slate-200 dark:border-slate-700 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-800 flex items-center justify-center"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      disabled={isProcessingBulkAction}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-purple-50 dark:bg-purple-950/30 rounded-full flex items-center justify-center mx-auto text-[#9956DE]">
                <Users size={32} />
              </div>
              <div className="space-y-1">
                <p className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm">No Users Found</p>
                <p className="text-xs text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                  We couldn't find any users matching your current filters. Try adjusting your search.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Desktop table view (≥ md) */}
        <div className="hidden md:flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 relative">
          {/* Top Brand Accent Line */}
          <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] shrink-0 rounded-t-2xl" />

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: '768px' }}>
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xs border-b border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-3.5 w-12 text-center">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={handleToggleSelectVisible} className="rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-[#9956DE] data-[state=checked]:border-[#9956DE]" />
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">User Identity</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Role</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Placement</th>
                  <th className="px-4 py-3.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Last Activity</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <Loader2 className="animate-spin text-[#9956DE] mx-auto" size={36} />
                      <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Loading user records...</p>
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  displayedUsers.map((user) => {
                    const isPendingToggle = pendingRowActionUserId === user.id;
                    const isSelected = isUserSelected(user.id);
                    return (
                      <tr
                        key={user.id}
                        className={`transition-all group relative border-b border-slate-100 dark:border-slate-800/70 border-l-2 border-l-transparent hover:border-l-[#9956DE] ${
                          isSelected
                            ? 'bg-purple-50/50 dark:bg-purple-950/25'
                            : 'hover:bg-purple-50/30 dark:hover:bg-purple-950/15'
                        }`}
                      >
                        <td className="px-3.5 py-3.5 align-middle text-center relative w-12">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleUserSelection(user.id)}
                            className="rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-[#9956DE] data-[state=checked]:border-[#9956DE] transition-colors"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3.5">
                            <div className="relative shrink-0">
                              <Avatar className="h-11 w-11 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ring-2 ring-purple-100 dark:ring-purple-950/60 group-hover:ring-purple-300 dark:group-hover:ring-purple-600 transition-all">
                                <AvatarImage src={user.photo || getDefaultAvatar(user.gender)} className="object-cover" />
                                <AvatarFallback className="bg-purple-50 dark:bg-purple-950/50 text-[#9956DE] dark:text-purple-300 font-bold text-sm">{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${user.status === 'Active' ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate text-sm leading-tight group-hover:text-[#8643C8] dark:group-hover:text-purple-400 transition-colors">{user.name}</p>
                              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-col gap-1 items-center justify-center">
                            {user.role === 'Admin' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-xs">
                                <Shield size={12} className="text-sky-600 dark:text-sky-400" />
                                Administrator
                              </span>
                            )}
                            {user.role === 'Teacher' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
                                <GraduationCap size={12} className="text-purple-600 dark:text-purple-400" />
                                Teacher
                              </span>
                            )}
                            {user.role === 'Student' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
                                <School size={12} className="text-blue-600 dark:text-blue-400" />
                                Student
                              </span>
                            )}
                            {user.lrn && (
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">LRN: {user.lrn}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center">
                            {user.status === 'Active' ? (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {user.role === 'Student' ? (user.grade || 'Grade 11') : (user.department || 'Mathematics')}
                            </p>
                            <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                              {user.role === 'Student' ? (user.classSection || user.section || 'Unassigned Section') : 'Academic Faculty'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {user.lastLogin ? 'Recent Activity' : 'No Logins Yet'}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {user.lastLogin || 'Account pending setup'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit — icon only */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-[#9956DE] text-[#9956DE] hover:text-white dark:text-purple-300 dark:hover:text-white border border-purple-200/80 dark:border-purple-800/60 hover:border-[#9956DE] shadow-xs hover:shadow-md hover:shadow-purple-500/20 active:scale-95 transition-all cursor-pointer group"
                              title={`Edit ${user.name}`}
                              aria-label={`Edit ${user.name}`}
                            >
                              <Edit size={13} className="shrink-0 transition-transform group-hover:scale-110" />
                            </button>

                            {/* Deactivate / Activate — icon only */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              disabled={isPendingToggle || isProcessingBulkAction}
                              className={`inline-flex items-center justify-center h-8 w-8 rounded-xl border shadow-xs active:scale-95 transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed ${
                                user.status === 'Active'
                                  ? 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white border-amber-200/80 dark:border-amber-800/60 hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/20'
                                  : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-300 hover:text-white border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/20'
                              }`}
                              title={user.status === 'Active' ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                              aria-label={user.status === 'Active' ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                            >
                              {isPendingToggle ? (
                                <Loader2 size={13} className="animate-spin shrink-0" />
                              ) : user.status === 'Active' ? (
                                <Ban size={13} className="shrink-0 transition-transform group-hover:scale-110" />
                              ) : (
                                <UserCheck size={13} className="shrink-0 transition-transform group-hover:scale-110" />
                              )}
                            </button>

                            {/* Delete — icon only */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              disabled={isProcessingBulkAction}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-200/80 dark:border-rose-800/60 hover:border-rose-500 shadow-xs hover:shadow-md hover:shadow-rose-500/20 active:scale-95 transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                              title={`Delete ${user.name}`}
                              aria-label={`Delete ${user.name}`}
                            >
                              <Trash2 size={13} className="shrink-0 transition-transform group-hover:scale-110" />
                            </button>
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
      </div>

      {/* Add/Edit User Modal - Teacher & Executive Modern Styling */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !saving && setIsModalOpen(open)}>
        <DialogContent className="sm:max-w-[850px] rounded-[32px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
          <div className={`h-2 w-full bg-gradient-to-r ${editingUser ? 'from-[#9956DE] via-[#8643C8] to-[#7274ED]' : 'from-[#52B847] via-[#36962C] to-[#15803D]'}`} />
          <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-4 sm:gap-5">
                {editingUser ? (
                  <div className="relative shrink-0">
                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-2 border-white dark:border-slate-800 shadow-lg shadow-purple-500/15 ring-2 ring-purple-200 dark:ring-purple-800/60 transition-transform duration-300 hover:scale-105">
                      <AvatarImage src={editingUser.photo || getDefaultAvatar(editingUser.gender)} className="object-cover" />
                      <AvatarFallback className="bg-purple-100 dark:bg-purple-950/60 text-[#9956DE] dark:text-purple-300 font-black text-xl">
                        {editingUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-xs ${editingUser.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </div>
                ) : (
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 shadow-emerald-500/20 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                    <Plus size={26} className="drop-shadow-sm" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white leading-tight">
                    {editingUser ? 'Edit User Credentials & Access' : 'Onboard New Academic User'}
                  </DialogTitle>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#9956DE] animate-pulse" />
                    {editingUser ? (
                      <span>
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">{editingUser.name}</strong> • {editingUser.role} • {editingUser.email}
                      </span>
                    ) : (
                      'System Enrollment Pipeline'
                    )}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Left Column: Primary Info */}
              <div className="space-y-5">
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-[#9956DE] dark:text-purple-400 uppercase tracking-wider pb-1.5 border-b border-purple-100 dark:border-purple-950/60 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9956DE]" /> Identity Details
                  </h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative group">
                      <Input
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        placeholder="e.g. Maria Santos"
                        className={`h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-purple-400/40 text-slate-900 dark:text-white placeholder:text-slate-400 ${formErrors.name ? 'border-rose-400 bg-rose-50/30' : ''}`}
                      />
                      {formErrors.name && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500" />}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        if (editingUser) return;
                        setFormData({ ...formData, email: e.target.value });
                      }}
                      readOnly={Boolean(editingUser)}
                      placeholder="name@school.edu.ph"
                      className={`h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-purple-400/40 text-slate-900 dark:text-white placeholder:text-slate-400 ${editingUser ? 'opacity-60 grayscale bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Access Role</label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(value) => {
                          const nextRole = memberOf(['Student', 'Teacher', 'Admin'] as const, value, 'Student');
                          setFormData({ ...formData, role: nextRole, lrn: nextRole === 'Student' ? formData.lrn : '' });
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                          <SelectItem value="Student" className="text-xs font-bold">Student</SelectItem>
                          <SelectItem value="Teacher" className="text-xs font-bold">Teacher</SelectItem>
                          <SelectItem value="Admin" className="text-xs font-bold">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Status</label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                          <SelectItem value="Active" className="text-xs font-bold">Active</SelectItem>
                          <SelectItem value="Inactive" className="text-xs font-bold">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Contextual Info */}
              <div className="space-y-5">
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-[#9956DE] dark:text-purple-400 uppercase tracking-wider pb-1.5 border-b border-purple-100 dark:border-purple-950/60 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9956DE]" /> Academic Assignment
                  </h4>

                  {formData.role === 'Student' ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Grade Level</label>
                          <Input value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} placeholder="Grade 11" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Section</label>
                          <Input value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} placeholder="STEM A" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">LRN (12 digits)</label>
                        <Input value={formData.lrn} onChange={(e) => setFormData({ ...formData, lrn: e.target.value })} placeholder="123456789012" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold tracking-widest text-slate-900 dark:text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in duration-300">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Department / Office</label>
                      <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Mathematics Department" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white" />
                    </div>
                  )}

                  {!editingUser && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Initial Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 pr-10 text-xs font-bold tracking-widest text-slate-900 dark:text-white"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button 
                variant="outline" 
                className="h-11 rounded-xl font-bold uppercase tracking-wider text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95" 
                onClick={() => setIsModalOpen(false)} 
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveUser}
                className={`h-11 rounded-xl font-bold uppercase tracking-wider gap-2 text-xs shadow-md transition-all active:scale-95 ${
                  editingUser
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white shadow-purple-500/25'
                    : 'bg-gradient-to-r from-[#52B847] to-[#36962C] hover:from-[#43A047] hover:to-[#2E7D32] text-white shadow-emerald-500/25'
                }`}
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : editingUser ? <><Save size={16} /> Save Changes</> : <><Plus size={16} /> Onboard User</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        zIndexClass="z-[70]"
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
