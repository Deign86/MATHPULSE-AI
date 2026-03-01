import React, { useState, useEffect } from 'react';
import { Trophy, Users, Flame, TrendingUp, TrendingDown, Crown, Medal, UserPlus, Swords, Eye, Search, Loader2, User } from 'lucide-react';
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
  uid: string;
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
  const [students, setStudents] = useState<LeaderboardStudent[]>([]);

  const avatars = ['', '', '', '', '', '', '', ''];

  // Load leaderboard data from Firebase
  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!currentUser) return;
      setLeaderboardLoading(true);
      try {
        const entries = await getLeaderboard(currentUser.uid, false, timeFilter === 'today' ? 'week' : timeFilter, 20);
        const leaderboardData: LeaderboardStudent[] = entries.map((entry, index) => ({
          id: entry.userId,
          uid: entry.userId,
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
        setStudents(leaderboardData);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    loadLeaderboard();
  }, [currentUser, timeFilter]);

  const getCurrentRank = () => {
    const you = students.find(s => s.isYou);
    if (!you) return 0;
    switch(activeView) {
      case 'school': return you.rank.global;
      case 'section': return you.rank.section;
      case 'friends': return you.rank.friends;
      default: return you.rank.section;
    }
  };

  const getFilteredStudents = () => {
    let filtered = students;
    
    if (activeView === 'friends') {
      filtered = filtered.filter(s => s.isFriend || s.isYou);
    } else if (activeView === 'section') {
      // Filter to same grade/section as the current student
      const mySection = studentProfile?.grade || '';
      if (mySection) {
        filtered = filtered.filter(s => s.section === mySection);
      }
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
    if (rank === 1) return 'bg-gradient-to-br from-rose-400 to-rose-600 text-white';
    if (rank === 2) return 'bg-gradient-to-br from-zinc-300 to-zinc-500 text-white';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white';
    if (rank <= 10) return 'bg-gradient-to-br from-sky-500 to-sky-700 text-white';
    return 'bg-[#edf1f7] text-[#5a6578]';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={16} className="text-rose-200" />;
    if (rank === 2) return <Medal size={16} className="text-zinc-200" />;
    if (rank === 3) return <Medal size={16} className="text-orange-200" />;
    return null;
  };

  const filteredStudents = getFilteredStudents();
  const showPodium = filteredStudents.length >= 3;
  const topThree = showPodium ? filteredStudents.slice(0, 3) : [];
  const restOfList = showPodium ? filteredStudents.slice(3) : filteredStudents;
  const yourRank = getCurrentRank();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-gradient-to-br from-white via-sky-50/30 to-white rounded-2xl p-7 card-elevated-lg relative overflow-hidden border border-slate-200/80">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-100/40 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1 flex items-center gap-3 text-[#0a1628]"><Trophy size={24} className="text-rose-500" /> Leaderboard</h1>
            <p className="text-slate-500 font-body text-sm">Compete with friends and classmates</p>
          </div>
          <Button 
            onClick={() => setShowAddFriends(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg border border-sky-700 font-body font-semibold text-sm"
          >
            <UserPlus size={16} className="mr-2" />
            Add Friends
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
            <Trophy size={18} className="text-rose-500 mb-2" />
            <p className="text-2xl font-display font-bold text-[#0a1628]">#{yourRank}</p>
            <p className="text-xs text-slate-500 font-body">Your Rank</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
            <Users size={18} className="text-sky-500 mb-2" />
            <p className="text-2xl font-display font-bold text-[#0a1628]">{studentProfile?.friends?.length || 0}</p>
            <p className="text-xs text-slate-500 font-body">Friends</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
            <Flame size={18} className="text-orange-500 mb-2" />
            <p className="text-2xl font-display font-bold text-[#0a1628]">{studentProfile?.streak || 0} Days</p>
            <p className="text-xs text-slate-500 font-body">Current Streak</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
            <TrendingUp size={18} className="text-emerald-500 mb-2" />
            <p className="text-2xl font-display font-bold text-[#0a1628]">+2</p>
            <p className="text-xs text-slate-500 font-body">Rank Change</p>
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
              ? filteredStudents.filter(s => s.isFriend).length 
              : view.id === 'section'
              ? filteredStudents.filter(s => studentProfile?.grade && s.section === studentProfile.grade).length
              : filteredStudents.length;
            
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as typeof activeView)}
                className={`px-4 py-2 rounded-lg font-body font-semibold text-sm flex items-center gap-2 transition-all ${
                  activeView === view.id
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'bg-white text-[#5a6578] hover:bg-[#edf1f7] border border-[#dde3eb]'
                }`}
              >
                <Icon size={16} />
                {view.label}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeView === view.id
                    ? 'bg-white/20'
                    : 'bg-[#edf1f7]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="leaderboard-search"
              name="leaderboard-search"
              aria-label="Search students"
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-[#dde3eb] rounded-lg text-sm font-body text-[#0a1628] bg-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <select
            id="time-filter"
            name="time-filter"
            aria-label="Filter by time period"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
            className="px-4 py-2 border border-[#dde3eb] rounded-lg text-sm font-body bg-white text-[#0a1628]"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
            <option value="today">Today</option>
          </select>
        </div>
      </div>

      {/* Podium for Top 3 */}
      {showPodium && (
        <div className="bg-white rounded-xl p-8 border border-[#dde3eb] card-elevated">
          <div className="flex items-end justify-center gap-6">
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-zinc-300 to-zinc-500 rounded-xl flex items-center justify-center text-4xl shadow-lg">
                  {topThree[1]?.avatar ? topThree[1].avatar : <User size={32} className="text-white" />}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-400 rounded-full flex items-center justify-center text-white font-display font-bold text-sm shadow-md">
                  2
                </div>
              </div>
              <h3 className="font-display font-bold text-[#0a1628] mb-1">{topThree[1]?.name}</h3>
              <p className="text-sm text-[#5a6578] font-body mb-2">Level {topThree[1]?.level}</p>
              <div className="bg-[#edf1f7] rounded-lg px-4 py-2 mb-3">
                <p className="text-lg font-display font-bold text-[#0a1628]">{topThree[1]?.totalXP} XP</p>
              </div>
              <div className="h-32 w-32 bg-gradient-to-t from-zinc-200 to-zinc-100 rounded-t-xl flex items-center justify-center">
                <Medal size={32} className="text-zinc-400" />
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
                <Crown size={32} className="text-rose-500" />
              </motion.div>
              <div className="relative mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-rose-400 to-rose-600 rounded-xl flex items-center justify-center text-5xl shadow-2xl">
                  {topThree[0]?.avatar ? topThree[0].avatar : <User size={40} className="text-white" />}
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white font-display font-bold shadow-md">
                  1
                </div>
                {topThree[0]?.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white"></div>
                )}
              </div>
              <h3 className="font-display font-bold text-[#0a1628] text-lg mb-1">{topThree[0]?.name}</h3>
              <p className="text-sm text-[#5a6578] font-body mb-2">Level {topThree[0]?.level}</p>
              <div className="bg-rose-50 rounded-lg px-6 py-2 mb-3">
                <p className="text-xl font-display font-bold text-rose-700">{topThree[0]?.totalXP} XP</p>
              </div>
              <div className="h-40 w-32 bg-gradient-to-t from-rose-300 to-rose-100 rounded-t-xl flex items-center justify-center">
                <Trophy size={40} className="text-rose-600" />
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
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-4xl shadow-lg">
                  {topThree[2]?.avatar ? topThree[2].avatar : <User size={32} className="text-white" />}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-display font-bold text-sm shadow-md">
                  3
                </div>
              </div>
              <h3 className="font-display font-bold text-[#0a1628] mb-1">{topThree[2]?.name}</h3>
              <p className="text-sm text-[#5a6578] font-body mb-2">Level {topThree[2]?.level}</p>
              <div className="bg-orange-50 rounded-lg px-4 py-2 mb-3">
                <p className="text-lg font-display font-bold text-orange-700">{topThree[2]?.totalXP} XP</p>
              </div>
              <div className="h-28 w-32 bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-xl flex items-center justify-center">
                <Medal size={32} className="text-orange-500" />
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Rest of Rankings */}
      <div className="bg-white rounded-xl border border-[#dde3eb] card-elevated overflow-hidden">
        <div className="p-6">
          <h3 className="font-display font-bold text-lg text-[#0a1628] mb-4">
            {activeView === 'section' ? 'Section Rankings' : activeView === 'friends' ? 'Friends Rankings' : 'School Rankings'}
          </h3>

          <div className="space-y-2">
            {restOfList.map((student, index) => {
              const actualRank = showPodium ? index + 4 : index + 1;
              const rankKey = activeView === 'friends' ? 'friends' : activeView === 'section' ? 'section' : 'global';
              const displayRank = student.rank[rankKey];

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md ${
                    student.isYou 
                      ? 'bg-sky-50/50 border border-sky-200' 
                      : 'bg-[#f7f9fc] hover:bg-[#edf1f7] border border-transparent'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-display font-bold text-lg flex-shrink-0 ${getRankBadgeColor(displayRank)}`}>
                    {getRankIcon(displayRank) || `#${displayRank}`}
                  </div>

                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-[#dde3eb] rounded-lg flex items-center justify-center text-2xl">
                      {student.avatar ? student.avatar : <User size={22} className="text-[#5a6578]" />}
                    </div>
                    {student.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-body font-semibold text-[#0a1628]">
                        {student.name}
                        {student.isYou && <span className="ml-2 text-xs bg-sky-600 text-white px-2 py-0.5 rounded-full font-body">You</span>}
                      </h4>
                      {student.rank.change !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-body font-bold ${student.rank.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {student.rank.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {Math.abs(student.rank.change)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-[#5a6578] font-body">Level {student.level}</span>
                      <span className="text-xs text-[#5a6578] font-body">{student.totalXP} XP</span>
                      <span className="text-xs text-[#5a6578] font-body flex items-center gap-1">
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
                          className="rounded-lg font-body"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg font-body"
                          onClick={() => setShowCompare(student)}
                        >
                          <Swords size={14} className="mr-1" />
                          Compare
                        </Button>
                        {!student.isFriend && (
                          <Button
                            size="sm"
                            className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-body font-semibold"
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