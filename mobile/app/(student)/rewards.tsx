import React, { useState, useCallback, useMemo } from 'react';
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
import type { LeaderboardEntry, Achievement } from '../../types/models';
import type { RewardDefinition } from '../../types/rewards';
import {
  getLeaderboard,
  claimDailyReward as claimDailyRewardApi,
} from '../../services/gamificationService';
import { auth } from '../../lib/firebase';

type Tab = 'rewards' | 'leaderboard';
type Period = 'weekly' | 'monthly' | 'all';

const MOCK_WEEKLY: RewardDefinition[] = [
  { id: 'd0', day: 0, label: 'Day 1', description: '+50 XP', icon: '⭐', type: 'xp', value: 50, rarity: 'common', color: '#94a3b8' },
  { id: 'd1', day: 1, label: 'Day 2', description: '+75 XP', icon: '⭐', type: 'xp', value: 75, rarity: 'common', color: '#94a3b8' },
  { id: 'd2', day: 2, label: 'Day 3', description: '1 Hint Token', icon: '💡', type: 'hint_token', value: 1, rarity: 'uncommon', color: '#4ade80' },
  { id: 'd3', day: 3, label: 'Day 4', description: '+100 XP', icon: '⭐', type: 'xp', value: 100, rarity: 'uncommon', color: '#4ade80' },
  { id: 'd4', day: 4, label: 'Day 5', description: '1 Streak Shield', icon: '🛡️', type: 'streak_shield', value: 1, rarity: 'rare', color: '#60a5fa' },
  { id: 'd5', day: 5, label: 'Day 6', description: '1.5x XP (1hr)', icon: '⚡', type: 'xp_multiplier', value: 1.5, rarity: 'rare', color: '#a78bfa' },
  { id: 'd6', day: 6, label: 'Day 7', description: '+500 XP + Badge', icon: '🏆', type: 'xp', value: 500, rarity: 'epic', color: '#facc15' },
];

const MOCK_LEADERS: LeaderboardEntry[] = [
  { userId: 'u1', name: 'Maria Santos', xp: 12450, level: 24, rank: 1, weeklyXP: 1820, monthlyXP: 6450 },
  { userId: 'u2', name: 'Juan Dela Cruz', xp: 11200, level: 22, rank: 2, weeklyXP: 1640, monthlyXP: 5900 },
  { userId: 'u3', name: 'Ana Reyes', xp: 10800, level: 21, rank: 3, weeklyXP: 1520, monthlyXP: 5600 },
  { userId: 'u4', name: 'Carlos Garcia', xp: 9650, level: 20, rank: 4, weeklyXP: 1380, monthlyXP: 4900 },
  { userId: 'u5', name: 'Sofia Mendoza', xp: 8900, level: 18, rank: 5, weeklyXP: 1240, monthlyXP: 4500 },
  { userId: 'u6', name: 'Diego Cruz', xp: 7650, level: 16, rank: 6, weeklyXP: 1100, monthlyXP: 3900 },
  { userId: 'u7', name: 'Isabel Torres', xp: 6320, level: 14, rank: 7, weeklyXP: 920, monthlyXP: 3200 },
  { userId: 'u8', name: 'Miguel Bautista', xp: 5400, level: 12, rank: 8, weeklyXP: 780, monthlyXP: 2700 },
  { userId: 'u9', name: 'Camila Villanueva', xp: 4280, level: 10, rank: 9, weeklyXP: 640, monthlyXP: 2200 },
  { userId: 'u10', name: 'Rafael Aquino', xp: 3100, level: 8, rank: 10, weeklyXP: 480, monthlyXP: 1600 },
];

const RARITY_BG: Record<string, string> = {
  common: 'bg-slate-500/15 border-slate-500/40',
  uncommon: 'bg-emerald-500/15 border-emerald-500/40',
  rare: 'bg-blue-500/15 border-blue-500/40',
  epic: 'bg-amber-500/15 border-amber-500/40',
};

function rankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function RewardsScreen() {
  const user = useAuthStore((s) => s.user);
  const studentProfile = useAuthStore((s) => s.studentProfile);
  const dailyStreak = useGamificationStore((s) => s.dailyStreak);
  const addXP = useGamificationStore((s) => s.addXP);

  const [tab, setTab] = useState<Tab>('rewards');
  const [period, setPeriod] = useState<Period>('weekly');
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedDays, setClaimedDays] = useState<Set<number>>(new Set());
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>(MOCK_LEADERS);
  const [activeMultiplier, setActiveMultiplier] = useState<{ multiplier: number; expiresAt: string } | null>(null);

  const currentDayIndex = useMemo(() => claimedDays.size, [claimedDays]);
  const canClaim = currentDayIndex < 7;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getLeaderboard(period);
      if (Array.isArray(data) && data.length) setLeaders(data);
    } catch {
      // fall back to mock
    } finally {
      setRefreshing(false);
    }
  }, [period]);

  const handleClaim = useCallback(async (dayIndex: number) => {
    if (claiming || claimedDays.has(dayIndex) || dayIndex !== currentDayIndex) return;
    if (!user) return;
    setClaiming(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const result = await claimDailyRewardApi(user.uid, dayIndex, token);
      if (result?.claimed) {
        setClaimedDays((prev) => new Set(prev).add(dayIndex));
        const reward = MOCK_WEEKLY[dayIndex];
        if (reward.type === 'xp' && typeof reward.value === 'number') addXP(reward.value);
      } else {
        // optimistic fallback
        setClaimedDays((prev) => new Set(prev).add(dayIndex));
        const reward = MOCK_WEEKLY[dayIndex];
        if (reward.type === 'xp' && typeof reward.value === 'number') addXP(reward.value);
      }
    } catch {
      // optimistic fallback for offline/demo
      setClaimedDays((prev) => new Set(prev).add(dayIndex));
      const reward = MOCK_WEEKLY[dayIndex];
      if (reward.type === 'xp' && typeof reward.value === 'number') addXP(reward.value);
    } finally {
      setClaiming(false);
    }
  }, [claiming, claimedDays, currentDayIndex, user, addXP]);

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
            accessibilityState={{ selected: tab === t } as any}
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
              <Text className="text-foreground text-2xl font-bold">🔥 {dailyStreak}</Text>
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
                ⚡ {activeMultiplier.multiplier}x XP multiplier active
              </Text>
              <Text className="text-muted-foreground text-xs">
                Expires {new Date(activeMultiplier.expiresAt).toLocaleTimeString()}
              </Text>
            </Card>
          )}

          {/* 7-day grid */}
          <Text variant="h3" className="text-foreground mb-3">This Week's Rewards</Text>
          <View className="flex-row flex-wrap gap-3 mb-5">
            {MOCK_WEEKLY.map((reward) => {
              const isClaimed = claimedDays.has(reward.day);
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
                  <Text className="text-3xl mb-1">{reward.icon}</Text>
                  <Text className={`text-[10px] font-semibold ${isClaimed ? 'text-success' : 'text-foreground'}`}>
                    {isClaimed ? '✓ Claimed' : isCurrent ? 'Tap!' : isLocked ? '🔒' : reward.label}
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
                🏆 Week Complete! Come back next week.
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
              const entry = leaders[i];
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
                    <Text className="text-background text-lg font-bold">{rankEmoji(i + 1)}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Rest of leaderboard */}
          <View className="gap-2">
            {leaders.slice(3).map((entry) => {
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
