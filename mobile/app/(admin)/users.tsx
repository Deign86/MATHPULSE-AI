import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { listUsers, type AdminUserRow } from '../../services/adminService';

const MOCK: AdminUserRow[] = [
  { uid: 'u1', name: 'Maria Santos', email: 'maria@school.edu', role: 'student', status: 'active', createdAt: '2025-09-01', lastActive: '2026-06-01' },
  { uid: 'u2', name: 'Juan Dela Cruz', email: 'juan@school.edu', role: 'student', status: 'active', createdAt: '2025-09-01', lastActive: '2026-06-01' },
  { uid: 'u3', name: 'Carlo Mendoza', email: 'carlo@school.edu', role: 'student', status: 'active', createdAt: '2025-09-05', lastActive: '2026-05-25' },
  { uid: 'u4', name: 'Patricia Cruz', email: 'patricia@school.edu', role: 'student', status: 'suspended', createdAt: '2025-09-10', lastActive: '2026-05-20' },
  { uid: 'u5', name: 'Mr. Reyes', email: 'reyes@school.edu', role: 'teacher', status: 'active', createdAt: '2024-08-15' },
  { uid: 'u6', name: 'Ms. Garcia', email: 'garcia@school.edu', role: 'teacher', status: 'active', createdAt: '2024-08-20' },
  { uid: 'u7', name: 'Admin Deign', email: 'admin@mathpulse.ai', role: 'admin', status: 'active', createdAt: '2024-01-01' },
  { uid: 'u8', name: 'Ana Reyes', email: 'ana@school.edu', role: 'student', status: 'active', createdAt: '2025-09-12', lastActive: '2026-05-31' },
  { uid: 'u9', name: 'Roberto Garcia', email: 'roberto@school.edu', role: 'student', status: 'active', createdAt: '2025-10-01', lastActive: '2026-05-30' },
  { uid: 'u10', name: 'Ms. Cruz', email: 'cruz@school.edu', role: 'teacher', status: 'pending', createdAt: '2026-05-30' },
];

const ROLE_VARIANT: Record<string, 'default' | 'success' | 'warning'> = {
  student: 'default',
  teacher: 'success',
  admin: 'warning',
};

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary'> = {
  active: 'default',
  suspended: 'destructive',
  pending: 'secondary',
};

type RoleFilter = 'all' | 'student' | 'teacher' | 'admin';

export default function AdminUsersScreen() {
  const adminProfile = useAuthStore((s) => s.adminProfile);
  const [users, setUsers] = useState<AdminUserRow[]>(MOCK);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await listUsers('all', token).catch(() => null);
      if (data) setUsers(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (filter !== 'all' && u.role !== filter) return false;
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, filter]);

  const counts = {
    all: users.length,
    student: users.filter((u) => u.role === 'student').length,
    teacher: users.filter((u) => u.role === 'teacher').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-3">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
          placeholderTextColor="#6b7280"
          className="bg-surface border border-border rounded-full px-4 py-2.5 text-foreground text-sm"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-3" contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {(['all', 'student', 'teacher', 'admin'] as RoleFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full ${filter === f ? 'bg-primary' : 'bg-surface border border-border'}`}
            accessibilityRole="button"
            accessibilityLabel={`Show ${f === 'all' ? 'all' : f} users`}
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
          {filtered.map((u) => (
            <Card key={u.uid} className="p-3 flex-row items-center">
              <Avatar fallback={u.name} size="md" className="mr-3" />
              <View className="flex-1">
                <Text className="text-foreground text-sm font-semibold">{u.name}</Text>
                <Text className="text-muted-foreground text-xs mt-0.5">{u.email}</Text>
                {u.lastActive && (
                  <Text className="text-muted-foreground text-[10px] mt-0.5">
                    Last seen {new Date(u.lastActive).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View className="items-end gap-1">
                <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                <Badge variant={STATUS_VARIANT[u.status]}>{u.status}</Badge>
              </View>
            </Card>
          ))}
          {filtered.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-muted-foreground text-sm">No users found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
