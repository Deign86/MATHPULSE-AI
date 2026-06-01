import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/useAuthStore';
import { auth } from '../lib/firebase';
import { getTeachingTasks, type TeachingTask } from '../services/teacherService';

const TYPE_ICON: Record<string, string> = {
  assignment: '📄',
  quiz: '✏️',
  project: '🎯',
  review: '🔁',
};

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'warning',
  overdue: 'destructive',
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function StudentTasksScreen() {
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<TeachingTask[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'upcoming' | 'closed'>('active');

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      // Student view: show all published + closed tasks across student's classes
      const data = await getTeachingTasks(user.uid, token).catch(() => []);
      setTasks(data ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const now = Date.now();
  const filtered = tasks.filter((t) => {
    const due = new Date(t.dueDate).getTime();
    if (filter === 'active') return t.status === 'published' && due >= now;
    if (filter === 'upcoming') return t.status === 'published' && due < now;
    return t.status === 'closed' || t.status === 'draft';
  });

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-8 pb-3">
        <Text variant="h1" className="text-foreground">My Tasks</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          Assignments and quizzes from your teachers
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-3" contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {(['active', 'upcoming', 'closed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full ${filter === f ? 'bg-primary' : 'bg-surface border border-border'}`}
            accessibilityRole="button"
            accessibilityLabel={`Show ${f} tasks`}
          >
            <Text className={`text-xs font-semibold capitalize ${filter === f ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {filtered.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-5xl mb-3">📭</Text>
            <Text className="text-muted-foreground text-base">No tasks here</Text>
            <Text className="text-muted-foreground text-sm mt-1">
              {filter === 'active' ? "You're all caught up!" : 'Check back later'}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {filtered.map((task) => {
              const days = daysUntil(task.dueDate);
              const overdue = days < 0;
              return (
                <TouchableOpacity
                  key={task.id}
                  accessibilityRole="link"
                  accessibilityLabel={`Task: ${task.title}, ${task.className}, due ${new Date(task.dueDate).toLocaleDateString()}`}
                >
                  <Card className="p-4">
                    <View className="flex-row items-start mb-2">
                      <Text className="text-2xl mr-3">{TYPE_ICON[task.type]}</Text>
                      <View className="flex-1">
                        <Text className="text-foreground text-sm font-semibold">{task.title}</Text>
                        <Text className="text-muted-foreground text-xs mt-0.5">{task.className}</Text>
                      </View>
                    </View>
                    <View className="flex-row justify-between items-center pt-3 border-t border-border">
                      <View>
                        <Text className="text-muted-foreground text-xs">Due</Text>
                        <Text className={`text-sm font-semibold ${overdue ? 'text-red-400' : 'text-foreground'}`}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </Text>
                      </View>
                      {overdue && <Badge variant="destructive">Overdue {Math.abs(days)}d</Badge>}
                      {!overdue && days <= 3 && <Badge variant="warning">Due in {days}d</Badge>}
                      {!overdue && days > 3 && <Badge variant="secondary">{days}d left</Badge>}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
