import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User,
  Shield,
  Bell,
  Palette,
  Download,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  Moon,
  Sun,
  LogOut,
  CheckCircle2,
  Save,
  Flame,
  Smartphone,
  Info,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import ConfirmModal from './ConfirmModal';
import {
  DEFAULT_USER_SETTINGS,
  QuizDifficultyPreference,
  StudyTimePreference,
  UserSettings,
} from '../types/models';
import {
  changeEmailWithReauth,
  changePasswordWithReauth,
} from '../services/settingsService';
import { validateProfileDraft } from '../utils/profileValidation';
import { usePushNotificationControls } from './PushNotificationsManager';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';

export interface ProfileData {
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  photo?: string;
  avatarLayers?: { top?: string; bottom?: string; shoes?: string; accessory?: string };
  role?: 'student' | 'teacher' | 'admin';
  gender?: 'male' | 'female' | 'prefer_not_to_say' | null;
  lrn?: string;
  grade?: string;
  section?: string;
  school?: string;
  department?: string;
  subject?: string;
  yearsOfExperience?: string;
  qualification?: string;
  position?: string;
  major?: string;
  gpa?: string;
  enrollmentDate?: string;
}

interface SettingsPageProps {
  profileData: ProfileData;
  settingsData?: UserSettings;
  userLevel?: number;
  userXP?: number;
  onSaveProfile: (data: ProfileData) => Promise<void> | void;
  onSaveSettings: (settings: Partial<UserSettings>) => Promise<void>;
  onApplySettingsPreview?: (settings: UserSettings) => void;
  onExportData?: () => Promise<void>;
  onClearCache?: () => Promise<void>;
  onResetData?: () => Promise<void>;
  onLogout?: () => void;
  onNavigateToAvatarShop?: () => void;
  onNavigateToProfile?: () => void;
  onBack?: () => void;
  previousTabName?: string;
}

// SAFETY: trusted internal value already conforms to the asserted type.
const cloneDefaultSettings = (): UserSettings =>
  JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings;

