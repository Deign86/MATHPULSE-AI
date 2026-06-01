import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import type { LeaderboardEntry } from '../../types/models';
import type { RewardDefinition } from '../../types/rewards';
import {
  getWeeklyRewards,
  claimDailyReward,
} from '../../services/dailyRewardService';

 type Tab = 'rewards' | 'leaderboard';
 type Period = 'weekly' | 'monthly' | 'all';

 const RARITY_BG: Record<string, string> = {
   common: 'bg-slate-500/15 border-slate-500/40',
   uncommon: 'bg-emerald-500/15 border-emerald-500/40',
   rare: 'bg-blue-500/15 border-blue-500/40',
   epic: 'bg-amber-500/15 border-amber-500/40',
 };

 function rankLabel(rank: number): string {
   if (rank === 1) return '1st';
   if (rank === 2) return '2nd';
   if (rank === 3) return '3rd';
   return `${rank}th`;
 }

 export default function RewardsScreen() {
   const user = useAuthStore((s) => s.user);
   const studentProfile = useAuthStore((s) => s.studentProfile);
   const dailyStreak = useGamificationStore((s) => s.dailyStreak);
   const addXP = useGamificationStore((s) => s.addXP);
   const leaderboard = useGamificationStore((s) => s.leaderboard);
   const refreshLeaderboard = useGamificationStore((s) => s.refreshLeaderboard);

   const [tab, setTab] = useState<Tab>('rewards');
   const [period, setPeriod] = useState<Period>('weekly');
   const [refreshing, setRefreshing] = useState(false);
   const [claiming, setClaiming] = useState(false);
   const [weeklyRewards, setWeeklyRewards] = useState<RewardDefinition[]>([]);
   const [claimedDays, setClaimedDays] = useState<number[]>([]);
   const [todayIndex, setTodayIndex] = useState(0);
   const [weekSeed, setWeekSeed] = useState(0);
   const [activeMultiplier, setActiveMultiplier] = useState<{ multiplier: number; expiresAt: string } | null>(null);
   const [rewardsLoading, setRewardsLoading] = useState(true);
   const [rewardsError, setRewardsError] = useState<string | null>(null);

   const currentDayIndex = claimedDays.length;
   const canClaim = currentDayIndex < 7;

   const loadRewards = useCallback(async () => {
     if (!user?.uid) return;
     setRewardsLoading(true);
     setRewardsError(null);
     try {
       const data = await getWeeklyRewards(user.uid);
       setWeeklyRewards(data.rewards);
       setClaimedDays(data.claimedDays);
       setTodayIndex(data.todayIndex);
       setWeekSeed(data.weekSeed);
     } catch (err) {
       const message = err instanceof Error ? err.message : 'Failed to load rewards';
       setRewardsError(message);
     } finally {
       setRewardsLoading(false);
     }
   }, [user?.uid]);

   const loadLeaderboard = useCallback(async () => {
     await refreshLeaderboard(period);
   }, [period, refreshLeaderboard]);

   useEffect(() => {
     loadRewards();
   }, [loadRewards]);

   useEffect(() => {
     loadLeaderboard();
   }, [loadLeaderboard]);

   const onRefresh = useCallback(async () => {
     setRefreshing(true);
     await Promise.all([
       loadRewards(),
       loadLeaderboard(),
     ]).catch(() => {});
     setRefreshing(false);
   }, [loadRewards, loadLeaderboard]);

   const handleClaim = useCallback(async (dayIndex: number) => {
     if (claiming || claimedDays.includes(dayIndex) || dayIndex !== currentDayIndex) return;
     if (!user) return;
     setClaiming(true);
     try {
       const result = await claimDailyReward(user.uid, dayIndex);
       if (result.success) {
         setClaimedDays((prev) => [...prev, dayIndex]);
         if (result.xpAwarded > 0) {
           addXP(result.xpAwarded);
         }
         if (result.multiplierApplied && result.multiplierApplied > 1) {
           // Multiplier applied — refresh rewards to get updated state
           await loadRewards();
         }
       } else if (result.error) {
         setRewardsError(result.error);
       }
     } catch (err) {
       const message = err instanceof Error ? err.message : 'Failed to claim reward';
       setRewardsError(message);
     } finally {
       setClaiming(false);
     }
   }, [claiming, claimedDays, currentDayIndex, user, addXP, loadRewards]);

   if (!user) {
     return (
       <View className="flex-1 items-center justify-center bg-background px-6">
         <Text variant="h3" className="text-foreground text-center">
           Please sign in to view rewards.
         </Text>
       </View>
     );
   }

   if (rewardsLoading && !weeklyRewards.length) {
     return (
       <View className="flex-1 items-center justify-center bg-background">
         <ActivityIndicator size="large" color="#6366f1" />
         <Text className="text-muted-foreground text-sm mt-3">Loading rewards...</Text>
       </View>
     );
   }

   return (
     <ScrollView
       className="flex-1 bg-background"
       contentContainerStyle={{ paddingBottom: 40 }}
       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />}
     >
       {/* Segmented control */}
       <View className="flex-row mx-4 mt-4 mb-5 bg-surface rounded-full p-1">
         {(['rewards', 'leaderboard'] as Tab[]).map((t) => (
           <TouchableOpacity
             key={t}
             onPress={() => setTab(t)}
             className={`flex-1 py-2 rounded-full items-center ${tab === t ? 'bg-primary' : ''}`}
             accessibilityRole="tab"
             accessibilityLabel={t === 'rewards' ? 'Daily Rewards tab' : 'Leaderboard tab'}
             accessibilityState={{ selected: tab === t }}
           >
             <Text className={`text-sm font-semibold ${tab === t ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
               {t === 'rewards' ? 'Daily Rewards' : 'Leaderboard'}
             </Text>
           </TouchableOpacity>
         ))}
       </View>

       {tab === 'rewards' ? (
         <View className="px-4">
           {/* Streak + tokens header */}
           <View className="flex-row gap-3 mb-4">
             <Card className="flex-1 p-4 bg-orange-500/10 border border-orange-500/30">
               <Text className="text-orange-300 text-xs">Streak</Text>
               <Text className="text-foreground text-2xl font-bold">{dailyStreak}</Text>
             </Card>
             <Card className="flex-1 p-4 bg-blue-500/10 border border-blue-500/30">
               <Text className="text-blue-300 text-xs">This Week</Text>
               <Text className="text-foreground text-2xl font-bold">
                 {currentDayIndex}/7
               </Text>
             </Card>
           </View>

           {/* Active multiplier banner */}
           {activeMultiplier && (
             <Card className="p-3 mb-4 bg-violet-500/10 border border-violet-500/30">
               <Text className="text-violet-300 text-sm font-semibold">
                 {activeMultiplier.multiplier}x XP multiplier active
               </Text>
               <Text className="text-muted-foreground text-xs">
                 Expires {new Date(activeMultiplier.expiresAt).toLocaleTimeString()}
               </Text>
             </Card>
           )}

           {/* Error banner */}
           {rewardsError && (
             <Card className="p-3 mb-4 bg-error/10 border border-error/30">
               <Text className="text-error text-sm">{rewardsError}</Text>
             </Card>
           )}

           {/* 7-day grid */}
           <Text variant="h3" className="text-foreground mb-3">This Week's Rewards</Text>
           <View className="flex-row flex-wrap gap-3 mb-5">
             {weeklyRewards.map((reward) => {
               const isClaimed = claimedDays.includes(reward.day);
               const isCurrent = reward.day === currentDayIndex && !isClaimed && canClaim;
               const isLocked = reward.day > currentDayIndex;
               return (
                 <TouchableOpacity
                   key={reward.id}
                   onPress={() => isCurrent && handleClaim(reward.day)}
                   disabled={!isCurrent}
                   className={`flex-1 min-w-[28%] aspect-square rounded-2xl border p-2 items-center justify-center ${
                     isClaimed
                       ? 'bg-success/15 border-success/40'
                       : isCurrent
                         ? 'bg-primary/20 border-primary'
                         : isLocked
                           ? 'bg-surface/40 border-border opacity-50'
                           : 'bg-surface border-border'
                   }`}
                   style={{ borderColor: isClaimed ? '#4ade80' : isCurrent ? '#6366f1' : undefined }}
                   accessibilityRole="button"
                   accessibilityLabel={
                     isClaimed
                       ? `${reward.label} reward claimed, ${reward.description}`
                       : isCurrent
                         ? `Claim ${reward.label} reward, ${reward.description}`
                         : isLocked
                           ? `${reward.label} locked, complete previous days first`
                           : `${reward.label} reward, ${reward.description}`
                   }
                 >
                   <Text className={`text-[10px] font-semibold ${isClaimed ? 'text-success' : 'text-foreground'}`}>
                     {isClaimed ? 'Claimed' : isCurrent ? 'Tap to claim' : isLocked ? 'Locked' : reward.label}
                   </Text>
                   <Text className="text-muted-foreground text-[9px] text-center mt-0.5">
                     {reward.description}
                   </Text>
                 </TouchableOpacity>
               );
             })}
           </View>

           {canClaim && currentDayIndex < 7 && (
             <Button
               onPress={() => handleClaim(currentDayIndex)}
               loading={claiming}
               disabled={claiming}
             >
               Claim Day {currentDayIndex + 1} Reward
             </Button>
           )}

           {currentDayIndex === 7 && (
             <Card className="p-4 bg-amber-500/10 border border-amber-500/40">
               <Text className="text-amber-300 text-center font-semibold">
                 Week Complete! Come back next week.
               </Text>
             </Card>
           )}
         </View>
       ) : (
         <View className="px-4">
           {/* Period filter */}
           <View className="flex-row gap-2 mb-4">
             {(['weekly', 'monthly', 'all'] as Period[]).map((p) => (
               <TouchableOpacity
                 key={p}
                 onPress={() => setPeriod(p)}
                 className={`px-4 py-1.5 rounded-full ${period === p ? 'bg-primary' : 'bg-surface border border-border'}`}
                 accessibilityRole="button"
                 accessibilityLabel={`${p === 'all' ? 'All Time' : p} filter`}
               >
                 <Text className={`text-xs font-semibold capitalize ${period === p ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                   {p === 'all' ? 'All Time' : p}
                 </Text>
               </TouchableOpacity>
             ))}
           </View>

           {/* Top 3 podium */}
           <View className="flex-row items-end justify-center mb-5 gap-2">
             {[1, 0, 2].map((i) => {
               const entry = leaderboard[i];
               if (!entry) return null;
               const heights = ['h-28', 'h-36', 'h-24'];
               const colors = ['bg-slate-400', 'bg-amber-400', 'bg-orange-400'];
               return (
                 <View key={entry.userId} className="items-center flex-1">
                   <Avatar fallback={entry.name} size={i === 0 ? 'lg' : 'md'} className="mb-2" />
                   <Text className="text-foreground text-xs font-semibold text-center" numberOfLines={1}>
                     {entry.name.split(' ')[0]}
                   </Text>
                   <Text className="text-muted-foreground text-[10px] mb-1">
                     {entry.xp.toLocaleString()} XP
                   </Text>
                   <View className={`${heights[i]} w-full ${colors[i]} rounded-t-xl items-center justify-start pt-2`}>
                     <Text className="text-background text-lg font-bold">{rankLabel(i + 1)}</Text>
                   </View>
                 </View>
               );
             })}
           </View>

           {/* Rest of leaderboard */}
           <View className="gap-2">
             {leaderboard.slice(3).map((entry) => {
               const isMe = entry.userId === user?.uid;
               return (
                 <Card
                   key={entry.userId}
                   className={`p-3 flex-row items-center ${isMe ? 'bg-primary/10 border border-primary/40' : ''}`}
                 >
                   <Text className="text-muted-foreground text-sm font-bold w-10 text-center">
                     #{entry.rank}
                   </Text>
                   <Avatar fallback={entry.name} size="sm" className="mr-3" />
                   <View className="flex-1">
                     <Text className={`text-sm font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>
                       {entry.name} {isMe && '(You)'}
                     </Text>
                     <Text className="text-muted-foreground text-xs">
                       Level {entry.level}
                     </Text>
                   </View>
                   <Text className="text-amber-400 text-sm font-bold">
                     {entry.xp.toLocaleString()}
                   </Text>
                 </Card>
               );
             })}
           </View>
         </View>
       )}
     </ScrollView>
   );
 }
