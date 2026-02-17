import React, { useState } from 'react';
import { X, Search, UserPlus, UserCheck, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';

interface AddFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFriendsModal: React.FC<AddFriendsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'classmates' | 'suggested'>('classmates');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const classmates = [
    { id: '4', name: 'Emma Rodriguez', avatar: '👧', level: 15, xp: 1890, section: 'Grade 11 - STEM A', isFriend: false },
    { id: '6', name: 'Olivia Brown', avatar: '👩', level: 13, xp: 1580, section: 'Grade 11 - STEM A', isFriend: false },
    { id: '7', name: 'James Wilson', avatar: '🧑', level: 13, xp: 1520, section: 'Grade 11 - STEM A', isFriend: false },
    { id: '9', name: 'Lucas Martinez', avatar: '👦', level: 11, xp: 1180, section: 'Grade 11 - STEM A', isFriend: false },
    { id: '10', name: 'Ava Taylor', avatar: '👧', level: 10, xp: 1050, section: 'Grade 11 - STEM A', isFriend: false },
  ];

  const suggested = [
    { id: '11', name: 'Noah Anderson', avatar: '🧑', level: 14, xp: 1650, section: 'Grade 11 - STEM B', reason: 'Similar progress', isFriend: false },
    { id: '12', name: 'Isabella Garcia', avatar: '👩', level: 13, xp: 1420, section: 'Grade 11 - STEM B', reason: 'Top performer', isFriend: false },
    { id: '13', name: 'Ethan Moore', avatar: '👨', level: 12, xp: 1280, section: 'Grade 11 - ABM', reason: 'Active learner', isFriend: false },
  ];

  const handleSendRequest = (id: string) => {
    setSentRequests([...sentRequests, id]);
  };

  const filteredClassmates = classmates.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuggested = suggested.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Add Friends</h2>
                <p className="text-cyan-100 text-sm mt-1">Connect with classmates and compete together</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/50"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-6">
            <button
              onClick={() => setActiveTab('classmates')}
              className={`px-4 py-3 font-medium text-sm transition-all border-b-2 ${
                activeTab === 'classmates'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-500 border-transparent'
              }`}
            >
              <Users size={16} className="inline mr-2" />
              My Classmates ({classmates.length})
            </button>
            <button
              onClick={() => setActiveTab('suggested')}
              className={`px-4 py-3 font-medium text-sm transition-all border-b-2 ${
                activeTab === 'suggested'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-500 border-transparent'
              }`}
            >
              <TrendingUp size={16} className="inline mr-2" />
              Suggested ({suggested.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'classmates' ? (
              <div className="space-y-3">
                {filteredClassmates.length > 0 ? (
                  filteredClassmates.map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {student.avatar}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800">{student.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">Level {student.level}</span>
                          <span className="text-xs text-slate-500">{student.xp} XP</span>
                        </div>
                      </div>

                      {student.isFriend ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled
                        >
                          <UserCheck size={14} className="mr-1" />
                          Friends
                        </Button>
                      ) : sentRequests.includes(student.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled
                        >
                          Requested
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleSendRequest(student.id)}
                        >
                          <UserPlus size={14} className="mr-1" />
                          Add
                        </Button>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Search size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No classmates found</p>
                    <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSuggested.length > 0 ? (
                  filteredSuggested.map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {student.avatar}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800">{student.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">{student.section}</span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                            {student.reason}
                          </span>
                        </div>
                      </div>

                      {sentRequests.includes(student.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled
                        >
                          Requested
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => handleSendRequest(student.id)}
                        >
                          <UserPlus size={14} className="mr-1" />
                          Add
                        </Button>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Search size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No suggestions found</p>
                    <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {sentRequests.length > 0 && `${sentRequests.length} request${sentRequests.length > 1 ? 's' : ''} sent`}
              </p>
              <Button onClick={onClose} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                Done
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddFriendsModal;