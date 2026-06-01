import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Progress } from '../../components/ui/Progress';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { getStudentProgress } from "../../services/progressService";
import { useAuthStore } from "../../stores/useAuthStore";
import { auth } from "../../lib/firebase";

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

export default function ProgressScreen() {
  const user = useAuthStore((s) => s.user);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      if (!user) return;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getStudentProgress(user.uid, token);
      setProgress(data);
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
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-6 rounded-full" />
        <Skeleton className="h-24 w-full mb-4 rounded-2xl" />
        <Skeleton className="h-20 w-full mb-4 rounded-2xl" />
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

      {/* Streak */}
      {p?.streak && (
        <Card className="mb-6 p-4">
          <Text className="text-foreground text-lg">
            🔥 {p.streak.current} day streak — Best: {p.streak.best}
          </Text>
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
