import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  FileText,
  Gamepad2,
  Loader2,
  Save,
  Settings,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { ModelConfigPanel } from './admin/ModelConfigPanel';
import { useAuth } from '../contexts/AuthContext';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Firestore path constants
// ─────────────────────────────────────────────────────────────────────────────
const SETTINGS_BASE = 'settings';
const GENERAL_DOC = 'general';
const NOTIFICATIONS_DOC = 'notifications';
const GAMIFICATION_DOC = 'gamification';
const CONTENT_DOC = 'content';

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions for each settings section
// ─────────────────────────────────────────────────────────────────────────────
export interface GeneralSettings {
  platformName: string;
  institutionName: string;
  logoUrl: string;
  maintenanceMode: boolean;
}

export interface NotificationSettings {
  emailAlertsOnRegistration: boolean;
  alertOnQuizCompletionThreshold: boolean;
  quizCompletionThresholdPercent: number;
  announcementBannerEnabled: boolean;
  announcementBannerMessage: string;
}

export interface GamificationSettings {
  xpPerCorrectAnswer: number;
  xpPerQuizCompletion: number;
  streakBonusMultiplier: number;
  leaderboardVisibility: boolean;
}

export interface ContentSettings {
  defaultQuizTimeLimitMinutes: number;
  maxQuestionsPerQuiz: number;
  allowStudentRetries: boolean;
  difficultyAutoAdjustment: boolean;
}

// Default values
const defaultGeneral: GeneralSettings = {
  platformName: 'MathPulse AI',
  institutionName: '',
  logoUrl: '',
  maintenanceMode: false,
};

const defaultNotifications: NotificationSettings = {
  emailAlertsOnRegistration: false,
  alertOnQuizCompletionThreshold: false,
  quizCompletionThresholdPercent: 80,
  announcementBannerEnabled: false,
  announcementBannerMessage: '',
};

const defaultGamification: GamificationSettings = {
  xpPerCorrectAnswer: 10,
  xpPerQuizCompletion: 50,
  streakBonusMultiplier: 1.0,
  leaderboardVisibility: true,
};

const defaultContent: ContentSettings = {
  defaultQuizTimeLimitMinutes: 30,
  maxQuestionsPerQuiz: 20,
  allowStudentRetries: true,
  difficultyAutoAdjustment: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Firestore helpers
// ─────────────────────────────────────────────────────────────────────────────
async function loadSection<T>(docName: string, defaults: T): Promise<T> {
  try {
    const ref = doc(db, SETTINGS_BASE, docName);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { ...defaults, ...(snap.data() as Partial<T>) } as T;
    }
    return defaults;
  } catch (err) {
    console.error(`[settings] Failed to load ${docName}:`, err);
    return defaults;
  }
}

