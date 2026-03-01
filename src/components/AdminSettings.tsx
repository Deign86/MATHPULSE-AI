import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Shield, Zap, BookOpen, Bell, Database, 
  Save, Server, Globe, Type
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('General');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const menuItems = [
    { id: 'General', label: 'General', icon: Settings },
    { id: 'Security', label: 'Security', icon: Shield },
    { id: 'AI Features', label: 'AI Features', icon: Zap },
    { id: 'Academic', label: 'Academic', icon: BookOpen },
    { id: 'Notifications', label: 'Notifications', icon: Bell },
    { id: 'Backup & Data', label: 'Backup & Data', icon: Database },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Section (Hidden if parent handles it, but good to have context if standalone) */}
      {/* In AdminDashboard, the header is dynamic, so we just focus on the content here.
          However, the screenshot shows "Settings" title. AdminDashboard already renders the title "Settings".
          So we skip the main title and go straight to the layout.
      */}

      <div className="grid grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="col-span-12 md:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-[#e8e5de] overflow-hidden">
            <nav className="flex flex-col py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all relative ${
                      isActive 
                        ? 'text-violet-600 bg-violet-50/50' 
                        : 'text-[#6b687a] hover:bg-[#f0eeea] hover:text-[#1a1625]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-600 rounded-r-full" />
                    )}
                    <Icon size={18} className={isActive ? 'text-violet-600' : 'text-[#a8a5b3]'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="col-span-12 md:col-span-9">
          {activeTab === 'General' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* General Settings Card */}
              <div className="bg-white rounded-xl shadow-sm border border-[#e8e5de] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-[#f0eeea] rounded-lg text-[#6b687a]">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1a1625]">General Settings</h3>
                    <p className="text-sm text-[#6b687a]">Basic system configuration</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#1a1625]">Site Name</label>
                    <Input defaultValue="MathPulse AI" className="bg-white" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#1a1625]">Site Description</label>
                    <textarea 
                      className="w-full min-h-[80px] px-3 py-2 rounded-xl border border-[#e8e5de] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-[#a8a5b3] resize-none"
                      defaultValue="AI-Powered Mathematics Learning Platform"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#1a1625]">Default Language</label>
                    <div className="relative">
                      <select className="w-full px-3 py-2 rounded-xl border border-[#e8e5de] bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                      <Globe size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a5b3] pointer-events-none" />
                    </div>
                  </div>

                  {/* Maintenance Mode */}
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
                        checked={maintenanceMode}
                        onChange={() => setMaintenanceMode(!maintenanceMode)}
                      />
                      <div className="w-11 h-6 bg-[#e8e5de] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#e8e5de] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#e8e5de] flex justify-end">
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                    <Save size={16} />
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab !== 'General' && (
            <div className="bg-white rounded-xl shadow-sm border border-[#e8e5de] p-12 text-center">
              <div className="w-16 h-16 bg-[#f0eeea] rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings size={32} className="text-[#a8a5b3]" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1625] mb-2">{activeTab} Settings</h3>
              <p className="text-[#6b687a] max-w-sm mx-auto">
                This section is currently under development. Please check back later for updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminSettings;
