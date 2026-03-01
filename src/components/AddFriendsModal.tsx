import React, { useState } from 'react';
import { X, Search, UserPlus, UserCheck, Users, TrendingUp, User } from 'lucide-react';
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
    { id: '4', name: 'Emma Rodriguez', avatar: '', level: 15, xp: 1890, section: 'Grade 11 - STEM A', isFriend: false },
    { id: '6', name: 'Olivia Brown', avatar: '', level: 13, xp: 1580, section: 'Grade 11 - STEM A', isFriend: false },
    { id: '7', name: 'James Wilson', avatar: '', level: 13, xp: 1520, section: 'Grade 11 - STEM A', isFriend: false },
    { id: '9', name: 'Lucas Martinez', avatar: '', level: 11, xp: 1180, section: 'Grade 11 - STEM A', isFriend: false },
    { id: '10', name: 'Ava Taylor', avatar: '', level: 10, xp: 1050, section: 'Grade 11 - STEM A', isFriend: false },
  ];

  const suggested = [
    { id: '11', name: 'Noah Anderson', avatar: '', level: 14, xp: 1650, section: 'Grade 11 - STEM B', reason: 'Similar progress', isFriend: false },
    { id: '12', name: 'Isabella Garcia', avatar: '', level: 13, xp: 1420, section: 'Grade 11 - STEM B', reason: 'Top performer', isFriend: false },
    { id: '13', name: 'Ethan Moore', avatar: '', level: 12, xp: 1280, section: 'Grade 11 - ABM', reason: 'Active learner', isFriend: false },
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
          className="relative bg-[#f7f9fc] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-[#dde3eb]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-500 p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -mr-18 -mt-18"></div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-display font-bold">Add Friends</h2>
                <p className="text-sky-100 text-sm font-body mt-0.5">Connect with classmates and compete together</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-zinc-500 hover:text-sky-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-white placeholder-zinc-500 text-sm font-body focus:outline-none focus:border-sky-500/40 transition-colors"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#dde3eb] px-5">
            <button
              onClick={() => setActiveTab('classmates')}
              className={`px-4 py-3 font-body font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'classmates'
                  ? 'text-sky-600 border-sky-600'
                  : 'text-[#5a6578] border-transparent hover:text-[#0a1628]'
              }`}
            >
              <Users size={16} className="inline mr-2" />
              My Classmates ({classmates.length})
            </button>
            <button
              onClick={() => setActiveTab('suggested')}
              className={`px-4 py-3 font-body font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'suggested'
                  ? 'text-sky-600 border-sky-600'
                  : 'text-[#5a6578] border-transparent hover:text-[#0a1628]'
              }`}
            >
              <TrendingUp size={16} className="inline mr-2" />
              Suggested ({suggested.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'classmates' ? (
              <div className="space-y-2">
                {filteredClassmates.length > 0 ? (
                  filteredClassmates.map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#dde3eb] hover:border-sky-200/50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-[#edf1f7] rounded-lg flex items-center justify-center flex-shrink-0">
                        {student.avatar || <User size={18} className="text-[#5a6578]" />}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-body font-semibold text-sm text-[#0a1628]">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-body text-[#5a6578]">Level {student.level}</span>
                          <span className="text-xs text-[#d1cec6]">·</span>
                          <span className="text-xs font-body text-[#5a6578]">{student.xp} XP</span>
                        </div>
                      </div>

                      {student.isFriend ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg font-body"
                          disabled
                        >
                          <UserCheck size={14} className="mr-1" />
                          Friends
                        </Button>
                      ) : sentRequests.includes(student.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg font-body"
                          disabled
                        >
                          Requested
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-body font-semibold"
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
                    <Search size={40} className="text-[#d1cec6] mx-auto mb-3" />
                    <p className="text-[#5a6578] font-body">No classmates found</p>
                    <p className="text-sm text-slate-500 font-body mt-1">Try a different search term</p>
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
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#dde3eb] hover:border-sky-200/50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-[#edf1f7] rounded-lg flex items-center justify-center flex-shrink-0">
                        {student.avatar || <User size={18} className="text-[#5a6578]" />}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-body font-semibold text-sm text-[#0a1628]">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-body text-[#5a6578]">{student.section}</span>
                          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-body font-semibold">
                            {student.reason}
                          </span>
                        </div>
                      </div>

                      {sentRequests.includes(student.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg font-body"
                          disabled
                        >
                          Requested
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-body font-semibold"
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
                    <Search size={40} className="text-[#d1cec6] mx-auto mb-3" />
                    <p className="text-[#5a6578] font-body">No suggestions found</p>
                    <p className="text-sm text-slate-500 font-body mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#dde3eb] bg-[#edf1f7]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#5a6578] font-body">
                {sentRequests.length > 0 && `${sentRequests.length} request${sentRequests.length > 1 ? 's' : ''} sent`}
              </p>
              <Button onClick={onClose} className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-body font-semibold">
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