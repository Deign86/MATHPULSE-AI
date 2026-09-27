import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  Save,
  RotateCcw,
  RefreshCw,
  Users,
  Mail,
  Phone,
  Building,
  Award,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { AdminIDCard } from './AdminIDCard';
import ConfirmModal from '../ConfirmModal';
import { validateProfileDraft } from '../../utils/profileValidation';
import type { ProfileData } from '../SettingsPage';

export interface AdminProfilePageProps {
  profileData: ProfileData;
  onSaveProfile: (data: ProfileData) => Promise<void> | void;
  onBack?: () => void;
  previousTabName?: string;
  onNavigateToSettings?: () => void;
}

export const AdminProfilePage: React.FC<AdminProfilePageProps> = ({
  profileData,
  onSaveProfile,
  onBack,
  previousTabName = 'Overview',
  onNavigateToSettings,
}) => {
  const sanitizeAdminProfile = (data: ProfileData): ProfileData => ({
    ...data,
    name: data.name ? data.name.replace(/System Administrator/gi, 'Administrator') : 'Administrator',
  });

  const [accountData, setAccountData] = useState<ProfileData>(() => sanitizeAdminProfile(profileData));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setAccountData(sanitizeAdminProfile(profileData));
    }
  }, [profileData, isDirty]);

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
      phone: accountData.phone || '',
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await onSaveProfile(accountData);
      setIsDirty(false);
      toast.success('Administrator profile updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update administrator profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-6 animate-in fade-in duration-300 min-h-[calc(100vh-80px)]">
      {/* Navigation Header */}
      {onBack && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (isDirty) {
                setIsDiscardConfirmOpen(true);
              } else {
                onBack();
              }
            }}
            className="group inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            title={`Return to ${previousTabName}`}
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1 text-indigo-600 dark:text-indigo-400" />
            <span>
              Back to <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{previousTabName}</span>
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Admin</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">My Profile</span>
          </div>
        </div>
      )}

      {/* Main Grid: ID Pass on Left, Details Editor on Right */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        {/* Left Column: 3D Executive Admin ID Pass */}
        <div className="w-full lg:w-[360px] xl:w-[410px] shrink-0 flex flex-col items-center gap-4 lg:sticky lg:top-4">
          <AdminIDCard
            profileData={accountData}
            onPhotoUploaded={(photoURL) => handleFieldChange('photo', photoURL)}
            className="w-full"
          />

          {/* Quick Status Info */}
          <div className="w-full max-w-[360px] sm:max-w-[390px] xl:max-w-[410px] flex flex-col gap-2.5">
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-700 dark:text-slate-200">Governance Status</span>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                Active Administrator
              </span>
            </div>

            {onNavigateToSettings && (
              <Button
                type="button"
                variant="outline"
                onClick={onNavigateToSettings}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Go to System Settings
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Profile Details Card */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md p-5 sm:p-7 lg:p-8 overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-600 pointer-events-none" />

            {/* Header: Title + Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-200/80 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Shield size={18} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    Administrative Profile
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Administrator
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage your administrative credentials, contact details, and institutional alignment.
                </p>
              </div>

              {/* Action Buttons */}
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
                  className={`w-full sm:w-auto h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isDirty
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Section 1: Basic Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.name || ''}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        maxLength={100}
                        placeholder="Administrator Name"
                        className="pl-10 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        value={accountData.email || ''}
                        disabled
                        className="pl-10 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        type="tel"
                        maxLength={20}
                        placeholder="+63 912 345 6789"
                        className="pl-10 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Gender
                    </label>
                    <Select
                      value={accountData.gender || ''}
                      onValueChange={(val) => {
                        const parsedGender = val === 'male' || val === 'female' || val === 'prefer_not_to_say' ? val : null;
                        handleFieldChange('gender', parsedGender);
                      }}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-xl">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2: Administrative Credentials */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <div className="w-1 h-3.5 bg-sky-500 rounded-full" />
                  Administrative Credentials
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Admin ID
                    </label>
                    <div className="relative">
                      <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.lrn || (accountData.uid ? `ADM-${accountData.uid.slice(0, 6).toUpperCase()}` : 'ADM-2025-001')}
                        onChange={(e) => handleFieldChange('lrn', e.target.value)}
                        placeholder="ADM-2025-001"
                        className="pl-10 h-10 text-xs rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Position / Title
                    </label>
                    <div className="relative">
                      <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.position || 'Curriculum Administrator'}
                        onChange={(e) => handleFieldChange('position', e.target.value)}
                        placeholder="e.g. Curriculum Administrator"
                        className="pl-10 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Office / Department
                    </label>
                    <div className="relative">
                      <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.school || accountData.department || 'Senior High School Mathematics'}
                        onChange={(e) => handleFieldChange('school', e.target.value)}
                        placeholder="Department or Division"
                        className="pl-10 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Access Level
                    </label>
                    <div className="relative">
                      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value="Full Governance"
                        disabled
                        className="pl-10 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={handleDiscardChanges}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes to your administrator profile. Discarding will revert all edits back to their previous values."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        type="warning"
      />
    </div>
  );
};

export default AdminProfilePage;
