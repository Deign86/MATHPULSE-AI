import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, UserPlus, UserCheck, Users, TrendingUp, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { searchUsers, sendFriendRequest } from '../services/friendsService';
import { StudentProfile } from '../types/models';

interface StudentUser {
  uid: string;
  name?: string;
  email?: string;
  photo?: string;
  level?: number;
  totalXP?: number;
  grade?: string;
  isFriend: boolean;
}

interface AddFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFriendsModal: React.FC<AddFriendsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile } = useAuth();
  const studentProfile = userProfile as StudentProfile;
  const friendsList: string[] = studentProfile?.friends || [];

  const [activeTab, setActiveTab] = useState<'all' | 'suggested'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<StudentUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadUsers = useCallback(async (query: string) => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const results = await searchUsers(query, currentUser.uid);
      setUsers(
        results.map(u => ({
          uid: u.uid,
          name: u.name,
          email: u.email,
          photo: u.photo,
          level: u.level,
          totalXP: u.totalXP,
          isFriend: friendsList.includes(u.uid),
        }))
      );
    } catch (err) {
      console.error('Error loading users:', err);
      setErrorMsg('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Load on open and when search changes (debounced)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen, searchQuery, loadUsers]);

  const handleSendRequest = async (toUserId: string) => {
    if (!currentUser) return;
    setSentRequests(prev => new Set([...prev, toUserId]));
    try {
      await sendFriendRequest(currentUser.uid, toUserId);
    } catch (err) {
      // Revert optimistic update on error
      setSentRequests(prev => { const n = new Set(prev); n.delete(toUserId); return n; });
      const msg = err instanceof Error ? err.message : 'Failed to send request';
      setErrorMsg(msg);
    }
  };

  // Suggested: top-XP students not yet friends
  const suggestedUsers = [...users]
    .filter(u => !u.isFriend)
    .sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0))
    .slice(0, 10);

  const displayedUsers = activeTab === 'all' ? users : suggestedUsers;

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
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 font-body font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'all'
                  ? 'text-sky-600 border-sky-600'
                  : 'text-[#5a6578] border-transparent hover:text-[#0a1628]'
              }`}
            >
              <Users size={16} className="inline mr-2" />
              All Students ({users.length})
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
              Top Learners ({suggestedUsers.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {errorMsg && (
              <div className="mb-3 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-body">
                {errorMsg}
              </div>
            )}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={32} className="text-sky-500 animate-spin" />
                <p className="text-sm text-[#5a6578] font-body">Loading students...</p>
              </div>
            ) : displayedUsers.length > 0 ? (
              <div className="space-y-2">
                {displayedUsers.map((student) => (
                  <motion.div
                    key={student.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#dde3eb] hover:border-sky-200/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#edf1f7] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {student.photo
                        ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                        : <User size={18} className="text-[#5a6578]" />
                      }
                    </div>

                    <div className="flex-1">
                      <h4 className="font-body font-semibold text-sm text-[#0a1628]">{student.name || 'Student'}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-body text-[#5a6578]">Level {student.level ?? 1}</span>
                        <span className="text-xs text-[#d1cec6]">·</span>
                        <span className="text-xs font-body text-[#5a6578]">{student.totalXP ?? 0} XP</span>
                        {student.grade && (
                          <>
                            <span className="text-xs text-[#d1cec6]">·</span>
                            <span className="text-xs font-body text-[#5a6578]">{student.grade}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {student.isFriend ? (
                      <Button variant="outline" size="sm" className="rounded-lg font-body" disabled>
                        <UserCheck size={14} className="mr-1" />
                        Friends
                      </Button>
                    ) : sentRequests.has(student.uid) ? (
                      <Button variant="outline" size="sm" className="rounded-lg font-body" disabled>
                        Requested
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-body font-semibold"
                        onClick={() => handleSendRequest(student.uid)}
                      >
                        <UserPlus size={14} className="mr-1" />
                        Add
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Search size={40} className="text-[#d1cec6] mx-auto mb-3" />
                <p className="text-[#5a6578] font-body font-semibold">No students found</p>
                <p className="text-sm text-slate-400 font-body mt-1">
                  {searchQuery ? 'Try a different search term' : 'No other registered students yet'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#dde3eb] bg-[#edf1f7]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#5a6578] font-body">
                {sentRequests.size > 0 && `${sentRequests.size} request${sentRequests.size > 1 ? 's' : ''} sent`}
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