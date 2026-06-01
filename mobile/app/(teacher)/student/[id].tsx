import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Progress } from '../../../components/ui/Progress';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { getStudentRiskProfile } from '../../../services/riskService';
import { getUserAchievements } from '../../../services/gamificationService';
import {
  getStudentById,
  getStudentScores,
  getStudentFlaggedTopics,
} from '../../../services/studentDataService';
import type {
  StudentProfile,
  Achievement,
  StudentRiskProfile,
} from '../../../types/models';

function formatRiskLabel(status: string): string {
  switch (status) {
    case 'safe':
      return 'Safe';
    case 'watch':
      return 'Watch';
    case 'intervene':
      return 'Intervene';
    case 'critical':
      return 'Critical';
    case 'at_risk':
      return 'At Risk';
    default:
      return status;
  }
}

function riskBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' {
  switch (status) {
    case 'safe':
      return 'success';
    case 'watch':
      return 'warning';
    case 'intervene':
      return 'warning';
    case 'critical':
      return 'destructive';
    case 'at_risk':
      return 'destructive';
    default:
      return 'outline';
  }
}

function riskCardClasses(status: string): string {
  switch (status) {
    case 'safe':
      return 'bg-emerald-500/15 border-emerald-500/30';
    case 'watch':
      return 'bg-amber-500/15 border-amber-500/30';
    case 'intervene':
      return 'bg-orange-500/15 border-orange-500/30';
    case 'critical':
      return 'bg-red-500/15 border-red-500/30';
    case 'at_risk':
      return 'bg-red-500/15 border-red-500/30';
    default:
      return 'bg-muted border-border';
  }
}

function riskTextColor(status: string): string {
  switch (status) {
    case 'safe':
      return 'text-emerald-300';
    case 'watch':
      return 'text-amber-300';
    case 'intervene':
      return 'text-orange-300';
    case 'critical':
      return 'text-red-300';
    case 'at_risk':
      return 'text-red-300';
    default:
      return 'text-muted-foreground';
  }
}

