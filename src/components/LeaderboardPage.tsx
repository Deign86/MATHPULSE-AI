import React, { useState, useEffect } from 'react';
import { Trophy, Users, Flame, TrendingUp, TrendingDown, Crown, Medal, UserPlus, Swords, Eye, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import StudentProfileModal from './StudentProfileModal';
import AddFriendsModal from './AddFriendsModal';
import CompareStatsModal from './CompareStatsModal';
import { useAuth } from '../contexts/AuthContext';
import { getLeaderboard } from '../services/gamificationService';
import { StudentProfile } from '../types/models';

interface LeaderboardStudent {
  id: string;
  name: string;
  avatar: string;
  level: number;
  totalXP: number;
  currentStreak: number;
  section: string;
  rank: {
    global: number;
    section: number;
    friends: number;
    change: number;
  };
  stats: {
    quizzesCompleted: number;
    averageScore: number;
    modulesCompleted: number;
    studyHours: number;
  };
  isFriend: boolean;
  isOnline: boolean;
  isYou?: boolean;
}

const LeaderboardPage = () => {
  const { currentUser, userProfile, userRole } = useAuth();
  const studentProfile = userProfile as StudentProfile;
  const [activeView, setActiveView] = useState<'school' | 'section' | 'friends' | 'subject'>('section');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week' | 'today'>('week');
  const [selectedStudent, setSelectedStudent] = useState<LeaderboardStudent | null>(null);
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [showCompare, setShowCompare] = useState<LeaderboardStudent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [mockStudents, setMockStudents] = useState<LeaderboardStudent[]>([]);

  const avatars = ['👩', '👨', '🧑', '👧', '👦', '👩', '🧑', '👧'];

  // Load leaderboard data from Firebase
  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!currentUser) return;
      setLeaderboardLoading(true);
      try {
        const entries = await getLeaderboard(currentUser.uid, false, timeFilter === 'today' ? 'week' : timeFilter, 20);
        const students: LeaderboardStudent[] = entries.map((entry, index) => ({
          id: entry.userId,
          name: entry.name,
          avatar: entry.photo || avatars[index % avatars.length],
          level: entry.level,
          totalXP: entry.xp,
          currentStreak: 0,
          section: studentProfile?.grade || 'Grade 11 - STEM A',
          rank: {
            global: entry.rank,
            section: entry.rank,
            friends: entry.rank,
            change: 0,
          },
          stats: {
            quizzesCompleted: 0,
            averageScore: 0,
            modulesCompleted: 0,
            studyHours: 0,
          },
          isFriend: studentProfile?.friends?.includes(entry.userId) || false,
          isOnline: false,
          isYou: entry.userId === currentUser.uid,
        }));
        setMockStudents(students);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    loadLeaderboard();
  }, [currentUser, timeFilter]);

  const getCurrentRank = () => {
    const you = mockStudents.find(s => s.isYou);
    if (!you) return 0;
    switch(activeView) {
      case 'school': return you.rank.global;
      case 'section': return you.rank.section;
      case 'friends': return you.rank.friends;
      default: return you.rank.section;
    }
  };

  const getFilteredStudents = () => {
    let filtered = mockStudents;
    
    if (activeView === 'friends') {
      filtered = filtered.filter(s => s.isFriend || s.isYou);
    } else if (activeView === 'section') {
      filtered = filtered.filter(s => s.section === 'Grade 11 - STEM A');
    }

    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      const rankKey = activeView === 'friends' ? 'friends' : activeView === 'section' ? 'section' : 'global';
      return (a.rank[rankKey] || 999) - (b.rank[rankKey] || 999);
    });
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-500 text-white';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white';
    if (rank <= 10) return 'bg-gradient-to-br from-purple-500 to-purple-700 text-white';
    return 'bg-slate-100 text-slate-600';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={16} className="text-yellow-300" />;
    if (rank === 2) return <Medal size={16} className="text-slate-200" />;
    if (rank === 3) return <Medal size={16} className="text-orange-300" />;
    return null;
  };

  const students = getFilteredStudents();
  const topThree = students.slice(0, 3);
  const restOfList = students.slice(3);
  const yourRank = getCurrentRank();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-gradient-to-br from-blue-600 via-cyan-500 to-cyan-600 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">🏆 Leaderboard</h1>
            <p className="text-cyan-100">Compete with friends and classmates</p>
          </div>
          <Button 
            onClick={() => setShowAddFriends(true)}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm"
          >
            <UserPlus size={18} className="mr-2" />
            Add Friends
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <Trophy size={24} className="text-yellow-300 mb-2" />
            <p className="text-2xl font-bold">#{yourRank}</p>
            <p className="text-sm text-cyan-100">Your Rank</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <Users size={24} className="text-blue-300 mb-2" />
            <p className="text-2xl font-bold">{studentProfile?.friends?.length || 0}</p>
            <p className="text-sm text-cyan-100">Friends</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <Flame size={24} className="text-orange-300 mb-2" />
            <p className="text-2xl font-bold">{studentProfile?.streak || 0} Days</p>
            <p className="text-sm text-cyan-100">Current Streak</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <TrendingUp size={24} className="text-green-300 mb-2" />
            <p className="text-2xl font-bold">+2</p>
            <p className="text-sm text-cyan-100">Rank Change</p>
          </div>
        </div>
      </div>

      {/* View Tabs & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[
            { id: 'section', label: 'My Section', icon: Users },
            { id: 'school', label: 'School', icon: Trophy },
            { id: 'friends', label: 'Friends', icon: Flame },
          ].map((view) => {
            const Icon = view.icon;
            const count = view.id === 'friends' 
              ? mockStudents.filter(s => s.isFriend).length 
              : view.id === 'section'
              ? mockStudents.filter(s => s.section === 'Grade 11 - STEM A').length
              : mockStudents.length;
            
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as typeof activeView)}
                className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${
                  activeView === view.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} />
                {view.label}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeView === view.id
                    ? 'bg-white/20'
                    : 'bg-slate-100'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
            <option value="today">Today</option>
          </select>
        </div>
      </div>

      {/* Podium for Top 3 */}
      {topThree.length >= 3 && (
        <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-end justify-center gap-6">
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-300 to-slate-500 rounded-2xl flex items-center justify-center text-4xl shadow-lg">
                  {topThree[1]?.avatar}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                  2
                </div>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{topThree[1]?.name}</h3>
              <p className="text-sm text-slate-500 mb-2">Level {topThree[1]?.level}</p>
              <div className="bg-slate-50 rounded-xl px-4 py-2 mb-3">
                <p className="text-lg font-bold text-slate-700">{topThree[1]?.totalXP} XP</p>
              </div>
              <div className="h-32 w-32 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl flex items-center justify-center">
                <Medal size={32} className="text-slate-400" />
              </div>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center -mt-8"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                className="mb-2"
              >
                <Crown size={32} className="text-yellow-500" />
              </motion.div>
              <div className="relative mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center text-5xl shadow-2xl">
                  {topThree[0]?.avatar}
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  1
                </div>
                {topThree[0]?.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white"></div>
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{topThree[0]?.name}</h3>
              <p className="text-sm text-slate-500 mb-2">Level {topThree[0]?.level}</p>
              <div className="bg-yellow-50 rounded-xl px-6 py-2 mb-3">
                <p className="text-xl font-bold text-yellow-700">{topThree[0]?.totalXP} XP</p>
              </div>
              <div className="h-40 w-32 bg-gradient-to-t from-yellow-300 to-yellow-100 rounded-t-2xl flex items-center justify-center">
                <Trophy size={40} className="text-yellow-600" />
              </div>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg">
                  {topThree[2]?.avatar}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                  3
                </div>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{topThree[2]?.name}</h3>
              <p className="text-sm text-slate-500 mb-2">Level {topThree[2]?.level}</p>
              <div className="bg-orange-50 rounded-xl px-4 py-2 mb-3">
                <p className="text-lg font-bold text-orange-700">{topThree[2]?.totalXP} XP</p>
              </div>
              <div className="h-28 w-32 bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-2xl flex items-center justify-center">
                <Medal size={32} className="text-orange-500" />
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Rest of Rankings */}
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-4">
            {activeView === 'section' ? 'Section Rankings' : activeView === 'friends' ? 'Friends Rankings' : 'School Rankings'}
          </h3>

          <div className="space-y-2">
            {restOfList.map((student, index) => {
              const actualRank = index + 4;
              const rankKey = activeView === 'friends' ? 'friends' : activeView === 'section' ? 'section' : 'global';
              const displayRank = student.rank[rankKey];

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all hover:shadow-md ${
                    student.isYou 
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200' 
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${getRankBadgeColor(displayRank)}`}>
                    {getRankIcon(displayRank) || `#${displayRank}`}
                  </div>

                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-2xl">
                      {student.avatar}
                    </div>
                    {student.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800">
                        {student.name}
                        {student.isYou && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">You</span>}
                      </h4>
                      {student.rank.change !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${student.rank.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {student.rank.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {Math.abs(student.rank.change)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-500">Level {student.level}</span>
                      <span className="text-xs text-slate-500">{student.totalXP} XP</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Flame size={12} className="text-orange-500" />
                        {student.currentStreak} days
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!student.isYou && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => setShowCompare(student)}
                        >
                          <Swords size={14} className="mr-1" />
                          Compare
                        </Button>
                        {!student.isFriend && (
                          <Button
                            size="sm"
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <UserPlus size={14} className="mr-1" />
                            Add
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <StudentProfileModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <AddFriendsModal
        isOpen={showAddFriends}
        onClose={() => setShowAddFriends(false)}
      />

      <CompareStatsModal
        student={showCompare}
        onClose={() => setShowCompare(null)}
      />
    </div>
  );
};

export default LeaderboardPage;