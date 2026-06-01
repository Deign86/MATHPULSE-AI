import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Progress } from '../../components/ui/Progress';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { getStudentProgress } from "../../services/progressService";
import { getXPActivities, computeLevel } from "../../services/gamificationService";
import { useAuthStore } from "../../stores/useAuthStore";
import { useGamificationStore } from "../../stores/useGamificationStore";
import { auth } from "../../lib/firebase";
import type { XPActivity } from "../../types/models";

interface SubjectBreakdown {
  subjectId: string;
  subjectName: string;
  masteryPercent: number;
  status: string;
}

interface StudentProgress {
  overallMasteryPercent: number;
  subjectBreakdown: SubjectBreakdown[];
  weeklyGoal: { targetXP: number; currentXP: number };
  streak: { current: number; best: number };
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function aggregateByDay(
  activities: XPActivity[],
  tz: string = 'Asia/Manila',
): Record<string, number> {
  const result: Record<string, number> = {};
  DAYS.forEach((d) => { result[d] = 0; });

  activities.forEach((activity) => {
    const dayName = getDayNameInTz(activity.timestamp, tz);
    if (result[dayName] !== undefined) {
      result[dayName] += activity.xpEarned || 0;
    }
  });

  return result;
}

function getDayNameInTz(date: Date, _tz: string): string {
  // PHT is UTC+8, no DST. Shift timestamp by +8h and read UTC day.
  const manilaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayNames[manilaTime.getUTCDay()];
}

function getXpToNextLevel(totalXP: number): number {
  const currentLevel = computeLevel(totalXP);
  let cumulative = 0;
  for (let i = 1; i <= currentLevel; i++) {
    cumulative += Math.floor(100 * Math.pow(1.5, i - 1));
  }
  return Math.max(0, cumulative - totalXP);
}

function FlameIcon({ size = 24, color = '#ef4444' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C15.866 22 19 18.866 19 15C19 12.5 17.5 10.5 16 9C16.5 10 17 11.5 17 13C17 16.3137 14.7614 19 12 19C9.23858 19 7 16.3137 7 13C7 11.5 7.5 10 8 9C6.5 10.5 5 12.5 5 15C5 18.866 8.13401 22 12 22Z"
        fill={color}
      />
    </Svg>
  );
}

function WeeklyXPChart({ data }: { data: Record<string, number> }) {
  const maxXP = Math.max(...DAYS.map((d) => data[d] || 0), 1);
  return (
    <View className="flex-row items-end justify-between h-40 mt-2 px-2">
      {DAYS.map((day) => {
        const value = data[day] || 0;
        const heightPercent = (value / maxXP) * 100;
        return (
          <View key={day} className="flex-1 items-center mx-1">
            <View
              className="w-full bg-primary rounded-t-md"
              style={{ height: `${Math.max(heightPercent, 4)}%` }}
            />
            <Text className="text-muted-foreground text-xs mt-2">{day}</Text>
            <Text className="text-foreground text-xs font-semibold mt-0.5">{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ProgressScreen() {
  const user = useAuthStore((s) => s.user);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [weeklyXP, setWeeklyXP] = useState<Record<string, number> | null>(null);
  const [hasActivities, setHasActivities] = useState(false);
  const [gamification, setGamification] = useState<{ totalXP: number; level: number; xpToNext: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      if (!user) return;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const [progressData, activities] = await Promise.all([
        getStudentProgress(user.uid, token),
        getXPActivities(user.uid, 100, 7),
      ]);

      await useGamificationStore.getState().loadUserData(user.uid);
      const store = useGamificationStore.getState();

      setProgress(progressData);
      setWeeklyXP(aggregateByDay(activities));
      setHasActivities(activities.length > 0);
      setGamification({
        totalXP: store.xp,
        level: store.level,
        xpToNext: getXpToNextLevel(store.xp),
      });
    } catch (err) {
      // handle silently — Skeleton stays visible on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProgress();
  }, [fetchProgress]);

  if (loading && !progress) {
    return (
      <View className="flex-1 bg-background p-4 pt-12">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-16 w-full mb-4 rounded-2xl" />
        <Skeleton className="h-40 w-full mb-4 rounded-2xl" />
        <Skeleton className="h-20 w-full mb-4 rounded-2xl" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-6 rounded-full" />
        <Skeleton className="h-16 w-full mb-4 rounded-2xl" />
        <Skeleton className="h-16 w-full mb-4 rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </View>
    );
  }

  const p = progress;

  return (
    <ScrollView
      className="flex-1 bg-background p-4 pt-12"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text variant="h2" className="text-foreground mb-6">
        Your Progress
      </Text>

      {/* Gamification Stats */}
      <Card className="mb-4 p-4">
        <View className="flex-row justify-between items-center">
          <View className="items-center flex-1">
            <Text className="text-foreground text-2xl font-bold">
              {gamification?.totalXP ?? 0}
            </Text>
            <Text className="text-muted-foreground text-xs mt-1">Total XP</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-foreground text-2xl font-bold">
              {gamification?.level ?? 1}
            </Text>
            <Text className="text-muted-foreground text-xs mt-1">Level</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-foreground text-2xl font-bold">
              {gamification?.xpToNext ?? 100}
            </Text>
            <Text className="text-muted-foreground text-xs mt-1">To Next</Text>
          </View>
        </View>
      </Card>

      {/* Weekly XP Chart */}
      <Card className="mb-4 p-4">
        <Text className="text-foreground text-sm font-semibold mb-2">
          Weekly XP
        </Text>
        {hasActivities && weeklyXP ? (
          <WeeklyXPChart data={weeklyXP} />
        ) : (
          <View className="h-40 justify-center items-center">
            <Text className="text-muted-foreground text-center">
              Complete lessons to see your progress
            </Text>
          </View>
        )}
      </Card>

      {/* Streak */}
      {p?.streak && (
        <Card className="mb-6 p-4 flex-row items-center">
          <FlameIcon size={40} color="#ef4444" />
          <View className="ml-4">
            <Text className="text-foreground text-3xl font-bold">
              {p.streak.current}
            </Text>
            <Text className="text-muted-foreground text-sm">day streak</Text>
            <Text className="text-muted-foreground text-xs mt-1">
              Longest: {p.streak.best}
            </Text>
          </View>
        </Card>
      )}

      {/* Overall mastery */}
      <View className="mb-6">
        <Text className="text-foreground text-sm mb-2">
          Overall Mastery — {p?.overallMasteryPercent ?? 0}%
        </Text>
        <Progress
          value={p?.overallMasteryPercent ?? 0}
          className="h-3"
        />
      </View>

      {/* Weekly XP Goal */}
      {p?.weeklyGoal && (
        <Card className="mb-4 p-4">
          <Text className="text-foreground text-sm mb-1">Weekly Goal</Text>
          <Text className="text-muted-foreground text-2xl font-bold">
            {p.weeklyGoal.currentXP} / {p.weeklyGoal.targetXP} XP
          </Text>
          <Progress
            value={
              p.weeklyGoal.targetXP > 0
                ? (p.weeklyGoal.currentXP / p.weeklyGoal.targetXP) * 100
                : 0
            }
            className="h-2 mt-2"
          />
        </Card>
      )}

      {/* Subject breakdown */}
      <Text variant="h3" className="text-foreground text-lg mb-4">
        Subjects
      </Text>

      {p?.subjectBreakdown?.map((subject: SubjectBreakdown) => (
        <Card key={subject.subjectId} className="mb-3 p-4 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-foreground text-sm font-semibold">
              {subject.subjectName}
            </Text>
            <Progress
              value={subject.masteryPercent}
              className="h-2 mt-2"
            />
            <Text className="text-muted-foreground text-xs mt-1">
              {subject.masteryPercent}% mastery
            </Text>
          </View>
          <Badge
            variant={subject.status === "On Track" ? "success" : "warning"}
          >
            {subject.status}
          </Badge>
        </Card>
      ))}
    </ScrollView>
  );
}
