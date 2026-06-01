import React, { useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Progress } from '../../components/ui/Progress';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { getLevelProgress } from '../../services/gamificationService';

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const studentProfile = useAuthStore((s) => s.studentProfile);
  const uid = user?.uid ?? null;

  const xp = useGamificationStore((s) => s.xp);
  const currentXP = useGamificationStore((s) => s.currentXP);
  const level = useGamificationStore((s) => s.level);
  const dailyStreak = useGamificationStore((s) => s.dailyStreak);
  const longestStreak = useGamificationStore((s) => s.longestStreak);
  const streakShields = useGamificationStore((s) => s.streakShields);
  const lastTopicId = useGamificationStore((s) => s.lastTopicId);
  const achievements = useGamificationStore((s) => s.achievements);
  const isLoading = useGamificationStore((s) => s.isLoading);
  const loadUserData = useGamificationStore((s) => s.loadUserData);
  const loadUserAchievements = useGamificationStore((s) => s.loadUserAchievements);
  const resetError = useGamificationStore((s) => s.resetError);
  const storeError = useGamificationStore((s) => s.error);

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (!uid) return;
    loadUserData(uid);
    loadUserAchievements(uid);
  }, [uid, loadUserData, loadUserAchievements]);

  const onRefresh = useCallback(() => {
    if (!uid) return;
    setRefreshing(true);
    Promise.all([loadUserData(uid), loadUserAchievements(uid)]).finally(() => {
      setRefreshing(false);
    });
  }, [uid, loadUserData, loadUserAchievements]);

  const firstName =
    studentProfile?.name?.split(' ')[0] ??
    user?.name?.split(' ')[0] ??
    'Student';

  const progress = getLevelProgress(xp);
  const xpInLevel = progress.xpInLevel;
  const xpToNext = progress.xpToNext;
  const nextLevelThreshold = progress.nextThreshold - progress.prevThreshold;

  const handleContinueLearning = () => {
    if (lastTopicId) {
      router.push(`/student/quiz/${lastTopicId}`);
    } else {
      router.push('/quiz');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#a78bfa"
        />
      }
    >
      {/* Greeting */}
      <View className="px-5 pt-8 pb-4">
        {isLoading ? (
          <>
            <Skeleton className="w-32 h-4 rounded-md mb-2" />
            <Skeleton className="w-48 h-8 rounded-md" />
          </>
        ) : (
          <>
            <Text className="text-muted-foreground text-sm">Welcome back,</Text>
            <Text variant="h1" className="text-foreground">
              {firstName}
            </Text>
          </>
        )}
      </View>

      {/* Stats row */}
      <View className="flex-row px-4 gap-3 mb-4">
        <Card className="flex-1 p-4 bg-indigo-500/10 border border-indigo-500/30">
          <Text className="text-indigo-300 text-xs mb-1">Level</Text>
          {isLoading ? (
            <Skeleton className="w-12 h-8 rounded-md" />
          ) : (
            <Text className="text-foreground text-2xl font-bold">{level}</Text>
          )}
        </Card>
        <Card className="flex-1 p-4 bg-amber-500/10 border border-amber-500/30">
          <Text className="text-amber-300 text-xs mb-1">Total XP</Text>
          {isLoading ? (
            <Skeleton className="w-16 h-8 rounded-md" />
          ) : (
            <Text className="text-foreground text-2xl font-bold">{xp}</Text>
          )}
        </Card>
        <Card className="flex-1 p-4 bg-orange-500/10 border border-orange-500/30">
          <Text className="text-orange-300 text-xs mb-1">Streak</Text>
          {isLoading ? (
            <Skeleton className="w-12 h-8 rounded-md" />
          ) : (
            <Text className="text-foreground text-2xl font-bold">
              {dailyStreak}
            </Text>
          )}
        </Card>
      </View>

      {/* Level progress */}
      <View className="px-4 mb-6">
        <Card className="p-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-foreground text-sm font-semibold">
              Level {level} Progress
            </Text>
            {isLoading ? (
              <Skeleton className="w-24 h-4 rounded-md" />
            ) : (
              <Text className="text-muted-foreground text-xs">
                {xpInLevel} / {nextLevelThreshold} XP
              </Text>
            )}
          </View>
          {isLoading ? (
            <Skeleton className="w-full h-2 rounded-full" />
          ) : (
            <Progress
              value={xpInLevel}
              max={nextLevelThreshold}
              className="h-2"
            />
          )}
          {isLoading ? (
            <Skeleton className="w-32 h-3 rounded-md mt-2" />
          ) : (
            <Text className="text-muted-foreground text-xs mt-2">
              {xpToNext} XP to level {level + 1}
            </Text>
          )}
        </Card>
      </View>

      {/* Streak detail card */}
      <View className="px-4 mb-6">
        <Card className="p-4 bg-orange-500/5 border border-orange-500/20">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-foreground text-sm font-semibold">
              Daily Streak
            </Text>
            {isLoading ? (
              <Skeleton className="w-12 h-6 rounded-md" />
            ) : (
              <Text className="text-orange-400 text-sm font-bold">
                {dailyStreak} days
              </Text>
            )}
          </View>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-muted-foreground text-xs">Longest</Text>
              {isLoading ? (
                <Skeleton className="w-10 h-5 rounded-md mt-1" />
              ) : (
                <Text className="text-foreground text-sm font-semibold">
                  {longestStreak} days
                </Text>
              )}
            </View>
            <View>
              <Text className="text-muted-foreground text-xs">Shields</Text>
              {isLoading ? (
                <Skeleton className="w-10 h-5 rounded-md mt-1" />
              ) : (
                <Text className="text-foreground text-sm font-semibold">
                  {streakShields}
                </Text>
              )}
            </View>
          </View>
        </Card>
      </View>

      {/* Continue Learning CTA */}
      <View className="px-4 mb-6">
        <TouchableOpacity
          onPress={handleContinueLearning}
          activeOpacity={0.8}
          accessibilityLabel="Continue learning"
        >
          <Card className="p-4 bg-primary/10 border border-primary/30">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-primary text-xs font-semibold uppercase tracking-wide">
                  Continue Learning
                </Text>
                <Text className="text-foreground text-sm mt-1">
                  {lastTopicId
                    ? 'Resume where you left off'
                    : 'Start your next lesson'}
                </Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
                <Text className="text-primary text-lg font-bold">{'>'}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">
          Quick Actions
        </Text>
        <View className="gap-3">
          <Button
            onPress={() => router.push('/quiz')}
            accessibilityLabel="Start a Quiz"
          >
            Start a Quiz
          </Button>
          <Button
            variant="outline"
            onPress={() => router.push('/chat')}
            accessibilityLabel="Ask AI Tutor"
          >
            Ask AI Tutor
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.push('/progress')}
            accessibilityLabel="View Progress"
          >
            View Progress
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.push('/check-in')}
            accessibilityLabel="Daily Check-in"
          >
            Daily Check-in
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.push('/grades')}
            accessibilityLabel="Grade Report"
          >
            Grade Report
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.push('/calculator')}
            accessibilityLabel="Calculator"
          >
            Calculator
          </Button>
        </View>
      </View>

      {/* Achievements */}
      <View className="px-4">
        <Text variant="h3" className="text-foreground mb-3">
          Achievements
        </Text>
        {isLoading ? (
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} className="w-[31%] mb-2">
                <Skeleton className="w-full h-24 rounded-lg" />
              </View>
            ))}
          </View>
        ) : achievements.length === 0 ? (
          <Card className="p-6 items-center">
            <Text className="text-muted-foreground text-sm text-center">
              Complete lessons and quizzes to earn achievements
            </Text>
          </Card>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {achievements.slice(0, 6).map((a) => (
              <Card
                key={a.id}
                className="w-[31%] p-3 items-center justify-center"
              >
                <View className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center mb-2">
                  <Text className="text-amber-400 text-lg font-bold">
                    {a.icon?.charAt(0)?.toUpperCase() ?? 'A'}
                  </Text>
                </View>
                <Text
                  className="text-foreground text-xs font-semibold text-center"
                  numberOfLines={1}
                >
                  {a.title}
                </Text>
                <Text className="text-amber-400 text-xs mt-1">
                  +{a.xpReward} XP
                </Text>
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* Error banner */}
      {storeError && (
        <View className="px-4 mt-4">
          <Card className="p-3 bg-red-500/10 border border-red-500/30">
            <Text className="text-red-400 text-sm">{storeError}</Text>
            <Button
              variant="ghost"
              className="mt-2"
              onPress={resetError}
            >
              Dismiss
            </Button>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
