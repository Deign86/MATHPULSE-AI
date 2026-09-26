import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Save,
  RotateCcw,
  RefreshCw,
  Users,
  Mail,
  Phone,
  Building,
  Award,
  BookOpen,
  Settings,
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
import { TeacherIDCard } from './TeacherIDCard';
import ConfirmModal from '../ConfirmModal';
import { validateProfileDraft } from '../../utils/profileValidation';
import type { ProfileData } from '../SettingsPage';

export interface TeacherProfilePageProps {
  profileData: ProfileData;
  onSaveProfile: (data: ProfileData) => Promise<void> | void;
  onBack?: () => void;
  previousTabName?: string;
  onNavigateToSettings?: () => void;
}

export const TeacherProfilePage: React.FC<TeacherProfilePageProps> = ({
  profileData,
  onSaveProfile,
  onBack,
  previousTabName = 'Dashboard',
  onNavigateToSettings,
}) => {
  const sanitizeTeacherProfile = (data: ProfileData): ProfileData => ({
    ...data,
    name: data.name || 'Mathematics Educator',
  });

  const [accountData, setAccountData] = useState<ProfileData>(() => sanitizeTeacherProfile(profileData));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setAccountData(sanitizeTeacherProfile(profileData));
    }
  }, [profileData, isDirty]);

  const handleFieldChange = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setAccountData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handlePhotoUploaded = (photoURL: string) => {
    setAccountData((prev) => ({ ...prev, photo: photoURL }));
    setIsDirty(true);
    toast.success('Faculty photo updated. Click Save to persist.');
  };

  const handleResetForm = () => {
    setAccountData(sanitizeTeacherProfile(profileData));
    setIsDirty(false);
    toast.info('Changes reverted to saved profile');
  };

  const handleDiscardChanges = () => {
    setIsDiscardConfirmOpen(false);
    setIsDirty(false);
    if (onBack) {
      onBack();
    }
  };

  const handleSave = async () => {
    const validationError = validateProfileDraft(accountData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await onSaveProfile(accountData);
      setIsDirty(false);
      toast.success('Teacher profile saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 lg:space-y-6 min-h-[calc(100vh-80px)]">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                if (isDirty) {
                  setIsDiscardConfirmOpen(true);
                } else {
                  onBack();
                }
              }}
              className="group inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
              title={`Return to ${previousTabName}`}
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1 text-violet-600 dark:text-violet-400" />
              <span>
                Back to <span className="font-extrabold text-violet-600 dark:text-violet-400">{previousTabName}</span>
              </span>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Faculty</span>
            <span>/</span>
            <span className="text-violet-600 dark:text-violet-400 font-bold">Profile</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetForm}
              disabled={isSaving}
              className="min-h-[40px] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl"
            >
              <RotateCcw size={14} className="mr-1.5" />
              Reset Changes
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`min-h-[40px] px-4 text-xs font-bold rounded-xl transition-all shadow-xs ${
              isDirty
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25 active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} className="mr-1.5" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Interactive Teacher ID Pass */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col items-center gap-4">
          <TeacherIDCard
            profileData={accountData}
            onPhotoUploaded={handlePhotoUploaded}
            className="mx-auto"
          />

          <div className="w-full max-w-[360px] sm:max-w-[390px] xl:max-w-[410px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <GraduationCap size={16} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Click or press Space on the card to inspect your official DepEd STEM faculty authorization barcode and QR credentials.
              </p>
            </div>

            {onNavigateToSettings && (
              <Button
                type="button"
                variant="outline"
                onClick={onNavigateToSettings}
                className="w-full min-h-[44px] text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/80 rounded-xl justify-between"
              >
                <span className="flex items-center gap-2">
                  <Settings size={14} />
                  Open Account Settings
                </span>
                <span>→</span>
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Faculty Profile Details Form */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                  Teacher Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your faculty identification, DepEd affiliation, and teaching specializations.
                </p>
              </div>

              {isDirty && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Changes
                </span>
              )}
            </div>

            <div className="space-y-6">
              {/* Section 1: Basic Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <div className="w-1 h-3.5 bg-violet-600 rounded-full" />
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
                        placeholder="Faculty Name"
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

              {/* Section 2: Academic & Teaching Credentials */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <div className="w-1 h-3.5 bg-fuchsia-500 rounded-full" />
                  Academic & Teaching Credentials
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Faculty / Teacher ID
                    </label>
                    <div className="relative">
                      <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.lrn || (accountData.uid ? `TCH-${accountData.uid.slice(0, 6).toUpperCase()}` : 'TCH-2025-001')}
                        onChange={(e) => handleFieldChange('lrn', e.target.value)}
                        placeholder="TCH-2025-001"
                        className="pl-10 h-10 text-xs rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Academic Position
                    </label>
                    <div className="relative">
                      <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.position || 'Master Teacher I / Faculty'}
                        onChange={(e) => handleFieldChange('position', e.target.value)}
                        placeholder="e.g. Master Teacher I"
                        className="pl-10 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Department / Division
                    </label>
                    <div className="relative">
                      <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.department || accountData.school || 'Senior High School STEM Department'}
                        onChange={(e) => handleFieldChange('department', e.target.value)}
                        placeholder="e.g. STEM Department"
                        className="pl-10 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Subject Specialization
                    </label>
                    <div className="relative">
                      <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.subject || 'General Mathematics & Pre-Calculus'}
                        onChange={(e) => handleFieldChange('subject', e.target.value)}
                        placeholder="e.g. General Mathematics"
                        className="pl-10 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Educational Qualification
                    </label>
                    <div className="relative">
                      <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.qualification || 'B.S. Secondary Education (Mathematics)'}
                        onChange={(e) => handleFieldChange('qualification', e.target.value)}
                        placeholder="e.g. B.S. Math Education"
                        className="pl-10 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Teaching Experience
                    </label>
                    <div className="relative">
                      <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={accountData.yearsOfExperience || '5+ Years'}
                        onChange={(e) => handleFieldChange('yearsOfExperience', e.target.value)}
                        placeholder="e.g. 5 Years"
                        className="pl-10 h-10 text-xs rounded-xl"
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
        message="You have unsaved changes to your teacher profile. Discarding will revert all edits back to their previous values."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        type="warning"
      />
    </div>
  );
};

export default TeacherProfilePage;
