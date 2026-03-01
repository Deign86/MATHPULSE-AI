import React from 'react';
import { BookOpen, Trophy, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const QuickStatsWidget = () => {
  const stats = [
    { icon: BookOpen, label: 'Quizzes This Week', value: '0', iconBg: 'bg-sky-500/10', iconColor: 'text-sky-500', trend: '—' },
    { icon: Clock, label: 'Study Hours', value: '0', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', trend: '—' },
    { icon: Trophy, label: 'Modules Completed', value: '0', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', trend: '—' },
    { icon: TrendingUp, label: 'Avg. Score', value: '0%', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', trend: '—' },
  ];

  return (
    <div>
      <h3 className="font-display font-bold text-base text-[#0a1628] mb-2">This Week's Progress</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-white rounded-xl p-2.5 border border-[#dde3eb] card-elevated group cursor-default"
            >
              <div className={`w-7 h-7 ${stat.iconBg} rounded-lg flex items-center justify-center mb-1.5`}>
                <Icon size={14} className={stat.iconColor} />
              </div>
              <p className="text-lg font-display font-bold text-[#0a1628] leading-tight">{stat.value}</p>
              <p className="text-xs text-[#5a6578] font-body">{stat.label}</p>
              {stat.trend !== '—' ? (
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp size={11} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-body font-semibold">{stat.trend}</span>
                </div>
              ) : (
                <div className="mt-1">
                  <span className="text-xs text-slate-400 font-body">No data yet</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStatsWidget;
