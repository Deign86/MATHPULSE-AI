import React, { useState, useEffect } from 'react';
import { Trophy, Users, Flame, TrendingUp, TrendingDown, Crown, Medal, Eye, Search, Loader2, User, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import StudentProfileModal from './StudentProfileModal';
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
    change: number;
  };
  stats: {
    quizzesCompleted: number;
    averageScore: number;
    modulesCompleted: number;
    studyHours: number;
  };
  isOnline: boolean;
  isYou?: boolean;
}

interface LeaderboardPageProps {
  currentUserPhoto?: string;
  onBack?: () => void; // Support for back navigation
}

type TimeFilter = 'daily' | 'weekly' | 'all';

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ currentUserPhoto, onBack }) => {
  const { currentUser, userProfile } = useAuth();
  const studentProfile = userProfile as StudentProfile;
  const [activeView] = useState<'school' | 'section'>('section');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [selectedStudent, setSelectedStudent] = useState<LeaderboardStudent | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const myClassSection = [studentProfile?.grade, studentProfile?.section].filter(Boolean).join(' - ');

  const avatars = ['', '', '', '', '', '', '', ''];

  // Load leaderboard data from Firebase
  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!currentUser) return;
      setLeaderboardLoading(true);
      try {
        const timeFilterMap = {
          'daily': 'week',
          'weekly': 'week',
          'all': 'all'
        };
        const mappedFilter = timeFilter === 'daily' ? 'week' : (timeFilter === 'all' ? 'all' : 'week');

        const entries = await getLeaderboard(currentUser.uid, false, mappedFilter as any, 20);
        const leaderboardData: LeaderboardStudent[] = entries.map((entry, index) => ({
          id: entry.userId,
          uid: entry.userId,
          name: entry.name,
          avatar:
            entry.userId === currentUser.uid
              ? (currentUserPhoto || entry.photo || avatars[index % avatars.length])
              : (entry.photo || avatars[index % avatars.length]),
          level: entry.level,
          totalXP: entry.xp,
          currentStreak: 0,
          section: myClassSection || 'Grade 11 - STEM A',
          rank: {
            global: entry.rank,
            section: entry.rank,
            change: 0,
          },
          stats: { quizzesCompleted: 0, averageScore: 0, modulesCompleted: 0, studyHours: 0 },
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
  }, [currentUser, myClassSection, timeFilter, currentUserPhoto]);

  const getFilteredStudents = () => {
    let filtered = students;
    if (activeView === 'section') {
      const mySection = myClassSection || '';
      if (mySection) {
        filtered = filtered.filter(s => s.section === mySection);
      }
    }
    
    // Sort Ascending Rank
    const sorted = filtered.sort((a, b) => {
      const rankKey = activeView === 'section' ? 'section' : 'global';
      return (a.rank[rankKey] || 999) - (b.rank[rankKey] || 999);
    });
    
    // Fallback: Pad array to ensure we always have 3 for the podium layout
    while(sorted.length > 0 && sorted.length < 3) {
      const mockRank = sorted.length + 1;
      sorted.push({
        id: `mock-${mockRank}`, uid: `mock-${mockRank}`, name: `Student ${mockRank}`,
        avatar: '', level: 1, totalXP: 0, currentStreak: 0, section: myClassSection || '',
        rank: { global: mockRank, section: mockRank, change: 0 }, stats: { quizzesCompleted:0, averageScore:0, modulesCompleted:0, studyHours:0},
        isOnline: false, isYou: false
      });
    }

    return sorted;
  };

  const filteredStudents = getFilteredStudents();
  
  const yourRank = filteredStudents.find(s => s.isYou)?.rank.section || 4;
  const percentile = Math.max(10, Math.min(99, 100 - (yourRank / Math.max(1, filteredStudents.length)) * 100));

  const topThree = filteredStudents.length >= 3 ? filteredStudents.slice(0, 3) : [];
  const restOfList = filteredStudents.length >= 3 ? filteredStudents.slice(3) : [];

  const renderAvatar = (avatar: string | undefined, size: number) => {
    if (!avatar) return <User size={size} className="text-slate-400 opacity-70" />;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) {
      return <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />;
    }
    return <User size={size} className="text-slate-400 opacity-70" />;
  };

  if (leaderboardLoading) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:min-h-[85vh] bg-[#7c3aed] relative overflow-hidden font-body text-white lg:rounded-[2.5rem] flex flex-col items-center">
      {/* Background Math Pattern & Glow Overlays */}
      <div className="absolute inset-0 bg-math-pattern opacity-10 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute top-0 right-[-100px] w-[500px] h-[500px] bg-[#8B5CF6] blur-[120px] rounded-full opacity-60 pointer-events-none -translate-y-1/3"></div>
      <div className="absolute top-1/4 left-[-100px] w-[400px] h-[400px] bg-[#f43f5e] blur-[140px] rounded-full opacity-30 pointer-events-none"></div>

      {/* Constraints Wrapper */}
      <div className="relative z-10 w-full max-w-2xl px-4 py-8 flex flex-col items-center">
        
        {/* Top App Bar Area */}
        <div className="w-full flex justify-between items-center mb-8">
          <button 
            onClick={onBack} 
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm pointer-events-auto"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-wide">Leaderboard</h1>
          <div className="w-10 h-10"></div> {/* Spacer for alignment */}
        </div>

        {/* Time Filters - Segmented Pill based on Reference Image 1 */}
        <div className="bg-white/10 backdrop-blur-md rounded-full p-1.5 flex gap-1 mb-6 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-white/20 w-full max-w-[340px]">
          {(['daily', 'weekly', 'all'] as TimeFilter[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTimeFilter(mode)}
              className={`flex-1 py-2.5 rounded-full text-[13px] md:text-sm font-semibold transition-all capitalize inline-flex justify-center items-center ${
                timeFilter === mode 
                  ? 'bg-white/20 text-white shadow-md border border-white/30 backdrop-blur-lg' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {mode === 'all' ? 'All Time' : mode}
            </button>
          ))}
        </div>

        {/* Personalized Gamified Banner based on Reference Image 1 */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[420px] mb-8 bg-gradient-to-r from-[#fb923c] to-[#f97316] p-4 rounded-[1.25rem] shadow-lg flex items-center gap-4 relative overflow-hidden ring-1 ring-white/20"
        >
          {/* Subtle noise pattern inside orange banner */}
          <div className="absolute inset-0 bg-noise opacity-[0.15] mix-blend-overlay pointer-events-none"></div>
          
          <div className="bg-white/25 backdrop-blur-md px-4 py-3 min-w-[60px] rounded-xl flex flex-col items-center justify-center shadow-sm z-10 border border-white/20">
            <span className="text-2xl font-display font-bold text-white leading-none">#{yourRank}</span>
          </div>
          <div className="z-10 flex-1">
            <p className="font-semibold text-white/95 text-[15px] leading-snug">
              You are doing better than <br/>{percentile.toFixed(0)}% of other players!
            </p>
          </div>
        </motion.div>

        {/* 3D Slanted Podium Layout based on Reference Image 2 */}
        <div className="w-full flex items-end justify-center h-[260px] md:h-[300px] relative z-20 mt-4">
          
          {/* Glowing Spotlight Aura for 1st Place */}
          <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[280px] h-[350px] bg-yellow-400/30 blur-[70px] rounded-[100%] mix-blend-screen pointer-events-none z-0 transform origin-bottom -rotate-[0deg] scale-y-[1.5]"></div>

          {/* ----- 2nd Place (Left) ----- */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col items-center relative z-10 w-1/3 bottom-0"
          >
            {/* Avatar Profile */}
            <div className="flex flex-col items-center mb-6 relative">
              <div className="w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-full border-[3px] border-[#A78BFA] bg-slate-200 flex items-center justify-center relative z-20 shadow-lg overflow-hidden bg-gradient-to-br from-purple-200 to-purple-400">
                {renderAvatar(topThree[1]?.avatar, 28)}
                <div className="absolute -bottom-1 -right-1 flex gap-0.5 z-30">
                  <div className="w-3.5 h-3.5 bg-blue-500 rounded-sm border border-white"></div>
                  <div className="w-3.5 h-3.5 bg-red-500 rounded-sm border border-white"></div>
                  <div className="w-3.5 h-3.5 bg-white rounded-sm border border-white"></div>
                </div>
              </div>
              <h3 className="font-display font-bold tracking-wide text-white mt-3 text-xs md:text-sm drop-shadow-md z-20 truncate w-full text-center px-1">
                {topThree[1]?.name || '---'}
              </h3>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] md:text-xs font-bold text-white shadow-sm mt-1">
                {topThree[1]?.totalXP || 0} XP
              </div>
            </div>

            {/* 3D Slanted Block (Leaning Right/Up towards center) */}
            <div className="relative w-full z-10 flex flex-col items-center">
              {/* Slanted Top Surface */}
              <div className="h-[25px] w-full max-w-[100px] absolute -top-3 bg-[#E0D7FE] origin-bottom-right transform -skew-y-[15deg] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] border-t border-r border-[#FFF]/30"></div>
              {/* Front Face skewed */}
              <div className="w-full max-w-[100px] h-[110px] md:h-[130px] bg-gradient-to-b from-[#b598fd] to-[#9266f8] flex items-center justify-center pb-8 shadow-[inset_4px_0_10px_rgba(0,0,0,0.05)]" style={{ clipPath: 'polygon(0 15%, 100% 0, 100% 100%, 0 100%)' }}>
                <span className="text-5xl md:text-6xl font-display font-bold text-white drop-shadow-sm opacity-90">2</span>
              </div>
            </div>
          </motion.div>

          {/* ----- 1st Place (Center) ----- */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col items-center relative z-20 w-[38%] mx-[-4px] md:mx-[-8px] bottom-0"
          >
            {/* Crown and Avatar */}
            <div className="flex flex-col items-center mb-3 relative">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="mb-[-12px] z-30">
                <Crown size={32} className="text-yellow-300 fill-yellow-300 drop-shadow-[0_2px_10px_rgba(250,204,21,0.6)] md:w-[42px] md:h-[42px]" />
              </motion.div>
              <div className="w-[76px] h-[76px] md:w-[94px] md:h-[94px] rounded-full border-4 border-yellow-300 bg-slate-200 flex items-center justify-center relative z-20 shadow-[0_4px_25px_rgba(250,204,21,0.5)] overflow-hidden bg-gradient-to-br from-yellow-100 to-yellow-400">
                {renderAvatar(topThree[0]?.avatar, 40)}
                <div className="absolute -bottom-1 -right-1 flex gap-0.5 z-30">
                   <div className="w-4 h-4 bg-green-500 rounded-sm border-2 border-white"></div>
                   <div className="w-4 h-4 bg-red-500 rounded-sm border-2 border-white"></div>
                </div>
              </div>
              <h3 className="font-display font-bold tracking-wide text-white mt-3 text-sm md:text-base drop-shadow-md z-20 truncate w-full text-center px-1">
                {topThree[0]?.name || '---'}
              </h3>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs md:text-sm font-bold text-white shadow-sm mt-1">
                {topThree[0]?.totalXP || 0} XP
              </div>
            </div>

            {/* Flat Tall Center Block */}
            <div className="relative w-full z-20 flex flex-col items-center">
              {/* Flat Top Surface */}
              <div className="h-[20px] w-full max-w-[120px] absolute -top-[10px] bg-[#FFFFFF] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] border border-slate-100 flex justify-center items-center">
              </div>
              {/* Front Face */}
              <div className="w-full max-w-[120px] h-[150px] md:h-[180px] bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] flex items-center justify-center pb-10 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.4)] relative">
                <span className="text-7xl md:text-8xl font-display font-bold text-white drop-shadow-md opacity-100">1</span>
                {/* Glossy gradient reflection top edge */}
                <div className="absolute top-0 left-0 w-full h-[30px] bg-gradient-to-b from-white/60 to-transparent pointer-events-none mix-blend-overlay"></div>
              </div>
            </div>
          </motion.div>

          {/* ----- 3rd Place (Right) ----- */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex flex-col items-center relative z-10 w-1/3 bottom-0"
          >
            {/* Avatar Profile */}
            <div className="flex flex-col items-center mb-6 relative">
              <div className="w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-full border-[3px] border-[#93c5fd] bg-slate-200 flex items-center justify-center relative z-20 shadow-lg overflow-hidden bg-gradient-to-br from-blue-200 to-blue-400">
                {renderAvatar(topThree[2]?.avatar, 28)}
                <div className="absolute -bottom-1 -right-1 flex gap-0.5 z-30">
                   <div className="w-3.5 h-3.5 bg-red-500 rounded-sm border border-white"></div>
                   <div className="w-3.5 h-3.5 bg-white rounded-sm border border-white"></div>
                </div>
              </div>
              <h3 className="font-display font-bold tracking-wide text-white mt-3 text-xs md:text-sm drop-shadow-md z-20 truncate w-full text-center px-1">
                {topThree[2]?.name || '---'}
              </h3>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] md:text-xs font-bold text-white shadow-sm mt-1">
                {topThree[2]?.totalXP || 0} XP
              </div>
            </div>

            {/* 3D Slanted Block (Leaning Left/Up towards center) */}
            <div className="relative w-full z-10 flex flex-col items-center">
              {/* Slanted Top Surface */}
              <div className="h-[25px] w-full max-w-[100px] absolute -top-3 bg-[#e0e7ff] origin-bottom-left transform skew-y-[15deg] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] border-t border-l border-[#FFF]/30"></div>
              {/* Front Face skewed */}
              <div className="w-full max-w-[100px] h-[95px] md:h-[110px] bg-gradient-to-b from-[#a5b4fc] to-[#818cf8] flex items-center justify-center pb-8 shadow-[inset_-4px_0_10px_rgba(0,0,0,0.05)]" style={{ clipPath: 'polygon(0 0, 100% 15%, 100% 100%, 0 100%)' }}>
                <span className="text-5xl md:text-6xl font-display font-bold text-white drop-shadow-sm opacity-90">3</span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>{/* End Main Container Constraints */}

      {/* ----- Rest of Rankings List Container ----- */}
      {/* Takes up the remaining space, overlaying the background */}
      <div className="w-[110%] mx-[-5%] sm:w-full sm:mx-0 flex-1 bg-[#F5F7FA] mt-[-10px] rounded-t-[3rem] py-8 px-6 sm:px-10 relative z-20 shadow-[0_-15px_30px_rgba(0,0,0,0.1)] flex flex-col items-center">
        
        <div className="w-16 h-1.5 bg-slate-200 rounded-full mb-8 absolute top-4 left-1/2 -translate-x-1/2"></div>
        
        <div className="w-full max-w-2xl space-y-3.5">
          {restOfList.map((student, index) => {
            const actualRank = student.rank.global || index + 4;
            
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 + 0.3 }}
                onClick={() => setSelectedStudent(student)}
                className={`flex items-center gap-4 p-3.5 md:p-4 rounded-3xl cursor-pointer transition-all hover:-translate-y-1 bg-white border ${
                  student.isYou 
                    ? 'border-[#8B5CF6]/40 shadow-lg shadow-[#8B5CF6]/15 ring-2 ring-[#8B5CF6]/10' 
                    : 'border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]'
                }`}
              >
                {/* Rank Bubble */}
                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full border-2 border-slate-100 bg-white flex items-center justify-center font-display font-bold text-slate-500 shadow-sm text-sm">
                  {actualRank}
                </div>

                {/* Avatar */}
                <div className="w-11 h-11 md:w-14 md:h-14 bg-slate-100 rounded-full flex items-center justify-center text-xl overflow-hidden shadow-sm relative border-[3px] border-[#F1F5F9]">
                  {renderAvatar(student.avatar, 24)}
                </div>

                {/* Info */}
                <div className="flex-1 flex justify-between items-center pr-2">
                  <div>
                    <h4 className="font-display font-bold text-[#1E293B] text-[15px] md:text-lg flex items-center gap-2 tracking-wide">
                       {student.name}
                       {student.isYou && <span className="text-[9px] uppercase tracking-wider bg-[#8B5CF6] text-white px-1.5 py-0.5 rounded font-bold">You</span>}
                    </h4>
                  </div>
                  <div>
                    <p className="text-[13px] md:text-[15px] font-bold text-slate-500 text-right">{student.totalXP} <span className="text-[10px] text-slate-400 font-normal uppercase">pts</span></p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {restOfList.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 font-medium">No other participants found in this view.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <StudentProfileModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
};

export default LeaderboardPage;