export type SettingsTab = 'appearance' | 'notifications' | 'security' | 'data';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  profileData,
  settingsData,
  userLevel = 1,
  userXP = 0,
  onSaveProfile,
  onSaveSettings,
  onApplySettingsPreview,
  onExportData,
  onClearCache,
  onResetData,
  onLogout,
  onNavigateToAvatarShop,
  onNavigateToProfile,
  onBack,
  previousTabName,
}) => {
  const pushControls = usePushNotificationControls();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  // Form states
  const [accountData, setAccountData] = useState<ProfileData>(profileData);
  const [localSettings, setLocalSettings] = useState<UserSettings>(() =>
    settingsData ? JSON.parse(JSON.stringify(settingsData)) : cloneDefaultSettings(),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Password & Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isTabDropdownOpen, setIsTabDropdownOpen] = useState(false);
  const tabDropdownRef = useRef<HTMLDivElement>(null);

  // Close tab dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Node && tabDropdownRef.current && !tabDropdownRef.current.contains(target)) {
        setIsTabDropdownOpen(false);
      }
    };
    if (isTabDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTabDropdownOpen]);

  // Re-auth modal for email change
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailAuthPassword, setEmailAuthPassword] = useState('');
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Synchronize incoming profile data when not dirty to avoid blowing away user edits
  useEffect(() => {
    if (!isDirty) {
      setAccountData(profileData);
    }
  }, [profileData, isDirty]);

  // Synchronize incoming settings
  useEffect(() => {
    if (settingsData) {
      setLocalSettings(JSON.parse(JSON.stringify(settingsData)));
    }
  }, [settingsData]);

  // Live preview for appearance changes
  useEffect(() => {
    onApplySettingsPreview?.(localSettings);
  }, [localSettings, onApplySettingsPreview]);

  // Handle local changes
  const handleAccountFieldChange = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setAccountData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const updateSettings = (updater: (current: UserSettings) => UserSettings) => {
    setLocalSettings((prev) => {
      const next = updater(prev);
      return next;
    });
    setIsDirty(true);
  };

  // Hook into browser beforeunload
  useUnsavedChangesWarning(isDirty);

  // Save all settings modifications
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings(localSettings);
      if (onSaveProfile && isDirty) {
        await onSaveProfile(accountData);
      }
      setIsDirty(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save changes';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await changePasswordWithReauth(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to change password';
      toast.error(message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle email update with re-auth
  const handleEmailSubmit = async () => {
    if (!emailAuthPassword.trim()) {
      toast.error('Current password is required to verify identity');
      return;
    }
    if (!newEmailAddress.includes('@') || !newEmailAddress.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      await changeEmailWithReauth(emailAuthPassword, newEmailAddress);
      setAccountData((prev) => ({ ...prev, email: newEmailAddress }));
      setIsEmailModalOpen(false);
      setEmailAuthPassword('');
      setNewEmailAddress('');
      toast.success('Email address updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email update failed';
      toast.error(message);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const tabs = useMemo(
    () => [
      {
        id: 'appearance' as const,
        label: 'Display & Theme',
        icon: Palette,
        desc: 'Screen brightness, colors, and animation feel',
        tabColor: 'sky',
        activeClass: 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 border-t-2 border-x-2 border-sky-500 shadow-[0_-4px_14px_rgba(14,165,233,0.16)] z-20 translate-y-[2px]',
        inactiveClass: 'bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100/90 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 border-t border-x border-sky-200/80 dark:border-sky-800/70 z-10',
        spineGradient: 'from-sky-500 via-cyan-500 to-blue-400',
        folderBorder: 'border-sky-500/35 dark:border-sky-500/30 shadow-sky-950/5',
        badgeClass: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      },
      {
        id: 'notifications' as const,
        label: 'Alerts & Reminders',
        icon: Bell,
        desc: 'When MathPulse notifies you about streaks & battles',
        tabColor: 'amber',
        activeClass: 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 border-t-2 border-x-2 border-amber-500 shadow-[0_-4px_14px_rgba(245,158,11,0.16)] z-20 translate-y-[2px]',
        inactiveClass: 'bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/90 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-t border-x border-amber-200/80 dark:border-amber-800/70 z-10',
        spineGradient: 'from-amber-500 via-orange-500 to-yellow-400',
        folderBorder: 'border-amber-500/35 dark:border-amber-500/30 shadow-amber-950/5',
        badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      },
      {
        id: 'security' as const,
        label: 'Login & Password',
        icon: Shield,
        desc: 'Account password and student security status',
        tabColor: 'emerald',
        activeClass: 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-t-2 border-x-2 border-emerald-500 shadow-[0_-4px_14px_rgba(16,185,129,0.16)] z-20 translate-y-[2px]',
        inactiveClass: 'bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-t border-x border-emerald-200/80 dark:border-emerald-800/70 z-10',
        spineGradient: 'from-emerald-500 via-teal-500 to-green-400',
        folderBorder: 'border-emerald-500/35 dark:border-emerald-500/30 shadow-emerald-950/5',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      },
      {
        id: 'data' as const,
        label: 'My Data & Files',
        icon: Download,
        desc: 'Save learning history and clear temporary files',
        tabColor: 'rose',
        activeClass: 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border-t-2 border-x-2 border-rose-500 shadow-[0_-4px_14px_rgba(244,63,94,0.16)] z-20 translate-y-[2px]',
        inactiveClass: 'bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100/90 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border-t border-x border-rose-200/80 dark:border-rose-800/70 z-10',
        spineGradient: 'from-rose-500 via-pink-500 to-red-400',
        folderBorder: 'border-rose-500/35 dark:border-rose-500/30 shadow-rose-950/5',
        badgeClass: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      },
    ],
    [],
  );

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 xl:px-12 pt-1 sm:pt-2 pb-28 sm:pb-16 space-y-4 sm:space-y-6 max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] mx-auto min-h-screen">
      {/* ── 0. Back to previous location ── */}
      {onBack && (
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 shadow-xs backdrop-blur-md text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            title={`Return to ${previousTabName || 'previous view'}`}
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1 text-purple-600 dark:text-purple-400" />
            <span>
              Back to <span className="font-extrabold text-purple-600 dark:text-purple-400">{previousTabName || 'Dashboard'}</span>
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>System Settings</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 capitalize">{currentTab.label}</span>
          </div>
        </div>
      )}

      {/* ── 1. Main Settings Layout ── */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8 xl:gap-10">
        {/* ── Left/Top Column: Profile Overview Card & Quick Actions ── */}
        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col items-center gap-4 lg:sticky lg:top-4">
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 opacity-90" />
            
            {/* Avatar thumbnail */}
            <div className="relative mt-4 mb-3">
              {profileData.photo ? (
                <img
                  src={profileData.photo}
                  alt={profileData.name || 'User'}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-2xl border-4 border-white dark:border-slate-900 shadow-md">
                  <User size={36} />
                </div>
              )}
              <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black shadow-xs">
                Lv {userLevel}
              </span>
            </div>

            <h3 className="text-base font-display font-black text-slate-900 dark:text-white truncate max-w-full">
              {profileData.name || 'Student Learner'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {profileData.grade || 'Grade 11'} {profileData.section ? `• ${profileData.section}` : ''}
            </p>

            {/* Direct button to open My Profile */}
            {onNavigateToProfile && (
              <Button
                type="button"
                variant="outline"
                onClick={onNavigateToProfile}
                className="w-full mt-4 h-10 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 font-bold text-xs flex items-center justify-between px-3.5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User size={15} />
                  <span>View & Edit Student ID Pass</span>
                </div>
                <ChevronRight size={14} />
              </Button>
            )}
          </div>

          {/* Quick Actions & Status Strip */}
          <div className="w-full max-w-[360px] sm:max-w-[390px] flex flex-col gap-2.5">
            {onNavigateToAvatarShop && (
              <div
                className="relative group w-full"
                onMouseEnter={() => setIsAvatarHovered(true)}
                onMouseLeave={() => setIsAvatarHovered(false)}
              >
                {/* Cute Peeking Avatar Character on Hover */}
                <div
                  className={`absolute -top-12 right-6 z-20 flex items-center gap-1.5 transition-all duration-300 ease-out pointer-events-none ${
                    isAvatarHovered
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'
                  }`}
                >
                  {/* Speech Bubble */}
                  <div className="px-2.5 py-1 rounded-xl bg-purple-700 text-white text-[10px] font-bold shadow-md whitespace-nowrap flex items-center gap-1 animate-bounce">
                    <span>Dress me up!</span>
                    <span>🎨</span>
                  </div>
                  {/* Avatar Head with Glow */}
                  <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 via-pink-400 to-amber-300 shadow-lg border-2 border-white dark:border-slate-900">
                    <img
                      src="/avatar/avatar_icon.png"
                      alt="MathPulse AI Avatar"
                      className="w-full h-full object-contain rounded-full bg-purple-100 dark:bg-purple-950"
                    />
                    <span className="absolute -top-1 -right-1 text-xs animate-pulse">✨</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onNavigateToAvatarShop}
                  className="w-full h-11 px-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50/60 to-indigo-50/70 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/40 hover:from-purple-600 hover:via-indigo-600 hover:to-pink-500 text-purple-900 dark:text-purple-200 hover:text-white border-2 border-purple-300/80 dark:border-purple-700/60 hover:border-transparent shadow-sm hover:shadow-purple-500/25 font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  <Sparkles size={16} className="text-amber-500 dark:text-amber-300 group-hover:rotate-12 group-hover:scale-110 transition-transform" />
                  <span className="tracking-wide">Open Avatar Studio</span>
                </Button>
              </div>
            )}

            {/* Enrolled Learner Status Badge */}
            <div className="px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs backdrop-blur-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-700 dark:text-slate-200">Enrolled Learner</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400">
                {accountData.grade || 'Senior High'} {accountData.section ? `(${accountData.section})` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Colorful File Folder Settings Hub ── */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          {/* Mobile & Tablet Tab Dropdown Button (< lg) */}
          <div className="lg:hidden w-full mb-3 relative" ref={tabDropdownRef}>
            <button
              type="button"
              onClick={() => setIsTabDropdownOpen((prev) => !prev)}
              className={`w-full p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 ${currentTab.folderBorder} shadow-sm hover:shadow-md flex items-center justify-between gap-3 transition-all cursor-pointer`}
              aria-expanded={isTabDropdownOpen}
              aria-label="Select settings section"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl ${currentTab.badgeClass} flex items-center justify-center shrink-0`}>
                  <currentTab.icon size={16} />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Settings Section</span>
                  <span className="block text-sm font-display font-black text-slate-900 dark:text-white truncate">{currentTab.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentTab.badgeClass}`}>
                  Sheet {tabs.findIndex((t) => t.id === activeTab) + 1} of {tabs.length}
                </span>
                <ChevronDown size={18} className={`text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isTabDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Dropdown Menu Options */}
            {isTabDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl bg-white/97 dark:bg-slate-900/97 backdrop-blur-md border-2 border-slate-200/90 dark:border-slate-800 shadow-2xl p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsTabDropdownOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? `${tab.badgeClass} bg-opacity-100 border-2 shadow-sm`
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Colored icon badge per tab */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? `${tab.badgeClass} scale-110 shadow-sm`
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <span className={`block text-xs font-bold truncate ${isSelected ? '' : 'text-slate-800 dark:text-slate-100'}`}>{tab.label}</span>
                          <span className={`block text-[10px] truncate ${isSelected ? 'opacity-75' : 'text-slate-400 dark:text-slate-500'}`}>
                            {tab.desc}
                          </span>
                        </div>
                      </div>
                      {/* Active indicator */}
                      {isSelected && (
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${tab.badgeClass} shadow-xs`}>
                          <Check size={9} />
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop File Folder Divider Tabs (lg+) */}
          <div className="hidden lg:flex items-end gap-1.5 sm:gap-2 overflow-x-auto pb-0 pt-1 px-1 scrollbar-hide select-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-t-xl sm:rounded-t-2xl font-bold text-xs transition-all duration-200 shrink-0 whitespace-nowrap cursor-pointer ${
                    isActive ? tab.activeClass : tab.inactiveClass
                  }`}
                >
                  <Icon
                    size={14}
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'scale-110' : 'opacity-70'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Folder Jacket Body Container with Notebook Grid & Paperclip */}
          <div className={`relative rounded-2xl rounded-b-2xl bg-white dark:bg-slate-900 border-2 ${currentTab.folderBorder} shadow-xl p-4 sm:p-6 lg:p-7 z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]`}>
            {/* Top spine / folder rim highlight with matching tab gradient */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${currentTab.spineGradient} opacity-90 rounded-t-sm`} />

            {/* Cute folder paperclip graphic */}
            <div className="absolute -top-3 right-6 hidden sm:flex flex-col items-center pointer-events-none z-30 select-none">
              <div className="w-3.5 h-8 rounded-full border-2 border-slate-400/80 dark:border-slate-400 bg-slate-200/90 dark:bg-slate-700/90 shadow-sm transform rotate-6" />
            </div>

            {/* Folder Header: Section Title + Save Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-200/70 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    {currentTab.label}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentTab.badgeClass}`}>
                    Settings Sheet
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentTab.desc}
                </p>
              </div>

              {/* Folder Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className={`w-full sm:w-auto h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer ${
                    isDirty
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/25 ring-2 ring-purple-500/40 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : isDirty ? (
                    <Save size={14} />
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
                  )}
                  <span>{isSaving ? 'Saving…' : isDirty ? 'Save Changes' : 'Saved'}</span>
                </Button>
              </div>
            </div>

            {/* Active Tab Content Sheets */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="grid grid-cols-1 gap-5"
              >
                {/* TAB 1: DISPLAY & THEME */}
                {activeTab === 'appearance' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Theme & Display Mode */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Palette size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                            Screen Theme & Brightness
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Choose day or night mode and manage smooth animations
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Day & Night Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            { isDark: false, label: 'Light Mode', icon: Sun },
                            { isDark: true, label: 'Dark Mode', icon: Moon },
                          ].map(({ isDark, label, icon: ModeIcon }) => {
                            const isSelected = localSettings.appearance.darkMode === isDark;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() =>
                                  updateSettings((s) => ({
                                    ...s,
                                    appearance: { ...s.appearance, darkMode: isDark },
                                  }))
                                }
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/30'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <ModeIcon size={18} className="mb-1.5" />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Gentle Screen Animations
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Turn on to soften moving and floating effects
                            </p>
                          </div>
                          <Switch
                            checked={localSettings.appearance.reduceAnimations}
                            onCheckedChange={(checked) =>
                              updateSettings((s) => ({
                                ...s,
                                appearance: { ...s.appearance, reduceAnimations: checked },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Daily Study Targets & Preferences */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Flame size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                            Daily Study Targets
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Set your daily math practice goals and challenge levels
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Daily XP Target
                            </label>
                            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                              {localSettings.learning.dailyXpGoal} XP / day
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[50, 100, 200, 300].map((goal) => (
                              <button
                                key={goal}
                                type="button"
                                onClick={() =>
                                  updateSettings((s) => ({
                                    ...s,
                                    learning: { ...s.learning, dailyXpGoal: goal },
                                  }))
                                }
                                className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                  localSettings.learning.dailyXpGoal === goal
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {goal} XP
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                              Practice Level
                            </label>
                            <Select
                              value={localSettings.learning.quizDifficultyPreference}
                              onValueChange={(val) =>
                                updateSettings((s) => ({
                                  ...s,
                                  // SAFETY: bounded value matches QuizDifficultyPreference type.
                                  learning: { ...s.learning, quizDifficultyPreference: val as QuizDifficultyPreference },
                                }))
                              }
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[80] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                                <SelectItem value="adaptive">Adaptive (Matches my pace)</SelectItem>
                                <SelectItem value="easy">Foundational (Easy review)</SelectItem>
                                <SelectItem value="medium">Standard (Grade 11-12 STEM)</SelectItem>
                                <SelectItem value="hard">Advanced (Honor challenges)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                              Best Time to Study
                            </label>
                            <Select
                              value={localSettings.learning.preferredStudyTime}
                              onValueChange={(val) =>
                                updateSettings((s) => ({
                                  ...s,
                                  // SAFETY: bounded value matches StudyTimePreference type.
                                  learning: { ...s.learning, preferredStudyTime: val as StudyTimePreference },
                                }))
                              }
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[80] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                                <SelectItem value="morning">Morning (6 AM - 12 PM)</SelectItem>
                                <SelectItem value="afternoon">Afternoon (12 PM - 6 PM)</SelectItem>
                                <SelectItem value="evening">Evening (6 PM - 10 PM)</SelectItem>
                                <SelectItem value="night">Night (10 PM - 2 AM)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ALERTS & REMINDERS */}
                {activeTab === 'notifications' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Device Alerts Card */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                            Phone & Device Alerts
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Get quick reminders on your device before you lose your streak
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/40 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Device Alert Status
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Currently:{' '}
                            <span className="font-bold text-purple-600 dark:text-purple-400 capitalize">
                              {pushControls.status}
                            </span>
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            if (pushControls.status === 'enabled') {
                              await pushControls.disable();
                              toast.success('Push notifications disabled');
                            } else {
                              const ok = await pushControls.enable();
                              if (ok) toast.success('Push notifications enabled');
                              else toast.error('Notification permission not granted');
                            }
                          }}
                          className="h-9 px-3 text-xs font-bold rounded-xl border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 shrink-0 cursor-pointer"
                        >
                          {pushControls.status === 'enabled' ? 'Turn Off' : 'Turn On Alerts'}
                        </Button>
                      </div>

                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Streak Saver Alerts
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Ping me in the evening if I haven't done my daily math practice
                            </p>
                          </div>
                          <Switch
                            checked={localSettings.pushPreferences.streak_reminder}
                            onCheckedChange={(checked) =>
                              updateSettings((s) => ({
                                ...s,
                                pushPreferences: { ...s.pushPreferences, streak_reminder: checked },
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              1v1 Quiz Battle Invites
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Alert when a classmate challenges me to a live math showdown
                            </p>
                          </div>
                          <Switch
                            checked={localSettings.pushPreferences.quiz_battle}
                            onCheckedChange={(checked) =>
                              updateSettings((s) => ({
                                ...s,
                                pushPreferences: { ...s.pushPreferences, quiz_battle: checked },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* In-App Reminders Card */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Bell size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                            In-App Reminders
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Choose which updates pop up in your bell icon
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Teacher Lessons & Exercises
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              When teachers upload curated lessons or assignments
                            </p>
                          </div>
                          <Switch
                            checked={localSettings.notifications.notificationTypes.newContent}
                            onCheckedChange={(checked) =>
                              updateSettings((s) => ({
                                ...s,
                                notifications: {
                                  ...s.notifications,
                                  notificationTypes: {
                                    ...s.notifications.notificationTypes,
                                    newContent: checked,
                                  },
                                },
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Badges & Level Ups
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Celebratory pop-ups when you earn XP and rank up
                            </p>
                          </div>
                          <Switch
                            checked={localSettings.notifications.notificationTypes.achievements}
                            onCheckedChange={(checked) =>
                              updateSettings((s) => ({
                                ...s,
                                notifications: {
                                  ...s.notifications,
                                  notificationTypes: {
                                    ...s.notifications.notificationTypes,
                                    achievements: checked,
                                  },
                                },
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Daily Streak & Practice Prompts
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Helpful reminders to keep your learning momentum going
                            </p>
                          </div>
                          <Switch
                            checked={localSettings.notifications.notificationTypes.streakAlerts}
                            onCheckedChange={(checked) =>
                              updateSettings((s) => ({
                                ...s,
                                notifications: {
                                  ...s.notifications,
                                  notificationTypes: {
                                    ...s.notifications.notificationTypes,
                                    streakAlerts: checked,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: LOGIN & PASSWORD */}
                {activeTab === 'security' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Change Password Card */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <Lock size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                            Change Password
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Enter your current password to set a new secure one
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Current Password
                          </label>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="h-10 pr-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            New Password (at least 8 characters)
                          </label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="••••••••"
                              className="h-10 pr-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Confirm New Password
                          </label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-mono"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={isUpdatingPassword || !currentPassword || !newPassword}
                          className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm mt-1 cursor-pointer"
                        >
                          {isUpdatingPassword ? 'Updating Password…' : 'Update Password'}
                        </Button>
                      </form>
                    </div>

                    {/* Account Safety & Status */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Shield size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                            Account Safety & Status
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Your verified student badge and login protection
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              MathPulse Student ID
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 truncate max-w-[180px] sm:max-w-xs">
                              {accountData.uid || 'Anonymous'}
                            </p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            Verified
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              School Role
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Senior High STEM Scholar
                            </p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 capitalize">
                            {accountData.role || 'student'}
                          </span>
                        </div>

                        <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5">
                          <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                            <span className="font-bold">School Computer Tip:</span> Remember to sign out whenever you finish using MathPulse AI on a school library or computer lab device so no one else touches your streak or rankings.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: MY DATA & FILES */}
                {activeTab === 'data' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Backup & Export */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                          <Download size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                            Save Records & Free Up Space
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Download your learning history or clear temporary files
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Download Learning Summary
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Save a copy of your quiz scores, topics completed, and XP records
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isExporting}
                            onClick={async () => {
                              setIsExporting(true);
                              try {
                                await onExportData?.();
                              } finally {
                                setIsExporting(false);
                              }
                            }}
                            className="h-9 px-3 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer"
                          >
                            {isExporting ? 'Saving…' : 'Save Copy'}
                          </Button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Clear Temporary Files
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Speed up the app and free up phone storage without losing any progress
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isClearingCache}
                            onClick={async () => {
                              setIsClearingCache(true);
                              try {
                                await onClearCache?.();
                              } finally {
                                setIsClearingCache(false);
                              }
                            }}
                            className="h-9 px-3 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer"
                          >
                            {isClearingCache ? 'Clearing…' : 'Free Up Space'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Reset & Sign Out */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-rose-200/80 dark:border-rose-900/40 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-display font-bold text-rose-600 dark:text-rose-400">
                            Assessment Reset & Sign Out
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Retake your start-of-year assessment or safely exit
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/40 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                              Retake Initial Diagnostic Test
                            </p>
                            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                              Clear previous diagnostic scores if you want to be re-evaluated
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsResetConfirmOpen(true)}
                            className="h-9 px-3 rounded-xl border-rose-300 dark:border-rose-700 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer"
                          >
                            Retake Test
                          </Button>
                        </div>

                        {onLogout && (
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Sign Out
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Safely log out of your session on this device
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={onLogout}
                              className="h-9 px-3 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                            >
                              <LogOut size={14} />
                              Log Out
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

  {/* ── 4. Re-auth Email Modal ── */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Change Account Email
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Email Address
                  </label>
                  <Input
                    type="email"
                    value={newEmailAddress}
                    onChange={(e) => setNewEmailAddress(e.target.value)}
                    placeholder="student@school.edu.ph"
                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Current Password (Verification)
                  </label>
                  <Input
                    type="password"
                    value={emailAuthPassword}
                    onChange={(e) => setEmailAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="h-10 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isUpdatingEmail || !newEmailAddress || !emailAuthPassword}
                  onClick={handleEmailSubmit}
                  className="h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                >
                  {isUpdatingEmail ? 'Updating…' : 'Confirm Update'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 5. Confirm Data Reset Modal ── */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={async () => {
          setIsResetConfirmOpen(false);
          await onResetData?.();
        }}
        title="Reset Diagnostic Assessment?"
        message="Are you sure you want to reset your diagnostic testing data? This will clear your current benchmark scores and competency flags so you can retake the assessment."
        confirmText="Yes, Reset Data"
        cancelText="Cancel"
        type="warning"
        icon="warning"
      />
    </div>
  );
};

export default SettingsPage;
