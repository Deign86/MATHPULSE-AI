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
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'teacher':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
                
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-white mb-1">Profile Settings</h2>
                    <p className="text-blue-100 text-sm font-medium">Manage your account information</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group">
                    <img
                      src={editedData.photo}
                      alt={editedData.name}
                      className="w-32 h-32 rounded-2xl object-cover shadow-lg border-4 border-white ring-4 ring-blue-100"
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
                    <h3 className="text-xl font-bold text-slate-900">{editedData.name}</h3>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold border-2 ${getRoleBadgeColor(editedData.role)}`}>
                      {editedData.role.charAt(0).toUpperCase() + editedData.role.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                      Basic Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Full Name</label>
                        <div className="relative">
                          <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            value={editedData.name}
                            onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Email Address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="email"
                            value={editedData.email}
                            onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Phone Number</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            value={editedData.phone}
                            onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                            disabled={!isEditing}
                            className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">
                          {editedData.role === 'student' ? 'School' : editedData.role === 'teacher' ? 'Department' : 'Office Location'}
                        </label>
                        <div className="relative">
                          <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                            className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student-Specific Fields */}
                  {editedData.role === 'student' && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-teal-600 rounded-full"></div>
                        Academic Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Student ID</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.studentId || ''}
                              onChange={(e) => setEditedData({ ...editedData, studentId: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Grade Level</label>
                          <div className="relative">
                            <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.grade || ''}
                              onChange={(e) => setEditedData({ ...editedData, grade: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Major/Focus</label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.major || ''}
                              onChange={(e) => setEditedData({ ...editedData, major: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">GPA</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.gpa || ''}
                              onChange={(e) => setEditedData({ ...editedData, gpa: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-2">Enrollment Date</label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              type="date"
                              value={editedData.enrollmentDate || ''}
                              onChange={(e) => setEditedData({ ...editedData, enrollmentDate: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Teacher-Specific Fields */}
                  {editedData.role === 'teacher' && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                        Teaching Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Teacher ID</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.teacherId || ''}
                              onChange={(e) => setEditedData({ ...editedData, teacherId: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Subject/Specialization</label>
                          <div className="relative">
                            <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.subject || ''}
                              onChange={(e) => setEditedData({ ...editedData, subject: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Years of Experience</label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.yearsOfExperience || ''}
                              onChange={(e) => setEditedData({ ...editedData, yearsOfExperience: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Qualification</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.qualification || ''}
                              onChange={(e) => setEditedData({ ...editedData, qualification: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin-Specific Fields */}
                  {editedData.role === 'admin' && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-purple-600 rounded-full"></div>
                        Administrative Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Admin ID</label>
                          <div className="relative">
                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.adminId || ''}
                              onChange={(e) => setEditedData({ ...editedData, adminId: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Position/Title</label>
                          <div className="relative">
                            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.position || ''}
                              onChange={(e) => setEditedData({ ...editedData, position: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-2">Access Level/Permissions</label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={editedData.permissions || ''}
                              onChange={(e) => setEditedData({ ...editedData, permissions: e.target.value })}
                              disabled={!isEditing}
                              className="pl-10 bg-slate-50 border-slate-200 rounded-xl disabled:opacity-100 disabled:cursor-default"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-slate-200 p-6 bg-slate-50">
                <div className="flex gap-3 justify-end">
                  {!isEditing ? (
                    <>
                      <Button
                        onClick={onClose}
                        variant="outline"
                        className="px-6 py-2 rounded-xl border-slate-300 hover:bg-slate-100"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold"
                      >
                        Edit Profile
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="px-6 py-2 rounded-xl border-slate-300 hover:bg-slate-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold flex items-center gap-2"
                      >
                        <Save size={18} />
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
