import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import {
  getTeacherClasses,
  type ClassGroup,
} from '../../services/teacherService';

interface StudentRow {
  uid: string;
  name: string;
  section: string;
  averageScore: number;
  level: number;
  lastActive: string;
  status: 'On Track' | 'Needs Review' | 'At Risk';
  classId: string;
}

const MOCK_STUDENTS: StudentRow[] = [
  { uid: 's1', name: 'Maria Santos', section: 'A', averageScore: 92, level: 24, lastActive: '2026-06-01', status: 'On Track', classId: 'c1' },
  { uid: 's2', name: 'Juan Dela Cruz', section: 'A', averageScore: 88, level: 22, lastActive: '2026-06-01', status: 'On Track', classId: 'c1' },
  { uid: 's3', name: 'Carlo Mendoza', section: 'A', averageScore: 52, level: 12, lastActive: '2026-05-25', status: 'At Risk', classId: 'c1' },
  { uid: 's4', name: 'Ana Reyes', section: 'B', averageScore: 85, level: 21, lastActive: '2026-05-31', status: 'On Track', classId: 'c2' },
  { uid: 's5', name: 'Patricia Cruz', section: 'B', averageScore: 58, level: 14, lastActive: '2026-05-28', status: 'At Risk', classId: 'c2' },
  { uid: 's6', name: 'Carlos Garcia', section: 'A', averageScore: 78, level: 19, lastActive: '2026-05-30', status: 'Needs Review', classId: 'c1' },
  { uid: 's7', name: 'Sofia Mendoza', section: 'C', averageScore: 81, level: 18, lastActive: '2026-05-31', status: 'On Track', classId: 'c4' },
  { uid: 's8', name: 'Roberto Garcia', section: 'C', averageScore: 67, level: 16, lastActive: '2026-05-30', status: 'Needs Review', classId: 'c4' },
  { uid: 's9', name: 'Isabel Torres', section: 'A', averageScore: 90, level: 23, lastActive: '2026-06-01', status: 'On Track', classId: 'c3' },
  { uid: 's10', name: 'Diego Cruz', section: 'B', averageScore: 73, level: 17, lastActive: '2026-05-30', status: 'Needs Review', classId: 'c2' },
];

const STATUS_COLORS = {
  'On Track': 'success',
  'Needs Review': 'warning',
  'At Risk': 'destructive',
} as const;

export default function StudentsScreen() {
  const params = useLocalSearchParams<{ class?: string }>();
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>(params.class ?? 'all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!teacherProfile) return;
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getTeacherClasses(teacherProfile.uid, token).catch(() => null);
      if (data) setClasses(data);
    } finally {
      setRefreshing(false);
    }
  }, [teacherProfile]);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MOCK_STUDENTS.filter((s) => {
      if (filterClass !== 'all' && s.classId !== filterClass) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, filterClass]);

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

      {/* Class filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-3" contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        <TouchableOpacity
          onPress={() => setFilterClass('all')}
          className={`px-3 py-1.5 rounded-full ${filterClass === 'all' ? 'bg-primary' : 'bg-surface border border-border'}`}
          accessibilityRole="button"
          accessibilityLabel="Show all students"
        >
          <Text className={`text-xs font-semibold ${filterClass === 'all' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
            All ({MOCK_STUDENTS.length})
          </Text>
        </TouchableOpacity>
        {classes.length > 0 ? classes.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setFilterClass(c.id)}
            className={`px-3 py-1.5 rounded-full ${filterClass === c.id ? 'bg-primary' : 'bg-surface border border-border'}`}
            accessibilityRole="button"
            accessibilityLabel={`Filter by class ${c.name}`}
          >
            <Text className={`text-xs font-semibold ${filterClass === c.id ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              {c.name} ({c.studentCount})
            </Text>
          </TouchableOpacity>
        )) : null}
      </ScrollView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        <View className="gap-2">
          {filtered.map((s) => (
            <TouchableOpacity
              key={s.uid}
              onPress={() => router.push(`/student/${s.uid}`)}
              accessibilityRole="link"
              accessibilityLabel={`View ${s.name}, section ${s.section}, level ${s.level}, average ${s.averageScore} percent, status ${s.status}`}
            >
              <Card className="p-3 flex-row items-center">
                <Avatar fallback={s.name} size="md" className="mr-3" />
                <View className="flex-1">
                  <Text className="text-foreground text-sm font-semibold">{s.name}</Text>
                  <Text className="text-muted-foreground text-xs mt-0.5">
                    Sec {s.section} · Level {s.level} · Avg {s.averageScore}%
                  </Text>
                </View>
                <Badge variant={STATUS_COLORS[s.status]}>
                  {s.status}
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
