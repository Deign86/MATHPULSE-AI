import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import {
  getAtRiskStudents,
  type AtRiskStudent,
} from '../../services/teacherService';

const RISK_VARIANT: Record<string, 'destructive' | 'warning' | 'success'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'success',
};

export default function StudentsScreen() {
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [search, setSearch] = useState('');
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
      const message = err instanceof Error ? err.message : 'Failed to load students';
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [search, students]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-muted-foreground text-sm mt-3">Loading students...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Search */}
      <View className="px-4 pt-4 pb-3">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search students..."
          placeholderTextColor="#6b7280"
          className="bg-surface border border-border rounded-full px-4 py-2.5 text-foreground text-sm"
        />
      </View>

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

        <View className="gap-2">
          {filtered.map((s) => (
            <TouchableOpacity
              key={s.uid}
              onPress={() => router.push(`/student/${s.uid}`)}
              accessibilityRole="link"
              accessibilityLabel={`View ${s.name}, section ${s.section}, average ${s.averageScore} percent, status ${s.overallRisk}`}
            >
              <Card className="p-3 flex-row items-center">
                <Avatar fallback={s.name} size="md" className="mr-3" />
                <View className="flex-1">
                  <Text className="text-foreground text-sm font-semibold">{s.name}</Text>
                  <Text className="text-muted-foreground text-xs mt-0.5">
                    Sec {s.section} · Avg {s.averageScore}%
                  </Text>
                </View>
                <Badge variant={RISK_VARIANT[s.overallRisk]}>
                  {s.overallRisk}
                </Badge>
              </Card>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-muted-foreground text-sm">No students found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
