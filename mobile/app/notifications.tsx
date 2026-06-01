import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  View,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useAuthStore } from '../stores/useAuthStore';
import { Notification, NotificationType } from '../types/models';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const ICON_MAP: Record<
  NotificationType,
  { label: string; color: string; bg: string }
> = {
  achievement:  { label: 'A', color: 'text-amber-600',  bg: 'bg-amber-500/15' },
  grade:        { label: 'G', color: 'text-amber-600',  bg: 'bg-amber-500/15' },
  message:      { label: 'M', color: 'text-blue-600',   bg: 'bg-blue-500/15' },
  teacher_message: { label: 'T', color: 'text-blue-600',   bg: 'bg-blue-500/15' },
  risk_alert:   { label: '!', color: 'text-red-600',    bg: 'bg-red-500/15' },
  system_announcement: { label: 'S', color: 'text-cyan-600',   bg: 'bg-cyan-500/15' },
  reminder:     { label: 'R', color: 'text-violet-600', bg: 'bg-violet-500/15' },
  automation:   { label: 'Z', color: 'text-slate-600',  bg: 'bg-slate-500/15' },
  quiz_assigned:{ label: 'Q', color: 'text-orange-600', bg: 'bg-orange-500/15' },
  assignment:   { label: 'H', color: 'text-teal-600',   bg: 'bg-teal-500/15' },
};

function NotificationIcon({ type }: { type: NotificationType }) {
  const cfg = ICON_MAP[type] ?? ICON_MAP.message;
  return (
    <View className={`w-10 h-10 rounded-xl items-center justify-center ${cfg.bg}`}>
      <Text className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</Text>
    </View>
  );
}

function timeAgo(d: Date | string): string {
  const now = new Date();
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function DeleteAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-red-500 justify-center items-center px-5 rounded-xl my-1"
    >
      <RNText className="text-white font-semibold text-sm">Delete</RNText>
    </Pressable>
  );
}

function NotificationRow({
  item,
  onMarkRead,
  onDelete,
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [swipeRef, setSwipeRef] = useState<Swipeable | null>(null);

  const renderRightActions = useCallback(
    () => <DeleteAction onPress={() => onDelete(item.id)} />,
    [item.id, onDelete]
  );

  return (
    <Swipeable
      ref={setSwipeRef}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        if (swipeRef) {
          setTimeout(() => swipeRef.close(), 800);
        }
      }}
    >
      <Card className={`flex-row items-center gap-3 px-4 py-3 my-1 ${item.read ? 'opacity-70' : ''}`}>
        <NotificationIcon type={item.type} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            {!item.read && (
              <View className="w-2 h-2 rounded-full bg-blue-500" />
            )}
            <Text className="text-base font-semibold flex-1" numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <Text className="text-sm text-slate-500 mt-0.5" numberOfLines={2}>
            {item.message}
          </Text>
          <Text className="text-xs text-slate-400 mt-1">{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && (
          <Pressable
            onPress={() => onMarkRead(item.id)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 active:bg-slate-200"
          >
            <Text className="text-xs font-medium text-slate-600">Mark read</Text>
          </Pressable>
        )}
      </Card>
    </Swipeable>
  );
}

export default function NotificationsScreen() {
  const user = useAuthStore((s) => s.user);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const error = useNotificationStore((s) => s.error);
  const subscribe = useNotificationStore((s) => s.subscribe);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      const unsubscribe = subscribe(user.uid);
      const timer = setTimeout(() => setLoading(false), 400);
      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    }
    setLoading(false);
  }, [user?.uid, subscribe]);

  const onRefresh = useCallback(() => {
    if (!user?.uid) return;
    setRefreshing(true);
    const unsubscribe = subscribe(user.uid);
    setTimeout(() => {
      unsubscribe();
      setRefreshing(false);
    }, 600);
  }, [user?.uid, subscribe]);

  const handleMarkRead = useCallback(
    (id: string) => markRead(id),
    [markRead]
  );

  const handleDelete = useCallback(
    (id: string) => deleteNotification(id),
    [deleteNotification]
  );

  const headerRight = useMemo(
    () => (
      <View className="flex-row items-center gap-3 mr-4">
        {unreadCount > 0 && (
          <Badge variant="destructive" className="px-2 py-0.5">
            <Text className="text-xs font-bold text-white">{unreadCount}</Text>
          </Badge>
        )}
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            className="px-3 py-1.5 rounded-lg bg-slate-100 active:bg-slate-200"
          >
            <Text className="text-xs font-medium text-slate-700">Mark all read</Text>
          </Pressable>
        )}
      </View>
    ),
    [unreadCount, markAllRead]
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationRow
        item={item}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
      />
    ),
    [handleMarkRead, handleDelete]
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Notifications' }} />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-slate-500">Loading notifications…</Text>
      </SafeAreaView>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Stack.Screen options={{ title: 'Notifications' }} />
        <Text className="text-red-500 text-base text-center mb-4">
          {error}
        </Text>
        <Pressable
          onPress={onRefresh}
          className="px-4 py-2 rounded-lg bg-blue-500 active:bg-blue-600"
        >
          <Text className="text-white font-medium">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: () => headerRight,
        }}
      />
      <FlatList
        data={notifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerClassName="px-4 py-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400 text-lg">No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
