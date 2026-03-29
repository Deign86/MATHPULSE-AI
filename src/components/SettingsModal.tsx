import React, { useState, useEffect } from 'react';
import { X, User, Bell, Palette, Lock, Globe, Shield, Download, Trash2, Moon, Sun, Volume2, VolumeX, Clock, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';

interface ProfileData {
  name?: string;
  email?: string;
  phone?: string;
  photo?: string;
  avatarLayers?: { top?: string; bottom?: string; shoes?: string; accessory?: string; };
  role?: 'student' | 'teacher' | 'admin';
  lrn?: string;
  grade?: string;
  section?: string;
  school?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData?: ProfileData;
  onSave?: (data: ProfileData) => void | Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, profileData, onSave }) => {
  const [activeSection, setActiveSection] = useState('account');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPlayLessons, setAutoPlayLessons] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [accountData, setAccountData] = useState<ProfileData>({});

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setAccountData({
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
    });
  }, [isOpen, profileData]);

  const handleSaveChanges = async () => {
    if (onSave && activeSection === 'account') {
      await onSave(accountData);
      return;
    }
    onClose();
  };

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'learning', label: 'Learning', icon: Globe },
    { id: 'data', label: 'Data & Storage', icon: Download },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-[#f7f9fc] rounded-2xl shadow-2xl border border-[#dde3eb] w-full max-w-4xl max-h-[85vh] overflow-hidden flex"
        >
          {/* Left Sidebar - Sections */}
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

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#dde3eb]">
              <h3 className="text-lg font-display font-bold text-[#0a1628]">
                {sections.find(s => s.id === activeSection)?.label}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#edf1f7] rounded-xl transition-colors"
              >
                <X size={20} className="text-[#5a6578]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Full Name</label>
                    <Input
                      type="text"
                      value={accountData.name || ''}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, name: e.target.value }))}
                      className="max-w-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Email Address</label>
                    <Input
                      type="email"
                      value={accountData.email || ''}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, email: e.target.value }))}
                      className="max-w-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Phone Number</label>
                    <Input
                      type="tel"
                      value={accountData.phone || ''}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, phone: e.target.value }))}
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
                          onChange={(e) => setAccountData((prev) => ({ ...prev, lrn: e.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Grade Level</label>
                        <Input
                          type="text"
                          value={accountData.grade || ''}
                          onChange={(e) => setAccountData((prev) => ({ ...prev, grade: e.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Section</label>
                        <Input
                          type="text"
                          value={accountData.section || ''}
                          onChange={(e) => setAccountData((prev) => ({ ...prev, section: e.target.value }))}
                          className="max-w-md"
                        />
                      </div>
                    </>
                  )}
                  {accountData.role === 'student' && (
                    <div>
                      <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">School</label>
                      <Input
                        type="text"
                        value={accountData.school || ''}
                        onChange={(e) => setAccountData((prev) => ({ ...prev, school: e.target.value }))}
                        className="max-w-md"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Role</label>
                    <Input type="text" value={accountData.role || ''} className="max-w-md bg-slate-100" disabled />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Change Password</label>
                    <Button variant="outline" className="rounded-xl">
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
                      <Button variant="outline" size="sm" className="rounded-xl">Enable</Button>
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
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Push Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Get notified on your device</p>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Sound Effects</h4>
                      <p className="text-xs text-slate-500 mt-1">Play sounds for notifications</p>
                    </div>
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>

                  <div className="pt-4">
                    <h4 className="text-sm font-bold text-[#0a1628] mb-3 font-body">Notification Types</h4>
                    <div className="space-y-3">
                      {['Quiz Reminders', 'New Content', 'Achievements', 'Streak Alerts', 'Weekly Summary'].map((type) => (
                        <div key={type} className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-[#dde3eb] text-sky-600 focus:ring-sky-500" />
                          <span className="text-sm text-[#0a1628] font-body">{type}</span>
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
                      <Input type="time" defaultValue="22:00" className="w-32" />
                      <span className="text-[#5a6578]">to</span>
                      <Input type="time" defaultValue="08:00" className="w-32" />
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
                      <p className="text-xs text-slate-500 mt-1">Switch to dark theme</p>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-3 block font-body uppercase tracking-wider text-xs">Theme Color</label>
                    <div className="grid grid-cols-5 gap-3">
                      {['sky', 'cyan', 'rose', 'orange', 'emerald'].map((color) => (
                        <button
                          key={color}
                          className={`w-12 h-12 rounded-xl bg-${color}-600 hover:scale-110 transition-transform shadow-md`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-3 block font-body uppercase tracking-wider text-xs">Font Size</label>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">Small</span>
                      <input type="range" min="12" max="18" defaultValue="14" className="flex-1" />
                      <span className="text-xs text-slate-500">Large</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Compact View</h4>
                      <p className="text-xs text-slate-500 mt-1">Show more content on screen</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Reduce Animations</h4>
                      <p className="text-xs text-slate-500 mt-1">Minimize motion effects</p>
                    </div>
                    <Switch />
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
                    <select className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm bg-white text-[#0a1628]">
                      <option>Everyone</option>
                      <option>Students and Staff</option>
                      <option>Private</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Show Activity Status</h4>
                      <p className="text-xs text-slate-500 mt-1">Let others see when you're online</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Data Sharing</h4>
                      <p className="text-xs text-slate-500 mt-1">Share anonymous usage data</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="pt-4 border-t border-[#dde3eb]">
                    <h4 className="text-sm font-bold text-[#0a1628] mb-3 font-body">Legal</h4>
                    <div className="space-y-2">
                      <button className="text-sm text-sky-600 hover:text-sky-700 block font-body">Privacy Policy</button>
                      <button className="text-sm text-sky-600 hover:text-sky-700 block font-body">Terms of Service</button>
                      <button className="text-sm text-sky-600 hover:text-sky-700 block font-body">Cookie Policy</button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'learning' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Daily XP Goal</label>
                    <Input type="number" defaultValue="100" className="max-w-xs" />
                    <p className="text-xs text-slate-500 mt-2">Set your daily learning target</p>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Preferred Study Time</label>
                    <select className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm w-full max-w-xs bg-white text-[#0a1628]">
                      <option>Morning (6AM - 12PM)</option>
                      <option>Afternoon (12PM - 6PM)</option>
                      <option>Evening (6PM - 12AM)</option>
                      <option>Night (12AM - 6AM)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Auto-play Next Lesson</h4>
                      <p className="text-xs text-slate-500 mt-1">Automatically start the next lesson</p>
                    </div>
                    <Switch checked={autoPlayLessons} onCheckedChange={setAutoPlayLessons} />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dde3eb]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] font-body">Show Hints During Quizzes</h4>
                      <p className="text-xs text-slate-500 mt-1">Display helpful hints for questions</p>
                    </div>
                    <Switch checked={showHints} onCheckedChange={setShowHints} />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">Quiz Difficulty Preference</label>
                    <select className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm w-full max-w-xs bg-white text-[#0a1628]">
                      <option>Adaptive (Recommended)</option>
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-[#dde3eb]">
                    <label className="text-sm font-bold text-[#5a6578] mb-2 block font-body uppercase tracking-wider text-xs">
                      <Smartphone size={16} className="inline mr-2" />
                      Study Reminders
                    </label>
                    <Input type="time" defaultValue="18:00" className="w-32" />
                    <p className="text-xs text-slate-500 mt-2">Daily reminder to study</p>
                  </div>
                </div>
              )}

              {activeSection === 'data' && (
                <div className="space-y-6">
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                    <h4 className="text-sm font-bold text-sky-900 mb-1 font-body">Download Your Data</h4>
                    <p className="text-xs text-sky-700 mb-3">Export all your learning data and progress</p>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <Download size={16} className="mr-2" />
                      Request Data Export
                    </Button>
                  </div>

                  <div className="p-4 bg-white border border-[#dde3eb] rounded-xl">
                    <h4 className="text-sm font-bold text-[#0a1628] mb-1 font-body">Clear Cache</h4>
                    <p className="text-xs text-[#5a6578] mb-3">Free up space by clearing cached data</p>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Clear Cache
                    </Button>
                  </div>

                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                    <h4 className="text-sm font-bold text-rose-900 mb-1">Reset Progress</h4>
                    <p className="text-xs text-rose-700 mb-3">Start fresh by resetting all your progress</p>
                    <Button variant="outline" size="sm" className="rounded-xl text-rose-700 border-rose-300">
                      Reset All Progress
                    </Button>
                  </div>

                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h4 className="text-sm font-bold text-red-900 mb-1">Delete Account</h4>
                    <p className="text-xs text-red-700 mb-3">Permanently delete your account and all data</p>
                    <Button variant="outline" size="sm" className="rounded-xl text-red-700 border-red-300">
                      <Trash2 size={16} className="mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#dde3eb] bg-[#edf1f7] flex items-center justify-between">
              <p className="text-xs text-slate-500 font-body">MathPulse AI v2.1.0</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="rounded-lg border-[#dde3eb]">
                  Cancel
                </Button>
                <Button onClick={handleSaveChanges} className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettingsModal;