import React, { useState, useEffect } from 'react';
import { X, Camera, Mail, Phone, MapPin, Calendar, BookOpen, Award, Users, Building, Globe, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  photo: string;
  role: 'student' | 'teacher' | 'admin';
  // Student-specific
  studentId?: string;
  grade?: string;
  school?: string;
  enrollmentDate?: string;
  major?: string;
  gpa?: string;
  // Teacher-specific
  teacherId?: string;
  department?: string;
  subject?: string;
  yearsOfExperience?: string;
  qualification?: string;
  // Admin-specific
  adminId?: string;
  position?: string;
  office?: string;
  permissions?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: ProfileData;
  onSave: (data: ProfileData) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profileData, onSave }) => {
  const [editedData, setEditedData] = useState<ProfileData>(profileData);
  const [isEditing, setIsEditing] = useState(false);

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

  const handlePhotoChange = () => {
    // In a real app, this would open a file picker
    const photos = [
      'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop'
    ];
    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
    setEditedData({ ...editedData, photo: randomPhoto });
  };

  const handleSave = () => {
    onSave(editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(profileData);
    setIsEditing(false);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'teacher':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'admin':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#f7f9fc] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-[#dde3eb]">
              {/* Header */}
              <div className="bg-gradient-to-r from-sky-600 to-sky-500 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full -ml-18 -mb-18"></div>
                
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-display font-bold text-white mb-1">Profile Settings</h2>
                    <p className="text-zinc-400 text-sm font-body">Manage your account information</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-zinc-500 hover:text-sky-700 hover:bg-slate-100 p-2 rounded-lg transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 scrollbar-thin scrollbar-thumb-[#d1cec6] scrollbar-track-[#edf1f7]">
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group">
                    <img
                      src={editedData.photo}
                      alt={editedData.name}
                      className="w-28 h-28 rounded-xl object-cover shadow-lg border-2 border-[#dde3eb] ring-4 ring-sky-100"
                    />
                    {isEditing && (
                      <button
                        onClick={handlePhotoChange}
                        className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div className="text-center text-white">
                          <Camera size={32} className="mx-auto mb-1" />
                          <span className="text-xs font-bold">Change Photo</span>
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-lg font-display font-bold text-[#0a1628]">{editedData.name}</h3>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-body font-semibold border ${getRoleBadgeColor(editedData.role)}`}>
                      {editedData.role.charAt(0).toUpperCase() + editedData.role.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h4 className="text-sm font-display font-bold text-[#0a1628] mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-sky-600 rounded-full"></div>
                      Basic Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Full Name</label>
                        <div className="relative">
                          <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input
                            value={editedData.name}
                            onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Email Address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input
                            type="email"
                            value={editedData.email}
                            onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Phone Number</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input
                            value={editedData.phone}
                            onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">
                          {editedData.role === 'student' ? 'School' : editedData.role === 'teacher' ? 'Department' : 'Office Location'}
                        </label>
                        <div className="relative">
                          <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input
                            value={editedData.school || editedData.department || editedData.office || ''}
                            onChange={(e) => {
                              if (editedData.role === 'student') {
                                setEditedData({ ...editedData, school: e.target.value });
                              } else if (editedData.role === 'teacher') {
                                setEditedData({ ...editedData, department: e.target.value });
                              } else {
                                setEditedData({ ...editedData, office: e.target.value });
                              }
                            }}
                            disabled={!isEditing}
                            className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student-Specific Fields */}
                  {editedData.role === 'student' && (
                    <div>
                      <h4 className="text-sm font-bold text-[#0a1628] mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-teal-600 rounded-full"></div>
                        Academic Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#5a6578] mb-2">Student ID</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.studentId || ''}
                              onChange={(e) => setEditedData({ ...editedData, studentId: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-[#edf1f7] border-[#dde3eb] rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Grade Level</label>
                          <div className="relative">
                            <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.grade || ''}
                              onChange={(e) => setEditedData({ ...editedData, grade: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Major/Focus</label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.major || ''}
                              onChange={(e) => setEditedData({ ...editedData, major: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">GPA</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.gpa || ''}
                              onChange={(e) => setEditedData({ ...editedData, gpa: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Enrollment Date</label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              type="date"
                              value={editedData.enrollmentDate || ''}
                              onChange={(e) => setEditedData({ ...editedData, enrollmentDate: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Teacher-Specific Fields */}
                  {editedData.role === 'teacher' && (
                    <div>
                      <h4 className="text-sm font-display font-bold text-[#0a1628] mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                        Teaching Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Teacher ID</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.teacherId || ''}
                              onChange={(e) => setEditedData({ ...editedData, teacherId: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Subject/Specialization</label>
                          <div className="relative">
                            <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.subject || ''}
                              onChange={(e) => setEditedData({ ...editedData, subject: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Years of Experience</label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.yearsOfExperience || ''}
                              onChange={(e) => setEditedData({ ...editedData, yearsOfExperience: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Qualification</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.qualification || ''}
                              onChange={(e) => setEditedData({ ...editedData, qualification: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin-Specific Fields */}
                  {editedData.role === 'admin' && (
                    <div>
                      <h4 className="text-sm font-display font-bold text-[#0a1628] mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-amber-600 rounded-full"></div>
                        Administrative Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Admin ID</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.adminId || ''}
                              onChange={(e) => setEditedData({ ...editedData, adminId: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Position/Title</label>
                          <div className="relative">
                            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.position || ''}
                              onChange={(e) => setEditedData({ ...editedData, position: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-body font-semibold text-[#5a6578] mb-2 uppercase tracking-wider">Access Level/Permissions</label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input
                              value={editedData.permissions || ''}
                              onChange={(e) => setEditedData({ ...editedData, permissions: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-white border-[#dde3eb] rounded-lg font-body text-[#0a1628] focus:border-sky-400 focus:ring-sky-400/20 disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-[#dde3eb] p-5 bg-[#edf1f7]">
                <div className="flex gap-3 justify-end">
                  {!isEditing ? (
                    <>
                      <Button
                        onClick={onClose}
                        variant="outline"
                        className="px-5 py-2 rounded-lg border-[#d1cec6] hover:bg-white font-body font-medium text-[#5a6578]"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-body font-semibold"
                      >
                        Edit Profile
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="px-5 py-2 rounded-lg border-[#d1cec6] hover:bg-white font-body font-medium text-[#5a6578]"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-body font-semibold flex items-center gap-2"
                      >
                        <Save size={16} />
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
