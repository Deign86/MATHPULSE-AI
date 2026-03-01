import React from 'react';
import { BookOpen, Trophy, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const QuickStatsWidget = () => {
  const stats = [
    { icon: BookOpen, label: 'Quizzes This Week', value: '5', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', trend: '+2' },
    { icon: Clock, label: 'Study Hours', value: '12.5', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', trend: '+3.5' },
    { icon: Trophy, label: 'Modules Completed', value: '8', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', trend: '+1' },
    { icon: TrendingUp, label: 'Avg. Score', value: '87%', iconBg: 'bg-fuchsia-500/10', iconColor: 'text-fuchsia-500', trend: '+5%' },
  ];

  return (
    <div>
      <h3 className="font-display font-bold text-base text-[#1a1625] mb-4">This Week's Progress</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-white rounded-xl p-4 border border-[#e8e5de] card-elevated group cursor-default"
            >
              <div className={`w-9 h-9 ${stat.iconBg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon size={18} className={stat.iconColor} />
              </div>
              <p className="text-2xl font-display font-bold text-[#1a1625]">{stat.value}</p>
              <p className="text-xs text-[#6b687a] mt-1 font-body">{stat.label}</p>
              <div className="mt-2 flex items-center gap-1">
                <TrendingUp size={11} className="text-emerald-500" />
                <span className="text-xs text-emerald-600 font-body font-semibold">{stat.trend}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStatsWidget;
