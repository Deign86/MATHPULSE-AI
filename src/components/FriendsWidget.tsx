import React from 'react';
import { Users, UserPlus, Trophy, Flame, ChevronRight, User } from 'lucide-react';
import { motion } from 'motion/react';

interface FriendsWidgetProps {
  onViewAll: () => void;
  onAddFriends: () => void;
}

const FriendsWidget: React.FC<FriendsWidgetProps> = ({ onViewAll, onAddFriends }) => {
  const friends = [
    { id: '1', name: 'Sarah Chen', avatar: '', level: 18, xp: 2450, isOnline: true, rank: 1 },
    { id: '2', name: 'Marcus Kim', avatar: '', level: 17, xp: 2380, isOnline: true, rank: 2 },
    { id: '5', name: 'David Patel', avatar: '', level: 14, xp: 1720, isOnline: false, rank: 4 },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#dde3eb] p-3 card-elevated">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sky-500/10 rounded-lg flex items-center justify-center">
            <Users size={16} className="text-sky-600" />
          </div>
          <h3 className="font-display font-bold text-sm text-[#0a1628]">Friends</h3>
        </div>
        <button
          onClick={onAddFriends}
          className="p-2 hover:bg-sky-50 rounded-lg transition-colors"
        >
          <UserPlus size={16} className="text-sky-600" />
        </button>
      </div>

      <div className="space-y-1.5 mb-3">
        {friends.map((friend, idx) => (
          <motion.div
            key={friend.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-2.5 p-2 bg-[#f7f9fc] rounded-lg hover:bg-sky-50/50 transition-colors cursor-pointer border border-transparent hover:border-sky-200/50"
          >
            <div className="relative">
              <div className="w-8 h-8 bg-[#dde3eb] rounded-lg flex items-center justify-center">
                {friend.avatar || <User size={16} className="text-[#5a6578]" />}
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
        className="w-full py-2 bg-sky-500/8 hover:bg-sky-500/15 text-sky-600 font-body font-semibold text-xs rounded-lg transition-colors border border-sky-200/40"
      >
        View All Friends
      </button>
    </div>
  );
};

export default FriendsWidget;
