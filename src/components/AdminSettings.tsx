import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  BookOpen,
  Database,
  Save,
  Server,
  Settings,
  Shield,
  Loader2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_USER_SETTINGS, UserSettings } from '../types/models';
import { getUserSettings, upsertUserSettings } from '../services/settingsService';

const cloneDefaultSettings = (): UserSettings => JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings;

interface AdminSettingsProps {
  onDirtyChange?: (dirty: boolean) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ onDirtyChange }) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('General');
  const [settings, setSettings] = useState<UserSettings>(cloneDefaultSettings());
  const [savedSettings, setSavedSettings] = useState<UserSettings>(cloneDefaultSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedSectionConfirm, setShowUnsavedSectionConfirm] = useState(false);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

  const menuItems = [
    { id: 'General', label: 'General', icon: Settings },
    { id: 'Security', label: 'Security', icon: Shield },
    { id: 'AI Features', label: 'AI Features', icon: Zap },
    { id: 'Academic', label: 'Academic', icon: BookOpen },
    { id: 'Notifications', label: 'Notifications', icon: Bell },
    { id: 'Backup & Data', label: 'Backup & Data', icon: Database },
  ];

  useEffect(() => {
    const load = async () => {
      if (!userProfile?.uid) return;
      setIsLoading(true);
      try {
        const saved = await getUserSettings(userProfile.uid);
        setSettings(saved);
        setSavedSettings(saved);
      } catch (error) {
        console.error('Failed loading admin settings:', error);
        toast.error('Failed to load admin settings');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [userProfile?.uid]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [isDirty]);

  const handleSettingsTabChange = (nextTab: string) => {
    if (nextTab === activeTab) {
      return;
    }

    if (isDirty) {
      setPendingSection(nextTab);
      setShowUnsavedSectionConfirm(true);
      return;
    }

    setActiveTab(nextTab);
  };

  const handleConfirmSectionSwitch = () => {
    // Discard unsaved edits when user confirms section switch.
    setSettings(savedSettings);
    if (pendingSection) {
      setActiveTab(pendingSection);
    }
    setPendingSection(null);
    setShowUnsavedSectionConfirm(false);
  };

  const handleCancelSectionSwitch = () => {
    setPendingSection(null);
    setShowUnsavedSectionConfirm(false);
  };

  const updateAdminPanel = (updates: Partial<UserSettings['adminPanel']>) => {
    setSettings((prev) => ({
      ...prev,
      adminPanel: {
        ...prev.adminPanel,
        ...updates,
      },
    }));
  };

  const handleSave = async () => {
    if (!userProfile?.uid) return;

    setIsSaving(true);
    try {
      const saved = await upsertUserSettings(userProfile.uid, settings);
      setSettings(saved);
      setSavedSettings(saved);
      toast.success('Admin settings updated');
    } catch (error) {
      console.error('Failed saving admin settings:', error);
      toast.error('Failed to save admin settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <div className="md:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-[#dde3eb] overflow-hidden">
            <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-col py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSettingsTabChange(item.id)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all relative ${
                      isActive ? 'text-sky-600 bg-sky-50/50' : 'text-[#5a6578] hover:bg-[#edf1f7] hover:text-[#0a1628]'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-600 rounded-r-full" />}
                    <Icon size={18} className={isActive ? 'text-sky-600' : 'text-slate-500'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="md:col-span-9">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-[#dde3eb] p-6">
              {isLoading ? (
                <p className="text-sm text-[#5a6578]">Loading settings...</p>
              ) : (
                <>
                  {activeTab === 'General' && (
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Site Name</label>
                        <Input
                          value={settings.adminPanel.siteName}
                          onChange={(event) => updateAdminPanel({ siteName: event.target.value })}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Site Description</label>
                        <Textarea
                          className="min-h-[80px] bg-white border-[#dde3eb]"
                          value={settings.adminPanel.siteDescription}
                          onChange={(event) => updateAdminPanel({ siteDescription: event.target.value })}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Default Language</label>
                        <Select
                          value={settings.adminPanel.defaultLanguage}
                          onValueChange={(value) => updateAdminPanel({ defaultLanguage: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="German">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg text-red-600 shadow-sm border border-red-100">
                            <Server size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-red-900">Maintenance Mode</h4>
                            <p className="text-xs text-red-700 mt-0.5">Temporarily disable access for non-admins</p>
                          </div>
                        </div>
                        <Switch
                          checked={settings.adminPanel.maintenanceMode}
                          onCheckedChange={(checked) => updateAdminPanel({ maintenanceMode: checked })}
                          className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Security' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Enforce Strong Passwords</h4>
                          <p className="text-xs text-slate-500">Require stronger passwords for all users</p>
                        </div>
                        <Switch
                          checked={settings.adminPanel.enforceStrongPasswords}
                          onCheckedChange={(checked) => updateAdminPanel({ enforceStrongPasswords: checked })}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Session Timeout (minutes)</label>
                        <Input
                          type="number"
                          value={settings.adminPanel.sessionTimeoutMinutes}
                          onChange={(event) =>
                            updateAdminPanel({ sessionTimeoutMinutes: Number(event.target.value || 0) })
                          }
                          className="max-w-xs"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'AI Features' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">AI Tutor</h4>
                          <p className="text-xs text-slate-500">Enable AI tutoring experience</p>
                        </div>
                        <Switch
                          checked={settings.adminPanel.aiTutorEnabled}
                          onCheckedChange={(checked) => updateAdminPanel({ aiTutorEnabled: checked })}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Auto Recommendations</h4>
                          <p className="text-xs text-slate-500">Enable AI-generated recommendations</p>
                        </div>
                        <Switch
                          checked={settings.adminPanel.aiAutoRecommendations}
                          onCheckedChange={(checked) => updateAdminPanel({ aiAutoRecommendations: checked })}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Risk Alerts</h4>
                          <p className="text-xs text-slate-500">Send proactive risk alerts for at-risk learners</p>
                        </div>
                        <Switch
                          checked={settings.adminPanel.aiRiskAlertsEnabled}
                          onCheckedChange={(checked) => updateAdminPanel({ aiRiskAlertsEnabled: checked })}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Academic' && (
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Grading Scale</label>
                        <Select
                          value={settings.adminPanel.gradingScale}
                          onValueChange={(value) =>
                            updateAdminPanel({ gradingScale: value as 'percentage' | 'gpa' })
                          }
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select grading scale" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="gpa">GPA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Passing Grade</label>
                        <Input
                          type="number"
                          value={settings.adminPanel.passingGrade}
                          onChange={(event) => updateAdminPanel({ passingGrade: Number(event.target.value || 0) })}
                          className="max-w-xs"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Notifications' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Parent Summary Emails</h4>
                          <p className="text-xs text-slate-500">Weekly summaries for guardians</p>
                        </div>
                        <Switch
                          checked={settings.adminPanel.parentSummaryEmails}
                          onCheckedChange={(checked) => updateAdminPanel({ parentSummaryEmails: checked })}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Teacher Digest Emails</h4>
                          <p className="text-xs text-slate-500">Daily teacher performance digest</p>
                        </div>
                        <Switch
                          checked={settings.adminPanel.teacherDigestEmails}
                          onCheckedChange={(checked) => updateAdminPanel({ teacherDigestEmails: checked })}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Weekly Platform Report</h4>
                          <p className="text-xs text-slate-500">System report for administrators</p>
                        </div>
                        <Switch
                          checked={settings.adminPanel.weeklyPlatformReport}
                          onCheckedChange={(checked) => updateAdminPanel({ weeklyPlatformReport: checked })}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Backup & Data' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Automatic Backups</h4>
                          <p className="text-xs text-slate-500">Create scheduled backups of platform data</p>
                        </div>
                        <Switch
                          checked={settings.adminPanel.autoBackupEnabled}
                          onCheckedChange={(checked) => updateAdminPanel({ autoBackupEnabled: checked })}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Backup Frequency</label>
                        <Select
                          value={settings.adminPanel.backupFrequency}
                          onValueChange={(value) =>
                            updateAdminPanel({
                              backupFrequency: value as 'daily' | 'weekly' | 'monthly',
                            })
                          }
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select backup frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-[#dde3eb] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                    {isDirty ? (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        You have unsaved changes.
                      </p>
                    ) : (
                      <p className="text-xs text-[#5a6578]">All changes are saved.</p>
                    )}
                    <Button
                      className={`bg-sky-600 hover:bg-sky-700 text-white gap-2 ${isSaving || !isDirty ? 'opacity-70 cursor-not-allowed' : ''}`}
                      onClick={handleSave}
                      disabled={isSaving || isLoading || !isDirty}
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showUnsavedSectionConfirm}
        onClose={handleCancelSectionSwitch}
        onConfirm={handleConfirmSectionSwitch}
        title="Discard Unsaved Changes?"
        message="You have unsaved settings updates. Switching sections now will discard those edits."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        type="warning"
        icon="warning"
      />
    </motion.div>
  );
};

export default AdminSettings;
