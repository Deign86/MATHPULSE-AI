import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { getSystemStats, type SystemStats } from '../../services/adminService';

const DEFAULT_STATS: SystemStats = {
  totalUsers: 0,
  totalStudents: 0,
  totalTeachers: 0,
  totalAdmins: 0,
  activeUsers24h: 0,
  activeUsers7d: 0,
  totalQuizzes: 0,
  totalLessons: 0,
  totalChatSessions: 0,
  averageScore: 0,
  systemHealth: 'healthy',
  uptimePercent: 0,
};

const HEALTH_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'destructive',
};

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<SystemStats>(DEFAULT_STATS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getSystemStats(token).catch(() => null);
      if (data) setStats(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
    >
      <View className="px-5 pt-8 pb-4">
        <Text className="text-muted-foreground text-sm">Admin Console</Text>
        <Text variant="h1" className="text-foreground">{user?.name ?? 'Admin'}</Text>
      </View>

      {/* System health */}
      <View className="px-4 mb-4">
        <Card className="p-4 flex-row items-center justify-between">
          <View>
            <Text className="text-muted-foreground text-xs mb-1">System Health</Text>
            <Text className="text-foreground text-xl font-bold capitalize">{stats.systemHealth}</Text>
            <Text className="text-muted-foreground text-xs mt-0.5">
              Uptime {stats.uptimePercent}%
            </Text>
          </View>
          <Badge variant={HEALTH_VARIANT[stats.systemHealth]}>
            ● {stats.systemHealth.toUpperCase()}
          </Badge>
        </Card>
      </View>

      {/* User stats */}
      <View className="px-4 mb-3">
        <Text variant="h3" className="text-foreground mb-3">Users</Text>
      </View>
      <View className="flex-row px-4 gap-3 mb-3">
        <Card className="flex-1 p-4 bg-amber-500/10 border border-amber-500/30">
          <Text className="text-amber-300 text-xs mb-1">Total</Text>
          <Text className="text-foreground text-2xl font-bold">{stats.totalUsers.toLocaleString()}</Text>
        </Card>
        <Card className="flex-1 p-4 bg-emerald-500/10 border border-emerald-500/30">
          <Text className="text-emerald-300 text-xs mb-1">Active 24h</Text>
          <Text className="text-foreground text-2xl font-bold">{stats.activeUsers24h.toLocaleString()}</Text>
        </Card>
      </View>
      <View className="flex-row px-4 gap-3 mb-6">
        <Card className="flex-1 p-3">
          <Text className="text-muted-foreground text-xs">Students</Text>
          <Text className="text-foreground text-lg font-bold">{stats.totalStudents.toLocaleString()}</Text>
        </Card>
        <Card className="flex-1 p-3">
          <Text className="text-muted-foreground text-xs">Teachers</Text>
          <Text className="text-foreground text-lg font-bold">{stats.totalTeachers.toLocaleString()}</Text>
        </Card>
        <Card className="flex-1 p-3">
          <Text className="text-muted-foreground text-xs">Admins</Text>
          <Text className="text-foreground text-lg font-bold">{stats.totalAdmins.toLocaleString()}</Text>
        </Card>
      </View>

      {/* Content stats */}
      <View className="px-4 mb-3">
        <Text variant="h3" className="text-foreground mb-3">Content & Activity</Text>
      </View>
      <View className="flex-row px-4 gap-3 mb-3">
        <Card className="flex-1 p-3">
          <Text className="text-muted-foreground text-xs">Quizzes</Text>
          <Text className="text-foreground text-lg font-bold">{stats.totalQuizzes}</Text>
        </Card>
        <Card className="flex-1 p-3">
          <Text className="text-muted-foreground text-xs">Lessons</Text>
          <Text className="text-foreground text-lg font-bold">{stats.totalLessons}</Text>
        </Card>
      </View>
      <View className="flex-row px-4 gap-3 mb-6">
        <Card className="flex-1 p-3">
          <Text className="text-muted-foreground text-xs">Chat Sessions</Text>
          <Text className="text-foreground text-lg font-bold">{stats.totalChatSessions.toLocaleString()}</Text>
        </Card>
        <Card className="flex-1 p-3">
          <Text className="text-muted-foreground text-xs">Avg Score</Text>
          <Text className="text-foreground text-lg font-bold">{stats.averageScore}%</Text>
        </Card>
      </View>

      {/* Quick actions */}
      <View className="px-4">
        <Text variant="h3" className="text-foreground mb-3">Quick Actions</Text>
        <View className="gap-3">
          <Card className="p-4">
            <TouchableOpacity onPress={() => router.push('/users')}>
              <Text className="text-foreground text-sm font-semibold mb-1">Manage Users</Text>
              <Text className="text-muted-foreground text-xs">View, suspend, or update user accounts</Text>
            </TouchableOpacity>
          </Card>
          <Card className="p-4">
            <TouchableOpacity onPress={() => router.push('/models')}>
              <Text className="text-foreground text-sm font-semibold mb-1">AI Model Config</Text>
              <Text className="text-muted-foreground text-xs">Enable, disable, or tune model providers</Text>
            </TouchableOpacity>
          </Card>
          <Card className="p-4">
            <TouchableOpacity onPress={() => router.push('/alerts')}>
              <Text className="text-foreground text-sm font-semibold mb-1">System Alerts</Text>
              <Text className="text-muted-foreground text-xs">Active warnings and incidents</Text>
            </TouchableOpacity>
          </Card>
          <Card className="p-4">
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <Text className="text-foreground text-sm font-semibold mb-1">My Profile</Text>
              <Text className="text-muted-foreground text-xs">View account info and sign out</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}
