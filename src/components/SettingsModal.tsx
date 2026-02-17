import React, { useState, useEffect } from 'react';
import { X, User, Bell, Palette, Lock, Globe, Shield, Download, Trash2, Moon, Sun, Volume2, VolumeX, Clock, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData?: any;
  onSave?: (data: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, profileData, onSave }) => {
  const [activeSection, setActiveSection] = useState('account');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPlayLessons, setAutoPlayLessons] = useState(false);
  const [showHints, setShowHints] = useState(true);

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
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex"
        >
          {/* Left Sidebar - Sections */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">Settings</h2>
              <p className="text-xs text-slate-500 mt-1">Manage your preferences</p>
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
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-200'
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
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">
                {sections.find(s => s.id === activeSection)?.label}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Email Address</label>
                    <Input type="email" defaultValue="alex.johnson@student.edu" className="max-w-md" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Phone Number</label>
                    <Input type="tel" defaultValue="+1 (555) 123-4567" className="max-w-md" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Change Password</label>
                    <Button variant="outline" className="rounded-xl">
                      <Lock size={16} className="mr-2" />
                      Update Password
                    </Button>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700">Two-Factor Authentication</h4>
                        <p className="text-xs text-slate-500 mt-1">Add an extra layer of security</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl">Enable</Button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Email Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Receive updates via email</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Push Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Get notified on your device</p>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Sound Effects</h4>
                      <p className="text-xs text-slate-500 mt-1">Play sounds for notifications</p>
                    </div>
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>

                  <div className="pt-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Notification Types</h4>
                    <div className="space-y-3">
                      {['Quiz Reminders', 'New Content', 'Achievements', 'Streak Alerts', 'Weekly Summary'].map((type) => (
                        <div key={type} className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-slate-700">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      <Clock size={16} className="inline mr-2" />
                      Quiet Hours
                    </label>
                    <div className="flex items-center gap-3">
                      <Input type="time" defaultValue="22:00" className="w-32" />
                      <span className="text-slate-500">to</span>
                      <Input type="time" defaultValue="08:00" className="w-32" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">No notifications during this time</p>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Dark Mode</h4>
                      <p className="text-xs text-slate-500 mt-1">Switch to dark theme</p>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Theme Color</label>
                    <div className="grid grid-cols-5 gap-3">
                      {['indigo', 'purple', 'blue', 'teal', 'green'].map((color) => (
                        <button
                          key={color}
                          className={`w-12 h-12 rounded-xl bg-${color}-600 hover:scale-110 transition-transform shadow-md`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Font Size</label>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">Small</span>
                      <input type="range" min="12" max="18" defaultValue="14" className="flex-1" />
                      <span className="text-xs text-slate-500">Large</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Compact View</h4>
                      <p className="text-xs text-slate-500 mt-1">Show more content on screen</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Reduce Animations</h4>
                      <p className="text-xs text-slate-500 mt-1">Minimize motion effects</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Profile Visibility</h4>
                      <p className="text-xs text-slate-500 mt-1">Who can see your profile</p>
                    </div>
                    <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option>Everyone</option>
                      <option>Friends Only</option>
                      <option>Private</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Show Activity Status</h4>
                      <p className="text-xs text-slate-500 mt-1">Let others see when you're online</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Data Sharing</h4>
                      <p className="text-xs text-slate-500 mt-1">Share anonymous usage data</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Legal</h4>
                    <div className="space-y-2">
                      <button className="text-sm text-indigo-600 hover:text-indigo-700 block">Privacy Policy</button>
                      <button className="text-sm text-indigo-600 hover:text-indigo-700 block">Terms of Service</button>
                      <button className="text-sm text-indigo-600 hover:text-indigo-700 block">Cookie Policy</button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'learning' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Daily XP Goal</label>
                    <Input type="number" defaultValue="100" className="max-w-xs" />
                    <p className="text-xs text-slate-500 mt-2">Set your daily learning target</p>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Preferred Study Time</label>
                    <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-full max-w-xs">
                      <option>Morning (6AM - 12PM)</option>
                      <option>Afternoon (12PM - 6PM)</option>
                      <option>Evening (6PM - 12AM)</option>
                      <option>Night (12AM - 6AM)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Auto-play Next Lesson</h4>
                      <p className="text-xs text-slate-500 mt-1">Automatically start the next lesson</p>
                    </div>
                    <Switch checked={autoPlayLessons} onCheckedChange={setAutoPlayLessons} />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Show Hints During Quizzes</h4>
                      <p className="text-xs text-slate-500 mt-1">Display helpful hints for questions</p>
                    </div>
                    <Switch checked={showHints} onCheckedChange={setShowHints} />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Quiz Difficulty Preference</label>
                    <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-full max-w-xs">
                      <option>Adaptive (Recommended)</option>
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
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
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="text-sm font-bold text-blue-900 mb-1">Download Your Data</h4>
                    <p className="text-xs text-blue-700 mb-3">Export all your learning data and progress</p>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <Download size={16} className="mr-2" />
                      Request Data Export
                    </Button>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="text-sm font-bold text-slate-700 mb-1">Clear Cache</h4>
                    <p className="text-xs text-slate-500 mb-3">Free up space by clearing cached data</p>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Clear Cache
                    </Button>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <h4 className="text-sm font-bold text-yellow-900 mb-1">Reset Progress</h4>
                    <p className="text-xs text-yellow-700 mb-3">Start fresh by resetting all your progress</p>
                    <Button variant="outline" size="sm" className="rounded-xl text-yellow-700 border-yellow-300">
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
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-500">MathPulse AI v2.1.0</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={onClose} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
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