function paceLabel(pace: string): string {
  switch (pace) {
    case 'support_intensive':
      return 'Intensive Support';
    case 'accelerated':
      return 'Accelerated';
    default:
      return 'Normal Pace';
  }
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Array.isArray(id) ? id[0] : id;

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [riskProfile, setRiskProfile] = useState<StudentRiskProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [scores, setScores] = useState<{ subject: string; score: number; status: string }[]>([]);
  const [flaggedTopics, setFlaggedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    try {
      const [p, rp, ach, sc, ft] = await Promise.all([
        getStudentById(studentId),
        getStudentRiskProfile(studentId),
        getUserAchievements(studentId),
        getStudentScores(studentId),
        getStudentFlaggedTopics(studentId),
      ]);
      setProfile(p);
      setRiskProfile(rp);
      setAchievements(ach);
      setScores(sc);
      setFlaggedTopics(ft);
    } catch (error) {
      console.error('[StudentDetailScreen] fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (!studentId) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-4">
        <Text variant="h3" className="text-foreground mb-2">
          Student ID required
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          Back to Students
        </Button>
      </View>
    );
  }

  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background">
        <View className="pb-10">
          {/* Header skeleton */}
          <View className="items-center pt-8 pb-6 gap-3">
            <Skeleton circle className="w-16 h-16" />
            <Skeleton className="w-40 h-6 rounded-md" />
            <Skeleton className="w-56 h-4 rounded-md" />
            <View className="flex-row gap-2 mt-2">
              <Skeleton className="w-24 h-6 rounded-full" />
              <Skeleton className="w-28 h-6 rounded-full" />
            </View>
          </View>

          {/* Stats skeleton */}
          <View className="flex-row px-4 gap-3 mb-4">
            <Card className="flex-1 p-4">
              <Skeleton className="w-16 h-3 rounded-md mb-2" />
              <Skeleton className="w-12 h-8 rounded-md" />
            </Card>
            <Card className="flex-1 p-4">
              <Skeleton className="w-16 h-3 rounded-md mb-2" />
              <Skeleton className="w-12 h-8 rounded-md" />
            </Card>
          </View>

          {/* XP card skeleton */}
          <View className="px-4 mb-4">
            <Card className="p-4 gap-3">
              <View className="flex-row justify-between">
                <Skeleton className="w-32 h-4 rounded-md" />
                <Skeleton className="w-20 h-4 rounded-md" />
              </View>
              <Skeleton className="w-full h-2 rounded-full" />
            </Card>
          </View>

          {/* Risk card skeleton */}
          <View className="px-4 mb-4">
            <Card className="p-4 gap-3">
              <Skeleton className="w-32 h-4 rounded-md" />
              <Skeleton className="w-full h-6 rounded-md" />
            </Card>
          </View>

          {/* Subject mastery skeleton */}
          <View className="px-4 mb-4">
            <Skeleton className="w-32 h-5 rounded-md mb-3" />
            <Card className="p-4 gap-3">
              <Skeleton className="w-full h-4 rounded-md" />
              <Skeleton className="w-full h-4 rounded-md" />
              <Skeleton className="w-full h-4 rounded-md" />
            </Card>
          </View>

          {/* Achievements skeleton */}
          <View className="px-4 mb-4">
            <Skeleton className="w-32 h-5 rounded-md mb-3" />
            <View className="gap-2">
              <Skeleton className="w-full h-12 rounded-md" />
              <Skeleton className="w-full h-12 rounded-md" />
            </View>
          </View>

          {/* Flagged topics skeleton */}
          <View className="px-4 mb-4">
            <Skeleton className="w-32 h-5 rounded-md mb-3" />
            <View className="flex-row flex-wrap gap-2">
              <Skeleton className="w-24 h-6 rounded-full" />
              <Skeleton className="w-28 h-6 rounded-full" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </View>
          </View>

          {/* Actions skeleton */}
          <View className="px-4 gap-3">
            <Skeleton className="w-full h-11 rounded-md" />
            <Skeleton className="w-full h-11 rounded-md" />
          </View>
        </View>
      </ScrollView>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-4">
        <Text variant="h3" className="text-foreground mb-2">
          Student not found
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          Back to Students
        </Button>
      </View>
    );
  }

  const averageTopicScore =
    profile.topicScores && Object.keys(profile.topicScores).length > 0
      ? Math.round(
          Object.values(profile.topicScores).reduce((sum, score) => sum + score, 0) /
            Object.values(profile.topicScores).length,
        )
      : null;

  const xpProgress = profile.totalXP > 0 ? (profile.currentXP / profile.totalXP) * 100 : 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
      }
    >
      <View className="pb-10">
        {/* Header */}
        <View className="items-center pt-8 pb-6">
          <Avatar src={profile.photo} fallback={profile.name} size="xl" className="mb-3" />
          <Text variant="h2" className="text-foreground">
            {profile.name}
          </Text>
          <Text className="text-muted-foreground text-sm mt-1">
            Grade {profile.grade ?? '—'} · Sec {profile.section ?? '—'}
            {profile.lrn ? ` · LRN ${profile.lrn}` : ''}
          </Text>
          <View className="flex-row gap-2 mt-3">
            {riskProfile?.riskStatus && (
              <Badge variant={riskBadgeVariant(riskProfile.riskStatus)}>
                {formatRiskLabel(riskProfile.riskStatus)}
              </Badge>
            )}
            {profile.recommendedPace && (
              <Badge variant="outline">{paceLabel(profile.recommendedPace)}</Badge>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row px-4 gap-3 mb-4">
          <Card className="flex-1 p-4 bg-blue-500/10 border border-blue-500/30">
            <Text className="text-blue-300 text-xs mb-1">Average Score</Text>
            <Text className="text-foreground text-2xl font-bold">
              {averageTopicScore !== null ? `${averageTopicScore}%` : '—'}
            </Text>
          </Card>
          <Card className="flex-1 p-4 bg-violet-500/10 border border-violet-500/30">
            <Text className="text-violet-300 text-xs mb-1">Level</Text>
            <Text className="text-foreground text-2xl font-bold">{profile.level}</Text>
          </Card>
        </View>

        {/* XP progress */}
        <View className="px-4 mb-4">
          <Card className="p-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-foreground text-sm font-semibold">
                Level {profile.level} Progress
              </Text>
              <Text className="text-muted-foreground text-xs">
                {profile.currentXP.toLocaleString()} / {profile.totalXP.toLocaleString()} XP
              </Text>
            </View>
            <Progress value={xpProgress} className="h-2" />
          </Card>
        </View>

        {/* Risk card */}
        {riskProfile?.riskStatus && (
          <View className="px-4 mb-4">
            <Card className={`p-4 ${riskCardClasses(riskProfile.riskStatus)}`}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className={`text-xs mb-1 ${riskTextColor(riskProfile.riskStatus)}`}>
                    Risk Status
                  </Text>
                  <Text className={`text-lg font-bold ${riskTextColor(riskProfile.riskStatus)}`}>
                    {formatRiskLabel(riskProfile.riskStatus)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className={`text-xs mb-1 ${riskTextColor(riskProfile.riskStatus)}`}>WRI</Text>
                  <Text className={`text-2xl font-bold ${riskTextColor(riskProfile.riskStatus)}`}>
                    {riskProfile.wri ?? '—'}
                  </Text>
                </View>
              </View>
              {riskProfile.riskHistory && riskProfile.riskHistory.length > 0 && (
                <Text className={`text-xs mt-2 opacity-70 ${riskTextColor(riskProfile.riskStatus)}`}>
                  Last updated:{' '}
                  {riskProfile.riskHistory[riskProfile.riskHistory.length - 1].computedAt
                    ? new Date(
                        riskProfile.riskHistory[riskProfile.riskHistory.length - 1].computedAt!,
                      ).toLocaleDateString()
                    : 'Unknown'}
                </Text>
              )}
            </Card>
          </View>
        )}

        {/* Subject Mastery / Scores */}
        {scores.length > 0 && (
          <View className="px-4 mb-4">
            <Text variant="h3" className="text-foreground mb-3">
              Subject Mastery
            </Text>
            <Card className="p-4">
              <View className="gap-3">
                {scores.map((score) => (
                  <View key={score.subject}>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-foreground text-sm">{score.subject}</Text>
                      <Text className="text-muted-foreground text-xs">{score.score}%</Text>
                    </View>
                    <Progress value={score.score} className="h-2" />
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-muted-foreground text-xs">
                        {score.status}
                      </Text>
                      <Badge variant={score.status === 'On Track' ? 'success' : 'destructive'}>
                        {score.status}
                      </Badge>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <View className="px-4 mb-4">
            <Text variant="h3" className="text-foreground mb-3">
              Achievements
            </Text>
            <View className="gap-2">
              {achievements.slice(0, 6).map((ach) => (
                <Card key={ach.id} className="p-3">
                  <Text className="text-foreground text-sm font-semibold">{ach.title}</Text>
                  <Text className="text-muted-foreground text-xs mt-1">{ach.description}</Text>
                  {ach.xpReward > 0 && (
                    <Text className="text-primary text-xs mt-1">+{ach.xpReward} XP</Text>
                  )}
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Flagged topics */}
        {flaggedTopics.length > 0 && (
          <View className="px-4 mb-4">
            <Text variant="h3" className="text-foreground mb-3">
              Flagged Topics
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {flaggedTopics.map((topic) => (
                <View
                  key={topic}
                  className="bg-red-500/15 border border-red-500/30 rounded-full px-3 py-1"
                >
                  <Text className="text-red-300 text-xs">{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="px-4 gap-3">
          <Button>Message Student</Button>
          <Button variant="outline" onPress={() => router.back()}>
            Back to Students
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
