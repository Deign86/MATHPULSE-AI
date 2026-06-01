import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import {
  getTeacherClasses,
  getAtRiskStudents,
  getTeachingTasks,
  type ClassGroup,
  type AtRiskStudent,
  type TeachingTask,
} from '../../services/teacherService';

const RISK_COLORS: Record<string, string> = {
  High: 'bg-red-500/15 border-red-500/40',
  Medium: 'bg-amber-500/15 border-amber-500/40',
  Low: 'bg-emerald-500/15 border-emerald-500/40',
};

export default function TeacherDashboard() {
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const user = useAuthStore((s) => s.user);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [tasks, setTasks] = useState<TeachingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = teacherProfile?.name?.split(' ')[0] ?? user?.name?.split(' ')[0] ?? 'Teacher';

  const fetchData = useCallback(async () => {
    if (!teacherProfile) return;
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const [c, r, t] = await Promise.all([
        getTeacherClasses(teacherProfile.uid, token).catch(() => null),
        getAtRiskStudents(teacherProfile.uid, token).catch(() => null),
        getTeachingTasks(teacherProfile.uid).catch(() => null),
      ]);
      if (c) setClasses(c);
      if (r) setAtRisk(r);
      if (t) setTasks(t);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    }
  }, [teacherProfile]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const highRiskCount = atRisk.filter((s) => s.overallRisk === 'High').length;
  const activeTasks = tasks.filter((t) => t.status === 'published').length;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-muted-foreground text-sm mt-3">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <View className="px-5 pt-8 pb-4">
        <Text className="text-muted-foreground text-sm">Welcome,</Text>
        <Text variant="h1" className="text-foreground">Teacher {firstName}</Text>
      </View>

      {error && (
        <View className="px-4 mb-4">
          <Card className="p-3 bg-error/10 border border-error/30">
            <Text className="text-error text-sm">{error}</Text>
          </Card>
        </View>
      )}

      {/* Stats */}
      <View className="flex-row px-4 gap-3 mb-4">
        <Card className="flex-1 p-4 bg-emerald-500/10 border border-emerald-500/30">
          <Text className="text-emerald-300 text-xs mb-1">Classes</Text>
          <Text className="text-foreground text-2xl font-bold">{classes.length}</Text>
        </Card>
        <Card className="flex-1 p-4 bg-blue-500/10 border border-blue-500/30">
          <Text className="text-blue-300 text-xs mb-1">Students</Text>
          <Text className="text-foreground text-2xl font-bold">{totalStudents}</Text>
        </Card>
      </View>
      <View className="flex-row px-4 gap-3 mb-6">
        <Card className="flex-1 p-4 bg-red-500/10 border border-red-500/30">
          <Text className="text-red-300 text-xs mb-1">At-Risk</Text>
          <Text className="text-foreground text-2xl font-bold">{highRiskCount}</Text>
        </Card>
        <Card className="flex-1 p-4 bg-violet-500/10 border border-violet-500/30">
          <Text className="text-violet-300 text-xs mb-1">Active Tasks</Text>
          <Text className="text-foreground text-2xl font-bold">{activeTasks}</Text>
        </Card>
      </View>

      {/* Quick actions */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Quick Actions</Text>
        <View className="gap-3">
          <Button onPress={() => router.push('/students')}>
            View All Students
          </Button>
          <Button variant="outline" onPress={() => router.push('/at-risk')}>
            At-Risk Students ({highRiskCount})
          </Button>
          <Button variant="ghost" onPress={() => router.push('/tasks')}>
            Manage Tasks
          </Button>
          <Button variant="ghost" onPress={() => router.push('/profile')}>
            My Profile
          </Button>
        </View>
      </View>

      {/* Classes */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Your Classes</Text>
        {classes.length === 0 ? (
          <Card className="p-4">
            <Text className="text-muted-foreground text-center">No classes assigned yet.</Text>
          </Card>
        ) : (
          <View className="gap-2">
            {classes.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => router.push(`/students?class=${c.id}`)}
              >
                <Card className="p-4 flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-emerald-500/15 items-center justify-center mr-3">
                    <Text className="text-emerald-300 font-bold">{c.section}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-sm font-semibold">{c.name}</Text>
                    <Text className="text-muted-foreground text-xs">
                      {c.subject} - Grade {c.grade}
                    </Text>
                  </View>
                  <Badge variant="secondary">{c.studentCount}</Badge>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Recent at-risk */}
      {atRisk.length > 0 && (
        <View className="px-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text variant="h3" className="text-foreground">Needs Attention</Text>
            <TouchableOpacity onPress={() => router.push('/at-risk')}>
              <Text className="text-primary text-xs">See all</Text>
            </TouchableOpacity>
          </View>
          <View className="gap-2">
            {atRisk.slice(0, 3).map((s) => (
              <Card key={s.uid} className={`p-3 border ${RISK_COLORS[s.overallRisk]}`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-foreground text-sm font-semibold">{s.name}</Text>
                    <Text className="text-muted-foreground text-xs mt-0.5">{s.reason}</Text>
                  </View>
                  <Badge variant={s.overallRisk === 'High' ? 'destructive' : 'warning'}>
                    {s.overallRisk}
                  </Badge>
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
