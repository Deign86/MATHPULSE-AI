import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  BookOpen,
  Database,
  Globe,
  Save,
  Server,
  Settings,
  Shield,
  Type,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_USER_SETTINGS, UserSettings } from '../types/models';
import { getUserSettings, upsertUserSettings } from '../services/settingsService';

const cloneDefaultSettings = (): UserSettings => JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings;

const AdminSettings: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('General');
  const [settings, setSettings] = useState<UserSettings>(cloneDefaultSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      } catch (error) {
        console.error('Failed loading admin settings:', error);
        toast.error('Failed to load admin settings');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [userProfile?.uid]);

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
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-[#dde3eb] overflow-hidden">
            <nav className="flex flex-col py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
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

        <div className="col-span-12 md:col-span-9">
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
                        <textarea
                          className="w-full min-h-[80px] px-3 py-2 rounded-xl border border-[#dde3eb] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-500 resize-none"
                          value={settings.adminPanel.siteDescription}
                          onChange={(event) => updateAdminPanel({ siteDescription: event.target.value })}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Default Language</label>
                        <div className="relative">
                          <select
                            value={settings.adminPanel.defaultLanguage}
                            onChange={(event) => updateAdminPanel({ defaultLanguage: event.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-[#dde3eb] bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                          >
                            <option>English</option>
                            <option>Spanish</option>
                            <option>French</option>
                            <option>German</option>
                          </select>
                          <Globe
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                          />
                        </div>
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
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.adminPanel.maintenanceMode}
                            onChange={() => updateAdminPanel({ maintenanceMode: !settings.adminPanel.maintenanceMode })}
                          />
                          <div className="w-11 h-6 bg-[#dde3eb] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#dde3eb] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
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
                        <input
                          type="checkbox"
                          checked={settings.adminPanel.enforceStrongPasswords}
                          onChange={() =>
                            updateAdminPanel({ enforceStrongPasswords: !settings.adminPanel.enforceStrongPasswords })
                          }
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
                        <input
                          type="checkbox"
                          checked={settings.adminPanel.aiTutorEnabled}
                          onChange={() => updateAdminPanel({ aiTutorEnabled: !settings.adminPanel.aiTutorEnabled })}
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Auto Recommendations</h4>
                          <p className="text-xs text-slate-500">Enable AI-generated recommendations</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.adminPanel.aiAutoRecommendations}
                          onChange={() =>
                            updateAdminPanel({ aiAutoRecommendations: !settings.adminPanel.aiAutoRecommendations })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Risk Alerts</h4>
                          <p className="text-xs text-slate-500">Send proactive risk alerts for at-risk learners</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.adminPanel.aiRiskAlertsEnabled}
                          onChange={() =>
                            updateAdminPanel({ aiRiskAlertsEnabled: !settings.adminPanel.aiRiskAlertsEnabled })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Academic' && (
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Grading Scale</label>
                        <div className="relative max-w-xs">
                          <select
                            value={settings.adminPanel.gradingScale}
                            onChange={(event) =>
                              updateAdminPanel({ gradingScale: event.target.value as 'percentage' | 'gpa' })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-[#dde3eb] bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                          >
                            <option value="percentage">Percentage</option>
                            <option value="gpa">GPA</option>
                          </select>
                          <Type size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
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
                        <input
                          type="checkbox"
                          checked={settings.adminPanel.parentSummaryEmails}
                          onChange={() =>
                            updateAdminPanel({ parentSummaryEmails: !settings.adminPanel.parentSummaryEmails })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Teacher Digest Emails</h4>
                          <p className="text-xs text-slate-500">Daily teacher performance digest</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.adminPanel.teacherDigestEmails}
                          onChange={() =>
                            updateAdminPanel({ teacherDigestEmails: !settings.adminPanel.teacherDigestEmails })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">Weekly Platform Report</h4>
                          <p className="text-xs text-slate-500">System report for administrators</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.adminPanel.weeklyPlatformReport}
                          onChange={() =>
                            updateAdminPanel({ weeklyPlatformReport: !settings.adminPanel.weeklyPlatformReport })
                          }
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
                        <input
                          type="checkbox"
                          checked={settings.adminPanel.autoBackupEnabled}
                          onChange={() => updateAdminPanel({ autoBackupEnabled: !settings.adminPanel.autoBackupEnabled })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">Backup Frequency</label>
                        <select
                          value={settings.adminPanel.backupFrequency}
                          onChange={(event) =>
                            updateAdminPanel({
                              backupFrequency: event.target.value as 'daily' | 'weekly' | 'monthly',
                            })
                          }
                          className="w-full max-w-xs px-3 py-2 rounded-xl border border-[#dde3eb] bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-[#dde3eb] flex justify-end">
                    <Button className="bg-sky-600 hover:bg-sky-700 text-white gap-2" onClick={handleSave} disabled={isSaving}>
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminSettings;
