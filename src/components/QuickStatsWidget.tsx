import React from 'react';
import { BookOpen, Trophy, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const QuickStatsWidget = () => {
  const stats = [
    { icon: BookOpen, label: 'Quizzes This Week', value: '5', color: 'indigo', trend: '+2' },
    { icon: Clock, label: 'Study Hours', value: '12.5', color: 'teal', trend: '+3.5' },
    { icon: Trophy, label: 'Modules Completed', value: '8', color: 'purple', trend: '+1' },
    { icon: TrendingUp, label: 'Avg. Score', value: '87%', color: 'orange', trend: '+5%' },
  ];

  return (
    <div>
      <h3 className="font-bold text-lg text-slate-800 mb-4">This Week's Progress</h3>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
            >
              <div className={`w-10 h-10 bg-${stat.color}-100 rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className={`text-${stat.color}-600`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              <div className="mt-2 flex items-center gap-1">
                <TrendingUp size={12} className="text-green-500" />
                <span className="text-xs text-green-600 font-bold">{stat.trend}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStatsWidget;
