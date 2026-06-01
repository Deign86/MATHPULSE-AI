import React, { useState, useCallback } from 'react';
import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/useAuthStore';
import { auth } from '../lib/firebase';
import type { UserRole } from '../types/models';

const ROLE_LABEL: Record<UserRole, string> = {
  student: '🎓 Student',
  teacher: '👨‍🏫 Teacher',
  admin: '🛡️ Admin',
};

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const studentProfile = useAuthStore((s) => s.studentProfile);
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const adminProfile = useAuthStore((s) => s.adminProfile);
  const logout = useAuthStore((s) => s.logout);
  const [signingOut, setSigningOut] = useState(false);

  const profile = studentProfile ?? teacherProfile ?? adminProfile;
  const role: UserRole = user?.role ?? 'student';

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await auth.signOut();
            logout();
            router.replace('/(auth)/login');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }, [logout]);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center pt-12 pb-6">
        <Avatar fallback={user?.name ?? '?'} size="xl" className="mb-3" />
        <Text variant="h2" className="text-foreground">{user?.name ?? 'User'}</Text>
        <Text className="text-muted-foreground text-sm mt-1">{user?.email}</Text>
        <Badge variant="default" className="mt-3">{ROLE_LABEL[role]}</Badge>
      </View>

      {/* Role-specific info */}
      {studentProfile && (
        <View className="px-4 mb-4">
          <Card className="p-4">
            <Text variant="h3" className="text-foreground mb-3">Academic Info</Text>
            <View className="gap-2">
              <InfoRow label="LRN" value={studentProfile.lrn ?? '—'} />
              <InfoRow label="Grade & Section" value={`${studentProfile.grade} - ${studentProfile.section ?? '—'}`} />
              <InfoRow label="School" value={studentProfile.school} />
              <InfoRow label="Major" value={studentProfile.major} />
              <InfoRow label="GPA" value={studentProfile.gpa} />
              <InfoRow label="Level" value={String(studentProfile.level)} />
              <InfoRow label="Total XP" value={studentProfile.totalXP.toLocaleString()} />
              <InfoRow label="Lives" value={String(studentProfile.lives ?? 0)} />
              <InfoRow label="Hint Tokens" value={String(studentProfile.hintTokens ?? 0)} />
            </View>
          </Card>
        </View>
      )}

      {teacherProfile && (
        <View className="px-4 mb-4">
          <Card className="p-4">
            <Text variant="h3" className="text-foreground mb-3">Teaching Info</Text>
            <View className="gap-2">
              <InfoRow label="Teacher ID" value={teacherProfile.teacherId} />
              <InfoRow label="Department" value={teacherProfile.department} />
              <InfoRow label="Subject" value={teacherProfile.subject} />
              <InfoRow label="Years of Experience" value={teacherProfile.yearsOfExperience} />
              <InfoRow label="Qualification" value={teacherProfile.qualification} />
              <InfoRow label="Students" value={String(teacherProfile.students?.length ?? 0)} />
            </View>
          </Card>
        </View>
      )}

      {adminProfile && (
        <View className="px-4 mb-4">
          <Card className="p-4">
            <Text variant="h3" className="text-foreground mb-3">Admin Info</Text>
            <View className="gap-2">
              <InfoRow label="Admin ID" value={adminProfile.adminId} />
              <InfoRow label="Position" value={adminProfile.position} />
              <InfoRow label="Department" value={adminProfile.department} />
            </View>
          </Card>
        </View>
      )}

      <View className="px-4 gap-3">
        <Button variant="outline" onPress={() => router.push('/settings')}>
          ⚙️ Settings
        </Button>
        <Button variant="outline" onPress={() => router.push('/notifications')}>
          🔔 Notifications
        </Button>
        <Button variant="destructive" onPress={handleLogout} loading={signingOut}>
          🚪 Sign Out
        </Button>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-1">
      <Text className="text-muted-foreground text-xs">{label}</Text>
      <Text className="text-foreground text-sm font-semibold">{value}</Text>
    </View>
  );
}
