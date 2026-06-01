import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
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

const MOCK_CLASSES: ClassGroup[] = [
  { id: 'c1', name: 'STEM-A · Functions', grade: '11', section: 'A', studentCount: 42, subject: 'Pre-Calculus' },
  { id: 'c2', name: 'STEM-B · Business Math', grade: '11', section: 'B', studentCount: 38, subject: 'Business Math' },
  { id: 'c3', name: 'STEM-A · Logic', grade: '11', section: 'A', studentCount: 42, subject: 'Logic' },
  { id: 'c4', name: 'STEM-C · Functions', grade: '12', section: 'C', studentCount: 35, subject: 'Pre-Calculus' },
];

const MOCK_AT_RISK: AtRiskStudent[] = [
  { uid: 's1', name: 'Carlo Mendoza', grade: '11', section: 'A', overallRisk: 'High', atRiskSubjects: ['Functions', 'Business Math'], lastActive: '2026-05-25', averageScore: 52, trend: 'declining', reason: '3 consecutive failed quizzes' },
  { uid: 's2', name: 'Patricia Cruz', grade: '11', section: 'B', overallRisk: 'High', atRiskSubjects: ['Logic'], lastActive: '2026-05-28', averageScore: 58, trend: 'declining', reason: 'Missed 5 lessons last week' },
  { uid: 's3', name: 'Roberto Garcia', grade: '12', section: 'C', overallRisk: 'Medium', atRiskSubjects: ['Functions'], lastActive: '2026-05-30', averageScore: 67, trend: 'stable', reason: 'Struggling with derivatives' },
];

const MOCK_TASKS: TeachingTask[] = [
  { id: 't1', title: 'Functions Quiz #3', classId: 'c1', className: 'STEM-A · Functions', type: 'quiz', dueDate: '2026-06-05', status: 'published', submissions: 28, totalStudents: 42 },
  { id: 't2', title: 'Business Math Project', classId: 'c2', className: 'STEM-B · Business Math', type: 'project', dueDate: '2026-06-08', status: 'published', submissions: 12, totalStudents: 38 },
  { id: 't3', title: 'Logic Worksheet', classId: 'c3', className: 'STEM-A · Logic', type: 'assignment', dueDate: '2026-06-02', status: 'closed', submissions: 42, totalStudents: 42 },
];

const RISK_COLORS: Record<string, string> = {
  High: 'bg-red-500/15 border-red-500/40',
  Medium: 'bg-amber-500/15 border-amber-500/40',
  Low: 'bg-emerald-500/15 border-emerald-500/40',
};

export default function TeacherDashboard() {
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const user = useAuthStore((s) => s.user);
  const [classes, setClasses] = useState<ClassGroup[]>(MOCK_CLASSES);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>(MOCK_AT_RISK);
  const [tasks, setTasks] = useState<TeachingTask[]>(MOCK_TASKS);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = teacherProfile?.name?.split(' ')[0] ?? user?.name?.split(' ')[0] ?? 'Teacher';

  const onRefresh = useCallback(async () => {
    if (!teacherProfile) return;
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const [c, r, t] = await Promise.all([
        getTeacherClasses(teacherProfile.uid, token).catch(() => null),
        getAtRiskStudents(teacherProfile.uid, token).catch(() => null),
        getTeachingTasks(teacherProfile.uid, token).catch(() => null),
      ]);
      if (c) setClasses(c);
      if (r) setAtRisk(r);
      if (t) setTasks(t);
    } finally {
      setRefreshing(false);
    }
  }, [teacherProfile]);

  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const highRiskCount = atRisk.filter((s) => s.overallRisk === 'High').length;
  const activeTasks = tasks.filter((t) => t.status === 'published').length;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <View className="px-5 pt-8 pb-4">
        <Text className="text-muted-foreground text-sm">Welcome,</Text>
        <Text variant="h1" className="text-foreground">Teacher {firstName} 👨‍🏫</Text>
      </View>

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
            👥 View All Students
          </Button>
          <Button variant="outline" onPress={() => router.push('/at-risk')}>
            ⚠️ At-Risk Students ({highRiskCount})
          </Button>
          <Button variant="ghost" onPress={() => router.push('/tasks')}>
            📝 Manage Tasks
          </Button>
          <Button variant="ghost" onPress={() => router.push('/profile')}>
            👤 My Profile
          </Button>
        </View>
      </View>

      {/* Classes */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Your Classes</Text>
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
                    {c.subject} · Grade {c.grade}
                  </Text>
                </View>
                <Badge variant="secondary">{c.studentCount}</Badge>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
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
