import { Tabs } from 'expo-router';
import { Text } from '../../components/ui/Text';

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
        },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '700' }}>DB</Text>
          ),
          tabBarAccessibilityLabel: 'Dashboard tab',
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '700' }}>ST</Text>
          ),
          tabBarAccessibilityLabel: 'Students tab',
        }}
      />
      <Tabs.Screen
        name="at-risk"
        options={{
          title: 'At-Risk',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '700' }}>AR</Text>
          ),
          tabBarAccessibilityLabel: 'At-Risk tab',
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '700' }}>TK</Text>
          ),
          tabBarAccessibilityLabel: 'Tasks tab',
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '700' }}>IN</Text>
          ),
          tabBarAccessibilityLabel: 'Insights tab',
        }}
      />
    </Tabs>
  );
}
