import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Progress } from '../../components/ui/Progress';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGamificationStore } from '../../stores/useGamificationStore';

const XP_PER_LEVEL = 100;

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const studentProfile = useAuthStore((s) => s.studentProfile);
  const xp = useGamificationStore((s) => s.xp);
  const level = useGamificationStore((s) => s.level);
  const dailyStreak = useGamificationStore((s) => s.dailyStreak);
  const achievements = useGamificationStore((s) => s.achievements);
  const [refreshing, setRefreshing] = React.useState(false);

  const xpInLevel = xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - xpInLevel;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Real gamification fetch wires up when backend ready
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const firstName = studentProfile?.name?.split(' ')[0] ?? user?.name?.split(' ')[0] ?? 'Student';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />
      }
    >
      {/* Greeting */}
      <View className="px-5 pt-8 pb-4">
        <Text className="text-muted-foreground text-sm">Welcome back,</Text>
        <Text variant="h1" className="text-foreground">{firstName} 👋</Text>
      </View>

      {/* Stats row */}
      <View className="flex-row px-4 gap-3 mb-4">
        <Card className="flex-1 p-4 bg-indigo-500/10 border border-indigo-500/30">
          <Text className="text-indigo-300 text-xs mb-1">Level</Text>
          <Text className="text-foreground text-2xl font-bold">{level}</Text>
        </Card>
        <Card className="flex-1 p-4 bg-amber-500/10 border border-amber-500/30">
          <Text className="text-amber-300 text-xs mb-1">Total XP</Text>
          <Text className="text-foreground text-2xl font-bold">{xp}</Text>
        </Card>
        <Card className="flex-1 p-4 bg-orange-500/10 border border-orange-500/30">
          <Text className="text-orange-300 text-xs mb-1">Streak</Text>
          <Text className="text-foreground text-2xl font-bold">🔥 {dailyStreak}</Text>
        </Card>
      </View>

      {/* Level progress */}
      <View className="px-4 mb-6">
        <Card className="p-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-foreground text-sm font-semibold">Level {level} Progress</Text>
            <Text className="text-muted-foreground text-xs">
              {xpInLevel} / {XP_PER_LEVEL} XP
            </Text>
          </View>
          <Progress value={xpInLevel} className="h-2" />
          <Text className="text-muted-foreground text-xs mt-2">
            {xpToNext} XP to level {level + 1}
          </Text>
        </Card>
      </View>

      {/* Quick actions */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Quick Actions</Text>
        <View className="gap-3">
          <Button onPress={() => router.push('/quiz')} accessibilityLabel="Start a Quiz">
            🎯 Start a Quiz
          </Button>
          <Button variant="outline" onPress={() => router.push('/chat')} accessibilityLabel="Ask AI Tutor">
            💬 Ask AI Tutor
          </Button>
          <Button variant="ghost" onPress={() => router.push('/progress')} accessibilityLabel="View Progress">
            📊 View Progress
          </Button>
          <Button variant="ghost" onPress={() => router.push('/check-in')} accessibilityLabel="Daily Check-in">
            ✅ Daily Check-in
          </Button>
          <Button variant="ghost" onPress={() => router.push('/grades')} accessibilityLabel="Grade Report">
            🎓 Grade Report
          </Button>
          <Button variant="ghost" onPress={() => router.push('/calculator')} accessibilityLabel="Calculator">
            🧮 Calculator
          </Button>
        </View>
      </View>

      {/* Achievements */}
      <View className="px-4">
        <Text variant="h3" className="text-foreground mb-3">Recent Achievements</Text>
        {achievements.length === 0 ? (
          <Card className="p-6 items-center">
            <Text className="text-muted-foreground text-sm">
              Complete lessons and quizzes to earn achievements
            </Text>
          </Card>
        ) : (
          <View className="gap-2">
            {achievements.slice(0, 3).map((a) => (
              <Card key={a.id} className="p-3 flex-row items-center">
                <Text className="text-2xl mr-3">{a.icon}</Text>
                <View className="flex-1">
                  <Text className="text-foreground text-sm font-semibold">{a.title}</Text>
                  <Text className="text-muted-foreground text-xs">{a.description}</Text>
                </View>
                <Text className="text-amber-400 text-sm">+{a.xpReward} XP</Text>
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
