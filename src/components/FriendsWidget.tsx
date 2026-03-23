import React, { useEffect, useState } from 'react';
import { Trophy, ChevronRight, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getUserFriends } from '../services/friendsService';

interface FriendsWidgetProps {
  onViewAll: () => void;
  onAddFriends: () => void;
}

interface FriendItem {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  isOnline: boolean;
  rank: number;
}

const FriendsWidget: React.FC<FriendsWidgetProps> = ({ onViewAll, onAddFriends }) => {
  const { userProfile, isLoggedIn } = useAuth();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => {
    const loadFriends = async () => {
      if (!isLoggedIn || !userProfile?.uid) {
        setFriends([]);
        return;
      }

      setLoadingFriends(true);
      try {
        const friendData = await getUserFriends(userProfile.uid);
        const mappedFriends = friendData
          .map((friend) => ({
            id: friend.uid,
            name: friend.name || 'Unknown User',
            avatar: friend.photo,
            level: friend.level || 1,
            xp: friend.totalXP || 0,
            isOnline: false,
            rank: 0,
          }))
          .sort((a, b) => b.xp - a.xp)
          .map((friend, index) => ({
            ...friend,
            rank: index + 1,
          }))
          .slice(0, 3);

        setFriends(mappedFriends);
      } catch (error) {
        console.error('Failed to load friends for widget:', error);
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, [isLoggedIn, userProfile?.uid]);

  return (
    <div className="bg-white rounded-xl border border-[#dde3eb] p-3 card-elevated">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center">
            <Trophy size={16} className="text-rose-500" />
          </div>
          <h3 className="font-display font-bold text-sm text-[#0a1628]">Leaderboards</h3>
        </div>
        <Trophy size={15} className="text-rose-500/70" />
      </div>

      <div className="space-y-1.5 mb-3">
        {loadingFriends && (
          <div className="text-xs font-body text-[#5a6578] px-2 py-3">Loading leaderboard...</div>
        )}

        {!loadingFriends && friends.length === 0 && (
          <div className="text-xs font-body text-[#5a6578] px-2 py-3">
            No leaderboard data yet. Complete lessons and earn XP to rank.
          </div>
        )}

        {!loadingFriends && friends.map((friend, idx) => (
          <motion.div
            key={friend.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-2.5 p-2 bg-[#f7f9fc] rounded-lg hover:bg-sky-50/50 transition-colors cursor-pointer border border-transparent hover:border-sky-200/50"
          >
            <div className="relative">
              <div className="w-8 h-8 bg-[#dde3eb] rounded-lg flex items-center justify-center">
                {friend.avatar ? (
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <User size={16} className="text-[#5a6578]" />
                )}
              </div>
              {friend.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-body font-semibold text-sm text-[#0a1628] truncate">{friend.name}</h4>
                {friend.rank <= 3 && (
                  <Trophy 
                    size={11} 
                    className={
                      friend.rank === 1 ? 'text-rose-500' : 
                      friend.rank === 2 ? 'text-zinc-400' : 
                      'text-orange-500'
                    } 
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#5a6578] font-body">
                <span>Lv.{friend.level}</span>
                <span className="text-[#d1cec6]">·</span>
                <span>{friend.xp} XP</span>
              </div>
            </div>

            <ChevronRight size={14} className="text-[#d1cec6]" />
          </motion.div>
        ))}
      </div>

      <button
        onClick={onViewAll}
        className="w-full py-2 bg-rose-500/8 hover:bg-rose-500/15 text-rose-600 font-body font-semibold text-xs rounded-lg transition-colors border border-rose-200/40"
      >
        View Leaderboards
      </button>
    </div>
  );
};

export default FriendsWidget;
