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
  Eye,
  EyeOff,
  Venus,
  Mars,
  HelpCircle,
  Server,
  BookOpen,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import ConfirmModal from './ConfirmModal';
import ProfilePictureUploader from './ProfilePictureUploader';
import { DEFAULT_USER_SETTINGS, ProfileVisibility, QuizDifficultyPreference, StudyTimePreference, UserSettings } from '../types/models';
import { useUserSettings } from '../hooks/useUserSettings';
import {
  changeEmailWithReauth,
  changePasswordWithReauth,
  deleteAccountWithReauth,
} from '../services/settingsService';
import { TeacherPreferences } from '../types/settings';
import { validateProfileDraft } from '../utils/profileValidation';

interface ProfileData {
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
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData?: ProfileData;
  onSave?: (data: ProfileData) => void | Promise<void>;
  settingsData?: UserSettings;
  onSaveSettings?: (settings: Partial<UserSettings>) => Promise<void>;
  onApplySettingsPreview?: (settings: UserSettings) => void;
  onExportData?: () => Promise<void>;
  onClearCache?: () => Promise<void>;
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
  onExportData,
  onClearCache,
  onResetData,
}) => {
  const role = profileData?.role || 'student';
  const { teacherPrefs, adminConfig, saveTeacherPrefs, saveAdminConfig } = useUserSettings();

  const [activeSection, setActiveSection] = useState('account');
  const [accountData, setAccountData] = useState<ProfileData>({});
  const [localSettings, setLocalSettings] = useState<UserSettings>(cloneDefaultSettings());
  const [localTeacherPrefs, setLocalTeacherPrefs] = useState<TeacherPreferences>(teacherPrefs);
  const [localAdminConfig, setLocalAdminConfig] = useState(adminConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Re-auth state
  const [reAuthModalOpen, setReAuthModalOpen] = useState(false);
  const [reAuthPassword, setReAuthPassword] = useState('');
  const [reAuthAction, setReAuthAction] = useState<'password' | 'email' | 'delete' | null>(null);
  const [reAuthProcessing, setReAuthProcessing] = useState(false);
  const [showReAuthPassword, setShowReAuthPassword] = useState(false);

  // Password/email change state
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const hasInitializedForOpenRef = useRef(false);
  const initialSettingsRef = useRef<UserSettings>(cloneDefaultSettings());

  useEffect(() => {
    if (!isOpen) {
      hasInitializedForOpenRef.current = false;
      return;
    }
    if (hasInitializedForOpenRef.current) return;
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
      gender: profileData?.gender,
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
    setLocalTeacherPrefs(teacherPrefs);
    setLocalAdminConfig(adminConfig);
  }, [isOpen, profileData, settingsData, teacherPrefs, adminConfig]);

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
  }, [isOpen, onClose, onApplySettingsPreview]);

  // Role-gated sections
  const sections = useMemo(() => {
    const base = [
      { id: 'account', label: 'Account', icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    ];
    if (role === 'student') {
      base.push({ id: 'learning', label: 'Learning', icon: Globe });
    }
    if (role === 'teacher') {
      base.push({ id: 'teaching', label: 'Teaching', icon: BookOpen });
    }
    if (role === 'admin') {
      base.push({ id: 'system', label: 'System', icon: Server });
    }
    base.push({ id: 'data', label: 'Data & Storage', icon: Download });
    return base;
  }, [role]);

  const updateSettings = (updater: (current: UserSettings) => UserSettings) => {
    setLocalSettings((prev) => updater(prev));
  };

  // ─── Re-auth flow ──────────────────────────────────────────────────────────
  const openReAuth = (action: 'password' | 'email' | 'delete') => {
    setReAuthAction(action);
    setReAuthPassword('');
    setShowReAuthPassword(false);
    if (action === 'password') setNewPassword('');
    if (action === 'email') setNewEmail(accountData.email || '');
    setReAuthModalOpen(true);
  };

  const handleReAuthSubmit = async () => {
    if (!reAuthPassword.trim()) {
      toast.error('Current password is required');
      return;
    }
    setReAuthProcessing(true);
    try {
      if (reAuthAction === 'password') {
        if (newPassword.length < 8) {
          toast.error('New password must be at least 8 characters');
          return;
        }
        await changePasswordWithReauth(reAuthPassword, newPassword);
        toast.success('Password updated');
      } else if (reAuthAction === 'email') {
        if (!newEmail.includes('@')) {
          toast.error('Enter a valid email');
          return;
        }
        await changeEmailWithReauth(reAuthPassword, newEmail);
        setAccountData((prev) => ({ ...prev, email: newEmail }));
        toast.success('Email updated');
      } else if (reAuthAction === 'delete') {
        await deleteAccountWithReauth(reAuthPassword, accountData.uid || '');
        toast.success('Account deleted');
        onClose();
        return;
      }
      setReAuthModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setReAuthProcessing(false);
    }
  };

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSaveChanges = async () => {
    // Validate name + phone before persisting. Reject obvious injection
    // attempts and malformed phone numbers.
    const validationError = validateProfileDraft({
      name: accountData.name,
      phone: accountData.phone,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setIsSaving(true);
    try {
      if (onSave) await onSave(accountData);
      if (onSaveSettings) await onSaveSettings(localSettings);
      if (role === 'teacher') await saveTeacherPrefs(localTeacherPrefs);
      if (role === 'admin') await saveAdminConfig(localAdminConfig);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setReAuthModalOpen(false);
    setIsResetConfirmOpen(false);
    setIsDeleteConfirmOpen(false);
    onApplySettingsPreview?.(initialSettingsRef.current);
    onClose();
  };

  const handleExport = async () => {
    if (!onExportData || isExporting) return;
    setIsExporting(true);
    try { await onExportData(); } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export data');
    } finally { setIsExporting(false); }
  };

  const handleClearCache = async () => {
    if (!onClearCache || isClearingCache) return;
    setIsClearingCache(true);
    try { await onClearCache(); } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear cache');
    } finally { setIsClearingCache(false); }
  };

  const handleConfirmResetData = async () => {
    if (!onResetData || isResetting) return;
    setIsResetConfirmOpen(false);
    setIsResetting(true);
    try {
      await onResetData();
      toast.success('Testing data reset completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset testing data');
    } finally { setIsResetting(false); }
  };

  const handleConfirmDeleteAccount = () => {
    setIsDeleteConfirmOpen(false);
    openReAuth('delete');
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
          {/* Sidebar */}
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

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#dde3eb]">
              <h3 className="text-lg font-display font-bold text-[#0a1628]">
                {sections.find((s) => s.id === activeSection)?.label}
              </h3>
              <button onClick={handleCancel} className="p-2 hover:bg-[#edf1f7] rounded-xl transition-colors">
                <X size={20} className="text-[#5a6578]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* ─── Account Section ─── */}
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
                      onChange={(e) => setAccountData((prev) => ({ ...prev, name: e.target.value }))}
                      maxLength={100}
                      autoComplete="name"
                      className="max-w-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Email Address</label>
                    <div className="flex items-center gap-2 max-w-md">
                      <Input type="email" value={accountData.email || ''} disabled className="flex-1 bg-slate-100" />
                      <Button variant="outline" size="sm" onClick={() => openReAuth('email')}>
                        Change
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Phone Number</label>
                    <Input
                      type="tel"
                      value={accountData.phone || ''}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, phone: e.target.value }))}
                      maxLength={20}
                      inputMode="tel"
                      autoComplete="tel"
                      pattern="^\+?[0-9 ()\-.]{7,20}$"
                      placeholder="+63 912 345 6789"
                      className="max-w-md"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Gender</label>
                    <Select
                      value={accountData.gender || ''}
                      onValueChange={(value) => setAccountData((prev) => ({ ...prev, gender: value as 'male' | 'female' | 'prefer_not_to_say' }))}
                    >
                      <SelectTrigger className="max-w-md bg-white border-[#dde3eb] rounded-lg">
                        <SelectValue placeholder="Select gender (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male"><div className="flex items-center gap-2"><Mars className="size-4 text-blue-500" /><span>Male</span></div></SelectItem>
                        <SelectItem value="female"><div className="flex items-center gap-2"><Venus className="size-4 text-pink-500" /><span>Female</span></div></SelectItem>
                        <SelectItem value="prefer_not_to_say"><div className="flex items-center gap-2"><HelpCircle className="size-4 text-gray-500" /><span>Prefer not to say</span></div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {role === 'student' && (
                    <>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">LRN</label>
                        <Input value={accountData.lrn || ''} onChange={(e) => setAccountData((prev) => ({ ...prev, lrn: e.target.value }))} className="max-w-md" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Grade Level</label>
                        <Input value={accountData.grade || ''} onChange={(e) => setAccountData((prev) => ({ ...prev, grade: e.target.value }))} className="max-w-md" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Section</label>
                        <Input value={accountData.section || ''} onChange={(e) => setAccountData((prev) => ({ ...prev, section: e.target.value }))} className="max-w-md" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">School</label>
                        <Input value={accountData.school || ''} onChange={(e) => setAccountData((prev) => ({ ...prev, school: e.target.value }))} className="max-w-md" />
                      </div>
                    </>
                  )}

                  {role === 'teacher' && (
                    <>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Department</label>
                        <Input value={accountData.department || ''} onChange={(e) => setAccountData((prev) => ({ ...prev, department: e.target.value }))} className="max-w-md" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Subject</label>
                        <Input value={accountData.subject || ''} onChange={(e) => setAccountData((prev) => ({ ...prev, subject: e.target.value }))} className="max-w-md" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Years of Experience</label>
                        <Input value={accountData.yearsOfExperience || ''} onChange={(e) => setAccountData((prev) => ({ ...prev, yearsOfExperience: e.target.value }))} className="max-w-md" />
                      </div>
                    </>
                  )}

                  {role === 'admin' && (
                    <div>
                      <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Position</label>
                      <Input value={accountData.position || ''} onChange={(e) => setAccountData((prev) => ({ ...prev, position: e.target.value }))} className="max-w-md" />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Change Password</label>
                    <Button variant="outline" className="rounded-xl" onClick={() => openReAuth('password')}>
                      <Lock size={16} className="mr-2" />
                      Update Password
                    </Button>
                  </div>
                </div>
              )}


              {/* ─── Notifications Section ─── */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Email Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={localSettings.notifications.emailNotifications}
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, notifications: { ...p.notifications, emailNotifications: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Push Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Get notified on your device</p>
                    </div>
                    <Switch
                      checked={localSettings.notifications.pushNotifications}
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, notifications: { ...p.notifications, pushNotifications: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Sound Effects</h4>
                      <p className="text-xs text-slate-500 mt-1">Play sounds for notifications</p>
                    </div>
                    <Switch
                      checked={localSettings.notifications.soundEnabled}
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, notifications: { ...p.notifications, soundEnabled: v } }))}
                    />
                  </div>

                  {role === 'teacher' && (
                    <>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628] font-body">Student Submissions</h4>
                          <p className="text-xs text-slate-500 mt-1">Notify when students submit work</p>
                        </div>
                        <Switch
                          checked={localTeacherPrefs.notifyOnSubmission}
                          onCheckedChange={(v) => setLocalTeacherPrefs((p) => ({ ...p, notifyOnSubmission: v }))}
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628] font-body">Student Activity Alerts</h4>
                          <p className="text-xs text-slate-500 mt-1">Notify on at-risk student activity</p>
                        </div>
                        <Switch
                          checked={localTeacherPrefs.notifyOnStudentActivity}
                          onCheckedChange={(v) => setLocalTeacherPrefs((p) => ({ ...p, notifyOnStudentActivity: v }))}
                        />
                      </div>
                    </>
                  )}

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
                            onChange={(e) =>
                              updateSettings((p) => ({
                                ...p,
                                notifications: {
                                  ...p.notifications,
                                  notificationTypes: { ...p.notifications.notificationTypes, [item.key]: e.target.checked },
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
                    <h4 className="text-sm font-bold text-[#0a1628] mb-1 font-body">Push Notification Categories</h4>
                    <p className="text-xs text-slate-500 mb-3">Choose which kinds of pushes you want to receive on this device.</p>
                    <div className="flex items-center justify-between py-2 mb-2 border-b border-[#dde3eb]">
                      <div>
                        <h5 className="text-sm font-bold text-[#0a1628] font-body">Enable Push (master)</h5>
                        <p className="text-xs text-slate-500 mt-0.5">Turn off to silence ALL push categories.</p>
                      </div>
                      <Switch
                        checked={localSettings.pushPreferences.pushEnabled}
                        onCheckedChange={(v) => updateSettings((p) => ({ ...p, pushPreferences: { ...p.pushPreferences, pushEnabled: v } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      {[
                        { key: 'achievement', label: '🏆 Achievements unlocked' },
                        { key: 'quiz_battle', label: '⚔️ Quiz battle invites & results' },
                        { key: 'daily_reward', label: '🎁 Daily reward reminders' },
                        { key: 'assignment', label: '📚 New assignments / deadlines' },
                        { key: 'grade_posted', label: '📝 Grades posted' },
                        { key: 'streak_reminder', label: '🔥 Streak reminders' },
                        { key: 'leaderboard', label: '📊 Leaderboard updates' },
                        { key: 'system', label: '🔔 System announcements' },
                      ].map((item) => {
                        const k = item.key as keyof UserSettings['pushPreferences'];
                        return (
                          <label key={item.key} className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-[#0a1628] font-body">{item.label}</span>
                            <Switch
                              checked={Boolean(localSettings.pushPreferences[k])}
                              onCheckedChange={(v) => updateSettings((p) => ({ ...p, pushPreferences: { ...p.pushPreferences, [item.key]: v } }))}
                              disabled={!localSettings.pushPreferences.pushEnabled && k !== 'pushEnabled'}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { httpsCallable } = await import('firebase/functions');
                            const { cloudFunctions } = await import('../lib/firebase');
                            const fn = httpsCallable(cloudFunctions, 'sendTestPush');
                            const result = await fn({});
                            const sent = (result?.data as { sent?: number } | undefined)?.sent ?? 0;
                            if (sent > 0) {
                              toast.success(`Sent test push to ${sent} device(s).`);
                            } else {
                              toast.message('No active devices found. Enable browser notifications first.');
                            }
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Failed to send test push');
                          }
                        }}
                      >
                        <Bell size={14} className="mr-2" />Send test push
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#dde3eb]">
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">
                      <Clock size={16} className="inline mr-2" />Quiet Hours
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="time"
                        value={localSettings.notifications.quietHours.start}
                        onChange={(e) => updateSettings((p) => ({ ...p, notifications: { ...p.notifications, quietHours: { ...p.notifications.quietHours, start: e.target.value } } }))}
                        className="w-32"
                      />
                      <span className="text-[#5a6578]">to</span>
                      <Input
                        type="time"
                        value={localSettings.notifications.quietHours.end}
                        onChange={(e) => updateSettings((p) => ({ ...p, notifications: { ...p.notifications, quietHours: { ...p.notifications.quietHours, end: e.target.value } } }))}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Appearance Section ─── */}
              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Dark Mode</h4>
                      <p className="text-xs text-slate-500 mt-1">Toggle dark theme</p>
                    </div>
                    <Switch
                      checked={localSettings.appearance.darkMode}
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, appearance: { ...p.appearance, darkMode: v } }))}
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
                        onChange={(e) => updateSettings((p) => ({ ...p, appearance: { ...p.appearance, fontSize: Number(e.target.value) } }))}
                        className="flex-1"
                      />
                      <span className="text-xs text-slate-500">Large</span>
                      <span className="text-xs font-mono text-slate-600 w-8">{localSettings.appearance.fontSize}px</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Compact View</h4>
                      <p className="text-xs text-slate-500 mt-1">Show more content on screen</p>
                    </div>
                    <Switch
                      checked={localSettings.appearance.compactView}
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, appearance: { ...p.appearance, compactView: v } }))}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Reduce Animations</h4>
                      <p className="text-xs text-slate-500 mt-1">Minimize motion effects</p>
                    </div>
                    <Switch
                      checked={localSettings.appearance.reduceAnimations}
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, appearance: { ...p.appearance, reduceAnimations: v } }))}
                    />
                  </div>
                </div>
              )}


              {/* ─── Privacy Section ─── */}
              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Profile Visibility</h4>
                      <p className="text-xs text-slate-500 mt-1">Who can see your profile</p>
                    </div>
                    <select
                      value={localSettings.privacy.profileVisibility}
                      onChange={(e) => updateSettings((p) => ({ ...p, privacy: { ...p.privacy, profileVisibility: e.target.value as ProfileVisibility } }))}
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
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, privacy: { ...p.privacy, showActivityStatus: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Data Sharing</h4>
                      <p className="text-xs text-slate-500 mt-1">Share anonymous usage data</p>
                    </div>
                    <Switch
                      checked={localSettings.privacy.dataSharing}
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, privacy: { ...p.privacy, dataSharing: v } }))}
                    />
                  </div>
                </div>
              )}

              {/* ─── Learning Section (Student only) ─── */}
              {activeSection === 'learning' && role === 'student' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Daily XP Goal</label>
                    <Input
                      type="number"
                      value={localSettings.learning.dailyXpGoal}
                      onChange={(e) => updateSettings((p) => ({ ...p, learning: { ...p.learning, dailyXpGoal: Number(e.target.value || 0) } }))}
                      className="max-w-xs"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Preferred Study Time</label>
                    <select
                      value={localSettings.learning.preferredStudyTime}
                      onChange={(e) => updateSettings((p) => ({ ...p, learning: { ...p.learning, preferredStudyTime: e.target.value as StudyTimePreference } }))}
                      className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm w-full max-w-xs bg-white text-[#0a1628]"
                    >
                      <option value="morning">Morning (6AM - 12PM)</option>
                      <option value="afternoon">Afternoon (12PM - 6PM)</option>
                      <option value="evening">Evening (6PM - 12PM)</option>
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
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, learning: { ...p.learning, autoPlayLessons: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Show Hints During Quizzes</h4>
                      <p className="text-xs text-slate-500 mt-1">Display helpful hints for questions</p>
                    </div>
                    <Switch
                      checked={localSettings.learning.showHints}
                      onCheckedChange={(v) => updateSettings((p) => ({ ...p, learning: { ...p.learning, showHints: v } }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Quiz Difficulty Preference</label>
                    <select
                      value={localSettings.learning.quizDifficultyPreference}
                      onChange={(e) => updateSettings((p) => ({ ...p, learning: { ...p.learning, quizDifficultyPreference: e.target.value as QuizDifficultyPreference } }))}
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
                      <Smartphone size={16} className="inline mr-2" />Study Reminders
                    </label>
                    <Input
                      type="time"
                      value={localSettings.learning.studyReminderTime}
                      onChange={(e) => updateSettings((p) => ({ ...p, learning: { ...p.learning, studyReminderTime: e.target.value } }))}
                      className="w-32"
                    />
                  </div>
                </div>
              )}

              {/* ─── Teaching Section (Teacher only) ─── */}
              {activeSection === 'teaching' && role === 'teacher' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-[#0a1628] font-body">Quiz Defaults</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-[#5a6578] block mb-1">Time Limit (min)</label>
                      <Input
                        type="number"
                        value={localTeacherPrefs.quizDefaults.timeLimitMinutes}
                        onChange={(e) => setLocalTeacherPrefs((p) => ({ ...p, quizDefaults: { ...p.quizDefaults, timeLimitMinutes: Number(e.target.value) } }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#5a6578] block mb-1">Passing Score (%)</label>
                      <Input
                        type="number"
                        value={localTeacherPrefs.quizDefaults.passingScore}
                        onChange={(e) => setLocalTeacherPrefs((p) => ({ ...p, quizDefaults: { ...p.quizDefaults, passingScore: Number(e.target.value) } }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#5a6578] block mb-1">Max Attempts</label>
                      <Input
                        type="number"
                        value={localTeacherPrefs.quizDefaults.maxAttempts}
                        onChange={(e) => setLocalTeacherPrefs((p) => ({ ...p, quizDefaults: { ...p.quizDefaults, maxAttempts: Number(e.target.value) } }))}
                      />
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-[#0a1628] font-body pt-4">Class Preferences</h4>
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Auto-Enroll Students</h4>
                      <p className="text-xs text-slate-500 mt-1">Automatically enroll new students</p>
                    </div>
                    <Switch
                      checked={localTeacherPrefs.classPreferences.autoEnroll}
                      onCheckedChange={(v) => setLocalTeacherPrefs((p) => ({ ...p, classPreferences: { ...p.classPreferences, autoEnroll: v } }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#5a6578] block mb-1">Class Visibility</label>
                    <select
                      value={localTeacherPrefs.classPreferences.classVisibility}
                      onChange={(e) => setLocalTeacherPrefs((p) => ({ ...p, classPreferences: { ...p.classPreferences, classVisibility: e.target.value as 'public' | 'private' | 'invite_only' } }))}
                      className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm bg-white text-[#0a1628]"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="invite_only">Invite Only</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Student Analytics Visibility</h4>
                      <p className="text-xs text-slate-500 mt-1">Let students see their leaderboard rank</p>
                    </div>
                    <Switch
                      checked={localTeacherPrefs.studentAnalyticsVisibility}
                      onCheckedChange={(v) => setLocalTeacherPrefs((p) => ({ ...p, studentAnalyticsVisibility: v }))}
                    />
                  </div>
                </div>
              )}

              {/* ─── System Section (Admin only) ─── */}
              {activeSection === 'system' && role === 'admin' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Maintenance Mode</h4>
                      <p className="text-xs text-slate-500 mt-1">Disable platform access for non-admins</p>
                    </div>
                    <Switch
                      checked={localAdminConfig.maintenanceMode}
                      onCheckedChange={(v) => setLocalAdminConfig((p) => ({ ...p, maintenanceMode: v }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#5a6578] block mb-1">Default Grade Level</label>
                      <Input
                        value={localAdminConfig.defaultGradeLevel}
                        onChange={(e) => setLocalAdminConfig((p) => ({ ...p, defaultGradeLevel: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#5a6578] block mb-1">Default Curriculum</label>
                      <Input
                        value={localAdminConfig.defaultCurriculum}
                        onChange={(e) => setLocalAdminConfig((p) => ({ ...p, defaultCurriculum: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#5a6578] block mb-1">Max Class Size</label>
                      <Input
                        type="number"
                        value={localAdminConfig.maxClassSize}
                        onChange={(e) => setLocalAdminConfig((p) => ({ ...p, maxClassSize: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Audit Log Visible</h4>
                      <p className="text-xs text-slate-500 mt-1">Show audit logs in admin dashboard</p>
                    </div>
                    <Switch
                      checked={localAdminConfig.auditLogVisible}
                      onCheckedChange={(v) => setLocalAdminConfig((p) => ({ ...p, auditLogVisible: v }))}
                    />
                  </div>

                  <h4 className="text-sm font-bold text-[#0a1628] font-body pt-4">AI Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#5a6578] block mb-1">Model Name</label>
                      <Input
                        value={localAdminConfig.aiConfig.modelName}
                        onChange={(e) => setLocalAdminConfig((p) => ({ ...p, aiConfig: { ...p.aiConfig, modelName: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#5a6578] block mb-1">Temperature</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={localAdminConfig.aiConfig.temperature}
                        onChange={(e) => setLocalAdminConfig((p) => ({ ...p, aiConfig: { ...p.aiConfig, temperature: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-[#5a6578] block mb-1">API Endpoint</label>
                      <Input
                        value={localAdminConfig.aiConfig.endpoint}
                        onChange={(e) => setLocalAdminConfig((p) => ({ ...p, aiConfig: { ...p.aiConfig, endpoint: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>
              )}


              {/* ─── Data & Storage Section ─── */}
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
                      {role === 'student' && 'Reset quizzes, diagnostic state, XP, and learning progress for retesting.'}
                      {role === 'teacher' && 'Reset imported records, managed classrooms, and teacher-generated quiz artifacts.'}
                      {role === 'admin' && 'Reset admin testing artifacts like personal audit/content update records.'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-rose-700 border-rose-300"
                      disabled={!onResetData || isResetting}
                      onClick={() => setIsResetConfirmOpen(true)}
                    >
                      {isResetting ? 'Resetting...' : 'Reset Testing Data'}
                    </Button>
                  </div>

                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h4 className="text-sm font-bold text-red-900 mb-1">Delete Account</h4>
                    <p className="text-xs text-red-700 mb-3">Permanently delete your account and all data</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-red-700 border-red-300"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 size={16} className="mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
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

      {/* ─── Re-Auth Modal ─── */}
      {reAuthModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { if (!reAuthProcessing) setReAuthModalOpen(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-[#dde3eb] bg-[#f7f9fc] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#dde3eb] px-6 py-4">
              <h4 className="text-lg font-display font-bold text-[#0a1628]">
                {reAuthAction === 'password' && 'Change Password'}
                {reAuthAction === 'email' && 'Change Email'}
                {reAuthAction === 'delete' && 'Delete Account'}
              </h4>
              <button
                onClick={() => { if (!reAuthProcessing) setReAuthModalOpen(false); }}
                className="p-2 rounded-xl hover:bg-[#edf1f7] transition-colors"
                aria-label="Close"
              >
                <X size={18} className="text-[#5a6578]" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[#5a6578]">Enter your current password to continue.</p>
              <div className="relative">
                <Input
                  type={showReAuthPassword ? 'text' : 'password'}
                  value={reAuthPassword}
                  onChange={(e) => setReAuthPassword(e.target.value)}
                  placeholder="Current password"
                  autoFocus
                  className="pr-10"
                  disabled={reAuthProcessing}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleReAuthSubmit(); }}
                />
                <button
                  type="button"
                  onClick={() => setShowReAuthPassword(!showReAuthPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showReAuthPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {reAuthAction === 'password' && (
                <div className="relative">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    disabled={reAuthProcessing}
                  />
                </div>
              )}

              {reAuthAction === 'email' && (
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  disabled={reAuthProcessing}
                />
              )}

              {reAuthAction === 'delete' && (
                <p className="text-sm text-red-600 font-medium">This action is permanent and cannot be undone.</p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReAuthModalOpen(false)} disabled={reAuthProcessing}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleReAuthSubmit()}
                  className={reAuthAction === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}
                  disabled={reAuthProcessing}
                >
                  {reAuthProcessing ? 'Processing...' : reAuthAction === 'delete' ? 'Delete Forever' : 'Confirm'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmResetData}
        title="Reset Testing Data?"
        message={`Reset ${role} testing data? This will clear quizzes, diagnostic assessments, assessment history, XP, and learning progress. This action cannot be undone.`}
        confirmText={isResetting ? 'Resetting...' : 'Reset Data'}
        cancelText="Cancel"
        type="warning"
        icon="warning"
        zIndexClass="z-[130]"
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
        title="Delete Account?"
        message="You will need to re-authenticate to permanently delete your account. This cannot be undone."
        confirmText="Continue"
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
