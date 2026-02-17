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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                        ? 'text-blue-600 bg-blue-50/50' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                    )}
                    <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
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
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">General Settings</h3>
                    <p className="text-sm text-slate-500">Basic system configuration</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Site Name</label>
                    <Input defaultValue="MathPulse AI" className="bg-white" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Site Description</label>
                    <textarea 
                      className="w-full min-h-[80px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 resize-none"
                      defaultValue="AI-Powered Mathematics Learning Platform"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Default Language</label>
                    <div className="relative">
                      <select className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                      <Globe size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Save size={16} />
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab !== 'General' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{activeTab} Settings</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
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
