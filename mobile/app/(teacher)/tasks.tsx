import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import {
  getTeachingTasks,
  getTeacherClasses,
  markTeachingTaskComplete,
  type TeachingTask,
  type ClassGroup,
} from '../../services/teacherService';

type StatusFilter = 'all' | 'pending' | 'completed' | 'overdue';

function TypeIcon({ type }: { type: TeachingTask['type'] }) {
  const colorClass = {
    assignment: 'bg-blue-500/20 border-blue-500/40',
    quiz: 'bg-emerald-500/20 border-emerald-500/40',
    project: 'bg-violet-500/20 border-violet-500/40',
    review: 'bg-amber-500/20 border-amber-500/40',
  };
  const label = {
    assignment: 'A',
    quiz: 'Q',
    project: 'P',
    review: 'R',
  };
  return (
    <View
      className={`w-10 h-10 rounded-lg border items-center justify-center ${colorClass[type] || colorClass.assignment}`}
    >
      <Text className="text-xs font-bold text-foreground">
        {label[type] || 'A'}
      </Text>
    </View>
  );
}

function FilterPill({
  active,
  label,
  count,
  onPress,
}: {
  active: boolean;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full ${active ? 'bg-primary' : 'bg-surface border border-border'}`}
    >
      <Text
        className={`text-xs font-semibold capitalize ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}
      >
        {label}{count !== undefined ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const [tasks, setTasks] = useState<TeachingTask[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const uid = teacherProfile?.uid ?? '';

  const fetchData = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const [fetchedTasks, fetchedClasses] = await Promise.all([
        getTeachingTasks(uid),
        token ? getTeacherClasses(uid, token).catch(() => [] as ClassGroup[]) : Promise.resolve([] as ClassGroup[]),
      ]);
      setTasks(fetchedTasks);
      setClasses(fetchedClasses);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side status filter
  const statusFiltered = statusFilter === 'all'
    ? tasks
    : tasks.filter((t) => {
        switch (statusFilter) {
          case 'pending':
            return t.status === 'published' && !t.isOverdue;
          case 'completed':
            return t.status === 'closed';
          case 'overdue':
            return t.isOverdue;
          default:
            return true;
        }
      });

  // Client-side class filter
  const filtered = classFilter === 'all'
    ? statusFiltered
    : statusFiltered.filter((t) => t.classId === classFilter);

  const counts = {
    all: filtered.length,
    pending: filtered.filter((t) => t.status === 'published' && !t.isOverdue).length,
    completed: filtered.filter((t) => t.status === 'closed').length,
    overdue: filtered.filter((t) => t.isOverdue).length,
  };

  const handleMarkComplete = async (taskId: string) => {
    await markTeachingTaskComplete(taskId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: 'closed' as const, isOverdue: false } : t,
      ),
    );
  };

  const statusBadge = (task: TeachingTask) => {
    if (task.status === 'closed') return { variant: 'success' as const, label: 'Done' };
    if (task.status === 'published') return { variant: 'default' as const, label: 'Active' };
    return { variant: 'secondary' as const, label: 'Draft' };
  };

  return (
    <View className="flex-1 bg-background">
      {/* Class filter row */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-muted-foreground text-xs mb-2">Class</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <FilterPill
            active={classFilter === 'all'}
            label="All"
            onPress={() => setClassFilter('all')}
          />
          {classes.map((c) => (
            <FilterPill
              key={c.id}
              active={classFilter === c.id}
              label={c.name}
              onPress={() => setClassFilter(c.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Status filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-3"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {(['all', 'pending', 'completed', 'overdue'] as const).map((f) => (
          <FilterPill
            key={f}
            active={statusFilter === f}
            label={f}
            count={counts[f]}
            onPress={() => setStatusFilter(f)}
          />
        ))}
      </ScrollView>

      {/* Task list */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor="#10b981" />
        }
      >
        <View className="gap-2">
          {filtered.map((task) => {
            const days = Math.ceil(
              (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );
            const badge = statusBadge(task);
            return (
              <Card
                key={task.id}
                className={`p-4 ${task.isOverdue ? 'border-red-500/40 bg-red-500/5' : ''}`}
              >
                {/* Top row: icon + title/class + status badge */}
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-start flex-1 mr-3">
                    <TypeIcon type={task.type} />
                    <View className="flex-1 ml-3">
                      <Text className="text-foreground text-sm font-semibold">
                        {task.title}
                      </Text>
                      <Text className="text-muted-foreground text-xs mt-0.5">
                        {task.className}
                      </Text>
                    </View>
                  </View>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </View>

                {/* Bottom row: due date / submissions / overdue / mark complete */}
                <View className="flex-row justify-between items-center pt-3 border-t border-border">
                  <View>
                    <Text className="text-muted-foreground text-xs">Due</Text>
                    <Text
                      className={`text-sm font-semibold ${task.isOverdue ? 'text-red-400' : 'text-foreground'}`}
                    >
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

                  {task.isOverdue && (
                    <Badge variant="destructive">
                      Overdue {Math.abs(days)}d
                    </Badge>
                  )}

                  {!task.isOverdue && days <= 3 && task.status === 'published' && (
                    <Badge variant="warning">{days}d left</Badge>
                  )}

                  {task.status === 'published' && !task.isOverdue && (
                    <TouchableOpacity
                      onPress={() => handleMarkComplete(task.id)}
                      className="px-3 py-1.5 bg-success rounded-full"
                    >
                      <Text className="text-background text-xs font-semibold">
                        Mark Complete
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })}

          {!loading && filtered.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-muted-foreground text-sm">No tasks assigned</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
