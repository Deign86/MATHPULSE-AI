import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { getTeachingTasks, type TeachingTask } from '../../services/teacherService';

const MOCK: TeachingTask[] = [
  { id: 't1', title: 'Functions Quiz #3', classId: 'c1', className: 'STEM-A · Functions', type: 'quiz', dueDate: '2026-06-05', status: 'published', submissions: 28, totalStudents: 42 },
  { id: 't2', title: 'Business Math Project', classId: 'c2', className: 'STEM-B · Business Math', type: 'project', dueDate: '2026-06-08', status: 'published', submissions: 12, totalStudents: 38 },
  { id: 't3', title: 'Logic Worksheet', classId: 'c3', className: 'STEM-A · Logic', type: 'assignment', dueDate: '2026-06-02', status: 'closed', submissions: 42, totalStudents: 42 },
  { id: 't4', title: 'Functions Practice Set', classId: 'c1', className: 'STEM-A · Functions', type: 'assignment', dueDate: '2026-06-12', status: 'draft', submissions: 0, totalStudents: 42 },
  { id: 't5', title: 'Logic Review Quiz', classId: 'c3', className: 'STEM-A · Logic', type: 'quiz', dueDate: '2026-05-28', status: 'closed', submissions: 40, totalStudents: 42 },
];

const TYPE_ICON: Record<string, string> = {
  assignment: '📄',
  quiz: '✏️',
  project: '🎯',
  review: '🔁',
};

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'secondary'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'warning',
};

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function TasksScreen() {
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const [tasks, setTasks] = useState<TeachingTask[]>(MOCK);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'closed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!teacherProfile) return;
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getTeachingTasks(teacherProfile.uid, token).catch(() => null);
      if (data) setTasks(data);
    } finally {
      setRefreshing(false);
    }
  }, [teacherProfile]);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const counts = {
    all: tasks.length,
    draft: tasks.filter((t) => t.status === 'draft').length,
    published: tasks.filter((t) => t.status === 'published').length,
    closed: tasks.filter((t) => t.status === 'closed').length,
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-3 flex-row justify-between items-center">
        <Text className="text-muted-foreground text-sm">
          {counts.published} active · {counts.draft} drafts
        </Text>
        <TouchableOpacity className="bg-primary px-4 py-2 rounded-full">
          <Text className="text-primary-foreground text-xs font-bold">+ New Task</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-3" contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {(['all', 'draft', 'published', 'closed'] as const).map((f) => (
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        <View className="gap-2">
          {filtered.map((task) => {
            const days = daysUntil(task.dueDate);
            const overdue = days < 0 && task.status === 'published';
            return (
              <Card key={task.id} className="p-4">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-start flex-1 mr-3">
                    <Text className="text-2xl mr-3">{TYPE_ICON[task.type]}</Text>
                    <View className="flex-1">
                      <Text className="text-foreground text-sm font-semibold">{task.title}</Text>
                      <Text className="text-muted-foreground text-xs mt-0.5">{task.className}</Text>
                    </View>
                  </View>
                  <Badge variant={STATUS_VARIANT[task.status]}>
                    {task.status}
                  </Badge>
                </View>

                <View className="flex-row justify-between items-center pt-3 border-t border-border">
                  <View>
                    <Text className="text-muted-foreground text-xs">Due</Text>
                    <Text className={`text-sm font-semibold ${overdue ? 'text-red-400' : 'text-foreground'}`}>
                      {new Date(task.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                  {task.status === 'published' && (
                    <View className="items-end">
                      <Text className="text-muted-foreground text-xs">Submissions</Text>
                      <Text className="text-foreground text-sm font-semibold">
                        {task.submissions}/{task.totalStudents}
                      </Text>
                    </View>
                  )}
                  {overdue && (
                    <Badge variant="destructive">Overdue {Math.abs(days)}d</Badge>
                  )}
                  {!overdue && days <= 3 && task.status === 'published' && (
                    <Badge variant="warning">{days}d left</Badge>
                  )}
                </View>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-muted-foreground text-sm">No tasks in this status</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
