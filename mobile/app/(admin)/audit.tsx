import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { getAuditLog, type AuditLogEntry } from '../../services/adminService';

const MOCK: AuditLogEntry[] = [
  { id: 'l1', userId: 'u5', userName: 'Mr. Reyes', action: 'task.create', details: 'Created "Functions Quiz #3"', targetType: 'task', targetId: 't1', timestamp: '2026-06-01T16:12:00Z', ipAddress: '203.0.113.42' },
  { id: 'l2', userId: 'u5', userName: 'Mr. Reyes', action: 'task.publish', details: 'Published "Functions Quiz #3" to STEM-A', targetType: 'task', targetId: 't1', timestamp: '2026-06-01T16:14:00Z', ipAddress: '203.0.113.42' },
  { id: 'l3', userId: 'u7', userName: 'Admin Deign', action: 'model.toggle', details: 'Enabled GPT-4 Turbo', targetType: 'model', targetId: 'm3', timestamp: '2026-06-01T15:50:00Z', ipAddress: '198.51.100.7' },
  { id: 'l4', userId: 'u7', userName: 'Admin Deign', action: 'user.suspend', details: 'Suspended patricia@school.edu (5 violations)', targetType: 'user', targetId: 'u4', timestamp: '2026-06-01T14:30:00Z', ipAddress: '198.51.100.7' },
  { id: 'l5', userId: 'u5', userName: 'Mr. Reyes', action: 'class.update', details: 'Updated STEM-A · Functions roster (42 students)', targetType: 'class', targetId: 'c1', timestamp: '2026-06-01T11:20:00Z', ipAddress: '203.0.113.42' },
  { id: 'l6', userId: 'u6', userName: 'Ms. Garcia', action: 'content.upload', details: 'Uploaded "Business Math Module 5.pdf" (12.4 MB)', targetType: 'content', targetId: 'cnt-9', timestamp: '2026-06-01T10:05:00Z', ipAddress: '198.51.100.91' },
  { id: 'l7', userId: 'u7', userName: 'Admin Deign', action: 'config.update', details: 'Updated RAG retrieval_k from 4 to 6', targetType: 'config', targetId: 'rag.retrieval_k', timestamp: '2026-05-31T20:15:00Z', ipAddress: '198.51.100.7' },
  { id: 'l8', userId: 'u5', userName: 'Mr. Reyes', action: 'quiz.publish', details: 'Published "Logic Review Quiz"', targetType: 'quiz', targetId: 'q9', timestamp: '2026-05-31T17:40:00Z', ipAddress: '203.0.113.42' },
];

const ACTION_COLOR: Record<string, 'destructive' | 'warning' | 'default' | 'success'> = {
  'user.suspend': 'destructive',
  'user.delete': 'destructive',
  'config.update': 'warning',
  'model.toggle': 'warning',
  'content.upload': 'success',
  'task.publish': 'default',
  'task.create': 'default',
  'class.update': 'default',
  'quiz.publish': 'default',
};

function actionLabel(action: string): string {
  return action.split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' · ');
}

export default function AdminAuditScreen() {
  const adminProfile = useAuthStore((s) => s.adminProfile);
  const [entries, setEntries] = useState<AuditLogEntry[]>(MOCK);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getAuditLog(50, token).catch(() => null);
      if (data) setEntries(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
    >
      <View className="px-4 pt-4 pb-3">
        <Text className="text-muted-foreground text-sm">
          {entries.length} recent events
        </Text>
      </View>

      <View className="px-4 gap-2">
        {entries.map((e) => (
          <Card key={e.id} className="p-3">
            <View className="flex-row items-start justify-between mb-1">
              <Text className="text-foreground text-sm font-semibold">{e.userName}</Text>
              <Badge variant={ACTION_COLOR[e.action] ?? 'default'}>{actionLabel(e.action)}</Badge>
            </View>
            <Text className="text-muted-foreground text-xs mb-1">{e.details}</Text>
            <View className="flex-row justify-between mt-2">
              <Text className="text-muted-foreground text-[10px]">
                {new Date(e.timestamp).toLocaleString()}
              </Text>
              {e.ipAddress && (
                <Text className="text-muted-foreground text-[10px]">{e.ipAddress}</Text>
              )}
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
