import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Users, Flame, TrendingUp, TrendingDown, Crown, Medal, Eye, Search, Loader2, User, ChevronLeft, Bold, RefreshCw } from 'lucide-react';
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
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const myClassSection = [studentProfile?.grade, studentProfile?.section].filter(Boolean).join(' - ');

  // Load leaderboard data from Firebase
  const loadLeaderboard = useCallback(async () => {
    if (!currentUser) {
      setLeaderboardLoading(false);
      return;
    }
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const mappedFilter = timeFilter === 'all' ? 'all' : 'week';

      const entries = await getLeaderboard(currentUser.uid, false, mappedFilter as any, 20);

      if (!entries || entries.length === 0) {
        setStudents([]);
        return;
      }

      const leaderboardData: LeaderboardStudent[] = entries.map((entry, index) => ({
        id: entry.userId,
        uid: entry.userId,
        name: entry.name,
        avatar:
          entry.userId === currentUser.uid
            ? (currentUserPhoto || entry.photo || '')
            : (entry.photo || ''),
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
      setLeaderboardError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentUser, myClassSection, timeFilter, currentUserPhoto]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

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

    return sorted;
  };

  const filteredStudents = getFilteredStudents();

  const yourRank = filteredStudents.find(s => s.isYou)?.rank.section || (filteredStudents.length + 1);
  const percentile = filteredStudents.length > 1
    ? Math.max(10, Math.min(99, 100 - (yourRank / Math.max(1, filteredStudents.length)) * 100))
    : 90;

  const topThree = filteredStudents.slice(0, 3);
  const restOfList = filteredStudents.slice(3);

  const renderAvatar = (avatar: string | undefined, size: number) => {
    if (!avatar) return <User size={size} className="text-slate-400 opacity-70" />;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) {
      return <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />;
    }
    return <User size={size} className="text-slate-400 opacity-70" />;
  };

  if (leaderboardLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[500px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm text-slate-400 font-medium">Loading leaderboard...</p>
      </div>
    );
  }

  if (leaderboardError) {
    return (
      <div className="flex flex-col justify-center items-center h-[500px] gap-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 mb-1">Couldn't load leaderboard</p>
          <p className="text-xs text-slate-400">{leaderboardError}</p>
        </div>
        <button
          onClick={loadLeaderboard}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen relative flex flex-col items-center font-body text-white">
      {/* Background that fades dynamically without harsh container edges */}
      <div className="absolute inset-x-[-30px] top-[-30px] bottom-0 z-[-1] pointer-events-none overflow-hidden bg-[#f5ecff]">
        {/* Radial base fading from purple at bottom center to the very top */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,#9333ea_0%,#c084fc_50%,transparent_100%)]"></div>

        {/* Sunburst Rays - GPU-accelerated CSS animation */}
        <div
          className="absolute inset-x-[-30px] top-[-30px] bottom-0 opacity-50 pointer-events-none mix-blend-plus-lighter overflow-hidden"
        >
          <div
            className="animate-sunburst-spin absolute top-[540px] md:top-[600px] left-1/2"
            style={{
              width: "2000px",
              height: "2000px",
              marginLeft: "-1000px",
              marginTop: "-1000px",
              willChange: "transform",
              background: `repeating-conic-gradient(from 0deg at 50% 50%, 
              rgba(255, 250, 193, 1) 0deg, rgba(255, 250, 193, 0.7) 4deg, 
              transparent 4deg, transparent 8deg)`
            }}
          />
        </div>

        {/* Soft core light effect at bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150vw] h-[100vh] bg-[radial-gradient(ellipse_at_50%_100%,#7e22ce_10%,transparent_60%)] mix-blend-overlay"></div>
      </div>
      <div className="absolute inset-0 bg-math-pattern opacity-[0.03] mix-blend-overlay pointer-events-none z-[-1]" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%)' }}></div>

      {/* Constraints Wrapper */}
      <div className="relative z-10 w-full px-4 sm:px-8 py-4 md:py-6 flex flex-col items-center">

        {/* Top App Bar Area */}
        <div className="w-full flex justify-center items-center mb-4 mt-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wide text-slate-800 drop-shadow-sm">Leaderboard</h1>
        </div>

        {/* Time Filters - Segmented Pill based on Reference Image 1 */}
        <div className="bg-slate-800/5 backdrop-blur-md rounded-full p-1 flex gap-1 mb-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border border-slate-800/10 w-full max-w-[340px]">
          {(['daily', 'weekly', 'all'] as TimeFilter[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTimeFilter(mode)}
              className={`flex-1 py-1.5 rounded-full text-[13px] md:text-sm font-semibold transition-all capitalize inline-flex justify-center items-center ${timeFilter === mode
                ? 'bg-white text-purple-700 shadow-md border border-white/50 backdrop-blur-lg'
                : 'text-slate-600 hover:text-purple-700 hover:bg-white/50'
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
          className="w-full max-w-[420px] mb-4 bg-[#FFB356] p-2.5 md:p-3 rounded-full shadow-lg flex items-center gap-3 relative overflow-hidden ring-1 ring-white/20"
        >
          {/* Subtle noise pattern inside orange banner */}
          <div className="absolute inset-0 bg-noise opacity-[0.15] mix-blend-overlay pointer-events-none"></div>

          <div className="bg-white/25 backdrop-blur-md px-4 py-2 min-w-[60px] rounded-full flex flex-col items-center justify-center shadow-sm z-10 border border-white/20">
            <span className="text-xl md:text-2xl font-display font-bold text-white leading-none">#{yourRank}</span>
          </div>
          <div className="z-10 flex-1 pr-2 md:pr-4">
            <p className="font-medium text-white/90 text-sm md:text-[15px] leading-snug text-center">
              You are doing better than <span className="font-black text-white drop-shadow-sm">{Math.round(percentile)}%</span> of other players!
            </p>
          </div>
        </motion.div>

        {/* Glowing Spotlight Rays have been replaced by the Sunburst integrated into the main background */}

        {/* Podium Layout (Matches reference) */}
        <div className="w-full max-w-[800px] flex items-end justify-center gap-2 md:gap-4 h-[280px] md:h-[310px] relative z-20 mt-8 md:mt-12 mx-auto px-2 sm:px-4 group perspective-1000">
          {/* ----- 2nd Place (Left) ----- */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 90 }}
            className="flex flex-col items-center relative z-10 w-[28%] sm:w-[30%] max-w-[145px] mx-1 md:mr-2"
          >
            <div className="flex flex-col items-center mb-2 md:mb-4 relative z-40 w-full">
              <div className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full border-[3px] border-[#FF8B8B] bg-[#111827] flex items-center justify-center shadow-[0_0_18px_rgba(255,139,139,0.6)] overflow-hidden">
                {renderAvatar(topThree[1]?.avatar, 26)}
              </div>
              <h3 className="font-semibold text-white mt-1.5 md:mt-2 text-xs md:text-sm drop-shadow-md w-full text-center pb-1 px-1 whitespace-normal break-words leading-tight relative z-50">
                {topThree[1]?.name || '---'}
              </h3>
            </div>

            {/* 3D Cylinder Podium */}
            <div className="w-[90%] relative mt-2">
              {/* Bottom Curve */}
              <div className="w-full h-10 md:h-14 absolute -bottom-5 md:-bottom-7 bg-[#D96C6A] rounded-[50%] shadow-[0_15px_25px_rgba(0,0,0,0.4)] z-0"></div>

              {/* Main Body */}
              <div className="w-full h-[100px] md:h-[130px] bg-[#D96C6A] relative z-10 flex flex-col items-center justify-start overflow-hidden">
                <span className="absolute inset-x-0 top-3 flex items-center justify-center text-[60px] md:text-[80px] font-black text-white/10 drop-shadow">2</span>
              </div>

              {/* Top Platform */}
              <div className="w-full h-10 md:h-14 absolute -top-5 md:-top-7 bg-[#FF8B8B] rounded-[50%] z-20 shadow-[0_4px_8px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center">
                {/* Shadow Text laying flat */}
                <div className="text-black/25 font-black text-[18px] md:text-[26px] transform scale-y-75 uppercase tracking-widest pointer-events-none z-30">
                  {topThree[1]?.totalXP || 0} XP
                </div>
              </div>
            </div>
          </motion.div>

          {/* ----- 1st Place (Center) ----- */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 100 }}
            className="flex flex-col items-center relative z-30 w-[35%] sm:w-[38%] max-w-[190px]"
          >
            <div className="flex flex-col items-center mb-3 md:mb-5 relative z-40 w-full">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }} className="mb-[-10px] z-30">
                <Crown size={30} className="text-yellow-300 fill-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.9)] md:w-9 md:h-9" />
              </motion.div>
              <div className="w-16 h-16 md:w-[86px] md:h-[86px] rounded-full border-[4px] border-[#fde68a] bg-[#111827] flex items-center justify-center shadow-[0_0_24px_rgba(250,204,21,0.6)] overflow-hidden">
                {renderAvatar(topThree[0]?.avatar, 34)}
              </div>
              <h3 className="font-semibold text-white mt-1.5 md:mt-2 text-sm md:text-base drop-shadow-md w-full text-center pb-1 px-1 whitespace-normal break-words leading-tight relative z-50">
                {topThree[0]?.name || '---'}
              </h3>
            </div>

            {/* 3D Cylinder Podium */}
            <div className="w-[95%] relative mt-2">
              {/* Bottom Curve */}
              <div className="w-full h-12 md:h-16 absolute -bottom-6 md:-bottom-8 bg-[#6F2BAF] rounded-[50%] shadow-[0_20px_30px_rgba(0,0,0,0.5)] z-0"></div>

              {/* Main Body */}
              <div className="w-full h-[140px] md:h-[180px] bg-[#6F2BAF] relative z-10 flex flex-col items-center justify-start overflow-hidden">
                <span className="absolute inset-x-0 top-4 flex items-center justify-center text-[80px] md:text-[110px] font-black text-white/10 drop-shadow">1</span>
              </div>

              {/* Top Platform */}
              <div className="w-full h-12 md:h-16 absolute -top-6 md:-top-8 bg-[#9956DE] rounded-[50%] z-20 shadow-[0_5px_12px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center">
                {/* Shadow Text laying flat */}
                <div className="text-black/25 font-black text-[22px] md:text-[32px] transform scale-y-75 uppercase tracking-widest pointer-events-none z-30">
                  {topThree[0]?.totalXP || 0} XP
                </div>
              </div>
            </div>
          </motion.div>

          {/* ----- 3rd Place (Right) ----- */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 90 }}
            className="flex flex-col items-center relative z-10 w-[28%] sm:w-[30%] max-w-[145px] mx-1 md:ml-2"
          >
            <div className="flex flex-col items-center mb-2 md:mb-4 relative z-40 w-full">
              <div className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full border-[3px] border-[#FFB356] bg-[#111827] flex items-center justify-center shadow-[0_0_18px_rgba(255,179,86,0.6)] overflow-hidden">
                {renderAvatar(topThree[2]?.avatar, 26)}
              </div>
              <h3 className="font-semibold text-white mt-1.5 md:mt-2 text-xs md:text-sm drop-shadow-md w-full text-center pb-1 px-1 whitespace-normal break-words leading-tight relative z-50">
                {topThree[2]?.name || '---'}
              </h3>
            </div>

            {/* 3D Cylinder Podium */}
            <div className="w-[90%] relative mt-2">
              {/* Bottom Curve */}
              <div className="w-full h-10 md:h-14 absolute -bottom-5 md:-bottom-7 bg-[#DE7949] rounded-[50%] shadow-[0_15px_25px_rgba(0,0,0,0.4)] z-0"></div>

              {/* Main Body */}
              <div className="w-full h-[75px] md:h-[100px] bg-[#DE7949] relative z-10 flex flex-col items-center justify-start overflow-hidden">
                <span className="absolute inset-x-0 top-1 flex items-center justify-center text-[50px] md:text-[70px] font-black text-white/10 drop-shadow">3</span>
              </div>

              {/* Top Platform */}
              <div className="w-full h-10 md:h-14 absolute -top-5 md:-top-7 bg-[#FFB356] rounded-[50%] z-20 shadow-[0_4px_8px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center">
                {/* Shadow Text laying flat */}
                <div className="text-black/25 font-black text-[16px] md:text-[22px] transform scale-y-75 uppercase tracking-widest pointer-events-none z-30">
                  {topThree[2]?.totalXP || 0} XP
                </div>
              </div>
            </div>
          </motion.div>

        </div>

      </div>{/* End Main Container Constraints */}

      {/* ----- Rest of Rankings List Container ----- */}
      {/* Container wraps the items and flex-grows to cover the bottom, without generating false empty scroll space */}
      <div className="w-full flex-grow relative z-20 pt-6 pb-8 px-4 sm:px-10 flex flex-col items-center mt-[-15px] md:mt-[-30px] bg-white rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] border-t border-slate-100 min-h-[50vh]">

        {/* Visual Handle / indicator to scroll down */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-6 mt-[-5px]"></div>

        <div className="w-full max-w-4xl space-y-3.5">
          {restOfList.map((student, index) => {
            const actualRank = student.rank.global || index + 4;

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 + 0.3 }}
                onClick={() => setSelectedStudent(student)}
                className={`flex items-center gap-4 p-3.5 md:p-4 rounded-3xl cursor-pointer bg-white border transition-all duration-300 ${student.isYou
                  ? 'border-[#8B5CF6]/40 shadow-xl shadow-[#8B5CF6]/20 ring-2 ring-[#8B5CF6]/10'
                  : 'border-slate-100 shadow-[0_12px_25px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_30px_rgba(0,0,0,0.12)]'
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
                    <p className="text-[13px] md:text-[15px] font-bold text-slate-500 text-right">{student.totalXP} <span className="text-[10px] text-slate-400 font-normal uppercase">XP</span></p>
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