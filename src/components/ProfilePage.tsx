import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  User,
  GraduationCap,
  Save,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { StudentIDCard } from './StudentIDCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { validateProfileDraft } from '../utils/profileValidation';
import { changeEmailWithReauth } from '../services/settingsService';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import ConfirmModal from './ConfirmModal';
import type { ProfileData } from './SettingsPage';

export interface ProfilePageProps {
  profileData: ProfileData;
  userLevel?: number;
  userXP?: number;
  onSaveProfile: (data: ProfileData) => Promise<void> | void;
  onNavigateToAvatarShop?: () => void;
  onNavigateToSettings?: () => void;
  onBack?: () => void;
  previousTabName?: string;
  unsavedChangesRef?: React.MutableRefObject<boolean>;
  pendingNavigation?: string | null;
  onConfirmLeave?: () => void;
  onCancelNavigation?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profileData,
  userLevel = 1,
  userXP = 0,
  onSaveProfile,
  onNavigateToAvatarShop,
  onNavigateToSettings,
  onBack,
  previousTabName,
  unsavedChangesRef,
  pendingNavigation,
  onConfirmLeave,
  onCancelNavigation,
}) => {
  const [accountData, setAccountData] = useState<ProfileData>(profileData);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  // Email update modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailAuthPassword, setEmailAuthPassword] = useState('');
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Synchronize incoming profile data when clean
  useEffect(() => {
    if (!isDirty) {
      setAccountData(profileData);
    }
  }, [profileData, isDirty]);

  // Sync isDirty to parent ref for route guarding
  useEffect(() => {
    if (unsavedChangesRef) {
      unsavedChangesRef.current = isDirty;
    }
  }, [isDirty, unsavedChangesRef]);

  // Hook into browser beforeunload
  useUnsavedChangesWarning(isDirty);

  const handleFieldChange = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setAccountData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleDiscardChanges = () => {
    setAccountData(profileData);
    setIsDirty(false);
    setIsDiscardConfirmOpen(false);
    toast.info('Changes discarded');
  };

  const handleSave = async () => {
    const validationError = validateProfileDraft({
      name: accountData.name || '',
      phone: accountData.phone,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await onSaveProfile(accountData);
      setIsDirty(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 xl:px-12 pt-1 sm:pt-2 pb-28 sm:pb-16 space-y-4 sm:space-y-6 max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] mx-auto min-h-screen">
      {/* Navigation Header */}
      {onBack && (
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <button
            type="button"
            onClick={() => {
              if (isDirty) {
                setIsDiscardConfirmOpen(true);
              } else {
                onBack();
              }
            }}
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 shadow-xs backdrop-blur-md text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            title={`Return to ${previousTabName || 'previous view'}`}
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1 text-purple-600 dark:text-purple-400" />
            <span>
              Back to <span className="font-extrabold text-purple-600 dark:text-purple-400">{previousTabName || 'Dashboard'}</span>
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Student Dashboard</span>
            <span>/</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">My Profile</span>
          </div>
        </div>
      )}

      {/* Main Grid: Student ID Card on Left, Details Editor on Right */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8 xl:gap-10">
        {/* Left Column: 3D Interactive Student ID Pass */}
        <div className="w-full lg:w-[360px] xl:w-[410px] shrink-0 flex flex-col items-center gap-4 lg:sticky lg:top-4">
          <StudentIDCard
            profileData={accountData}
            userLevel={userLevel}
            userXP={userXP}
            onPhotoUploaded={(photoURL) => handleFieldChange('photo', photoURL)}
            className="w-full"
          />

          {/* Quick Actions & Status Strip */}
          <div className="w-full max-w-[360px] sm:max-w-[390px] xl:max-w-[410px] flex flex-col gap-2.5">
            {onNavigateToAvatarShop && (
              <div
                className="relative group w-full"
                onMouseEnter={() => setIsAvatarHovered(true)}
                onMouseLeave={() => setIsAvatarHovered(false)}
              >
                {/* Floating Peeking Mascot on Hover */}
                <div
                  className={`absolute -top-12 right-6 z-20 flex items-center gap-1.5 transition-all duration-300 ease-out pointer-events-none ${
                    isAvatarHovered
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'
                  }`}
                >
                  <div className="px-2.5 py-1 rounded-xl bg-purple-700 text-white text-[10px] font-bold shadow-md whitespace-nowrap flex items-center gap-1 animate-bounce">
                    <span>Dress me up!</span>
                    <span>🎨</span>
                  </div>
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

        {/* Right Column: Profile Details Card */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          <div className="relative rounded-3xl bg-white dark:bg-slate-900 border-2 border-purple-500/35 dark:border-purple-500/30 shadow-xl p-5 sm:p-7 lg:p-8 z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            {/* Top spine highlight */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-400 opacity-90 rounded-t-2xl" />

            {/* Card Header: Section Title + Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-200/70 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <User size={18} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    My Profile
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Official Student Pass
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage your personal contact details, school records, and learning credentials.
                </p>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {isDirty && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDiscardConfirmOpen(true)}
                    className="h-10 px-3 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Discard</span>
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={handleSave}
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

            {/* Profile Forms Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Personal Details Card */}
              <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                      Basic Information
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your identity and contact details
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <Input
                      value={accountData.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="Learner Full Name"
                      className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="flex gap-2">
                      <Input
                        disabled
                        value={accountData.email || ''}
                        className="h-10 rounded-xl bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEmailModalOpen(true)}
                        className="h-10 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer"
                      >
                        Change
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Phone Number
                      </label>
                      <Input
                        value={accountData.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        placeholder="+63 912 345 6789"
                        className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Gender
                      </label>
                      <Select
                        value={accountData.gender || 'prefer_not_to_say'}
                        onValueChange={(val) =>
                          // SAFETY: bounded gender string literals match ProfileData gender type.
                          handleFieldChange('gender', val as ProfileData['gender'])
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent className="z-[80] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non_binary">Non-binary</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Academic Information Card */}
              <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                      School & Grade Details
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Senior High track, strand, and enrollment details
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      DepEd LRN (12-Digit Student ID)
                    </label>
                    <Input
                      value={accountData.lrn || ''}
                      onChange={(e) => handleFieldChange('lrn', e.target.value)}
                      placeholder="12-digit DepEd LRN"
                      maxLength={12}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Grade Level
                      </label>
                      <Select
                        value={accountData.grade?.includes('12') ? 'Grade 12' : 'Grade 11'}
                        onValueChange={(val) => handleFieldChange('grade', val)}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer">
                          <SelectValue placeholder="Grade Level" />
                        </SelectTrigger>
                        <SelectContent className="z-[80] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                          <SelectItem value="Grade 11">Grade 11 (Senior High)</SelectItem>
                          <SelectItem value="Grade 12">Grade 12 (Senior High)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Section / Strand
                      </label>
                      <Input
                        value={accountData.section || ''}
                        onChange={(e) => handleFieldChange('section', e.target.value)}
                        placeholder="e.g. STEM-11A"
                        className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      School Name
                    </label>
                    <Input
                      value={accountData.school || ''}
                      onChange={(e) => handleFieldChange('school', e.target.value)}
                      placeholder="e.g. Specialized Science High School"
                      className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for In-Page Discard */}
      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={handleDiscardChanges}
        title="Discard Unsaved Changes?"
        message="You have unsaved edits in your profile. Are you sure you want to discard them and revert to the saved version?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        type="warning"
        icon="warning"
      />

      {/* Confirmation Modal for App Navigation Guard */}
      <ConfirmModal
        isOpen={Boolean(pendingNavigation)}
        onClose={() => onCancelNavigation?.()}
        onConfirm={() => onConfirmLeave?.()}
        title="Leave Without Saving?"
        message={`You have unsaved changes in your profile. If you leave now to navigate to ${pendingNavigation || 'another view'}, your unsaved changes will be lost.`}
        confirmText="Leave Without Saving"
        cancelText="Stay on Profile"
        type="warning"
        icon="warning"
      />

      {/* Change Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Change Email Address
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your current password to confirm your identity before updating your email address.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Email Address
                </label>
                <Input
                  type="email"
                  value={newEmailAddress}
                  onChange={(e) => setNewEmailAddress(e.target.value)}
                  placeholder="new.email@example.com"
                  className="h-10 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={emailAuthPassword}
                  onChange={(e) => setEmailAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setEmailAuthPassword('');
                  setNewEmailAddress('');
                }}
                className="h-9 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleEmailSubmit}
                disabled={isUpdatingEmail}
                className="h-9 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isUpdatingEmail ? 'Updating…' : 'Update Email'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
