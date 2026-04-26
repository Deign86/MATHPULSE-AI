import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Clock,
  Download,
  Globe,
  Lock,
  Shield,
  Smartphone,
  Trash2,
  User,
  X,
  Palette,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import ConfirmModal from './ConfirmModal';
import ProfilePictureUploader from './ProfilePictureUploader';
import { DEFAULT_USER_SETTINGS, ProfileVisibility, QuizDifficultyPreference, StudyTimePreference, UserSettings } from '../types/models';

interface ProfileData {
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  photo?: string;
  avatarLayers?: { top?: string; bottom?: string; shoes?: string; accessory?: string };
  role?: 'student' | 'teacher' | 'admin';
  lrn?: string;
  grade?: string;
  section?: string;
  school?: string;
  department?: string;
  subject?: string;
  yearsOfExperience?: string;
  qualification?: string;
  position?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData?: ProfileData;
  onSave?: (data: ProfileData) => void | Promise<void>;
  settingsData?: UserSettings;
  onSaveSettings?: (settings: Partial<UserSettings>) => Promise<void>;
  onApplySettingsPreview?: (settings: UserSettings) => void;
  onUpdatePassword?: (newPassword: string) => Promise<void>;
  onExportData?: () => Promise<void>;
  onClearCache?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  onResetData?: () => Promise<void>;
}