async function saveSection(
  docName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
): Promise<void> {
  await setDoc(
    doc(db, SETTINGS_BASE, docName),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu items
// ─────────────────────────────────────────────────────────────────────────────
const menuItems = [
  { id: 'General', label: 'General', icon: Settings },
  { id: 'Notifications', label: 'Notifications', icon: Bell },
  { id: 'Gamification', label: 'Gamification', icon: Gamepad2 },
  { id: 'Content', label: 'Content', icon: FileText },
  { id: 'Model Config', label: 'Model Configuration', icon: Zap },
];

// ─────────────────────────────────────────────────────────────────────────────
// AdminSettings component
// ─────────────────────────────────────────────────────────────────────────────
interface AdminSettingsProps {
  onDirtyChange?: (dirty: boolean) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ onDirtyChange: _onDirtyChange }) => {
  const { userProfile } = useAuth();

  // ── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('General');

  // ── Section states ────────────────────────────────────────────────────────
  const [general, setGeneral] = useState<GeneralSettings>(defaultGeneral);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [gamification, setGamification] = useState<GamificationSettings>(defaultGamification);
  const [content, setContent] = useState<ContentSettings>(defaultContent);

  // ── Loading / saving state per section ────────────────────────────────────
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingGamification, setLoadingGamification] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingGamification, setSavingGamification] = useState(false);
  const [savingContent, setSavingContent] = useState(false);

  // ── Load all sections on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.uid) return;

    setLoadingGeneral(true);
    setLoadingNotifications(true);
    setLoadingGamification(true);
    setLoadingContent(true);

    Promise.all([
      loadSection(GENERAL_DOC, defaultGeneral),
      loadSection(NOTIFICATIONS_DOC, defaultNotifications),
      loadSection(GAMIFICATION_DOC, defaultGamification),
      loadSection(CONTENT_DOC, defaultContent),
    ])
      .then(([g, n, gm, c]) => {
        setGeneral(g);
        setNotifications(n);
        setGamification(gm);
        setContent(c);
      })
      .catch((err) => {
        console.error('[AdminSettings] Failed to load settings:', err);
        toast.error('Failed to load admin settings');
      })
      .finally(() => {
        setLoadingGeneral(false);
        setLoadingNotifications(false);
        setLoadingGamification(false);
        setLoadingContent(false);
      });
  }, [userProfile?.uid]);

  // ── Per-section save handlers ─────────────────────────────────────────────
  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      await saveSection(GENERAL_DOC, general);
      toast.success('General settings saved');
    } catch (err) {
      console.error('[AdminSettings] Failed to save general:', err);
      toast.error('Failed to save general settings');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      await saveSection(NOTIFICATIONS_DOC, notifications);
      toast.success('Notification settings saved');
    } catch (err) {
      console.error('[AdminSettings] Failed to save notifications:', err);
      toast.error('Failed to save notification settings');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSaveGamification = async () => {
    setSavingGamification(true);
    try {
      await saveSection(GAMIFICATION_DOC, gamification);
      toast.success('Gamification settings saved');
    } catch (err) {
      console.error('[AdminSettings] Failed to save gamification:', err);
      toast.error('Failed to save gamification settings');
    } finally {
      setSavingGamification(false);
    }
  };

  const handleSaveContent = async () => {
    setSavingContent(true);
    try {
      await saveSection(CONTENT_DOC, content);
      toast.success('Content settings saved');
    } catch (err) {
      console.error('[AdminSettings] Failed to save content:', err);
      toast.error('Failed to save content settings');
    } finally {
      setSavingContent(false);
    }
  };

  const isLoading =
    loadingGeneral ||
    loadingNotifications ||
    loadingGamification ||
    loadingContent;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pt-6 xl:pt-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Sidebar nav */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-[#dde3eb] overflow-hidden">
            <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-col py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all relative ${
                      isActive
                        ? 'text-sky-600 bg-sky-50/50'
                        : 'text-[#5a6578] hover:bg-[#edf1f7] hover:text-[#0a1628]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-600 rounded-r-full" />
                    )}
                    <Icon
                      size={18}
                      className={isActive ? 'text-sky-600' : 'text-slate-500'}
                    />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content panel */}
        <div className="md:col-span-9">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl shadow-sm border border-[#dde3eb] p-6">
              {isLoading ? (
                <p className="text-sm text-[#5a6578]">Loading settings...</p>
              ) : (
                <>
                  {/* ── General ─────────────────────────────────────────── */}
                  {activeTab === 'General' && (
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">
                          Platform Name
                        </label>
                        <Input
                          value={general.platformName}
                          onChange={(e) =>
                            setGeneral((prev) => ({
                              ...prev,
                              platformName: e.target.value,
                            }))
                          }
                          className="bg-white max-w-md"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">
                          School / Institution Name
                        </label>
                        <Input
                          value={general.institutionName}
                          onChange={(e) =>
                            setGeneral((prev) => ({
                              ...prev,
                              institutionName: e.target.value,
                            }))
                          }
                          placeholder="Enter institution name"
                          className="bg-white max-w-md"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">
                          Logo URL
                        </label>
                        <Input
                          value={general.logoUrl}
                          onChange={(e) =>
                            setGeneral((prev) => ({
                              ...prev,
                              logoUrl: e.target.value,
                            }))
                          }
                          placeholder="https://example.com/logo.png"
                          className="bg-white max-w-md"
                        />
                      </div>

                      <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg text-red-600 shadow-sm border border-red-100">
                            <Settings size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-red-900">
                              Maintenance Mode
                            </h4>
                            <p className="text-xs text-red-700 mt-0.5">
                              Temporarily disable access for non-admins
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={general.maintenanceMode}
                          onCheckedChange={(checked) =>
                            setGeneral((prev) => ({
                              ...prev,
                              maintenanceMode: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>

                      <div className="pt-4 border-t border-[#dde3eb] flex justify-end">
                        <Button
                          className={`bg-sky-600 hover:bg-sky-700 text-white gap-2 ${
                            savingGeneral ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                          onClick={handleSaveGeneral}
                          disabled={savingGeneral}
                        >
                          {savingGeneral && <Loader2 size={16} className="animate-spin" />}
                          {savingGeneral ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Notifications ───────────────────────────────────── */}
                  {activeTab === 'Notifications' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">
                            Email Alerts on New User Registrations
                          </h4>
                          <p className="text-xs text-slate-500">
                            Send email notification when a new user signs up
                          </p>
                        </div>
                        <Switch
                          checked={notifications.emailAlertsOnRegistration}
                          onCheckedChange={(checked) =>
                            setNotifications((prev) => ({
                              ...prev,
                              emailAlertsOnRegistration: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">
                            Alert on Quiz Completion Threshold
                          </h4>
                          <p className="text-xs text-slate-500">
                            Notify when a student's quiz score crosses a threshold
                          </p>
                        </div>
                        <Switch
                          checked={notifications.alertOnQuizCompletionThreshold}
                          onCheckedChange={(checked) =>
                            setNotifications((prev) => ({
                              ...prev,
                              alertOnQuizCompletionThreshold: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>

                      {notifications.alertOnQuizCompletionThreshold && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-[#0a1628]">
                            Threshold Percentage (%)
                          </label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={notifications.quizCompletionThresholdPercent}
                            onChange={(e) =>
                              setNotifications((prev) => ({
                                ...prev,
                                quizCompletionThresholdPercent: Number(
                                  e.target.value || 0,
                                ),
                              }))
                            }
                            className="max-w-xs bg-white"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">
                            Announcement Banner
                          </h4>
                          <p className="text-xs text-slate-500">
                            Show a platform-wide banner message
                          </p>
                        </div>
                        <Switch
                          checked={notifications.announcementBannerEnabled}
                          onCheckedChange={(checked) =>
                            setNotifications((prev) => ({
                              ...prev,
                              announcementBannerEnabled: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>

                      {notifications.announcementBannerEnabled && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-[#0a1628]">
                            Banner Message
                          </label>
                          <Input
                            value={notifications.announcementBannerMessage}
                            onChange={(e) =>
                              setNotifications((prev) => ({
                                ...prev,
                                announcementBannerMessage: e.target.value,
                              }))
                            }
                            placeholder="Enter banner message text"
                            className="bg-white"
                          />
                        </div>
                      )}

                      <div className="pt-4 border-t border-[#dde3eb] flex justify-end">
                        <Button
                          className={`bg-sky-600 hover:bg-sky-700 text-white gap-2 ${
                            savingNotifications ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                          onClick={handleSaveNotifications}
                          disabled={savingNotifications}
                        >
                          {savingNotifications && (
                            <Loader2 size={16} className="animate-spin" />
                          )}
                          {savingNotifications ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Gamification ────────────────────────────────────── */}
                  {activeTab === 'Gamification' && (
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">
                          XP Earned per Correct Answer
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={gamification.xpPerCorrectAnswer}
                          onChange={(e) =>
                            setGamification((prev) => ({
                              ...prev,
                              xpPerCorrectAnswer: Number(e.target.value || 0),
                            }))
                          }
                          className="max-w-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">
                          XP Earned per Quiz Completion
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={gamification.xpPerQuizCompletion}
                          onChange={(e) =>
                            setGamification((prev) => ({
                              ...prev,
                              xpPerQuizCompletion: Number(e.target.value || 0),
                            }))
                          }
                          className="max-w-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">
                          Streak Bonus Multiplier
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={gamification.streakBonusMultiplier}
                          onChange={(e) =>
                            setGamification((prev) => ({
                              ...prev,
                              streakBonusMultiplier: Number(e.target.value || 0),
                            }))
                          }
                          className="max-w-xs bg-white"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Applied as a multiplier to streak XP rewards.
                        </p>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">
                            Leaderboard Visibility
                          </h4>
                          <p className="text-xs text-slate-500">
                            Show the leaderboard to students
                          </p>
                        </div>
                        <Switch
                          checked={gamification.leaderboardVisibility}
                          onCheckedChange={(checked) =>
                            setGamification((prev) => ({
                              ...prev,
                              leaderboardVisibility: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>

                      <div className="pt-4 border-t border-[#dde3eb] flex justify-end">
                        <Button
                          className={`bg-sky-600 hover:bg-sky-700 text-white gap-2 ${
                            savingGamification ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                          onClick={handleSaveGamification}
                          disabled={savingGamification}
                        >
                          {savingGamification && (
                            <Loader2 size={16} className="animate-spin" />
                          )}
                          {savingGamification ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Content ─────────────────────────────────────────── */}
                  {activeTab === 'Content' && (
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">
                          Default Quiz Time Limit (minutes)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={content.defaultQuizTimeLimitMinutes}
                          onChange={(e) =>
                            setContent((prev) => ({
                              ...prev,
                              defaultQuizTimeLimitMinutes: Number(e.target.value || 1),
                            }))
                          }
                          className="max-w-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0a1628]">
                          Max Questions Per Quiz
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={content.maxQuestionsPerQuiz}
                          onChange={(e) =>
                            setContent((prev) => ({
                              ...prev,
                              maxQuestionsPerQuiz: Number(e.target.value || 1),
                            }))
                          }
                          className="max-w-xs bg-white"
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">
                            Allow Student Retries
                          </h4>
                          <p className="text-xs text-slate-500">
                            Let students retry quizzes
                          </p>
                        </div>
                        <Switch
                          checked={content.allowStudentRetries}
                          onCheckedChange={(checked) =>
                            setContent((prev) => ({
                              ...prev,
                              allowStudentRetries: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                        <div>
                          <h4 className="text-sm font-bold text-[#0a1628]">
                            Difficulty Auto-Adjustment
                          </h4>
                          <p className="text-xs text-slate-500">
                            Automatically adjust quiz difficulty based on performance
                          </p>
                        </div>
                        <Switch
                          checked={content.difficultyAutoAdjustment}
                          onCheckedChange={(checked) =>
                            setContent((prev) => ({
                              ...prev,
                              difficultyAutoAdjustment: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-[#dde3eb]"
                        />
                      </div>

                      <div className="pt-4 border-t border-[#dde3eb] flex justify-end">
                        <Button
                          className={`bg-sky-600 hover:bg-sky-700 text-white gap-2 ${
                            savingContent ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                          onClick={handleSaveContent}
                          disabled={savingContent}
                        >
                          {savingContent && (
                            <Loader2 size={16} className="animate-spin" />
                          )}
                          {savingContent ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Model Config (read-only) ────────────────────────── */}
                  {activeTab === 'Model Config' && <ModelConfigPanel />}
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
