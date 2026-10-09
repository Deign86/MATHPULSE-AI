import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { db } from '../../lib/firebase';
import ConfirmModal from '../ConfirmModal';
import { GuideReplayCard } from '../onboarding/GuideReplayCard';
import { changePasswordWithReauth } from '../../services/settingsService';
import { getAuditLogs } from '../../services/adminService';
import { downloadAuditLogCsv } from '../../utils/auditLogCsv';
import type { UserSettings } from '../../types/models';

export interface AdminSettingsPageProps {
  settingsData?: UserSettings;
  onSaveSettings: (settings: Partial<UserSettings>) => Promise<void>;
  onApplySettingsPreview?: (settings: UserSettings) => void;
  onExportData?: () => Promise<void>;
  onClearCache?: () => Promise<void>;
  onBack?: () => void;
  previousTabName?: string;
  onNavigateToProfile?: () => void;
  /** Starts the full admin guide, or one page's guide when given that page's tab. */
  onReplayTour?: (pageTab?: string) => void;
  tourPages?: readonly { tab: string; label: string }[];
}

export type AdminSettingsTab = 'appearance' | 'notifications' | 'security' | 'data';

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({
  settingsData,
  onSaveSettings,
  onApplySettingsPreview,
  onClearCache,
  onBack,
  previousTabName = 'Overview',
  onNavigateToProfile,
  onReplayTour,
  tourPages = [],
}) => {
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>('appearance');
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(true);
  const [hasLoadedMaintenanceMode, setHasLoadedMaintenanceMode] = useState(false);
  const [isMaintenanceSaving, setIsMaintenanceSaving] = useState(false);

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
  const [atRiskAlerts, setAtRiskAlerts] = useState<boolean>(
    settingsData?.notifications?.notificationTypes?.achievements ?? true
  );
  const [securityAlerts, setSecurityAlerts] = useState<boolean>(
    settingsData?.notifications?.notificationTypes?.newContent ?? true
  );
  const [dailyDigest, setDailyDigest] = useState<boolean>(
    settingsData?.notifications?.notificationTypes?.weeklySummary ?? true
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const savedSettingsRef = useRef<UserSettings | undefined>(settingsData);
  const previewedSettingsRef = useRef<UserSettings | undefined>(undefined);

  // Password update states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  // Password fields are not part of isDirty; replay navigates away and would discard them.
  const hasUnsavedEdits = isDirty || Boolean(currentPassword || newPassword || confirmPassword);

  const syncFromSettings = useCallback((saved: UserSettings) => {
    setDarkMode(saved.appearance?.darkMode ?? false);
    setCompactView(saved.appearance?.compactView ?? false);
    setReduceAnimations(saved.appearance?.reduceAnimations ?? false);
    setEmailAlerts(saved.notifications?.emailNotifications ?? true);
    setAtRiskAlerts(saved.notifications?.notificationTypes?.achievements ?? true);
    setSecurityAlerts(saved.notifications?.notificationTypes?.newContent ?? true);
    setDailyDigest(saved.notifications?.notificationTypes?.weeklySummary ?? true);
  }, []);

  // Sync settings loaded or saved by the app; skip echoes of our own theme preview
  useEffect(() => {
    if (settingsData && settingsData !== previewedSettingsRef.current) {
      savedSettingsRef.current = settingsData;
      syncFromSettings(settingsData);
    }
  }, [settingsData, syncFromSettings]);

  useEffect(() => {
    let isCurrent = true;

    const loadMaintenanceMode = async () => {
      try {
        const maintenanceSnapshot = await getDoc(doc(db, 'settings', 'general'));
        if (isCurrent) {
          setMaintenanceMode(maintenanceSnapshot.data()?.maintenanceMode === true);
          setHasLoadedMaintenanceMode(true);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load maintenance mode';
        toast.error(message);
      } finally {
        if (isCurrent) {
          setIsMaintenanceLoading(false);
        }
      }
    };

    void loadMaintenanceMode();
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleMaintenanceModeChange = async (enabled: boolean) => {
    const previousValue = maintenanceMode;
    setMaintenanceMode(enabled);
    setIsMaintenanceSaving(true);

    try {
      await setDoc(doc(db, 'settings', 'general'), { maintenanceMode: enabled }, { merge: true });
      toast.success(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      setMaintenanceMode(previousValue);
      const message = error instanceof Error ? error.message : 'Failed to update maintenance mode';
      toast.error(message);
    } finally {
      setIsMaintenanceSaving(false);
    }
  };

  const handleDarkModeChange = (isDark: boolean) => {
    setDarkMode(isDark);
    setIsDirty(true);
    if (onApplySettingsPreview && settingsData) {
      const previewed = {
        ...settingsData,
        appearance: {
          ...settingsData.appearance,
          darkMode: isDark,
        },
      };
      previewedSettingsRef.current = previewed;
      onApplySettingsPreview(previewed);
    }
  };

  const discardChanges = () => {
    const saved = savedSettingsRef.current;
    if (saved) {
      syncFromSettings(saved);
      onApplySettingsPreview?.(saved);
    }
    setIsDirty(false);
  };

  const handleExportAuditTrail = async () => {
    setIsExportingAudit(true);
    try {
      const entries = await getAuditLogs();
      downloadAuditLogCsv(entries, entries.length);
      toast.success('Audit log exported successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export audit log';
      toast.error(message);
    } finally {
      setIsExportingAudit(false);
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
            quizReminders: settingsData?.notifications?.notificationTypes?.quizReminders ?? true,
            newContent: securityAlerts,
            achievements: atRiskAlerts,
            streakAlerts: settingsData?.notifications?.notificationTypes?.streakAlerts ?? true,
            weeklySummary: dailyDigest,
          },
          quietHours: settingsData?.notifications?.quietHours ?? {
            start: '22:00',
            end: '07:00',
          },
        },
      });
      setIsDirty(false);
      toast.success('System settings saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    { id: 'data' as const, label: 'Data & Governance', icon: Database },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-6 animate-in fade-in duration-300">
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
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Settings</span>
          </div>
        </div>
      )}

      {onReplayTour && (
        <GuideReplayCard audience="Admin" pages={tourPages} onReplay={onReplayTour} hasUnsavedEdits={hasUnsavedEdits} busy={isSaving || isChangingPassword || isMaintenanceSaving} />
      )}

      {/* Main Settings Grid */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        {/* Left Column: Settings Navigation Sidebar (Sticky on mobile & desktop) */}
        <div data-tour="admin-settings-sections" className="w-full lg:w-[260px] xl:w-[280px] shrink-0 space-y-2 lg:sticky lg:top-4 z-20">
          <div data-tour-sticky="" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-1.5 sm:p-2 shadow-xs flex lg:flex-col gap-1 overflow-x-auto no-scrollbar sticky top-0 short:static lg:static z-20">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setActiveTab(tabItem.id)}
                className={`lg:w-full flex items-center gap-2.5 sm:gap-3 px-3.5 py-2 sm:py-2.5 min-h-[40px] sm:min-h-[44px] rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 lg:shrink ${
                  activeTab === tabItem.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <tabItem.icon size={16} className="shrink-0" />
                <span>{tabItem.label}</span>
              </button>
            ))}
          </div>

          {onNavigateToProfile && (
            <Button
              type="button"
              variant="outline"
              onClick={onNavigateToProfile}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer hidden lg:flex"
            >
              Go to Admin Profile
            </Button>
          )}
        </div>

        {/* Right Column: Settings Content */}
        <div className="flex-1 w-full min-w-0">
          <div data-tour="admin-settings-panel" className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md p-5 sm:p-7 lg:p-8 overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-600 pointer-events-none" />

            {/* Header: Tab Title + Save Actions */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure preferences, notification policies, and system governance.
                </p>
              </div>

              {isDirty && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      discardChanges();
                      toast.info('Settings changes discarded');
                    }}
                    className="h-10 px-3 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Discard</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="h-10 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Tab 1: Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Interface Theme
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { isDark: false, label: 'Light Mode', icon: Sun },
                      { isDark: true, label: 'Dark Mode', icon: Moon },
                    ].map((themeOption) => (
                      <button
                        key={themeOption.label}
                        type="button"
                        onClick={() => handleDarkModeChange(themeOption.isDark)}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[90px] transition-all cursor-pointer ${
                          darkMode === themeOption.isDark
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <themeOption.icon
                            size={18}
                            className={darkMode === themeOption.isDark ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                          />
                          {darkMode === themeOption.isDark && (
                            <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {themeOption.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Display Preferences
                  </h4>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Compact Table & Card View</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Display more information density on larger displays</p>
                    </div>
                    <Switch
                      checked={compactView}
                      onCheckedChange={(checked) => {
                        setCompactView(checked);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Reduce Motion & Animations</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Minimize decorative transitions for performance</p>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Administrative Email Notifications
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Receive critical administrative updates and system incident notifications
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

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Academic Support Alerts
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Alert when active sections show students dropping below 75% curriculum mastery
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

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Security & Ingestion Telemetry Alerts
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Notify immediately upon PDF RAG parsing errors or unauthorized access attempts
                    </p>
                  </div>
                  <Switch
                    checked={securityAlerts}
                    onCheckedChange={(checked) => {
                      setSecurityAlerts(checked);
                      setIsDirty(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Daily Curriculum Digest
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Summary of faculty actions, quizzes taken, and AI practice session counts
                    </p>
                  </div>
                  <Switch
                    checked={dailyDigest}
                    onCheckedChange={(checked) => {
                      setDailyDigest(checked);
                      setIsDirty(true);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Security */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Change Password
                  </h4>
                  <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-md">
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
                          className="h-10 text-xs rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
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
                        placeholder="Re-enter new password"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="h-10 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all cursor-pointer mt-2"
                    >
                      {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                    </Button>
                  </form>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Security Credentials & Sessions
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-emerald-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Firebase Authentication Token Valid
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Protected
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Data Governance */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    System Maintenance
                  </h4>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Maintenance Mode
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Temporarily restrict platform access to administrators while maintenance is underway.
                      </p>
                    </div>
                    <Switch
                      checked={maintenanceMode}
                      disabled={isMaintenanceLoading || !hasLoadedMaintenanceMode || isMaintenanceSaving}
                      onCheckedChange={handleMaintenanceModeChange}
                      aria-label="Toggle maintenance mode"
                    />
                  </div>
                  {isMaintenanceLoading && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Loading maintenance settings...</p>
                  )}
                  {!isMaintenanceLoading && !hasLoadedMaintenanceMode && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">
                      Maintenance settings could not be loaded; refresh to try again.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Export System Audit Trail
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Download complete administrative actions, user creations, and curriculum logs
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isExportingAudit}
                    onClick={handleExportAuditTrail}
                    className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>{isExportingAudit ? 'Exporting...' : 'Export CSV'}</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Purge Local Browser Cache
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Clears local temporary session cache without affecting stored database records
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClearCache}
                    className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Clear Cache</span>
                  </Button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    MathPulse AI Platform Environment
                  </p>
                  <p>Deployment: Progressive Web Application (PWA) • Node 22 Cloud Functions</p>
                  <p>RAG Knowledge Base: BAAI/bge-small-en-v1.5 Embeddings • DeepSeek Reasoner</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={() => {
          discardChanges();
          setIsDiscardConfirmOpen(false);
          if (onBack) onBack();
        }}
        title="Discard Settings Changes?"
        message="You have unsaved changes to your preferences. Leaving now will discard these edits."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        type="warning"
      />
    </div>
  );
};

export default AdminSettingsPage;
