import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Palette,
  Bell,
  Lock,
  Database,
  Moon,
  Sun,
  Laptop,
  Download,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import ConfirmModal from '../ConfirmModal';
import { changePasswordWithReauth } from '../../services/settingsService';
import type { UserSettings } from '../../types/models';

export interface TeacherSettingsPageProps {
  settingsData?: UserSettings;
  onSaveSettings: (settings: Partial<UserSettings>) => Promise<void>;
  onApplySettingsPreview?: (settings: UserSettings) => void;
  onExportData?: () => Promise<void>;
  onClearCache?: () => Promise<void>;
  onBack?: () => void;
  previousTabName?: string;
  onNavigateToProfile?: () => void;
}

export type TeacherSettingsTab = 'appearance' | 'notifications' | 'security' | 'data';

export const TeacherSettingsPage: React.FC<TeacherSettingsPageProps> = ({
  settingsData,
  onSaveSettings,
  onApplySettingsPreview,
  onExportData,
  onClearCache,
  onBack,
  previousTabName = 'Dashboard',
  onNavigateToProfile,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherSettingsTab>('appearance');
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  // Local settings state
  const [darkMode, setDarkMode] = useState<boolean>(
    settingsData?.appearance?.darkMode ?? false
  );
  const [compactView, setCompactView] = useState<boolean>(
    settingsData?.appearance?.compactView ?? false
  );
  const [reduceAnimations, setReduceAnimations] = useState<boolean>(
    settingsData?.appearance?.reduceAnimations ?? false
  );
  const [emailAlerts, setEmailAlerts] = useState<boolean>(
    settingsData?.notifications?.emailNotifications ?? true
  );
  const [atRiskAlerts, setAtRiskAlerts] = useState(true);
  const [quizAlerts, setQuizAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Password update states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (settingsData?.appearance?.darkMode !== undefined) {
      setDarkMode(settingsData.appearance.darkMode);
    }
    if (settingsData?.appearance?.compactView !== undefined) {
      setCompactView(settingsData.appearance.compactView);
    }
    if (settingsData?.appearance?.reduceAnimations !== undefined) {
      setReduceAnimations(settingsData.appearance.reduceAnimations);
    }
    if (settingsData?.notifications?.emailNotifications !== undefined) {
      setEmailAlerts(settingsData.notifications.emailNotifications);
    }
  }, [settingsData]);

  const handleDarkModeChange = (isDark: boolean) => {
    setDarkMode(isDark);
    setIsDirty(true);
    if (onApplySettingsPreview && settingsData) {
      onApplySettingsPreview({
        ...settingsData,
        appearance: {
          ...settingsData.appearance,
          darkMode: isDark,
        },
      });
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        appearance: {
          darkMode,
          fontSize: settingsData?.appearance?.fontSize ?? 16,
          compactView,
          reduceAnimations,
        },
        notifications: {
          emailNotifications: emailAlerts,
          pushNotifications: settingsData?.notifications?.pushNotifications ?? true,
          soundEnabled: settingsData?.notifications?.soundEnabled ?? true,
          notificationTypes: {
            quizReminders: quizAlerts,
            newContent: settingsData?.notifications?.notificationTypes?.newContent ?? true,
            achievements: atRiskAlerts,
            streakAlerts: settingsData?.notifications?.notificationTypes?.streakAlerts ?? true,
            weeklySummary: weeklyDigest,
          },
          quietHours: settingsData?.notifications?.quietHours ?? {
            start: '22:00',
            end: '07:00',
          },
        },
      });
      setIsDirty(false);
      toast.success('Teacher settings saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please enter your current and new password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePasswordWithReauth(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password update failed';
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabs = [
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Lock },
    { id: 'data' as const, label: 'Data & Records', icon: Database },
  ];

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 lg:space-y-6 min-h-[calc(100vh-80px)]">
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
            className="group inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            title={`Return to ${previousTabName}`}
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1 text-violet-600 dark:text-violet-400" />
            <span>
              Back to <span className="font-extrabold text-violet-600 dark:text-violet-400">{previousTabName}</span>
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Faculty</span>
            <span>/</span>
            <span className="text-violet-600 dark:text-violet-400 font-bold">Settings</span>
          </div>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        {/* Left Column: Settings Navigation Sidebar */}
        <div className="w-full lg:w-[260px] xl:w-[280px] shrink-0 space-y-2">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2 shadow-xs space-y-1">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setActiveTab(tabItem.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tabItem.id
                    ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/80 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <tabItem.icon size={16} />
                <span>{tabItem.label}</span>
              </button>
            ))}
          </div>

          {onNavigateToProfile && (
            <Button
              type="button"
              variant="outline"
              onClick={onNavigateToProfile}
              className="w-full min-h-[44px] text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/80 rounded-2xl justify-between"
            >
              <span className="flex items-center gap-2">
                <User size={15} />
                View Faculty Profile
              </span>
              <span>→</span>
            </Button>
          )}
        </div>

        {/* Right Column: Settings Content Panels */}
        <div className="flex-1 w-full space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
            {/* Tab 1: Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                    Display & Appearance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Customize your classroom workspace theme, card density, and motion effects.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Light Mode Card */}
                  <button
                    type="button"
                    onClick={() => handleDarkModeChange(false)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      !darkMode
                        ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30 ring-2 ring-violet-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                      <Sun size={18} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Light Theme</span>
                      {!darkMode && <CheckCircle2 size={16} className="text-violet-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Clear daytime contrast for bright staff rooms
                    </p>
                  </button>

                  {/* Dark Mode Card */}
                  <button
                    type="button"
                    onClick={() => handleDarkModeChange(true)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      darkMode
                        ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30 ring-2 ring-violet-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                      <Moon size={18} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Dark Theme</span>
                      {darkMode && <CheckCircle2 size={16} className="text-violet-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Calm palette for evening lesson grading
                    </p>
                  </button>

                  {/* System Default Preview */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-left opacity-80">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-3">
                      <Laptop size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">System Sync</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Automatic OS preference tracking
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Compact Class Density
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Display more student rows and analytics cards on high-resolution screens.
                      </p>
                    </div>
                    <Switch
                      checked={compactView}
                      onCheckedChange={(checked) => {
                        setCompactView(checked);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Reduce Dynamic Animations
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Minimize page transitions and animated chart renders for smoother low-spec browsing.
                      </p>
                    </div>
                    <Switch
                      checked={reduceAnimations}
                      onCheckedChange={(checked) => {
                        setReduceAnimations(checked);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                    Class Alerts & Notifications
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure notifications for student struggle thresholds, quiz submissions, and class digests.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Email Notifications
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Receive important pedagogical alerts directly in your faculty inbox.
                      </p>
                    </div>
                    <Switch
                      checked={emailAlerts}
                      onCheckedChange={(checked) => {
                        setEmailAlerts(checked);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        At-Risk Student Alerts
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Instant notification when a student falls below competency benchmarks or misses milestones.
                      </p>
                    </div>
                    <Switch
                      checked={atRiskAlerts}
                      onCheckedChange={(checked) => {
                        setAtRiskAlerts(checked);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Quiz & Assessment Submissions
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Notify when an entire section completes a practice center quiz or practice set.
                      </p>
                    </div>
                    <Switch
                      checked={quizAlerts}
                      onCheckedChange={(checked) => {
                        setQuizAlerts(checked);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Weekly Class Summary
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Receive a comprehensive Monday morning digest with attendance, mastery, and intervention progress.
                      </p>
                    </div>
                    <Switch
                      checked={weeklyDigest}
                      onCheckedChange={(checked) => {
                        setWeeklyDigest(checked);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Security */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                    Password & Account Security
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Maintain secure access to student records and grading metrics.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Current Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10 h-10 text-xs rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      New Password
                    </label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !newPassword}
                    className="min-h-[44px] w-full text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-xs transition-all active:scale-95"
                  >
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </form>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3">
                    <Shield size={18} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Session Security & FERPA/DepEd Compliance
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Classroom records and student identification numbers are encrypted under role-based access control. Password changes invalidate stale browser tokens.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Data & Records */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                    Data Records & Storage
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Download faculty records backup or clear local client cache.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Download size={16} className="text-violet-600" />
                        Export Class Records Snapshot
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Download a structured JSON backup of your current profile, class sections, and preferences.
                      </p>
                    </div>
                    {onExportData && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onExportData}
                        className="min-h-[44px] text-xs font-bold rounded-xl border-slate-200 hover:bg-violet-50 text-violet-600 shrink-0"
                      >
                        Export JSON
                      </Button>
                    )}
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                        <Trash2 size={16} className="text-rose-600" />
                        Clear Browser Cache
                      </h4>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1">
                        Purge cached student roster indices, lesson drafts, and offline analytics. Will reload the workspace.
                      </p>
                    </div>
                    {onClearCache && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClearCache}
                        className="min-h-[44px] text-xs font-bold rounded-xl border-rose-200 text-rose-600 hover:bg-rose-100/50 shrink-0"
                      >
                        Clear Cache
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Save Bar */}
          {activeTab !== 'security' && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2">
                {isDirty ? (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    You have unsaved changes
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">
                    All settings up to date
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isDirty && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (settingsData?.appearance?.darkMode !== undefined) {
                        setDarkMode(settingsData.appearance.darkMode);
                      }
                      setIsDirty(false);
                    }}
                    disabled={isSaving}
                    className="min-h-[40px] text-xs font-bold rounded-xl"
                  >
                    <RotateCcw size={14} className="mr-1.5" />
                    Discard
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={!isDirty || isSaving}
                  className={`min-h-[40px] px-5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                    isDirty
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25 active:scale-95'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Save size={14} className="mr-1.5" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={() => {
          setIsDiscardConfirmOpen(false);
          setIsDirty(false);
          if (onBack) onBack();
        }}
        title="Discard Unsaved Settings?"
        message="You have unsaved configuration changes. Discarding will revert preferences back to their previously saved values."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        type="warning"
      />
    </div>
  );
};

export default TeacherSettingsPage;