const cloneDefaultSettings = (): UserSettings => JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings;

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profileData,
  onSave,
  settingsData,
  onSaveSettings,
  onApplySettingsPreview,
  onUpdatePassword,
  onExportData,
  onClearCache,
  onDeleteAccount,
  onResetData,
}) => {
  const [activeSection, setActiveSection] = useState('account');
  const [accountData, setAccountData] = useState<ProfileData>({});
  const [localSettings, setLocalSettings] = useState<UserSettings>(cloneDefaultSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const hasInitializedForOpenRef = useRef(false);
  const initialSettingsRef = useRef<UserSettings>(cloneDefaultSettings());

  useEffect(() => {
    if (!isOpen) {
      hasInitializedForOpenRef.current = false;
      return;
    }

    if (hasInitializedForOpenRef.current) {
      return;
    }

    hasInitializedForOpenRef.current = true;

    const incomingSettings = settingsData ? JSON.parse(JSON.stringify(settingsData)) : cloneDefaultSettings();
    initialSettingsRef.current = incomingSettings;

    setAccountData({
      uid: profileData?.uid,
      name: profileData?.name || '',
      email: profileData?.email || '',
      phone: profileData?.phone || '',
      photo: profileData?.photo || '',
      avatarLayers: profileData?.avatarLayers,
      role: profileData?.role,
      lrn: profileData?.lrn || '',
      grade: profileData?.grade || '',
      section: profileData?.section || '',
      school: profileData?.school || '',
      department: profileData?.department || '',
      subject: profileData?.subject || '',
      yearsOfExperience: profileData?.yearsOfExperience || '',
      qualification: profileData?.qualification || '',
      position: profileData?.position || '',
    });

    setLocalSettings(incomingSettings);
  }, [isOpen, profileData, settingsData]);

  useEffect(() => {
    if (!isOpen) return;
    onApplySettingsPreview?.(localSettings);
  }, [isOpen, localSettings, onApplySettingsPreview]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onApplySettingsPreview?.(initialSettingsRef.current);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onApplySettingsPreview, settingsData]);

  const sections = useMemo(
    () => [
      { id: 'account', label: 'Account', icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'privacy', label: 'Privacy & Security', icon: Shield },
      { id: 'learning', label: 'Learning', icon: Globe },
      { id: 'data', label: 'Data & Storage', icon: Download },
    ],
    [],
  );

  const updateSettings = (updater: (current: UserSettings) => UserSettings) => {
    setLocalSettings((prev) => updater(prev));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(accountData);
      }
      if (onSaveSettings) {
        await onSaveSettings(localSettings);
      }
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsResetConfirmOpen(false);
    setIsDeleteConfirmOpen(false);
    setIsPasswordModalOpen(false);
    setNewPassword('');
    onApplySettingsPreview?.(initialSettingsRef.current);
    onClose();
  };

  const handleResetData = () => {
    if (!onResetData || isResetting) return;

    setIsResetConfirmOpen(true);
  };

  const handleConfirmResetData = async () => {
    if (!onResetData || isResetting) return;

    setIsResetConfirmOpen(false);

    setIsResetting(true);
    try {
      await onResetData();
      toast.success('Testing data reset completed');
    } catch (error) {
      console.error('Error resetting testing data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset testing data');
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdatePasswordClick = async () => {
    if (!onUpdatePassword) {
      toast.info('Password update is not available in this environment.');
      return;
    }

    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleSubmitPasswordUpdate = async () => {
    if (!onUpdatePassword || isUpdatingPassword) return;

    const password = newPassword.trim();

    if (!password) {
      toast.error('Password is required.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await onUpdatePassword(password);
      toast.success('Password updated successfully.');
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEnable2FA = () => {
    toast.info('Two-factor authentication setup is not enabled for this project yet.');
  };

  const handleExport = async () => {
    if (!onExportData || isExporting) {
      toast.info('Data export is not available right now.');
      return;
    }

    setIsExporting(true);
    try {
      await onExportData();
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = async () => {
    if (!onClearCache || isClearingCache) {
      toast.info('Cache clearing is not available right now.');
      return;
    }

    setIsClearingCache(true);
    try {
      await onClearCache();
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear cache');
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!onDeleteAccount || isDeleting) {
      toast.info('Account deletion is not available right now.');
      return;
    }

    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteAccount = async () => {
    if (!onDeleteAccount || isDeleting) return;

    setIsDeleteConfirmOpen(false);

    setIsDeleting(true);
    try {
      await onDeleteAccount();
      onClose();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-[#f7f9fc] rounded-2xl shadow-2xl border border-[#dde3eb] w-full max-w-4xl max-h-[85vh] overflow-hidden flex"
        >
          <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-display font-bold text-[#0a1628]">Settings</h2>
              <p className="text-xs text-slate-500 mt-1 font-body">Manage your preferences</p>
            </div>

            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeSection === section.id
                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-sky-700'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#dde3eb]">
              <h3 className="text-lg font-display font-bold text-[#0a1628]">
                {sections.find((section) => section.id === activeSection)?.label}
              </h3>
              <button onClick={handleCancel} className="p-2 hover:bg-[#edf1f7] rounded-xl transition-colors">
                <X size={20} className="text-[#5a6578]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <ProfilePictureUploader
                    uid={accountData.uid}
                    photoURL={accountData.photo}
                    displayName={accountData.name}
                    onUploaded={(photoURL) => setAccountData((prev) => ({ ...prev, photo: photoURL }))}
                  />

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Full Name</label>
                    <Input
                      type="text"
                      value={accountData.name || ''}
                      onChange={(event) => setAccountData((prev) => ({ ...prev, name: event.target.value }))}
                      className="max-w-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Email Address</label>
                    <Input
                      type="email"
                      value={accountData.email || ''}
                      onChange={(event) => setAccountData((prev) => ({ ...prev, email: event.target.value }))}
                      className="max-w-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Phone Number</label>
                    <Input
                      type="tel"
                      value={accountData.phone || ''}
                      onChange={(event) => setAccountData((prev) => ({ ...prev, phone: event.target.value }))}
                      className="max-w-md"
                    />
                  </div>

                  {accountData.role === 'student' && (
                    <>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Learner's Reference Number (LRN)</label>
                        <Input
                          type="text"
                          value={accountData.lrn || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, lrn: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Grade Level</label>
                        <Input
                          type="text"
                          value={accountData.grade || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, grade: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Section</label>
                        <Input
                          type="text"
                          value={accountData.section || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, section: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">School</label>
                        <Input
                          type="text"
                          value={accountData.school || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, school: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                    </>
                  )}

                  {accountData.role === 'teacher' && (
                    <>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Department</label>
                        <Input
                          type="text"
                          value={accountData.department || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, department: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Subject</label>
                        <Input
                          type="text"
                          value={accountData.subject || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, subject: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Years of Experience</label>
                        <Input
                          type="text"
                          value={accountData.yearsOfExperience || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, yearsOfExperience: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Qualification</label>
                        <Input
                          type="text"
                          value={accountData.qualification || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, qualification: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                    </>
                  )}

                  {accountData.role === 'admin' && (
                    <>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Position</label>
                        <Input
                          type="text"
                          value={accountData.position || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, position: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Department</label>
                        <Input
                          type="text"
                          value={accountData.department || ''}
                          onChange={(event) => setAccountData((prev) => ({ ...prev, department: event.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Role</label>
                    <Input type="text" value={accountData.role || ''} className="max-w-md bg-slate-100" disabled />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Change Password</label>
                    <Button variant="outline" className="rounded-xl" onClick={handleUpdatePasswordClick}>
                      <Lock size={16} className="mr-2" />
                      Update Password
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-[#dde3eb]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#0a1628] font-body">Two-Factor Authentication</h4>
                        <p className="text-xs text-slate-500 mt-1">Add an extra layer of security</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={handleEnable2FA}>
                        Enable
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Email Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={localSettings.notifications.emailNotifications}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, emailNotifications: value },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Push Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Get notified on your device</p>
                    </div>
                    <Switch
                      checked={localSettings.notifications.pushNotifications}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, pushNotifications: value },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Sound Effects</h4>
                      <p className="text-xs text-slate-500 mt-1">Play sounds for notifications</p>
                    </div>
                    <Switch
                      checked={localSettings.notifications.soundEnabled}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, soundEnabled: value },
                        }))
                      }
                    />
                  </div>

                  <div className="pt-4">
                    <h4 className="text-sm font-bold text-[#0a1628] mb-3 font-body">Notification Types</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'quizReminders', label: 'Quiz Reminders' },
                        { key: 'newContent', label: 'New Content' },
                        { key: 'achievements', label: 'Achievements' },
                        { key: 'streakAlerts', label: 'Streak Alerts' },
                        { key: 'weeklySummary', label: 'Weekly Summary' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={localSettings.notifications.notificationTypes[item.key as keyof UserSettings['notifications']['notificationTypes']]}
                            onChange={(event) =>
                              updateSettings((prev) => ({
                                ...prev,
                                notifications: {
                                  ...prev.notifications,
                                  notificationTypes: {
                                    ...prev.notifications.notificationTypes,
                                    [item.key]: event.target.checked,
                                  },
                                },
                              }))
                            }
                            className="w-4 h-4 rounded border-[#dde3eb] text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-sm text-[#0a1628] font-body">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#dde3eb]">
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">
                      <Clock size={16} className="inline mr-2" />
                      Quiet Hours
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="time"
                        value={localSettings.notifications.quietHours.start}
                        onChange={(event) =>
                          updateSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              quietHours: { ...prev.notifications.quietHours, start: event.target.value },
                            },
                          }))
                        }
                        className="w-32"
                      />
                      <span className="text-[#5a6578]">to</span>
                      <Input
                        type="time"
                        value={localSettings.notifications.quietHours.end}
                        onChange={(event) =>
                          updateSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              quietHours: { ...prev.notifications.quietHours, end: event.target.value },
                            },
                          }))
                        }
                        className="w-32"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">No notifications during this time</p>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Dark Mode</h4>
                      <p className="text-xs text-slate-500 mt-1">Smart invert colors like extension dark mode</p>
                    </div>
                    <Switch
                      checked={localSettings.appearance.darkMode}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, darkMode: value },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-3 block font-body uppercase tracking-wider text-xs">Font Size</label>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">Small</span>
                      <input
                        type="range"
                        min="12"
                        max="20"
                        value={localSettings.appearance.fontSize}
                        onChange={(event) =>
                          updateSettings((prev) => ({
                            ...prev,
                            appearance: { ...prev.appearance, fontSize: Number(event.target.value) },
                          }))
                        }
                        className="flex-1"
                      />
                      <span className="text-xs text-slate-500">Large</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Compact View</h4>
                      <p className="text-xs text-slate-500 mt-1">Show more content on screen</p>
                    </div>
                    <Switch
                      checked={localSettings.appearance.compactView}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, compactView: value },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Reduce Animations</h4>
                      <p className="text-xs text-slate-500 mt-1">Minimize motion effects</p>
                    </div>
                    <Switch
                      checked={localSettings.appearance.reduceAnimations}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, reduceAnimations: value },
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Profile Visibility</h4>
                      <p className="text-xs text-slate-500 mt-1">Who can see your profile</p>
                    </div>
                    <select
                      value={localSettings.privacy.profileVisibility}
                      onChange={(event) =>
                        updateSettings((prev) => ({
                          ...prev,
                          privacy: { ...prev.privacy, profileVisibility: event.target.value as ProfileVisibility },
                        }))
                      }
                      className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm bg-white text-[#0a1628]"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="students_and_staff">Students and Staff</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Show Activity Status</h4>
                      <p className="text-xs text-slate-500 mt-1">Let others see when you're online</p>
                    </div>
                    <Switch
                      checked={localSettings.privacy.showActivityStatus}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          privacy: { ...prev.privacy, showActivityStatus: value },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Data Sharing</h4>
                      <p className="text-xs text-slate-500 mt-1">Share anonymous usage data</p>
                    </div>
                    <Switch
                      checked={localSettings.privacy.dataSharing}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          privacy: { ...prev.privacy, dataSharing: value },
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {activeSection === 'learning' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Daily XP Goal</label>
                    <Input
                      type="number"
                      value={localSettings.learning.dailyXpGoal}
                      onChange={(event) =>
                        updateSettings((prev) => ({
                          ...prev,
                          learning: { ...prev.learning, dailyXpGoal: Number(event.target.value || 0) },
                        }))
                      }
                      className="max-w-xs"
                    />
                    <p className="text-xs text-slate-500 mt-2">Set your daily learning target</p>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Preferred Study Time</label>
                    <select
                      value={localSettings.learning.preferredStudyTime}
                      onChange={(event) =>
                        updateSettings((prev) => ({
                          ...prev,
                          learning: { ...prev.learning, preferredStudyTime: event.target.value as StudyTimePreference },
                        }))
                      }
                      className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm w-full max-w-xs bg-white text-[#0a1628]"
                    >
                      <option value="morning">Morning (6AM - 12PM)</option>
                      <option value="afternoon">Afternoon (12PM - 6PM)</option>
                      <option value="evening">Evening (6PM - 12AM)</option>
                      <option value="night">Night (12AM - 6AM)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Auto-play Next Lesson</h4>
                      <p className="text-xs text-slate-500 mt-1">Automatically start the next lesson</p>
                    </div>
                    <Switch
                      checked={localSettings.learning.autoPlayLessons}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          learning: { ...prev.learning, autoPlayLessons: value },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Show Hints During Quizzes</h4>
                      <p className="text-xs text-slate-500 mt-1">Display helpful hints for questions</p>
                    </div>
                    <Switch
                      checked={localSettings.learning.showHints}
                      onCheckedChange={(value) =>
                        updateSettings((prev) => ({
                          ...prev,
                          learning: { ...prev.learning, showHints: value },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Quiz Difficulty Preference</label>
                    <select
                      value={localSettings.learning.quizDifficultyPreference}
                      onChange={(event) =>
                        updateSettings((prev) => ({
                          ...prev,
                          learning: {
                            ...prev.learning,
                            quizDifficultyPreference: event.target.value as QuizDifficultyPreference,
                          },
                        }))
                      }
                      className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm w-full max-w-xs bg-white text-[#0a1628]"
                    >
                      <option value="adaptive">Adaptive (Recommended)</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-[#dde3eb]">
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">
                      <Smartphone size={16} className="inline mr-2" />
                      Study Reminders
                    </label>
                    <Input
                      type="time"
                      value={localSettings.learning.studyReminderTime}
                      onChange={(event) =>
                        updateSettings((prev) => ({
                          ...prev,
                          learning: { ...prev.learning, studyReminderTime: event.target.value },
                        }))
                      }
                      className="w-32"
                    />
                    <p className="text-xs text-slate-500 mt-2">Daily reminder to study</p>
                  </div>
                </div>
              )}

              {activeSection === 'data' && (
                <div className="space-y-6">
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                    <h4 className="text-sm font-bold text-sky-900 mb-1 font-body">Download Your Data</h4>
                    <p className="text-xs text-sky-700 mb-3">Export all your learning data and progress</p>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExport} disabled={isExporting}>
                      <Download size={16} className="mr-2" />
                      {isExporting ? 'Exporting...' : 'Request Data Export'}
                    </Button>
                  </div>

                  <div className="p-4 bg-white border border-[#dde3eb] rounded-xl">
                    <h4 className="text-sm font-bold text-[#0a1628] mb-1 font-body">Clear Cache</h4>
                    <p className="text-xs text-[#5a6578] mb-3">Free up space by clearing cached data</p>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={handleClearCache} disabled={isClearingCache}>
                      {isClearingCache ? 'Clearing...' : 'Clear Cache'}
                    </Button>
                  </div>

                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                    <h4 className="text-sm font-bold text-rose-900 mb-1">Reset Progress</h4>
                    <p className="text-xs text-rose-700 mb-3">
                      {(accountData.role || 'student') === 'student' && 'Reset quizzes, diagnostic state, XP, and learning progress for retesting.'}
                      {accountData.role === 'teacher' && 'Reset imported records, managed classrooms, and teacher-generated quiz artifacts for retesting.'}
                      {accountData.role === 'admin' && 'Reset admin testing artifacts like personal audit/content update records for QA loops.'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-rose-700 border-rose-300"
                      disabled={!onResetData || isResetting}
                      onClick={handleResetData}
                    >
                      {isResetting ? 'Resetting...' : 'Reset Testing Data'}
                    </Button>
                  </div>

                  {accountData.role === 'admin' ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <h4 className="text-sm font-bold text-red-900 mb-1">Delete Account</h4>
                      <p className="text-xs text-red-700 mb-3">Permanently delete your account and all data</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-red-700 border-red-300"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                      >
                        <Trash2 size={16} className="mr-2" />
                        {isDeleting ? 'Deleting...' : 'Delete Account'}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <h4 className="text-sm font-bold text-emerald-900 mb-1 font-body">Protected Account Controls</h4>
                      <p className="text-xs text-emerald-700">Account deletion is restricted to administrator accounts.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#dde3eb] bg-[#edf1f7] flex items-center justify-between">
              <p className="text-xs text-slate-500 font-body">MathPulse AI v2.1.0</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} className="rounded-lg border-[#dde3eb]" disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveChanges} className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {isPasswordModalOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (isUpdatingPassword) return;
            setIsPasswordModalOpen(false);
            setNewPassword('');
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-[#dde3eb] bg-[#f7f9fc] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#dde3eb] px-6 py-4">
              <h4 className="text-lg font-display font-bold text-[#0a1628]">Update Password</h4>
              <button
                onClick={() => {
                  if (isUpdatingPassword) return;
                  setIsPasswordModalOpen(false);
                  setNewPassword('');
                }}
                className="p-2 rounded-xl hover:bg-[#edf1f7] transition-colors"
                aria-label="Close password update dialog"
              >
                <X size={18} className="text-[#5a6578]" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[#5a6578]">Enter a new password with at least 8 characters.</p>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSubmitPasswordUpdate();
                  }
                }}
                disabled={isUpdatingPassword}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (isUpdatingPassword) return;
                    setIsPasswordModalOpen(false);
                    setNewPassword('');
                  }}
                  disabled={isUpdatingPassword}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPasswordUpdate}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => {
          if (isResetting) return;
          setIsResetConfirmOpen(false);
        }}
        onConfirm={handleConfirmResetData}
        title="Reset Testing Data?"
        message={`Reset ${(accountData.role || 'student')} testing data? This action is for QA/demo use and cannot be undone.`}
        confirmText={isResetting ? 'Resetting...' : 'Reset Data'}
        cancelText="Cancel"
        type="warning"
        icon="warning"
        zIndexClass="z-[130]"
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          if (isDeleting) return;
          setIsDeleteConfirmOpen(false);
        }}
        onConfirm={handleConfirmDeleteAccount}
        title="Delete Account?"
        message="Delete account permanently? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete Account'}
        cancelText="Cancel"
        type="danger"
        icon="delete"
        zIndexClass="z-[130]"
      />
      </>
    </AnimatePresence>
  );
};

export default SettingsModal;
