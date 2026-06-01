import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useNotificationStore } from '../stores/useNotificationStore';

const TYPE_ICON: Record<string, string> = {
  achievement: '🏆',
  quiz_battle: '⚔️',
  daily_reward: '🎁',
  assignment: '📝',
  streak_alert: '🔥',
  quiz_reminder: '⏰',
  system: 'ℹ️',
};

function timeAgo(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export default function NotificationsScreen() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-8 pb-3 flex-row justify-between items-center">
        <View>
          <Text variant="h1" className="text-foreground">Notifications</Text>
          <Text className="text-muted-foreground text-sm mt-1">
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </Text>
        </View>
      </View>

      {notifications.length > 0 && (
        <View className="flex-row px-4 gap-2 mb-3">
          <TouchableOpacity
            onPress={markAllRead}
            className="flex-1 bg-surface border border-border rounded-full py-2 items-center"
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            <Text className="text-foreground text-xs font-semibold">Mark all read</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clearAll}
            className="flex-1 bg-surface border border-border rounded-full py-2 items-center"
            accessibilityRole="button"
            accessibilityLabel="Clear all notifications"
          >
            <Text className="text-red-400 text-xs font-semibold">Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {notifications.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-5xl mb-3">🔔</Text>
            <Text className="text-muted-foreground text-base">No notifications yet</Text>
            <Text className="text-muted-foreground text-sm mt-1">
              We'll let you know when something important happens
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => markRead(n.id)}
                disabled={n.read}
                accessibilityRole="button"
                accessibilityLabel={`${n.read ? '' : 'Unread '}notification: ${n.title}, ${n.message}`}
              >
                <Card className={`p-3 flex-row ${n.read ? 'opacity-60' : 'border-l-2 border-l-primary'}`}>
                  <Text className="text-2xl mr-3">{TYPE_ICON[n.type] ?? 'ℹ️'}</Text>
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {n.title}
                    </Text>
                    <Text className="text-muted-foreground text-xs mt-0.5">{n.message}</Text>
                    <Text className="text-muted-foreground text-[10px] mt-1">
                      {timeAgo(n.createdAt)}
                    </Text>
                  </View>
                  {!n.read && <View className="w-2 h-2 rounded-full bg-primary mt-2" />}
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
