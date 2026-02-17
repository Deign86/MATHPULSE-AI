import React from 'react';
import { Users, UserPlus, Trophy, Flame, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface FriendsWidgetProps {
  onViewAll: () => void;
  onAddFriends: () => void;
}

const FriendsWidget: React.FC<FriendsWidgetProps> = ({ onViewAll, onAddFriends }) => {
  const friends = [
    { id: '1', name: 'Sarah Chen', avatar: '👩', level: 18, xp: 2450, isOnline: true, rank: 1 },
    { id: '2', name: 'Marcus Kim', avatar: '👨', level: 17, xp: 2380, isOnline: true, rank: 2 },
    { id: '5', name: 'David Patel', avatar: '👦', level: 14, xp: 1720, isOnline: false, rank: 4 },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          <h3 className="font-bold text-slate-800">Friends</h3>
        </div>
        <button
          onClick={onAddFriends}
          className="p-2 hover:bg-indigo-50 rounded-xl transition-colors"
        >
          <UserPlus size={18} className="text-indigo-600" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {friends.map((friend, idx) => (
          <motion.div
            key={friend.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="relative">
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-lg">
                {friend.avatar}
              </div>
              {friend.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-800 truncate">{friend.name}</h4>
                {friend.rank <= 3 && (
                  <Trophy 
                    size={12} 
                    className={
                      friend.rank === 1 ? 'text-yellow-500' : 
                      friend.rank === 2 ? 'text-slate-400' : 
                      'text-orange-500'
                    } 
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Level {friend.level}</span>
                <span>•</span>
                <span>{friend.xp} XP</span>
              </div>
            </div>

            <ChevronRight size={16} className="text-slate-400" />
          </motion.div>
        ))}
      </div>

      <button
        onClick={onViewAll}
        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium text-sm rounded-xl transition-colors"
      >
        View All Friends
      </button>
    </div>
  );
};

export default FriendsWidget;
