import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { getSystemAlerts, type SystemAlert } from '../../services/adminService';

const MOCK: SystemAlert[] = [
  { id: 'a1', level: 'critical', service: 'API Gateway', message: 'Elevated 5xx rate on /api/chat (3.2% over 10 min)', timestamp: '2026-06-01T15:42:00Z', resolved: false },
  { id: 'a2', level: 'warning', service: 'DeepSeek API', message: 'Token usage at 78% of daily budget', timestamp: '2026-06-01T15:30:00Z', resolved: false },
  { id: 'a3', level: 'info', service: 'Firebase Auth', message: 'New device sign-in for admin@mathpulse.ai from Manila, PH', timestamp: '2026-06-01T14:12:00Z', resolved: true },
  { id: 'a4', level: 'warning', service: 'Quiz Service', message: 'Average response time 1.2s (SLO: 800ms)', timestamp: '2026-06-01T13:55:00Z', resolved: false },
  { id: 'a5', level: 'info', service: 'Daily Rewards', message: '1,247 students claimed today\'s reward', timestamp: '2026-06-01T08:00:00Z', resolved: true },
  { id: 'a6', level: 'critical', service: 'Realtime DB', message: 'Connection spike during Quiz Battle event (8,200 concurrent)', timestamp: '2026-05-31T19:20:00Z', resolved: true },
];

const LEVEL_VARIANT: Record<string, 'destructive' | 'warning' | 'default'> = {
  critical: 'destructive',
  warning: 'warning',
  info: 'default',
};

const LEVEL_ICON: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

type Filter = 'all' | 'active' | 'resolved';

export default function AdminAlertsScreen() {
  const adminProfile = useAuthStore((s) => s.adminProfile);
  const [alerts, setAlerts] = useState<SystemAlert[]>(MOCK);
  const [filter, setFilter] = useState<Filter>('active');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getSystemAlerts(token).catch(() => null);
      if (data) setAlerts(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => (filter === 'active' ? !a.resolved : a.resolved));
  const counts = {
    all: alerts.length,
    active: alerts.filter((a) => !a.resolved).length,
    resolved: alerts.filter((a) => a.resolved).length,
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-3">
        <Text className="text-muted-foreground text-sm">
          {counts.active} active alerts
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-3" contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {(['active', 'resolved', 'all'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full ${filter === f ? 'bg-primary' : 'bg-surface border border-border'}`}
          >
            <Text className={`text-xs font-semibold capitalize ${filter === f ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              {f} ({counts[f]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
      >
        <View className="gap-2">
          {filtered.map((alert) => (
            <Card key={alert.id} className={`p-3 ${alert.resolved ? 'opacity-60' : ''}`}>
              <View className="flex-row items-start">
                <Text className="text-lg mr-2">{LEVEL_ICON[alert.level]}</Text>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-foreground text-sm font-semibold">{alert.service}</Text>
                    <Badge variant={LEVEL_VARIANT[alert.level]}>{alert.level}</Badge>
                    {alert.resolved && <Badge variant="secondary">resolved</Badge>}
                  </View>
                  <Text className="text-muted-foreground text-xs">{alert.message}</Text>
                  <Text className="text-muted-foreground text-[10px] mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
          {filtered.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-muted-foreground text-sm">No alerts in this view</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
