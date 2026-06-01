import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { getAtRiskStudents, type AtRiskStudent } from '../../services/teacherService';

const RISK_VARIANT: Record<string, 'destructive' | 'warning' | 'success'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'success',
};

const TREND_LABEL: Record<string, string> = {
  declining: 'Declining',
  stable: 'Stable',
  improving: 'Improving',
};

export default function AtRiskScreen() {
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [filter, setFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!teacherProfile) return;
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getAtRiskStudents(teacherProfile.uid, token);
      setStudents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load at-risk students';
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

  const filtered = filter === 'all' ? students : students.filter((s) => s.overallRisk === filter);
  const counts = {
    all: students.length,
    High: students.filter((s) => s.overallRisk === 'High').length,
    Medium: students.filter((s) => s.overallRisk === 'Medium').length,
    Low: students.filter((s) => s.overallRisk === 'Low').length,
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-muted-foreground text-sm mt-3">Loading at-risk students...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-3">
        <Text className="text-muted-foreground text-sm">
          {counts.High} high-risk students need immediate attention
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-3" contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {(['all', 'High', 'Medium', 'Low'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full ${filter === f ? 'bg-primary' : 'bg-surface border border-border'}`}
          >
            <Text className={`text-xs font-semibold ${filter === f ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              {f === 'all' ? 'All' : f} ({counts[f]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {error && (
          <View className="mb-4">
            <Card className="p-3 bg-error/10 border border-error/30">
              <Text className="text-error text-sm">{error}</Text>
            </Card>
          </View>
        )}

        <View className="gap-3">
          {filtered.map((s) => (
            <TouchableOpacity key={s.uid} onPress={() => router.push(`/student/${s.uid}`)}>
              <Card className="p-4">
                <View className="flex-row items-center mb-3">
                  <Avatar fallback={s.name} size="md" className="mr-3" />
                  <View className="flex-1">
                    <Text className="text-foreground text-sm font-semibold">{s.name}</Text>
                    <Text className="text-muted-foreground text-xs">
                      Grade {s.grade} - Sec {s.section} - Avg {s.averageScore}%
                    </Text>
                  </View>
                  <Badge variant={RISK_VARIANT[s.overallRisk]}>
                    {s.overallRisk}
                  </Badge>
                </View>

                <View className="bg-surface/50 rounded-xl p-3 mb-2">
                  <Text className="text-foreground text-xs mb-1">{s.reason}</Text>
                  <View className="flex-row flex-wrap gap-1 mt-2">
                    {s.atRiskSubjects.map((subj) => (
                      <View key={subj} className="bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
                        <Text className="text-red-300 text-[10px]">{subj}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground text-xs">
                    Last active: {new Date(s.lastActive).toLocaleDateString()}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {TREND_LABEL[s.trend] || s.trend}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-muted-foreground text-sm">No students in this risk tier</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
